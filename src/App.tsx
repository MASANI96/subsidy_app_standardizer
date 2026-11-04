import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AdminDashboard, AdminTabId } from './components/AdminDashboard';
import { ConsistencyChecker } from './components/ConsistencyChecker';
import { FinancialMasterEditor } from './components/FinancialMasterEditor';
import { GanttSchedule } from './components/GanttSchedule';
import { GuidePanel } from './components/GuidePanel';
import { Header } from './components/Header';
import { HearingInput } from './components/HearingInput';
import { MappingTableScreen } from './components/MappingTableScreen';
import { ProjectList } from './components/ProjectList';
import { PromptCollectionScreen } from './components/PromptCollectionScreen';
import {
  EditorExternalTarget,
  SubsidyEditor,
} from './components/SubsidyEditor';
import { TextModuleLibrary } from './components/TextModuleLibrary';
import { TourCompletionModal } from './components/TourCompletionModal';
import { WelcomeModal } from './components/WelcomeModal';
import { GuideStep, SpecCorrespondenceRow } from './data/guideSteps';
import { useDemoTour } from './hooks/useDemoTour';
import { useSubsidyStore } from './hooks/useSubsidyStore';
import {
  DocumentStatus,
  ScreenId,
  SubsidyType,
  WorkspaceTabId,
} from './types';
import { interpolateTags } from './utils/financialCalculations';

const UI_STORAGE_KEY = 'subsidy_mock_ui_v3';

interface UiPersistState {
  guideOpen: boolean;
  checkedStepIds: string[];
  hideWelcomeModal: boolean;
}

function loadUiPersistState(): UiPersistState {
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UiPersistState>;
      return {
        guideOpen:
          typeof parsed.guideOpen === 'boolean' ? parsed.guideOpen : true,
        checkedStepIds: Array.isArray(parsed.checkedStepIds)
          ? parsed.checkedStepIds
          : [],
        hideWelcomeModal: Boolean(parsed.hideWelcomeModal),
      };
    }
  } catch {
    // Ignore storage read error
  }
  return {
    guideOpen: true,
    checkedStepIds: [],
    hideWelcomeModal: false,
  };
}

