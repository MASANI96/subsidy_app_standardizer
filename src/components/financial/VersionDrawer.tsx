import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  GitCompare,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {
  DisplayCurrencyUnit,
  PlanVersion,
  RoundingMode,
} from '../../types';
import { formatMoney } from '../../utils/financialCalculations';

interface VersionDrawerProps {
  open: boolean;
  onClose: () => void;
  versions: PlanVersion[];
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  isLocked: boolean;
  canEdit: boolean;
  onRestoreVersion: (versionId: string) => void;
  onSaveVersion: (name: string, memo: string) => void;
  onDeleteVersion: (versionId: string) => void;
}

export const VersionDrawer: React.FC<VersionDrawerProps> = ({
  open,
  onClose,
  versions,
  displayCurrencyUnit,
  roundingMode,
  isLocked,
  canEdit,
  onRestoreVersion,
  onSaveVersion,
  onDeleteVersion,
}) => {
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');

  if (!open) return null;

  const disabled = isLocked || !canEdit;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    onSaveVersion(name || '新規保存案', memo || '画面から保存した比較案');
    setName('');
    setMemo('');
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-slate-900/45"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-blue-300" />
            <div>
              <h3 className="text-sm font-bold">計画保存版の管理・比較</h3>
              <p className="text-[11px] text-slate-300">
                標準案・強気案・保守案の切り替えと新規スナップショット保存
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* 現在の計画を新規保存 */}
          <form
            onSubmit={handleSave}
            className="bg-slate-50 border border-slate-200 p-4 space-y-2.5"
          >
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>現在のシミュレーション状態を新しい版として保存</span>
            </div>
            <input
              type="text"
              placeholder="版の名前（例：クライアント打合せ後修正案）"
              disabled={disabled}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="メモ（例：月間数量8件・賃上げ6.2%調整）"
              disabled={disabled}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-white border border-slate-300 px-2.5 py-1.5 text-xs"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={disabled}
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                現在のシミュレーションを保存
              </button>
            </div>
          </form>

          {/* 登録済みバージョン一覧 */}
          <div className="space-y-3">
            <div className="font-bold text-slate-800">
              登録済みバージョン一覧（{versions.length}件）
            </div>

            {versions.map((v) => (
              <div
                key={v.id}
                className={`border p-3.5 space-y-2.5 ${
                  v.summarySnapshot.isAllPassed
                    ? 'border-slate-200 bg-white'
                    : 'border-rose-200 bg-rose-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{v.name}</span>
                      {v.isPreset && (
                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-semibold">
                          サンプル版
                        </span>
                      )}
                      {v.summarySnapshot.isAllPassed ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          全要件達成
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 border border-rose-300 text-rose-800 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          要件未達あり
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{v.memo}</p>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      保存日時: {v.createdAt}
                    </div>
                  </div>
                </div>

                {/* 主要KPI比較 */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 p-2 text-[11px]">
                  <div>
                    <div className="text-slate-500">付加価値CAGR</div>
                    <div className="font-mono font-bold text-slate-900">
                      {v.summarySnapshot.vaCAGR.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">給与CAGR</div>
                    <div
                      className={`font-mono font-bold ${
                        v.summarySnapshot.isAllPassed ? 'text-slate-900' : 'text-rose-700'
                      }`}
                    >
                      {v.summarySnapshot.wageCAGR.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">最終年 補助事業売上</div>
                    <div className="font-mono font-bold text-blue-900">
                      {formatMoney(
                        v.summarySnapshot.subsidySalesTargetYen,
                        displayCurrencyUnit,
                        roundingMode
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {!v.isPreset ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onDeleteVersion(v.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      削除
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      プリセット比較版
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRestoreVersion(v.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>この版を読み込む</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
