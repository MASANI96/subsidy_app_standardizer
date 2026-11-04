import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Lock, Unlock } from 'lucide-react';
import { SUBSIDY_TYPES } from '../data/initialData';
import { computeMappedExpenseRows } from '../data/subsidyFormatMapping';
import {
  CallRound,
  DepreciationMethod,
  EffectEstimateItem,
  FinancialPeriodKey,
  FinancialYearData,
  HearingVariables,
  InvestmentPlan,
  Project,
  Role,
  SubsidyRequirementThresholds,
  SubsidySpecialFlags,
  SubsidyType,
} from '../types';
import {
  calculateDriverEstimates,
  calculateNewDepreciationSchedule,
  calculateOperatingMargin,
  calculatePaybackYears,
  calculatePerCapitaWage,
  evaluateSubsidyRequirements,
} from '../utils/financialCalculations';
import { canConfirmGate, canEdit } from '../utils/permissions';
import {
  ReadOnlyRoleBadge,
  SpecTagBadge,
  WorkspaceEffectBadge,
} from './SpecTagBadge';

interface FinancialMasterEditorProps {
  project: Project;
  role: Role;
  thresholds: SubsidyRequirementThresholds;
  activeCallRound: CallRound;
  effectEstimate?: EffectEstimateItem;
  onUpdateFinancialField: (
    projectId: string,
    period: FinancialPeriodKey,
    field: keyof FinancialYearData,
    value: number
  ) => void;
  onUpdateInvestmentPlan: (
    projectId: string,
    updates: Partial<InvestmentPlan>
  ) => void;
  onUpdateHearingVariables: (
    projectId: string,
    variables: HearingVariables
  ) => void;
  onApplyDriversToForecast: (projectId: string) => void;
  onUpdateSpecialFlags: (
    projectId: string,
    flags: Partial<SubsidySpecialFlags>
  ) => void;
  onLockFinancialPlan: (projectId: string) => void;
  onUnlockFinancialPlan: (projectId: string) => void;
  onNavigateToEditor: () => void;
  onNavigateToThresholdsAdmin: () => void;
  onNotify: (message: string) => void;
}

const PERIOD_COLUMNS: {
  key: FinancialPeriodKey;
  label: string;
  subLabel: string;
  isForecast: boolean;
}[] = [
  { key: 'yMinus3', label: '前々々期', subLabel: '実績 (Y-3)', isForecast: false },
  { key: 'yMinus2', label: '前々期', subLabel: '実績 (Y-2)', isForecast: false },
  { key: 'yMinus1', label: '直前期', subLabel: '基準期 (Y-1)', isForecast: false },
  { key: 'y1', label: '将来1年目', subLabel: '事業化1年 (Y1)', isForecast: true },
  { key: 'y2', label: '将来2年目', subLabel: '事業化2年 (Y2)', isForecast: true },
  { key: 'y3', label: '将来3年目', subLabel: '目標判定 (Y3)', isForecast: true },
];

type RowDef = {
  field: keyof FinancialYearData;
  label: string;
  unit: string;
  isCalculated?: boolean;
  formulaHint?: string;
  isHighlighted?: boolean;
  isIndented?: boolean;
};

const SPREADSHEET_ROWS: RowDef[] = [
  { field: 'sales', label: '売上高', unit: '万円' },
  { field: 'costOfSales', label: '売上原価', unit: '万円' },
  {
    field: 'grossProfit',
    label: '売上総利益（粗利）',
    unit: '万円',
    isCalculated: true,
    formulaHint: '売上高 - 売上原価',
  },
  { field: 'sga', label: '販売費及び一般管理費', unit: '万円' },
  {
    field: 'laborCost',
    label: 'うち人件費（労務費含）',
    unit: '万円',
    isIndented: true,
  },
  {
    field: 'depreciation',
    label: 'うち減価償却費（投資連動）',
    unit: '万円',
    isIndented: true,
  },
  {
    field: 'operatingProfit',
    label: '営業利益',
    unit: '万円',
    isCalculated: true,
    formulaHint: '売上総利益 - 販管費',
    isHighlighted: true,
  },
  { field: 'ordinaryProfit', label: '経常利益', unit: '万円' },
  { field: 'netProfit', label: '当期純利益', unit: '万円' },
  {
    field: 'valueAdded',
    label: '付加価値額（公募判定基準）',
    unit: '万円',
    isCalculated: true,
    formulaHint: '営業利益 + 人件費 + 減価償却費',
    isHighlighted: true,
  },
  { field: 'employees', label: '従業員数', unit: '名' },
  { field: 'totalWages', label: '給与支給総額（賃上げ基礎）', unit: '万円' },
];

