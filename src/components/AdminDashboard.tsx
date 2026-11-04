import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Plus, Trash2 } from 'lucide-react';
import {
  CURRENT_CALL_ROUND_THRESHOLDS,
  INITIAL_CROSS_CHECK_PROMPT,
  INITIAL_EFFECT_ESTIMATES,
  SUBSIDY_TYPES,
} from '../data/initialData';
import {
  AdminTabId,
  CallRound,
  DiffLog,
  EffectEstimateItem,
  MasterSchemaTemplate,
  ReviewCriterion,
  Role,
  SubsidyRequirementThresholds,
  SubsidyType,
} from '../types';
import { canEdit, PERMISSION_MATRIX } from '../utils/permissions';
import { DiffViewer } from './DiffViewer';
import {
  formatMinutesJa,
  ReadOnlyRoleBadge,
  SpecTagBadge,
} from './SpecTagBadge';

export type { AdminTabId };

interface AdminDashboardProps {
  role: Role;
  masterTemplates: MasterSchemaTemplate[];
  diffLogs: DiffLog[];
  thresholds: SubsidyRequirementThresholds;
  callRounds: CallRound[];
  activeCallRound: CallRound;
  effectEstimates: EffectEstimateItem[];
  crossCheckPrompt: string;
  promptSuggestionApplied: boolean;
  defaultTab?: AdminTabId;
  onAddTemplate: (title: string, prompt: string) => void;
  onUpdateTemplate: (id: string, title: string, prompt: string) => void;
  onDeleteTemplate: (id: string) => void;
  onMoveTemplate: (id: string, direction: 'up' | 'down') => void;
  onApplyPromptSuggestion: () => void;
  onSetActiveCallRound: (roundId: string) => void;
  onDuplicateCallRound: (sourceRoundId: string, newName?: string) => string;
  onUpdateCallRound: (
    roundId: string,
    updates: Partial<
      Pick<
        CallRound,
        'name' | 'effectiveDate' | 'memo' | 'sectionCharLimits'
      >
    >
  ) => void;
  onDeleteCallRound: (roundId: string) => void;
  onUpdateThresholds: (thresholds: SubsidyRequirementThresholds) => void;
  onUpdateReviewCriteria: (
    roundId: string,
    criteria: ReviewCriterion[]
  ) => void;
  onUpdateEffectEstimates: (items: EffectEstimateItem[]) => void;
  onUpdateCrossCheckPrompt: (prompt: string) => void;
  onSwitchRoleToAdmin: () => void;
  onNotify: (message: string) => void;
}

