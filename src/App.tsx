import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AdminDashboard } from './components/AdminDashboard';
import { ConsistencyChecker } from './components/ConsistencyChecker';
import { FinancialMasterEditor } from './components/FinancialMasterEditor';
import { GanttSchedule } from './components/GanttSchedule';
import { GuidePanel } from './components/GuidePanel';
import { Header } from './components/Header';
import { HearingInput } from './components/HearingInput';
import { MappingTableScreen } from './components/MappingTableScreen';
import { ProjectList } from './components/ProjectList';
import { PromptCollectionScreen } from './components/PromptCollectionScreen';
import { SubsidyEditor } from './components/SubsidyEditor';
import { TextModuleLibrary } from './components/TextModuleLibrary';
import { useSubsidyStore } from './hooks/useSubsidyStore';
import { ScreenId, WorkspaceTabId } from './types';

const UI_STORAGE_KEY = 'subsidy_mock_ui_v4';

interface UiPersistState {
  guideOpen: boolean;
  checkedStepIds: string[];
}

function loadUiPersistState(): UiPersistState {
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        guideOpen: typeof parsed.guideOpen === 'boolean' ? parsed.guideOpen : false,
        checkedStepIds: Array.isArray(parsed.checkedStepIds) ? parsed.checkedStepIds : [],
      };
    }
  } catch {
    // Ignore
  }
  return {
    guideOpen: false,
    checkedStepIds: [],
  };
}