export const FinancialMasterEditor: React.FC<FinancialMasterEditorProps> = ({
  project,
  role,
  thresholds,
  activeCallRound,
  effectEstimate,
  onUpdateFinancialField,
  onUpdateInvestmentPlan,
  onUpdateHearingVariables,
  onApplyDriversToForecast,
  onUpdateSpecialFlags,
  onLockFinancialPlan,
  onUnlockFinancialPlan,
  onNavigateToEditor,
  onNavigateToThresholdsAdmin,
  onNotify,
}) => {
  const [formatSubTab, setFormatSubTab] =
    useState<SubsidyType>('新事業進出補助金');

  const fm = project.financialMaster;
  const inv = fm.investment;
  const hv = project.hearingVariables;
  const flags = fm.specialFlags;
  const isLocked = fm.status === 'locked';

  const canEditFin = canEdit(role, 'financial_edit');
  const canConfirmG2 = canConfirmGate(role, 'gate-2');
  const inputsDisabled = isLocked || !canEditFin;

  const depSchedule = useMemo(
    () =>
      calculateNewDepreciationSchedule(
        inv.totalInvestment,
        inv.depreciationMethod,
        inv.usefulLifeYears
      ),
    [inv.totalInvestment, inv.depreciationMethod, inv.usefulLifeYears]
  );

  const payback = useMemo(() => calculatePaybackYears(fm), [fm]);

  const driverEst = useMemo(
    () => calculateDriverEstimates(hv, fm.historical.yMinus1.sales),
    [hv, fm.historical.yMinus1.sales]
  );

  const evalSummary = useMemo(
    () => evaluateSubsidyRequirements(fm, thresholds),
    [fm, thresholds]
  );

  const mappedExpenseRows = useMemo(
    () => computeMappedExpenseRows(formatSubTab, inv),
    [formatSubTab, inv]
  );

  const totalFunding = inv.subsidyRequested + inv.ownFunds + inv.bankLoan;
  const fundingGap = totalFunding - inv.totalInvestment;

  const getPeriodData = (key: FinancialPeriodKey): FinancialYearData => {
    if (key === 'yMinus3' || key === 'yMinus2' || key === 'yMinus1') {
      return fm.historical[key];
    }
    return fm.forecast[key];
  };

  // 要件未達時の必要増加額アドバイス計算（M8）
  const requiredVaY3 = Math.ceil(
    fm.historical.yMinus1.valueAdded *
      Math.pow(1 + thresholds.shinJigyo.valueAddedGrowthRateAnnual / 100, 3)
  );
  const vaShortfall = Math.max(0, requiredVaY3 - fm.forecast.y3.valueAdded);

  const targetPcWageRate = evalSummary.shinJigyo.targetPerCapitaWageGrowth;
  const requiredPerCapitaY3 = Number(
    (
      evalSummary.perCapitaWageBase *
      Math.pow(1 + targetPcWageRate / 100, 3)
    ).toFixed(1)
  );
  const requiredTotalWagesY3 = Math.ceil(
    requiredPerCapitaY3 * Math.max(1, fm.forecast.y3.employees)
  );
  const wageShortfall = Math.max(
    0,
    requiredTotalWagesY3 - fm.forecast.y3.totalWages
  );

  const handleConfirmLock = () => {
    if (!canConfirmG2) return;
    onLockFinancialPlan(project.id);
    onNotify(
      `「${project.companyName}」の収支計画マスターを確定し、Gate 2を通過しました。「04. 申請書 作成・編集」のロックが解除されました。`
    );
  };

  const handleUnlock = () => {
    if (!canConfirmG2) return;
    onUnlockFinancialPlan(project.id);
    onNotify(
      '収支計画マスターのロックを解除しました。数値を再編集できます（確定するまで申請書編集は一時ロックされます）。'
    );
  };

  const handleApplyDrivers = () => {
    if (inputsDisabled) return;
    onApplyDriversToForecast(project.id);
    onNotify(
      `算定根拠（直前期売上 ${fm.historical.yMinus1.sales.toLocaleString()}万円 ＋ 新事業売上）を将来1〜3年目の売上高（${driverEst.forecastSalesY1ManYen.toLocaleString()} / ${driverEst.forecastSalesY2ManYen.toLocaleString()} / ${driverEst.forecastSalesY3ManYen.toLocaleString()}万円）へ反映しました。`
    );
  };

  const updateDriverVar = (
    key:
      | 'newUnitPrice'
      | 'newCustomerCountY1'
      | 'newCustomerCountY2'
      | 'newCustomerCountY3'
      | 'reducedWorkHours'
      | 'hourlyWage'
      | 'subcontractReduction',
    val: number
  ) => {
    if (inputsDisabled) return;
    onUpdateHearingVariables(project.id, {
      ...hv,
      [key]: {
        ...hv[key],
        value: val,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>
              ワークスペース タブ3 · 財務諸表・算定根拠・様式換算・3制度要件判定（ロール:{' '}
              {role} · 単位: 万円統一）
            </span>
            <SpecTagBadge tag="指示書 4-② / Step3" />
            <SpecTagBadge tag="指示書 ゴール" />
            <WorkspaceEffectBadge estimate={effectEstimate} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              収支計画マスター計算シート
            </h1>
            {isLocked ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300">
                <Lock className="w-3.5 h-3.5" />
                Gate 2 通過・数値確定ロック中（{fm.lockedAt}）
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300">
                <Unlock className="w-3.5 h-3.5" />
                下書き・編集中（Gate 2 未確定）
              </span>
            )}
            {!canEditFin && <ReadOnlyRoleBadge role={role} />}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            対象案件:{' '}
            <span className="font-semibold text-slate-900">
              {project.companyName}
            </span>
            {' · '}適用公募回: <span className="font-medium">{activeCallRound.name}</span>
            {' · '}確定した財務数値・投資内訳が3つの補助金様式および文章モジュールの変数タグへ一元連動します。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLocked ? (
            <>
              <button
                type="button"
                disabled={!canConfirmG2}
                onClick={handleUnlock}
                className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                ロックを解除して再編集
              </button>
              <button
                type="button"
                onClick={onNavigateToEditor}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                04. 申請書 作成・編集へ進む →
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canConfirmG2}
              onClick={handleConfirmLock}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              この収支計画で確定する（Gate 2 通過）
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: Investment, Funding & Depreciation Setup */}
      <section
        data-guide-id="guide-fin-investment"
        className="bg-white border border-slate-200 p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                01. 設備投資内訳・資金調達前提・減価償却ルール設定
              </h2>
              <SpecTagBadge tag="指示書 4-②" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              金額・償却方式・耐用年数を変更すると、下表「将来1〜3年目の減価償却費・付加価値額」がリアルタイムに自動再計算されます。
            </p>
          </div>
          {isLocked && (
            <span className="text-xs font-medium text-slate-500">
              ※現在Gate 2ロック中のため入力欄は保護されています
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Investment Breakdown */}
          <div className="border border-slate-200 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
              A. 設備投資額の内訳（万円・税抜）
            </div>

            {(
              [
                { key: 'machineryCost', label: '機械装置・工具器具費' },
                { key: 'systemCost', label: 'システム・ソフトウェア費' },
                { key: 'subcontractCost', label: '外注費・専門家経費' },
                { key: 'otherCost', label: 'その他補助対象経費' },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <label className="text-slate-700">{item.label}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    disabled={inputsDisabled}
                    value={inv[item.key]}
                    onChange={(e) =>
                      onUpdateInvestmentPlan(project.id, {
                        [item.key]: Number(e.target.value) || 0,
                      })
                    }
                    className="w-28 text-right font-mono tabular-nums border border-slate-300 px-2.5 py-1 text-xs text-slate-900 bg-white disabled:bg-slate-100 focus:outline-none focus:border-slate-800"
                  />
                  <span className="text-slate-500">万円</span>
                </div>
              </div>
            ))}

            <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                総投資額（自動集計）
              </span>
              <span className="font-mono tabular-nums text-base font-bold text-slate-900">
                {inv.totalInvestment.toLocaleString()} 万円
              </span>
            </div>
          </div>

          {/* Column 2: Funding Plan */}
          <div className="border border-slate-200 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
              B. 資金調達内訳（万円）
            </div>

            {(
              [
                { key: 'subsidyRequested', label: '補助金 申請希望額' },
                { key: 'ownFunds', label: '自己資金充当額' },
                { key: 'bankLoan', label: '金融機関 借入予定額' },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <label className="text-slate-700">{item.label}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step={10}
                    disabled={inputsDisabled}
                    value={inv[item.key]}
                    onChange={(e) =>
                      onUpdateInvestmentPlan(project.id, {
                        [item.key]: Number(e.target.value) || 0,
                      })
                    }
                    className="w-28 text-right font-mono tabular-nums border border-slate-300 px-2.5 py-1 text-xs text-slate-900 bg-white disabled:bg-slate-100 focus:outline-none focus:border-slate-800"
                  />
                  <span className="text-slate-500">万円</span>
                </div>
              </div>
            ))}

            <div className="pt-2.5 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">資金調達 合計</span>
                <span className="font-mono tabular-nums text-base font-bold text-slate-900">
                  {totalFunding.toLocaleString()} 万円
                </span>
              </div>
              {fundingGap === 0 ? (
                <div className="text-[11px] text-emerald-800 font-medium">
                  総投資額と調達合計が完全一致しています（差額 0万円）
                </div>
              ) : fundingGap > 0 ? (
                <div className="text-[11px] text-sky-800 font-medium">
                  総投資額に対し +{fundingGap.toLocaleString()}万円 の運転資金余裕あり
                </div>
              ) : (
                <div className="text-[11px] text-rose-800 font-semibold">
                  調達不足: あと {Math.abs(fundingGap).toLocaleString()}万円 の自己資金または借入が必要です
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Depreciation & Payback Auto Preview */}
          <div className="border border-slate-200 p-4 space-y-3 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
              C. 減価償却自動計算 ＆ 回収年数プレビュー
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="dep-method-select" className="text-slate-700">
                減価償却方式
              </label>
              <select
                id="dep-method-select"
                disabled={inputsDisabled}
                value={inv.depreciationMethod}
                onChange={(e) =>
                  onUpdateInvestmentPlan(project.id, {
                    depreciationMethod: e.target.value as DepreciationMethod,
                  })
                }
                className="bg-white border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-slate-800"
              >
                <option value="straight-line">定額法（均等償却）</option>
                <option value="declining-balance">定率法（200%定率償却）</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="useful-life-input" className="text-slate-700">
                法定耐用年数
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="useful-life-input"
                  type="number"
                  min={1}
                  max={30}
                  disabled={inputsDisabled}
                  value={inv.usefulLifeYears}
                  onChange={(e) =>
                    onUpdateInvestmentPlan(project.id, {
                      usefulLifeYears: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="w-20 text-right font-mono tabular-nums border border-slate-300 px-2.5 py-1 text-xs text-slate-900 bg-white disabled:bg-slate-100 focus:outline-none focus:border-slate-800"
                />
                <span className="text-slate-500">
                  年（償却率 {depSchedule.ratePercent}%）
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-3 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-800">
                新規投資分の各期償却費（自動加算値）
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono tabular-nums pt-1">
                <div>
                  <span className="text-[11px] text-slate-500 block">1年目</span>
                  <span className="font-bold text-slate-900">
                    +{depSchedule.y1.toLocaleString()}万
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">2年目</span>
                  <span className="font-bold text-slate-900">
                    +{depSchedule.y2.toLocaleString()}万
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">3年目</span>
                  <span className="font-bold text-slate-900">
                    +{depSchedule.y3.toLocaleString()}万
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600">投資回収年数（CF概算）:</span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                約 {payback.years} 年（年CF増{' '}
                {payback.annualCashFlowIncrease.toLocaleString()}万円）
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 (M2): Revenue & Cost Calculation Basis */}
      <section
        data-guide-id="guide-fin-drivers"
        className="bg-white border border-slate-200 p-6 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                02. 売上・コスト算定根拠（単価×数量／削減工数）
              </h2>
              <SpecTagBadge tag="指示書 Step3" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              「タブ2: マスターヒアリングシート」の算定変数と双方向連動しています。計算式を確認し、将来3ヶ年の売上高計画（既存事業据置＋新事業売上）へワンクリックで反映できます。
            </p>
          </div>

          <button
            type="button"
            disabled={inputsDisabled}
            onClick={handleApplyDrivers}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            算定結果を将来3ヶ年計画へ反映
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* New Business Sales Formula Box */}
          <div className="border border-slate-200 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
              A. 新事業売上（1〜3年目）＝ 新事業客単価 × 想定客数／受注件数
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  新事業客単価（円）
                </label>
                <input
                  type="number"
                  step={1000}
                  disabled={inputsDisabled}
                  value={hv.newUnitPrice.value}
                  onChange={(e) =>
                    updateDriverVar('newUnitPrice', Number(e.target.value) || 0)
                  }
                  className="w-full text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  1年目 客数（件/年）
                </label>
                <input
                  type="number"
                  disabled={inputsDisabled}
                  value={hv.newCustomerCountY1.value}
                  onChange={(e) =>
                    updateDriverVar(
                      'newCustomerCountY1',
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-full text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  2年目 客数（件/年）
                </label>
                <input
                  type="number"
                  disabled={inputsDisabled}
                  value={hv.newCustomerCountY2.value}
                  onChange={(e) =>
                    updateDriverVar(
                      'newCustomerCountY2',
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-full text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  3年目 客数（件/年）
                </label>
                <input
                  type="number"
                  disabled={inputsDisabled}
                  value={hv.newCustomerCountY3.value}
                  onChange={(e) =>
                    updateDriverVar(
                      'newCustomerCountY3',
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-full text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs font-mono tabular-nums">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600">1年目 新事業売上:</span>
                <span className="font-semibold text-slate-900">
                  {hv.newUnitPrice.value.toLocaleString()}円 ×{' '}
                  {hv.newCustomerCountY1.value.toLocaleString()}件 ={' '}
                  {driverEst.newSalesY1ManYen.toLocaleString()}万円
                  <span className="text-slate-500 font-normal">
                    （全社計 {driverEst.forecastSalesY1ManYen.toLocaleString()}万）
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600">2年目 新事業売上:</span>
                <span className="font-semibold text-slate-900">
                  {hv.newUnitPrice.value.toLocaleString()}円 ×{' '}
                  {hv.newCustomerCountY2.value.toLocaleString()}件 ={' '}
                  {driverEst.newSalesY2ManYen.toLocaleString()}万円
                  <span className="text-slate-500 font-normal">
                    （全社計 {driverEst.forecastSalesY2ManYen.toLocaleString()}万）
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600">3年目 新事業売上:</span>
                <span className="font-bold text-emerald-900">
                  {hv.newUnitPrice.value.toLocaleString()}円 ×{' '}
                  {hv.newCustomerCountY3.value.toLocaleString()}件 ={' '}
                  {driverEst.newSalesY3ManYen.toLocaleString()}万円
                  <span className="text-slate-600 font-normal">
                    （全社計 {driverEst.forecastSalesY3ManYen.toLocaleString()}万）
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Cost Reduction Formula Box */}
          <div className="border border-slate-200 p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                B. 年間コスト削減額 ＝ 削減作業時間 × 時間単価 ＋ 外注費削減額
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    削減作業時間（時間/年）
                  </label>
                  <input
                    type="number"
                    step={10}
                    disabled={inputsDisabled}
                    value={hv.reducedWorkHours.value}
                    onChange={(e) =>
                      updateDriverVar(
                        'reducedWorkHours',
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    時間単価（円/時）
                  </label>
                  <input
                    type="number"
                    step={100}
                    disabled={inputsDisabled}
                    value={hv.hourlyWage.value}
                    onChange={(e) =>
                      updateDriverVar('hourlyWage', Number(e.target.value) || 0)
                    }
                    className="w-full text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">
                    外注費削減額（万円/年）
                  </label>
                  <input
                    type="number"
                    step={10}
                    disabled={inputsDisabled}
                    value={hv.subcontractReduction.value}
                    onChange={(e) =>
                      updateDriverVar(
                        'subcontractReduction',
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs font-mono tabular-nums">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600">労務工数削減換算:</span>
                <span className="text-slate-900">
                  {hv.reducedWorkHours.value.toLocaleString()}時間 ×{' '}
                  {hv.hourlyWage.value.toLocaleString()}円 ={' '}
                  {driverEst.laborCostSavingManYen.toLocaleString()}万円/年
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
                <span className="font-sans font-semibold text-slate-800">
                  年間コスト削減効果 合計:
                </span>
                <span className="font-bold text-slate-900">
                  {driverEst.laborCostSavingManYen.toLocaleString()}万円 ＋ 外注削減{' '}
                  {driverEst.subcontractSavingManYen.toLocaleString()}万円 ={' '}
                  {driverEst.totalCostReductionManYen.toLocaleString()}万円/年
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: 6-Year Financial Spreadsheet Table */}
      <section
        data-guide-id="guide-fin-historical"
        className="bg-white border border-slate-200"
      >
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                03. 直近3期 決算実績 ＆ 将来3ヶ年 収支計画表（万円単位）
              </h2>
              <SpecTagBadge tag="指示書 4-②" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              網掛け行（売上総利益・営業利益・付加価値額・一人当たり給与）は自動計算されます。付加価値額 ＝ 営業利益 ＋ 人件費 ＋ 減価償却費
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-600">
            <span>
              付加価値年率:{' '}
              <strong
                className={
                  evalSummary.shinJigyo.isVaPassed
                    ? 'text-emerald-800'
                    : 'text-rose-700'
                }
              >
                {evalSummary.vaGrowthAnnual >= 0 ? '+' : ''}
                {evalSummary.vaGrowthAnnual}%
              </strong>
            </span>
            <span>
              一人当たり給与年率:{' '}
              <strong
                className={
                  evalSummary.shinJigyo.isWagePassed
                    ? 'text-emerald-800'
                    : 'text-rose-700'
                }
              >
                {evalSummary.perCapitaWageGrowthAnnual >= 0 ? '+' : ''}
                {evalSummary.perCapitaWageGrowthAnnual}%
              </strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                <th className="py-3 px-4 min-w-[230px] sticky left-0 bg-slate-100 z-10">
                  勘定科目 / 指標（単位）
                </th>
                {PERIOD_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2.5 px-3 text-right min-w-[118px] border-l border-slate-200 whitespace-nowrap ${
                      col.key === 'yMinus1'
                        ? 'bg-slate-200/60 text-slate-900'
                        : col.isForecast
                          ? 'bg-sky-50/60 text-slate-900'
                          : ''
                    }`}
                  >
                    <div>{col.label}</div>
                    <div className="text-[11px] font-normal text-slate-500">
                      {col.subLabel}
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right min-w-[125px] border-l border-slate-200 whitespace-nowrap bg-slate-100">
                  <div>3年後変化</div>
                  <div className="text-[11px] font-normal text-slate-500">
                    Y-1比 / 年率
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {SPREADSHEET_ROWS.map((row) => {
                const baseVal = fm.historical.yMinus1[row.field];
                const y3Val = fm.forecast.y3[row.field];
                const diff = y3Val - baseVal;

                return (
                  <tr
                    key={row.field}
                    className={
                      row.isHighlighted
                        ? 'bg-slate-100/90 font-semibold'
                        : row.isCalculated
                          ? 'bg-slate-50/90 font-medium'
                          : 'bg-white hover:bg-slate-50/40'
                    }
                  >
                    <td
                      className={`py-2.5 px-4 sticky left-0 z-10 border-r border-slate-200 ${
                        row.isHighlighted
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : row.isCalculated
                            ? 'bg-slate-50 text-slate-800 font-semibold'
                            : 'bg-white text-slate-700'
                      } ${row.isIndented ? 'pl-7 text-slate-600' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{row.label}</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          {row.unit}
                        </span>
                      </div>
                      {row.formulaHint && (
                        <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                          自動計算: {row.formulaHint}
                        </div>
                      )}
                    </td>

                    {PERIOD_COLUMNS.map((col) => {
                      const yearData = getPeriodData(col.key);
                      const cellValue = yearData[row.field];
                      const marginPct =
                        row.field === 'operatingProfit'
                          ? calculateOperatingMargin(yearData)
                          : null;

                      return (
                        <td
                          key={col.key}
                          className={`py-2 px-2.5 text-right border-l border-slate-200 font-mono tabular-nums ${
                            col.isForecast && !row.isCalculated && !row.isHighlighted
                              ? 'bg-sky-50/15'
                              : ''
                          }`}
                        >
                          {row.isCalculated ? (
                            <div>
                              <span
                                className={
                                  cellValue < 0
                                    ? 'text-rose-700 font-bold'
                                    : 'text-slate-900'
                                }
                              >
                                {cellValue.toLocaleString()}
                              </span>
                              {marginPct !== null && (
                                <div className="text-[10px] font-normal text-slate-500">
                                  利益率 {marginPct.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <input
                              type="number"
                              disabled={inputsDisabled}
                              value={cellValue}
                              onChange={(e) =>
                                onUpdateFinancialField(
                                  project.id,
                                  col.key,
                                  row.field,
                                  Number(e.target.value) || 0
                                )
                              }
                              aria-label={`${col.label}の${row.label}`}
                              className="w-full max-w-[100px] text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100/70 disabled:border-transparent focus:outline-none focus:border-slate-900"
                            />
                          )}
                        </td>
                      );
                    })}

                    {/* Delta / Growth Column */}
                    <td className="py-2 px-3 text-right border-l border-slate-200 font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={
                          diff > 0
                            ? 'text-emerald-800 font-semibold'
                            : diff < 0
                              ? 'text-rose-700 font-semibold'
                              : 'text-slate-500'
                        }
                      >
                        {diff > 0
                          ? `+${diff.toLocaleString()}`
                          : diff.toLocaleString()}
                      </span>
                      {row.field === 'valueAdded' && (
                        <div className="text-[10px] text-slate-600">
                          年率 {evalSummary.vaGrowthAnnual}%
                        </div>
                      )}
                      {row.field === 'totalWages' && (
                        <div className="text-[10px] text-slate-600">
                          年率 {evalSummary.wageGrowthAnnual}%
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Calculated Per-Capita Wage Row (M8) */}
              <tr className="bg-slate-100/90 font-semibold">
                <td className="py-2.5 px-4 sticky left-0 z-10 border-r border-slate-200 bg-slate-100 text-slate-900 font-bold">
                  <div className="flex items-center justify-between gap-2">
                    <span>一人当たり給与支給総額（M8判定）</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      万円/人
                    </span>
                  </div>
                  <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                    自動計算: 給与支給総額 ÷ 従業員数
                  </div>
                </td>
                {PERIOD_COLUMNS.map((col) => {
                  const yd = getPeriodData(col.key);
                  const pc = calculatePerCapitaWage(yd);
                  return (
                    <td
                      key={col.key}
                      className="py-2 px-2.5 text-right border-l border-slate-200 font-mono tabular-nums text-slate-900"
                    >
                      {pc.toFixed(1)}
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-right border-l border-slate-200 font-mono tabular-nums whitespace-nowrap">
                  <span
                    className={
                      evalSummary.perCapitaWageY3 -
                        evalSummary.perCapitaWageBase >=
                      0
                        ? 'text-emerald-800 font-semibold'
                        : 'text-rose-700 font-semibold'
                    }
                  >
                    {evalSummary.perCapitaWageY3 -
                      evalSummary.perCapitaWageBase >=
                    0
                      ? '+'
                      : ''}
                    {(
                      evalSummary.perCapitaWageY3 -
                      evalSummary.perCapitaWageBase
                    ).toFixed(1)}
                  </span>
                  <div className="text-[10px] text-slate-600">
                    年率 {evalSummary.perCapitaWageGrowthAnnual}%
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 4 (M8): 3-Subsidy Requirement Pass/Fail Alerts & Special Flags */}
      <section
        data-guide-id="guide-fin-requirements"
        className="bg-white border border-slate-200 p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                04. 公募要件達成判定・特例シミュレーション（アラート自動検出）
              </h2>
              <SpecTagBadge tag="指示書 4-②" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              適用中「{activeCallRound.name}」の要件しきい値（2026年11月時点公開情報に基づく参考値）と、案件別の特例フラグから自動判定します。
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToThresholdsAdmin}
            className="text-xs text-slate-700 hover:text-slate-900 underline self-start sm:self-auto cursor-pointer"
          >
            公募回・要件しきい値設定（管理者画面）を確認 →
          </button>
        </div>

        {/* Warning Banner when Shin-Jigyo Requirements Fail */}
        {!evalSummary.shinJigyo.isAllPassed && (
          <div className="bg-rose-50 border border-rose-300 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                【公募要件 未達・要確認アラート】新事業進出補助金の必須要件に不足項目があります
              </span>
            </div>
            <ul className="list-disc pl-5 text-xs text-rose-900 space-y-1 leading-relaxed">
              {!evalSummary.shinJigyo.isVaPassed && (
                <li>
                  付加価値額の年平均成長率が{' '}
                  <strong>{evalSummary.vaGrowthAnnual}%</strong>{' '}
                  となっており、公募要件（年率{' '}
                  <strong>
                    {thresholds.shinJigyo.valueAddedGrowthRateAnnual}%
                  </strong>{' '}
                  以上）を下回っています。将来3年目（Y3）の付加価値額をあと{' '}
                  <strong>{vaShortfall.toLocaleString()}万円</strong> 以上（目標{' '}
                  {requiredVaY3.toLocaleString()}万円以上）引き上げる計画見直しが必要です。
                </li>
              )}
              {!evalSummary.shinJigyo.isWagePassed && (
                <li>
                  一人当たり給与支給総額の年平均成長率が{' '}
                  <strong>{evalSummary.perCapitaWageGrowthAnnual}%</strong>{' '}
                  となっており、要件（年率{' '}
                  <strong>{targetPcWageRate}%</strong>{' '}
                  以上）を下回っています。3年目の給与支給総額をあと{' '}
                  <strong>{wageShortfall.toLocaleString()}万円</strong> 以上（目標{' '}
                  {requiredTotalWagesY3.toLocaleString()}万円以上）に設定してください。
                </li>
              )}
              {!evalSummary.shinJigyo.isMinSubsidyPassed && (
                <li>
                  補助金額（換算 {evalSummary.shinJigyo.cappedSubsidy.toLocaleString()}万円 / 希望 {inv.subsidyRequested.toLocaleString()}万円）が、新事業進出補助金の補助下限額（
                  <strong>
                    {thresholds.shinJigyo.minSubsidyAmount.toLocaleString()}万円
                  </strong>
                  ）を下回っています。持続化補助金または東京都助成事業を主軸とする構成をご検討ください。
                </li>
              )}
              {!evalSummary.shinJigyo.isWithinCap && (
                <li>
                  補助金申請希望額（{inv.subsidyRequested.toLocaleString()}万円）が従業員規模区分「{evalSummary.shinJigyo.tierLabel}」の上限額（
                  <strong>
                    {evalSummary.shinJigyo.effectiveMaxCap.toLocaleString()}万円
                  </strong>
                  ）を超過しています。
                </li>
              )}
              {!evalSummary.shinJigyo.isFundingBalanced && (
                <li>
                  資金調達合計（{totalFunding.toLocaleString()}万円）が総投資額（
                  {inv.totalInvestment.toLocaleString()}万円）を下回っています。
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: 新事業進出補助金 */}
          <div className="border border-slate-200 p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900">
                  新事業進出補助金
                </h3>
                {evalSummary.shinJigyo.isAllPassed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300">
                    <Check className="w-3 h-3" />
                    全要件クリア
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-semibold text-rose-900 bg-rose-50 border border-rose-300">
                    要件未達・超過あり
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    付加価値額 年率（{thresholds.shinJigyo.valueAddedGrowthRateAnnual}%以上）
                  </span>
                  <span
                    className={`font-mono tabular-nums font-bold ${
                      evalSummary.shinJigyo.isVaPassed
                        ? 'text-emerald-800'
                        : 'text-rose-700'
                    }`}
                  >
                    {evalSummary.vaGrowthAnnual}%（
                    {evalSummary.shinJigyo.isVaPassed ? '達成' : '未達'}）
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    一人当たり給与 年率（{targetPcWageRate}%以上）
                  </span>
                  <span
                    className={`font-mono tabular-nums font-bold ${
                      evalSummary.shinJigyo.isWagePassed
                        ? 'text-emerald-800'
                        : 'text-rose-700'
                    }`}
                  >
                    {evalSummary.perCapitaWageGrowthAnnual}%（
                    {evalSummary.shinJigyo.isWagePassed ? '達成' : '未達'}）
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-600">事業場内最低賃金要件</span>
                  <span className="font-mono tabular-nums text-slate-800 font-medium">
                    地域別最賃＋{evalSummary.shinJigyo.minWagePlusYen}円以上
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-600">
                    補助率（{evalSummary.shinJigyo.appliedRateNum}/
                    {evalSummary.shinJigyo.appliedRateDen}）換算額
                  </span>
                  <span className="font-mono tabular-nums text-slate-900 font-bold">
                    {evalSummary.shinJigyo.cappedSubsidy.toLocaleString()} 万円
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                  規模区分「{evalSummary.shinJigyo.tierLabel}」上限{' '}
                  {evalSummary.shinJigyo.effectiveMaxCap.toLocaleString()}万 / 下限{' '}
                  {evalSummary.shinJigyo.minSubsidyAmount.toLocaleString()}万
                </div>
              </div>
            </div>

            {/* Special Flags */}
            <div className="pt-2.5 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="text-[11px] font-semibold text-slate-700">
                特例適用シミュレーション:
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={inputsDisabled}
                  checked={flags.shinJigyoWageSpecial}
                  onChange={(e) =>
                    onUpdateSpecialFlags(project.id, {
                      shinJigyoWageSpecial: e.target.checked,
                    })
                  }
                  className="accent-slate-900"
                />
                <span className="text-slate-700">
                  賃上げ特例（上限引上げ・給与年率{thresholds.shinJigyo.perCapitaWageGrowthSpecialAnnual}%）
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={inputsDisabled}
                  checked={flags.shinJigyoMinWageSpecial}
                  onChange={(e) =>
                    onUpdateSpecialFlags(project.id, {
                      shinJigyoMinWageSpecial: e.target.checked,
                    })
                  }
                  className="accent-slate-900"
                />
                <span className="text-slate-700">
                  地域別最低賃金引上げ特例（補助率2/3・最賃+{thresholds.shinJigyo.minWageSpecialPlusYen}円）
                </span>
              </label>
            </div>
          </div>

          {/* Card 2: 小規模事業者持続化補助金 */}
          <div className="border border-slate-200 p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900">
                  小規模事業者持続化補助金
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300">
                  上限 {evalSummary.jizokuka.effectiveMaxCap}万円
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">補助対象経費 合計</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {evalSummary.jizokuka.eligibleExpense.toLocaleString()} 万円
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    補助率（{evalSummary.jizokuka.appliedRateNum}/
                    {evalSummary.jizokuka.appliedRateDen}）上限適用額
                  </span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {evalSummary.jizokuka.cappedSubsidy.toLocaleString()} 万円
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 leading-relaxed">
                  {fm.historical.yMinus1.employees <= 20
                    ? `常時使用する従業員数（${fm.historical.yMinus1.employees}名）は製造業その他20名以下の小規模要件を満たしています（商業・サービス業は5名以下要確認）。`
                    : `注意: 従業員数（${fm.historical.yMinus1.employees}名）が20名を超えているため、小規模事業者要件の対象外となります。`}
                </p>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="text-[11px] font-semibold text-slate-700">
                特例上乗せ設定（最大250万円）:
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={inputsDisabled}
                  checked={flags.jizokukaInvoiceSpecial}
                  onChange={(e) =>
                    onUpdateSpecialFlags(project.id, {
                      jizokukaInvoiceSpecial: e.target.checked,
                    })
                  }
                  className="accent-slate-900"
                />
                <span className="text-slate-700">
                  インボイス特例（＋{thresholds.jizokuka.invoiceSpecialBonus}万円）
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={inputsDisabled}
                  checked={flags.jizokukaWageSpecial}
                  onChange={(e) =>
                    onUpdateSpecialFlags(project.id, {
                      jizokukaWageSpecial: e.target.checked,
                    })
                  }
                  className="accent-slate-900"
                />
                <span className="text-slate-700">
                  賃金引上げ特例（＋{thresholds.jizokuka.wageSpecialBonus}万円）
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={inputsDisabled}
                  checked={flags.jizokukaDeficit}
                  onChange={(e) =>
                    onUpdateSpecialFlags(project.id, {
                      jizokukaDeficit: e.target.checked,
                    })
                  }
                  className="accent-slate-900"
                />
                <span className="text-slate-700">
                  赤字事業者（賃上げ特例併用で補助率3/4）
                </span>
              </label>
            </div>
          </div>

          {/* Card 3: 東京都経営強化基盤事業 */}
          <div className="border border-slate-200 p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900">
                  東京都経営強化基盤事業
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-300 whitespace-nowrap">
                  仮設定：対象事業はクライアント確認中
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    助成対象経費（機械＋システム）
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {evalSummary.tokyo.eligibleExpense.toLocaleString()} 万円
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    助成率（{evalSummary.tokyo.appliedRateNum}/
                    {evalSummary.tokyo.appliedRateDen}）交付見込額
                  </span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {evalSummary.tokyo.cappedSubsidy.toLocaleString()} 万円
                    <span className="text-[11px] font-normal text-slate-500">
                      （限度 {evalSummary.tokyo.effectiveMaxCap.toLocaleString()}万）
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 leading-relaxed">
                  想定制度：東京都中小企業振興公社「経営基盤強化支援事業（一般コース）」基準で仮設定。千円未満切捨て（{(evalSummary.tokyo.cappedSubsidy * 10).toLocaleString()}千円）、都内設置・2社以上相見積が必須。
                </p>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-200 text-[11px] text-slate-500">
              ※正式な対象コース確定後、管理者設定から限度額・助成率を差し替え可能です。
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 (M3): Subsidy-Specific Format Conversion Preview */}
      <section
        data-guide-id="guide-fin-formats"
        className="bg-white border border-slate-200 p-6 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                05. 補助金別 様式換算イメージ
              </h2>
              <SpecTagBadge tag="指示書 4-②" />
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              様式イメージ（代表的な勘定科目構成による並べ替え表示）— 共通の財務・投資データから二重入力なしで自動変換します。
            </p>
          </div>

          {/* 3 Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 border border-slate-200">
            {SUBSIDY_TYPES.map((st) => {
              const active = formatSubTab === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFormatSubTab(st)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Tab 1 Extra Table: 新事業進出 付加価値額・給与支給総額 4期計画表 */}
        {formatSubTab === '新事業進出補助金' && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-900">
              【新事業進出 様式】付加価値額・給与支給総額 算出表（基準年度＋事業化1〜3年目）
            </div>
            <div className="overflow-x-auto border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                    <th className="py-2 px-3">申請様式 算出項目</th>
                    <th className="py-2 px-3 text-right">基準年度（直前期）</th>
                    <th className="py-2 px-3 text-right">1年目（Y1）</th>
                    <th className="py-2 px-3 text-right">2年目（Y2）</th>
                    <th className="py-2 px-3 text-right">3年目（Y3）</th>
                    <th className="py-2 px-3 text-right">年平均成長率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  <tr className="bg-slate-50 font-semibold">
                    <td className="py-2 px-3 font-sans">
                      付加価値額（営業利益＋人件費＋減価償却費）
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.historical.yMinus1.valueAdded.toLocaleString()} 万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.forecast.y1.valueAdded.toLocaleString()} 万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.forecast.y2.valueAdded.toLocaleString()} 万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.forecast.y3.valueAdded.toLocaleString()} 万円
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-900 font-bold">
                      {evalSummary.vaGrowthAnnual}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans text-slate-600 pl-6">
                      うち営業利益 / 人件費 / 減価償却費
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {fm.historical.yMinus1.operatingProfit} /{' '}
                      {fm.historical.yMinus1.laborCost} /{' '}
                      {fm.historical.yMinus1.depreciation}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {fm.forecast.y1.operatingProfit} /{' '}
                      {fm.forecast.y1.laborCost} / {fm.forecast.y1.depreciation}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {fm.forecast.y2.operatingProfit} /{' '}
                      {fm.forecast.y2.laborCost} / {fm.forecast.y2.depreciation}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {fm.forecast.y3.operatingProfit} /{' '}
                      {fm.forecast.y3.laborCost} / {fm.forecast.y3.depreciation}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">―</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans">給与支給総額</td>
                    <td className="py-2 px-3 text-right">
                      {fm.historical.yMinus1.totalWages.toLocaleString()} 万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.forecast.y1.totalWages.toLocaleString()} 万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.forecast.y2.totalWages.toLocaleString()} 万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.forecast.y3.totalWages.toLocaleString()} 万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {evalSummary.wageGrowthAnnual}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-sans">従業員数</td>
                    <td className="py-2 px-3 text-right">
                      {fm.historical.yMinus1.employees} 名
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.forecast.y1.employees} 名
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.forecast.y2.employees} 名
                    </td>
                    <td className="py-2 px-3 text-right">
                      {fm.forecast.y3.employees} 名
                    </td>
                    <td className="py-2 px-3 text-right">
                      +{fm.forecast.y3.employees - fm.historical.yMinus1.employees}名
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-semibold">
                    <td className="py-2 px-3 font-sans">
                      一人当たり給与支給総額
                    </td>
                    <td className="py-2 px-3 text-right">
                      {calculatePerCapitaWage(fm.historical.yMinus1).toFixed(1)}{' '}
                      万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {calculatePerCapitaWage(fm.forecast.y1).toFixed(1)} 万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {calculatePerCapitaWage(fm.forecast.y2).toFixed(1)} 万円
                    </td>
                    <td className="py-2 px-3 text-right">
                      {calculatePerCapitaWage(fm.forecast.y3).toFixed(1)} 万円
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-900 font-bold">
                      {evalSummary.perCapitaWageGrowthAnnual}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Expense Breakdown Table Mapped per Subsidy */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-900">
            【{formatSubTab}】経費区分別 積算明細・交付申請額シミュレーション
          </div>
          <div className="overflow-x-auto border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                  <th className="py-2.5 px-3">制度指定の経費区分名</th>
                  <th className="py-2.5 px-3">マスター投資区分の割当元</th>
                  <th className="py-2.5 px-3 text-right">金額（税抜）</th>
                  <th className="py-2.5 px-3">対象区分</th>
                  <th className="py-2.5 px-3">様式記載上の留意点</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mappedExpenseRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {r.subsidyCategoryName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {r.sourceLabel}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {r.amountManYen.toLocaleString()} 万円
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {r.isEligible ? (
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300">
                          補助・助成対象
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
                          対象外（自己負担）
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r.note}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-300 font-semibold text-xs">
                <tr>
                  <td colSpan={2} className="py-3 px-3 text-slate-900">
                    {formatSubTab} 交付見込額（制度上限・補助率適用後）
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-sm font-bold text-slate-900">
                    {formatSubTab === '新事業進出補助金'
                      ? `${evalSummary.shinJigyo.cappedSubsidy.toLocaleString()} 万円`
                      : formatSubTab === '小規模事業者持続化補助金'
                        ? `${evalSummary.jizokuka.cappedSubsidy.toLocaleString()} 万円`
                        : `${evalSummary.tokyo.cappedSubsidy.toLocaleString()} 万円`}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-slate-600 font-normal">
                    {formatSubTab === '新事業進出補助金' &&
                      `対象経費 ${evalSummary.shinJigyo.eligibleExpense.toLocaleString()}万円 × ${evalSummary.shinJigyo.appliedRateNum}/${evalSummary.shinJigyo.appliedRateDen}（区分上限 ${evalSummary.shinJigyo.effectiveMaxCap.toLocaleString()}万円・下限 ${evalSummary.shinJigyo.minSubsidyAmount.toLocaleString()}万円）`}
                    {formatSubTab === '小規模事業者持続化補助金' &&
                      `対象経費 ${evalSummary.jizokuka.eligibleExpense.toLocaleString()}万円 × ${evalSummary.jizokuka.appliedRateNum}/${evalSummary.jizokuka.appliedRateDen}（特例反映上限 ${evalSummary.jizokuka.effectiveMaxCap.toLocaleString()}万円）`}
                    {formatSubTab === '東京都経営強化基盤事業' &&
                      `対象経費 ${evalSummary.tokyo.eligibleExpense.toLocaleString()}万円 × ${evalSummary.tokyo.appliedRateNum}/${evalSummary.tokyo.appliedRateDen}（助成限度額 ${evalSummary.tokyo.effectiveMaxCap.toLocaleString()}万円）`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 6: Gate 2 Lock / Unlock Action Footer */}
      <section
        data-guide-id="guide-fin-lock"
        className={`border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isLocked
            ? 'bg-emerald-50/40 border-emerald-300'
            : 'bg-slate-900 text-white border-slate-900'
        }`}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-base font-bold ${
                isLocked ? 'text-slate-900' : 'text-white'
              }`}
            >
              {isLocked
                ? 'Gate 2 通過済：収支計画マスターは確定ロックされています'
                : '06. 収支計画マスターの確定（Gate 2 解除）'}
            </span>
            <SpecTagBadge tag="指示書 Step6" />
          </div>
          <p
            className={`text-xs leading-relaxed ${
              isLocked ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {isLocked
              ? `確定日時: ${fm.lockedAt} · この数値計画を正として「04. 申請書 作成・編集」および「05. 整合性チェック」を実行できます。`
              : '手戻りを防止するため、収支計画を確定（Gate 2通過）すると申請書作成・編集画面の厳格ロックが解除されます。'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isLocked ? (
            <>
              <button
                type="button"
                disabled={!canConfirmG2}
                onClick={handleUnlock}
                className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                再編集（ロック解除）
              </button>
              <button
                type="button"
                onClick={onNavigateToEditor}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                申請書 作成・編集画面へ進む →
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!canConfirmG2}
              onClick={handleConfirmLock}
              className="px-6 py-2.5 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              この収支計画で確定する（Gate 2 通過）
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
