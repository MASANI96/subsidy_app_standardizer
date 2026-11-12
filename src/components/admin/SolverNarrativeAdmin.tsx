import React, { useState } from 'react';
import { Copy, Plus, Sparkles, Trash2, Tag, FileText, Check } from 'lucide-react';
import { NarrativeTemplate, SolverCandidate } from '../../types';

interface SolverNarrativeAdminProps {
  canEdit: boolean;
  solverCandidates: SolverCandidate[];
  narrativeTemplates: NarrativeTemplate[];
  onUpdateSolverCandidates: (candidates: SolverCandidate[]) => void;
  onUpdateNarrativeTemplates: (templates: NarrativeTemplate[]) => void;
  onNotify?: (msg: string) => void;
}

/** PlanSimulation の対象数値項目選択肢 */
const SIMULATION_NUMERIC_KEYS: { key: string; label: string; affects: 'valueAdded' | 'wage' }[] = [
  { key: 'existingGrowthRate', label: '既存事業 売上成長率(%)', affects: 'valueAdded' },
  { key: 'existingCostRate', label: '既存事業 原価率(%)', affects: 'valueAdded' },
  { key: 'existingOtherSgaRate', label: '既存事業 その他販管費率(%)', affects: 'valueAdded' },
  { key: 'subsidyUnitPriceYen', label: '補助事業 単価(円)', affects: 'valueAdded' },
  { key: 'subsidyMonthlyQty', label: '補助事業 月あたり販売数量', affects: 'valueAdded' },
  { key: 'subsidyCostRate', label: '補助事業 原価率(%)', affects: 'valueAdded' },
  { key: 'subsidyOtherSgaRate', label: '補助事業 その他販管費率(%)', affects: 'valueAdded' },
  { key: 'perCapitaWageGrowthRate', label: '一人当たり給与の伸び率(%)', affects: 'wage' },
  { key: 'headcountIncrease', label: '期中増員数(人)', affects: 'wage' },
  { key: 'incomeTaxRatePercent', label: '法人税等の実効税率(%)', affects: 'valueAdded' },
];

/** 利用可能なテンプレートタグ一覧 */
const AVAILABLE_TAGS = [
  { tag: '{基準年度}', desc: '基準年度の年度表記（例: 2024年度）' },
  { tag: '{最終年度}', desc: '計画最終年度の年度表記（例: 2029年度）' },
  { tag: '{基準付加価値額}', desc: '基準年度の付加価値額（円単位フォーマット）' },
  { tag: '{最終付加価値額}', desc: '最終年度の付加価値額（円単位フォーマット）' },
  { tag: '{付加価値CAGR}', desc: '付加価値額の年平均成長率（%）' },
  { tag: '{既存成長率}', desc: '既存事業の売上成長率（%）' },
  { tag: '{最終年度補助売上}', desc: '最終年度における補助事業の売上高' },
  { tag: '{基準一人当たり給与}', desc: '基準年度の一人当たり給与支給額' },
  { tag: '{最終一人当たり給与}', desc: '最終年度の一人当たり給与支給額' },
  { tag: '{給与伸び率}', desc: '基準年度から最終年度の一人当たり給与伸び率' },
  { tag: '{給与CAGR}', desc: '一人当たり給与の年平均成長率（%）' },
];

/**
 * 自動調整（Solver）候補変数 & 説明文テンプレート管理コンポーネント (STEP D-5)
 * 逆算ソルバーが試行する変数・範囲と、申請書用説明文テンプレートを管理します。
 */
