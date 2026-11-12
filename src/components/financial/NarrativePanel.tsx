/**
 * 収支計画説明文の下書きパネル (NarrativePanel.tsx)
 * 【STEP C準拠】
 * 付加価値額・一人当たり給与支給総額の目標値算出根拠を、
 * 確定的な数値結果（CAGR、基準・最終年度の金額等）に基づいてAI下書き（ダミー）生成・編集・コピーするコンポーネント。
 */

import React, { useState } from 'react';
import { Check, Copy, FileText, Loader2, Sparkles } from 'lucide-react';
import { aiService } from '../../services/aiService';
import {
  DisplayCurrencyUnit,
  NarrativeTemplate,
  PeriodKey,
  ProjectFinancialMaster,
  RoundingMode,
  SubsidyRequirements,
  SubsidyTrack,
} from '../../types';
import {
  evaluateRequirements,
  formatMoney,
  getUnitLabel,
} from '../../utils/financialCalculations';

interface NarrativePanelProps {
  fm: ProjectFinancialMaster;
  track: SubsidyTrack;
  requirements: SubsidyRequirements;
  narrativeTemplates: NarrativeTemplate[];
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  disabled: boolean;
  onUpdateNarrative(id: 'valueAdded' | 'wage', text: string): void;
  onNotify(msg: string): void;
}