const SECTION_LIMIT_LABELS: { id: string; label: string }[] = [
  { id: 'shin-1', label: '新事業進出: 1. 企業概要・経営環境' },
  { id: 'shin-2', label: '新事業進出: 2. 事業化に向けた詳細' },
  { id: 'shin-3', label: '新事業進出: 3. 収益計画・数値目標' },
  { id: 'jizo-1', label: '持続化: 1. 企業概要と自社の強み' },
  { id: 'jizo-2', label: '持続化: 2. 販路開拓等の取組内容' },
  { id: 'jizo-3', label: '持続化: 3. 業務効率化と期待効果' },
  { id: 'tokyo-1', label: '東京都: 1. 経営基盤強化の背景と目的' },
  { id: 'tokyo-2', label: '東京都: 2. 導入設備の妥当性と経費根拠' },
  { id: 'tokyo-3', label: '東京都: 3. 都内事業基盤への波及・定量目標' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  role,
  masterTemplates,
  diffLogs,
  thresholds,
  callRounds,
  activeCallRound,
  effectEstimates,
  crossCheckPrompt,
  promptSuggestionApplied,
  defaultTab = 'prompts',
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onMoveTemplate,
  onApplyPromptSuggestion,
  onSetActiveCallRound,
  onDuplicateCallRound,
  onUpdateCallRound,
  onDeleteCallRound,
  onUpdateThresholds,
  onUpdateReviewCriteria,
  onUpdateEffectEstimates,
  onUpdateCrossCheckPrompt,
  onSwitchRoleToAdmin,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabId>(defaultTab);
  const canEditAdmin = canEdit(role, 'admin_edit');

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

  // Tab 3 state (CallRound + Thresholds)
  const [draftRoundName, setDraftRoundName] = useState(activeCallRound.name);
  const [draftRoundDate, setDraftRoundDate] = useState(
    activeCallRound.effectiveDate
  );
  const [draftRoundMemo, setDraftRoundMemo] = useState(activeCallRound.memo);
  const [draftCharLimits, setDraftCharLimits] = useState<
    Record<string, number>
  >(activeCallRound.sectionCharLimits);
  const [draftThresholds, setDraftThresholds] =
    useState<SubsidyRequirementThresholds>(thresholds);

  // Tab 4 state (Review Criteria R2)
  const [criteriaSubsidyFilter, setCriteriaSubsidyFilter] = useState<
    SubsidyType | 'ALL'
  >('ALL');
  const [newCritSubsidy, setNewCritSubsidy] =
    useState<SubsidyType>('新事業進出補助金');
  const [newCritName, setNewCritName] = useState('');
  const [newCritDesc, setNewCritDesc] = useState('');
  const [newCritKeywords, setNewCritKeywords] = useState('');
  const [newCritSections, setNewCritSections] = useState<string[]>(['shin-1']);
  const [newCritBonus, setNewCritBonus] = useState(false);

  // Tab 5 state (Cross-check prompt)
  const [draftCrossPrompt, setDraftCrossPrompt] =
    useState<string>(crossCheckPrompt);

  // Tab 6 state (Effect Estimates W2)
  const [draftEffects, setDraftEffects] =
    useState<EffectEstimateItem[]>(effectEstimates);

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
    setDraftRoundName(activeCallRound.name);
    setDraftRoundDate(activeCallRound.effectiveDate);
    setDraftRoundMemo(activeCallRound.memo);
    setDraftCharLimits(activeCallRound.sectionCharLimits);
  }, [activeCallRound]);

  useEffect(() => {
    setDraftThresholds(thresholds);
  }, [thresholds]);

  useEffect(() => {
    setDraftCrossPrompt(crossCheckPrompt);
  }, [crossCheckPrompt]);

  useEffect(() => {
    setDraftEffects(effectEstimates);
  }, [effectEstimates]);

  const filteredLogs = useMemo(() => {
    if (subsidyFilter === 'ALL') return diffLogs;
    return diffLogs.filter((log) => log.subsidyType === subsidyFilter);
  }, [diffLogs, subsidyFilter]);

  const filteredCriteria = useMemo(() => {
    if (criteriaSubsidyFilter === 'ALL') return activeCallRound.reviewCriteria;
    return activeCallRound.reviewCriteria.filter(
      (c) => c.subsidyType === criteriaSubsidyFilter
    );
  }, [activeCallRound.reviewCriteria, criteriaSubsidyFilter]);

  const handleSaveTemplate = (tpl: MasterSchemaTemplate) => {
    if (!canEditAdmin) return;
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
    if (!canEditAdmin) return;
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
    if (!canEditAdmin) return;
    setNewTitle('推進体制・スケジュール・地域経済への波及効果');
    setNewPrompt(
      '社内のプロジェクト推進責任者・担当人員体制、設備発注から稼働・量産化までの月次マイルストーン、ならびに地域協力企業や雇用創出への波及効果を抽出すること。'
    );
  };

  const handleApplySuggestion = () => {
    if (!canEditAdmin) return;
    onApplyPromptSuggestion();
    onNotify(
      '推奨プロンプト改善案を「期待される定性・定量効果（数値計画）」のプロンプトへ即時反映しました。'
    );
  };

  const handleSaveRoundMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditAdmin) return;
    onUpdateCallRound(activeCallRound.id, {
      name: draftRoundName.trim() || activeCallRound.name,
      effectiveDate: draftRoundDate,
      memo: draftRoundMemo,
      sectionCharLimits: draftCharLimits,
    });
    onNotify(
      `公募回「${draftRoundName.trim() || activeCallRound.name}」の基本情報および指定文字数設定を保存しました。`
    );
  };

  const handleSaveThresholdsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditAdmin) return;
    onUpdateThresholds(draftThresholds);
    onNotify(
      '補助金公募要件しきい値マスタを保存しました。全案件の収支計画マスター判定ロジックへ即時反映されました。'
    );
  };

  const handleAddCriterionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditAdmin) return;
    if (!newCritName.trim() || !newCritKeywords.trim()) {
      onNotify('審査項目名と照合キーワード（カンマ区切り）を入力してください。');
      return;
    }
    const keywords = newCritKeywords
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const nextItem: ReviewCriterion = {
      id: `rc-${Date.now()}`,
      subsidyType: newCritSubsidy,
      name: newCritName.trim(),
      description: newCritDesc.trim() || '公募要領の審査観点に基づく確認項目',
      keywords,
      targetSectionIds:
        newCritSections.length > 0
          ? newCritSections
          : [
              newCritSubsidy === '新事業進出補助金'
                ? 'shin-1'
                : newCritSubsidy === '小規模事業者持続化補助金'
                  ? 'jizo-1'
                  : 'tokyo-1',
            ],
      isBonus: newCritBonus,
    };
    onUpdateReviewCriteria(activeCallRound.id, [
      ...activeCallRound.reviewCriteria,
      nextItem,
    ]);
    setNewCritName('');
    setNewCritDesc('');
    setNewCritKeywords('');
    setNewCritBonus(false);
    onNotify(`審査項目「${nextItem.name}」を追加しました。`);
  };

  const handleSaveCrossCheckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditAdmin) return;
    if (!draftCrossPrompt.trim()) {
      onNotify('整合性クロスチェック用プロンプトを入力してください。');
      return;
    }
    onUpdateCrossCheckPrompt(draftCrossPrompt.trim());
    onNotify('整合性クロスチェック監査用AIプロンプトを保存しました。');
  };

  const handleSaveEffectsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditAdmin) return;
    onUpdateEffectEstimates(draftEffects);
    onNotify(
      '導入効果試算の時間前提を保存しました。ダッシュボードおよび各工程タブの表示へ即時反映されました。'
    );
  };

  const adminTabs: { id: AdminTabId; label: string }[] = [
    {
      id: 'prompts',
      label: `1. マスター構成（${masterTemplates.length}）`,
    },
    {
      id: 'diffs',
      label: `2. 差異分析・改善示唆（${diffLogs.length}件）`,
    },
    {
      id: 'thresholds',
      label: '3. 公募回・要件しきい値',
    },
    {
      id: 'criteria',
      label: `4. 審査項目・加点（${activeCallRound.reviewCriteria.length}）`,
    },
    {
      id: 'crosscheck',
      label: '5. 監査プロンプト',
    },
    {
      id: 'effects',
      label: '6. 導入効果試算',
    },
    {
      id: 'permissions',
      label: '7. 権限マトリクス',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            06. 管理者設定 · 全社ガバナンス・公募回定期メンテナンス（現在ロール:{' '}
            {role}）
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              管理者設定・公募回・要件しきい値・審査項目・差異分析
            </h1>
            {!canEditAdmin && <ReadOnlyRoleBadge role={role} />}
          </div>
        </div>

        {!canEditAdmin && (
          <div className="flex items-center gap-3 bg-slate-100 border border-slate-300 px-3.5 py-2 text-xs text-slate-700 shrink-0">
            <span>現在は「{role}」のため閲覧のみです</span>
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

      {/* Seven-Tab Navigation */}
      <div className="flex items-center overflow-x-auto border-b border-slate-300 bg-white px-3 pt-2.5 gap-1">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                  ここで設定した構成項目・順序・プロンプトは、全案件の「ワークスペース タブ2: マスターヒアリングシート」へ即時連動します。
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
                          disabled={!canEditAdmin}
                          value={titleVal}
                          onChange={(e) =>
                            setEditTitles((prev) => ({
                              ...prev,
                              [tpl.id]: e.target.value,
                            }))
                          }
                          aria-label={`項目0${index + 1}のタイトル`}
                          className="flex-1 max-w-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-900 disabled:bg-slate-50 focus:outline-none focus:border-slate-800"
                        />
                        {isHighlightedImproved && (
                          <span className="text-xs font-semibold text-emerald-800 whitespace-nowrap">
                            [改善案追記済]
                          </span>
                        )}
                      </div>

                      {canEditAdmin && (
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
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        AI抽出指示プロンプト
                      </label>
                      <textarea
                        rows={3}
                        disabled={!canEditAdmin}
                        value={promptVal}
                        onChange={(e) =>
                          setEditPrompts((prev) => ({
                            ...prev,
                            [tpl.id]: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-300 bg-slate-50/40 p-3 text-xs leading-relaxed text-slate-900 disabled:bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800"
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
                          disabled={!canEditAdmin}
                          onClick={() => handleSaveTemplate(tpl)}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
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
              {canEditAdmin && (
                <button
                  type="button"
                  onClick={handleFillSampleNewItem}
                  className="text-xs text-slate-700 hover:text-slate-900 underline self-start sm:self-auto cursor-pointer"
                >
                  追加項目の入力例をセット
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  新規項目名
                </label>
                <input
                  type="text"
                  disabled={!canEditAdmin}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例: 推進体制・スケジュール・地域経済への波及効果"
                  className="w-full max-w-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-50 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  AI抽出指示プロンプト
                </label>
                <textarea
                  rows={3}
                  disabled={!canEditAdmin}
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="議事録からどの要素をどのような粒度・表現で抽出すべきか記述してください..."
                  className="w-full border border-slate-300 p-3 text-xs leading-relaxed text-slate-900 disabled:bg-slate-50 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canEditAdmin}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                + マスター構成項目を追加する
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Diff Analysis & Prompt Improvement Suggestion */}
      {activeTab === 'diffs' && (
        <div data-guide-id="guide-admin-diffs" className="space-y-6">
          <section className="border border-slate-300 bg-white">
            <div className="bg-slate-900 text-white px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">
                  蓄積データに基づく改善示唆パネル（修正ログ横断分析）
                </h2>
                <SpecTagBadge tag="指示書 Step7" />
              </div>
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
                      disabled={!canEditAdmin}
                      onClick={handleApplySuggestion}
                      className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
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
                  <option value="ALL">
                    すべての補助金（{diffLogs.length}件）
                  </option>
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

      {/* TAB 3: CallRound Management (R3) & Thresholds Settings (M8) */}
      {activeTab === 'thresholds' && (
        <div className="space-y-8">
          {/* R3: Call Round (Fiscal Year / Round) Switcher & Duplication */}
          <section
            data-guide-id="guide-admin-rounds"
            className="bg-white border border-slate-200 p-6 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    01. 公募回（年度・回次）バージョン管理（定期メンテナンス対応）
                  </h2>
                  <SpecTagBadge tag="指示書 5" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  公募要領の改訂時には現行公募回を「複製」して新回次を作成し、「現在有効」を切り替えることで要件しきい値・指定文字数・審査項目・生成プロンプトを一括更新できます。
                </p>
              </div>
              <button
                type="button"
                disabled={!canEditAdmin}
                onClick={() => {
                  const newId = onDuplicateCallRound(activeCallRound.id);
                  if (newId) {
                    onNotify(
                      `「${activeCallRound.name}」を複製して新しい公募回を作成・有効化しました。`
                    );
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>現在の公募回を複製して新回次を作成</span>
              </button>
            </div>

            {/* CallRounds List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {callRounds.map((round) => {
                const isActive = round.id === activeCallRound.id;
                return (
                  <div
                    key={round.id}
                    className={`border p-4 space-y-2.5 flex flex-col justify-between ${
                      isActive
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {round.name}
                        </span>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300 whitespace-nowrap">
                            <Check className="w-3 h-3" />
                            現在有効
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[11px] text-slate-500 bg-slate-100 border border-slate-200 whitespace-nowrap">
                            待機・過去アーカイブ
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-slate-500">
                        適用開始日: {round.effectiveDate} · 付加価値年率{' '}
                        {round.thresholds.shinJigyo.valueAddedGrowthRateAnnual}% /
                        一人当たり給与年率{' '}
                        {
                          round.thresholds.shinJigyo
                            .perCapitaWageGrowthRateAnnual
                        }
                        %
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {round.memo}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                      {!isActive && (
                        <>
                          <button
                            type="button"
                            disabled={!canEditAdmin}
                            onClick={() => {
                              onSetActiveCallRound(round.id);
                              onNotify(
                                `適用公募回を「${round.name}」へ切り替えました。全案件の判定・指定文字数に反映されました。`
                              );
                            }}
                            className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                          >
                            この公募回を有効にする
                          </button>
                          {callRounds.length > 1 && (
                            <button
                              type="button"
                              disabled={!canEditAdmin}
                              onClick={() => {
                                onDeleteCallRound(round.id);
                                onNotify(`公募回「${round.name}」を削除しました。`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-800 bg-white border border-rose-200 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              削除
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Round Metadata & Section Char Limits Editor */}
            <form
              onSubmit={handleSaveRoundMetadata}
              className="border border-slate-200 p-4 bg-slate-50/50 space-y-4"
            >
              <div className="text-xs font-bold text-slate-900">
                選択中の有効公募回「{activeCallRound.name}」の基本情報・セクション指定文字数設定
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    公募回名称
                  </label>
                  <input
                    type="text"
                    disabled={!canEditAdmin}
                    value={draftRoundName}
                    onChange={(e) => setDraftRoundName(e.target.value)}
                    className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    適用開始日
                  </label>
                  <input
                    type="date"
                    disabled={!canEditAdmin}
                    value={draftRoundDate}
                    onChange={(e) => setDraftRoundDate(e.target.value)}
                    className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    改訂メモ
                  </label>
                  <input
                    type="text"
                    disabled={!canEditAdmin}
                    value={draftRoundMemo}
                    onChange={(e) => setDraftRoundMemo(e.target.value)}
                    className="w-full border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {SECTION_LIMIT_LABELS.map((sec) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between gap-2 bg-white border border-slate-200 px-2.5 py-1.5"
                  >
                    <span className="text-[11px] text-slate-700 truncate">
                      {sec.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min={50}
                        step={50}
                        disabled={!canEditAdmin}
                        value={draftCharLimits[sec.id] ?? 400}
                        onChange={(e) =>
                          setDraftCharLimits((prev) => ({
                            ...prev,
                            [sec.id]: Math.max(50, Number(e.target.value) || 50),
                          }))
                        }
                        className="w-16 text-right font-mono tabular-nums border border-slate-300 px-1.5 py-0.5 text-xs"
                      />
                      <span className="text-[11px] text-slate-500">字</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!canEditAdmin}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  公募回情報・指定文字数を保存
                </button>
              </div>
            </form>
          </section>

          {/* M8: Detailed Subsidy Requirement Thresholds Form */}
          <form
            data-guide-id="guide-admin-thresholds"
            onSubmit={handleSaveThresholdsSubmit}
            className="bg-white border border-slate-200 p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    02. 補助金公募要件・規模別上限しきい値マスタ設定（{activeCallRound.name}）
                  </h2>
                  <SpecTagBadge tag="指示書 4-②" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  数値を更新して保存すると、全案件の「収支計画マスター」および「整合性チェックリスト」の判定ロジックへ即時連動します。
                </p>
              </div>
              {canEditAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftThresholds(CURRENT_CALL_ROUND_THRESHOLDS);
                    onUpdateThresholds(CURRENT_CALL_ROUND_THRESHOLDS);
                    onNotify('公募要件しきい値を標準初期値に戻しました。');
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 underline self-start sm:self-auto cursor-pointer"
                >
                  標準初期値に戻す
                </button>
              )}
            </div>

            {/* M8 Reference Note & Official URLs */}
            <div className="bg-slate-50 border border-slate-300 p-4 space-y-2 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">
                参考値：2026年11月時点の公開情報（各補助金公式サイト・公募要領）に基づく仮設定です。正式値はご提供データにて差し替えます。
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-slate-600">
                <li>
                  ・新事業進出補助金:{' '}
                  <a
                    href="https://shinjigyou-shinshutsu.smrj.go.jp/initialstep"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-900"
                  >
                    https://shinjigyou-shinshutsu.smrj.go.jp/initialstep
                  </a>
                </li>
                <li>
                  ・小規模事業者持続化補助金:{' '}
                  <a
                    href="https://www.chusho.meti.go.jp/koukai/yosan/r8/jizoku.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-900"
                  >
                    https://www.chusho.meti.go.jp/koukai/yosan/r8/jizoku.pdf
                  </a>
                </li>
                <li>
                  ・東京都（経営基盤強化支援事業 一般コース仮設定）:{' '}
                  <a
                    href="https://www.tokyo-kosha.or.jp/support/josei/jigyo/kankyo-ippan/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-900"
                  >
                    https://www.tokyo-kosha.or.jp/support/josei/jigyo/kankyo-ippan/index.html
                  </a>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* 1. 新事業進出補助金 */}
              <div className="xl:col-span-6 border border-slate-200 p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  1. 新事業進出補助金（成長率・下限・従業員規模別上限）
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      付加価値額 年平均成長率（%）
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canEditAdmin}
                      value={
                        draftThresholds.shinJigyo.valueAddedGrowthRateAnnual
                      }
                      onChange={(e) =>
                        setDraftThresholds((prev) => ({
                          ...prev,
                          shinJigyo: {
                            ...prev.shinJigyo,
                            valueAddedGrowthRateAnnual:
                              Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      一人当たり給与 年率（%）
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canEditAdmin}
                      value={
                        draftThresholds.shinJigyo.perCapitaWageGrowthRateAnnual
                      }
                      onChange={(e) =>
                        setDraftThresholds((prev) => ({
                          ...prev,
                          shinJigyo: {
                            ...prev.shinJigyo,
                            perCapitaWageGrowthRateAnnual:
                              Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      賃上げ特例時 給与年率（%）
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canEditAdmin}
                      value={
                        draftThresholds.shinJigyo
                          .perCapitaWageGrowthSpecialAnnual
                      }
                      onChange={(e) =>
                        setDraftThresholds((prev) => ({
                          ...prev,
                          shinJigyo: {
                            ...prev.shinJigyo,
                            perCapitaWageGrowthSpecialAnnual:
                              Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      補助下限額（万円）
                    </label>
                    <input
                      type="number"
                      step={50}
                      disabled={!canEditAdmin}
                      value={draftThresholds.shinJigyo.minSubsidyAmount}
                      onChange={(e) =>
                        setDraftThresholds((prev) => ({
                          ...prev,
                          shinJigyo: {
                            ...prev.shinJigyo,
                            minSubsidyAmount: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      事業場内最賃（地域別＋円）
                    </label>
                    <input
                      type="number"
                      disabled={!canEditAdmin}
                      value={draftThresholds.shinJigyo.minWagePlusYen}
                      onChange={(e) =>
                        setDraftThresholds((prev) => ({
                          ...prev,
                          shinJigyo: {
                            ...prev.shinJigyo,
                            minWagePlusYen: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      最賃特例時（地域別＋円）
                    </label>
                    <input
                      type="number"
                      disabled={!canEditAdmin}
                      value={draftThresholds.shinJigyo.minWageSpecialPlusYen}
                      onChange={(e) =>
                        setDraftThresholds((prev) => ({
                          ...prev,
                          shinJigyo: {
                            ...prev.shinJigyo,
                            minWageSpecialPlusYen: Number(e.target.value) || 0,
                          },
                        }))
                      }
                      className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>

                {/* Employee Size Cap Tiers Table */}
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    従業員規模別の補助上限額（通常 ／ 賃上げ特例適用時）
                  </div>
                  <table className="w-full border-collapse border border-slate-200 text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                        <th className="py-1.5 px-2.5 text-left">従業員数区分</th>
                        <th className="py-1.5 px-2.5 text-right">通常上限（万円）</th>
                        <th className="py-1.5 px-2.5 text-right">
                          賃上げ特例時（万円）
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {draftThresholds.shinJigyo.capTiers.map((tier, tIdx) => (
                        <tr key={tier.label}>
                          <td className="py-1.5 px-2.5 font-medium text-slate-800">
                            {tier.label}
                          </td>
                          <td className="py-1.5 px-2.5 text-right">
                            <input
                              type="number"
                              step={100}
                              disabled={!canEditAdmin}
                              value={tier.standardCap}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setDraftThresholds((prev) => ({
                                  ...prev,
                                  shinJigyo: {
                                    ...prev.shinJigyo,
                                    capTiers: prev.shinJigyo.capTiers.map(
                                      (ct, i) =>
                                        i === tIdx
                                          ? { ...ct, standardCap: val }
                                          : ct
                                    ),
                                  },
                                }));
                              }}
                              className="w-24 text-right font-mono tabular-nums border border-slate-300 px-2 py-0.5 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2.5 text-right">
                            <input
                              type="number"
                              step={100}
                              disabled={!canEditAdmin}
                              value={tier.wageSpecialCap}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setDraftThresholds((prev) => ({
                                  ...prev,
                                  shinJigyo: {
                                    ...prev.shinJigyo,
                                    capTiers: prev.shinJigyo.capTiers.map(
                                      (ct, i) =>
                                        i === tIdx
                                          ? { ...ct, wageSpecialCap: val }
                                          : ct
                                    ),
                                  },
                                }));
                              }}
                              className="w-24 text-right font-mono tabular-nums border border-slate-300 px-2 py-0.5 text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. 持続化 & 3. 東京都 */}
              <div className="xl:col-span-6 space-y-6">
                <div className="border border-slate-200 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                    2. 小規模事業者持続化補助金（通常上限＋特例上乗せ）
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        通常上限額（万円）
                      </label>
                      <input
                        type="number"
                        step={10}
                        disabled={!canEditAdmin}
                        value={draftThresholds.jizokuka.baseMaxSubsidyAmount}
                        onChange={(e) =>
                          setDraftThresholds((prev) => ({
                            ...prev,
                            jizokuka: {
                              ...prev.jizokuka,
                              baseMaxSubsidyAmount: Number(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        インボイス特例（＋万円）
                      </label>
                      <input
                        type="number"
                        step={10}
                        disabled={!canEditAdmin}
                        value={draftThresholds.jizokuka.invoiceSpecialBonus}
                        onChange={(e) =>
                          setDraftThresholds((prev) => ({
                            ...prev,
                            jizokuka: {
                              ...prev.jizokuka,
                              invoiceSpecialBonus: Number(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        賃金引上げ特例（＋万円）
                      </label>
                      <input
                        type="number"
                        step={10}
                        disabled={!canEditAdmin}
                        value={draftThresholds.jizokuka.wageSpecialBonus}
                        onChange={(e) =>
                          setDraftThresholds((prev) => ({
                            ...prev,
                            jizokuka: {
                              ...prev.jizokuka,
                              wageSpecialBonus: Number(e.target.value) || 0,
                            },
                          }))
                        }
                        className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ※両特例適用時の最大上限:{' '}
                    {draftThresholds.jizokuka.baseMaxSubsidyAmount +
                      draftThresholds.jizokuka.invoiceSpecialBonus +
                      draftThresholds.jizokuka.wageSpecialBonus}
                    万円 ／ 補助率: 通常{' '}
                    {draftThresholds.jizokuka.subsidyRateNumerator}/
                    {draftThresholds.jizokuka.subsidyRateDenominator}（賃上げ特例かつ赤字事業者{' '}
                    {draftThresholds.jizokuka.deficitWageSpecialRateNumerator}/
                    {draftThresholds.jizokuka.deficitWageSpecialRateDenominator}
                    ）
                  </div>
                </div>

                <div className="border border-slate-200 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      3. 東京都経営強化基盤事業
                    </h3>
                    <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                      仮設定：対象事業はクライアント確認中
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    想定制度：東京都中小企業振興公社「経営基盤強化支援事業（一般コース）」の数値を仮設定しています。
                  </p>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        助成限度額（万円）
                      </label>
                      <input
                        type="number"
                        step={50}
                        disabled={!canEditAdmin}
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
                        className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        助成率（分子）
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={!canEditAdmin}
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
                        className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        助成率（分母）
                      </label>
                      <input
                        type="number"
                        min={1}
                        disabled={!canEditAdmin}
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
                        className="w-full font-mono tabular-nums border border-slate-300 px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
              <button
                type="submit"
                disabled={!canEditAdmin}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                公募要件しきい値設定を保存する
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Review Criteria & Bonus Points Management (R2) */}
      {activeTab === 'criteria' && (
        <div data-guide-id="guide-admin-criteria" className="space-y-6">
          <section className="bg-white border border-slate-200 p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    補助金別 審査項目・加点要素マスタ（{activeCallRound.name}）
                  </h2>
                  <SpecTagBadge tag="指示書 5" />
                  <span className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 border border-slate-300">
                    参考（公募要領にて要確認）
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ここで設定した照合キーワードに基づき、申請書エディタの各セクションで「記載あり✓／未記載」が自動判定されます。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCriteriaSubsidyFilter('ALL')}
                  className={`px-3 py-1 text-xs font-semibold cursor-pointer ${
                    criteriaSubsidyFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  すべて（{activeCallRound.reviewCriteria.length}）
                </button>
                {SUBSIDY_TYPES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCriteriaSubsidyFilter(st)}
                    className={`px-3 py-1 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      criteriaSubsidyFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200">
              {filteredCriteria.map((rc) => (
                <div
                  key={rc.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 font-semibold bg-slate-900 text-white">
                        {rc.subsidyType}
                      </span>
                      {rc.isBonus && (
                        <span className="px-2 py-0.5 font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                          加点要素
                        </span>
                      )}
                      <span className="text-sm font-bold text-slate-900">
                        {rc.name}
                      </span>
                    </div>
                    <p className="text-slate-600">{rc.description}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>
                        対象セクション: {rc.targetSectionIds.join(', ')}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-slate-700">
                        照合語: {rc.keywords.join(' / ')}
                      </span>
                    </div>
                  </div>

                  {canEditAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = activeCallRound.reviewCriteria.filter(
                          (item) => item.id !== rc.id
                        );
                        onUpdateReviewCriteria(activeCallRound.id, next);
                        onNotify(`審査項目「${rc.name}」を削除しました。`);
                      }}
                      className="px-3 py-1.5 text-xs text-rose-800 bg-white border border-rose-200 hover:bg-rose-50 shrink-0 self-start sm:self-center cursor-pointer"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Add Criterion Form */}
          <form
            onSubmit={handleAddCriterionSubmit}
            className="bg-white border border-slate-200 p-6 space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              + 審査項目・加点要素の新規追加
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  対象補助金
                </label>
                <select
                  disabled={!canEditAdmin}
                  value={newCritSubsidy}
                  onChange={(e) => {
                    const st = e.target.value as SubsidyType;
                    setNewCritSubsidy(st);
                    setNewCritSections([
                      st === '新事業進出補助金'
                        ? 'shin-1'
                        : st === '小規模事業者持続化補助金'
                          ? 'jizo-1'
                          : 'tokyo-1',
                    ]);
                  }}
                  className="w-full border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  {SUBSIDY_TYPES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  審査項目・加点名称
                </label>
                <input
                  type="text"
                  disabled={!canEditAdmin}
                  value={newCritName}
                  onChange={(e) => setNewCritName(e.target.value)}
                  placeholder="例: パートナーシップ構築宣言加点"
                  className="w-full border border-slate-300 px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  照合キーワード（カンマ区切り）
                </label>
                <input
                  type="text"
                  disabled={!canEditAdmin}
                  value={newCritKeywords}
                  onChange={(e) => setNewCritKeywords(e.target.value)}
                  placeholder="例: パートナーシップ, 取引適正化, 価格転嫁"
                  className="w-full border border-slate-300 px-2.5 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  審査観点の説明メモ
                </label>
                <input
                  type="text"
                  disabled={!canEditAdmin}
                  value={newCritDesc}
                  onChange={(e) => setNewCritDesc(e.target.value)}
                  placeholder="公募要領上の確認ポイントを記載..."
                  className="w-full border border-slate-300 px-2.5 py-2 text-xs"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEditAdmin}
                    checked={newCritBonus}
                    onChange={(e) => setNewCritBonus(e.target.checked)}
                    className="accent-slate-900"
                  />
                  <span className="font-semibold text-slate-700">
                    加点要素として扱う
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canEditAdmin}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>審査項目を追加する</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: Consistency Cross-Check AI Prompt Management */}
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
                「ワークスペース タブ5: 整合性チェックリスト」および「生成AI用プロンプト集」と単一データで同期しています。
              </p>
            </div>
            {canEditAdmin && (
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
            )}
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
              disabled={!canEditAdmin}
              value={draftCrossPrompt}
              onChange={(e) => setDraftCrossPrompt(e.target.value)}
              className="w-full border border-slate-300 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-900 disabled:bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-200">
            <button
              type="submit"
              disabled={!canEditAdmin}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              監査プロンプトを保存する
            </button>
          </div>
        </form>
      )}

      {/* TAB 6: Effect Estimates Settings (W2) */}
      {activeTab === 'effects' && (
        <form
          onSubmit={handleSaveEffectsSubmit}
          className="bg-white border border-slate-200 p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  導入効果試算（工程別所要時間）の設定
                </h2>
                <span className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 border border-slate-300">
                  試算例（仮置き）
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                貴社の現在の実務所要時間に合わせて「従来の手作業（時間）」と「本システム導入後（分）」を調整すると、案件一覧ダッシュボードおよび各ワークスペース画面の試算値へ即時反映されます。
              </p>
            </div>
            {canEditAdmin && (
              <button
                type="button"
                onClick={() => {
                  setDraftEffects(INITIAL_EFFECT_ESTIMATES);
                  onUpdateEffectEstimates(INITIAL_EFFECT_ESTIMATES);
                  onNotify('導入効果試算の設定を初期値に戻しました。');
                }}
                className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                初期値に戻す
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-4">対象ワークスペース工程</th>
                  <th className="py-2.5 px-4 text-right">従来の手作業（時間）</th>
                  <th className="py-2.5 px-4 text-right">本システム（分）</th>
                  <th className="py-2.5 px-4 text-right">1案件あたり削減時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {draftEffects.map((item, idx) => {
                  const savedHours = Number(
                    Math.max(0, item.manualHours - item.systemMinutes / 60).toFixed(
                      1
                    )
                  );
                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {item.processName}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            disabled={!canEditAdmin}
                            value={item.manualHours}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setDraftEffects((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, manualHours: val } : it
                                )
                              );
                            }}
                            className="w-20 text-right font-mono tabular-nums border border-slate-300 px-2 py-1 text-xs"
                          />
                          <span className="text-slate-500">時間</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            step={5}
                            min={5}
                            disabled={!canEditAdmin}
                            value={item.systemMinutes}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setDraftEffects((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, systemMinutes: val } : it
                                )
                              );
                            }}
                            className="w-20 text-right font-mono tabular-nums border border-slate-300 px-2 py-1 text-xs"
                          />
                          <span className="text-slate-500">
                            分（{formatMinutesJa(item.systemMinutes)}）
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-800">
                        -{savedHours} 時間
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canEditAdmin}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              導入効果試算の設定を保存する
            </button>
          </div>
        </form>
      )}

      {/* TAB 7: Role Permission Matrix (R4) */}
      {activeTab === 'permissions' && (
        <section
          data-guide-id="guide-admin-permissions"
          className="bg-white border border-slate-200 p-6 space-y-4"
        >
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              ロール別 操作権限マトリクス（全画面・フェーズゲート制御一覧）
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              分業体制における誤操作・手戻りを防ぐため、各ロールの編集可否を本マトリクスで一元制御しています（画面右上の「操作ロール」を切り替えると実際の制限挙動を確認できます）。
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-3 px-3 whitespace-nowrap">対象領域</th>
                  <th className="py-3 px-3">機能・ゲート操作</th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">
                    営業担当
                  </th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">
                    書類作成者
                  </th>
                  <th className="py-3 px-3 text-center whitespace-nowrap">
                    システム管理者
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {PERMISSION_MATRIX.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                      {row.category}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">
                        {row.featureLabel}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {row.description}
                      </div>
                    </td>
                    {(['営業担当', '書類作成者', 'システム管理者'] as Role[]).map(
                      (r) => {
                        const allowed = row.roles[r];
                        const isCurrentRole = role === r;
                        return (
                          <td
                            key={r}
                            className={`py-3 px-3 text-center whitespace-nowrap ${
                              isCurrentRole ? 'bg-slate-50/80' : ''
                            }`}
                          >
                            {allowed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300">
                                <Check className="w-3 h-3" />
                                編集・確定可
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-slate-500 bg-slate-100 border border-slate-200">
                                {row.readOnlyNote ?? '閲覧のみ'}
                              </span>
                            )}
                          </td>
                        );
                      }
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