export default function App() {
  const {
    state,
    selectedProject,
    activeCallRound,
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
    uploadPeriodStatementPdf,
    updateExtractedItemAmount,
    assignAccountMapping,
    updatePeriodOffBalanceInputs,
    lockPeriodImport,
    unlockPeriodImport,
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
    addStandardMappingRule,
    updateStandardMappingRule,
    deleteStandardMappingRule,
    addCompanyMappingRule,
    updateCompanyMappingRule,
    deleteCompanyMappingRule,
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
  } = useSubsidyStore();

  const prefersReducedMotion = useReducedMotion();

  const [uiState, setUiState] = useState<UiPersistState>(() => loadUiPersistState());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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

  const handleReset = useCallback(() => {
    resetAllData();
    showNotice('すべての設定および案件データを初期プリセット状態にリセットしました。');
  }, [resetAllData, showNotice]);

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

      {/* Main Container */}
      <div className="flex-1 flex flex-col">
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
                      onUpdateTaskStatus={updateTaskStatus}
                      onToggleGatePassed={setGatePassed}
                      onNavigateTab={handleChangeWorkspaceTab}
                      onNavigateBackToList={() => handleChangeScreen('projects')}
                      onNotify={showNotice}
                      scheduleTemplates={state.scheduleTemplates}
                      onUpdateSchedule={updateSchedule}
                      onRebuildSchedule={rebuildSchedule}
                      onMarkScheduleShared={markScheduleShared}
                    />
                  )}

                  {/* Tab 02: マスターヒアリングシート */}
                  {state.workspaceTab === 'hearing' && (
                    <HearingInput
                      project={selectedProject}
                      role={state.role}
                      promptSuggestionApplied={false}
                      onUpdateRawText={() => {}}
                      onUpdateHearingVariables={() => {}}
                      onImportSampleExcel={() => {}}
                      onGenerateMaster={() => {}}
                      onSaveMasterItem={() => {}}
                      onSyncMasterToSubsidies={() => {}}
                      onNavigateToFinancial={() => handleChangeWorkspaceTab('financial')}
                      onNavigateBackToList={() => handleChangeScreen('projects')}
                      onNotify={showNotice}
                    />
                  )}

                  {/* Tab 03: 収支計画マスター計算シート（STEP1の中核） */}
                  {state.workspaceTab === 'financial' && (
                    <FinancialMasterEditor
                      project={selectedProject}
                      role={state.role}
                      activeCallRound={activeCallRound}
                      displayCurrencyUnit={state.displayCurrencyUnit}
                      roundingMode={state.roundingMode}
                      standardAccountMappings={state.standardAccountMappings}
                      companyAccountMappings={state.companyAccountMappings[selectedProject.id] ?? []}
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
                      onUpdateSimulation={updateSimulation}
                      onToggleSimulation={setSimulationEnabled}
                      onToggleWageSpecial={toggleWageSpecial}
                      onLockPlan={lockFinancialPlan}
                      onUnlockPlan={unlockFinancialPlan}
                      onNotify={showNotice}
                      solverCandidates={state.solverCandidates}
                      narrativeTemplates={state.narrativeTemplates}
                      onTogglePin={togglePin}
                      onUpdateSolverTargets={updateSolverTargets}
                      onApplySolverResult={applySolverResult}
                      onSavePlanVersion={savePlanVersion}
                      onRestorePlanVersion={restorePlanVersion}
                      onDeletePlanVersion={deletePlanVersion}
                      onUpdateNarrative={updateNarrative}
                      excelTemplates={state.excelTemplates}
                      excelCellMappings={state.excelCellMappings}
                    />
                  )}

                  {/* Tab 04: 申請書作成・編集 */}
                  {state.workspaceTab === 'editor' && (
                    <div className="bg-white border border-slate-200 p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h3 className="text-base font-bold text-slate-900">
                          申請書 作成・編集（新事業進出・ものづくり商業サービス補助金）
                        </h3>
                        <span className="text-xs text-slate-500">
                          対象枠: <strong>{activeCallRound.tracks.find(t => t.id === selectedProject.appliedTrackId)?.name}</strong>
                        </span>
                      </div>
                      {selectedProject.financialMaster.status !== 'locked' ? (
                        <div
                          data-guide-id="guide-editor-blocker"
                          className="p-8 border border-amber-300 bg-amber-50 text-center space-y-3 my-4"
                        >
                          <div className="text-base font-bold text-amber-950">
                            収支計画が未確定のため、申請書は編集できません（Gate 2）
                          </div>
                          <p className="text-xs text-amber-800">
                            収支計画タブで数値を確定・ロックすると編集できるようになります。
                          </p>
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => handleChangeWorkspaceTab('financial')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              収支計画を開く
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {selectedProject.sections.map((sec) => (
                            <div key={sec.id} className="border border-slate-200 p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-slate-800">{sec.title}</span>
                                <span className="text-xs text-slate-400 font-mono">
                                  {sec.currentText.length}文字 / 上限目安{sec.charLimit}文字
                                </span>
                              </div>
                              <textarea
                                rows={4}
                                value={sec.currentText}
                                disabled={selectedProject.financialMaster.status === 'locked' && state.role === '営業担当'}
                                onChange={(e) => saveSectionText(selectedProject.id, sec.id, e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-800"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 05: 整合性チェックリスト */}
                  {state.workspaceTab === 'consistency' && (
                    <ConsistencyChecker
                      project={selectedProject}
                      role={state.role}
                      thresholds={activeCallRound.thresholds || ({} as any)}
                      crossCheckPrompt=""
                      onRunAICrossCheck={() => null}
                      onToggleManualCheck={() => {}}
                      onToggleGate3={(pId, isPassed) => setGatePassed(pId, 'gate-3', isPassed)}
                      onNavigateTab={handleChangeWorkspaceTab}
                      onNavigatePromptsScreen={() => handleChangeScreen('prompts')}
                      onNotify={showNotice}
                    />
                  )}
                </>
              )}

              {/* Screen: マッピング表 */}
              {state.activeScreen === 'mapping' &&
                (selectedProject ? (
                  <MappingTableScreen
                    project={selectedProject}
                    role={state.role}
                    activeCallRound={activeCallRound}
                    onJumpToEditorSection={() => handleChangeWorkspaceTab('editor')}
                    onJumpToFinancial={() => handleChangeWorkspaceTab('financial')}
                    onJumpToHearing={() => handleChangeWorkspaceTab('hearing')}
                  />
                ) : (
                  <div className="bg-white border border-slate-200 p-6 text-sm text-slate-600">
                    案件が選択されていません。「01. 案件一覧・台帳」から案件を選んでください。
                  </div>
                ))}

              {/* Screen 03: 生成AIプロンプト集 */}
              {state.activeScreen === 'prompts' && (
                <div className="bg-white border border-slate-200 p-6 space-y-4" data-guide-id="guide-prompts-generation">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
                    03. 生成AIプロンプト集（説明文の下書き生成用）
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.aiPromptTemplates.map((tmpl) => (
                      <div key={tmpl.id} className="border border-slate-200 p-4 space-y-2 text-xs">
                        <div className="font-bold text-slate-800">{tmpl.title}</div>
                        <div className="text-slate-500 text-[11px]">対象セクション: {tmpl.targetSection}</div>
                        <p className="p-2.5 bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed font-mono">
                          {tmpl.promptText}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Screen 04: 管理者設定（2層構造） */}
              {state.activeScreen === 'admin' && (
                <AdminDashboard
                  role={state.role}
                  callRounds={state.callRounds}
                  activeVersionId={state.activeVersionId}
                  initialDefaults={state.initialDefaults}
                  tentativeItems={state.tentativeItems}
                  displayCurrencyUnit={state.displayCurrencyUnit}
                  roundingMode={state.roundingMode}
                  // STEP D props
                  projects={state.projects}
                  standardAccountMappings={state.standardAccountMappings}
                  companyAccountMappings={state.companyAccountMappings}
                  onAddStandardMappingRule={addStandardMappingRule}
                  onUpdateStandardMappingRule={updateStandardMappingRule}
                  onDeleteStandardMappingRule={deleteStandardMappingRule}
                  onAddCompanyMappingRule={addCompanyMappingRule}
                  onUpdateCompanyMappingRule={updateCompanyMappingRule}
                  onDeleteCompanyMappingRule={deleteCompanyMappingRule}
                  excelTemplates={state.excelTemplates}
                  excelCellMappings={state.excelCellMappings}
                  onUpdateExcelTemplate={updateExcelTemplate}
                  onAddExcelCellMapping={addExcelCellMapping}
                  onUpdateExcelCellMapping={updateExcelCellMapping}
                  onDeleteExcelCellMapping={deleteExcelCellMapping}
                  scheduleTemplates={state.scheduleTemplates}
                  onAddScheduleTemplate={addScheduleTemplate}
                  onUpdateScheduleTemplate={updateScheduleTemplate}
                  onDeleteScheduleTemplate={deleteScheduleTemplate}
                  onMoveScheduleTemplate={moveScheduleTemplate}
                  solverCandidates={state.solverCandidates}
                  narrativeTemplates={state.narrativeTemplates}
                  onUpdateSolverCandidates={updateSolverCandidates}
                  onUpdateNarrativeTemplates={updateNarrativeTemplates}
                  // 既存ハンドラ
                  onSetActiveVersion={setActiveVersionId}
                  onDuplicateVersion={duplicateCallRound}
                  onUpdateCallRound={updateCallRound}
                  onUpdateTrack={updateTrackInRound}
                  onUpdateRequirements={updateRequirementsInRound}
                  onUpdateInitialDefaults={updateInitialDefaults}
                  onUpdateTentativeItem={updateTentativeItem}
                  onAddTentativeItem={addTentativeItem}
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
  );
}