export const SolverNarrativeAdmin: React.FC<SolverNarrativeAdminProps> = ({
  canEdit,
  solverCandidates,
  narrativeTemplates,
  onUpdateSolverCandidates,
  onUpdateNarrativeTemplates,
  onNotify,
}) => {
  // 新規候補変数追加フォームステート
  const [newSelectedKey, setNewSelectedKey] = useState('existingGrowthRate');
  const [newLabel, setNewLabel] = useState('既存事業 売上成長率(%)');
  const [newMin, setNewMin] = useState(0);
  const [newMax, setNewMax] = useState(15);
  const [newStep, setNewStep] = useState(0.1);
  const [newAffects, setNewAffects] = useState<'valueAdded' | 'wage'>('valueAdded');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleKeySelectChange = (key: string) => {
    setNewSelectedKey(key);
    const item = SIMULATION_NUMERIC_KEYS.find((k) => k.key === key);
    if (item) {
      setNewLabel(item.label);
      setNewAffects(item.affects);
    }
  };

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSelectedKey) return;

    const newCandidate: SolverCandidate = {
      key: newSelectedKey,
      label: newLabel || newSelectedKey,
      min: Number(newMin),
      max: Number(newMax),
      step: Number(newStep),
      affects: newAffects,
    };

    onUpdateSolverCandidates([...solverCandidates, newCandidate]);
  };

  const handleDeleteCandidate = (index: number) => {
    const next = solverCandidates.filter((_, idx) => idx !== index);
    onUpdateSolverCandidates(next);
  };

  const handleUpdateCandidate = (index: number, updates: Partial<SolverCandidate>) => {
    const next = solverCandidates.map((c, idx) => (idx === index ? { ...c, ...updates } : c));
    onUpdateSolverCandidates(next);
  };

  const handleTemplateChange = (id: 'valueAdded' | 'wage', newText: string) => {
    const next = narrativeTemplates.map((t) => (t.id === id ? { ...t, template: newText } : t));
    onUpdateNarrativeTemplates(next);
  };

  const copyToClipboard = (tag: string) => {
    navigator.clipboard?.writeText(tag);
    setCopiedTag(tag);
    onNotify?.(`タグ「${tag}」をクリップボードにコピーしました。`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 p-5 space-y-8">
      {/* サブヘッダー */}
      <div className="border-b border-slate-200 pb-3">
        <h3 className="text-sm font-bold text-slate-900">
          自動調整（ソルバー）候補変数 & 説明文テンプレート設定 (STEP C 連携)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          要件達成に向けた数値自動逆算（Solver）の試行対象変数・下限・上限・刻みと、申請書用説明文の自動生成ひな形を設定します。
        </p>
      </div>

      {/* 1. 自動調整（Solver）候補変数テーブル */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>逆算ソルバー（自動調整）の試行対象パラメータ一覧</span>
          </h4>
          <span className="text-xs text-slate-500">
            登録件数: <span className="font-bold text-slate-700">{solverCandidates.length}</span> 件
          </span>
        </div>

        {/* 新規パラメータ追加フォーム */}
        {canEdit && (
          <form onSubmit={handleAddCandidate} className="bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>試行対象パラメータの追加</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              <div className="lg:col-span-2">
                <label className="text-[11px] text-slate-600 block mb-1">
                  対象項目 (PlanSimulation) *
                </label>
                <select
                  value={newSelectedKey}
                  onChange={(e) => handleKeySelectChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-medium"
                >
                  {SIMULATION_NUMERIC_KEYS.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label} ({k.key})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">下限値 (min) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={newMin}
                  onChange={(e) => setNewMin(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs text-right font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">上限値 (max) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={newMax}
                  onChange={(e) => setNewMax(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs text-right font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">刻み幅 (step) *</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={newStep}
                  onChange={(e) => setNewStep(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs text-right font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">影響する指標 *</label>
                <select
                  value={newAffects}
                  onChange={(e) => setNewAffects(e.target.value as 'valueAdded' | 'wage')}
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-medium"
                >
                  <option value="valueAdded">付加価値額</option>
                  <option value="wage">一人当たり給与</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-3.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>候補パラメータを追加</span>
              </button>
            </div>
          </form>
        )}

        {/* テーブル一覧 */}
        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2.5 px-3">項目名 (ラベル)</th>
                <th className="py-2.5 px-3 font-mono">変数キー (key)</th>
                <th className="py-2.5 px-3 w-28 text-right">下限 (min)</th>
                <th className="py-2.5 px-3 w-28 text-right">上限 (max)</th>
                <th className="py-2.5 px-3 w-28 text-right">刻み (step)</th>
                <th className="py-2.5 px-3 w-28 text-center">対象指標</th>
                {canEdit && <th className="py-2.5 px-3 w-16 text-center">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {solverCandidates.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 7 : 6}
                    className="py-8 text-center text-slate-400 bg-slate-50/50"
                  >
                    登録されている候補変数がありません。
                  </td>
                </tr>
              ) : (
                solverCandidates.map((cand, idx) => (
                  <tr key={`${cand.key}-${idx}`} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      {canEdit ? (
                        <input
                          type="text"
                          defaultValue={cand.label}
                          onBlur={(e) =>
                            handleUpdateCandidate(idx, { label: e.target.value.trim() })
                          }
                          className="w-full bg-white border border-slate-300 px-2 py-0.5 text-xs font-semibold"
                        />
                      ) : (
                        <span className="font-semibold text-slate-800">{cand.label}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">{cand.key}</td>
                    <td className="py-2 px-3 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          step="any"
                          defaultValue={cand.min}
                          onBlur={(e) =>
                            handleUpdateCandidate(idx, { min: Number(e.target.value) || 0 })
                          }
                          className="w-20 bg-white border border-slate-300 px-1.5 py-0.5 text-xs text-right font-mono"
                        />
                      ) : (
                        <span className="font-mono">{cand.min}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          step="any"
                          defaultValue={cand.max}
                          onBlur={(e) =>
                            handleUpdateCandidate(idx, { max: Number(e.target.value) || 0 })
                          }
                          className="w-20 bg-white border border-slate-300 px-1.5 py-0.5 text-xs text-right font-mono"
                        />
                      ) : (
                        <span className="font-mono">{cand.max}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {canEdit ? (
                        <input
                          type="number"
                          step="any"
                          defaultValue={cand.step}
                          onBlur={(e) =>
                            handleUpdateCandidate(idx, { step: Number(e.target.value) || 0.1 })
                          }
                          className="w-20 bg-white border border-slate-300 px-1.5 py-0.5 text-xs text-right font-mono"
                        />
                      ) : (
                        <span className="font-mono">{cand.step}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold ${
                          cand.affects === 'valueAdded'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {cand.affects === 'valueAdded' ? '付加価値額' : '一人当たり給与'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteCandidate(idx)}
                          title="削除"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. 説明文テンプレート設定 & タグ一覧 */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>申請書用 算出根拠説明文テンプレートの編集</span>
        </h4>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側 2カラム: テキストエリア編集 */}
          <div className="lg:col-span-2 space-y-4">
            {narrativeTemplates.map((item) => (
              <div key={item.id} className="border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">
                    {item.title} ({item.id})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {item.id === 'valueAdded' ? '付加価値額CAGR根拠' : '給与CAGR・伸び率根拠'}
                  </span>
                </div>
                <textarea
                  disabled={!canEdit}
                  rows={4}
                  value={item.template}
                  onChange={(e) => handleTemplateChange(item.id, e.target.value)}
                  placeholder="テンプレートを入力してください。{基準年度}などのタグが利用できます。"
                  className="w-full bg-white border border-slate-300 p-2 text-xs font-mono leading-relaxed focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>
            ))}
          </div>

          {/* 右側 1カラム: 利用可能なタグ一覧 */}
          <div className="border border-slate-200 p-4 bg-slate-50 space-y-3 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>利用可能な差し込みタグ一覧</span>
            </div>
            <p className="text-[11px] text-slate-500">
              クリックするとタグがコピーされます。テンプレート本文に貼り付けて使用してください。
            </p>
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {AVAILABLE_TAGS.map(({ tag, desc }) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => copyToClipboard(tag)}
                  className="w-full text-left p-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-colors group flex items-start justify-between gap-2"
                >
                  <div>
                    <span className="font-mono font-bold text-blue-700 text-[11px] block">
                      {tag}
                    </span>
                    <span className="text-slate-500 text-[10px] block mt-0.5">{desc}</span>
                  </div>
                  <span className="p-1 text-slate-400 group-hover:text-blue-600 shrink-0">
                    {copiedTag === tag ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