export default function App() {
  const {
    state,
    selectedProject,
    activeCallRound,
    restoredFromTourReload,
    clearRestoredTourFlag,
    replaceState,
    setRole,
    setActiveScreen,
    setWorkspaceTab,
    selectProject,
    addProject,
    updateProjectStatus,
    updateTaskStatus,
    setGatePassed,
    updateRawHearingText,
    updateHearingVariables,
    importSampleHearingSheetExcel,
    generateMasterFromHearing,
    saveMasterItem,
    syncMasterToSubsidies,
    applyHearingDriversToForecast,
    updateSpecialFlags,
    updateFinancialField,
    updateInvestmentPlan,
    lockFinancialPlan,
    unlockFinancialPlan,
    updateSubsidySectionLength,
    regenerateSubsidySection,
    updateSubsidySectionText,
    replaceTagsInSubsidyDocument,
    saveSubsidyDocument,
    updateSubsidyStatus,
    addTextModule,
    updateTextModule,
    deleteTextModule,
    toggleManualCheck,
    runAICrossCheck,
    addMasterTemplate,
    updateMasterTemplate,
    deleteMasterTemplate,
    moveMasterTemplate,
    applyPromptImprovementSuggestion,
    setActiveCallRound,
    duplicateCallRound,
    updateCallRound,
    deleteCallRound,
    updateThresholds,
    updateReviewCriteriaForRound,
    updateGenerationPrompt,
    updateEffectEstimates,
    updateCrossCheckPrompt,
    resetAllData,
  } = useSubsidyStore();

  const prefersReducedMotion = useReducedMotion();

  // UI状態（ガイド開閉・進捗・初回モーダル抑止）: subsidy_mock_ui_v3
  const [uiState, setUiState] = useState<UiPersistState>(() =>
    loadUiPersistState()
  );
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    const initial = loadUiPersistState();
    return !initial.hideWelcomeModal;
  });
  const [activeGuideStepId, setActiveGuideStepId] = useState<string | null>(
    null
  );

  const [adminDefaultTab, setAdminDefaultTab] = useState<AdminTabId>('prompts');
  const [editorExternalTarget, setEditorExternalTarget] =
    useState<EditorExternalTarget | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const navTimerRef = useRef<number | null>(null);
  const highlightedElRef = useRef<Element | null>(null);
  const latestStateRef = useRef(state);
  latestStateRef.current = state;

  useEffect(() => {
    try {
      window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(uiState));
    } catch {
      // Ignore storage write error
    }
  }, [uiState]);

  const showNotice = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4200);
  }, []);

  // デモツアー途中リロード時の自動復元通知
  useEffect(() => {
    if (restoredFromTourReload) {
      showNotice('前回のデモツアー中断データを開始前の状態に復元しました。');
      clearRestoredTourFlag();
    }
  }, [restoredFromTourReload, clearRestoredTourFlag, showNotice]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (highlightTimerRef.current)
        window.clearTimeout(highlightTimerRef.current);
      if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
    };
  }, []);

  const setGuideOpen = useCallback((open: boolean) => {
    setUiState((prev) => ({ ...prev, guideOpen: open }));
  }, []);

  const highlightElementByGuideId = useCallback((guideId: string) => {
    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    if (highlightedElRef.current) {
      highlightedElRef.current.classList.remove('guide-highlight-active');
      highlightedElRef.current = null;
    }

    const el = document.querySelector(`[data-guide-id="${guideId}"]`);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('guide-highlight-active');
    highlightedElRef.current = el;

    highlightTimerRef.current = window.setTimeout(() => {
      el.classList.remove('guide-highlight-active');
      if (highlightedElRef.current === el) {
        highlightedElRef.current = null;
      }
    }, 2000);
  }, []);

  // デモツアーStep 12用：投資回収モジュール挿入＆保存（Diff自動蓄積）
  const appendTourModuleAndSave = useCallback(
    (
      projectId: string,
      subsidyType: SubsidyType,
      status: DocumentStatus
    ) => {
      const currentState = latestStateRef.current;
      const proj = currentState.projects.find((p) => p.id === projectId);
      if (!proj) return;
      const doc = proj.subsidies[subsidyType];
      const targetSec =
        doc.sections.find((s) => s.id === 'shin-3') ?? doc.sections[2];
      if (!targetSec) return;

      const roiMod =
        currentState.textModules.find((m) => m.id === 'mod-eff-short') ??
        currentState.textModules[0];
      const interpolatedSnippet = roiMod
        ? interpolateTags(roiMod.templateText, proj)
        : '設備投資額に対する投資回収年数は約3.2年と試算され、早期のキャッシュフロー黒字化と継続的な賃上げ原資の確保を実現する。';

      const marker = interpolatedSnippet.slice(0, 18);
      if (!targetSec.currentText.includes(marker)) {
        const nextText = targetSec.currentText
          ? `${targetSec.currentText}\n\n${interpolatedSnippet}`
          : interpolatedSnippet;
        updateSubsidySectionText(
          projectId,
          subsidyType,
          targetSec.id,
          nextText
        );
      }
      saveSubsidyDocument(projectId, subsidyType, status);
    },
    [saveSubsidyDocument, updateSubsidySectionText]
  );

  const {
    isCompletionModalOpen,
    startDemoTour,
    finishTourFromCompletionModal,
  } = useDemoTour({
    state,
    guideOpen: uiState.guideOpen,
    setGuideOpen,
    replaceState,
    setRole,
    setActiveScreen,
    setWorkspaceTab,
    setAdminTab: setAdminDefaultTab,
    setEditorExternalTarget,
    selectProject,
    updateRawHearingText,
    importSampleHearingSheetExcel,
    generateMasterFromHearing,
    syncMasterToSubsidies,
    applyHearingDriversToForecast,
    lockFinancialPlan,
    unlockFinancialPlan,
    appendTourModuleAndSave,
    runAICrossCheck,
    setGatePassed,
    onNotify: showNotice,
  });

  const handleChangeScreen = useCallback(
    (screen: ScreenId) => {
      if (screen === 'admin') {
        setAdminDefaultTab('prompts');
      }
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

  const handleNavigateAdminTab = useCallback(
    (tab: AdminTabId) => {
      setAdminDefaultTab(tab);
      setActiveScreen('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setActiveScreen]
  );

  // §4-A: ガイドステップのクリック動作（画面遷移＋スクロール＋2秒ハイライト＋完了記録）
  const handleSelectGuideStep = useCallback(
    (step: GuideStep) => {
      setActiveGuideStepId(step.id);
      setUiState((prev) => ({
        ...prev,
        checkedStepIds: prev.checkedStepIds.includes(step.id)
          ? prev.checkedStepIds
          : [...prev.checkedStepIds, step.id],
      }));

      if (step.target) {
        if (step.target.adminTab) {
          setAdminDefaultTab(step.target.adminTab);
        }
        if (step.target.projectId) {
          selectProject(
            step.target.projectId,
            step.target.screen,
            step.target.workspaceTab
          );
        } else {
          if (step.target.workspaceTab) {
            setWorkspaceTab(step.target.workspaceTab);
          }
          if (step.target.screen) {
            setActiveScreen(step.target.screen);
          }
        }
      }

      if (navTimerRef.current) {
        window.clearTimeout(navTimerRef.current);
      }
      navTimerRef.current = window.setTimeout(() => {
        highlightElementByGuideId(step.guideId);
      }, 160);
    },
    [highlightElementByGuideId, selectProject, setActiveScreen, setWorkspaceTab]
  );

  // §2 / §4-A: 指示書対応表の行クリック動作
  const handleSelectSpecRow = useCallback(
    (row: SpecCorrespondenceRow) => {
      if (row.target.adminTab) {
        setAdminDefaultTab(row.target.adminTab);
      }
      if (row.target.projectId) {
        selectProject(
          row.target.projectId,
          row.target.screen,
          row.target.workspaceTab
        );
      } else {
        if (row.target.workspaceTab) {
          setWorkspaceTab(row.target.workspaceTab);
        }
        setActiveScreen(row.target.screen);
      }

      if (row.target.guideId) {
        const targetGuideId = row.target.guideId;
        if (navTimerRef.current) {
          window.clearTimeout(navTimerRef.current);
        }
        navTimerRef.current = window.setTimeout(() => {
          highlightElementByGuideId(targetGuideId);
        }, 160);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [highlightElementByGuideId, selectProject, setActiveScreen, setWorkspaceTab]
  );

  // マッピング表セルクリック → 申請書エディタの該当補助金・セクションへジャンプ
  const handleJumpToEditorSection = useCallback(
    (subsidyType: SubsidyType, sectionId: string) => {
      setEditorExternalTarget({
        subsidyType,
        sectionId,
        nonce: Date.now(),
      });
      setActiveScreen('workspace');
      setWorkspaceTab('editor');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setActiveScreen, setWorkspaceTab]
  );

  // §5: データ初期化時は業務データのみリセットし、UI状態（subsidy_mock_ui_v3）は維持する
  const handleReset = useCallback(() => {
    resetAllData();
    setAdminDefaultTab('prompts');
    setEditorExternalTarget(null);
    showNotice('すべてのデータを初期プリセット状態にリセットしました。');
  }, [resetAllData, showNotice]);

  const effectMap = useMemo(() => {
    const map: Record<string, (typeof state.effectEstimates)[number]> = {};
    state.effectEstimates.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [state.effectEstimates]);

  const activeThresholds =
    activeCallRound?.thresholds ?? state.thresholds;

  const viewKey =
    state.activeScreen === 'workspace'
      ? `workspace-${state.workspaceTab}`
      : state.activeScreen;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        role={state.role}
        activeScreen={state.activeScreen}
        workspaceTab={state.workspaceTab}
        projects={state.projects}
        selectedProject={selectedProject}
        activeCallRound={activeCallRound}
        onChangeRole={(nextRole) => {
          setRole(nextRole);
          showNotice(`操作ロールを「${nextRole}」に切り替えました。`);
        }}
        onChangeScreen={handleChangeScreen}
        onChangeWorkspaceTab={handleChangeWorkspaceTab}
        onSelectProject={(projectId) => selectProject(projectId)}
        onNavigateCallRoundAdmin={() => handleNavigateAdminTab('thresholds')}
        onStartDemoTour={() => {
          setIsWelcomeOpen(false);
          void startDemoTour();
        }}
        onResetAll={handleReset}
      />

      {/* Action Feedback Banner */}
      {toastMessage && (
        <div className="bg-slate-800 text-white border-b border-slate-700 px-6 py-2">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 text-xs">
            <span>{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-300 hover:text-white font-mono px-1 cursor-pointer"
              aria-label="通知を閉じる"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Persistent Left Guide Panel + Main Content Area */}
      <div className="flex-1 flex items-stretch min-h-0">
        <GuidePanel
          isOpen={uiState.guideOpen}
          checkedStepIds={uiState.checkedStepIds}
          activeStepId={activeGuideStepId}
          onToggleOpen={() =>
            setUiState((prev) => ({ ...prev, guideOpen: !prev.guideOpen }))
          }
          onSelectStep={handleSelectGuideStep}
          onSelectSpecRow={handleSelectSpecRow}
          onResetProgress={() => {
            setUiState((prev) => ({ ...prev, checkedStepIds: [] }));
            setActiveGuideStepId(null);
            showNotice('操作ガイドのチェック進捗をリセットしました。');
          }}
          onStartDemoTour={() => {
            setIsWelcomeOpen(false);
            void startDemoTour();
          }}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={viewKey}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.14,
                  ease: 'easeOut',
                }}
              >
                {/* Screen 01: Project List & Ledger */}
                {state.activeScreen === 'projects' && (
                  <ProjectList
                    projects={state.projects}
                    selectedProjectId={selectedProject.id}
                    role={state.role}
                    thresholds={activeThresholds}
                    effectEstimates={state.effectEstimates}
                    onOpenWorkspace={(projectId, tab) => {
                      selectProject(projectId, 'workspace', tab);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onUpdateProjectStatus={updateProjectStatus}
                    onAddProject={addProject}
                    onNavigateAdminEffects={() =>
                      handleNavigateAdminTab('effects')
                    }
                    onNotify={showNotice}
                  />
                )}

                {/* Screen 02: Case Workspace (5 Sub-Tabs) */}
                {state.activeScreen === 'workspace' && (
                  <>
                    {state.workspaceTab === 'schedule' && (
                      <GanttSchedule
                        project={selectedProject}
                        role={state.role}
                        effectEstimate={effectMap.schedule}
                        onUpdateTaskStatus={updateTaskStatus}
                        onToggleGatePassed={setGatePassed}
                        onNavigateTab={handleChangeWorkspaceTab}
                        onNavigateBackToList={() =>
                          handleChangeScreen('projects')
                        }
                        onNotify={showNotice}
                      />
                    )}

                    {state.workspaceTab === 'hearing' && (
                      <HearingInput
                        project={selectedProject}
                        role={state.role}
                        promptSuggestionApplied={state.promptSuggestionApplied}
                        effectEstimate={effectMap.hearing}
                        onUpdateRawText={updateRawHearingText}
                        onUpdateHearingVariables={updateHearingVariables}
                        onImportSampleExcel={importSampleHearingSheetExcel}
                        onGenerateMaster={generateMasterFromHearing}
                        onSaveMasterItem={saveMasterItem}
                        onSyncMasterToSubsidies={syncMasterToSubsidies}
                        onNavigateToFinancial={() =>
                          handleChangeWorkspaceTab('financial')
                        }
                        onNavigateBackToList={() =>
                          handleChangeScreen('projects')
                        }
                        onNotify={showNotice}
                      />
                    )}

                    {state.workspaceTab === 'financial' && (
                      <FinancialMasterEditor
                        project={selectedProject}
                        role={state.role}
                        thresholds={activeThresholds}
                        activeCallRound={activeCallRound}
                        effectEstimate={effectMap.financial}
                        onUpdateFinancialField={updateFinancialField}
                        onUpdateInvestmentPlan={updateInvestmentPlan}
                        onUpdateHearingVariables={updateHearingVariables}
                        onApplyDriversToForecast={applyHearingDriversToForecast}
                        onUpdateSpecialFlags={updateSpecialFlags}
                        onLockFinancialPlan={lockFinancialPlan}
                        onUnlockFinancialPlan={unlockFinancialPlan}
                        onNavigateToEditor={() =>
                          handleChangeWorkspaceTab('editor')
                        }
                        onNavigateToThresholdsAdmin={() =>
                          handleNavigateAdminTab('thresholds')
                        }
                        onNotify={showNotice}
                      />
                    )}

                    {state.workspaceTab === 'editor' && (
                      <SubsidyEditor
                        project={selectedProject}
                        role={state.role}
                        textModules={state.textModules}
                        activeCallRound={activeCallRound}
                        effectEstimate={effectMap.editor}
                        externalTarget={editorExternalTarget}
                        onUpdateSectionLength={updateSubsidySectionLength}
                        onRegenerateSection={regenerateSubsidySection}
                        onUpdateSectionText={updateSubsidySectionText}
                        onReplaceAllTagsInDoc={replaceTagsInSubsidyDocument}
                        onSaveDocument={saveSubsidyDocument}
                        onUpdateDocumentStatus={updateSubsidyStatus}
                        onNavigateToFinancial={() =>
                          handleChangeWorkspaceTab('financial')
                        }
                        onNavigateToConsistency={() =>
                          handleChangeWorkspaceTab('consistency')
                        }
                        onNavigateToAdminDiff={() =>
                          handleNavigateAdminTab('diffs')
                        }
                        onNotify={showNotice}
                      />
                    )}

                    {state.workspaceTab === 'consistency' && (
                      <ConsistencyChecker
                        project={selectedProject}
                        role={state.role}
                        thresholds={activeThresholds}
                        crossCheckPrompt={state.crossCheckPrompt}
                        effectEstimate={effectMap.consistency}
                        onRunAICrossCheck={runAICrossCheck}
                        onToggleManualCheck={toggleManualCheck}
                        onToggleGate3={(projectId, isPassed) =>
                          setGatePassed(projectId, 'gate-3', isPassed)
                        }
                        onNavigateTab={handleChangeWorkspaceTab}
                        onNavigatePromptsScreen={() =>
                          handleChangeScreen('prompts')
                        }
                        onNotify={showNotice}
                      />
                    )}
                  </>
                )}

                {/* Screen 03: Text Module Library */}
                {state.activeScreen === 'library' && (
                  <TextModuleLibrary
                    role={state.role}
                    modules={state.textModules}
                    reviewCriteria={activeCallRound.reviewCriteria}
                    selectedProject={selectedProject}
                    onAddModule={addTextModule}
                    onUpdateModule={updateTextModule}
                    onDeleteModule={deleteTextModule}
                    onNavigateToWorkspaceEditor={() => {
                      setActiveScreen('workspace');
                      setWorkspaceTab('editor');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onNotify={showNotice}
                  />
                )}

                {/* Screen 04: 3-Subsidy Mapping Table */}
                {state.activeScreen === 'mapping' && (
                  <MappingTableScreen
                    project={selectedProject}
                    role={state.role}
                    activeCallRound={activeCallRound}
                    onJumpToEditorSection={handleJumpToEditorSection}
                    onJumpToFinancial={() =>
                      handleChangeWorkspaceTab('financial')
                    }
                    onJumpToHearing={() => handleChangeWorkspaceTab('hearing')}
                  />
                )}

                {/* Screen 05: Generative AI Prompt Collection */}
                {state.activeScreen === 'prompts' && (
                  <PromptCollectionScreen
                    role={state.role}
                    activeCallRound={activeCallRound}
                    masterTemplates={state.masterTemplates}
                    crossCheckPrompt={state.crossCheckPrompt}
                    onUpdateGenerationPrompt={updateGenerationPrompt}
                    onUpdateCrossCheckPrompt={updateCrossCheckPrompt}
                    onNotify={showNotice}
                  />
                )}

                {/* Screen 06: Admin Settings & Diff Analysis */}
                {state.activeScreen === 'admin' && (
                  <AdminDashboard
                    role={state.role}
                    masterTemplates={state.masterTemplates}
                    diffLogs={state.diffLogs}
                    thresholds={activeThresholds}
                    callRounds={state.callRounds}
                    activeCallRound={activeCallRound}
                    effectEstimates={state.effectEstimates}
                    crossCheckPrompt={state.crossCheckPrompt}
                    promptSuggestionApplied={state.promptSuggestionApplied}
                    defaultTab={adminDefaultTab}
                    onAddTemplate={addMasterTemplate}
                    onUpdateTemplate={updateMasterTemplate}
                    onDeleteTemplate={deleteMasterTemplate}
                    onMoveTemplate={moveMasterTemplate}
                    onApplyPromptSuggestion={applyPromptImprovementSuggestion}
                    onSetActiveCallRound={setActiveCallRound}
                    onDuplicateCallRound={duplicateCallRound}
                    onUpdateCallRound={updateCallRound}
                    onDeleteCallRound={deleteCallRound}
                    onUpdateThresholds={updateThresholds}
                    onUpdateReviewCriteria={updateReviewCriteriaForRound}
                    onUpdateEffectEstimates={updateEffectEstimates}
                    onUpdateCrossCheckPrompt={updateCrossCheckPrompt}
                    onSwitchRoleToAdmin={() => setRole('システム管理者')}
                    onNotify={showNotice}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Quiet Enterprise Footer */}
          <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
            <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                補助金申請標準化システム（仕様確認用モック｜業務指示書
                20261102修正版 準拠）
              </span>
              <span>
                データ保存先: ブラウザ LocalStorage（外部通信なし）
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* First-visit Welcome Modal (§4-C) */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onStartTour={(dontShowAgain) => {
          if (dontShowAgain) {
            setUiState((prev) => ({ ...prev, hideWelcomeModal: true }));
          }
          setIsWelcomeOpen(false);
          void startDemoTour();
        }}
        onSelfExplore={(dontShowAgain) => {
          setUiState((prev) => ({
            ...prev,
            guideOpen: true,
            hideWelcomeModal: dontShowAgain ? true : prev.hideWelcomeModal,
          }));
          setIsWelcomeOpen(false);
        }}
      />

      {/* Demo Tour Step 17 Completion Summary Modal (§4-B) */}
      <TourCompletionModal
        isOpen={isCompletionModalOpen}
        effectEstimates={state.effectEstimates}
        onCloseAndRestore={finishTourFromCompletionModal}
      />
    </div>
  );
}
