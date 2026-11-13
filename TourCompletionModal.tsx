import React from 'react';
import { Check, Clock } from 'lucide-react';
import { EffectEstimateItem } from '../types';
import { formatMinutesJa } from './SpecTagBadge';

interface TourCompletionModalProps {
  isOpen: boolean;
  effectEstimates: EffectEstimateItem[];
  onCloseAndRestore: () => void;
}

const EXPERIENCED_HIGHLIGHTS = [
  '親子マスター構造：新事業進出（親）から持続化（要約）・東京都（要件追加）への展開',
  'マスターヒアリングシート：議事録解析・Excel算定変数の取込と3補助金への同期（Gate 1）',
  '収支計画マスター：単価×客数・削減工数の算定根拠反映、様式換算、公募要件判定と数値ロック（Gate 2）',
  '手戻り防止制御：Gate 2確定による申請書エディタ解禁、文字数・審査項目チェック、モジュール挿入とDiff記録',
  '品質保証と継続改善：定性・定量AIクロスチェック監査（Gate 3）、プロンプト集、公募回管理・差異分析',
];

export const TourCompletionModal: React.FC<TourCompletionModalProps> = ({
  isOpen,
  effectEstimates,
  onCloseAndRestore,
}) => {
  if (!isOpen) return null;

  const totalManualHours = effectEstimates.reduce(
    (sum, item) => sum + item.manualHours,
    0
  );
  const totalSystemMinutes = effectEstimates.reduce(
    (sum, item) => sum + item.systemMinutes,
    0
  );
  const savedHours = Number(
    Math.max(0, totalManualHours - totalSystemMinutes / 60).toFixed(1)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-complete-title"
    >
      <div className="w-full max-w-xl bg-white border border-slate-900 shadow-xl">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-300">
            DEMO TOUR COMPLETED (17 / 17)
          </span>
          <span className="px-2 py-0.5 text-[11px] bg-emerald-900 border border-emerald-700 text-emerald-100">
            一気通貫ウォークスルー完了
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2
              id="tour-complete-title"
              className="text-lg font-bold text-slate-900"
            >
              デモツアーが完了しました
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              「株式会社○○」を題材に、初回取材から申請書への展開・数値ロック・整合性監査までの標準化プロセスをご確認いただきました。
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 space-y-2">
            <div className="text-xs font-bold text-slate-900">
              今回のツアーで体験した主要機能
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {EXPERIENCED_HIGHLIGHTS.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* W2 Reduction Summary */}
          <div className="border border-emerald-300 bg-emerald-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                <Clock className="w-3.5 h-3.5" />
                <span>1案件あたりの標準化・工数削減効果</span>
                <span className="px-1.5 py-0.5 text-[10px] font-normal bg-white border border-emerald-300 text-emerald-900">
                  試算例（仮置き）
                </span>
              </div>
              <div className="text-xs text-slate-700 font-mono tabular-nums">
                従来 約{totalManualHours}時間 → 本システム 約
                {formatMinutesJa(totalSystemMinutes)}
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <span className="text-xl font-bold text-emerald-900">
                約 {savedHours} 時間削減
              </span>
              <span className="block text-[10px] text-slate-500">
                （管理者設定で前提変更可）
              </span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-300 px-3.5 py-2.5 text-xs text-amber-950">
            ツアー中に自動実行したデータ変更（マスター生成・Gate確定・本文追記等）は、下のボタンを押すと<strong>ツアー開始前の状態に自動で復元</strong>されます。
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onCloseAndRestore}
              className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              データをツアー開始前に戻して操作を続ける
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
