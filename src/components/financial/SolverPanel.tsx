/**
 * 逆算（自動調整）ソルバーパネル (SolverPanel.tsx)
 * 【STEP C準拠】
 * 目標値に合わせて前提値の自動調整（逆算）を行うコンポーネント。
 * ピン留め中の項目は固定され、調整結果をモーダルでプレビュー・適用できる。
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Pin,
  Sliders,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  PlanSimulation,
  ProjectFinancialMaster,
  SolverCandidate,
  SubsidyRequirements,
  SubsidyTrack,
} from '../../types';
import { SolveResult, solveToTarget } from '../../utils/solver';

interface SolverPanelProps {
  fm: ProjectFinancialMaster;
  solverCandidates: SolverCandidate[];
  track: SubsidyTrack;
  requirements: SubsidyRequirements;
  disabled: boolean;
  onUpdateSolverTargets(
    targets: { key: string; min: number; max: number; step: number }[]
  ): void;
  onApplySolverResult(simulation: PlanSimulation): void;
  onNotify(msg: string): void;
}

export const SolverPanel: React.FC<SolverPanelProps> = ({
  fm,
  solverCandidates,
  track,
  requirements,
  disabled,
  onUpdateSolverTargets,
  onApplySolverResult,
  onNotify,
}) => {
  const [modalResult, setModalResult] = useState<SolveResult | null>(null);

  const sim = fm.simulation;
  const isEnabled = sim.enabled;
  const pinnedKeys = sim.pinnedKeys || [];
  const currentTargets = sim.solverTargets || [];

  // 目標値（ほどよく範囲の中央値）
  const vaTarget =
    (requirements.moderateRanges.valueAddedCAGR.min +
      requirements.moderateRanges.valueAddedCAGR.max) /
    2;
  const wageRange = fm.isWageSpecialApplied
    ? requirements.moderateRanges.wageSpecialCAGR
    : requirements.moderateRanges.wageCAGR;
  const wageTarget = (wageRange.min + wageRange.max) / 2;

  // チェック切り替え
  const handleToggleTarget = (candidate: SolverCandidate, checked: boolean) => {
    if (disabled) return;
    if (checked) {
      // 追加
      const newTarget = {
        key: candidate.key,
        min: candidate.min,
        max: candidate.max,
        step: candidate.step,
      };
      onUpdateSolverTargets([...currentTargets, newTarget]);
    } else {
      // 削除
      onUpdateSolverTargets(currentTargets.filter((t) => t.key !== candidate.key));
    }
  };

  // min / max / step の更新
  const handleUpdateTargetParam = (
    key: string,
    field: 'min' | 'max' | 'step',
    val: number
  ) => {
    if (disabled) return;
    const next = currentTargets.map((t) => {
      if (t.key !== key) return t;
      return {
        ...t,
        [field]: val,
      };
    });
    onUpdateSolverTargets(next);
  };

  // 自動調整実行
  const handleRunSolver = () => {
    if (!isEnabled || disabled) return;
    const result = solveToTarget(fm, track, requirements, solverCandidates);
    setModalResult(result);
  };

  // モーダルで「適用」をクリック
  const handleApply = () => {
    if (!modalResult) return;
    onApplySolverResult(modalResult.simulation);
    setModalResult(null);
    onNotify('自動調整結果を適用しました。');
  };

  return (
    <div data-guide-id="guide-fin-solver" className="mt-8 border-t-2 border-slate-300 pt-6">
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-sm">
        {/* ヘッダー */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                前提値の自動調整（目標値からの逆算）
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                仮
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              公募要件の目標値（ほどよく範囲の中央値）に向けて、選択した前提変数を自動探索（40回二分探索）で調整します。
            </p>
          </div>

          {/* 目標値表示 */}
          <div className="flex items-center gap-4 bg-white border border-slate-200 px-3 py-2 rounded-xs text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">付加価値CAGR目標:</span>
              <strong className="text-blue-700 font-mono text-sm">{vaTarget.toFixed(1)}%</strong>
              <span className="text-[10px] text-slate-400 ml-1">
                ({requirements.moderateRanges.valueAddedCAGR.min}〜
                {requirements.moderateRanges.valueAddedCAGR.max}%)
              </span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-slate-500 block text-[11px]">
                一人当たり給与CAGR目標{fm.isWageSpecialApplied ? '(特例)' : ''}:
              </span>
              <strong className="text-emerald-700 font-mono text-sm">
                {wageTarget.toFixed(1)}%
              </strong>
              <span className="text-[10px] text-slate-400 ml-1">
                ({wageRange.min}〜{wageRange.max}%)
              </span>
            </div>
          </div>
        </div>

        {/* 候補変数リスト */}
        <div className="mt-4 space-y-3">
          <div className="text-xs font-semibold text-slate-700">
            自動調整の対象とする変数を選択してください：
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {solverCandidates.map((candidate) => {
              const isPinned = pinnedKeys.includes(candidate.key);
              const target = currentTargets.find((t) => t.key === candidate.key);
              const isChecked = Boolean(target) && !isPinned;

              return (
                <div
                  key={candidate.key}
                  className={`p-3 border text-xs transition-colors rounded-xs ${
                    isPinned
                      ? 'bg-blue-50/50 border-blue-200'
                      : isChecked
                      ? 'bg-white border-blue-400 ring-1 ring-blue-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={disabled || isPinned}
                        checked={isChecked}
                        onChange={(e) => handleToggleTarget(candidate, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded-xs focus:ring-0"
                      />
                      <span>{candidate.label}</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-xs font-semibold ${
                          candidate.affects === 'wage'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {candidate.affects === 'wage' ? '給与系' : '付加価値系'}
                      </span>
                      {isPinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 bg-blue-600 text-white font-bold rounded-xs">
                          <Pin className="w-2.5 h-2.5 fill-current" />
                          固定中
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 探索パラメータ編集 (min, max, step) */}
                  {isChecked && target && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-3 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <span>下限:</span>
                        <input
                          type="number"
                          step={target.step}
                          disabled={disabled}
                          value={target.min}
                          onChange={(e) =>
                            handleUpdateTargetParam(candidate.key, 'min', Number(e.target.value))
                          }
                          className="w-16 px-1.5 py-0.5 border border-slate-300 bg-white text-right font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span>上限:</span>
                        <input
                          type="number"
                          step={target.step}
                          disabled={disabled}
                          value={target.max}
                          onChange={(e) =>
                            handleUpdateTargetParam(candidate.key, 'max', Number(e.target.value))
                          }
                          className="w-16 px-1.5 py-0.5 border border-slate-300 bg-white text-right font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span>刻み:</span>
                        <input
                          type="number"
                          step={0.01}
                          disabled={disabled}
                          value={target.step}
                          onChange={(e) =>
                            handleUpdateTargetParam(candidate.key, 'step', Number(e.target.value))
                          }
                          className="w-14 px-1.5 py-0.5 border border-slate-300 bg-white text-right font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 実行ボタン領域 */}
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {!isEnabled && (
              <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                自動計算モードをONにしてください（画面上部のスイッチ）
              </span>
            )}
            {isEnabled && currentTargets.length === 0 && (
              <span className="text-xs text-slate-500">
                ※自動調整する変数を1つ以上チェックしてください
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!isEnabled || disabled || currentTargets.length === 0}
            onClick={handleRunSolver}
            className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold transition-colors cursor-pointer ${
              !isEnabled || disabled || currentTargets.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>目標に合わせて自動調整</span>
          </button>
        </div>
      </div>

      {/* 調整結果確認モーダル */}
      {modalResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  自動調整結果プレビュー
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setModalResult(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* 到達 / 未到達状況 */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3 border flex items-center gap-2.5 ${
                    modalResult.reached.valueAdded
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {modalResult.reached.valueAdded ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">付加価値額CAGR目標</div>
                    <div className="text-[11px]">
                      {modalResult.reached.valueAdded ? '目標に到達しました' : '未達'}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3 border flex items-center gap-2.5 ${
                    modalResult.reached.wage
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {modalResult.reached.wage ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="font-bold">一人当たり給与CAGR目標</div>
                    <div className="text-[11px]">
                      {modalResult.reached.wage ? '目標に到達しました' : '未達'}
                    </div>
                  </div>
                </div>
              </div>

              {/* メッセージ警告 */}
              {modalResult.messages.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    調整結果の注記事項:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                    {modalResult.messages.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 変更内容テーブル */}
              <div>
                <div className="font-bold text-slate-800 mb-2">変更された前提値：</div>
                {modalResult.changes.length === 0 ? (
                  <div className="text-slate-500 py-3 text-center bg-slate-50 border border-slate-200">
                    変更された項目はありません。
                  </div>
                ) : (
                  <table className="w-full border-collapse border border-slate-200 text-left">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="py-2 px-3 border-b border-slate-200">対象項目</th>
                        <th className="py-2 px-3 border-b border-slate-200 text-right">変更前</th>
                        <th className="py-2 px-3 border-b border-slate-200 text-center w-8"></th>
                        <th className="py-2 px-3 border-b border-slate-200 text-right">変更後</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalResult.changes.map((ch) => (
                        <tr key={ch.key} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-800">{ch.label}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {ch.before}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400">
                            <ArrowRight className="w-3.5 h-3.5 inline" />
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                            {ch.after}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalResult(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
              >
                適用する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

