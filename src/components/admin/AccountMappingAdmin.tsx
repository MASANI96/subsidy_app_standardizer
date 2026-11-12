import React, { useMemo, useState } from 'react';
import { Plus, Search, Trash2, Building2, BookOpen } from 'lucide-react';
import { AccountMappingAction, AccountMappingRule, Project } from '../../types';
import { FORMAT_TARGET_OPTIONS } from '../FinancialStatementImportView';

interface AccountMappingAdminProps {
  canEdit: boolean;
  projects: Project[];
  standardAccountMappings: AccountMappingRule[];
  companyAccountMappings: Record<string, AccountMappingRule[]>;
  onAddStandardMappingRule: (rule: Omit<AccountMappingRule, 'id'>) => void;
  onUpdateStandardMappingRule: (id: string, updates: Partial<AccountMappingRule>) => void;
  onDeleteStandardMappingRule: (id: string) => void;
  onAddCompanyMappingRule: (companyId: string, rule: Omit<AccountMappingRule, 'id'>) => void;
  onUpdateCompanyMappingRule: (
    companyId: string,
    id: string,
    updates: Partial<AccountMappingRule>
  ) => void;
  onDeleteCompanyMappingRule: (companyId: string, id: string) => void;
}

/**
 * 科目対応表管理コンポーネント (STEP D-2)
 * 標準科目対応表および企業別科目対応表の一覧・検索・追加・編集・削除を提供します。
 */
