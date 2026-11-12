/**
 * 計画シミュレーション前提値編集パネル (SimulationPanel.tsx)
 * 【STEP B準拠】
 * 予測期（currentFY〜p5）のPL前提値を一括設定・自動計算するコンポーネント
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Info,
  Percent,
  Pin,
  PinOff,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  DisplayCurrencyUnit,
  ForecastPeriodKey,
  PlanSimulation,
  ProjectFinancialMaster,
  RoundingMode,
  SimAsset,
  SolverCandidate,
  SubsidyRequirements,
  SubsidyTrack,
} from '../../types';
import { formatMoney, getUnitLabel, parseToYen } from '../../utils/financialCalculations';
import { SolverPanel } from './SolverPanel';

interface SimulationPanelProps {
  fm: ProjectFinancialMaster;
  visibleForecastKeys: ForecastPeriodKey[];
  periodLabels: Record<string, string>;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  disabled: boolean;
  errors: string[];
  solverCandidates?: SolverCandidate[];
  track?: SubsidyTrack;
  requirements?: SubsidyRequirements;
  onUpdate(updates: Partial<PlanSimulation>): void;
  onToggleEnabled(enabled: boolean): void;
  onTogglePin?(key: string): void;
  onUpdateSolverTargets?(
    targets: { key: string; min: number; max: number; step: number }[]
  ): void;
  onApplySolverResult?(simulation: PlanSimulation): void;
  onNotify?(msg: string): void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  fm,
  visibleForecastKeys,
  periodLabels,
  displayCurrencyUnit,
  roundingMode,
  disabled,
  errors,
  solverCandidates,
  track,
  requirements,
  onUpdate,
  onToggleEnabled,
  onTogglePin,
  onUpdateSolverTargets,
  onApplySolverResult,
  onNotify,
}) => {
  const sim = fm.simulation;
  const isEnabled = sim.enabled;

  // 固定ピン判定ヘルパー
  const isPinned = (key: string) => (sim.pinnedKeys || []).includes(key);

  // 固定ピンボタン（STEP C）
  const renderPinButton = (key: string) => {
    const pinned = isPinned(key);
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin?.(key);
        }}
        className={`w-5 h-5 inline-flex items-center justify-center ml-1 align-middle transition-colors cursor-pointer rounded-xs ${
          pinned
            ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
        title={pinned ? '固定中：自動調整で変更されません' : 'ピン留めして自動調整から固定'}
      >
        {pinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
      </button>
    );
  };

  // セクション開閉状態
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    existing: true,
    subsidy: true,
    depreciation: true,
    labor: true,
    nonOpTax: true,
    minWage: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 自動計算モードトグル処理
  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.checked;
    if (nextVal) {
      const ok = window.confirm(
        '予測期の数値を前提値から再計算し、手入力した予測値は上書きされます。よろしいですか？'
      );
      if (ok) {
        onToggleEnabled(true);
      }
    } else {
      onToggleEnabled(false);
    }
  };

  // 年度別数値（ForecastNumbers）の単一年度更新ヘルパー
  const handleForecastNumberChange = (
    field: keyof PlanSimulation,
    key: ForecastPeriodKey,
    value: number
  ) => {
    const current = (sim[field] as Record<ForecastPeriodKey, number>) || {};
    onUpdate({
      [field]: {
        ...current,
        [key]: value,
      },
    } as Partial<PlanSimulation>);
  };

  // 金額入力用（表示単位で入力し、parseToYenで円に変換）
  const handleForecastMoneyChange = (
    field: keyof PlanSimulation,
    key: ForecastPeriodKey,
    inputStr: string
  ) => {
    const yen = parseToYen(inputStr, displayCurrencyUnit);
    handleForecastNumberChange(field, key, yen);
  };

  // 新規資産追加
  const handleAddAsset = () => {
    const newAsset: SimAsset = {
      id: `asset-${Date.now()}`,
      name: `新規設備・システム${(sim.assets?.length || 0) + 1}`,
      acquisitionCostYen: parseToYen('1000', displayCurrencyUnit),
      acquisitionYm: `${fm.periods.baseFY.fiscalInfo.fiscalYear - 1}-04`,
      usefulLifeYears: 7,
      allocation: 'subsidyOnly',
    };
    onUpdate({
      assets: [...(sim.assets || []), newAsset],
    });
  };

  // 資産削除
  const handleDeleteAsset = (assetId: string) => {
    onUpdate({
      assets: (sim.assets || []).filter((a) => a.id !== assetId),
    });
  };

  // 資産情報更新
  const handleUpdateAsset = (assetId: string, updates: Partial<SimAsset>) => {
    onUpdate({
      assets: (sim.assets || []).map((a) => (a.id === assetId ? { ...a, ...updates } : a)),
    });
  };



  return (
    <div className="space-y-4">
      {/* 1. 最上部：自動計算モード切替バー */}
      <div className="bg-white border border-slate-300 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              disabled={disabled}
              onChange={handleToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-sm font-bold text-slate-900">
              自動計算モード
            </span>
          </label>
          <span className="text-xs text-slate-500">
            {isEnabled ? (
              <span className="text-blue-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                ON：予測期PLは下記前提値から自動計算されています（PL表は読取専用）
              </span>
            ) : (
              <span className="text-slate-600">
                OFF：現在PL表での直接手入力モードです。ONにすると前提値から予測期PLが再計算されます。
              </span>
            )}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          金額単位: <strong className="text-slate-800">{getUnitLabel(displayCurrencyUnit)}</strong>
        </div>
      </div>

      {/* 2. エラーメッセージ表示（赤枠） */}
      {errors.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-400 p-3.5 rounded-xs space-y-1">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>シミュレーション前提値に入力不備があります：</span>
          </div>
          <ul className="list-disc list-inside text-xs text-rose-700 pl-2 space-y-0.5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ========================================================= */}
      {/* ① 既存事業 */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('existing')}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200 text-left font-bold text-xs text-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>① 既存事業 前提値（売上成長率・原価率・その他販管費率）</span>
          </div>
          {openSections.existing ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {openSections.existing && (
          <div className="p-4 space-y-4 text-xs">
            {/* 売上成長率（年度列表） */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                既存事業 売上高 成長率（前年比 %）
              </label>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      {visibleForecastKeys.map((k) => (
                        <th key={k} className="py-2 px-2 text-center border border-slate-200 font-medium">
                          {periodLabels[k] || k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="number"
                              step="0.1"
                              disabled={disabled}
                              value={sim.existingGrowthRate?.[k] ?? 0}
                              onChange={(e) =>
                                handleForecastNumberChange('existingGrowthRate', k, parseFloat(e.target.value) || 0)
                              }
                              className={`w-18 text-right bg-white border px-1.5 py-0.5 font-mono ${
                                isPinned('existingGrowthRate')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('existingGrowthRate')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">%</span>
                            {renderPinButton('existingGrowthRate')}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 原価率 & その他販管費率 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between bg-slate-50 p-2.5 border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-700 block">既存事業 原価率</span>
                  <span className="text-[11px] text-slate-500">※売上高に対する売上原価の比率</span>
                </div>
                <div className="inline-flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    disabled={disabled}
                    value={sim.existingCostRate ?? 0}
                    onChange={(e) =>
                      onUpdate({ existingCostRate: parseFloat(e.target.value) || 0 })
                    }
                    className={`w-20 text-right bg-white border px-1.5 py-1 font-mono ${
                      isPinned('existingCostRate')
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : 'border-slate-300'
                    }`}
                    title={
                      isPinned('existingCostRate')
                        ? '固定中：自動調整で変更されません'
                        : undefined
                    }
                  />
                  <span className="ml-1 text-slate-500">%</span>
                  {renderPinButton('existingCostRate')}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-2.5 border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-700 block">既存事業 その他販管費率</span>
                  <span className="text-[11px] text-slate-500">※人件費・減価償却費を除く販管費の比率</span>
                </div>
                <div className="inline-flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    disabled={disabled}
                    value={sim.existingOtherSgaRate ?? 0}
                    onChange={(e) =>
                      onUpdate({ existingOtherSgaRate: parseFloat(e.target.value) || 0 })
                    }
                    className={`w-20 text-right bg-white border px-1.5 py-1 font-mono ${
                      isPinned('existingOtherSgaRate')
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : 'border-slate-300'
                    }`}
                    title={
                      isPinned('existingOtherSgaRate')
                        ? '固定中：自動調整で変更されません'
                        : undefined
                    }
                  />
                  <span className="ml-1 text-slate-500">%</span>
                  {renderPinButton('existingOtherSgaRate')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ② 補助事業（新規事業） */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('subsidy')}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200 text-left font-bold text-xs text-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>② 補助事業（新規事業）前提値（単価・月間販売数量・稼働月数・原価率・その他販管費率）</span>
          </div>
          {openSections.subsidy ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {openSections.subsidy && (
          <div className="p-4 space-y-4 text-xs">
            {/* 単価 */}
            <div className="flex items-center justify-between bg-blue-50/50 p-2.5 border border-blue-200">
              <div>
                <span className="font-semibold text-blue-900 block">補助事業 製品/サービス単価</span>
                <span className="text-[11px] text-blue-700">
                  ※新製品・新サービスの1台/1件あたり販売単価（円）
                </span>
              </div>
              <div className="inline-flex items-center">
                <input
                  type="text"
                  disabled={disabled}
                  defaultValue={formatMoney(sim.subsidyUnitPriceYen ?? 0, displayCurrencyUnit, roundingMode, false)}
                  onBlur={(e) => {
                    const yen = parseToYen(e.target.value, displayCurrencyUnit);
                    onUpdate({ subsidyUnitPriceYen: yen });
                  }}
                  className={`w-32 text-right bg-white border px-2 py-1 font-mono font-bold text-blue-900 ${
                    isPinned('subsidyUnitPriceYen')
                      ? 'border-blue-500 ring-1 ring-blue-500'
                      : 'border-blue-300'
                  }`}
                  title={
                    isPinned('subsidyUnitPriceYen')
                      ? '固定中：自動調整で変更されません'
                      : undefined
                  }
                />
                <span className="ml-1 text-slate-600 font-semibold">{getUnitLabel(displayCurrencyUnit)}</span>
                {renderPinButton('subsidyUnitPriceYen')}
              </div>
            </div>

            {/* 月あたり数量 & 稼働月数（年度列表） */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                月あたり販売数量（台/件）および 年間稼働月数（0〜12ヶ月）
              </label>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="py-2 px-2 text-left border border-slate-200 font-semibold w-36">
                        項目 / 期
                      </th>
                      {visibleForecastKeys.map((k) => (
                        <th key={k} className="py-2 px-2 text-center border border-slate-200 font-medium">
                          {periodLabels[k] || k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-2 border border-slate-200 font-medium text-slate-700">
                        月間販売数量
                      </td>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="number"
                              min="0"
                              disabled={disabled}
                              value={sim.subsidyMonthlyQty?.[k] ?? 0}
                              onChange={(e) =>
                                handleForecastNumberChange('subsidyMonthlyQty', k, parseInt(e.target.value, 10) || 0)
                              }
                              className={`w-16 text-right bg-white border px-1 py-0.5 font-mono ${
                                isPinned('subsidyMonthlyQty')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('subsidyMonthlyQty')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">台</span>
                            {renderPinButton('subsidyMonthlyQty')}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="py-2 px-2 border border-slate-200 font-medium text-slate-700">
                        年間稼働月数
                      </td>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="number"
                              min="0"
                              max="12"
                              disabled={disabled}
                              value={sim.subsidyOperatingMonths?.[k] ?? 12}
                              onChange={(e) =>
                                handleForecastNumberChange('subsidyOperatingMonths', k, parseInt(e.target.value, 10) || 0)
                              }
                              className={`w-16 text-right bg-white border px-1 py-0.5 font-mono ${
                                isPinned('subsidyOperatingMonths')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('subsidyOperatingMonths')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">ヶ月</span>
                            {renderPinButton('subsidyOperatingMonths')}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-blue-50/30 font-semibold text-blue-900">
                      <td className="py-2 px-2 border border-slate-200">
                        算出年間補助売上
                      </td>
                      {visibleForecastKeys.map((k) => {
                        const qty = sim.subsidyMonthlyQty?.[k] ?? 0;
                        const m = sim.subsidyOperatingMonths?.[k] ?? 12;
                        const total = Math.round((sim.subsidyUnitPriceYen || 0) * qty * m);
                        return (
                          <td key={k} className="py-2 px-2 border border-slate-200 text-right font-mono">
                            {formatMoney(total, displayCurrencyUnit, roundingMode)}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 原価率 & その他販管費率 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between bg-slate-50 p-2.5 border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-700 block">補助事業 原価率</span>
                  <span className="text-[11px] text-slate-500">※新事業の材料費・労務費・製造経費等の比率</span>
                </div>
                <div className="inline-flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    disabled={disabled}
                    value={sim.subsidyCostRate ?? 0}
                    onChange={(e) =>
                      onUpdate({ subsidyCostRate: parseFloat(e.target.value) || 0 })
                    }
                    className={`w-20 text-right bg-white border px-1.5 py-1 font-mono ${
                      isPinned('subsidyCostRate')
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : 'border-slate-300'
                    }`}
                    title={
                      isPinned('subsidyCostRate')
                        ? '固定中：自動調整で変更されません'
                        : undefined
                    }
                  />
                  <span className="ml-1 text-slate-500">%</span>
                  {renderPinButton('subsidyCostRate')}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-2.5 border border-slate-200">
                <div>
                  <span className="font-semibold text-slate-700 block">補助事業 その他販管費率</span>
                  <span className="text-[11px] text-slate-500">※人件費・減価償却費を除く販管費の比率</span>
                </div>
                <div className="inline-flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    disabled={disabled}
                    value={sim.subsidyOtherSgaRate ?? 0}
                    onChange={(e) =>
                      onUpdate({ subsidyOtherSgaRate: parseFloat(e.target.value) || 0 })
                    }
                    className={`w-20 text-right bg-white border px-1.5 py-1 font-mono ${
                      isPinned('subsidyOtherSgaRate')
                        ? 'border-blue-500 ring-1 ring-blue-500'
                        : 'border-slate-300'
                    }`}
                    title={
                      isPinned('subsidyOtherSgaRate')
                        ? '固定中：自動調整で変更されません'
                        : undefined
                    }
                  />
                  <span className="ml-1 text-slate-500">%</span>
                  {renderPinButton('subsidyOtherSgaRate')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ③ 減価償却 */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('depreciation')}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200 text-left font-bold text-xs text-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span>③ 減価償却 前提値（既存資産償却費・新規導入資産台帳）</span>
          </div>
          {openSections.depreciation ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {openSections.depreciation && (
          <div className="p-4 space-y-4 text-xs">
            {/* 既存資産の減価償却費（年度列表） */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                既存保有資産の減価償却費（円）
              </label>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      {visibleForecastKeys.map((k) => (
                        <th key={k} className="py-2 px-2 text-center border border-slate-200 font-medium">
                          {periodLabels[k] || k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="text"
                              disabled={disabled}
                              defaultValue={formatMoney(
                                sim.existingDepreciationYen?.[k] ?? 0,
                                displayCurrencyUnit,
                                roundingMode,
                                false
                              )}
                              onBlur={(e) =>
                                handleForecastMoneyChange('existingDepreciationYen', k, e.target.value)
                              }
                              className={`w-24 text-right bg-white border px-1 py-0.5 font-mono ${
                                isPinned('existingDepreciationYen')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('existingDepreciationYen')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                            {renderPinButton('existingDepreciationYen')}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 新規導入資産一覧 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">
                    新規投資・導入資産台帳（定額法・月割按分）
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ※事業完了期以降に取得する設備・システム。配分方法に応じて既存/補助事業へ配分されます。
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddAsset}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>資産を追加</span>
                </button>
              </div>

              {(!sim.assets || sim.assets.length === 0) ? (
                <div className="border border-dashed border-slate-300 p-4 text-center text-slate-400 bg-slate-50">
                  新規導入資産は登録されていません。「資産を追加」ボタンから登録できます。
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="py-2 px-2.5 text-left border border-slate-200">資産名称</th>
                        <th className="py-2 px-2.5 text-right border border-slate-200">取得価額</th>
                        <th className="py-2 px-2.5 text-center border border-slate-200">取得年月</th>
                        <th className="py-2 px-2.5 text-center border border-slate-200">耐用年数</th>
                        <th className="py-2 px-2.5 text-left border border-slate-200">配分先</th>
                        <th className="py-2 px-2 text-center border border-slate-200 w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sim.assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50">
                          <td className="p-1.5 border border-slate-200">
                            <input
                              type="text"
                              disabled={disabled}
                              value={asset.name}
                              onChange={(e) => handleUpdateAsset(asset.id, { name: e.target.value })}
                              className="w-full bg-white border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="p-1.5 border border-slate-200 text-right">
                            <div className="inline-flex items-center">
                              <input
                                type="text"
                                disabled={disabled}
                                defaultValue={formatMoney(asset.acquisitionCostYen, displayCurrencyUnit, roundingMode, false)}
                                onBlur={(e) =>
                                  handleUpdateAsset(asset.id, {
                                    acquisitionCostYen: parseToYen(e.target.value, displayCurrencyUnit),
                                  })
                                }
                                className="w-24 text-right bg-white border border-slate-300 px-1 py-1 font-mono"
                              />
                              <span className="ml-1 text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                            </div>
                          </td>
                          <td className="p-1.5 border border-slate-200 text-center">
                            <input
                              type="month"
                              disabled={disabled}
                              value={asset.acquisitionYm}
                              onChange={(e) => handleUpdateAsset(asset.id, { acquisitionYm: e.target.value })}
                              className="bg-white border border-slate-300 px-1.5 py-1 text-xs"
                            />
                          </td>
                          <td className="p-1.5 border border-slate-200 text-center">
                            <div className="inline-flex items-center">
                              <input
                                type="number"
                                min="1"
                                disabled={disabled}
                                value={asset.usefulLifeYears}
                                onChange={(e) =>
                                  handleUpdateAsset(asset.id, {
                                    usefulLifeYears: parseInt(e.target.value, 10) || 1,
                                  })
                                }
                                className="w-14 text-center bg-white border border-slate-300 px-1 py-1 font-mono"
                              />
                              <span className="ml-1 text-slate-500">年</span>
                            </div>
                          </td>
                          <td className="p-1.5 border border-slate-200">
                            <select
                              disabled={disabled}
                              value={asset.allocation}
                              onChange={(e) =>
                                handleUpdateAsset(asset.id, {
                                  allocation: e.target.value as SimAsset['allocation'],
                                })
                              }
                              className="w-full bg-white border border-slate-300 px-1.5 py-1 text-xs"
                            >
                              <option value="subsidyOnly">補助事業専従（全額補助へ配分）</option>
                              <option value="salesRatio">売上比率按分（人件費等と按分）</option>
                              <option value="existingOnly">既存事業専従（全額既存へ配分）</option>
                            </select>
                          </td>
                          <td className="p-1.5 border border-slate-200 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(asset.id)}
                              disabled={disabled}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      </div>

      {/* ========================================================= */}
      {/* ④ 人員・給与 */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('labor')}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200 text-left font-bold text-xs text-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>④ 人員・給与 前提値（増員数・給与伸び率・人件費給与割合・役員報酬）</span>
          </div>
          {openSections.labor ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {openSections.labor && (
          <div className="p-4 space-y-4 text-xs">
            {/* 増員数 & 給与伸び率（年度列表） */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                期中増員数（名）および 一人当たり給与伸び率（前年比 %）
              </label>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="py-2 px-2 text-left border border-slate-200 font-semibold w-40">
                        項目 / 期
                      </th>
                      {visibleForecastKeys.map((k) => (
                        <th key={k} className="py-2 px-2 text-center border border-slate-200 font-medium">
                          {periodLabels[k] || k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-2 border border-slate-200 font-medium text-slate-700">
                        期中増員数
                      </td>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="number"
                              disabled={disabled}
                              value={sim.headcountIncrease?.[k] ?? 0}
                              onChange={(e) =>
                                handleForecastNumberChange('headcountIncrease', k, parseInt(e.target.value, 10) || 0)
                              }
                              className={`w-16 text-right bg-white border px-1 py-0.5 font-mono ${
                                isPinned('headcountIncrease')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('headcountIncrease')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">名</span>
                            {renderPinButton('headcountIncrease')}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="py-2 px-2 border border-slate-200 font-medium text-slate-700">
                        一人当たり給与伸び率
                      </td>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="number"
                              step="0.1"
                              disabled={disabled}
                              value={sim.perCapitaWageGrowthRate?.[k] ?? 0}
                              onChange={(e) =>
                                handleForecastNumberChange(
                                  'perCapitaWageGrowthRate',
                                  k,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className={`w-16 text-right bg-white border px-1 py-0.5 font-mono ${
                                isPinned('perCapitaWageGrowthRate')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('perCapitaWageGrowthRate')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">%</span>
                            {renderPinButton('perCapitaWageGrowthRate')}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 人件費に占める給与の割合（未入力チェック・赤枠） */}
            <div
              className={`p-3 border rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                sim.salaryShareOfLaborCostPercent === null ||
                sim.salaryShareOfLaborCostPercent === undefined ||
                sim.salaryShareOfLaborCostPercent <= 0
                  ? 'bg-rose-50 border-2 border-rose-500'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">人件費に占める給与の割合</span>
                  {(sim.salaryShareOfLaborCostPercent === null ||
                    sim.salaryShareOfLaborCostPercent === undefined ||
                    sim.salaryShareOfLaborCostPercent <= 0) && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded-xs">
                      必須（未入力）
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  全社人件費 ＝ 全従業員給与総額 ÷（割合%）。空欄の場合は人件費が0円となりエラー表示されます。
                </span>
              </div>
              <div className="inline-flex items-center">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="100"
                  disabled={disabled}
                  placeholder="未入力"
                  value={sim.salaryShareOfLaborCostPercent ?? ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    onUpdate({
                      salaryShareOfLaborCostPercent: val === '' ? null : parseFloat(val) || 0,
                    });
                  }}
                  className={`w-24 text-right px-2 py-1 font-mono font-bold ${
                    sim.salaryShareOfLaborCostPercent === null ||
                    sim.salaryShareOfLaborCostPercent === undefined ||
                    sim.salaryShareOfLaborCostPercent <= 0
                      ? 'bg-white border-2 border-rose-500 text-rose-900'
                      : isPinned('salaryShareOfLaborCostPercent')
                      ? 'bg-white border-blue-500 ring-1 ring-blue-500 text-slate-900'
                      : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                  title={
                    isPinned('salaryShareOfLaborCostPercent')
                      ? '固定中：自動調整で変更されません'
                      : undefined
                  }
                />
                <span className="ml-1 text-slate-600 font-semibold">%</span>
                {renderPinButton('salaryShareOfLaborCostPercent')}
              </div>
            </div>

            {/* 役員報酬（割合/金額 切替） */}
            <div className="p-3 bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-700">役員報酬の算出方式:</span>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="directorRemunerationMode"
                      value="ratio"
                      checked={sim.directorRemunerationMode === 'ratio'}
                      disabled={disabled}
                      onChange={() => onUpdate({ directorRemunerationMode: 'ratio' })}
                      className="text-blue-600"
                    />
                    <span>人件費に対する割合（%）</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="directorRemunerationMode"
                      value="amount"
                      checked={sim.directorRemunerationMode === 'amount'}
                      disabled={disabled}
                      onChange={() => onUpdate({ directorRemunerationMode: 'amount' })}
                      className="text-blue-600"
                    />
                    <span>年度別金額指定</span>
                  </label>
                </div>

                {sim.directorRemunerationMode === 'ratio' && (
                  <div className="inline-flex items-center">
                    <span className="text-slate-600 mr-2">人件費に対する割合:</span>
                    <input
                      type="number"
                      step="0.1"
                      disabled={disabled}
                      value={sim.directorRemunerationRatioPercent ?? 0}
                      onChange={(e) =>
                        onUpdate({
                          directorRemunerationRatioPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={`w-20 text-right bg-white border px-1.5 py-0.5 font-mono ${
                        isPinned('directorRemunerationRatioPercent')
                          ? 'border-blue-500 ring-1 ring-blue-500'
                          : 'border-slate-300'
                      }`}
                      title={
                        isPinned('directorRemunerationRatioPercent')
                          ? '固定中：自動調整で変更されません'
                          : undefined
                      }
                    />
                    <span className="ml-1 text-slate-500">%</span>
                    {renderPinButton('directorRemunerationRatioPercent')}
                  </div>
                )}
              </div>

              {sim.directorRemunerationMode === 'amount' && (
                <div className="overflow-x-auto pt-1">
                  <table className="w-full border-collapse border border-slate-200 bg-white">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        {visibleForecastKeys.map((k) => (
                          <th key={k} className="py-1.5 px-2 text-center border border-slate-200 font-medium">
                            {periodLabels[k] || k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {visibleForecastKeys.map((k) => (
                          <td key={k} className="p-1 border border-slate-200 text-center">
                            <div className="inline-flex items-center justify-center">
                              <input
                                type="text"
                                disabled={disabled}
                                defaultValue={formatMoney(
                                  sim.directorRemunerationAmountYen?.[k] ?? 0,
                                  displayCurrencyUnit,
                                  roundingMode,
                                  false
                                )}
                                onBlur={(e) =>
                                  handleForecastMoneyChange('directorRemunerationAmountYen', k, e.target.value)
                                }
                                className={`w-22 text-right bg-white border px-1 py-0.5 font-mono ${
                                  isPinned('directorRemunerationAmountYen')
                                    ? 'border-blue-500 ring-1 ring-blue-500'
                                    : 'border-slate-300'
                                }`}
                                title={
                                  isPinned('directorRemunerationAmountYen')
                                    ? '固定中：自動調整で変更されません'
                                    : undefined
                                }
                              />
                              <span className="ml-1 text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                              {renderPinButton('directorRemunerationAmountYen')}
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ⑤ 営業外・税 */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('nonOpTax')}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200 text-left font-bold text-xs text-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-blue-600" />
            <span>⑤ 営業外収益・費用・法人税率</span>
          </div>
          {openSections.nonOpTax ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {openSections.nonOpTax && (
          <div className="p-4 space-y-4 text-xs">
            {/* 営業外収益 & 営業外費用（年度列表） */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                営業外収益・費用（円）
              </label>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="py-2 px-2 text-left border border-slate-200 font-semibold w-36">
                        科目 / 期
                      </th>
                      {visibleForecastKeys.map((k) => (
                        <th key={k} className="py-2 px-2 text-center border border-slate-200 font-medium">
                          {periodLabels[k] || k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-2 border border-slate-200 font-medium text-slate-700">
                        営業外収益
                      </td>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="text"
                              disabled={disabled}
                              defaultValue={formatMoney(
                                sim.nonOperatingIncomeYen?.[k] ?? 0,
                                displayCurrencyUnit,
                                roundingMode,
                                false
                              )}
                              onBlur={(e) =>
                                handleForecastMoneyChange('nonOperatingIncomeYen', k, e.target.value)
                              }
                              className={`w-22 text-right bg-white border px-1 py-0.5 font-mono ${
                                isPinned('nonOperatingIncomeYen')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('nonOperatingIncomeYen')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                            {renderPinButton('nonOperatingIncomeYen')}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="py-2 px-2 border border-slate-200 font-medium text-slate-700">
                        営業外費用
                      </td>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="text"
                              disabled={disabled}
                              defaultValue={formatMoney(
                                sim.nonOperatingExpensesYen?.[k] ?? 0,
                                displayCurrencyUnit,
                                roundingMode,
                                false
                              )}
                              onBlur={(e) =>
                                handleForecastMoneyChange('nonOperatingExpensesYen', k, e.target.value)
                              }
                              className={`w-22 text-right bg-white border px-1 py-0.5 font-mono ${
                                isPinned('nonOperatingExpensesYen')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('nonOperatingExpensesYen')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                            {renderPinButton('nonOperatingExpensesYen')}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 法人税等実効税率（「仮」バッジ表示） */}
            <div className="flex items-center justify-between bg-slate-50 p-3 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">
                  法人税等の実効税率（シミュレーション用）
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-xs">
                  仮
                </span>
                <span className="text-[11px] text-slate-500">
                  ※税引前利益がプラスの場合のみ、この税率で法人税等を自動算定します。
                </span>
              </div>
              <div className="inline-flex items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  disabled={disabled}
                  value={sim.incomeTaxRatePercent ?? 30}
                  onChange={(e) =>
                    onUpdate({ incomeTaxRatePercent: parseFloat(e.target.value) || 0 })
                  }
                  className={`w-20 text-right bg-white border px-2 py-1 font-mono font-semibold ${
                    isPinned('incomeTaxRatePercent')
                      ? 'border-blue-500 ring-1 ring-blue-500'
                      : 'border-slate-300'
                  }`}
                  title={
                    isPinned('incomeTaxRatePercent')
                      ? '固定中：自動調整で変更されません'
                      : undefined
                  }
                />
                <span className="ml-1 text-slate-600 font-semibold">%</span>
                {renderPinButton('incomeTaxRatePercent')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ⑥ 最低賃金 */}
      {/* ========================================================= */}
      <div className="bg-white border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection('minWage')}
          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border-b border-slate-200 text-left font-bold text-xs text-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>⑥ 最低賃金 前提値（事業場内最低賃金・地域別最低賃金）</span>
          </div>
          {openSections.minWage ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {openSections.minWage && (
          <div className="p-4 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                事業場内最低賃金および地域別最低賃金（円/時）
              </label>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="py-2 px-2 text-left border border-slate-200 font-semibold w-40">
                        項目 / 期
                      </th>
                      {visibleForecastKeys.map((k) => (
                        <th key={k} className="py-2 px-2 text-center border border-slate-200 font-medium">
                          {periodLabels[k] || k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-2 border border-slate-200 font-medium text-slate-700">
                        事業場内 最低賃金
                      </td>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="number"
                              disabled={disabled}
                              value={sim.workplaceMinWage?.[k] ?? 0}
                              onChange={(e) =>
                                handleForecastNumberChange('workplaceMinWage', k, parseInt(e.target.value, 10) || 0)
                              }
                              className={`w-20 text-right bg-white border px-1 py-0.5 font-mono ${
                                isPinned('workplaceMinWage')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('workplaceMinWage')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">円</span>
                            {renderPinButton('workplaceMinWage')}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="py-2 px-2 border border-slate-200 font-medium text-slate-700">
                        地域別 最低賃金（手入力）
                      </td>
                      {visibleForecastKeys.map((k) => (
                        <td key={k} className="p-1.5 border border-slate-200 text-center">
                          <div className="inline-flex items-center justify-center">
                            <input
                              type="number"
                              disabled={disabled}
                              value={sim.regionalMinWage?.[k] ?? 0}
                              onChange={(e) =>
                                handleForecastNumberChange('regionalMinWage', k, parseInt(e.target.value, 10) || 0)
                              }
                              className={`w-20 text-right bg-white border px-1 py-0.5 font-mono ${
                                isPinned('regionalMinWage')
                                  ? 'border-blue-500 ring-1 ring-blue-500'
                                  : 'border-slate-300'
                              }`}
                              title={
                                isPinned('regionalMinWage')
                                  ? '固定中：自動調整で変更されません'
                                  : undefined
                              }
                            />
                            <span className="ml-1 text-slate-500">円</span>
                            {renderPinButton('regionalMinWage')}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 【STEP C】逆算（自動調整）ソルバーパネル */}
      {solverCandidates && track && requirements && onUpdateSolverTargets && onApplySolverResult && onNotify && (
        <SolverPanel
          fm={fm}
          solverCandidates={solverCandidates}
          track={track}
          requirements={requirements}
          disabled={disabled}
          onUpdateSolverTargets={onUpdateSolverTargets}
          onApplySolverResult={onApplySolverResult}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};

