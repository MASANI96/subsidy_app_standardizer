import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Calendar, Check, FileCheck2, Lock } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { ConsistencyChecker } from './components/ConsistencyChecker';
import { FinancialMasterEditor } from './components/FinancialMasterEditor';
import { GanttSchedule } from './components/GanttSchedule';
import { GuidePanel } from './components/GuidePanel';
import { Header } from './components/Header';
import { HearingInput } from './components/HearingInput';
import { MappingTableScreen } from './components/MappingTableScreen';
import { OverviewSummaryModal } from './components/OverviewSummaryModal';
import { ProjectList } from './components/ProjectList';
import { PromptCollectionScreen } from './components/PromptCollectionScreen';
import { EditorExternalTarget, SubsidyEditor } from './components/SubsidyEditor';
import { TextModuleLibrary } from './components/TextModuleLibrary';
import {
  CURRENT_CALL_ROUND_THRESHOLDS,
  INITIAL_MASTER_TEMPLATES,
} from './data/initialData';
import {
  GUIDE_CHAPTERS,
  GuideChapter,
  GuideStep,
  GuideTarget,
  SpecCorrespondenceRow,
} from './data/guideSteps';
import { useSubsidyStore } from './hooks/useSubsidyStore';
import {
  AdminTabId,
  FinancialMasterSubTab,
  Project,
  ScreenId,
  SubsidyType,
  WorkspaceTabId,
} from './types';

const UI_STORAGE_KEY = 'subsidy_mock_ui_v5';

interface UiPersistState {
  guideOpen: boolean;
  currentChapterIndex: number;
  checkedStepIds: string[];
}

function loadUiPersistState(): UiPersistState {
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        guideOpen: typeof parsed.guideOpen === 'boolean' ? parsed.guideOpen : false,
        currentChapterIndex:
          typeof parsed.currentChapterIndex === 'number'
            ? parsed.currentChapterIndex
            : 0,
        checkedStepIds: Array.isArray(parsed.checkedStepIds)
          ? parsed.checkedStepIds
          : [],
      };
    }
  } catch {
    // Ignore
  }
  return {
    guideOpen: false,
    currentChapterIndex: 0,
    checkedStepIds: [],
  };
}

/**
 * 顧客共有用の閲覧専用スケジュール画面（?share=1 またはアプリ内プレビュー）
 */
