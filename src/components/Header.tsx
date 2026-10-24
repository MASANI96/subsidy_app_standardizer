import React, { useState } from 'react';
import { Project, Role, ScreenId } from '../types';

interface HeaderProps {
  role: Role;
  activeScreen: ScreenId;
  projects: Project[];
  selectedProject: Project;
  onChangeRole: (role: Role) => void;
  onChangeScreen: (screen: ScreenId) => void;
  onSelectProject: (projectId: string) => void;
  onResetAll: () => void;
}

const NAV_ITEMS: { id: ScreenId; label: string }[] = [
  { id: 'projects', label: '01. 案件一覧・進捗管理' },
  { id: 'hearing', label: '02. 議事録取込・マスター生成' },
  { id: 'editor', label: '03. 補助金申請書 作成・編集' },
  { id: 'admin', label: '04. 管理者設定・差異分析' },
];

const ROLES: Role[] = ['営業担当', '書類作成者', 'システム管理者'];

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  営業担当: '案件登録・ヒアリング議事録取込・マスター初期確認を担当',
  書類作成者: 'マスター精査・補助金別申請書の文字数調整および加筆修正を担当',
  システム管理者: 'マスター項目定義・抽出プロンプト管理・修正差異ログ分析を担当',
};

export const Header: React.FC<HeaderProps> = ({
  role,
  activeScreen,
  projects,
  selectedProject,
  onChangeRole,
  onChangeScreen,
  onSelectProject,
  onResetAll,
}) => {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const handleRoleSwitch = (nextRole: Role) => {
    onChangeRole(nextRole);
    if (nextRole === 'システム管理者' && activeScreen === 'projects') {
      // Keep user in control, or allow one-click access to Screen 4
    }
  };

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
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
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
            <span className="hidden xl:inline text-slate-600">
              営業: {selectedProject.salesRep} / 作成: {selectedProject.writerName} / 期日:{' '}
              <span className="font-mono tabular-nums">{selectedProject.deadline}</span>
            </span>
          </div>

          {/* Right: Role Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden xl:inline text-xs text-slate-500">
              {ROLE_DESCRIPTIONS[role]}
            </span>
            <div className="flex items-center bg-slate-100 p-0.5 border border-slate-200">
              {ROLES.map((r) => {
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleSwitch(r)}
                    className={`px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
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

      {/* Inline Reset Confirmation Modal (avoids window.confirm) */}
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
              ブラウザに保存されている案件追加・議事録編集・申請書修正履歴・プロンプト変更をすべて破棄し、デモ開始時の初期プリセット状態に復元します。よろしいですか？
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
