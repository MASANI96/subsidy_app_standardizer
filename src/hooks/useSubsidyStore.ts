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
  createEmptyBS,
  createEmptyPL,
  createInitialAppState,
  DEMO_PROJECT_MARUMARU,
  INITIAL_CALL_ROUNDS,
  INITIAL_TRACKS,
} from '../data/initialData';
import {
  AnnualSalesEstimateMethod,
  DisplayCurrencyUnit,
  EmployeeCountMethod,
  GanttTask,
  InitialProjectDefaults,
  InvestmentPlanYen,
  PeriodKey,
  PhaseGate,
  PlanningYearsOption,
  Project,
  ProjectFinancialMaster,
  ProjectStatus,
  Role,
  RoundingMode,
  ScreenId,
  SubsidyAppState,
  SubsidyRequirements,
  SubsidyTrack,
  SubsidyTrackId,
  SubsidyVersionRound,
  TentativeItem,
  WorkspaceTabId,
} from '../types';
import {
  calculateAnnualSalesEstimate,
  calculateFiscalYears,
  recalculateBS,
  recalculatePL,
} from '../utils/financialCalculations';
import {
  exportDataAsJsonFile,
  loadFromLocalStorage,
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

export function useSubsidyStore() {
  const [state, setState] = useState<SubsidyAppState>(() => {
    const loaded = loadFromLocalStorage<SubsidyAppState | null>(APP_STORAGE_KEY, null);
    if (
      loaded &&
      Array.isArray(loaded.projects) &&
      loaded.projects.length > 0 &&
      Array.isArray(loaded.callRounds) &&
      loaded.callRounds.length > 0 &&
      loaded.initialDefaults
    ) {
      return loaded;
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
          const nextFM: ProjectFinancialMaster = {
            ...p.financialMaster,
            planningYears: years,
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
  // バックアップ (JSON Export / Import)
  // ==========================================

  const exportBackup = useCallback(() => {
    exportDataAsJsonFile(state, `subsidy_mock_backup_${Date.now()}.json`);
  }, [state]);

  const importBackup = useCallback((jsonData: unknown) => {
    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error('インポートデータが不正な形式です。');
    }
    const candidate = jsonData as SubsidyAppState;
    if (
      Array.isArray(candidate.projects) &&
      Array.isArray(candidate.callRounds) &&
      candidate.initialDefaults
    ) {
      setState(candidate);
      saveToLocalStorage(APP_STORAGE_KEY, candidate);
      return true;
    }
    throw new Error('必要なプロパティ（projects, callRounds）が不足しています。');
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
    toggleWageSpecial,
    lockFinancialPlan,
    unlockFinancialPlan,
    updateTaskStatus,
    setGatePassed,
    saveSectionText,
    duplicateCallRound,
    updateCallRound,
    updateTrackInRound,
    updateRequirementsInRound,
    setActiveVersionId,
    updateInitialDefaults,
    updateTentativeItem,
    addTentativeItem,
    exportBackup,
    importBackup,
    resetAllData,
  };
}
