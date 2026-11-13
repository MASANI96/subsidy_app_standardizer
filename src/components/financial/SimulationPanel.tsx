import React from 'react';
import { Calculator, RefreshCw, Sliders, TrendingUp, Users } from 'lucide-react';
import {
  DisplayCurrencyUnit,
  PeriodFiscalInfo,
  PeriodKey,
  PlanningYearsOption,
  ProjectFinancialMaster,
  RoundingMode,
  SimulationConfig,
  SimulationPeriodKey,
} from '../../types';
import { formatMoney } from '../../utils/financialCalculations';
import { TermHelp } from '../TermHelp';

interface SimulationPanelProps {
  projectId: string;
  financialMaster: ProjectFinancialMaster;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  isLocked: boolean;
  canEdit: boolean;
  onUpdateSimulation: (projectId: string, updates: Partial<SimulationConfig>) => void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  projectId,
  financialMaster,
  displayCurrencyUnit,
  roundingMode,
  isLocked,
  canEdit,
  onUpdateSimulation,
}) => {
  const sim = financialMaster.simulation;
  const disabled = isLocked || !canEdit;

  const visibleSimPeriods: { key: SimulationPeriodKey; label: string; sub: string }[] = [
    { key: 'currentFY', label: '申請時年度', sub: '進行期' },
    { key: 'baseFY', label: '基準年度', sub: 'スタート地点' },
    { key: 'p1', label: '計画1年目', sub: 'P1' },
    { key: 'p2', label: '計画2年目', sub: 'P2' },
    { key: 'p3', label: '計画3年目', sub: 'P3' },
  ];
  if (financialMaster.planningYears >= 4) {
    visibleSimPeriods.push({ key: 'p4', label: '計画4年目', sub: 'P4' });
  }
  if (financialMaster.planningYears >= 5) {
    visibleSimPeriods.push({ key: 'p5', label: '計画5年目', sub: 'P5' });
  }

  if (!sim) {
    return (
      <div className="bg-white border border-slate-200 p-5 text-xs text-slate-600">
        シミュレーション設定が初期化されていません。右上のリセットで初期状態に戻せます。
      </div>
    );
  }

  const updatePerPeriodRecord = (
    field:
      | 'existingSalesGrowthRate'
      | 'subsidyMonthlyQty'
      | 'newHires'
      | 'perCapitaWageGrowthRate'
      | 'workplaceMinWage'
      | 'regionalMinWage',
    key: SimulationPeriodKey,
    val: number
  ) => {
    if (disabled) return;
    onUpdateSimulation(projectId, {
      [field]: {
        ...sim[field],
        [key]: Number.isFinite(val) ? val : 0,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* 自動計算ON/OFF＆説明ヘッダー */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              事業計画シミュレーション前提（変数を変えると右側の判定が即座に連動）
            </h3>
          </div>
          <p className="text-[11px] text-slate-600">
            過去実績（2期前〜直近Y0）は固定したまま、既存事業・補助事業・賃上げ前提を変更してリアルタイムに要件判定を行えます。
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-xs font-bold text-blue-950 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            disabled={disabled}
            checked={sim.enabled}
            onChange={(e) => onUpdateSimulation(projectId, { enabled: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <span>自動連動シミュレーション ON</span>
        </label>
      </div>

      {/* 1. 補助事業前提（単価・販売数量・原価率・固定販管費） */}
      <div
        data-guide-id="guide-sim-subsidy-inputs"
        className="bg-white border border-slate-200 p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>1. 補助事業（新事業）の売上・原価前提</span>
            <TermHelp termKey="valueAdded" />
          </h4>
          <span className="text-[11px] text-slate-500">
            補助事業売上 ＝ 単価 × 月間販売数量 × 12か月
          </span>
        </div>

        {/* 単価・原価率・固定販管費 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 p-2.5">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              平均単価（円 / 件）
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={50000}
                min={0}
                disabled={disabled}
                value={sim.subsidyUnitPriceYen}
                onChange={(e) =>
                  onUpdateSimulation(projectId, {
                    subsidyUnitPriceYen: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full bg-white border border-slate-300 px-2 py-1 text-right font-mono font-bold text-slate-900"
              />
              <span className="text-[11px] text-slate-500 shrink-0">円</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 text-right">
              ({Math.round(sim.subsidyUnitPriceYen / 10000).toLocaleString()}万円/件)
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-2.5">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              補助事業 売上原価率（%）
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={0.5}
                min={0}
                max={100}
                disabled={disabled}
                value={sim.subsidyCostRatioPercent}
                onChange={(e) =>
                  onUpdateSimulation(projectId, {
                    subsidyCostRatioPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  })
                }
                className="w-full bg-white border border-slate-300 px-2 py-1 text-right font-mono font-bold text-slate-900"
              />
              <span className="text-[11px] text-slate-500 shrink-0">%</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 text-right">
              粗利率 {(100 - sim.subsidyCostRatioPercent).toFixed(1)}%
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-2.5">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              補助事業 固定販管費（円 / 年）
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={1000000}
                min={0}
                disabled={disabled}
                value={sim.subsidyFixedSgaYen}
                onChange={(e) =>
                  onUpdateSimulation(projectId, {
                    subsidyFixedSgaYen: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full bg-white border border-slate-300 px-2 py-1 text-right font-mono font-bold text-slate-900"
              />
              <span className="text-[11px] text-slate-500 shrink-0">円</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 text-right">
              ({formatMoney(sim.subsidyFixedSgaYen, displayCurrencyUnit, roundingMode)})
            </div>
          </div>
        </div>

        {/* 月間販売数量テーブル */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2 px-3 text-left min-w-[170px]">補助事業パラメータ / 期</th>
                {visibleSimPeriods.map((p) => (
                  <th
                    key={p.key}
                    className={`py-1.5 px-2 text-center min-w-[85px] ${
                      p.key === 'baseFY' ? 'bg-blue-50 text-blue-900' : ''
                    }`}
                  >
                    <div className="font-bold">{p.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{p.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800">
                  月間販売数量（件 / 月）
                </td>
                {visibleSimPeriods.map((p) => (
                  <td key={p.key} className="py-1.5 px-2 text-center">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      disabled={disabled}
                      value={sim.subsidyMonthlyQty[p.key] ?? 0}
                      onChange={(e) =>
                        updatePerPeriodRecord(
                          'subsidyMonthlyQty',
                          p.key,
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-16 bg-white border border-blue-300 px-1.5 py-1 text-right font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-600"
                    />
                  </td>
                ))}
              </tr>
              <tr className="bg-blue-50/40">
                <td className="py-1.5 px-3 text-[11px] font-medium text-blue-900">
                  → 算出 補助事業売上高
                </td>
                {visibleSimPeriods.map((p) => (
                  <td key={p.key} className="py-1.5 px-2 text-right font-mono text-[11px] font-bold text-blue-900">
                    {formatMoney(
                      financialMaster.periods[p.key]?.pl.subsidyBusiness.sales ?? 0,
                      displayCurrencyUnit,
                      roundingMode
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. 既存事業前提 */}
      <div className="bg-white border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-slate-700" />
            <span>2. 既存事業の成長率・原価前提</span>
          </h4>
          <div className="flex items-center gap-4 text-[11px]">
            <label className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
              <span>既存事業 原価率:</span>
              <input
                type="number"
                step={0.5}
                min={0}
                max={100}
                disabled={disabled}
                value={sim.existingCostRatioPercent}
                onChange={(e) =>
                  onUpdateSimulation(projectId, {
                    existingCostRatioPercent: Number(e.target.value) || 0,
                  })
                }
                className="w-16 bg-white border border-slate-300 px-1.5 py-0.5 text-right font-mono font-semibold"
              />
              <span>%</span>
            </label>
            <label className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
              <span>既存販管費伸び率:</span>
              <input
                type="number"
                step={0.5}
                min={-20}
                max={50}
                disabled={disabled}
                value={sim.existingSgaGrowthRatePercent}
                onChange={(e) =>
                  onUpdateSimulation(projectId, {
                    existingSgaGrowthRatePercent: Number(e.target.value) || 0,
                  })
                }
                className="w-16 bg-white border border-slate-300 px-1.5 py-0.5 text-right font-mono font-semibold"
              />
              <span>%/年</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2 px-3 text-left min-w-[170px]">既存事業パラメータ / 期</th>
                {visibleSimPeriods.map((p) => (
                  <th key={p.key} className="py-1.5 px-2 text-center min-w-[85px]">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800">
                  既存事業 売上成長率（%）
                </td>
                {visibleSimPeriods.map((p) => (
                  <td key={p.key} className="py-1.5 px-2 text-center">
                    <input
                      type="number"
                      step={0.1}
                      disabled={disabled}
                      value={sim.existingSalesGrowthRate[p.key] ?? 0}
                      onChange={(e) =>
                        updatePerPeriodRecord(
                          'existingSalesGrowthRate',
                          p.key,
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-16 bg-white border border-slate-300 px-1.5 py-1 text-right font-mono text-slate-900"
                    />
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50">
                <td className="py-1.5 px-3 text-[11px] font-medium text-slate-700">
                  → 全社合計 売上高
                </td>
                {visibleSimPeriods.map((p) => (
                  <td key={p.key} className="py-1.5 px-2 text-right font-mono text-[11px] font-semibold text-slate-900">
                    {formatMoney(
                      financialMaster.periods[p.key]?.pl.totalSales ?? 0,
                      displayCurrencyUnit,
                      roundingMode
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 人員・賃金・最低賃金前提（台本05のテスト箇所を明快に強調） */}
      <div
        data-guide-id="guide-sim-wage-inputs"
        className="bg-white border border-slate-200 p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-700" />
            <span>3. 人員・給与伸び率・最低賃金前提</span>
            <TermHelp termKey="perCapitaWage" />
            <TermHelp termKey="minWage" />
          </h4>
          <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 font-medium">
            テスト例：P1〜P3の一人当たり給与伸び率を「6.2% → 2.0%」へ変更すると右側判定が即座に未達へ変化
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2 px-3 text-left min-w-[190px]">人員・賃金パラメータ / 期</th>
                {visibleSimPeriods.map((p) => (
                  <th
                    key={p.key}
                    className={`py-1.5 px-2 text-center min-w-[88px] ${
                      p.key === 'baseFY'
                        ? 'bg-blue-50 text-blue-900'
                        : p.key.startsWith('p')
                          ? 'bg-emerald-50/70 text-emerald-900'
                          : ''
                    }`}
                  >
                    <div className="font-bold">{p.label}</div>
                    <div className="text-[10px] font-normal opacity-80">{p.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800">
                  新規雇用人数（名 / 年）
                </td>
                {visibleSimPeriods.map((p) => (
                  <td key={p.key} className="py-1.5 px-2 text-center">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      disabled={disabled}
                      value={sim.newHires[p.key] ?? 0}
                      onChange={(e) =>
                        updatePerPeriodRecord(
                          'newHires',
                          p.key,
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-16 bg-white border border-slate-300 px-1.5 py-1 text-right font-mono"
                    />
                  </td>
                ))}
              </tr>

              <tr className="bg-amber-50/40">
                <td className="py-2 px-3 font-bold text-slate-900">
                  一人当たり給与 伸び率（% / 年）
                </td>
                {visibleSimPeriods.map((p) => (
                  <td key={p.key} className="py-1.5 px-2 text-center">
                    <input
                      type="number"
                      step={0.1}
                      disabled={disabled}
                      value={sim.perCapitaWageGrowthRate[p.key] ?? 0}
                      onChange={(e) =>
                        updatePerPeriodRecord(
                          'perCapitaWageGrowthRate',
                          p.key,
                          Number(e.target.value) || 0
                        )
                      }
                      className={`w-16 bg-white border px-1.5 py-1 text-right font-mono font-bold ${
                        p.key.startsWith('p')
                          ? 'border-amber-400 text-amber-950 focus:border-blue-600'
                          : 'border-slate-300 text-slate-700'
                      }`}
                    />
                  </td>
                ))}
              </tr>

              <tr className="bg-slate-50">
                <td className="py-1.5 px-3 text-[11px] text-slate-700 font-medium">
                  → 算出 従業員数 / 一人当たり給与
                </td>
                {visibleSimPeriods.map((p) => {
                  const pl = financialMaster.periods[p.key]?.pl;
                  return (
                    <td key={p.key} className="py-1.5 px-2 text-right font-mono text-[10px] text-slate-700">
                      <div className="font-bold text-slate-900">{pl?.numberOfEmployees ?? 0}名</div>
                      <div>{Math.round((pl?.perCapitaWage ?? 0) / 10000).toLocaleString()}万円</div>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800">
                  事業場内最低賃金（円 / 時）
                </td>
                {visibleSimPeriods.map((p) => (
                  <td key={p.key} className="py-1.5 px-2 text-center">
                    <input
                      type="number"
                      step={10}
                      min={0}
                      disabled={disabled}
                      value={sim.workplaceMinWage[p.key] ?? 0}
                      onChange={(e) =>
                        updatePerPeriodRecord(
                          'workplaceMinWage',
                          p.key,
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-20 bg-white border border-slate-300 px-1.5 py-1 text-right font-mono"
                    />
                  </td>
                ))}
              </tr>

              <tr>
                <td className="py-2 px-3 font-semibold text-slate-800">
                  地域別最低賃金（円 / 時）
                </td>
                {visibleSimPeriods.map((p) => (
                  <td key={p.key} className="py-1.5 px-2 text-center">
                    <input
                      type="number"
                      step={10}
                      min={0}
                      disabled={disabled}
                      value={sim.regionalMinWage[p.key] ?? 0}
                      onChange={(e) =>
                        updatePerPeriodRecord(
                          'regionalMinWage',
                          p.key,
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-20 bg-white border border-slate-300 px-1.5 py-1 text-right font-mono"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* クイック一括操作ボタン */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
          <span className="text-slate-500 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            P1〜P{financialMaster.planningYears}の一人当たり給与伸び率を一括変更：
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {[2.0, 3.8, 6.2, 7.0].map((rate) => (
              <button
                key={rate}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const pKeys: SimulationPeriodKey[] = ['p1', 'p2', 'p3', 'p4', 'p5'];
                  const nextRates = { ...sim.perCapitaWageGrowthRate };
                  pKeys.forEach((pk) => {
                    nextRates[pk] = rate;
                  });
                  onUpdateSimulation(projectId, { perCapitaWageGrowthRate: nextRates });
                }}
                className={`px-2 py-0.5 border font-mono font-semibold cursor-pointer disabled:opacity-50 ${
                  rate === 2.0
                    ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                }`}
              >
                計画期 {rate.toFixed(1)}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
