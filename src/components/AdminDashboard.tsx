import React, { useEffect, useMemo, useState } from 'react';
import {
  INITIAL_CROSS_CHECK_PROMPT,
  INITIAL_THRESHOLDS,
  SUBSIDY_TYPES,
} from '../data/initialData';
import {
  DiffLog,
  MasterSchemaTemplate,
  Role,
  SubsidyRequirementThresholds,
  SubsidyType,
} from '../types';
import { DiffViewer } from './DiffViewer';

export type AdminTabId = 'prompts' | 'diffs' | 'thresholds' | 'crosscheck';

interface AdminDashboardProps {
  role: Role;
  masterTemplates: MasterSchemaTemplate[];
  diffLogs: DiffLog[];
  thresholds: SubsidyRequirementThresholds;
  crossCheckPrompt: string;
  promptSuggestionApplied: boolean;
  defaultTab?: AdminTabId;
  onAddTemplate: (title: string, prompt: string) => void;
  onUpdateTemplate: (id: string, title: string, prompt: string) => void;
  onDeleteTemplate: (id: string) => void;
  onMoveTemplate: (id: string, direction: 'up' | 'down') => void;
  onApplyPromptSuggestion: () => void;
  onUpdateThresholds: (thresholds: SubsidyRequirementThresholds) => void;
  onUpdateCrossCheckPrompt: (prompt: string) => void;
  onSwitchRoleToAdmin: () => void;
  onNotify: (message: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  role,
  masterTemplates,
  diffLogs,
  thresholds,
  crossCheckPrompt,
  promptSuggestionApplied,
  defaultTab = 'prompts',
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onMoveTemplate,
  onApplyPromptSuggestion,
  onUpdateThresholds,
  onUpdateCrossCheckPrompt,
  onSwitchRoleToAdmin,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabId>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Tab 1 state
  const [editTitles, setEditTitles] = useState<Record<string, string>>({});
  const [editPrompts, setEditPrompts] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [savedNoticeId, setSavedNoticeId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  // Tab 2 state
  const [subsidyFilter, setSubsidyFilter] = useState<string>('ALL');

  // Tab 3 state (Thresholds)
  const [draftThresholds, setDraftThresholds] =
    useState<SubsidyRequirementThresholds>(thresholds);

  // Tab 4 state (Cross-check prompt)
  const [draftCrossPrompt, setDraftCrossPrompt] =
    useState<string>(crossCheckPrompt);

  useEffect(() => {
    const nextTitles: Record<string, string> = {};
    const nextPrompts: Record<string, string> = {};
    masterTemplates.forEach((tpl) => {
      nextTitles[tpl.id] = tpl.title;
      nextPrompts[tpl.id] = tpl.prompt;
    });
    setEditTitles(nextTitles);
    setEditPrompts(nextPrompts);
  }, [masterTemplates]);

  useEffect(() => {
    setDraftThresholds(thresholds);
  }, [thresholds]);

  useEffect(() => {
    setDraftCrossPrompt(crossCheckPrompt);
  }, [crossCheckPrompt]);

  const filteredLogs = useMemo(() => {
    if (subsidyFilter === 'ALL') return diffLogs;
    return diffLogs.filter((log) => log.subsidyType === subsidyFilter);
  }, [diffLogs, subsidyFilter]);

  const handleSaveTemplate = (tpl: MasterSchemaTemplate) => {
    const title = (editTitles[tpl.id] ?? tpl.title).trim();
    const prompt = (editPrompts[tpl.id] ?? tpl.prompt).trim();
    if (!title || !prompt) {
      onNotify('項目名およびAI抽出指示プロンプトを入力してください。');
      return;
    }
    onUpdateTemplate(tpl.id, title, prompt);
    setSavedNoticeId(tpl.id);
    onNotify(`マスター項目「${title}」のプロンプト設定を保存しました。`);
    window.setTimeout(() => {
      setSavedNoticeId((curr) => (curr === tpl.id ? null : curr));
    }, 2500);
  };

  const handleAddTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPrompt.trim()) {
      onNotify('新規項目の「項目名」と「AI抽出指示プロンプト」を入力してください。');
      return;
    }
    onAddTemplate(newTitle, newPrompt);
    onNotify(`新規マスター項目「${newTitle.trim()}」を追加しました。`);
    setNewTitle('');
    setNewPrompt('');
  };