const CustomerShareView: React.FC<{
  project: Project;
  trackName: string;
  executionMonths: number;
  canReturnToApp: boolean;
  onReturnToApp: () => void;
}> = ({ project, trackName, executionMonths, canReturnToApp, onReturnToApp }) => {
  const clientTasks = project.scheduleTasks.filter((t) => t.category === 'client');
  const supportTasks = project.scheduleTasks.filter((t) => t.category === 'support');
  const weeks = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-slate-900 text-white px-6 py-3.5 border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono text-blue-300">
              CLIENT READ-ONLY SCHEDULE VIEW
            </div>
            <h1 className="text-base font-bold">
              {project.companyName} 様 · 補助金申請 進行スケジュール＆準備事項（閲覧専用）
            </h1>
          </div>
          {canReturnToApp && (
            <button
              type="button"
              onClick={onReturnToApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>管理画面（ワークスペース）に戻る</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* 基本情報サマリー */}
        <section className="bg-white border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">対象補助金・適用枠</span>
            <span className="font-bold text-sm text-slate-900">{trackName}</span>
          </div>
          <div>
            <span className="text-slate-500 block">電子申請目標締切日</span>
            <span className="font-mono font-bold text-sm text-blue-900 inline-flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              {project.deadline}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">補助事業実施期間（採択・交付決定後）</span>
            <span className="font-mono font-bold text-sm text-slate-900">
              交付決定後 {executionMonths}か月間
            </span>
          </div>
        </section>

        {/* フェーズゲート進捗 */}
        <section className="bg-white border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            現在の進行フェーズ（Gate 1〜4）
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {project.gates.map((g) => (
              <div
                key={g.id}
                className={`border p-3.5 space-y-1.5 text-xs ${
                  g.isPassed
                    ? 'bg-emerald-50/50 border-emerald-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold">GATE 0{g.number}</span>
                  {g.isPassed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                      <Check className="w-3 h-3" /> 完了
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Lock className="w-3 h-3" /> 予定
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-900">
                  {g.title.replace(/^Gate \d:\s*/, '')}
                </div>
                <div className="text-[11px] text-slate-600">{g.description}</div>
              </div>
            ))}
          </div>
        </section>

        {/* お客様にてご準備・ご確認いただく事項 */}
        <section className="bg-white border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <FileCheck2 className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold text-slate-900">
              貴社側でご対応・ご準備いただく主要タスク
            </h2>
          </div>
          <div className="divide-y divide-slate-200 text-xs">
            {clientTasks.map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-900">{t.title}</span>
                  <span className="ml-2 text-[11px] font-mono text-slate-500">
                    （W{t.startWeek}〜W{t.endWeek}）
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold border ${
                    t.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : t.status === 'in_progress'
                        ? 'bg-sky-50 text-sky-900 border-sky-300'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  {t.status === 'completed'
                    ? '完了'
                    : t.status === 'in_progress'
                      ? '進行中'
                      : '予定'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 標準8週間ガント（閲覧専用） */}
        <section className="bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900">
              申請完了までの8週間スケジュール（顧客・支援側 全体図）
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="py-2 px-3 w-24">区分</th>
                  <th className="py-2 px-3">工程</th>
                  {weeks.map((w) => (
                    <th key={w} className="py-2 px-2 text-center font-mono w-12 border-l border-slate-200">
                      W{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[...clientTasks, ...supportTasks].map((task) => (
                  <tr key={task.id}>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold border ${
                          task.category === 'client'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {task.category === 'client' ? '貴社' : '支援側'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{task.title}</td>
                    {weeks.map((w) => {
                      const active = w >= task.startWeek && w <= task.endWeek;
                      return (
                        <td key={w} className="py-2.5 px-1 border-l border-slate-200">
                          {active && (
                            <div
                              className={`h-4 w-full ${
                                task.category === 'client' ? 'bg-amber-500' : 'bg-slate-800'
                              }`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default function App() {
  const {
    state,
    selectedProject,
    activeCallRound,
    projectAppliedTrack,
    textModules,
    crossCheckPrompt,
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
    uploadPeriodStatementPdf,
    updateExtractedItemAmount,
    assignAccountMapping,
    updatePeriodOffBalanceInputs,
    lockPeriodImport,
    unlockPeriodImport,
    addStandardMappingRule,
    deleteStandardMappingRule,
    addCompanyMappingRule,
    deleteCompanyMappingRule,
    exportBackup,
    importBackup,
    resetAllData,
  } = useSubsidyStore();

  const prefersReducedMotion = useReducedMotion();

  const [uiState, setUiState] = useState<UiPersistState>(() => loadUiPersistState());
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [overviewModalMode, setOverviewModalMode] = useState<'overview' | 'summary' | null>(null);
  const [sharePreviewProjectId, setSharePreviewProjectId] = useState<string | null>(null);

  const [financialExternalControl, setFinancialExternalControl] = useState<{
    subTab?: FinancialMasterSubTab;
    openModal?: 'versions' | 'export' | null;
    nonce: number;
  } | null>(null);
  const [editorExternalTarget, setEditorExternalTarget] =
    useState<EditorExternalTarget | null>(null);
  const [externalAdminTab, setExternalAdminTab] = useState<{
    tab: AdminTabId;
    nonce: number;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  // URL ?share=1 detection
  const urlShareParams = useMemo(() => {
    if (typeof window === 'undefined') return { isShare: false, projectId: null as string | null };
    const params = new URLSearchParams(window.location.search);
    return {
      isShare: params.get('share') === '1',
      projectId: params.get('projectId'),
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(uiState));
    } catch {
      // Ignore
    }
  }, [uiState]);

  const showNotice = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const clearExistingHighlights = useCallback(() => {
    document.querySelectorAll('.guide-highlight-active').forEach((el) => {
      el.classList.remove('guide-highlight-active');
    });
  }, []);

  const triggerGuideHighlight = useCallback(
    (guideId?: string) => {
      clearExistingHighlights();
      if (!guideId) return;
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }

      const tryFocus = (attempt: number) => {
        const el = document.querySelector(`[data-guide-id="${guideId}"]`);
        if (el) {
          el.classList.add('guide-highlight-active');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightTimerRef.current = window.setTimeout(() => {
            el.classList.remove('guide-highlight-active');
          }, 4500);
        } else if (attempt < 3) {
          window.setTimeout(() => tryFocus(attempt + 1), 180);
        }
      };

      window.setTimeout(() => tryFocus(0), 180);
    },
    [clearExistingHighlights]
  );

  const handleChangeScreen = useCallback(
    (screen: ScreenId) => {
      setActiveScreen(screen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setActiveScreen]
  );

  const handleChangeWorkspaceTab = useCallback(
    (tab: WorkspaceTabId) => {
      setWorkspaceTab(tab);
      if (state.activeScreen !== 'workspace') {
        setActiveScreen('workspace');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setWorkspaceTab, setActiveScreen, state.activeScreen]
  );

  const applyGuideTarget = useCallback(
    (target?: GuideTarget, guideId?: string) => {
      if (!target) {
        triggerGuideHighlight(guideId);
        return;
      }

      if (target.openOverviewModal !== undefined) {
        setOverviewModalMode(target.openOverviewModal);
      } else {
        setOverviewModalMode(null);
      }

      if (target.projectId) {
        selectProject(
          target.projectId,
          target.screen,
          target.workspaceTab
        );
      } else {
        if (target.screen) {
          setActiveScreen(target.screen);
        }
        if (target.workspaceTab) {
          setWorkspaceTab(target.workspaceTab);
          if (!target.screen) {
            setActiveScreen('workspace');
          }
        }
      }

      if (target.financialSubTab || target.openFinancialModal !== undefined) {
        setFinancialExternalControl({
          subTab: target.financialSubTab,
          openModal: target.openFinancialModal ?? null,
          nonce: Date.now(),
        });
      }

      if (target.adminTab) {
        setExternalAdminTab({
          tab: target.adminTab,
          nonce: Date.now(),
        });
      }

      triggerGuideHighlight(guideId);
    },
    [selectProject, setActiveScreen, setWorkspaceTab, triggerGuideHighlight]
  );

  const handleSelectChapter = useCallback(
    (chapterIndex: number, chapter: GuideChapter) => {
      const firstStep = chapter.steps[0];
      setUiState((prev) => ({
        ...prev,
        currentChapterIndex: chapterIndex,
      }));
      setActiveStepId(firstStep?.id ?? null);
      applyGuideTarget(
        firstStep?.target ?? chapter.defaultTarget,
        firstStep?.guideId
      );
    },
    [applyGuideTarget]
  );

  const handleSelectGuideStep = useCallback(
    (chapterIndex: number, step: GuideStep) => {
      setUiState((prev) => ({
        ...prev,
        currentChapterIndex: chapterIndex,
        checkedStepIds: prev.checkedStepIds.includes(step.id)
          ? prev.checkedStepIds
          : [...prev.checkedStepIds, step.id],
      }));
      setActiveStepId(step.id);
      applyGuideTarget(step.target, step.guideId);
    },
    [applyGuideTarget]
  );

  const handleSelectSpecRow = useCallback(
    (row: SpecCorrespondenceRow) => {
      applyGuideTarget(row.target, row.target.guideId);
    },
    [applyGuideTarget]
  );

  const handleReset = useCallback(() => {
    resetAllData();
    setUiState((prev) => ({
      ...prev,
      currentChapterIndex: 0,
      checkedStepIds: [],
    }));
    setActiveStepId(null);
    setOverviewModalMode(null);
    showNotice('すべての設定および案件データを初期プリセット状態にリセットしました。');
  }, [resetAllData, showNotice]);

  // ShareView Render Check (?share=1 or internal preview)
  const shareTargetProjectId = urlShareParams.isShare
    ? urlShareParams.projectId || selectedProject.id
    : sharePreviewProjectId;
  if (shareTargetProjectId) {
    const shareProject =
      state.projects.find((p) => p.id === shareTargetProjectId) ?? selectedProject;
    const shareTrack =
      activeCallRound.tracks.find(
        (t) => t.id === shareProject.financialMaster.appliedTrackId
      ) ?? projectAppliedTrack;
    return (
      <CustomerShareView
        project={shareProject}
        trackName={shareTrack.name}
        executionMonths={shareTrack.executionPeriodMonths}
        canReturnToApp={!urlShareParams.isShare}
        onReturnToApp={() => setSharePreviewProjectId(null)}
      />
    );
  }

  const viewKey =
    state.activeScreen === 'workspace'
      ? `workspace-${state.workspaceTab}`
      : state.activeScreen;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header
        role={state.role}
        activeScreen={state.activeScreen}
        workspaceTab={state.workspaceTab}
        projects={state.projects}
        selectedProject={selectedProject}
        activeCallRound={activeCallRound}
        displayCurrencyUnit={state.displayCurrencyUnit}
        roundingMode={state.roundingMode}
        guideOpen={uiState.guideOpen}
        onToggleGuide={() =>
          setUiState((prev) => ({ ...prev, guideOpen: !prev.guideOpen }))
        }
        onChangeRole={(nextRole) => {
          setRole(nextRole);
          showNotice(`操作ロールを「${nextRole}」に切り替えました。`);
        }}
        onChangeScreen={handleChangeScreen}
        onChangeWorkspaceTab={handleChangeWorkspaceTab}
        onSelectProject={(projectId) => selectProject(projectId)}
        onChangeDisplayCurrencyUnit={setDisplayCurrencyUnit}
        onChangeRoundingMode={setRoundingMode}
        onNavigateCallRoundAdmin={() => {
          setExternalAdminTab({ tab: 'callRounds', nonce: Date.now() });
          handleChangeScreen('admin');
        }}
        onResetAll={handleReset}
      />

      {/* Action Toast Feedback Banner */}
      {toastMessage && (
        <div className="bg-slate-900 text-white border-b border-slate-700 px-6 py-2 shadow-md">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 text-xs font-medium">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white font-mono px-1 cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Container: Guide Sidebar + Main Workspace */}
      <div className="flex-1 flex items-start">
        <GuidePanel
          isOpen={uiState.guideOpen}
          currentChapterIndex={uiState.currentChapterIndex}
          activeStepId={activeStepId}
          checkedStepIds={uiState.checkedStepIds}
          onClose={() =>
            setUiState((prev) => ({ ...prev, guideOpen: false }))
          }
          onSelectChapter={handleSelectChapter}
          onSelectStep={handleSelectGuideStep}
          onSelectSpecRow={handleSelectSpecRow}
          onHighlightGuideId={(guideId) => triggerGuideHighlight(guideId)}
          onResetAllData={handleReset}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={viewKey}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.12,
                  ease: 'easeOut',
                }}
              >
                {/* Screen 01: 案件一覧・台帳 */}
                {state.activeScreen === 'projects' && (
                  <ProjectList
                    projects={state.projects}
                    selectedProjectId={selectedProject.id}
                    role={state.role}
                    activeCallRound={activeCallRound}
                    displayCurrencyUnit={state.displayCurrencyUnit}
                    roundingMode={state.roundingMode}
                    onOpenWorkspace={(projectId, tab) => {
                      selectProject(projectId, 'workspace', tab);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onUpdateProjectStatus={updateProjectStatus}
                    onAddProject={addProject}
                    onNotify={showNotice}
                  />
                )}

                {/* Screen 02: 案件ワークスペース */}
                {state.activeScreen === 'workspace' && (
                  <>
                    {/* Tab 01: 標準工程表・ゲート */}
                    {state.workspaceTab === 'schedule' && (
                      <GanttSchedule
                        project={selectedProject}
                        role={state.role}
                        executionPeriodMonths={projectAppliedTrack.executionPeriodMonths}
                        onUpdateTaskStatus={updateTaskStatus}
                        onToggleGatePassed={setGatePassed}
                        onNavigateTab={handleChangeWorkspaceTab}
                        onNavigateBackToList={() => handleChangeScreen('projects')}
                        onOpenShareView={(pId) => setSharePreviewProjectId(pId)}
                        onNotify={showNotice}
                      />
                    )}

                    {/* Tab 02: マスターヒアリングシート */}
                    {state.workspaceTab === 'hearing' && (
                      <HearingInput
                        project={selectedProject}
                        role={state.role}
                        promptSuggestionApplied={false}
                        onUpdateRawText={updateRawHearingText}
                        onUpdateHearingVariables={updateHearingVariables}
                        onImportSampleExcel={importSampleHearingSheetExcel}
                        onGenerateMaster={generateMasterFromHearing}
                        onSaveMasterItem={saveMasterItem}
                        onSyncMasterToSubsidies={syncMasterToSubsidies}
                        onNavigateToFinancial={() => handleChangeWorkspaceTab('financial')}
                        onNavigateBackToList={() => handleChangeScreen('projects')}
                        onNotify={showNotice}
                      />
                    )}

                    {/* Tab 03: 収支計画マスター計算シート */}
                    {state.workspaceTab === 'financial' && (
                      <FinancialMasterEditor
                        project={selectedProject}
                        role={state.role}
                        activeCallRound={activeCallRound}
                        displayCurrencyUnit={state.displayCurrencyUnit}
                        roundingMode={state.roundingMode}
                        standardAccountMappings={state.standardAccountMappings}
                        companyAccountMappings={
                          state.companyAccountMappings[selectedProject.id] ?? []
                        }
                        onUploadPdf={uploadPeriodStatementPdf}
                        onUpdateItemAmount={updateExtractedItemAmount}
                        onAssignMapping={assignAccountMapping}
                        onUpdateOffBalance={updatePeriodOffBalanceInputs}
                        onLockPeriod={lockPeriodImport}
                        onUnlockPeriod={unlockPeriodImport}
                        onUpdateTrack={updateProjectTrack}
                        onUpdatePlanningYears={updatePlanningYears}
                        onUpdateEmployeeCountMethod={updateEmployeeCountMethod}
                        onUpdateAnnualSalesEstimateMethod={updateAnnualSalesEstimateMethod}
                        onUpdateFiscalMonth={updateFiscalMonth}
                        onOverrideFiscalYears={overrideFiscalYears}
                        onUpdatePeriodMonths={updatePeriodMonths}
                        onUpdateBSItem={updateBSItem}
                        onUpdatePLItem={updatePLItem}
                        onUpdateInvestment={updateInvestment}
                        onToggleWageSpecial={toggleWageSpecial}
                        onUpdateSimulation={updateSimulation}
                        onApplySolvedFM={applySolvedFinancialMaster}
                        onSavePlanVersion={savePlanVersion}
                        onRestorePlanVersion={restorePlanVersion}
                        onDeletePlanVersion={deletePlanVersion}
                        onLockPlan={lockFinancialPlan}
                        onUnlockPlan={unlockFinancialPlan}
                        onNotify={showNotice}
                        externalControl={financialExternalControl ?? undefined}
                      />
                    )}

                    {/* Tab 04: 申請書作成・編集 */}
                    {state.workspaceTab === 'editor' && (
                      <SubsidyEditor
                        project={selectedProject}
                        role={state.role}
                        textModules={textModules}
                        activeCallRound={activeCallRound}
                        externalTarget={editorExternalTarget}
                        onUpdateSectionLength={updateSectionLength}
                        onRegenerateSection={regenerateSection}
                        onUpdateSectionText={updateSectionText}
                        onReplaceAllTagsInDoc={replaceAllTagsInDoc}
                        onSaveDocument={saveDocument}
                        onUpdateDocumentStatus={updateDocumentStatus}
                        onNavigateToFinancial={() => handleChangeWorkspaceTab('financial')}
                        onNavigateToConsistency={() =>
                          handleChangeWorkspaceTab('consistency')
                        }
                        onNavigateToAdminDiff={() => {
                          setExternalAdminTab({
                            tab: 'templates',
                            nonce: Date.now(),
                          });
                          handleChangeScreen('admin');
                        }}
                        onNotify={showNotice}
                      />
                    )}

                    {/* Tab 05: 整合性チェックリスト */}
                    {state.workspaceTab === 'consistency' && (
                      <ConsistencyChecker
                        project={selectedProject}
                        role={state.role}
                        thresholds={
                          activeCallRound.thresholds ?? CURRENT_CALL_ROUND_THRESHOLDS
                        }
                        crossCheckPrompt={crossCheckPrompt}
                        onRunAICrossCheck={runAICrossCheck}
                        onToggleManualCheck={toggleManualCheck}
                        onToggleGate3={(pId, isPassed) =>
                          setGatePassed(pId, 'gate-3', isPassed)
                        }
                        onNavigateTab={handleChangeWorkspaceTab}
                        onNavigatePromptsScreen={() => handleChangeScreen('prompts')}
                        onNotify={showNotice}
                      />
                    )}
                  </>
                )}

                {/* Screen 03: 文章モジュールライブラリ */}
                {state.activeScreen === 'library' && (
                  <TextModuleLibrary
                    role={state.role}
                    modules={textModules}
                    reviewCriteria={activeCallRound.reviewCriteria ?? []}
                    selectedProject={selectedProject}
                    onAddModule={addTextModule}
                    onUpdateModule={updateTextModule}
                    onDeleteModule={deleteTextModule}
                    onNavigateToWorkspaceEditor={() => {
                      selectProject(selectedProject.id, 'workspace', 'editor');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onNotify={showNotice}
                  />
                )}

                {/* Screen 04: マッピング表 */}
                {state.activeScreen === 'mapping' && (
                  <MappingTableScreen
                    project={selectedProject}
                    role={state.role}
                    activeCallRound={activeCallRound}
                    onJumpToEditorSection={(subsidyType: SubsidyType, sectionId: string) => {
                      setEditorExternalTarget({
                        subsidyType,
                        sectionId,
                        nonce: Date.now(),
                      });
                      handleChangeWorkspaceTab('editor');
                    }}
                    onJumpToFinancial={() => handleChangeWorkspaceTab('financial')}
                    onJumpToHearing={() => handleChangeWorkspaceTab('hearing')}
                  />
                )}

                {/* Screen 05: 生成AIプロンプト集 */}
                {state.activeScreen === 'prompts' && (
                  <PromptCollectionScreen
                    role={state.role}
                    activeCallRound={activeCallRound}
                    masterTemplates={INITIAL_MASTER_TEMPLATES}
                    crossCheckPrompt={crossCheckPrompt}
                    onUpdateGenerationPrompt={updateGenerationPrompt}
                    onUpdateCrossCheckPrompt={updateCrossCheckPrompt}
                    onNotify={showNotice}
                  />
                )}

                {/* Screen 06: 管理者設定 */}
                {state.activeScreen === 'admin' && (
                  <AdminDashboard
                    role={state.role}
                    callRounds={state.callRounds}
                    activeVersionId={state.activeVersionId}
                    initialDefaults={state.initialDefaults}
                    tentativeItems={state.tentativeItems}
                    displayCurrencyUnit={state.displayCurrencyUnit}
                    roundingMode={state.roundingMode}
                    projects={state.projects}
                    standardAccountMappings={state.standardAccountMappings}
                    companyAccountMappings={state.companyAccountMappings}
                    excelTemplates={state.excelTemplates}
                    ganttStandardTemplates={state.ganttStandardTemplates}
                    aiPromptTemplates={state.aiPromptTemplates}
                    externalAdminTab={externalAdminTab}
                    onSetActiveVersion={setActiveVersionId}
                    onDuplicateVersion={duplicateCallRound}
                    onUpdateCallRound={updateCallRound}
                    onUpdateTrack={updateTrackInRound}
                    onUpdateRequirements={updateRequirementsInRound}
                    onUpdateInitialDefaults={updateInitialDefaults}
                    onUpdateTentativeItem={updateTentativeItem}
                    onAddTentativeItem={addTentativeItem}
                    onAddStandardMapping={addStandardMappingRule}
                    onDeleteStandardMapping={deleteStandardMappingRule}
                    onAddCompanyMapping={addCompanyMappingRule}
                    onDeleteCompanyMapping={deleteCompanyMappingRule}
                    onExportBackup={exportBackup}
                    onImportBackup={importBackup}
                    onNotify={showNotice}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Quiet Enterprise Footer */}
          <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-8">
            <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                新事業進出・ものづくり商業サービス補助金 申請支援標準化システム（叩き台モック）
              </span>
              <span>
                保存: 案件データ・設定は localStorage / ファイル添付は IndexedDB（外部通信なし・完全確定的計算）
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* Overview / Summary Modal (Script 01 & Script 11) */}
      <OverviewSummaryModal
        mode={overviewModalMode}
        onClose={() => setOverviewModalMode(null)}
        onOpenStep={(stepNumber) => {
          setOverviewModalMode(null);
          const idx = Math.max(0, Math.min(stepNumber, GUIDE_CHAPTERS.length - 1));
          handleSelectChapter(idx, GUIDE_CHAPTERS[idx]);
        }}
      />
    </div>
  );
}
