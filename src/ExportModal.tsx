import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Table2,
  X,
} from 'lucide-react';
import { excelCellMappings, getValueByPath } from '../../data/excelMappings';
import {
  DisplayCurrencyUnit,
  PeriodKey,
  Project,
  RoundingMode,
  SubsidyRequirements,
  SubsidyTrack,
} from '../../types';
import {
  evaluateRequirements,
  formatMoney,
  getUnitLabel,
} from '../../utils/financialCalculations';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  appliedTrack: SubsidyTrack;
  requirements: SubsidyRequirements;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
}

type ExportTab = 'customerSummary' | 'officialMapping';
type SummarySheetTab = 'summary' | 'pl' | 'wage' | 'investment';

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  project,
  appliedTrack,
  requirements,
  displayCurrencyUnit,
  roundingMode,
}) => {
  const [activeMode, setActiveMode] = useState<ExportTab>('customerSummary');
  const [sheetTab, setSheetTab] = useState<SummarySheetTab>('summary');
  const [previewUnit, setPreviewUnit] = useState<DisplayCurrencyUnit>(displayCurrencyUnit);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  if (!open) return null;

  const fm = project.financialMaster;
  const evalResult = evaluateRequirements(fm, appliedTrack, requirements);
  const periodKeys: PeriodKey[] =
    fm.planningYears === 3
      ? ['y0', 'currentFY', 'baseFY', 'p1', 'p2', 'p3']
      : fm.planningYears === 4
        ? ['y0', 'currentFY', 'baseFY', 'p1', 'p2', 'p3', 'p4']
        : ['y0', 'currentFY', 'baseFY', 'p1', 'p2', 'p3', 'p4', 'p5'];

  const hasBSImbalance = periodKeys.some((k) => {
    const bs = fm.periods[k]?.bs;
    return bs && bs.totalAssets !== bs.totalLiabilitiesAndNetAssets;
  });

  const handleDemoExportClick = () => {
    setDemoNotice(
      `【デモ動作】本番運用ではこの操作で『${project.companyName}_収支計画.xlsx』のダウンロードが開始されます。（モックのためファイル保存は行いません）`
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-white border border-slate-300 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold">
                Excel出力プレビュー（{project.companyName} / {appliedTrack.name}）
              </h3>
              <p className="text-[11px] text-slate-300">
                顧客説明用サマリー＆事務局公式インポート用フォーマット セル番地対応確認（ブラウザ内プレビュー）
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

        {/* 出力前チェック警告バー */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center gap-3 text-[11px] shrink-0">
          <span className="font-bold text-slate-700">出力前チェック:</span>
          {evalResult.isAllPassed ? (
            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              全公募要件クリア
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              公募要件未達あり（要確認）
            </span>
          )}

          {hasBSImbalance ? (
            <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              BS貸借不一致あり
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              BS全期貸借一致
            </span>
          )}

          {fm.annualSalesEstimate.hasMismatch && (
            <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              売上見込額の基準差あり（インポート用5.96億 vs v36計画6.30億）
            </span>
          )}
        </div>

        {/* Mode Switcher + Preview Unit */}
        <div className="px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="inline-flex bg-slate-100 p-0.5 border border-slate-300 text-xs">
            <button
              type="button"
              onClick={() => setActiveMode('customerSummary')}
              className={`px-3.5 py-1.5 font-bold cursor-pointer ${
                activeMode === 'customerSummary'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. 顧客説明用サマリー（4シートプレビュー）
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('officialMapping')}
              className={`px-3.5 py-1.5 font-bold cursor-pointer ${
                activeMode === 'officialMapping'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. 公式インポート用フォーマット（Excelセル番地対応表）
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-600 font-semibold">プレビュー単位:</span>
            {(['yen', 'thousandYen', 'manYen'] as DisplayCurrencyUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setPreviewUnit(u)}
                className={`px-2 py-1 border text-[11px] font-semibold cursor-pointer ${
                  previewUnit === u
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {getUnitLabel(u)}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {demoNotice && (
            <div className="bg-blue-50 border-2 border-blue-400 p-3.5 flex items-start gap-2.5 text-blue-950 font-semibold">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{demoNotice}</span>
            </div>
          )}

          {activeMode === 'customerSummary' ? (
            <div className="space-y-4">
              {/* 4シート切替タブ */}
              <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
                {[
                  { id: 'summary' as SummarySheetTab, label: '① 計画サマリー' },
                  { id: 'pl' as SummarySheetTab, label: '② 損益計画（PL）' },
                  { id: 'wage' as SummarySheetTab, label: '③ 人員・給与計画' },
                  { id: 'investment' as SummarySheetTab, label: '④ 設備投資・資金調達' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSheetTab(t.id)}
                    className={`px-3 py-1.5 text-xs font-bold border cursor-pointer ${
                      sheetTab === t.id
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {sheetTab === 'summary' && (
                <div className="border border-slate-200 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-emerald-900 text-white">
                        <th className="py-2 px-3 text-left">指標項目</th>
                        <th className="py-2 px-3 text-right">算出結果</th>
                        <th className="py-2 px-3 text-right">公募要件基準</th>
                        <th className="py-2 px-3 text-center">判定</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-2 px-3 font-semibold">付加価値額 CAGR</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {evalResult.vaCAGR.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-right">
                          {requirements.valueAddedCAGR}%以上
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {evalResult.isVAPassed ? '達成' : '未達'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">一人当たり給与 CAGR</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {evalResult.wageCAGR.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-right">
                          {fm.isWageSpecialApplied
                            ? `${requirements.wageSpecialCAGR}%以上（賃上げ特例）`
                            : `${requirements.wageCAGR}%以上`}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {evalResult.isWagePassed ? '達成' : '未達'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">足下の賃上げ（物価対比）</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {evalResult.nearTermWageGrowthRate.toFixed(2)}%
                        </td>
                        <td className="py-2 px-3 text-right">
                          {requirements.inflationRatePercent}%以上
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {evalResult.isNearTermWagePassed ? '達成' : '未達'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">事業場内最低賃金</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {evalResult.workplaceMinWage.toLocaleString()}円（+
                          {evalResult.minWageDiff}円）
                        </td>
                        <td className="py-2 px-3 text-right">
                          地域別+{fm.isWageSpecialApplied ? 50 : 30}円以上
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {evalResult.isMinWagePassed ? '達成' : '未達'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-semibold">補助金交付申請額</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-900">
                          {formatMoney(
                            fm.investment.subsidyRequestedYen,
                            previewUnit,
                            roundingMode
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          上限{' '}
                          {formatMoney(
                            evalResult.effectiveCapYen,
                            previewUnit,
                            roundingMode
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {evalResult.isSubsidyWithinCap && evalResult.isMinSubsidyPassed
                            ? '範囲内'
                            : '範囲外'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {sheetTab === 'pl' && (
                <div className="border border-slate-200 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="py-2 px-3 text-left">PL項目（単位：{getUnitLabel(previewUnit)}）</th>
                        {periodKeys.map((k) => (
                          <th key={k} className="py-2 px-3 text-right">
                            {fm.periods[k]?.fiscalInfo.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {[
                        {
                          label: '売上高（全社計）',
                          get: (k: PeriodKey) => fm.periods[k]?.pl.totalSales ?? 0,
                        },
                        {
                          label: '└ 補助事業 売上高',
                          get: (k: PeriodKey) => fm.periods[k]?.pl.subsidyBusiness.sales ?? 0,
                        },
                        {
                          label: '営業利益',
                          get: (k: PeriodKey) => fm.periods[k]?.pl.totalOperatingProfit ?? 0,
                        },
                        {
                          label: '人件費',
                          get: (k: PeriodKey) => fm.periods[k]?.pl.laborCost ?? 0,
                        },
                        {
                          label: '減価償却費',
                          get: (k: PeriodKey) => fm.periods[k]?.pl.depreciation ?? 0,
                        },
                        {
                          label: '★ 付加価値額',
                          get: (k: PeriodKey) => fm.periods[k]?.pl.valueAdded ?? 0,
                        },
                      ].map((row) => (
                        <tr key={row.label} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-semibold text-slate-800">
                            {row.label}
                          </td>
                          {periodKeys.map((k) => (
                            <td key={k} className="py-2 px-3 text-right">
                              {formatMoney(row.get(k), previewUnit, roundingMode, false)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sheetTab === 'wage' && (
                <div className="border border-slate-200 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="py-2 px-3 text-left">人員・賃金項目</th>
                        {periodKeys.map((k) => (
                          <th key={k} className="py-2 px-3 text-right">
                            {fm.periods[k]?.fiscalInfo.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      <tr>
                        <td className="py-2 px-3 font-sans font-semibold">従業員数（名）</td>
                        {periodKeys.map((k) => (
                          <td key={k} className="py-2 px-3 text-right">
                            {fm.periods[k]?.pl.numberOfEmployees}名
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-sans font-semibold">
                          給与支給総額（{getUnitLabel(previewUnit)}）
                        </td>
                        {periodKeys.map((k) => (
                          <td key={k} className="py-2 px-3 text-right">
                            {formatMoney(
                              fm.periods[k]?.pl.totalWages ?? 0,
                              previewUnit,
                              roundingMode,
                              false
                            )}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-sans font-semibold">
                          一人当たり給与（円）
                        </td>
                        {periodKeys.map((k) => (
                          <td key={k} className="py-2 px-3 text-right font-bold text-blue-900">
                            {(fm.periods[k]?.pl.perCapitaWage ?? 0).toLocaleString()}円
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-sans font-semibold">
                          事業場内最賃（時給）
                        </td>
                        {periodKeys.map((k) => (
                          <td key={k} className="py-2 px-3 text-right">
                            {fm.periods[k]?.pl.workplaceMinWage.toLocaleString()}円
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {sheetTab === 'investment' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-200 p-4 space-y-2">
                    <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                      設備投資経費内訳
                    </div>
                    <div className="flex justify-between">
                      <span>新規機械装置等:</span>
                      <span className="font-mono font-bold">
                        {formatMoney(
                          fm.investment.newMachineryInvestment,
                          previewUnit,
                          roundingMode
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>無形資産（ソフトウェア等）:</span>
                      <span className="font-mono font-bold">
                        {formatMoney(
                          fm.investment.intangibleAssetInvestment,
                          previewUnit,
                          roundingMode
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                      <span>総投資額合計:</span>
                      <span className="font-mono text-blue-900">
                        {formatMoney(
                          fm.investment.totalInvestmentYen,
                          previewUnit,
                          roundingMode
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="border border-slate-200 p-4 space-y-2">
                    <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                      資金調達計画
                    </div>
                    <div className="flex justify-between">
                      <span>補助金交付申請額:</span>
                      <span className="font-mono font-bold text-blue-900">
                        {formatMoney(
                          fm.investment.subsidyRequestedYen,
                          previewUnit,
                          roundingMode
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>自己資金:</span>
                      <span className="font-mono">
                        {formatMoney(fm.investment.ownFundsYen, previewUnit, roundingMode)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>金融機関借入金:</span>
                      <span className="font-mono">
                        {formatMoney(fm.investment.bankLoansYen, previewUnit, roundingMode)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: 公式インポート用フォーマット セル番地マッピング表 */
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 p-3 flex items-center gap-2 text-[11px] text-slate-700">
                <Table2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  本番運用では以下のシート名・セル番地へ、内部の円単位整数値（または算出値）を公式Excelテンプレートへ自動書込みします。
                </span>
              </div>
              <div className="border border-slate-200 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="py-2 px-3 text-left">シート名</th>
                      <th className="py-2 px-3 text-center">セル番地</th>
                      <th className="py-2 px-3 text-left">公式フォーマット項目名</th>
                      <th className="py-2 px-3 text-right">現在の値</th>
                      <th className="py-2 px-3 text-left">備考</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {excelCellMappings.map((m) => {
                      const rawVal = getValueByPath(fm, m.path);
                      let formatted = String(rawVal ?? '-');
                      if (typeof rawVal === 'number') {
                        if (m.unitDisplay === 'yen') {
                          formatted =
                            m.cellAddress === 'E41'
                              ? `${rawVal.toLocaleString()}円/時`
                              : formatMoney(rawVal, previewUnit, roundingMode);
                        } else if (m.unitDisplay === 'percent') {
                          formatted = `${rawVal}%`;
                        } else {
                          formatted = rawVal.toLocaleString();
                        }
                      }
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-700">
                            {m.sheetName}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-blue-800 bg-blue-50/40">
                            {m.cellAddress}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {m.itemLabel}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatted}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">{m.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500">
            ※ ブラウザ完結モックのため、実際の.xlsxファイル生成・ローカル保存は行いません。
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={handleDemoExportClick}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excelをダウンロード（デモ）</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