export const NarrativePanel: React.FC<NarrativePanelProps> = ({
  fm,
  track,
  requirements,
  narrativeTemplates,
  displayCurrencyUnit,
  roundingMode,
  disabled,
  onUpdateNarrative,
  onNotify,
}) => {
  const [generatingId, setGeneratingId] = useState<'valueAdded' | 'wage' | null>(null);
  const [copiedId, setCopiedId] = useState<'valueAdded' | 'wage' | null>(null);

  const evalResult = evaluateRequirements(fm, track, requirements);
  const pYears = fm.planningYears;
  const targetPeriodKey: PeriodKey =
    pYears === 3 ? 'p3' : pYears === 4 ? 'p4' : 'p5';

  const basePeriod = fm.periods.baseFY;
  const targetPeriod = fm.periods[targetPeriodKey];
  const unitStr = getUnitLabel(displayCurrencyUnit);

  // タグ置換用パラメータマップ生成
  const getTemplateValues = (id: 'valueAdded' | 'wage'): Record<string, string> => {
    if (id === 'valueAdded') {
      const growthRate =
        fm.simulation.existingGrowthRate?.[targetPeriodKey] ??
        fm.simulation.existingGrowthRate?.p1 ??
        0;
      return {
        基準年度: `${basePeriod.fiscalInfo.fiscalYear}年${basePeriod.fiscalInfo.fiscalMonth}月期`,
        基準付加価値額: `${formatMoney(evalResult.baseValueAdded, displayCurrencyUnit, roundingMode)}${unitStr}`,
        既存成長率: String(growthRate),
        最終年度: `${targetPeriod.fiscalInfo.fiscalYear}年${targetPeriod.fiscalInfo.fiscalMonth}月期`,
        最終年度補助売上: `${formatMoney(targetPeriod.pl.subsidyBusiness.sales, displayCurrencyUnit, roundingMode)}${unitStr}`,
        最終付加価値額: `${formatMoney(evalResult.targetValueAdded, displayCurrencyUnit, roundingMode)}${unitStr}`,
        付加価値CAGR: evalResult.vaCAGR.toFixed(1),
      };
    } else {
      const wageRate =
        fm.simulation.perCapitaWageGrowthRate?.[targetPeriodKey] ??
        fm.simulation.perCapitaWageGrowthRate?.p1 ??
        0;
      return {
        基準年度: `${basePeriod.fiscalInfo.fiscalYear}年${basePeriod.fiscalInfo.fiscalMonth}月期`,
        基準一人当たり給与: `${formatMoney(evalResult.basePerCapitaWage, displayCurrencyUnit, roundingMode)}${unitStr}`,
        給与伸び率: String(wageRate),
        最終年度: `${targetPeriod.fiscalInfo.fiscalYear}年${targetPeriod.fiscalInfo.fiscalMonth}月期`,
        最終一人当たり給与: `${formatMoney(evalResult.targetPerCapitaWage, displayCurrencyUnit, roundingMode)}${unitStr}`,
        給与CAGR: evalResult.wageCAGR.toFixed(1),
      };
    }
  };

  // AI下書き生成実行
  const handleGenerate = async (id: 'valueAdded' | 'wage') => {
    if (disabled) return;
    setGeneratingId(id);
    try {
      const defaultTemplate =
        id === 'valueAdded'
          ? '基準年度（{基準年度}）の付加価値額{基準付加価値額}に対し、既存事業の年{既存成長率}%成長と、補助事業による売上{最終年度補助売上}の上乗せにより、最終年度（{最終年度}）に{最終付加価値額}を見込む。年平均成長率は{付加価値CAGR}%である。'
          : '基準年度の一人当たり給与支給総額{基準一人当たり給与}を毎年{給与伸び率}%引き上げ、最終年度に{最終一人当たり給与}とする。年平均成長率は{給与CAGR}%である。';

      const tpl =
        narrativeTemplates.find((t) => t.id === id)?.template || defaultTemplate;
      const values = getTemplateValues(id);

      const generated = await aiService.generatePlanNarrative(tpl, values);
      onUpdateNarrative(id, generated);
      onNotify(
        `${id === 'valueAdded' ? '付加価値額' : '給与支給総額'}の説明文下書きを作成しました。`
      );
    } catch (err) {
      console.error(err);
      onNotify('下書き生成に失敗しました。');
    } finally {
      setGeneratingId(null);
    }
  };

  // コピー処理
  const handleCopy = (id: 'valueAdded' | 'wage') => {
    const text = fm.narratives?.[id] || '';
    if (!text) {
      onNotify('コピーするテキストがありません。');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    onNotify('クリップボードにコピーしました。');
  };

  return (
    <div className="mt-8 border-t-2 border-slate-300 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            公募要件目標値の算出根拠（申請書記載用 説明文の下書き）
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 font-bold rounded-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            AI下書き（ダミー）
          </span>
          <span className="text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
            仮
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          ※収支計画の計算結果（基準年度、最終年度、CAGR等）を反映した説明文です。申請書の「数値根拠」欄にそのまま転記できます。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. 付加価値額目標値の算出根拠 */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2.5">
              <span className="font-bold text-slate-800 text-xs">
                ① 付加価値額目標値の算出根拠
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={disabled || generatingId === 'valueAdded'}
                  onClick={() => handleGenerate('valueAdded')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="最新の計算数値から説明文を下書き生成"
                >
                  {generatingId === 'valueAdded' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>AIで下書き</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy('valueAdded')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xs transition-colors cursor-pointer"
                  title="テキストをクリップボードにコピー"
                >
                  {copiedId === 'valueAdded' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500" />
                  )}
                  <span>コピー</span>
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              disabled={disabled}
              placeholder="「AIで下書き」ボタンを押すか、直接入力してください。"
              value={fm.narratives?.valueAdded || ''}
              onChange={(e) => onUpdateNarrative('valueAdded', e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xs text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-blue-500 resize-none font-sans"
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>文字数: {(fm.narratives?.valueAdded || '').length} 文字</span>
            <span>基準年度 → 最終年度 CAGR: {evalResult.vaCAGR.toFixed(1)}%</span>
          </div>
        </div>

        {/* 2. 一人当たり給与支給総額目標値の算出根拠 */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2.5">
              <span className="font-bold text-slate-800 text-xs">
                ② 一人当たり給与支給総額目標値の算出根拠
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={disabled || generatingId === 'wage'}
                  onClick={() => handleGenerate('wage')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="最新の計算数値から説明文を下書き生成"
                >
                  {generatingId === 'wage' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>AIで下書き</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy('wage')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xs transition-colors cursor-pointer"
                  title="テキストをクリップボードにコピー"
                >
                  {copiedId === 'wage' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500" />
                  )}
                  <span>コピー</span>
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              disabled={disabled}
              placeholder="「AIで下書き」ボタンを押すか、直接入力してください。"
              value={fm.narratives?.wage || ''}
              onChange={(e) => onUpdateNarrative('wage', e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xs text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-blue-500 resize-none font-sans"
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>文字数: {(fm.narratives?.wage || '').length} 文字</span>
            <span>
              基準年度 → 最終年度 CAGR: {evalResult.wageCAGR.toFixed(1)}%
              {fm.isWageSpecialApplied ? '（特例適用）' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

