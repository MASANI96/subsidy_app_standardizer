import { useCallback, useRef, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { Header } from './components/Header';
import { HearingInput } from './components/HearingInput';
import { ProjectList } from './components/ProjectList';
import { SubsidyEditor } from './components/SubsidyEditor';
import { useSubsidyStore } from './hooks/useSubsidyStore';
import { ScreenId } from './types';

export default function App() {
  const {
    state,
    selectedProject,
    setRole,
    setActiveScreen,
    selectProject,
    addProject,
    updateProjectStatus,
    updateRawHearingText,
    generateMasterFromHearing,
    saveMasterItem,
    syncMasterToSubsidies,
    updateSubsidySectionLength,
    regenerateSubsidySection,
    updateSubsidySectionText,
    saveSubsidyDocument,
    updateSubsidyStatus,
    addMasterTemplate,
    updateMasterTemplate,
    deleteMasterTemplate,
    moveMasterTemplate,
    applyPromptImprovementSuggestion,
    resetAllData,
  } = useSubsidyStore();

  const [adminDefaultTab, setAdminDefaultTab] = useState<'prompts' | 'diffs'>(
    'prompts'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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

  const handleNavigateToAdminDiff = useCallback(() => {
    setAdminDefaultTab('diffs');
    setActiveScreen('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setActiveScreen]);

  const handleReset = useCallback(() => {
    resetAllData();
    setAdminDefaultTab('prompts');
    showNotice('すべてのデータをデモ初期プリセット状態にリセットしました。');
  }, [resetAllData, showNotice]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        role={state.role}
        activeScreen={state.activeScreen}
        projects={state.projects}
        selectedProject={selectedProject}
        onChangeRole={(nextRole) => {
          setRole(nextRole);
          if (nextRole === 'システム管理者') {
            showNotice(
              'ロールを「システム管理者」に切り替えました。「04. 管理者設定・差異分析」からプロンプト管理・Diff分析を行えます。'
            );
          } else {
            showNotice(`操作ロールを「${nextRole}」に切り替えました。`);
          }
        }}
        onChangeScreen={handleChangeScreen}
        onSelectProject={(projectId) => selectProject(projectId)}
        onResetAll={handleReset}
      />

      {/* Non-intrusive Action Feedback Banner */}
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
        {state.activeScreen === 'projects' && (
          <ProjectList
            projects={state.projects}
            selectedProjectId={selectedProject.id}
            role={state.role}
            onSelectProjectAndNavigate={(projectId, targetScreen) => {
              selectProject(projectId, targetScreen);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdateProjectStatus={updateProjectStatus}
            onAddProject={addProject}
            onNotify={showNotice}
          />
        )}

        {state.activeScreen === 'hearing' && (
          <HearingInput
            project={selectedProject}
            role={state.role}
            promptSuggestionApplied={state.promptSuggestionApplied}
            onUpdateRawText={updateRawHearingText}
            onGenerateMaster={generateMasterFromHearing}
            onSaveMasterItem={saveMasterItem}
            onSyncMasterToSubsidies={syncMasterToSubsidies}
            onNavigateToEditor={() => handleChangeScreen('editor')}
            onNavigateBackToList={() => handleChangeScreen('projects')}
            onNotify={showNotice}
          />
        )}

        {state.activeScreen === 'editor' && (
          <SubsidyEditor
            project={selectedProject}
            role={state.role}
            onUpdateSectionLength={updateSubsidySectionLength}
            onRegenerateSection={regenerateSubsidySection}
            onUpdateSectionText={updateSubsidySectionText}
            onSaveDocument={saveSubsidyDocument}
            onUpdateDocumentStatus={updateSubsidyStatus}
            onNavigateToHearing={() => handleChangeScreen('hearing')}
            onNavigateToAdminDiff={handleNavigateToAdminDiff}
            onNotify={showNotice}
          />
        )}

        {state.activeScreen === 'admin' && (
          <AdminDashboard
            role={state.role}
            masterTemplates={state.masterTemplates}
            diffLogs={state.diffLogs}
            promptSuggestionApplied={state.promptSuggestionApplied}
            defaultTab={adminDefaultTab}
            onAddTemplate={addMasterTemplate}
            onUpdateTemplate={updateMasterTemplate}
            onDeleteTemplate={deleteMasterTemplate}
            onMoveTemplate={moveMasterTemplate}
            onApplyPromptSuggestion={applyPromptImprovementSuggestion}
            onSwitchRoleToAdmin={() => setRole('システム管理者')}
            onNotify={showNotice}
          />
        )}
      </main>

      {/* Quiet Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>補助金申請標準化システム（社内業務支援プロトタイプ）</span>
          <span>データ保存先: ブラウザ LocalStorage（外部通信なし）</span>
        </div>
      </footer>
    </div>
  );
}
