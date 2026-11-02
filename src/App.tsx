import { useCallback, useRef, useState } from 'react';
import { AdminDashboard, AdminTabId } from './components/AdminDashboard';
import { ConsistencyChecker } from './components/ConsistencyChecker';
import { FinancialMasterEditor } from './components/FinancialMasterEditor';
import { GanttSchedule } from './components/GanttSchedule';
import { Header } from './components/Header';
import { HearingInput } from './components/HearingInput';
import { ProjectList } from './components/ProjectList';
import { SubsidyEditor } from './components/SubsidyEditor';
import { TextModuleLibrary } from './components/TextModuleLibrary';
import { useSubsidyStore } from './hooks/useSubsidyStore';
import { ScreenId, WorkspaceTabId } from './types';

export default function App() {
  const {
    state,
    selectedProject,
    setRole,
    setActiveScreen,
    setWorkspaceTab,
    selectProject,
    addProject,
    updateProjectStatus,
    updateTaskStatus,
    setGatePassed,
    updateRawHearingText,
    generateMasterFromHearing,
    saveMasterItem,
    syncMasterToSubsidies,
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
    updateThresholds,
    updateCrossCheckPrompt,
    resetAllData,
  } = useSubsidyStore();

  const [adminDefaultTab, setAdminDefaultTab] = useState<AdminTabId>('prompts');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4200);
  }, []);

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

  const handleReset = useCallback(() => {
    resetAllData();
    setAdminDefaultTab('prompts');
    showNotice('すべてのデータを初期プリセット状態にリセットしました。');
  }, [resetAllData, showNotice]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        role={state.role}
        activeScreen={state.activeScreen}
        workspaceTab={state.workspaceTab}
        projects={state.projects}
        selectedProject={selectedProject}
        onChangeRole={(nextRole) => {
          setRole(nextRole);
          showNotice(`操作ロールを「${nextRole}」に切り替えました。`);
        }}
        onChangeScreen={handleChangeScreen}
        onChangeWorkspaceTab={handleChangeWorkspaceTab}
        onSelectProject={(projectId) => selectProject(projectId)}
        onResetAll={handleReset}
      />

      {/* Action Feedback Banner */}
      {toastMessage && (
        <div className="bg-slate-800 text-white border-b border-slate-700 px-6 py-2">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4 text-xs">
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

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-8">
        {/* Screen 01: Project List & Ledger */}
        {state.activeScreen === 'projects' && (
          <ProjectList
            projects={state.projects}
            selectedProjectId={selectedProject.id}
            role={state.role}
            onOpenWorkspace={(projectId, tab) => {
              selectProject(projectId, 'workspace', tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdateProjectStatus={updateProjectStatus}
            onAddProject={addProject}
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
                onUpdateTaskStatus={updateTaskStatus}
                onToggleGatePassed={setGatePassed}
                onNavigateTab={handleChangeWorkspaceTab}
                onNavigateBackToList={() => handleChangeScreen('projects')}
                onNotify={showNotice}
              />
            )}

            {state.workspaceTab === 'hearing' && (
              <HearingInput
                project={selectedProject}
                role={state.role}
                promptSuggestionApplied={state.promptSuggestionApplied}
                onUpdateRawText={updateRawHearingText}
                onGenerateMaster={generateMasterFromHearing}
                onSaveMasterItem={saveMasterItem}
                onSyncMasterToSubsidies={syncMasterToSubsidies}
                onNavigateToFinancial={() =>
                  handleChangeWorkspaceTab('financial')
                }
                onNavigateBackToList={() => handleChangeScreen('projects')}
                onNotify={showNotice}
              />
            )}

            {state.workspaceTab === 'financial' && (
              <FinancialMasterEditor
                project={selectedProject}
                role={state.role}
                thresholds={state.thresholds}
                onUpdateFinancialField={updateFinancialField}
                onUpdateInvestmentPlan={updateInvestmentPlan}
                onLockFinancialPlan={lockFinancialPlan}
                onUnlockFinancialPlan={unlockFinancialPlan}
                onNavigateToEditor={() => handleChangeWorkspaceTab('editor')}
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
                onNavigateToAdminDiff={() => handleNavigateAdminTab('diffs')}
                onNotify={showNotice}
              />
            )}

            {state.workspaceTab === 'consistency' && (
              <ConsistencyChecker
                project={selectedProject}
                role={state.role}
                crossCheckPrompt={state.crossCheckPrompt}
                onRunAICrossCheck={runAICrossCheck}
                onToggleManualCheck={toggleManualCheck}
                onToggleGate3={(projectId, isPassed) =>
                  setGatePassed(projectId, 'gate-3', isPassed)
                }
                onNavigateTab={handleChangeWorkspaceTab}
                onNavigateAdminPrompt={() =>
                  handleNavigateAdminTab('crosscheck')
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

        {/* Screen 04: Admin Settings & Diff Analysis */}
        {state.activeScreen === 'admin' && (
          <AdminDashboard
            role={state.role}
            masterTemplates={state.masterTemplates}
            diffLogs={state.diffLogs}
            thresholds={state.thresholds}
            crossCheckPrompt={state.crossCheckPrompt}
            promptSuggestionApplied={state.promptSuggestionApplied}
            defaultTab={adminDefaultTab}
            onAddTemplate={addMasterTemplate}
            onUpdateTemplate={updateMasterTemplate}
            onDeleteTemplate={deleteMasterTemplate}
            onMoveTemplate={moveMasterTemplate}
            onApplyPromptSuggestion={applyPromptImprovementSuggestion}
            onUpdateThresholds={updateThresholds}
            onUpdateCrossCheckPrompt={updateCrossCheckPrompt}
            onSwitchRoleToAdmin={() => setRole('システム管理者')}
            onNotify={showNotice}
          />
        )}
      </main>

      {/* Quiet Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>補助金申請標準化システム（社内業務支援システム）</span>
          <span>データ保存先: ブラウザ LocalStorage（外部通信なし）</span>
        </div>
      </footer>
    </div>
  );
}