export const AccountMappingAdmin: React.FC<AccountMappingAdminProps> = ({
  canEdit,
  projects,
  standardAccountMappings,
  companyAccountMappings,
  onAddStandardMappingRule,
  onUpdateStandardMappingRule,
  onDeleteStandardMappingRule,
  onAddCompanyMappingRule,
  onUpdateCompanyMappingRule,
  onDeleteCompanyMappingRule,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'standard' | 'company'>('standard');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || ''
  );
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 新規追加用フォーム入力ステート
  const [newSourceAccountName, setNewSourceAccountName] = useState('');
  const [newAction, setNewAction] = useState<AccountMappingAction>('map');
  const [newTargetFieldKey, setNewTargetFieldKey] = useState('laborCost');
  const [newNote, setNewNote] = useState('');
  const [newIsTentative, setNewIsTentative] = useState(false);

  // 選択中の会社
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) ?? projects[0];
  }, [projects, selectedProjectId]);

  const companyId = selectedProject?.id || '';

  // 表示対象のルール一覧
  const currentRules = useMemo(() => {
    if (activeSubTab === 'standard') {
      return standardAccountMappings;
    }
    return companyAccountMappings[companyId] || [];
  }, [activeSubTab, standardAccountMappings, companyAccountMappings, companyId]);

  // 検索フィルタ
  const filteredRules = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return currentRules;
    return currentRules.filter((r) =>
      r.sourceAccountName.toLowerCase().includes(kw) ||
      r.targetFieldLabel.toLowerCase().includes(kw) ||
      (r.note && r.note.toLowerCase().includes(kw))
    );
  }, [currentRules, searchKeyword]);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceAccountName.trim()) return;

    const targetOpt = FORMAT_TARGET_OPTIONS.find((o) => o.key === newTargetFieldKey);
    const targetLabel = newAction === 'exclude' ? '除外' : (targetOpt?.label || newTargetFieldKey);

    const ruleData: Omit<AccountMappingRule, 'id'> = {
      sourceAccountName: newSourceAccountName.trim(),
      action: newAction,
      targetFieldKey: newAction === 'exclude' ? '' : newTargetFieldKey,
      targetFieldLabel: targetLabel,
      scope: activeSubTab,
      note: newNote.trim(),
      isTentative: newIsTentative,
      companyId: activeSubTab === 'company' ? companyId : undefined,
    };

    if (activeSubTab === 'standard') {
      onAddStandardMappingRule(ruleData);
    } else {
      if (!companyId) return;
      onAddCompanyMappingRule(companyId, ruleData);
    }

    setNewSourceAccountName('');
    setNewNote('');
    setNewIsTentative(false);
  };

  return (
    <div className="bg-white border border-slate-200 p-5 space-y-6">
      {/* サブヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">決算書 科目対応表マスター管理</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            PDF等から抽出された決算書科目を公式フォーマット項目に自動変換・合算・除外するためのマッピング定義です。
          </p>
        </div>

        {/* 表切り替え（標準 / 会社別） */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('standard')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-colors ${
              activeSubTab === 'standard'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>標準対応表（共通）</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('company')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-colors ${
              activeSubTab === 'company'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>会社別対応表</span>
          </button>
        </div>
      </div>

      {/* 会社セレクタ（会社別対応表の時のみ） */}
      {activeSubTab === 'company' && (
        <div className="flex items-center gap-3 bg-blue-50/60 border border-blue-200 p-3 text-xs">
          <label htmlFor="company-select" className="font-bold text-blue-950">
            対象会社（案件）の選択:
          </label>
          <select
            id="company-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-white border border-blue-300 text-blue-900 font-semibold px-3 py-1.5 min-w-[240px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.companyName} ({p.code})
              </option>
            ))}
          </select>
          <span className="text-slate-500 text-[11px]">
            ※ その会社特有の決算書勘定科目（特殊な合算・除外）の対応ルールを設定します。
          </span>
        </div>
      )}

      {/* ツールバー：検索 & 登録件数 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="科目名・対応先・メモで検索..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          />
        </div>
        <div className="text-xs text-slate-500">
          登録件数: <span className="font-bold text-slate-700">{filteredRules.length}</span> 件
          {searchKeyword && ` (全${currentRules.length}件中)`}
        </div>
      </div>

      {/* 新規追加フォーム（管理者のみ） */}
      {canEdit && (
        <form onSubmit={handleAddRule} className="bg-slate-50 border border-slate-200 p-3.5 space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>新規対応ルールの登録</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 text-xs">
            <div className="lg:col-span-2">
              <label className="text-[11px] text-slate-600 block mb-1">決算書の科目名 *</label>
              <input
                type="text"
                required
                value={newSourceAccountName}
                onChange={(e) => setNewSourceAccountName(e.target.value)}
                placeholder="例: 給料手当, 減価償却費"
                className="w-full bg-white border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">処理 *</label>
              <select
                value={newAction}
                onChange={(e) => setNewAction(e.target.value as AccountMappingAction)}
                className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-medium"
              >
                <option value="map">対応（そのまま代入）</option>
                <option value="aggregate">合算（加算集計）</option>
                <option value="exclude">除外（対象外）</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="text-[11px] text-slate-600 block mb-1">対応先の項目</label>
              <select
                disabled={newAction === 'exclude'}
                value={newTargetFieldKey}
                onChange={(e) => setNewTargetFieldKey(e.target.value)}
                className="w-full bg-white border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-400"
              >
                <optgroup label="損益計算書 (PL)">
                  {FORMAT_TARGET_OPTIONS.filter((o) => o.category.includes('PL')).map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label} ({o.key})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="貸借対照表 (BS)">
                  {FORMAT_TARGET_OPTIONS.filter((o) => o.category.includes('BS')).map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label} ({o.key})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">メモ</label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="補足や根拠"
                className="w-full bg-white border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsTentative}
                onChange={(e) => setNewIsTentative(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>仮の値として登録（「仮」バッジを表示）</span>
            </label>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ルールを追加</span>
            </button>
          </div>
        </form>
      )}

      {/* ルール一覧テーブル */}
      <div className="overflow-x-auto border border-slate-200">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <th className="py-2.5 px-3 min-w-[140px]">決算書の科目名</th>
              <th className="py-2.5 px-3 w-32">処理</th>
              <th className="py-2.5 px-3 min-w-[200px]">対応先の項目</th>
              <th className="py-2.5 px-3 min-w-[160px]">メモ</th>
              <th className="py-2.5 px-3 w-16 text-center">仮</th>
              {canEdit && <th className="py-2.5 px-3 w-16 text-center">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRules.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="py-8 text-center text-slate-400 bg-slate-50/50"
                >
                  登録されている対応ルールがありません。
                </td>
              </tr>
            ) : (
              filteredRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                  {/* 科目名 */}
                  <td className="py-2 px-3">
                    {canEdit ? (
                      <input
                        type="text"
                        defaultValue={rule.sourceAccountName}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val && val !== rule.sourceAccountName) {
                            if (activeSubTab === 'standard') {
                              onUpdateStandardMappingRule(rule.id, { sourceAccountName: val });
                            } else {
                              onUpdateCompanyMappingRule(companyId, rule.id, {
                                sourceAccountName: val,
                              });
                            }
                          }
                        }}
                        className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-800"
                      />
                    ) : (
                      <span className="font-semibold text-slate-800">
                        {rule.sourceAccountName}
                      </span>
                    )}
                  </td>

                  {/* 処理 */}
                  <td className="py-2 px-3">
                    {canEdit ? (
                      <select
                        value={rule.action}
                        onChange={(e) => {
                          const action = e.target.value as AccountMappingAction;
                          const targetLabel =
                            action === 'exclude'
                              ? '除外'
                              : FORMAT_TARGET_OPTIONS.find(
                                  (o) => o.key === rule.targetFieldKey
                                )?.label || rule.targetFieldKey;
                          const updates: Partial<AccountMappingRule> = {
                            action,
                            targetFieldLabel: targetLabel,
                          };
                          if (activeSubTab === 'standard') {
                            onUpdateStandardMappingRule(rule.id, updates);
                          } else {
                            onUpdateCompanyMappingRule(companyId, rule.id, updates);
                          }
                        }}
                        className="w-full bg-white border border-slate-300 px-1.5 py-1 text-xs"
                      >
                        <option value="map">対応</option>
                        <option value="aggregate">合算</option>
                        <option value="exclude">除外</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[11px] font-bold ${
                          rule.action === 'map'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : rule.action === 'aggregate'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {rule.action === 'map'
                          ? '対応'
                          : rule.action === 'aggregate'
                          ? '合算'
                          : '除外'}
                      </span>
                    )}
                  </td>

                  {/* 対応先の項目 */}
                  <td className="py-2 px-3">
                    {rule.action === 'exclude' ? (
                      <span className="text-slate-400 italic text-[11px]">（対象外・読捨）</span>
                    ) : canEdit ? (
                      <select
                        value={rule.targetFieldKey}
                        onChange={(e) => {
                          const key = e.target.value;
                          const opt = FORMAT_TARGET_OPTIONS.find((o) => o.key === key);
                          const updates = {
                            targetFieldKey: key,
                            targetFieldLabel: opt?.label || key,
                          };
                          if (activeSubTab === 'standard') {
                            onUpdateStandardMappingRule(rule.id, updates);
                          } else {
                            onUpdateCompanyMappingRule(companyId, rule.id, updates);
                          }
                        }}
                        className="w-full bg-white border border-slate-300 px-1.5 py-1 text-xs"
                      >
                        <optgroup label="損益計算書 (PL)">
                          {FORMAT_TARGET_OPTIONS.filter((o) =>
                            o.category.includes('PL')
                          ).map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label} ({o.key})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="貸借対照表 (BS)">
                          {FORMAT_TARGET_OPTIONS.filter((o) =>
                            o.category.includes('BS')
                          ).map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label} ({o.key})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    ) : (
                      <span className="text-slate-700 font-medium">
                        {rule.targetFieldLabel}
                        <span className="text-slate-400 text-[10px] ml-1">
                          ({rule.targetFieldKey})
                        </span>
                      </span>
                    )}
                  </td>

                  {/* メモ */}
                  <td className="py-2 px-3">
                    {canEdit ? (
                      <input
                        type="text"
                        defaultValue={rule.note || ''}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== (rule.note || '')) {
                            if (activeSubTab === 'standard') {
                              onUpdateStandardMappingRule(rule.id, { note: val });
                            } else {
                              onUpdateCompanyMappingRule(companyId, rule.id, { note: val });
                            }
                          }
                        }}
                        placeholder="メモ..."
                        className="w-full bg-white border border-slate-300 px-2 py-1 text-xs"
                      />
                    ) : (
                      <span className="text-slate-600">{rule.note || '-'}</span>
                    )}
                  </td>

                  {/* 仮 */}
                  <td className="py-2 px-3 text-center">
                    {canEdit ? (
                      <input
                        type="checkbox"
                        checked={!!rule.isTentative}
                        onChange={(e) => {
                          const isTentative = e.target.checked;
                          if (activeSubTab === 'standard') {
                            onUpdateStandardMappingRule(rule.id, { isTentative });
                          } else {
                            onUpdateCompanyMappingRule(companyId, rule.id, { isTentative });
                          }
                        }}
                        className="rounded border-slate-300 cursor-pointer"
                      />
                    ) : rule.isTentative ? (
                      <span className="inline-block text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                        仮
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  {/* 操作（削除） */}
                  {canEdit && (
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`「${rule.sourceAccountName}」の対応ルールを削除しますか？`)) {
                            if (activeSubTab === 'standard') {
                              onDeleteStandardMappingRule(rule.id);
                            } else {
                              onDeleteCompanyMappingRule(companyId, rule.id);
                            }
                          }
                        }}
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
  );
};