  const handleFillSampleNewItem = () => {
    setNewTitle('推進体制・スケジュール・地域経済への波及効果');
    setNewPrompt(
      '社内のプロジェクト推進責任者・担当人員体制、設備発注から稼働・量産化までの月次マイルストーン、ならびに地域協力企業や雇用創出への波及効果を抽出すること。'
    );
  };

  const handleApplySuggestion = () => {
    onApplyPromptSuggestion();
    onNotify(
      '推奨プロンプト改善案を「期待される定性・定量効果（数値計画）」のプロンプトへ即時反映しました。'
    );
  };

  const handleSaveThresholdsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateThresholds(draftThresholds);
    onNotify(
      '補助金公募要件しきい値マスタを保存しました。全案件の収支計画マスター判定ロジックへ即時反映されました。'
    );
  };

  const handleSaveCrossCheckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftCrossPrompt.trim()) {
      onNotify('整合性クロスチェック用プロンプトを入力してください。');
      return;
    }
    onUpdateCrossCheckPrompt(draftCrossPrompt.trim());
    onNotify('整合性クロスチェック監査用AIプロンプトを保存しました。');
  };

  return (
    <div className="space-y-6">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            04. 管理者設定・差異分析 · 全社ガバナンス・公募要件管理（現在ロール:{' '}
            {role}）
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            管理者設定・プロンプト・要件しきい値・差異分析
          </h1>
        </div>

        {role !== 'システム管理者' && (
          <div className="flex items-center gap-3 bg-slate-100 border border-slate-300 px-3.5 py-2 text-xs text-slate-700">
            <span>現在は「{role}」ロールで閲覧中です</span>
            <button
              type="button"
              onClick={onSwitchRoleToAdmin}
              className="font-semibold text-slate-900 underline whitespace-nowrap cursor-pointer"
            >
              システム管理者へ切替
            </button>
          </div>
        )}
      </div>

      {/* Four-Tab Navigation */}
      <div className="flex items-center overflow-x-auto border-b border-slate-300 bg-white px-4 pt-3 gap-1">
        {(
          [
            {
              id: 'prompts',
              label: `タブ1: マスター構成・抽出プロンプト（${masterTemplates.length}）`,
            },
            {
              id: 'diffs',
              label: `タブ2: 差異分析・改善示唆（${diffLogs.length}件）`,
            },
            {
              id: 'thresholds',
              label: 'タブ3: 補助金公募要件しきい値設定',
            },
            {
              id: 'crosscheck',
              label: 'タブ4: 整合性クロスチェック用プロンプト',
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Master Schema & Prompt Management */}
      {activeTab === 'prompts' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  定性マスターシート構成項目とAI抽出指示プロンプト
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ここで設定した構成項目・順序・プロンプトは、全案件の「ワークスペース タブ2: 定性マスター」へ即時連動します。
                </p>
              </div>
              {promptSuggestionApplied && (
                <span className="text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 px-2.5 py-1 whitespace-nowrap">
                  差異分析からの改善プロンプト反映済
                </span>
              )}
            </div>

            <div className="space-y-4">
              {masterTemplates.map((tpl, index) => {
                const titleVal = editTitles[tpl.id] ?? tpl.title;
                const promptVal = editPrompts[tpl.id] ?? tpl.prompt;
                const isChanged =
                  titleVal !== tpl.title || promptVal !== tpl.prompt;
                const isHighlightedImproved =
                  promptSuggestionApplied &&
                  promptVal.includes('投資回収シミュレーション');

                return (
                  <div
                    key={tpl.id}
                    className={`border p-5 space-y-3 ${
                      isHighlightedImproved
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1">
                        <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
                          項目 0{index + 1}
                        </span>
                        <input
                          type="text"
                          value={titleVal}
                          onChange={(e) =>
                            setEditTitles((prev) => ({
                              ...prev,
                              [tpl.id]: e.target.value,
                            }))
                          }
                          aria-label={`項目0${index + 1}のタイトル`}
                          className="flex-1 max-w-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-800"
                        />
                        {isHighlightedImproved && (
                          <span className="text-xs font-semibold text-emerald-800 whitespace-nowrap">
                            [改善案追記済]
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => onMoveTemplate(tpl.id, 'up')}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          ↑ 上へ
                        </button>
                        <button
                          type="button"
                          disabled={index === masterTemplates.length - 1}
                          onClick={() => onMoveTemplate(tpl.id, 'down')}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          ↓ 下へ
                        </button>

                        {confirmDeleteId === tpl.id ? (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTemplate(tpl.id);
                                setConfirmDeleteId(null);
                                onNotify(`項目「${tpl.title}」を削除しました。`);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 cursor-pointer"
                            >
                              削除確定
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={masterTemplates.length <= 1}
                            onClick={() => setConfirmDeleteId(tpl.id)}
                            className="ml-2 px-2.5 py-1 text-xs font-medium text-rose-800 bg-white border border-rose-200 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        AI抽出指示プロンプト
                      </label>
                      <textarea
                        rows={3}
                        value={promptVal}
                        onChange={(e) =>
                          setEditPrompts((prev) => ({
                            ...prev,
                            [tpl.id]: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-300 bg-slate-50/40 p-3 text-xs leading-relaxed text-slate-900 focus:bg-white focus:outline-none focus:border-slate-800"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500 font-mono tabular-nums">
                        プロンプト文字数: {promptVal.length} 文字
                      </span>
                      <div className="flex items-center gap-3">
                        {savedNoticeId === tpl.id && (
                          <span className="text-xs font-semibold text-emerald-800">
                            保存しました
                          </span>
                        )}
                        {isChanged && (
                          <span className="text-xs text-amber-800 font-medium">
                            未保存の変更あり
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSaveTemplate(tpl)}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          プロンプトを保存
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form
            onSubmit={handleAddTemplateSubmit}
            className="bg-white border border-slate-200 p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  + マスター構成項目の新規追加
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  新しい公募要項の審査項目に合わせて、全社共通のマスター抽出項目を拡張できます。
                </p>
              </div>
              <button
                type="button"
                onClick={handleFillSampleNewItem}
                className="text-xs text-slate-700 hover:text-slate-900 underline self-start sm:self-auto cursor-pointer"
              >
                追加項目の入力例をセット
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  新規項目名
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例: 推進体制・スケジュール・地域経済への波及効果"
                  className="w-full max-w-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  AI抽出指示プロンプト
                </label>
                <textarea
                  rows={3}
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="議事録からどの要素をどのような粒度・表現で抽出すべきか記述してください..."
                  className="w-full border border-slate-300 p-3 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                + マスター構成項目を追加する
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Diff Analysis & Prompt Improvement Suggestion */}
      {activeTab === 'diffs' && (
        <div className="space-y-6">
          <section className="border border-slate-300 bg-white">
            <div className="bg-slate-900 text-white px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold tracking-tight">
                蓄積データに基づく改善示唆パネル（修正ログ横断分析）
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-300">
                分析対象ログ件数: {diffLogs.length} 件
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900">
                    直近の修正傾向分析
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800">
                    投資対効果における「回収年数」および「内訳数値」が担当者によって頻繁に手動追記されています。
                  </p>
                </div>

                <div className="border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                  <div className="text-xs font-bold text-slate-900">
                    推奨されるプロンプト改善案
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800">
                    プロンプト末尾に「設備導入による投資回収シミュレーション（年数・内訳）を必ず具体数値で明記すること」を追加してください。
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
                <div className="text-xs text-slate-600">
                  対象プロンプト: マスター項目04「期待される定性・定量効果（数値計画）」
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {promptSuggestionApplied ? (
                    <>
                      <span className="text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 px-3 py-1.5">
                        プロンプトへ反映済
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('prompts')}
                        className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        タブ1で更新されたプロンプトを確認 →
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplySuggestion}
                      className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      プロンプトへ即時反映
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="bg-white border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  書類作成者による修正履歴（ビジュアルDiff比較ログ）
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  赤色背景・取消線はAI初期出力からの削除箇所、緑色背景・下線は担当者による加筆修正箇所を示します。
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label
                  htmlFor="diff-subsidy-filter"
                  className="text-xs font-medium text-slate-600 whitespace-nowrap"
                >
                  補助金種別:
                </label>
                <select
                  id="diff-subsidy-filter"
                  value={subsidyFilter}
                  onChange={(e) => setSubsidyFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-800"
                >
                  <option value="ALL">すべての補助金（{diffLogs.length}件）</option>
                  {SUBSIDY_TYPES.map((st: SubsidyType) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
                該当する修正差異ログはまだ記録されていません。「ワークスペース タブ4: 申請書 作成・編集」で文面を編集し保存すると自動蓄積されます。
              </div>
            ) : (
              <div className="space-y-5">
                {filteredLogs.map((log) => (
                  <article
                    key={log.id}
                    className="bg-white border border-slate-200 p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {log.projectName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-800">
                          {log.subsidyType}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{log.sectionTitle}</span>
                      </div>

                      <div className="flex items-center gap-2 font-mono tabular-nums text-slate-500">
                        <span>編集担当: {log.editorName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>

                    <DiffViewer aiText={log.aiText} humanText={log.humanText} />
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: Subsidy Requirement Thresholds Settings */}
      {activeTab === 'thresholds' && (
        <form
          onSubmit={handleSaveThresholdsSubmit}
          className="bg-white border border-slate-200 p-6 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                補助金公募要件・補助上限しきい値マスタ設定
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                公募回次の改正（付加価値額伸び率目標や補助上限額の変更等）に合わせて数値を更新すると、全案件の「収支計画マスター」判定に即時連動します。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftThresholds(INITIAL_THRESHOLDS);
                onUpdateThresholds(INITIAL_THRESHOLDS);
                onNotify('公募要件しきい値を標準初期値に戻しました。');
              }}
              className="text-xs text-slate-600 hover:text-slate-900 underline self-start sm:self-auto cursor-pointer"
            >
              標準初期値に戻す
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 新事業進出補助金 */}
            <div className="border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                1. 新事業進出補助金
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  付加価値額 年率伸び率目標（%）
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={draftThresholds.shinJigyo.valueAddedGrowthRateAnnual}
                  onChange={(e) =>
                    setDraftThresholds((prev) => ({
                      ...prev,
                      shinJigyo: {
                        ...prev.shinJigyo,
                        valueAddedGrowthRateAnnual: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
                <span className="text-[11px] text-slate-500">
                  標準: 3.0%（または4.0%）以上
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  給与支給総額 年率伸び率目標（%）
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={draftThresholds.shinJigyo.wageGrowthRateAnnual}
                  onChange={(e) =>
                    setDraftThresholds((prev) => ({
                      ...prev,
                      shinJigyo: {
                        ...prev.shinJigyo,
                        wageGrowthRateAnnual: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
                <span className="text-[11px] text-slate-500">
                  標準: 1.5%〜2.5%以上
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  補助上限額（万円）
                </label>
                <input
                  type="number"
                  step={100}
                  min={100}
                  value={draftThresholds.shinJigyo.maxSubsidyAmount}
                  onChange={(e) =>
                    setDraftThresholds((prev) => ({
                      ...prev,
                      shinJigyo: {
                        ...prev.shinJigyo,
                        maxSubsidyAmount: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    補助率（分子）
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={draftThresholds.shinJigyo.subsidyRateNumerator}
                    onChange={(e) =>
                      setDraftThresholds((prev) => ({
                        ...prev,
                        shinJigyo: {
                          ...prev.shinJigyo,
                          subsidyRateNumerator: Math.max(
                            1,
                            Number(e.target.value) || 1
                          ),
                        },
                      }))
                    }
                    className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    補助率（分母）
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={draftThresholds.shinJigyo.subsidyRateDenominator}
                    onChange={(e) =>
                      setDraftThresholds((prev) => ({
                        ...prev,
                        shinJigyo: {
                          ...prev.shinJigyo,
                          subsidyRateDenominator: Math.max(
                            1,
                            Number(e.target.value) || 1
                          ),
                        },
                      }))
                    }
                    className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 小規模事業者持続化補助金 */}
            <div className="border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                2. 小規模事業者持続化補助金
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  補助上限額（万円）
                </label>
                <input
                  type="number"
                  step={50}
                  min={50}
                  value={draftThresholds.jizokuka.maxSubsidyAmount}
                  onChange={(e) =>
                    setDraftThresholds((prev) => ({
                      ...prev,
                      jizokuka: {
                        ...prev.jizokuka,
                        maxSubsidyAmount: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
                <span className="text-[11px] text-slate-500">
                  標準: 通常枠50万円 / 賃金引上げ・特例枠200万円
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    補助率（分子）
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={draftThresholds.jizokuka.subsidyRateNumerator}
                    onChange={(e) =>
                      setDraftThresholds((prev) => ({
                        ...prev,
                        jizokuka: {
                          ...prev.jizokuka,
                          subsidyRateNumerator: Math.max(
                            1,
                            Number(e.target.value) || 1
                          ),
                        },
                      }))
                    }
                    className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    補助率（分母）
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={draftThresholds.jizokuka.subsidyRateDenominator}
                    onChange={(e) =>
                      setDraftThresholds((prev) => ({
                        ...prev,
                        jizokuka: {
                          ...prev.jizokuka,
                          subsidyRateDenominator: Math.max(
                            1,
                            Number(e.target.value) || 1
                          ),
                        },
                      }))
                    }
                    className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 東京都経営強化基盤事業 */}
            <div className="border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                3. 東京都経営強化基盤事業
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  助成限度額（万円）
                </label>
                <input
                  type="number"
                  step={100}
                  min={100}
                  value={draftThresholds.tokyo.maxSubsidyAmount}
                  onChange={(e) =>
                    setDraftThresholds((prev) => ({
                      ...prev,
                      tokyo: {
                        ...prev.tokyo,
                        maxSubsidyAmount: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
                <span className="text-[11px] text-slate-500">
                  標準: 1,500万円（または特例3,000万円）
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    助成率（分子）
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={draftThresholds.tokyo.subsidyRateNumerator}
                    onChange={(e) =>
                      setDraftThresholds((prev) => ({
                        ...prev,
                        tokyo: {
                          ...prev.tokyo,
                          subsidyRateNumerator: Math.max(
                            1,
                            Number(e.target.value) || 1
                          ),
                        },
                      }))
                    }
                    className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    助成率（分母）
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={draftThresholds.tokyo.subsidyRateDenominator}
                    onChange={(e) =>
                      setDraftThresholds((prev) => ({
                        ...prev,
                        tokyo: {
                          ...prev.tokyo,
                          subsidyRateDenominator: Math.max(
                            1,
                            Number(e.target.value) || 1
                          ),
                        },
                      }))
                    }
                    className="w-full font-mono tabular-nums border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              公募要件しきい値設定を保存する
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: Consistency Cross-Check AI Prompt Management */}
      {activeTab === 'crosscheck' && (
        <form
          onSubmit={handleSaveCrossCheckSubmit}
          className="bg-white border border-slate-200 p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                定性・定量 整合性クロスチェック監査プロンプト管理
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                「ワークスペース タブ5: 定性・定量 整合性チェック」にてAI監査を実行する際のシステム監査ルールを定義します。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftCrossPrompt(INITIAL_CROSS_CHECK_PROMPT);
                onUpdateCrossCheckPrompt(INITIAL_CROSS_CHECK_PROMPT);
                onNotify('整合性クロスチェック用プロンプトを初期値に戻しました。');
              }}
              className="text-xs text-slate-600 hover:text-slate-900 underline self-start sm:self-auto cursor-pointer"
            >
              標準プロンプトへ復元
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="crosscheck-prompt-textarea"
                className="font-semibold text-slate-700"
              >
                AIクロスチェック指示プロンプト全文
              </label>
              <span className="font-mono tabular-nums text-slate-500">
                {draftCrossPrompt.length} 文字
              </span>
            </div>
            <textarea
              id="crosscheck-prompt-textarea"
              rows={9}
              value={draftCrossPrompt}
              onChange={(e) => setDraftCrossPrompt(e.target.value)}
              className="w-full border border-slate-300 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-900 focus:bg-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-200">
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              監査プロンプトを保存する
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
