import React, { useMemo, useState } from 'react';
import { TEXT_MODULE_CATEGORIES } from '../data/initialData';
import {
  Project,
  Role,
  TextModule,
  TextModuleCategory,
} from '../types';
import { interpolateTags } from '../utils/financialCalculations';

interface TextModuleLibraryProps {
  role: Role;
  modules: TextModule[];
  selectedProject: Project;
  onAddModule: (mod: Omit<TextModule, 'id'>) => void;
  onUpdateModule: (id: string, mod: Omit<TextModule, 'id'>) => void;
  onDeleteModule: (id: string) => void;
  onNavigateToWorkspaceEditor: () => void;
  onNotify: (message: string) => void;
}

const AVAILABLE_TAGS = [
  '{企業名}',
  '{従業員数}',
  '{直前期売上}',
  '{設備投資額}',
  '{機械装置費}',
  '{システム費}',
  '{補助金申請額}',
  '{初年度売上}',
  '{3年後売上}',
  '{売上増加額}',
  '{3年後営業利益率}',
  '{付加価値額年率}',
  '{給与伸び率}',
  '{回収年数}',
  '{年間CF増加額}',
  '{削減時間}',
];

function renderHighlightedTemplate(text: string): React.ReactNode {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, idx) =>
    part.startsWith('{') && part.endsWith('}') ? (
      <span
        key={idx}
        className="font-mono text-xs font-semibold bg-amber-100 text-amber-950 px-1 py-0.5 border border-amber-300 mx-0.5"
      >
        {part}
      </span>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

export const TextModuleLibrary: React.FC<TextModuleLibraryProps> = ({
  role,
  modules,
  selectedProject,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  onNavigateToWorkspaceEditor,
  onNotify,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<
    TextModuleCategory | 'ALL'
  >('ALL');
  const [lengthTab, setLengthTab] = useState<'all' | 'short' | 'long'>('all');

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TextModuleCategory>('effect');
  const [lengthType, setLengthType] = useState<'short' | 'long'>('short');
  const [templateText, setTemplateText] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      if (categoryFilter !== 'ALL' && m.category !== categoryFilter) {
        return false;
      }
      if (lengthTab !== 'all' && m.lengthType !== lengthTab) {
        return false;
      }
      return true;
    });
  }, [modules, categoryFilter, lengthTab]);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setCategory('effect');
    setLengthType('short');
    setTemplateText(
      '総額{設備投資額}の導入により工程時間を{削減時間}削減し、初年度売上{初年度売上}、3年後売上{3年後売上}（営業利益率{3年後営業利益率}）を達成する。投資回収期間は約{回収年数}を見込む。'
    );
    setTagsInput('収支連動, 採択実績あり');
    setModalOpen(true);
  };

  const openEditModal = (mod: TextModule) => {
    setEditingId(mod.id);
    setTitle(mod.title);
    setCategory(mod.category);
    setLengthType(mod.lengthType);
    setTemplateText(mod.templateText);
    setTagsInput(mod.tags.join(', '));
    setModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !templateText.trim()) {
      onNotify('モジュール名とテンプレート本文を入力してください。');
      return;
    }
    const categoryLabel =
      TEXT_MODULE_CATEGORIES.find((c) => c.id === category)?.label ??
      '投資効果・収益回収計画';
    const parsedTags = tagsInput
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Omit<TextModule, 'id'> = {
      category,
      categoryLabel,
      title: title.trim(),
      lengthType,
      templateText: templateText.trim(),
      tags: parsedTags,
    };

    if (editingId) {
      onUpdateModule(editingId, payload);
      onNotify(`文章モジュール「${payload.title}」を更新しました。`);
    } else {
      onAddModule(payload);
      onNotify(`新規文章モジュール「${payload.title}」を登録しました。`);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            03. 文章モジュールライブラリ · 過去採択申請書ナレッジDB（現在ロール:{' '}
            {role}）
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            標準文章モジュール・変数タグライブラリ
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            実数値プレビュー基準案件:{' '}
            <span className="font-semibold text-slate-900">
              {selectedProject.companyName}
            </span>
            {' · '}総投資額{' '}
            <span className="font-mono tabular-nums font-semibold">
              {selectedProject.financialMaster.investment.totalInvestment.toLocaleString()}万円
            </span>{' '}
            / 3年後売上{' '}
            <span className="font-mono tabular-nums font-semibold">
              {selectedProject.financialMaster.forecast.y3.sales.toLocaleString()}万円
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToWorkspaceEditor}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            申請書エディタへ移動 →
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            + 新規モジュール登録
          </button>
        </div>
      </div>

      {/* Filter & Length Switcher Toolbar */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            すべて（{modules.length}件）
          </button>
          {TEXT_MODULE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Short (200) vs Long (500) Switching Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-200 self-start lg:self-auto shrink-0">
          {(
            [
              { id: 'all', label: '全文字数' },
              { id: 'short', label: '短文（約200字）' },
              { id: 'long', label: '長文（約500字）' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLengthTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                lengthTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Module Cards Grid */}
      <div className="space-y-4">
        {filteredModules.length === 0 ? (
          <div className="bg-white border border-slate-200 p-12 text-center text-sm text-slate-500">
            該当するカテゴリの文章モジュールがありません。「+ 新規モジュール登録」から追加してください。
          </div>
        ) : (
          filteredModules.map((mod) => {
            const livePreview = interpolateTags(
              mod.templateText,
              selectedProject
            );

            return (
              <article
                key={mod.id}
                className="bg-white border border-slate-200 p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {mod.categoryLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {mod.lengthType === 'short'
                          ? '短文仕様（約200字想定）'
                          : '長文仕様（約500字想定）'}
                      </span>
                      {mod.tags.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>キーワード: {mod.tags.join(' / ')}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1">
                      {mod.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(mod)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      編集
                    </button>

                    {confirmDeleteId === mod.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteModule(mod.id);
                            setConfirmDeleteId(null);
                            onNotify(`モジュール「${mod.title}」を削除しました。`);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 cursor-pointer"
                        >
                          削除確定
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(mod.id)}
                        className="px-3 py-1.5 text-xs font-medium text-rose-800 bg-white border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>

                {/* Side-by-Side Template vs Live Real-Number Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        標準テンプレート構文（変数タグ強調表示）
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {mod.templateText.length} 文字
                      </span>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">
                      {renderHighlightedTemplate(mod.templateText)}
                    </p>
                  </div>

                  <div className="bg-emerald-50/35 border border-emerald-200 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-950">
                        実数値プレビュー（{selectedProject.companyName} の収支適用）
                      </span>
                      <span className="font-mono tabular-nums text-emerald-900 font-semibold">
                        {livePreview.length} 文字
                      </span>
                    </div>
                    <p className="text-sm text-slate-900 leading-relaxed">
                      {livePreview}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="module-modal-title"
        >
          <div className="w-full max-w-2xl bg-white border border-slate-300 shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2
                id="module-modal-title"
                className="text-base font-bold text-slate-900"
              >
                {editingId
                  ? '文章モジュールの編集'
                  : '新規文章モジュールの登録'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-sm font-mono text-slate-500 hover:text-slate-900 px-2 py-1 cursor-pointer"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSaveModal}
              className="p-6 space-y-4 overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  モジュールタイトル <span className="text-rose-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 投資効果（5軸機導入による外注内製化・回収試算）"
                  className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    カテゴリ
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as TextModuleCategory)
                    }
                    className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-800"
                  >
                    {TEXT_MODULE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    文字数タイプ
                  </label>
                  <select
                    value={lengthType}
                    onChange={(e) =>
                      setLengthType(e.target.value as 'short' | 'long')
                    }
                    className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-800"
                  >
                    <option value="short">短文（約200字・持続化等）</option>
                    <option value="long">長文（約500字・新事業進出等）</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    テンプレート本文（クリックで変数タグを挿入）
                  </label>
                  <span className="font-mono tabular-nums text-xs text-slate-500">
                    {templateText.length} 文字
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 py-1">
                  {AVAILABLE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTemplateText((prev) => `${prev}${tag}`)}
                      className="px-2 py-0.5 text-[11px] font-mono bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100 cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  required
                  value={templateText}
                  onChange={(e) => setTemplateText(e.target.value)}
                  className="w-full border border-slate-300 p-3 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="bg-emerald-50/40 border border-emerald-200 p-3 space-y-1 text-xs">
                <div className="font-semibold text-emerald-950">
                  リアルタイム置換プレビュー（{selectedProject.companyName}）:
                </div>
                <p className="text-slate-900 leading-relaxed">
                  {interpolateTags(templateText, selectedProject)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  検索用キーワード（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="例: 5軸加工, 投資回収年数, 付加価値額"
                  className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer"
                >
                  {editingId ? '変更を保存する' : 'モジュールを登録する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
