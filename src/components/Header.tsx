import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Project, Role, ScreenId, WorkspaceTabId } from '../types';

interface HeaderProps {
  role: Role;
  activeScreen: ScreenId;
  workspaceTab: WorkspaceTabId;
  projects: Project[];
  selectedProject: Project;
  onChangeRole: (role: Role) => void;
  onChangeScreen: (screen: ScreenId) => void;
  onChangeWorkspaceTab: (tab: WorkspaceTabId) => void;
  onSelectProject: (projectId: string) => void;
  onResetAll: () => void;
}

const NAV_ITEMS: { id: ScreenId; label: string }[] = [
  { id: 'projects', label: '01. 案件一覧・台帳' },
  { id: 'workspace', label: '02. 案件ワークスペース' },
  { id: 'library', label: '03. 文章モジュール' },
  { id: 'admin', label: '04. 管理者設定・差異分析' },
];

const ROLES: Role[] = ['営業担当', '書類作成者', 'システム管理者'];

export const Header: React.FC<HeaderProps> = ({
  role,
  activeScreen,
  workspaceTab,
  projects,
  selectedProject,
  onChangeRole,
  onChangeScreen,
  onChangeWorkspaceTab,
  onSelectProject,
  onResetAll,
}) => {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const gate1Passed = Boolean(
    selectedProject.gates.find((g) => g.id === 'gate-1')?.isPassed
  );
  const gate2Locked = selectedProject.financialMaster.status === 'locked';
  const gate3Passed = Boolean(
    selectedProject.gates.find((g) => g.id === 'gate-3')?.isPassed
  );
  const passedGateCount = selectedProject.gates.filter((g) => g.isPassed).length;

  const workspaceTabs: {
    id: WorkspaceTabId;
    label: string;
    statusText: string;
    isLocked?: boolean;
  }[] = [
    {
      id: 'schedule',
      label: '01. 工程表・ゲート',
      statusText: `${passedGateCount}/4通過`,
    },
    {
      id: 'hearing',
      label: '02. ヒアリング・定性マスター',
      statusText: gate1Passed ? 'Gate1済' : '未確定',
    },
    {
      id: 'financial',
      label: '03. 収支計画マスター',
      statusText: gate2Locked ? 'Gate2済' : '要確定',
    },
    {
      id: 'editor',
      label: '04. 申請書 作成・編集',
      statusText: gate2Locked ? '編集可' : 'ロック中',
      isLocked: !gate2Locked,
    },
    {
      id: 'consistency',
      label: '05. 整合性チェック',
      statusText: gate3Passed ? 'Gate3済' : '未検証',
    },
  ];

  return (
    <>
      {/* Top Global Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 bg-slate-900 px-6 py-3.5 text-white border-b border-slate-800">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => onChangeScreen('projects')}
          className="text-base font-bold tracking-tight text-white hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer text-left"
        >
          補助金申請標準化システム
        </button>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeScreen(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent text-slate-300 hover:text-white hover:border-slate-500'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Reset Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            データを初期状態にリセット
          </button>
        </div>
      </header>

      {/* Workspace Context & Role Switching Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Mobile / Tablet Screen Switcher */}
          <div className="flex lg:hidden items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100">
            {NAV_ITEMS.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeScreen(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Left: Active Case Context */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <label
              htmlFor="global-project-select"
              className="font-semibold text-slate-700 whitespace-nowrap"
            >
              作業対象案件:
            </label>
            <select
              id="global-project-select"
              value={selectedProject.id}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-medium px-2.5 py-1.5 focus:outline-none focus:border-slate-800"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.companyName}（{p.status}）
                </option>
              ))}
            </select>
            <span className="hidden xl:inline text-slate-400" aria-hidden="true">
              ·
            </span>
            <span className="hidden xl:inline text-slate-600 whitespace-nowrap">
              営業: {selectedProject.salesRep} / 作成: {selectedProject.writerName} / 期日:{' '}
              <span className="font-mono tabular-nums">
                {selectedProject.deadline}
              </span>
            </span>
          </div>

          {/* Right: Role Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 whitespace-nowrap">操作ロール:</span>
            <div className="flex items-center bg-slate-100 p-0.5 border border-slate-200">
              {ROLES.map((r) => {
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onChangeRole(r)}
                    className={`px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Workspace 5-Tab Sub-Navigation Bar */}
      {activeScreen === 'workspace' && (
        <div className="bg-slate-100/80 border-b border-slate-200 px-6">
          <div className="max-w-[1400px] mx-auto flex items-center gap-1 overflow-x-auto pt-2">
            {workspaceTabs.map((tab) => {
              const isActive = workspaceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeWorkspaceTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-t border-x transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white border-slate-200 text-slate-900 -mb-px pb-[11px]'
                      : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.isLocked && (
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  )}
                  <span>{tab.label}</span>
                  <span className="text-slate-300" aria-hidden="true">
                    /
                  </span>
                  <span
                    className={`font-mono tabular-nums text-[11px] font-medium ${
                      tab.isLocked
                        ? 'text-amber-800'
                        : tab.statusText.includes('済')
                          ? 'text-emerald-800'
                          : 'text-slate-500'
                    }`}
                  >
                    {tab.statusText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline Reset Confirmation Modal */}
      {confirmResetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div className="w-full max-w-md bg-white border border-slate-300 p-6 shadow-lg">
            <h2
              id="reset-dialog-title"
              className="text-base font-bold text-slate-900 mb-2"
            >
              システム状態の初期化確認
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              ブラウザに保存されている案件追加・収支計画編集・フェーズゲート確定・モジュール変更・差異ログをすべて破棄し、デモ開始時の初期プリセット状態に復元します。よろしいですか？
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  setConfirmResetOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                初期状態にリセット実行
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
