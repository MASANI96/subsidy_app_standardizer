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
  createDemoCompanyFinancialMaster,
  createInitialAppState,
  DEFAULT_DEMO_HEARING_VARIABLES,
  DEMO_PROJECT_MARUMARU,
  INITIAL_CALL_ROUNDS,
  INITIAL_CROSS_CHECK_PROMPT,
  INITIAL_TEXT_MODULES,
  INITIAL_TRACKS,
} from '../data/initialData';
import { aiService, calculateStatementConsistency } from '../services/aiService';
import {
  AccountMappingAction,
  AccountMappingRule,
  AICrossCheckIssue,
  AICrossCheckResult,
  AnnualSalesEstimateMethod,
  DisplayCurrencyUnit,
  DocumentStatus,
  EmployeeCountMethod,
  GanttTask,
  HearingVariables,
  HistoricalPeriodKey,
  InitialProjectDefaults,
  InvestmentPlanYen,
  OffBalanceManualInputs,
  PeriodImportRecord,
  PeriodKey,
  PhaseGate,
  PlanningYearsOption,
  PlanVersion,
  Project,
  ProjectFinancialMaster,
  ProjectStatus,
  Role,
  RoundingMode,
  ScreenId,
  SimulationConfig,
  SubsidyAppState,
  SubsidyRequirements,
  SubsidyTrack,
  SubsidyTrackId,
  SubsidyType,
  SubsidyVersionRound,
  TentativeItem,
  TextModule,
  WorkspaceTabId,
} from '../types';
import {
  applySimulation,
  buildConsistencyCheckItems,
  calculateAnnualSalesEstimate,
  calculateFiscalYears,
  evaluateRequirements,
  interpolateTags,
  recalculateBS,
  recalculatePL,
} from '../utils/financialCalculations';
import {
  exportDataAsJsonFile,
  loadFromLocalStorage,
  saveFileToIndexedDB,
  saveToLocalStorage,
} from '../utils/storageService';

