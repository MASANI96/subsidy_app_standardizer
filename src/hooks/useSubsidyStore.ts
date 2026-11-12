/**
 * 補助金ストアフック (useSubsidyStore)
 * 【STEP1要件準拠】
 * 1. 案件データ・設定は localStorage に保存、ファイルは storageService (IndexedDB) と連携。
 * 2. 金額表示単位（円/千円/万円）と端数処理（切り捨て/四捨五入）のグローバル状態管理。
 * 3. 公募回設定の「版」管理（複製、版ごとの数値固定、各案件の appliedVersionId 連動）。
 * 4. 「仮」の値一覧の確認・編集対応。
 * 5. 設定・案件データの JSON エクスポート / インポート。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDefaultSimulation,
  createDemoCompanyFinancialMaster,
  createEmptyBS,
  createEmptyPL,
  createInitialAppState,
  DEMO_PROJECT_MARUMARU,
  INITIAL_CALL_ROUNDS,
  INITIAL_TRACKS,
} from '../data/initialData';
import { aiService, calculateStatementConsistency } from '../services/aiService';
import {
  AccountMappingAction,
  AccountMappingRule,
  AnnualSalesEstimateMethod,
  DisplayCurrencyUnit,
  EmployeeCountMethod,
  ExcelCellMapping,
  ExcelTemplateDefinition,
  FORECAST_PERIOD_KEYS,
  ForecastPeriodKey,
  GanttTask,
  HistoricalPeriodKey,
  InitialProjectDefaults,
  InvestmentPlanYen,
  NarrativeTemplate,
  OffBalanceManualInputs,
  PeriodImportRecord,
  PeriodKey,
  PhaseGate,
  PlanSimulation,
  PlanSnapshot,
  PlanVersion,
  PlanningYearsOption,
  Project,
  ProjectFinancialMaster,
  ProjectStatus,
  Role,
  RoundingMode,
  ScheduleItem,
  ScheduleTemplateTask,
  ScreenId,
  SolverCandidate,
  SubsidyAppState,
  SubsidyRequirements,
  SubsidyTrack,
  SubsidyTrackId,
  SubsidyVersionRound,
  TentativeItem,
  WorkspaceTabId,
  ProjectSchedule,
} from '../types';
import { buildScheduleFromTemplate } from '../utils/scheduleBuilder';
import {
  calculateAnnualSalesEstimate,
  calculateFiscalYears,
  recalculateBS,
  recalculatePL,
} from '../utils/financialCalculations';
import { applySimulation } from '../utils/planSimulation';
import {
  exportDataAsJsonFile,
  loadFromLocalStorage,
  saveFileToIndexedDB,
  saveToLocalStorage,
} from '../utils/storageService';

export const APP_STORAGE_KEY = 'subsidy_standardization_mock_v4';
export const TOUR_SNAPSHOT_SESSION_KEY = 'subsidy_mock_tour_snapshot_v4';

function formatNow(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * 保存データまたはインポートデータを正規化し、型定義に適合した SubsidyAppState を生成する
 * 1. base の各トップレベル項目について raw に無ければ base の値を入れる
 * 2. raw.projects の各要素について、financialMaster が無い案件は除外する
 * @param raw 復元元の生データオブジェクト
 * @returns 欠落項目を初期値で補完した SubsidyAppState
 */
export function normalizeState(raw: any): SubsidyAppState {
  const base = createInitialAppState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const result: any = {};
  for (const key of Object.keys(base) as (keyof SubsidyAppState)[]) {
    if (raw[key] === undefined || raw[key] === null) {
      result[key] = (base as any)[key];
    } else {
      result[key] = raw[key];
    }
  }

  // initialDefaults.simulationDefaults の補完
  if (!result.initialDefaults || typeof result.initialDefaults !== 'object') {
    result.initialDefaults = base.initialDefaults;
  } else if (!result.initialDefaults.simulationDefaults) {
    result.initialDefaults.simulationDefaults = base.initialDefaults.simulationDefaults;
  }

  // solverCandidates & narrativeTemplates の補完 (STEP C)
  if (!Array.isArray(result.solverCandidates) || result.solverCandidates.length === 0) {
    result.solverCandidates = base.solverCandidates;
  }
  if (Array.isArray(result.solverCandidates)) {
    result.solverCandidates = result.solverCandidates.filter((c: any) => c?.key !== 'existingCostRate');
  }
  if (!Array.isArray(result.narrativeTemplates) || result.narrativeTemplates.length === 0) {
    result.narrativeTemplates = base.narrativeTemplates;
  }

  // excelTemplates & excelCellMappings & scheduleTemplates の補完 (STEP D/E)
  if (!Array.isArray(result.excelTemplates)) {
    result.excelTemplates = base.excelTemplates || [];
  }
  if (!Array.isArray(result.excelCellMappings) || result.excelCellMappings.length === 0) {
    result.excelCellMappings = base.excelCellMappings || [];
  }
  if (!Array.isArray(result.scheduleTemplates) || result.scheduleTemplates.length === 0) {
    result.scheduleTemplates = base.scheduleTemplates || [];
  }

  // projects は raw.projects の各要素について、financialMaster が無い案件は除外する
  if (Array.isArray(raw.projects)) {
    const validProjects = raw.projects.filter(
      (p: any) => p && typeof p === 'object' && p.financialMaster
    );
    if (validProjects.length > 0) {
      result.projects = validProjects.map((p: any, idx: number) => {
        const bp = base.projects[idx] || base.projects[0];
        const fm = p.financialMaster;
        const simulation = fm?.simulation || createDefaultSimulation();
        if (Array.isArray(simulation.solverTargets)) {
          simulation.solverTargets = simulation.solverTargets.filter(
            (t: any) => t?.key !== 'existingCostRate'
          );
        }
        const planVersions = Array.isArray(fm?.planVersions) ? fm.planVersions : [];
        const narratives =
          fm?.narratives && typeof fm.narratives === 'object'
            ? {
                valueAdded: fm.narratives.valueAdded || '',
                wage: fm.narratives.wage || '',
              }
            : { valueAdded: '', wage: '' };

        // 【STEP F】schedule の補完
        const track =
          result.callRounds
            ?.flatMap((r: any) => r.tracks || [])
            ?.find((t: any) => t.id === p.appliedTrackId) ||
          INITIAL_TRACKS.find((t) => t.id === p.appliedTrackId) ||
          INITIAL_TRACKS[0];

        const schedule: ProjectSchedule =
          p.schedule && Array.isArray(p.schedule.items)
            ? p.schedule
            : {
                items: buildScheduleFromTemplate(
                  result.scheduleTemplates || base.scheduleTemplates,
                  fm,
                  track
                ),
                viewMode: p.schedule?.viewMode || 'month',
                lastSharedAt: p.schedule?.lastSharedAt,
              };

        return {
          ...p,
          financialMaster: {
            ...fm,
            simulation,
            planVersions,
            narratives,
          },
          schedule,
          masterItems: p.masterItems || bp.masterItems,
          hearingVariables: p.hearingVariables || bp.hearingVariables,
          subsidies: p.subsidies || bp.subsidies,
        };
      });
    } else {
      result.projects = base.projects;
    }
  } else {
    result.projects = base.projects;
  }

  // callRounds が配列でなければ base.callRounds
  if (!Array.isArray(result.callRounds) || result.callRounds.length === 0) {
    result.callRounds = base.callRounds;
  }

  // selectedProjectId の整合
  if (!result.projects.some((p: any) => p.id === result.selectedProjectId)) {
    result.selectedProjectId = result.projects[0]?.id || base.selectedProjectId;
  }

  return result as SubsidyAppState;
}

