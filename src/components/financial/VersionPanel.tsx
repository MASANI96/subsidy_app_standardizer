/**
 * 収支計画 版管理ドロワーパネル (VersionPanel.tsx)
 * 【STEP C準拠】
 * 収支計画のスナップショット保存・一覧表示・2版間の差分表示・復元・削除を行う右ドロワーコンポーネント。
 */

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  GitCompare,
  History,
  RotateCcw,
  Save,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  PlanSnapshot,
  PlanVersion,
  ProjectFinancialMaster,
  SubsidyRequirements,
  SubsidyTrack,
} from '../../types';
import { diffSnapshots } from '../../utils/diff';
import { evaluateRequirements } from '../../utils/financialCalculations';

interface VersionPanelProps {
  isOpen: boolean;
  onClose(): void;
  fm: ProjectFinancialMaster;
  track: SubsidyTrack;
  requirements: SubsidyRequirements;
  disabled: boolean;
  onSaveVersion(name: string, memo: string): void;
  onRestoreVersion(versionId: string): void;
  onDeleteVersion(versionId: string): void;
  onNotify(msg: string): void;
}

export const VersionPanel: React.FC<VersionPanelProps> = ({
  isOpen,
  onClose,
  fm,
  track,
  requirements,
  disabled,
  onSaveVersion,
  onRestoreVersion,
  onDeleteVersion,
  onNotify,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [memoInput, setMemoInput] = useState('');
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);
  const [showDiffView, setShowDiffView] = useState(false);

  // 保存処理
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      alert('版の名前を入力してください。');
      return;
    }
    onSaveVersion(nameInput.trim(), memoInput.trim());
    setNameInput('');
    setMemoInput('');
    onNotify('現在の収支計画を新しい版として保存しました。');
  };

  // 選択チェック切り替え（最大2つまで）
  const handleToggleSelect = (id: string) => {
    if (selectedVersionIds.includes(id)) {
      setSelectedVersionIds(selectedVersionIds.filter((vId) => vId !== id));
      setShowDiffView(false);
    } else {
      if (selectedVersionIds.length >= 2) {
        // すでに2つ選ばれている場合は先頭を抜いて追加
        setSelectedVersionIds([selectedVersionIds[1], id]);
      } else {
        setSelectedVersionIds([...selectedVersionIds, id]);
      }
    }
  };

  // 復元処理
  const handleRestore = (ver: PlanVersion) => {
    if (disabled) return;
    const ok = window.confirm(
      `本当にこの版「${ver.name}」の状態に戻しますか？\n現在の数値は上書きされます（保存済みの版一覧は保持されます）。`
    );
    if (ok) {
      onRestoreVersion(ver.id);
      onNotify(`「${ver.name}」の内容に復元しました。`);
      onClose();
    }
  };

  // 削除処理
  const handleDelete = (ver: PlanVersion) => {
    const ok = window.confirm(`版「${ver.name}」を削除してもよろしいですか？`);
    if (ok) {
      onDeleteVersion(ver.id);
      setSelectedVersionIds((prev) => prev.filter((id) => id !== ver.id));
      onNotify(`版「${ver.name}」を削除しました。`);
    }
  };

  // 各版の評価値キャッシュ
  const evaluatedVersions = useMemo(() => {
    return (fm.planVersions || []).map((ver) => {
      const snap = ver.snapshot;
      // スナップショット用の擬似 fm を作成して evaluateRequirements
      const pseudoFM: ProjectFinancialMaster = {
        ...fm,
        periods: snap.periods,
        simulation: snap.simulation,
        investment: snap.investment,
        planningYears: snap.planningYears,
        appliedTrackId: snap.appliedTrackId,
        isWageSpecialApplied: snap.isWageSpecialApplied,
        employeeCountMethod: snap.employeeCountMethod,
        fiscalMonth: snap.fiscalMonth,
      };
      const evalRes = evaluateRequirements(pseudoFM, track, requirements);
      return {
        ...ver,
        evalRes,
      };
    });
  }, [fm, track, requirements]);

  // 2つの版の差分データ
  const diffData = useMemo(() => {
    if (selectedVersionIds.length !== 2) return null;
    const verA = (fm.planVersions || []).find((v) => v.id === selectedVersionIds[0]);
    const verB = (fm.planVersions || []).find((v) => v.id === selectedVersionIds[1]);
    if (!verA || !verB) return null;

    const evalA = evaluateRequirements(
      { ...fm, ...verA.snapshot } as ProjectFinancialMaster,
      track,
      requirements
    );
    const evalB = evaluateRequirements(
      { ...fm, ...verB.snapshot } as ProjectFinancialMaster,
      track,
      requirements
    );

    const diffs = diffSnapshots(verA.snapshot, verB.snapshot);

    return {
      verA,
      verB,
      evalA,
      evalB,
      diffs,
    };
  }, [selectedVersionIds, fm, track, requirements]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col border-l border-slate-300">
        {/* ヘッダー */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">収支計画 版管理（バージョン）</h3>
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-xs">
              {fm.planVersions?.length || 0}件
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer rounded-xs"
            title="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ボディ */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* 1. 現在の内容を新しい版として保存 */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-2.5">
              <Save className="w-4 h-4 text-blue-600" />
              <span>現在の収支計画を版として保存</span>
            </h4>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  版の名前 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 初期シミュレーション案、賃上げ5%調整版"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-xs font-medium text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  メモ・改訂理由（任意）
                </label>
                <textarea
                  rows={2}
                  placeholder="例: 設備台数を1台増設し、付加価値CAGRを4.5%まで引き上げた状態"
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-xs text-xs focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xs transition-colors cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>この内容で版を保存</span>
                </button>
              </div>
            </form>
          </div>

          {/* 2. 差分比較バー（2つ選択時） */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xs">
            <div className="flex items-center gap-2 text-blue-900">
              <GitCompare className="w-4 h-4 text-blue-600" />
              <span>
                差分比較用選択: <strong>{selectedVersionIds.length} / 2</strong> 件選択中
              </span>
            </div>
            {selectedVersionIds.length === 2 ? (
              <button
                type="button"
                onClick={() => setShowDiffView(!showDiffView)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xs transition-colors cursor-pointer"
              >
                {showDiffView ? '差分表示を閉じる' : '2版の差分を表示'}
              </button>
            ) : (
              <span className="text-[11px] text-blue-700">
                （比較したい版を一覧から2つ選んでください）
              </span>
            )}
          </div>

          {/* 3. 差分表示ビュー（表示フラグON時） */}
          {showDiffView && diffData && (
            <div className="border-2 border-blue-400 bg-white p-4 rounded-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-blue-600" />
                  <span>版の差分比較</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDiffView(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕ 閉じる
                </button>
              </div>

              {/* 両版の要件判定比較テーブル */}
              <div>
                <div className="font-bold text-slate-800 mb-1.5">公募要件判定の比較：</div>
                <table className="w-full border-collapse border border-slate-200 text-left">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-2 border border-slate-200">判定項目</th>
                      <th className="p-2 border border-slate-200 text-blue-900">
                        版A: {diffData.verA.name}
                      </th>
                      <th className="p-2 border border-slate-200 text-emerald-900">
                        版B: {diffData.verB.name}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium">付加価値額CAGR</td>
                      <td className="p-2 border border-slate-200 font-mono">
                        {diffData.evalA.vaCAGR.toFixed(2)}%{' '}
                        {diffData.evalA.isVAPassed ? (
                          <span className="text-emerald-700 font-bold ml-1">○ 達成</span>
                        ) : (
                          <span className="text-rose-700 font-bold ml-1">× 未達</span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono">
                        {diffData.evalB.vaCAGR.toFixed(2)}%{' '}
                        {diffData.evalB.isVAPassed ? (
                          <span className="text-emerald-700 font-bold ml-1">○ 達成</span>
                        ) : (
                          <span className="text-rose-700 font-bold ml-1">× 未達</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium">一人当たり給与CAGR</td>
                      <td className="p-2 border border-slate-200 font-mono">
                        {diffData.evalA.wageCAGR.toFixed(2)}%{' '}
                        {diffData.evalA.isWagePassed ? (
                          <span className="text-emerald-700 font-bold ml-1">○ 達成</span>
                        ) : (
                          <span className="text-rose-700 font-bold ml-1">× 未達</span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono">
                        {diffData.evalB.wageCAGR.toFixed(2)}%{' '}
                        {diffData.evalB.isWagePassed ? (
                          <span className="text-emerald-700 font-bold ml-1">○ 達成</span>
                        ) : (
                          <span className="text-rose-700 font-bold ml-1">× 未達</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-200 font-medium">事業場内最低賃金差額</td>
                      <td className="p-2 border border-slate-200 font-mono">
                        +{diffData.evalA.minWageDiff}円{' '}
                        {diffData.evalA.isMinWagePassed ? (
                          <span className="text-emerald-700 font-bold ml-1">○ クリア</span>
                        ) : (
                          <span className="text-rose-700 font-bold ml-1">× 未達</span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono">
                        +{diffData.evalB.minWageDiff}円{' '}
                        {diffData.evalB.isMinWagePassed ? (
                          <span className="text-emerald-700 font-bold ml-1">○ クリア</span>
                        ) : (
                          <span className="text-rose-700 font-bold ml-1">× 未達</span>
                        )}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-2 border border-slate-200">総合判定結果</td>
                      <td className="p-2 border border-slate-200">
                        {diffData.evalA.isAllPassed ? (
                          <span className="text-emerald-700">全要件適合</span>
                        ) : (
                          <span className="text-rose-700">要件未達あり</span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-200">
                        {diffData.evalB.isAllPassed ? (
                          <span className="text-emerald-700">全要件適合</span>
                        ) : (
                          <span className="text-rose-700">要件未達あり</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* diffSnapshots 差分テーブル */}
              <div>
                <div className="font-bold text-slate-800 mb-1.5">
                  変更箇所一覧（全{diffData.diffs.length}件の差分・変更行は黄色表示）：
                </div>
                {diffData.diffs.length === 0 ? (
                  <div className="text-slate-500 py-3 text-center bg-slate-50 border border-slate-200">
                    2つの版の数値・前提値に差分はありません。
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-slate-200">
                    <table className="w-full border-collapse text-left">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0">
                        <tr>
                          <th className="py-1.5 px-2 border-b border-slate-200">項目パス</th>
                          <th className="py-1.5 px-2 border-b border-slate-200 text-right">
                            版A: {diffData.verA.name}
                          </th>
                          <th className="py-1.5 px-2 border-b border-slate-200 text-center w-6"></th>
                          <th className="py-1.5 px-2 border-b border-slate-200 text-right">
                            版B: {diffData.verB.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffData.diffs.map((d) => (
                          <tr
                            key={d.path}
                            className="bg-amber-50/70 border-b border-amber-200/60 hover:bg-amber-100/50"
                          >
                            <td className="py-1.5 px-2 font-mono text-[11px] text-slate-800 break-all">
                              {d.path}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                              {String(d.before)}
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-400">
                              <ArrowRight className="w-3 h-3 inline" />
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-blue-800">
                              {String(d.after)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. 版の一覧（新しい順） */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center justify-between">
              <span>保存された版の一覧（新しい順）</span>
              <span className="text-[11px] text-slate-500 font-normal">
                ※2つチェックすると差分を比較できます
              </span>
            </h4>

            {evaluatedVersions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 bg-slate-50 border border-slate-200 rounded-xs">
                保存された版はまだありません。現在の計画を上部のフォームから保存してください。
              </div>
            ) : (
              <div className="space-y-2.5">
                {evaluatedVersions.map((ver) => {
                  const isSelected = selectedVersionIds.includes(ver.id);
                  return (
                    <div
                      key={ver.id}
                      className={`p-3.5 border transition-all rounded-xs ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(ver.id)}
                            className="w-4 h-4 text-blue-600 rounded-xs mt-0.5 cursor-pointer"
                            title="差分比較用に選択"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{ver.name}</span>
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {ver.createdAt}
                              </span>
                            </div>

                            {ver.memo && (
                              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                {ver.memo}
                              </p>
                            )}

                            {/* 指標算出結果サマリー */}
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]">
                              <span className="bg-slate-100 px-2 py-0.5 border border-slate-200">
                                付加価値CAGR:{' '}
                                <strong className="font-mono text-blue-800">
                                  {ver.evalRes.vaCAGR.toFixed(1)}%
                                </strong>{' '}
                                ({ver.evalRes.isVAPassed ? '○' : '×'})
                              </span>
                              <span className="bg-slate-100 px-2 py-0.5 border border-slate-200">
                                給与CAGR:{' '}
                                <strong className="font-mono text-emerald-800">
                                  {ver.evalRes.wageCAGR.toFixed(1)}%
                                </strong>{' '}
                                ({ver.evalRes.isWagePassed ? '○' : '×'})
                              </span>
                              <span className="bg-slate-100 px-2 py-0.5 border border-slate-200">
                                総合:{' '}
                                {ver.evalRes.isAllPassed ? (
                                  <strong className="text-emerald-700">適合</strong>
                                ) : (
                                  <strong className="text-rose-700">未達</strong>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleRestore(ver)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xs transition-colors cursor-pointer"
                            title="現在の収支計画をこの版に戻す"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>復元</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ver)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-xs"
                            title="この版を削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

