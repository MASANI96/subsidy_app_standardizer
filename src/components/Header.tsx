import React, { useState } from 'react';
import { Calendar, Layers, Lock, RotateCcw } from 'lucide-react';
import {
  DisplayCurrencyUnit,
  Project,
  Role,
  RoundingMode,
  ScreenId,
  SubsidyVersionRound,
  WorkspaceTabId,
} from '../types';

interface HeaderProps {
  role: Role;
  activeScreen: ScreenId;
  workspaceTab: WorkspaceTabId;
  projects: Project[];
  selectedProject: Project;
  activeCallRound: SubsidyVersionRound;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  onChangeRole: (role: Role) => void;
  onChangeScreen: (screen: ScreenId) => void;
  onChangeWorkspaceTab: (tab: WorkspaceTabId) => void;
  onSelectProject: (projectId: string) => void;
  onChangeDisplayCurrencyUnit: (unit: DisplayCurrencyUnit) => void;
  onChangeRoundingMode: (mode: RoundingMode) => void;
  onNavigateCallRoundAdmin: () => void;
  onResetAll: () => void;
}

const NAV_ITEMS: { id: ScreenId; label: string }[] = [
  { id: 'projects', label: '01. 案件一覧・台帳' },
  { id: 'workspace', label: '02. 案件ワークスペース' },
  { id: 'prompts', label: '03. 生成AIプロンプト' },
  { id: 'admin', label: '04. 管理者設定' },
];

const ROLES: Role[] = ['営業担当', '書類作成者', 'システム管理者'];

export const Header: React.FC<HeaderProps> = ({
  role,
  activeScreen,
  workspaceTab,
  projects,
  selectedProject,
  activeCallRound,
  displayCurrencyUnit,
  roundingMode,
  onChangeRole,
  onChangeScreen,
  onChangeWorkspaceTab,
  onSelectProject,
  onChangeDisplayCurrencyUnit,
  onChangeRoundingMode,
  onNavigateCallRoundAdmin,
  onResetAll,
}) => {
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const gate1Passed = Boolean(
    selectedProject.gates?.find((g) => g.id === 'gate-1')?.isPassed
  );
  const gate2Locked = selectedProject.financialMaster?.status === 'locked';
  const gate3Passed = Boolean(
    selectedProject.gates?.find((g) => g.id === 'gate-3')?.isPassed
  );
  const passedGateCount =
    selectedProject.gates?.filter((g) => g.isPassed).length || 0;

  const workspaceTabs: {
    id: WorkspaceTabId;
    label: string;
    statusText: string;
    isLocked?: boolean;
  }[] = [
    {
      id: 'schedule',
      label: '01. 標準工程表・ゲート',
      statusText: `${passedGateCount}/4通過`,
    },
    {
      id: 'hearing',
      label: '02. マスターヒアリングシート',
      statusText: gate1Passed ? 'Gate1済' : '進行中',
    },
    {
      id: 'financial',
      label: '03. 収支計画マスター計算シート（公式フォーマット準拠）',
      statusText: gate2Locked ? '確定ロック済' : '要確定',
    },
    {
      id: 'editor',
      label: '04. 申請書 作成・編集',
      statusText: gate2Locked ? '編集可' : '収支未確定',
      isLocked: !gate2Locked,
    },
    {
      id: 'consistency',
      label: '05. 整合性チェックリスト',
      statusText: gate3Passed ? 'Gate3済' : '未検証',
    },
  ];

  return (
    <>
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-slate-900 px-5 py-2.5 text-white border-b border-slate-800">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChangeScreen('projects')}
            className="text-sm xl:text-base font-bold tracking-tight text-white hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer text-left"
          >
            新事業進出・ものづくり補助金申請支援システム
          </button>
          <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700">
            叩き台モック ver1.3
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-4 text-xs font-medium">
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

        {/* Zone 3: Unit Switching, Rounding & Reset */}
        <div className="flex items-center gap-3 shrink-0">
          {/* 金額表示単位切替（円 / 千円 / 万円） */}
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 border border-slate-700">
            <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">
              表示単位:
            </span>
            {(['yen', 'thousandYen', 'manYen'] as DisplayCurrencyUnit[]).map((u) => {
              const active = displayCurrencyUnit === u;
              const labels: Record<DisplayCurrencyUnit, string> = {
                yen: '円',
                thousandYen: '千円',
                manYen: '万円',
              };
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => onChangeDisplayCurrencyUnit(u)}
                  className={`px-1.5 py-0.5 text-xs font-semibold cursor-pointer transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {labels[u]}
                </button>
              );
            })}
          </div>

          {/* 端数処理（切り捨て / 四捨五入） */}
          <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 border border-slate-700">
            <span className="text-[11px] text-slate-400 whitespace-nowrap font-medium">
              端数:
            </span>
            {(['floor', 'round'] as RoundingMode[]).map((m) => {
              const active = roundingMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeRoundingMode(m)}
                  className={`px-1.5 py-0.5 text-xs font-semibold cursor-pointer transition-colors ${
                    active
                      ? 'bg-slate-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {m === 'floor' ? '切捨' : '四捨五入'}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            title="データを初期プリセット状態にリセット"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>リセット</span>
          </button>
        </div>
      </header>

      {/* Workspace Context Toolbar */}
      <div className="bg-white border-b border-slate-200 px-5 py-2">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Left: Active Project + Version Round + Track */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-1.5">
              <label htmlFor="global-project-select" className="font-semibold text-slate-800">
                作業案件:
              </label>
              <select
                id="global-project-select"
                value={selectedProject.id}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold px-2 py-1 focus:outline-none focus:border-slate-800"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.companyName}（{p.status}）
                  </option>
                ))}
              </select>
            </div>

            {/* 公募回（版）インジケーター */}
            <button
              type="button"
              onClick={onNavigateCallRoundAdmin}
              title="クリックして公募回・版管理画面を開く"
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
              <span>適用公募回版: {activeCallRound.versionCode}</span>
            </button>

            {/* 枠インジケーター */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
              <Layers className="w-3 h-3 text-slate-500 shrink-0" />
              <span>
                適用枠:{' '}
                {activeCallRound.tracks.find(
                  (t) => t.id === selectedProject.financialMaster.appliedTrackId
                )?.name || '新事業進出枠'}
              </span>
            </span>

            <span className="text-slate-500 hidden xl:inline">
              営業: {selectedProject.salesRep} / 作成: {selectedProject.writerName} / 締切:{' '}
              <span className="font-mono tabular-nums font-semibold text-slate-800">
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
                    className={`px-2 py-0.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
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
        <div className="bg-slate-100/90 border-b border-slate-200 px-5">
          <div className="max-w-[1600px] mx-auto flex items-center gap-1 overflow-x-auto pt-2">
            {workspaceTabs.map((tab) => {
              const isActive = workspaceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeWorkspaceTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-t border-x transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white border-slate-300 text-slate-900 -mb-px pb-[9px] shadow-xs'
                      : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.isLocked && <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                  <span>{tab.label}</span>
                  <span className="text-slate-300">/</span>
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

      {/* Reset Confirmation Dialog */}
      {confirmResetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-300 p-6 shadow-xl">
            <h2 className="text-base font-bold text-slate-900 mb-2">初期データリセット確認</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              ブラウザに保存された編集内容を破棄し、初期プリセット状態（株式会社○○ 1社、公募回ver1.3）に復元します。よろしいですか？
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAll();
                  setConfirmResetOpen(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 cursor-pointer"
              >
                リセット実行
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