/**
 * financialMaster の simulation.enabled が true の場合、applySimulation を再実行し
 * 年間売上見込額も再計算した新しい financialMaster を返す
 * @param fm 対象の収支計画マスター
 * @returns 再計算後の financialMaster
 */
function reapplySimulationIfEnabled(fm: ProjectFinancialMaster): ProjectFinancialMaster {
  if (!fm.simulation?.enabled) return fm;
  const { fm: simFM } = applySimulation(fm);
  simFM.annualSalesEstimate = calculateAnnualSalesEstimate(
    simFM,
    simFM.annualSalesEstimate.method
  );
  return simFM;
}

export function useSubsidyStore() {
  const [state, setState] = useState<SubsidyAppState>(() => {
    const loaded = loadFromLocalStorage<any>(APP_STORAGE_KEY, null);
    if (loaded) {
      return normalizeState(loaded);
    }
    return createInitialAppState();
  });

  // State自動保存
  useEffect(() => {
    saveToLocalStorage(APP_STORAGE_KEY, state);
  }, [state]);

  // 選択中案件の取得
  const selectedProject = useMemo(() => {
    return (
      state.projects.find((p) => p.id === state.selectedProjectId) ??
      state.projects[0] ??
      DEMO_PROJECT_MARUMARU
    );
  }, [state.projects, state.selectedProjectId]);

  // 選択中公募回の取得
  const activeCallRound = useMemo(() => {
    return (
      state.callRounds.find((r) => r.id === state.activeVersionId) ??
      state.callRounds[0] ??
      INITIAL_CALL_ROUNDS[0]
    );
  }, [state.callRounds, state.activeVersionId]);

  // 案件が適用している公募回の取得
  const projectAppliedRound = useMemo(() => {
    return (
      state.callRounds.find((r) => r.id === selectedProject.appliedVersionId) ??
      activeCallRound
    );
  }, [state.callRounds, selectedProject.appliedVersionId, activeCallRound]);

  // 案件が適用している枠の取得
  const projectAppliedTrack = useMemo(() => {
    const track = projectAppliedRound.tracks.find(
      (t) => t.id === selectedProject.financialMaster.appliedTrackId
    );
    return track ?? projectAppliedRound.tracks[0] ?? INITIAL_TRACKS[0];
  }, [projectAppliedRound, selectedProject.financialMaster.appliedTrackId]);

  // ==========================================
  // 基本ナビゲーション・表示設定
  // ==========================================

  const setRole = useCallback((role: Role) => {
    setState((prev) => ({ ...prev, role }));
  }, []);

  const setActiveScreen = useCallback((activeScreen: ScreenId) => {
    setState((prev) => ({ ...prev, activeScreen }));
  }, []);

  const setWorkspaceTab = useCallback((workspaceTab: WorkspaceTabId) => {
    setState((prev) => ({ ...prev, workspaceTab }));
  }, []);

  const setDisplayCurrencyUnit = useCallback((unit: DisplayCurrencyUnit) => {
    setState((prev) => ({ ...prev, displayCurrencyUnit: unit }));
  }, []);

  const setRoundingMode = useCallback((mode: RoundingMode) => {
    setState((prev) => ({ ...prev, roundingMode: mode }));
  }, []);

  const selectProject = useCallback(
    (projectId: string, screen?: ScreenId, tab?: WorkspaceTabId) => {
      setState((prev) => ({
        ...prev,
        selectedProjectId: projectId,
        activeScreen: screen ?? prev.activeScreen,
        workspaceTab: tab ?? prev.workspaceTab,
      }));
    },
    []
  );



  // ==========================================
  // 案件管理アクション
  // ==========================================

  const addProject = useCallback(
    (input: {
      companyName: string;
      industry: string;
      salesRep: string;
      writerName: string;
      deadline: string;
      appliedTrackId?: SubsidyTrackId;
    }) => {
      const newId = `proj-${Date.now()}`;
      const code = `AN-2026-${String(Math.floor(Math.random() * 900) + 100)}`;
      const fm = createDemoCompanyFinancialMaster();
      if (input.appliedTrackId) {
        fm.appliedTrackId = input.appliedTrackId;
      }
      fm.planningYears = state.initialDefaults.planningYears;
      fm.employeeCountMethod = state.initialDefaults.employeeCountMethod;
      fm.simulation = JSON.parse(JSON.stringify(state.initialDefaults.simulationDefaults));

      const appliedTrackId = input.appliedTrackId || 'shinjigyo';
      const track =
        activeCallRound.tracks.find((t) => t.id === appliedTrackId) ??
        INITIAL_TRACKS[0];
      const scheduleItems = buildScheduleFromTemplate(
        state.scheduleTemplates,
        fm,
        track
      );

      const newProj: Project = {
        id: newId,
        code,
        companyName: input.companyName.trim() || '新規申請事業者',
        industry: input.industry.trim() || '製造業',
        salesRep: input.salesRep.trim() || '田中 健太',
        writerName: input.writerName.trim() || '佐藤 美咲',
        deadline: input.deadline || '2026-12-25',
        status: '未着手',
        appliedVersionId: state.activeVersionId,
        appliedTrackId: input.appliedTrackId || 'shinjigyo',
        financialMaster: fm,
        hearingMasterItems: [
          {
            id: 'h-1',
            title: '1. 企業概要・強み・競合優位性',
            content: `${input.companyName}の主力技術・取引基盤についてのメモ。`,
            prompt: '強みと優位性の抽出',
          },
          {
            id: 'h-2',
            title: '2. 現状課題・事業進出背景',
            content: '市場構造変化と新分野への進出理由。',
            prompt: '課題と新展開理由',
          },
          {
            id: 'h-3',
            title: '3. 導入設備仕様',
            content: '導入予定の機械・システム概要。',
            prompt: '設備仕様と工程集約',
          },
          {
            id: 'h-4',
            title: '4. 数値目標・投資効果',
            content: '売上増加・付加価値額向上・賃上げ計画。',
            prompt: '定性・定量効果',
          },
        ],
        rawHearingText: '',
        sections: [
          {
            id: 'sec-1',
            title: '1. 企業概要・経営環境',
            sourceMasterIds: ['h-1', 'h-2'],
            sourceMasterLabel: 'マスター① 企業概要 ＋ マスター② 現状課題',
            currentText: '',
            aiBaselineText: '',
            charLimit: 500,
            isModified: false,
          },
          {
            id: 'sec-2',
            title: '2. 具体的な取り組み（設備導入）',
            sourceMasterIds: ['h-3'],
            sourceMasterLabel: 'マスター③ 導入設備仕様',
            currentText: '',
            aiBaselineText: '',
            charLimit: 500,
            isModified: false,
          },
          {
            id: 'sec-3',
            title: '3. 将来の数値目標・賃上げ',
            sourceMasterIds: ['h-4'],
            sourceMasterLabel: 'マスター④ 数値目標',
            currentText: '',
            aiBaselineText: '',
            charLimit: 500,
            isModified: false,
          },
        ],
        gates: [
          {
            id: 'gate-1',
            number: 1,
            title: 'マスターヒアリング合意',
            description: '議事録・骨子確定',
            isPassed: false,
          },
          {
            id: 'gate-2',
            number: 2,
            title: '収支計画確定・ロック',
            description: 'BS/PL・要件確定',
            isPassed: false,
          },
          {
            id: 'gate-3',
            number: 3,
            title: '申請書ドラフト・整合性検証',
            description: '申請書本文突合',
            isPassed: false,
          },
          {
            id: 'gate-4',
            number: 4,
            title: '顧客最終承認・電子申請',
            description: '電子申請完了',
            isPassed: false,
          },
        ],
        scheduleTasks: [
          {
            id: 't-1',
            title: 'ヒアリング整理',
            category: 'support',
            startWeek: 1,
            endWeek: 2,
            status: 'not_started',
            gateId: 'gate-1',
          },
          {
            id: 't-2',
            title: '収支計画策定',
            category: 'support',
            startWeek: 3,
            endWeek: 4,
            status: 'not_started',
            gateId: 'gate-2',
          },
        ],
        schedule: {
          items: scheduleItems,
          viewMode: 'month',
        },
        manualChecks: {},
        masterItems: JSON.parse(JSON.stringify(DEMO_PROJECT_MARUMARU.masterItems)),
        hearingVariables: JSON.parse(JSON.stringify(DEMO_PROJECT_MARUMARU.hearingVariables)),
        subsidies: JSON.parse(JSON.stringify(DEMO_PROJECT_MARUMARU.subsidies)),
        updatedAt: formatNow(),
      };

      setState((prev) => ({
        ...prev,
        projects: [newProj, ...prev.projects],
        selectedProjectId: newId,
      }));
      return newId;
    },
    [state.activeVersionId, state.initialDefaults, state.scheduleTemplates, activeCallRound]
  );

  const updateProjectStatus = useCallback(
    (projectId: string, status: ProjectStatus) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId ? { ...p, status, updatedAt: formatNow() } : p
        ),
      }));
    },
    []
  );



  const updateProjectTrack = useCallback(
    (projectId: string, trackId: SubsidyTrackId) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const track =
            activeCallRound.tracks.find((t) => t.id === trackId) ?? INITIAL_TRACKS[0];
          const autoCalc = calculateFiscalYears(
            p.financialMaster.fiscalMonth,
            track.applicationDeadline,
            track.adoptionDate,
            track.executionPeriodMonths,
            track.grantDecisionLeadMonths,
            p.financialMaster.autoFiscalCalc.overriddenCurrentFY,
            p.financialMaster.autoFiscalCalc.overriddenBaseFY
          );
          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            appliedTrackId: trackId,
            autoFiscalCalc: autoCalc,
          };
          nextFM = reapplySimulationIfEnabled(nextFM);
          return {
            ...p,
            appliedTrackId: trackId,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    [activeCallRound]
  );

  const updatePlanningYears = useCallback(
    (projectId: string, years: PlanningYearsOption) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            planningYears: years,
          };
          nextFM.annualSalesEstimate = calculateAnnualSalesEstimate(
            nextFM,
            nextFM.annualSalesEstimate.method
          );
          nextFM = reapplySimulationIfEnabled(nextFM);
          return {
            ...p,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  const updateEmployeeCountMethod = useCallback(
    (projectId: string, method: EmployeeCountMethod) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            employeeCountMethod: method,
          };
          nextFM = reapplySimulationIfEnabled(nextFM);
          return {
            ...p,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  const updateAnnualSalesEstimateMethod = useCallback(
    (projectId: string, method: AnnualSalesEstimateMethod) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const nextEstimate = calculateAnnualSalesEstimate(p.financialMaster, method);
          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              annualSalesEstimate: nextEstimate,
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  const updateFiscalMonth = useCallback(
    (projectId: string, month: number) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const track =
            activeCallRound.tracks.find(
              (t) => t.id === p.financialMaster.appliedTrackId
            ) ?? INITIAL_TRACKS[0];
          const autoCalc = calculateFiscalYears(
            month,
            track.applicationDeadline,
            track.adoptionDate,
            track.executionPeriodMonths,
            track.grantDecisionLeadMonths,
            p.financialMaster.autoFiscalCalc.overriddenCurrentFY,
            p.financialMaster.autoFiscalCalc.overriddenBaseFY
          );
          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            fiscalMonth: month,
            autoFiscalCalc: autoCalc,
          };
          nextFM = reapplySimulationIfEnabled(nextFM);
          return {
            ...p,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    [activeCallRound]
  );

  const overrideFiscalYears = useCallback(
    (projectId: string, overriddenCurrentFY?: number, overriddenBaseFY?: number) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const track =
            activeCallRound.tracks.find(
              (t) => t.id === p.financialMaster.appliedTrackId
            ) ?? INITIAL_TRACKS[0];
          const autoCalc = calculateFiscalYears(
            p.financialMaster.fiscalMonth,
            track.applicationDeadline,
            track.adoptionDate,
            track.executionPeriodMonths,
            track.grantDecisionLeadMonths,
            overriddenCurrentFY,
            overriddenBaseFY
          );
          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            autoFiscalCalc: autoCalc,
          };
          nextFM = reapplySimulationIfEnabled(nextFM);
          return {
            ...p,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    [activeCallRound]
  );

  const updatePeriodMonths = useCallback(
    (projectId: string, periodKey: PeriodKey, months: number, note?: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const period = p.financialMaster.periods[periodKey];
          if (!period) return p;
          const updatedPL = {
            ...period.pl,
            periodMonths: months,
            isIrregularPeriod: months !== 12,
            periodNote: note,
          };
          const updatedFiscalInfo = {
            ...period.fiscalInfo,
            periodMonths: months,
            isIrregular: months !== 12,
          };
          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              periods: {
                ...p.financialMaster.periods,
                [periodKey]: {
                  ...period,
                  pl: updatedPL,
                  fiscalInfo: updatedFiscalInfo,
                },
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  // BS項目の更新（ネストされたパス対応）
  const updateBSItem = useCallback(
    (
      projectId: string,
      periodKey: PeriodKey,
      path: (string | number)[],
      value: number
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const period = p.financialMaster.periods[periodKey];
          if (!period) return p;
          const bsCopy = JSON.parse(JSON.stringify(period.bs)) as any;
          let target = bsCopy;
          for (let i = 0; i < path.length - 1; i++) {
            target = target[path[i]];
          }
          target[path[path.length - 1]] = value;
          const calculatedBS = recalculateBS(bsCopy);

          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              periods: {
                ...p.financialMaster.periods,
                [periodKey]: {
                  ...period,
                  bs: calculatedBS,
                },
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  // PL項目の更新（既存事業 / 補助事業 / ルート項目）
  const updatePLItem = useCallback(
    (
      projectId: string,
      periodKey: PeriodKey,
      segment: 'existingBusiness' | 'subsidyBusiness' | 'root',
      field: string,
      value: number
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const period = p.financialMaster.periods[periodKey];
          if (!period) return p;
          const plCopy = JSON.parse(JSON.stringify(period.pl)) as any;
          if (segment === 'root') {
            plCopy[field] = value;
          } else {
            plCopy[segment][field] = value;
          }
          const calculatedPL = recalculatePL(plCopy);

          const nextPeriods = {
            ...p.financialMaster.periods,
            [periodKey]: {
              ...period,
              pl: calculatedPL,
            },
          };

          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            periods: nextPeriods,
          };
          nextFM.annualSalesEstimate = calculateAnnualSalesEstimate(
            nextFM,
            nextFM.annualSalesEstimate.method
          );

          // 実績期（yMinus2, yMinus1, y0）の変更時、シミュレーションが有効なら予測期を再計算
          const isHistorical = !FORECAST_PERIOD_KEYS.includes(periodKey as any);
          if (isHistorical) {
            nextFM = reapplySimulationIfEnabled(nextFM);
          }

          return {
            ...p,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  // 投資計画の更新
  const updateInvestment = useCallback(
    (projectId: string, updates: Partial<InvestmentPlanYen>) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const inv = {
            ...p.financialMaster.investment,
            ...updates,
          };
          inv.totalInvestmentYen =
            (inv.newMachineryInvestment || 0) +
            (inv.intangibleAssetInvestment || 0) +
            (inv.rdCost || 0) +
            (inv.humanResourceDevelopmentCost || 0);

          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              investment: inv,
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  // 賃上げ特例フラグ切り替え
  const toggleWageSpecial = useCallback((projectId: string, isApplied: boolean) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              financialMaster: {
                ...p.financialMaster,
                isWageSpecialApplied: isApplied,
              },
              updatedAt: formatNow(),
            }
            : p
      ),
    }));
  }, []);

  /**
   * 計画シミュレーション前提値の更新
   */
  const updateSimulation = useCallback(
    (projectId: string, updates: Partial<PlanSimulation>) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          if (p.financialMaster.status === 'locked') return p;

          const updatedSim: PlanSimulation = {
            ...p.financialMaster.simulation,
            ...updates,
          };

          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            simulation: updatedSim,
          };

          if (updatedSim.enabled) {
            const { fm: simFM } = applySimulation(nextFM);
            nextFM = simFM;
            nextFM.annualSalesEstimate = calculateAnnualSalesEstimate(
              nextFM,
              nextFM.annualSalesEstimate.method
            );
          }

          return {
            ...p,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  /**
   * 自動計算モードの有効化・無効化
   */
  const setSimulationEnabled = useCallback(
    (projectId: string, enabled: boolean) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          if (p.financialMaster.status === 'locked') return p;

          const updatedSim: PlanSimulation = {
            ...p.financialMaster.simulation,
            enabled,
          };

          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            simulation: updatedSim,
          };

          if (enabled) {
            const { fm: simFM } = applySimulation(nextFM);
            nextFM = simFM;
            nextFM.annualSalesEstimate = calculateAnnualSalesEstimate(
              nextFM,
              nextFM.annualSalesEstimate.method
            );
          }

          return {
            ...p,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  /**
   * 固定ピンの切り替え（STEP C）
   * ロック中（status === 'locked'）は無視
   */
  const togglePin = useCallback((projectId: string, key: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        if (p.financialMaster.status === 'locked') return p;

        const currentPinned = p.financialMaster.simulation.pinnedKeys || [];
        const nextPinned = currentPinned.includes(key)
          ? currentPinned.filter((k) => k !== key)
          : [...currentPinned, key];

        return {
          ...p,
          financialMaster: {
            ...p.financialMaster,
            simulation: {
              ...p.financialMaster.simulation,
              pinnedKeys: nextPinned,
            },
          },
          updatedAt: formatNow(),
        };
      }),
    }));
  }, []);

  /**
   * 逆算（自動調整）対象変数の更新（STEP C）
   */
  const updateSolverTargets = useCallback(
    (
      projectId: string,
      targets: { key: string; min: number; max: number; step: number }[]
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              simulation: {
                ...p.financialMaster.simulation,
                solverTargets: targets,
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  /**
   * 逆算（自動調整）結果の適用（STEP C）
   * simulation を置き換えて applySimulation
   * ロック中（status === 'locked'）は無視
   */
  const applySolverResult = useCallback(
    (projectId: string, simulation: PlanSimulation) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          if (p.financialMaster.status === 'locked') return p;

          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            simulation,
          };

          const { fm: simFM } = applySimulation(nextFM);
          nextFM = simFM;
          nextFM.annualSalesEstimate = calculateAnnualSalesEstimate(
            nextFM,
            nextFM.annualSalesEstimate.method
          );

          return {
            ...p,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  /**
   * 収支計画版の保存（STEP C）
   * 現在の値から PlanSnapshot を作り planVersions の先頭に追加（id は 'ver-' + Date.now()）
   */
  const savePlanVersion = useCallback(
    (projectId: string, name: string, memo: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const fm = p.financialMaster;
          const snapshot: PlanSnapshot = {
            periods: JSON.parse(JSON.stringify(fm.periods)),
            simulation: JSON.parse(JSON.stringify(fm.simulation)),
            investment: JSON.parse(JSON.stringify(fm.investment)),
            planningYears: fm.planningYears,
            appliedTrackId: fm.appliedTrackId,
            isWageSpecialApplied: fm.isWageSpecialApplied,
            employeeCountMethod: fm.employeeCountMethod,
            fiscalMonth: fm.fiscalMonth,
          };

          const newVersion: PlanVersion = {
            id: `ver-${Date.now()}`,
            name: name.trim() || `版 ${formatNow()}`,
            memo: memo.trim(),
            createdAt: formatNow(),
            snapshot,
          };

          return {
            ...p,
            financialMaster: {
              ...fm,
              planVersions: [newVersion, ...(fm.planVersions || [])],
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  /**
   * 収支計画版の復元（STEP C）
   * snapshot の各項目を fm に戻す（planVersions は残す）。
   * autoFiscalCalc は calculateFiscalYears で再計算
   * ロック中（status === 'locked'）は無視
   */
  const restorePlanVersion = useCallback((projectId: string, versionId: string) => {
    setState((prev) => {
      const round =
        prev.callRounds.find((r) => r.id === prev.activeVersionId) ||
        prev.callRounds[0];
      return {
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          if (p.financialMaster.status === 'locked') return p;

          const targetVer = (p.financialMaster.planVersions || []).find(
            (v) => v.id === versionId
          );
          if (!targetVer) return p;

          const s = targetVer.snapshot;
          const track =
            round.tracks.find((t) => t.id === s.appliedTrackId) || round.tracks[0];
          const autoCalc = calculateFiscalYears(
            s.fiscalMonth,
            track.applicationDeadline,
            track.adoptionDate,
            track.executionPeriodMonths,
            track.grantDecisionLeadMonths
          );

          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            periods: JSON.parse(JSON.stringify(s.periods)),
            simulation: JSON.parse(JSON.stringify(s.simulation)),
            investment: JSON.parse(JSON.stringify(s.investment)),
            planningYears: s.planningYears,
            appliedTrackId: s.appliedTrackId,
            isWageSpecialApplied: s.isWageSpecialApplied,
            employeeCountMethod: s.employeeCountMethod,
            fiscalMonth: s.fiscalMonth,
            autoFiscalCalc: autoCalc,
          };

          if (nextFM.simulation.enabled) {
            const { fm: simFM } = applySimulation(nextFM);
            nextFM = simFM;
            nextFM.annualSalesEstimate = calculateAnnualSalesEstimate(
              nextFM,
              nextFM.annualSalesEstimate.method
            );
          }

          return {
            ...p,
            appliedTrackId: s.appliedTrackId,
            financialMaster: nextFM,
            updatedAt: formatNow(),
          };
        }),
      };
    });
  }, []);

  /**
   * 収支計画版の削除（STEP C）
   */
  const deletePlanVersion = useCallback((projectId: string, versionId: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          financialMaster: {
            ...p.financialMaster,
            planVersions: (p.financialMaster.planVersions || []).filter(
              (v) => v.id !== versionId
            ),
          },
          updatedAt: formatNow(),
        };
      }),
    }));
  }, []);

  /**
   * 説明文の更新（STEP C）
   */
  const updateNarrative = useCallback(
    (projectId: string, id: 'valueAdded' | 'wage', text: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              narratives: {
                ...(p.financialMaster.narratives || { valueAdded: '', wage: '' }),
                [id]: text,
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  /**
   * 逆算調整候補変数の更新（管理画面用・STEP C）
   */
  const updateSolverCandidates = useCallback((candidates: SolverCandidate[]) => {
    setState((prev) => ({
      ...prev,
      solverCandidates: candidates,
    }));
  }, []);

  /**
   * 説明文テンプレートの更新（管理画面用・STEP C）
   */
  const updateNarrativeTemplates = useCallback((templates: NarrativeTemplate[]) => {
    setState((prev) => ({
      ...prev,
      narrativeTemplates: templates,
    }));
  }, []);

  // 収支計画ロック・解除
  const lockFinancialPlan = useCallback((projectId: string) => {
    const now = formatNow();
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        const nextGates = p.gates.map((g) =>
          g.id === 'gate-2' ? { ...g, isPassed: true, passedAt: now } : g
        );
        return {
          ...p,
          status: p.status === '未着手' ? '申請書作成中' : p.status,
          financialMaster: {
            ...p.financialMaster,
            status: 'locked',
            lockedAt: now,
          },
          gates: nextGates,
          updatedAt: now,
        };
      }),
    }));
  }, []);

  const unlockFinancialPlan = useCallback((projectId: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        const nextGates = p.gates.map((g) =>
          g.id === 'gate-2' ? { ...g, isPassed: false, passedAt: undefined } : g
        );
        return {
          ...p,
          financialMaster: {
            ...p.financialMaster,
            status: 'draft',
            lockedAt: undefined,
          },
          gates: nextGates,
          updatedAt: formatNow(),
        };
      }),
    }));
  }, []);

  // ガント・ゲート管理
  const updateTaskStatus = useCallback(
    (projectId: string, taskId: string, status: GanttTask['status']) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const targetTask = p.scheduleTasks.find((t) => t.id === taskId);
          const nextTasks = p.scheduleTasks.map((t) =>
            t.id === taskId ? { ...t, status } : t
          );

          // 【STEP F】gateId のあるタスクは schedule.items も同期
          let nextSchedule = p.schedule;
          if (targetTask?.gateId && p.schedule) {
            nextSchedule = {
              ...p.schedule,
              items: p.schedule.items.map((it) =>
                it.gateId === targetTask.gateId ? { ...it, status } : it
              ),
            };
          }

          return {
            ...p,
            scheduleTasks: nextTasks,
            schedule: nextSchedule,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  const setGatePassed = useCallback(
    (projectId: string, gateId: PhaseGate['id'], isPassed: boolean) => {
      const now = formatNow();
      const nextStatus: GanttTask['status'] = isPassed ? 'completed' : 'not_started';
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const nextGates = p.gates.map((g) =>
            g.id === gateId
              ? { ...g, isPassed, passedAt: isPassed ? now : undefined }
              : g
          );
          // 該当ゲートの scheduleTasks と schedule.items を同期
          const nextTasks = p.scheduleTasks.map((t) =>
            t.gateId === gateId ? { ...t, status: nextStatus } : t
          );
          let nextSchedule = p.schedule;
          if (p.schedule) {
            nextSchedule = {
              ...p.schedule,
              items: p.schedule.items.map((it) =>
                it.gateId === gateId ? { ...it, status: nextStatus } : it
              ),
            };
          }

          return {
            ...p,
            gates: nextGates,
            scheduleTasks: nextTasks,
            schedule: nextSchedule,
            updatedAt: now,
          };
        }),
      }));
    },
    []
  );

  /**
   * 【STEP F】全体スケジュール（ガント）の更新
   * gateId を持つ項目の status 変更時は scheduleTasks および gates とも同期する
   */
  const updateSchedule = useCallback(
    (
      projectId: string,
      updater: (s: ProjectSchedule) => ProjectSchedule
    ) => {
      const now = formatNow();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const currentSchedule = p.schedule || { items: [], viewMode: 'month' };
          const nextSchedule = updater(currentSchedule);

          let nextTasks = [...p.scheduleTasks];
          let nextGates = [...p.gates];

          // ScheduleItem の status が変わったとき、gateId のある項目は既存の scheduleTasks / gates も同期
          for (const item of nextSchedule.items) {
            if (item.gateId) {
              const prevItem = currentSchedule.items.find((x) => x.id === item.id);
              if (!prevItem || prevItem.status !== item.status) {
                nextTasks = nextTasks.map((t) =>
                  t.gateId === item.gateId ? { ...t, status: item.status } : t
                );
                nextGates = nextGates.map((g) =>
                  g.id === item.gateId
                    ? {
                        ...g,
                        isPassed: item.status === 'completed',
                        passedAt: item.status === 'completed' ? (g.passedAt || now) : undefined,
                      }
                    : g
                );
              }
            }
          }

          return {
            ...p,
            schedule: nextSchedule,
            scheduleTasks: nextTasks,
            gates: nextGates,
            updatedAt: now,
          };
        }),
      }));
    },
    []
  );

  /**
   * 【STEP F】締切日・採択日・財務マスターからスケジュールを再構築する
   * manual=true の項目および templateId 無しの手動追加タスクは維持される
   */
  const rebuildSchedule = useCallback(
    (projectId: string) => {
      const now = formatNow();
      setState((prev) => {
        const project = prev.projects.find((p) => p.id === projectId);
        if (!project) return prev;

        const round =
          prev.callRounds.find((r) => r.id === project.appliedVersionId) ||
          prev.callRounds.find((r) => r.id === prev.activeVersionId) ||
          prev.callRounds[0];
        const track =
          round?.tracks.find((t) => t.id === project.appliedTrackId) ||
          INITIAL_TRACKS.find((t) => t.id === project.appliedTrackId) ||
          INITIAL_TRACKS[0];

        const currentItems = project.schedule?.items || [];
        const newItems = buildScheduleFromTemplate(
          prev.scheduleTemplates,
          project.financialMaster,
          track,
          currentItems
        );

        return {
          ...prev,
          projects: prev.projects.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              schedule: {
                ...(p.schedule || { viewMode: 'month' }),
                items: newItems,
              },
              updatedAt: now,
            };
          }),
        };
      });
    },
    []
  );

  /**
   * 【STEP F】共有URL発行日時を記録する
   */
  const markScheduleShared = useCallback((projectId: string) => {
    const now = formatNow();
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          schedule: {
            ...(p.schedule || { items: [], viewMode: 'month' }),
            lastSharedAt: now,
          },
          updatedAt: now,
        };
      }),
    }));
  }, []);



  // 申請書セクションテキスト保存
  const saveSectionText = useCallback(
    (projectId: string, sectionId: string, text: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const nextSecs = p.sections.map((s) =>
            s.id === sectionId
              ? { ...s, currentText: text, isModified: text !== s.aiBaselineText }
              : s
          );
          return {
            ...p,
            sections: nextSecs,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  // ==========================================
  // 公募回（版）管理アクション
  // ==========================================

  const duplicateCallRound = useCallback(
    (sourceRoundId: string, newVersionCode: string) => {
      const newRoundId = `round-ver-${Date.now()}`;
      setState((prev) => {
        const source = prev.callRounds.find((r) => r.id === sourceRoundId);
        if (!source) return prev;
        const duplicated: SubsidyVersionRound = {
          ...JSON.parse(JSON.stringify(source)),
          id: newRoundId,
          versionCode: newVersionCode || `${source.versionCode} (複製)`,
          isLatest: false,
          createdAt: formatNow(),
        };
        return {
          ...prev,
          callRounds: [...prev.callRounds, duplicated],
          activeVersionId: newRoundId,
        };
      });
      return newRoundId;
    },
    []
  );

  const updateCallRound = useCallback(
    (roundId: string, updates: Partial<SubsidyVersionRound>) => {
      setState((prev) => ({
        ...prev,
        callRounds: prev.callRounds.map((r) =>
          r.id === roundId ? { ...r, ...updates } : r
        ),
      }));
    },
    []
  );



  const updateTrackInRound = useCallback(
    (roundId: string, trackId: SubsidyTrackId, updates: Partial<SubsidyTrack>) => {
      setState((prev) => ({
        ...prev,
        callRounds: prev.callRounds.map((r) => {
          if (r.id !== roundId) return r;
          const nextTracks = r.tracks.map((t) =>
            t.id === trackId ? { ...t, ...updates } : t
          );
          return { ...r, tracks: nextTracks };
        }),
      }));
    },
    []
  );



  const updateRequirementsInRound = useCallback(
    (roundId: string, updates: Partial<SubsidyRequirements>) => {
      setState((prev) => ({
        ...prev,
        callRounds: prev.callRounds.map((r) => {
          if (r.id !== roundId) return r;
          return {
            ...r,
            requirements: {
              ...r.requirements,
              ...updates,
            },
          };
        }),
      }));
    },
    []
  );



  const setActiveVersionId = useCallback((versionId: string) => {
    setState((prev) => ({ ...prev, activeVersionId: versionId }));
  }, []);

  // ==========================================
  // 初期前提値 & 仮の値管理
  // ==========================================

  const updateInitialDefaults = useCallback(
    (updates: Partial<InitialProjectDefaults>) => {
      setState((prev) => ({
        ...prev,
        initialDefaults: {
          ...prev.initialDefaults,
          ...updates,
        },
      }));
    },
    []
  );



  const updateTentativeItem = useCallback(
    (id: string, updates: Partial<TentativeItem>) => {
      setState((prev) => ({
        ...prev,
        tentativeItems: prev.tentativeItems.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );



  const addTentativeItem = useCallback((item: Omit<TentativeItem, 'id'>) => {
    const newItem: TentativeItem = {
      ...item,
      id: `tent-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      tentativeItems: [newItem, ...prev.tentativeItems],
    }));
  }, []);

  // ==========================================
  // 【STEP2】決算書PDF取込・見比べ・科目対応アクション
  // ==========================================

  /**
   * PDFファイルのアップロードとAI抽出・初期マッピング
   */
  const uploadPeriodStatementPdf = useCallback(
    async (
      projectId: string,
      periodKey: HistoricalPeriodKey,
      fileData: ArrayBuffer | Uint8Array,
      fileName: string
    ) => {
      // 1. IndexedDB にファイル実体を保存
      const fileRecordId = `pdf-${projectId}-${periodKey}-${Date.now()}`;
      await saveFileToIndexedDB({
        id: fileRecordId,
        projectId,
        fileName,
        fileType: 'application/pdf',
        fileSize: fileData.byteLength,
        data: fileData instanceof Uint8Array ? (fileData.buffer as ArrayBuffer) : fileData,
        uploadedAt: formatNow(),
        memo: `${periodKey} 決算書PDF取込ファイル`,
      });

      // 2. 会社別ルールと標準ルールをマージして適用
      const companyRules = state.companyAccountMappings[projectId] || [];
      const combinedRules = [...companyRules, ...state.standardAccountMappings];

      // 3. AIサービス（ダミー確定的抽出・ハッシュキャッシュ）を実行
      const record = await aiService.processFinancialPdfUpload(
        fileData,
        fileName,
        periodKey,
        projectId,
        combinedRules
      );
      record.fileRecordId = fileRecordId;

      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const currentImports = p.financialMaster.periodImports || {};
          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              periodImports: {
                ...currentImports,
                [periodKey]: record,
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));

      return record;
    },
    [state.companyAccountMappings, state.standardAccountMappings]
  );

  /**
   * 抽出された科目の金額を直接修正（修正履歴ログを保持）
   */
  const updateExtractedItemAmount = useCallback(
    (
      projectId: string,
      periodKey: HistoricalPeriodKey,
      itemId: string,
      newAmountYen: number,
      editorRole: string,
      reason?: string
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const importRecord = p.financialMaster.periodImports?.[periodKey];
          if (!importRecord || importRecord.isLocked) return p;

          const updatedItems = importRecord.extractedItems.map((item) => {
            if (item.id !== itemId) return item;
            if (item.currentAmountYen === newAmountYen) return item;

            const logEntry = {
              id: `log-${Date.now()}`,
              previousAmountYen: item.currentAmountYen,
              newAmountYen,
              modifiedAt: formatNow(),
              modifiedBy: editorRole,
              reason: reason || '見比べ画面による手動確認修正',
            };

            return {
              ...item,
              currentAmountYen: newAmountYen,
              isModified: true,
              modificationHistory: [logEntry, ...item.modificationHistory],
            };
          });

          const newConsistency = calculateStatementConsistency(updatedItems);

          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              periodImports: {
                ...p.financialMaster.periodImports,
                [periodKey]: {
                  ...importRecord,
                  extractedItems: updatedItems,
                  consistency: newConsistency,
                  updatedAt: formatNow(),
                },
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  /**
   * 科目の手動対応付け（マッピング・合算・除外）
   * 会社ごとの対応表に保存し、次回取込で自動適用
   */
  const assignAccountMapping = useCallback(
    (
      projectId: string,
      periodKey: HistoricalPeriodKey,
      itemId: string,
      action: AccountMappingAction,
      targetFieldKey: string,
      targetFieldLabel: string
    ) => {
      setState((prev) => {
        const targetProj = prev.projects.find((p) => p.id === projectId);
        if (!targetProj) return prev;
        const importRecord = targetProj.financialMaster.periodImports?.[periodKey];
        if (!importRecord || importRecord.isLocked) return prev;

        const targetItem = importRecord.extractedItems.find((i) => i.id === itemId);
        if (!targetItem) return prev;

        // 1. 会社別対応ルールの作成または更新
        const newRule: AccountMappingRule = {
          id: `comp-rule-${Date.now()}`,
          sourceAccountName: targetItem.sourceAccountName,
          action,
          targetFieldKey,
          targetFieldLabel,
          scope: 'company',
          companyId: projectId,
          note: `見比べ画面からの手動割当（${formatNow()}）`,
        };

        const existingCompanyRules = prev.companyAccountMappings[projectId] || [];
        const nextCompanyRules = [
          newRule,
          ...existingCompanyRules.filter(
            (r) => r.sourceAccountName !== targetItem.sourceAccountName
          ),
        ];

        // 2. 現在の抽出アイテム一覧に即時反映
        const updatedItems = importRecord.extractedItems.map((item) => {
          if (item.sourceAccountName !== targetItem.sourceAccountName) return item;
          return {
            ...item,
            status:
              action === 'exclude'
                ? ('excluded' as const)
                : action === 'aggregate'
                  ? ('aggregated' as const)
                  : ('mapped' as const),
            mappedFieldKey: action === 'exclude' ? 'excluded' : targetFieldKey,
            mappedFieldLabel:
              action === 'exclude'
                ? '【除外】計算対象外'
                : action === 'aggregate'
                  ? `【合算】${targetFieldLabel}`
                  : targetFieldLabel,
            mappingRuleId: newRule.id,
            isTentative: false,
          };
        });

        const newConsistency = calculateStatementConsistency(updatedItems);

        const updatedProjects = prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              periodImports: {
                ...p.financialMaster.periodImports,
                [periodKey]: {
                  ...importRecord,
                  extractedItems: updatedItems,
                  consistency: newConsistency,
                  updatedAt: formatNow(),
                },
              },
            },
            updatedAt: formatNow(),
          };
        });

        return {
          ...prev,
          companyAccountMappings: {
            ...prev.companyAccountMappings,
            [projectId]: nextCompanyRules,
          },
          projects: updatedProjects,
        };
      });
    },
    []
  );

  /**
   * 決算書に載らない項目（手入力）の保存
   */
  const updatePeriodOffBalanceInputs = useCallback(
    (
      projectId: string,
      periodKey: HistoricalPeriodKey,
      inputs: Partial<OffBalanceManualInputs>
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const importRecord = p.financialMaster.periodImports?.[periodKey];
          if (!importRecord || importRecord.isLocked) return p;

          const updatedOffBalance: OffBalanceManualInputs = {
            ...importRecord.offBalanceInputs,
            ...inputs,
          };

          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              periodImports: {
                ...p.financialMaster.periodImports,
                [periodKey]: {
                  ...importRecord,
                  offBalanceInputs: updatedOffBalance,
                  updatedAt: formatNow(),
                },
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  /**
   * 実績値の確定ロック（収支計画マスターの該当期へ正確に反映・ロック）
   */
  const lockPeriodImport = useCallback(
    (projectId: string, periodKey: HistoricalPeriodKey, role: Role) => {
      const now = formatNow();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const importRecord = p.financialMaster.periodImports?.[periodKey];
          if (!importRecord) return p;

          // 確定ロック状態への更新
          const lockedRecord: PeriodImportRecord = {
            ...importRecord,
            status: 'locked',
            step: 6,
            isLocked: true,
            lockedAt: now,
            lockedBy: `${role}（確定）`,
            updatedAt: now,
          };

          // 収支計画マスターの該当期（yMinus2, yMinus1, y0）へ数値を反映
          const targetPeriod = p.financialMaster.periods[periodKey];
          if (!targetPeriod) return p;

          const items = lockedRecord.extractedItems;
          const getSum = (key: string) =>
            items
              .filter((i) => i.mappedFieldKey === key && i.status !== 'excluded')
              .reduce((sum, i) => sum + i.currentAmountYen, 0);

          // PL更新
          const nextPL = JSON.parse(JSON.stringify(targetPeriod.pl));
          const salesVal = getSum('sales');
          const cosVal = getSum('costOfSales');
          const sgaVal = getSum('sga');
          const laborVal = getSum('laborCost');
          const deprecVal = getSum('depreciation');
          const opVal = getSum('operatingProfit');
          const nonOpInVal = getSum('nonOperatingIncome');
          const nonOpExpVal = getSum('nonOperatingExpenses');
          const ordVal = getSum('ordinaryProfit');
          const extInVal = getSum('extraordinaryIncome');
          const extLossVal = getSum('extraordinaryLosses');
          const taxVal = getSum('incomeTaxes');
          const netVal = getSum('netIncome');

          if (salesVal > 0) nextPL.existingBusiness.sales = salesVal;
          if (cosVal > 0) nextPL.existingBusiness.costOfSales = cosVal;
          if (sgaVal > 0) nextPL.existingBusiness.sga = sgaVal;
          if (laborVal > 0) nextPL.laborCost = laborVal;
          if (deprecVal > 0) nextPL.depreciation = deprecVal;
          if (opVal > 0) nextPL.existingBusiness.operatingProfit = opVal;
          if (nonOpInVal > 0) nextPL.nonOperatingIncome = nonOpInVal;
          if (nonOpExpVal > 0) nextPL.nonOperatingExpenses = nonOpExpVal;
          if (ordVal > 0) nextPL.ordinaryProfit = ordVal;
          if (extInVal > 0) nextPL.extraordinaryIncome = extInVal;
          if (extLossVal > 0) nextPL.extraordinaryLosses = extLossVal;
          if (taxVal > 0) nextPL.incomeTaxes = taxVal;
          if (netVal > 0) nextPL.netIncome = netVal;

          // 手入力項目（決算書外項目）を反映
          const ob = lockedRecord.offBalanceInputs;
          nextPL.numberOfEmployees = ob.numberOfEmployees;
          nextPL.totalWages = ob.totalWages;
          nextPL.numberOfDirectors = ob.numberOfDirectors;
          nextPL.directorRemuneration = ob.directorRemuneration;
          nextPL.workplaceMinWage = ob.workplaceMinWage;
          nextPL.regionalMinWage = ob.regionalMinWage;

          const calculatedPL = recalculatePL(nextPL);

          // BS更新
          const nextBS = JSON.parse(JSON.stringify(targetPeriod.bs));
          const cashVal = getSum('cashAndDeposits');
          const arVal = getSum('accountsReceivable');
          const notesRecVal = getSum('notesReceivable');
          const invVal = getSum('inventories');
          const bldVal = getSum('buildings');
          const machVal = getSum('machineryAndEquipment');
          const softVal = getSum('software');
          const apVal = getSum('accountsPayable');
          const notesPayVal = getSum('notesPayable');
          const shortBorrowVal = getSum('shortTermBorrowings');
          const longBorrowVal = getSum('longTermBorrowings');
          const capVal = getSum('capitalStock');
          const retainVal = getSum('retainedEarnings');

          if (cashVal > 0) nextBS.currentAssets.cashAndDeposits = cashVal;
          if (arVal > 0) nextBS.currentAssets.accountsReceivable = arVal;
          if (notesRecVal > 0) nextBS.currentAssets.notesReceivable = notesRecVal;
          if (invVal > 0) nextBS.currentAssets.inventories = invVal;
          if (bldVal > 0) nextBS.fixedAssets.tangibleFixedAssets.buildings = bldVal;
          if (machVal > 0)
            nextBS.fixedAssets.tangibleFixedAssets.machineryAndEquipment = machVal;
          if (softVal > 0)
            nextBS.fixedAssets.intangibleFixedAssets.software = softVal;
          if (apVal > 0) nextBS.currentLiabilities.accountsPayable = apVal;
          if (notesPayVal > 0) nextBS.currentLiabilities.notesPayable = notesPayVal;
          if (shortBorrowVal > 0)
            nextBS.currentLiabilities.shortTermBorrowings = shortBorrowVal;
          if (longBorrowVal > 0)
            nextBS.fixedLiabilities.longTermBorrowings = longBorrowVal;
          if (capVal > 0) nextBS.shareholdersEquity.capitalStock = capVal;
          if (retainVal > 0) nextBS.shareholdersEquity.retainedEarnings = retainVal;

          const calculatedBS = recalculateBS(nextBS);

          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            periods: {
              ...p.financialMaster.periods,
              [periodKey]: {
                ...targetPeriod,
                bs: calculatedBS,
                pl: calculatedPL,
              },
            },
            periodImports: {
              ...p.financialMaster.periodImports,
              [periodKey]: lockedRecord,
            },
          };
          nextFM = reapplySimulationIfEnabled(nextFM);

          return {
            ...p,
            financialMaster: nextFM,
            updatedAt: now,
          };
        }),
      }));
    },
    []
  );



  /**
   * 実績値の確定ロック解除（確認ダイアログ付き）
   */
  const unlockPeriodImport = useCallback(
    (projectId: string, periodKey: HistoricalPeriodKey) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const importRecord = p.financialMaster.periodImports?.[periodKey];
          if (!importRecord) return p;

          const unlockedRecord: PeriodImportRecord = {
            ...importRecord,
            status: 'mapped',
            step: 5,
            isLocked: false,
            lockedAt: undefined,
            lockedBy: undefined,
            updatedAt: formatNow(),
          };

          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              periodImports: {
                ...p.financialMaster.periodImports,
                [periodKey]: unlockedRecord,
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );



  // ==========================================
  // 管理画面向け 科目対応表管理アクション
  // ==========================================

  const addStandardMappingRule = useCallback(
    (rule: Omit<AccountMappingRule, 'id'>) => {
      const newRule: AccountMappingRule = {
        ...rule,
        id: `std-rule-${Date.now()}`,
        scope: 'standard',
      };
      setState((prev) => ({
        ...prev,
        standardAccountMappings: [newRule, ...prev.standardAccountMappings],
      }));
    },
    []
  );



  const updateStandardMappingRule = useCallback(
    (id: string, updates: Partial<AccountMappingRule>) => {
      setState((prev) => ({
        ...prev,
        standardAccountMappings: prev.standardAccountMappings.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      }));
    },
    []
  );



  const deleteStandardMappingRule = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      standardAccountMappings: prev.standardAccountMappings.filter((r) => r.id !== id),
    }));
  }, []);

  const addCompanyMappingRule = useCallback(
    (companyId: string, rule: Omit<AccountMappingRule, 'id'>) => {
      const newRule: AccountMappingRule = {
        ...rule,
        id: `comp-rule-${Date.now()}`,
        scope: 'company',
        companyId,
      };
      setState((prev) => {
        const existing = prev.companyAccountMappings[companyId] || [];
        return {
          ...prev,
          companyAccountMappings: {
            ...prev.companyAccountMappings,
            [companyId]: [newRule, ...existing],
          },
        };
      });
    },
    []
  );

  const updateCompanyMappingRule = useCallback(
    (companyId: string, id: string, updates: Partial<AccountMappingRule>) => {
      setState((prev) => {
        const existing = prev.companyAccountMappings[companyId] || [];
        return {
          ...prev,
          companyAccountMappings: {
            ...prev.companyAccountMappings,
            [companyId]: existing.map((r) => (r.id === id ? { ...r, ...updates } : r)),
          },
        };
      });
    },
    []
  );

  const deleteCompanyMappingRule = useCallback((companyId: string, id: string) => {
    setState((prev) => {
      const existing = prev.companyAccountMappings[companyId] || [];
      return {
        ...prev,
        companyAccountMappings: {
          ...prev.companyAccountMappings,
          [companyId]: existing.filter((r) => r.id !== id),
        },
      };
    });
  }, []);

  // ==========================================
  // 【STEP D】Excelテンプレート・セル対応表管理アクション
  // ==========================================

  /**
   * Excelテンプレートのメタデータ（ファイルIDやアップロード日時等）を更新する
   * @param id テンプレートID
   * @param updates 更新内容
   */
  const updateExcelTemplate = useCallback(
    (id: string, updates: Partial<ExcelTemplateDefinition>) => {
      setState((prev) => ({
        ...prev,
        excelTemplates: prev.excelTemplates.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    },
    []
  );

  /**
   * 新しいExcelセル対応定義を追加する
   * @param mapping セル対応定義（id除く）
   */
  const addExcelCellMapping = useCallback(
    (mapping: Omit<ExcelCellMapping, 'id'>) => {
      const newMapping: ExcelCellMapping = {
        ...mapping,
        id: `cell-map-${Date.now()}`,
      };
      setState((prev) => ({
        ...prev,
        excelCellMappings: [...prev.excelCellMappings, newMapping],
      }));
    },
    []
  );

  /**
   * Excelセル対応定義を更新する
   * @param id セル対応ID
   * @param updates 更新内容
   */
  const updateExcelCellMapping = useCallback(
    (id: string, updates: Partial<ExcelCellMapping>) => {
      setState((prev) => ({
        ...prev,
        excelCellMappings: prev.excelCellMappings.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }));
    },
    []
  );

  /**
   * Excelセル対応定義を削除する
   * @param id セル対応ID
   */
  const deleteExcelCellMapping = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      excelCellMappings: prev.excelCellMappings.filter((m) => m.id !== id),
    }));
  }, []);

  // ==========================================
  // 【STEP D】ガント標準テンプレート管理アクション
  // ==========================================

  /**
   * ガント標準テンプレートタスクを追加する
   * @param task タスク定義（id除く）
   */
  const addScheduleTemplate = useCallback(
    (task: Omit<ScheduleTemplateTask, 'id'>) => {
      const newTask: ScheduleTemplateTask = {
        ...task,
        id: `sched-task-${Date.now()}`,
      };
      setState((prev) => ({
        ...prev,
        scheduleTemplates: [...prev.scheduleTemplates, newTask],
      }));
    },
    []
  );

  /**
   * ガント標準テンプレートタスクを更新する
   * @param id タスクID
   * @param updates 更新内容
   */
  const updateScheduleTemplate = useCallback(
    (id: string, updates: Partial<ScheduleTemplateTask>) => {
      setState((prev) => ({
        ...prev,
        scheduleTemplates: prev.scheduleTemplates.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    },
    []
  );

  /**
   * ガント標準テンプレートタスクを削除する
   * @param id タスクID
   */
  const deleteScheduleTemplate = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      scheduleTemplates: prev.scheduleTemplates.filter((t) => t.id !== id),
    }));
  }, []);

  /**
   * ガント標準テンプレートタスクの表示順を上下に移動する
   * @param id タスクID
   * @param direction 'up' または 'down'
   */
  const moveScheduleTemplate = useCallback((id: string, direction: 'up' | 'down') => {
    setState((prev) => {
      const list = [...prev.scheduleTemplates];
      const index = list.findIndex((t) => t.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return {
        ...prev,
        scheduleTemplates: list,
      };
    });
  }, []);

  const exportBackup = useCallback(() => {
    exportDataAsJsonFile(state, `subsidy_mock_backup_${Date.now()}.json`);
  }, [state]);

  const importBackup = useCallback((jsonData: unknown) => {
    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error('インポートデータが不正な形式です。');
    }
    const normalized = normalizeState(jsonData);
    setState(normalized);
    saveToLocalStorage(APP_STORAGE_KEY, normalized);
    return true;
  }, []);

  // 初期状態への完全リセット
  const resetAllData = useCallback(() => {
    const fresh = createInitialAppState();
    setState(fresh);
    saveToLocalStorage(APP_STORAGE_KEY, fresh);
  }, []);

  return {
    state,
    selectedProject,
    activeCallRound,
    projectAppliedRound,
    projectAppliedTrack,
    setRole,
    setActiveScreen,
    setWorkspaceTab,
    setDisplayCurrencyUnit,
    setRoundingMode,
    selectProject,
    addProject,
    updateProjectStatus,
    updateProjectTrack,
    updatePlanningYears,
    updateEmployeeCountMethod,
    updateAnnualSalesEstimateMethod,
    updateFiscalMonth,
    overrideFiscalYears,
    updatePeriodMonths,
    updateBSItem,
    updatePLItem,
    updateInvestment,
    updateSimulation,
    setSimulationEnabled,
    toggleWageSpecial,
    lockFinancialPlan,
    unlockFinancialPlan,
    updateTaskStatus,
    setGatePassed,
    // STEP F アクション
    updateSchedule,
    rebuildSchedule,
    markScheduleShared,
    saveSectionText,
    duplicateCallRound,
    updateCallRound,
    updateTrackInRound,
    updateRequirementsInRound,
    setActiveVersionId,
    updateInitialDefaults,
    updateTentativeItem,
    addTentativeItem,
    // STEP2 アクション
    uploadPeriodStatementPdf,
    updateExtractedItemAmount,
    assignAccountMapping,
    updatePeriodOffBalanceInputs,
    lockPeriodImport,
    unlockPeriodImport,
    addStandardMappingRule,
    updateStandardMappingRule,
    deleteStandardMappingRule,
    addCompanyMappingRule,
    updateCompanyMappingRule,
    deleteCompanyMappingRule,
    // STEP C アクション
    togglePin,
    updateSolverTargets,
    applySolverResult,
    savePlanVersion,
    restorePlanVersion,
    deletePlanVersion,
    updateNarrative,
    updateSolverCandidates,
    updateNarrativeTemplates,
    // STEP D アクション
    updateExcelTemplate,
    addExcelCellMapping,
    updateExcelCellMapping,
    deleteExcelCellMapping,
    addScheduleTemplate,
    updateScheduleTemplate,
    deleteScheduleTemplate,
    moveScheduleTemplate,
    exportBackup,
    importBackup,
    resetAllData,
  };
}