export const APP_STORAGE_KEY = 'subsidy_standardization_mock_v5';
export const TOUR_SNAPSHOT_SESSION_KEY = 'subsidy_mock_tour_snapshot_v5';

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

  // projects は raw.projects の各要素について、financialMaster が無い案件は除外する
  if (Array.isArray(raw.projects)) {
    const validProjects = raw.projects.filter(
      (p: any) => p && typeof p === 'object' && p.financialMaster
    );
    if (validProjects.length > 0) {
      result.projects = validProjects.map((p: any, idx: number) => {
        const bp = base.projects[idx] || base.projects[0];
        const fm: ProjectFinancialMaster = {
          ...bp.financialMaster,
          ...p.financialMaster,
          simulation: p.financialMaster?.simulation ?? bp.financialMaster.simulation,
          planVersions:
            Array.isArray(p.financialMaster?.planVersions) &&
            p.financialMaster.planVersions.length > 0
              ? p.financialMaster.planVersions
              : bp.financialMaster.planVersions,
        };
        const subsidies = p.subsidies || bp.subsidies;
        const primaryDoc =
          subsidies?.['新事業進出・ものづくり商業サービス補助金'];
        const syncedSections =
          primaryDoc?.sections || p.sections || bp.sections;
        return {
          ...p,
          financialMaster: fm,
          masterItems: p.masterItems || bp.masterItems,
          hearingMasterItems: p.hearingMasterItems || bp.hearingMasterItems,
          hearingVariables: p.hearingVariables || bp.hearingVariables,
          subsidies,
          sections: syncedSections,
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

  // textModules が配列でなければ INITIAL_TEXT_MODULES
  if (!Array.isArray(result.textModules) || result.textModules.length === 0) {
    result.textModules = INITIAL_TEXT_MODULES;
  }

  // selectedProjectId の整合
  if (!result.projects.some((p: any) => p.id === result.selectedProjectId)) {
    result.selectedProjectId = result.projects[0]?.id || base.selectedProjectId;
  }

  return result as SubsidyAppState;
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
    [state.activeVersionId, state.initialDefaults]
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
          return {
            ...p,
            appliedTrackId: trackId,
            financialMaster: {
              ...p.financialMaster,
              appliedTrackId: trackId,
              autoFiscalCalc: autoCalc,
            },
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
          if (nextFM.simulation?.enabled) {
            nextFM = applySimulation(nextFM);
          } else {
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

  const updateEmployeeCountMethod = useCallback(
    (projectId: string, method: EmployeeCountMethod) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                financialMaster: {
                  ...p.financialMaster,
                  employeeCountMethod: method,
                },
                updatedAt: formatNow(),
              }
            : p
        ),
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
          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              fiscalMonth: month,
              autoFiscalCalc: autoCalc,
            },
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
          return {
            ...p,
            financialMaster: {
              ...p.financialMaster,
              autoFiscalCalc: autoCalc,
            },
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

          const nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            periods: nextPeriods,
          };
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
          inv.totalInvestment = inv.totalInvestmentYen;
          inv.subsidyRequested = inv.subsidyRequestedYen;

          let nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            investment: inv,
          };
          if (nextFM.simulation?.enabled) {
            nextFM = applySimulation(nextFM);
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

  // ==========================================
  // シミュレーション & 保存版管理アクション
  // ==========================================

  const updateSimulation = useCallback(
    (projectId: string, updates: Partial<SimulationConfig>) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const currentSim = p.financialMaster.simulation;
          if (!currentSim) return p;

          const nextSim: SimulationConfig = {
            ...currentSim,
            ...updates,
            existingSalesGrowthRate: {
              ...currentSim.existingSalesGrowthRate,
              ...(updates.existingSalesGrowthRate ?? {}),
            },
            subsidyMonthlyQty: {
              ...currentSim.subsidyMonthlyQty,
              ...(updates.subsidyMonthlyQty ?? {}),
            },
            newHires: {
              ...currentSim.newHires,
              ...(updates.newHires ?? {}),
            },
            perCapitaWageGrowthRate: {
              ...currentSim.perCapitaWageGrowthRate,
              ...(updates.perCapitaWageGrowthRate ?? {}),
            },
            workplaceMinWage: {
              ...currentSim.workplaceMinWage,
              ...(updates.workplaceMinWage ?? {}),
            },
            regionalMinWage: {
              ...currentSim.regionalMinWage,
              ...(updates.regionalMinWage ?? {}),
            },
          };

          const recalculatedFM = applySimulation(p.financialMaster, nextSim);
          return {
            ...p,
            financialMaster: recalculatedFM,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  const applySolvedFinancialMaster = useCallback(
    (projectId: string, solvedFM: ProjectFinancialMaster) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const nextFM: ProjectFinancialMaster = {
            ...solvedFM,
            planVersions: p.financialMaster.planVersions,
            periodImports: p.financialMaster.periodImports,
          };
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

  const savePlanVersion = useCallback(
    (projectId: string, name: string, memo: string) => {
      const now = formatNow();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const fm = p.financialMaster;
          if (!fm.simulation) return p;

          const round =
            prev.callRounds.find((r) => r.id === p.appliedVersionId) ??
            prev.callRounds.find((r) => r.id === prev.activeVersionId) ??
            prev.callRounds[0];
          const track =
            round.tracks.find((t) => t.id === fm.appliedTrackId) ?? round.tracks[0];
          const evalRes = evaluateRequirements(fm, track, round.requirements);
          const targetKey: PeriodKey =
            fm.planningYears === 3 ? 'p3' : fm.planningYears === 4 ? 'p4' : 'p5';

          const newVer: PlanVersion = {
            id: `ver-${Date.now()}`,
            name: name.trim() || `保存案 (${now})`,
            memo: memo.trim() || 'ユーザー保存シミュレーション案',
            createdAt: now,
            isPreset: false,
            simulation: JSON.parse(JSON.stringify(fm.simulation)),
            investment: JSON.parse(JSON.stringify(fm.investment)),
            planningYears: fm.planningYears,
            isWageSpecialApplied: fm.isWageSpecialApplied,
            periods: JSON.parse(JSON.stringify(fm.periods)),
            annualSalesEstimate: JSON.parse(JSON.stringify(fm.annualSalesEstimate)),
            summarySnapshot: {
              vaCAGR: evalRes.vaCAGR,
              wageCAGR: evalRes.wageCAGR,
              nearTermWageGrowthRate: evalRes.nearTermWageGrowthRate,
              isAllPassed: evalRes.isAllPassed,
              totalSalesTargetYen: fm.periods[targetKey].pl.totalSales,
              subsidySalesTargetYen: fm.periods[targetKey].pl.subsidyBusiness.sales,
            },
          };

          const existing = fm.planVersions ?? [];
          return {
            ...p,
            financialMaster: {
              ...fm,
              planVersions: [...existing, newVer],
            },
            updatedAt: now,
          };
        }),
      }));
    },
    []
  );

  const restorePlanVersion = useCallback((projectId: string, versionId: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        const targetVer = (p.financialMaster.planVersions ?? []).find(
          (v) => v.id === versionId
        );
        if (!targetVer) return p;

        const restoredFM: ProjectFinancialMaster = {
          ...p.financialMaster,
          simulation: JSON.parse(JSON.stringify(targetVer.simulation)),
          investment: JSON.parse(JSON.stringify(targetVer.investment)),
          planningYears: targetVer.planningYears,
          isWageSpecialApplied: targetVer.isWageSpecialApplied,
          periods: JSON.parse(JSON.stringify(targetVer.periods)),
          annualSalesEstimate: JSON.parse(JSON.stringify(targetVer.annualSalesEstimate)),
        };

        return {
          ...p,
          financialMaster: restoredFM,
          updatedAt: formatNow(),
        };
      }),
    }));
  }, []);

  const deletePlanVersion = useCallback((projectId: string, versionId: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          financialMaster: {
            ...p.financialMaster,
            planVersions: (p.financialMaster.planVersions ?? []).filter(
              (v) => v.id !== versionId || v.isPreset
            ),
          },
          updatedAt: formatNow(),
        };
      }),
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
          const nextTasks = p.scheduleTasks.map((t) =>
            t.id === taskId ? { ...t, status } : t
          );
          return {
            ...p,
            scheduleTasks: nextTasks,
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
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const nextGates = p.gates.map((g) =>
            g.id === gateId
              ? { ...g, isPassed, passedAt: isPassed ? now : undefined }
              : g
          );
          return {
            ...p,
            gates: nextGates,
            updatedAt: now,
          };
        }),
      }));
    },
    []
  );

  // 申請書セクションテキスト保存
  const saveSectionText = useCallback(
    (projectId: string, sectionId: string, text: string) => {
      const subsidyType: SubsidyType = '新事業進出・ものづくり商業サービス補助金';
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          const nextSecs = (doc?.sections ?? p.sections).map((s) =>
            s.id === sectionId
              ? { ...s, currentText: text, isModified: text !== s.aiBaselineText }
              : s
          );
          return {
            ...p,
            sections: nextSecs,
            subsidies: doc
              ? {
                  ...p.subsidies,
                  [subsidyType]: {
                    ...doc,
                    sections: nextSecs,
                  },
                }
              : p.subsidies,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  // ==========================================
  // ヒアリング・定性マスター連動アクション
  // ==========================================

  const updateRawHearingText = useCallback(
    (projectId: string, text: string, sourceNote?: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                rawHearingText: text,
                hearingSourceNote: sourceNote ?? p.hearingSourceNote,
                updatedAt: formatNow(),
              }
            : p
        ),
      }));
    },
    []
  );

  const updateHearingVariables = useCallback(
    (projectId: string, variables: HearingVariables) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                hearingVariables: variables,
                updatedAt: formatNow(),
              }
            : p
        ),
      }));
    },
    []
  );

  const importSampleHearingSheetExcel = useCallback((projectId: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              hearingVariables: JSON.parse(
                JSON.stringify(DEFAULT_DEMO_HEARING_VARIABLES)
              ),
              hearingSourceNote: `ヒアリングシート(Excel)取込: ${p.companyName} (${formatNow()})`,
              updatedAt: formatNow(),
            }
          : p
      ),
    }));
  }, []);

  const generateMasterFromHearing = useCallback((projectId: string) => {
    const now = formatNow();
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        const hv = p.hearingVariables;
        const unitYen = Number(hv?.newUnitPrice?.value || 5250000);
        const c1 = Number(hv?.newCustomerCountY1?.value || 7);
        const c3 = Number(hv?.newCustomerCountY3?.value || 10);
        const hires =
          Number(hv?.newHiresY1?.value || 2) +
          Number(hv?.newHiresY2?.value || 2) +
          Number(hv?.newHiresY3?.value || 1);
        const wageRate = Number(hv?.plannedWageGrowthRate?.value || 6.2);

        const nextMasterItems = p.masterItems.map((m, idx) => {
          if (idx === 3) {
            return {
              ...m,
              content: `新事業ユニット単価${Math.round(unitYen / 10000).toLocaleString()}万円/件・月間${c1}〜${c3}件の受注により補助事業売上を拡大し、新規雇用${hires}名および年率${wageRate.toFixed(1)}%の賃上げを実現する。`,
            };
          }
          return m;
        });

        const nextHearingItems = p.hearingMasterItems.map((hm, idx) => ({
          ...hm,
          content: nextMasterItems[idx]?.content ?? hm.content,
        }));

        const nextGates = p.gates.map((g) =>
          g.id === 'gate-1' ? { ...g, isPassed: true, passedAt: now } : g
        );

        return {
          ...p,
          status: p.status === '未着手' ? 'マスター作成済' : p.status,
          masterItems: nextMasterItems,
          hearingMasterItems: nextHearingItems,
          gates: nextGates,
          updatedAt: now,
        };
      }),
    }));
  }, []);

  const saveMasterItem = useCallback(
    (projectId: string, itemId: string, content: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const idx = p.masterItems.findIndex((m) => m.id === itemId);
          const nextMasterItems = p.masterItems.map((m) =>
            m.id === itemId ? { ...m, content } : m
          );
          const nextHearingItems = p.hearingMasterItems.map((hm, i) =>
            hm.id === itemId || i === idx ? { ...hm, content } : hm
          );
          return {
            ...p,
            masterItems: nextMasterItems,
            hearingMasterItems: nextHearingItems,
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  const syncMasterToSubsidies = useCallback((projectId: string) => {
    const now = formatNow();
    const subsidyType: SubsidyType = '新事業進出・ものづくり商業サービス補助金';
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;

        // 1. 算定変数をシミュレーション前提へ反映（単価・数量・新規雇用・賃上げ率）
        const hv = p.hearingVariables;
        let nextFM = p.financialMaster;
        if (nextFM.simulation) {
          const updatedSim: SimulationConfig = {
            ...nextFM.simulation,
            enabled: true,
            subsidyUnitPriceYen:
              Number(hv?.newUnitPrice?.value) ||
              nextFM.simulation.subsidyUnitPriceYen,
            subsidyMonthlyQty: {
              ...nextFM.simulation.subsidyMonthlyQty,
              p1: Number(hv?.newCustomerCountY1?.value) || nextFM.simulation.subsidyMonthlyQty.p1,
              p2: Number(hv?.newCustomerCountY2?.value) || nextFM.simulation.subsidyMonthlyQty.p2,
              p3: Number(hv?.newCustomerCountY3?.value) || nextFM.simulation.subsidyMonthlyQty.p3,
            },
            newHires: {
              ...nextFM.simulation.newHires,
              p1: Number(hv?.newHiresY1?.value) ?? nextFM.simulation.newHires.p1,
              p2: Number(hv?.newHiresY2?.value) ?? nextFM.simulation.newHires.p2,
              p3: Number(hv?.newHiresY3?.value) ?? nextFM.simulation.newHires.p3,
            },
            perCapitaWageGrowthRate: {
              ...nextFM.simulation.perCapitaWageGrowthRate,
              p1: Number(hv?.plannedWageGrowthRate?.value) || nextFM.simulation.perCapitaWageGrowthRate.p1,
              p2: Number(hv?.plannedWageGrowthRate?.value) || nextFM.simulation.perCapitaWageGrowthRate.p2,
              p3: Number(hv?.plannedWageGrowthRate?.value) || nextFM.simulation.perCapitaWageGrowthRate.p3,
              p4: Number(hv?.plannedWageGrowthRate?.value) || nextFM.simulation.perCapitaWageGrowthRate.p4,
              p5: Number(hv?.plannedWageGrowthRate?.value) || nextFM.simulation.perCapitaWageGrowthRate.p5,
            },
          };
          nextFM = applySimulation(nextFM, updatedSim);
        }

        const updatedProjectForTags = { ...p, financialMaster: nextFM };
        const currentDoc = p.subsidies[subsidyType];
        const sourceSections = currentDoc?.sections ?? p.sections;

        const nextSections = sourceSections.map((sec) => {
          const masterContents = sec.sourceMasterIds
            .map((mid) => p.masterItems.find((m) => m.id === mid)?.content || '')
            .filter(Boolean)
            .join('\n');
          const baseTemplate = masterContents || sec.aiBaselineText || sec.currentText;
          const interpolated = interpolateTags(baseTemplate, updatedProjectForTags);
          return {
            ...sec,
            aiBaselineText: interpolated,
            currentText: sec.isModified ? sec.currentText : interpolated,
          };
        });

        const nextGates = p.gates.map((g) =>
          g.id === 'gate-1' ? { ...g, isPassed: true, passedAt: now } : g
        );

        return {
          ...p,
          financialMaster: nextFM,
          sections: nextSections,
          subsidies: {
            ...p.subsidies,
            [subsidyType]: {
              subsidyType,
              status: currentDoc?.status || '下書き',
              sections: nextSections,
              lastSavedAt: now,
            },
          },
          gates: nextGates,
          updatedAt: now,
        };
      }),
    }));
  }, []);

  // ==========================================
  // 申請書エディタ アクション
  // ==========================================

  const updateSectionLength = useCallback(
    (
      projectId: string,
      subsidyType: SubsidyType,
      sectionId: string,
      length: '200' | '500' | 'custom'
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          if (!doc) return p;
          const nextSections = doc.sections.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  selectedLength: length,
                  charLimit: length === '200' ? 200 : length === '500' ? 500 : 400,
                }
              : s
          );
          return {
            ...p,
            sections: nextSections,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                sections: nextSections,
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  const regenerateSection = useCallback(
    (projectId: string, subsidyType: SubsidyType, sectionId: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          if (!doc) return p;

          const nextSections = doc.sections.map((s) => {
            if (s.id !== sectionId) return s;
            const masterJoined = s.sourceMasterIds
              .map((mid) => p.masterItems.find((m) => m.id === mid)?.content || '')
              .filter(Boolean)
              .join(' ');

            let rawDraft = '';
            if (s.selectedLength === '200') {
              rawDraft = interpolateTags(
                `${masterJoined.slice(0, 95)}。総額{設備投資額}の導入により新事業を展開し、3年後売上{3年後売上}・付加価値額年率{付加価値額年率}および給与伸び率{一人当たり給与伸び率}を確実に達成する。`,
                p
              );
            } else if (s.selectedLength === 'custom') {
              rawDraft = interpolateTags(
                `${masterJoined} 本投資（総額{設備投資額}：機械装置{機械装置費}・システム{システム費}）によりリードタイム{削減時間}を短縮し、新事業客単価{新事業客単価}×初年度{初年度客数}から着実に売上を拡大する。新規雇用{新規雇用人数}と一人当たり給与年率{一人当たり給与伸び率}の持続的賃上げを通じて地域経済へ貢献する。`,
                p
              );
            } else {
              rawDraft = interpolateTags(
                `【背景・取り組み概要】\n${masterJoined}\n\n【投資計画・技術優位性および工程変革】\n{企業名}（従業員{従業員数}）は、直前期売上{直前期売上}の事業基盤を活かしつつ、機械装置費{機械装置費}およびシステム費{システム費}（総投資額{設備投資額}・補助金交付申請額{補助金申請額}）を導入する。これにより従来比でリードタイム{削減時間}（年間{年間削減時間}）の削減と高精度加工の内製化を実現し、新事業客単価{新事業客単価}・初年度{初年度客数}の受注計画を着実に遂行する。\n\n【将来の収益・賃上げ目標】\n計画期間において全社売上高{3年後売上}（直前期比+{売上増加額}）、営業利益率{3年後営業利益率}を目指し、付加価値額年率{付加価値額年率}の成長を達成する。また新規雇用{新規雇用人数}および一人当たり給与伸び率{一人当たり給与伸び率}の賃上げ特例水準を継続し、投資額は約{回収年数}（年間CF増加額{年間CF増加額}）で回収する計画である。`,
                p
              );
            }

            return {
              ...s,
              aiBaselineText: rawDraft,
              currentText: rawDraft,
              isModified: false,
            };
          });

          return {
            ...p,
            sections: nextSections,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                sections: nextSections,
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  const updateSectionText = useCallback(
    (
      projectId: string,
      subsidyType: SubsidyType,
      sectionId: string,
      text: string
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          if (!doc) return p;
          const nextSections = doc.sections.map((s) =>
            s.id === sectionId
              ? { ...s, currentText: text, isModified: text !== s.aiBaselineText }
              : s
          );
          return {
            ...p,
            sections: nextSections,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                status: doc.status === '未作成' ? '下書き' : doc.status,
                sections: nextSections,
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  const replaceAllTagsInDoc = useCallback(
    (projectId: string, subsidyType: SubsidyType) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          if (!doc) return p;
          const nextSections = doc.sections.map((s) => {
            const replaced = interpolateTags(s.currentText, p);
            return {
              ...s,
              currentText: replaced,
              isModified: replaced !== s.aiBaselineText,
            };
          });
          return {
            ...p,
            sections: nextSections,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                sections: nextSections,
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  const updateDocumentStatus = useCallback(
    (projectId: string, subsidyType: SubsidyType, status: DocumentStatus) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          if (!doc) return p;
          return {
            ...p,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                status,
              },
            },
            updatedAt: formatNow(),
          };
        }),
      }));
    },
    []
  );

  const saveDocument = useCallback(
    (
      projectId: string,
      subsidyType: SubsidyType,
      explicitStatus?: DocumentStatus
    ): number => {
      const targetProj = state.projects.find((p) => p.id === projectId);
      const targetDoc = targetProj?.subsidies?.[subsidyType];
      const diffCount = targetDoc
        ? targetDoc.sections.filter((s) => s.isModified).length
        : 0;
      const now = formatNow();

      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          if (!doc) return p;
          return {
            ...p,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                status: explicitStatus ?? (doc.status === '未作成' ? '下書き' : doc.status),
                lastSavedAt: now,
              },
            },
            updatedAt: now,
          };
        }),
      }));

      return diffCount;
    },
    [state.projects]
  );

  // ==========================================
  // 整合性チェック & 手動チェックアクション
  // ==========================================

  const runAICrossCheck = useCallback(
    (projectId: string, subsidyType: SubsidyType): AICrossCheckResult | null => {
      const targetProj = state.projects.find((p) => p.id === projectId);
      if (!targetProj) return null;

      const now = formatNow();
      const items = buildConsistencyCheckItems(targetProj, subsidyType);
      const mismatchItems = items.filter((i) => i.status === 'mismatch');
      const unverifiedItems = items.filter((i) => i.status === 'unverified');

      const rawScore = 100 - mismatchItems.length * 18 - unverifiedItems.length * 6;
      const overallScore = Math.max(40, Math.min(100, rawScore));
      const isPass = mismatchItems.length === 0;

      const issues: AICrossCheckIssue[] = items.map((item) => ({
        severity:
          item.status === 'mismatch'
            ? 'error'
            : item.status === 'unverified'
              ? 'warning'
              : 'info',
        category: item.category,
        title: item.label,
        targetSection: item.documentSnippet,
        description: item.note,
        recommendation:
          item.status === 'match'
            ? 'このまま申請書へ提出可能です。'
            : item.status === 'mismatch'
              ? '収支計画タブまたは申請書エディタの変数タグ再置換／手動確認項目を対応してください。'
              : '申請書本文内に該当数値の明記または変数タグ置換を行ってください。',
      }));

      const result: AICrossCheckResult = {
        timestamp: now,
        isPass,
        overallScore,
        summary: isPass
          ? `${subsidyType}の申請書本文と収支計画マスター間の重大な数値矛盾は検出されませんでした（適合率 ${overallScore}点）。`
          : `${mismatchItems.length}件の要調整項目が検出されました。指摘事項を確認のうえ修正・合意確認を行ってください。`,
        issues,
      };

      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const nextGates = p.gates.map((g) =>
            g.id === 'gate-3'
              ? { ...g, isPassed: isPass, passedAt: isPass ? now : g.passedAt }
              : g
          );
          return {
            ...p,
            lastAICrossCheck: result,
            gates: nextGates,
            updatedAt: now,
          };
        }),
      }));

      return result;
    },
    [state.projects]
  );

  const toggleManualCheck = useCallback((projectId: string, checkId: string) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => {
        if (p.id !== projectId) return p;
        const curr = Boolean(p.manualChecks?.[checkId]);
        return {
          ...p,
          manualChecks: {
            ...p.manualChecks,
            [checkId]: !curr,
          },
          updatedAt: formatNow(),
        };
      }),
    }));
  }, []);

  // ==========================================
  // プロンプト・文章モジュール管理アクション
  // ==========================================

  const updateGenerationPrompt = useCallback(
    (roundId: string, promptId: string, promptText: string) => {
      setState((prev) => ({
        ...prev,
        callRounds: prev.callRounds.map((r) => {
          if (r.id !== roundId) return r;
          return {
            ...r,
            generationPrompts: r.generationPrompts.map((gp) =>
              gp.id === promptId ? { ...gp, promptText } : gp
            ),
          };
        }),
      }));
    },
    []
  );

  const updateCrossCheckPrompt = useCallback((prompt: string) => {
    setState((prev) => ({
      ...prev,
      callRounds: prev.callRounds.map((r) =>
        r.id === prev.activeVersionId ? { ...r, crossCheckPrompt: prompt } : r
      ),
    }));
  }, []);

  const addTextModule = useCallback((mod: Omit<TextModule, 'id'>) => {
    const newMod: TextModule = {
      ...mod,
      id: `mod-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      textModules: [newMod, ...(prev.textModules ?? INITIAL_TEXT_MODULES)],
    }));
  }, []);

  const updateTextModule = useCallback(
    (id: string, mod: Omit<TextModule, 'id'>) => {
      setState((prev) => ({
        ...prev,
        textModules: (prev.textModules ?? INITIAL_TEXT_MODULES).map((m) =>
          m.id === id ? { ...mod, id } : m
        ),
      }));
    },
    []
  );

  const deleteTextModule = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      textModules: (prev.textModules ?? INITIAL_TEXT_MODULES).filter(
        (m) => m.id !== id
      ),
    }));
  }, []);

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

          return {
            ...p,
            financialMaster: {
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
            },
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
    textModules: state.textModules ?? INITIAL_TEXT_MODULES,
    crossCheckPrompt: activeCallRound.crossCheckPrompt ?? INITIAL_CROSS_CHECK_PROMPT,
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
    toggleWageSpecial,
    updateSimulation,
    applySolvedFinancialMaster,
    savePlanVersion,
    restorePlanVersion,
    deletePlanVersion,
    lockFinancialPlan,
    unlockFinancialPlan,
    updateTaskStatus,
    setGatePassed,
    saveSectionText,
    updateRawHearingText,
    updateHearingVariables,
    importSampleHearingSheetExcel,
    generateMasterFromHearing,
    saveMasterItem,
    syncMasterToSubsidies,
    updateSectionLength,
    regenerateSection,
    updateSectionText,
    replaceAllTagsInDoc,
    updateDocumentStatus,
    saveDocument,
    runAICrossCheck,
    toggleManualCheck,
    updateGenerationPrompt,
    updateCrossCheckPrompt,
    addTextModule,
    updateTextModule,
    deleteTextModule,
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
    exportBackup,
    importBackup,
    resetAllData,
  };
}
