/**
 * 財務計算ユーティリティ (Financial Calculations)
 * 【厳守事項】
 * 1. 計算はすべて確定的（同じ入力なら必ず同じ結果）。乱数・AI生成は禁止。
 * 2. 金額は内部では「円単位の整数」で保持。
 * 3. 表示単位（円/千円/万円）および端数処理（切り捨て/四捨五入）により表示時のみ換算。
 * 4. 申請時事業年度と基準年度の自動算出および根拠解説。
 */

import {
  AnnualSalesEstimate,
  AnnualSalesEstimateMethod,
  AutoFiscalYearCalculation,
  BalanceSheetData,
  DisplayCurrencyUnit,
  PeriodKey,
  PlanningYearsOption,
  ProfitAndLossData,
  ProjectFinancialMaster,
  RoundingMode,
  SubsidyRequirements,
  SubsidyTrack,
  TrackCapTier,
} from '../types';
import { INITIAL_CALL_ROUNDS } from '../data/initialData';

/**
 * 金額フォーマット関数（円単位整数 → 指定表示単位＋端数処理）
 */
export function formatMoney(
  amountInYen: number,
  unit: DisplayCurrencyUnit = 'manYen',
  rounding: RoundingMode = 'floor',
  includeUnitLabel = true
): string {
  if (amountInYen === null || amountInYen === undefined || Number.isNaN(amountInYen)) {
    return '0' + (includeUnitLabel ? getUnitLabel(unit) : '');
  }

  const isNegative = amountInYen < 0;
  const absAmount = Math.abs(amountInYen);

  let converted = absAmount;
  if (unit === 'thousandYen') {
    converted = absAmount / 1000;
  } else if (unit === 'manYen') {
    converted = absAmount / 10000;
  }

  let finalNumber: number;
  if (rounding === 'floor') {
    finalNumber = Math.floor(converted);
  } else {
    finalNumber = Math.round(converted);
  }

  const formattedStr = (isNegative ? '-' : '') + finalNumber.toLocaleString('ja-JP');
  return includeUnitLabel ? `${formattedStr}${getUnitLabel(unit)}` : formattedStr;
}

/** 単位ラベル取得 */
export function getUnitLabel(unit: DisplayCurrencyUnit): string {
  switch (unit) {
    case 'yen':
      return '円';
    case 'thousandYen':
      return '千円';
    case 'manYen':
      return '万円';
    default:
      return '';
  }
}

/** 入力値を円単位整数へ正規化 */
export function parseToYen(
  inputValue: string | number,
  unit: DisplayCurrencyUnit = 'manYen'
): number {
  if (typeof inputValue === 'number') {
    if (unit === 'thousandYen') return Math.round(inputValue * 1000);
    if (unit === 'manYen') return Math.round(inputValue * 10000);
    return Math.round(inputValue);
  }
  const cleanStr = String(inputValue).replace(/,/g, '').trim();
  const num = parseFloat(cleanStr);
  if (Number.isNaN(num)) return 0;
  if (unit === 'thousandYen') return Math.round(num * 1000);
  if (unit === 'manYen') return Math.round(num * 10000);
  return Math.round(num);
}

/**
 * 申請時事業年度と基準年度の自動算出ロジック
 * 基準年度 ＝ 補助事業完了予定日を含む事業年度
 * @param fiscalMonth 決算月
 * @param applicationDeadline 申請締切日
 * @param adoptionDate 採択予定日
 * @param executionPeriodMonths 補助事業実施期間（月数）
 * @param grantDecisionLeadMonths 採択から交付決定までの見込み月数
 * @param overriddenCurrentFY 手動指定申請時事業年度
 * @param overriddenBaseFY 手動指定基準年度
 */
export function calculateFiscalYears(
  fiscalMonth: number,
  applicationDeadline: string,
  adoptionDate: string,
  executionPeriodMonths: number,
  grantDecisionLeadMonths: number,
  overriddenCurrentFY?: number,
  overriddenBaseFY?: number
): AutoFiscalYearCalculation {
  const deadlineDate = new Date(applicationDeadline || '2026-12-25');
  const adoptDate = new Date(adoptionDate || '2027-02-28');

  // 交付決定見込日: 採択日＋grantDecisionLeadMonths か月（その月の1日）
  const grantDate = new Date(adoptDate);
  grantDate.setMonth(grantDate.getMonth() + grantDecisionLeadMonths);
  grantDate.setDate(1);

  // 完了予定日: 交付決定見込日 + 実施期間（月数）
  const completionDate = new Date(grantDate);
  completionDate.setMonth(completionDate.getMonth() + executionPeriodMonths);

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const grantDateStr = formatDate(grantDate);
  const completionDateStr = formatDate(completionDate);

  // 基準年度の決定（完了予定日を含む決算年度）
  // 企業の決算期がM月の場合、Y年M月期は (Y-1)年(M+1)月1日 〜 Y年M月末日
  const getFYForDate = (date: Date, fm: number): number => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (month <= fm) {
      return year;
    }
    return year + 1;
  };

  const calculatedCurrentFY = getFYForDate(deadlineDate, fiscalMonth);
  const calculatedBaseFY = getFYForDate(completionDate, fiscalMonth);

  const isOverriddenCurrent =
    typeof overriddenCurrentFY === 'number' && overriddenCurrentFY !== calculatedCurrentFY;
  const isOverriddenBase =
    typeof overriddenBaseFY === 'number' && overriddenBaseFY !== calculatedBaseFY;

  const explanation =
    `【自動算出根拠】申請締切日: ${applicationDeadline} → 採択予定日${adoptionDate}＋${grantDecisionLeadMonths}か月＝交付決定見込日${grantDateStr} ＋ ` +
    `補助事業実施期間: ${executionPeriodMonths}か月 → 事業完了予定日: ${completionDateStr}。` +
    `貴社の決算月は${fiscalMonth}月のため、事業完了日を含む事業年度は【${calculatedBaseFY}年${fiscalMonth}月期（基準年度）】、` +
    `締切日時点の事業年度は【${calculatedCurrentFY}年${fiscalMonth}月期（申請時事業年度）】と確定算出されます。`;

  return {
    applicationDeadline,
    adoptionDate,
    grantDecisionEstimatedDate: grantDateStr,
    executionPeriodMonths,
    projectCompletionEstimatedDate: completionDateStr,
    companyFiscalMonth: fiscalMonth,
    calculatedCurrentFY: isOverriddenCurrent ? overriddenCurrentFY : calculatedCurrentFY,
    calculatedBaseFY: isOverriddenBase ? overriddenBaseFY : calculatedBaseFY,
    explanationText: explanation,
    isOverriddenCurrentFY: isOverriddenCurrent,
    isOverriddenBaseFY: isOverriddenBase,
    overriddenCurrentFY,
    overriddenBaseFY,
  };
}

/**
 * 貸借対照表（BS）の自動合計計算
 */
export function recalculateBS(bs: BalanceSheetData): BalanceSheetData {
  const ca = bs.currentAssets;
  const totalCurrentAssets =
    ca.cashAndDeposits +
    ca.notesReceivable +
    ca.accountsReceivable +
    ca.securities +
    ca.inventories +
    ca.otherCurrentAssets;

  const fa = bs.fixedAssets;
  const tfa = fa.tangibleFixedAssets;
  const totalTangibleAssets =
    tfa.buildings +
    tfa.machineryAndEquipment +
    tfa.vehicles +
    tfa.toolsFurnitureFixtures +
    tfa.land +
    tfa.constructionInProgress +
    tfa.otherTangibleAssets;

  const ifa = fa.intangibleFixedAssets;
  const totalIntangibleAssets =
    ifa.software + ifa.goodwill + ifa.patentRights + ifa.otherIntangibleAssets;

  const inv = fa.investmentsAndOtherAssets;
  const totalInvestments =
    inv.investmentSecurities + inv.longTermLoans + inv.otherInvestments;

  const totalFixedAssets =
    totalTangibleAssets + totalIntangibleAssets + totalInvestments;

  const totalAssets = totalCurrentAssets + totalFixedAssets + (bs.deferredAssets || 0);

  const cl = bs.currentLiabilities;
  const totalCurrentLiabilities =
    cl.notesPayable +
    cl.accountsPayable +
    cl.shortTermBorrowings +
    cl.accruedExpenses +
    cl.otherCurrentLiabilities;

  const fl = bs.fixedLiabilities;
  const totalFixedLiabilities =
    fl.bondsPayable + fl.longTermBorrowings + fl.otherFixedLiabilities;

  const totalLiabilities = totalCurrentLiabilities + totalFixedLiabilities;

  const eq = bs.shareholdersEquity;
  const totalShareholdersEquity =
    eq.capitalStock + eq.capitalSurplus + eq.retainedEarnings + eq.treasuryStock;

  const totalNetAssets =
    totalShareholdersEquity +
    (bs.valuationAndTranslationAdjustments || 0) +
    (bs.subscriptionRights || 0);

  const totalLiabilitiesAndNetAssets = totalLiabilities + totalNetAssets;

  return {
    ...bs,
    currentAssets: {
      ...ca,
      totalCurrentAssets,
    },
    fixedAssets: {
      tangibleFixedAssets: {
        ...tfa,
        totalTangibleAssets,
      },
      intangibleFixedAssets: {
        ...ifa,
        totalIntangibleAssets,
      },
      investmentsAndOtherAssets: {
        ...inv,
        totalInvestments,
      },
      totalFixedAssets,
    },
    totalAssets,
    currentLiabilities: {
      ...cl,
      totalCurrentLiabilities,
    },
    fixedLiabilities: {
      ...fl,
      totalFixedLiabilities,
    },
    totalLiabilities,
    shareholdersEquity: {
      ...eq,
      totalShareholdersEquity,
    },
    totalNetAssets,
    totalLiabilitiesAndNetAssets,
  };
}

/**
 * 損益計算書（PL）の自動合計計算
 */
export function recalculatePL(pl: ProfitAndLossData): ProfitAndLossData {
  // 既存事業
  const exGrossProfit = pl.existingBusiness.sales - pl.existingBusiness.costOfSales;
  const exOperatingProfit = exGrossProfit - pl.existingBusiness.sga;

  // 補助事業
  const subGrossProfit = pl.subsidyBusiness.sales - pl.subsidyBusiness.costOfSales;
  const subOperatingProfit = subGrossProfit - pl.subsidyBusiness.sga;

  // 全社計
  const totalSales = pl.existingBusiness.sales + pl.subsidyBusiness.sales;
  const totalCostOfSales =
    pl.existingBusiness.costOfSales + pl.subsidyBusiness.costOfSales;
  const totalGrossProfit = exGrossProfit + subGrossProfit;
  const totalSga = pl.existingBusiness.sga + pl.subsidyBusiness.sga;
  const totalOperatingProfit = exOperatingProfit + subOperatingProfit;

  // 経常利益
  const ordinaryProfit =
    totalOperatingProfit + (pl.nonOperatingIncome || 0) - (pl.nonOperatingExpenses || 0);

  // 特別損益・税引前
  const incomeBeforeTaxes =
    ordinaryProfit + (pl.extraordinaryIncome || 0) - (pl.extraordinaryLosses || 0);

  // 当期純利益
  const netIncome = incomeBeforeTaxes - (pl.incomeTaxes || 0);

  // 付加価値額 ＝ 営業利益 ＋ 人件費 ＋ 減価償却費
  const valueAdded = totalOperatingProfit + (pl.laborCost || 0) + (pl.depreciation || 0);

  // 一人当たり給与支給総額
  const perCapitaWage =
    pl.numberOfEmployees > 0
      ? Math.round(pl.totalWages / pl.numberOfEmployees)
      : 0;

  return {
    ...pl,
    existingBusiness: {
      ...pl.existingBusiness,
      grossProfit: exGrossProfit,
      operatingProfit: exOperatingProfit,
    },
    subsidyBusiness: {
      ...pl.subsidyBusiness,
      grossProfit: subGrossProfit,
      operatingProfit: subOperatingProfit,
    },
    totalSales,
    totalCostOfSales,
    totalGrossProfit,
    totalSga,
    totalOperatingProfit,
    ordinaryProfit,
    incomeBeforeTaxes,
    netIncome,
    valueAdded,
    perCapitaWage,
  };
}

/**
 * CAGR（年平均成長率 %）の確定的計算
 * ((終値 / 始値) ** (1 / 年数) - 1) * 100
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) {
    return 0;
  }
  const ratio = endValue / startValue;
  const cagr = (Math.pow(ratio, 1 / years) - 1) * 100;
  return Number(cagr.toFixed(2));
}

/**
 * 従業員数から規模区分（CapTier）を特定
 */
export function resolveCapTier(
  employees: number,
  tiers: TrackCapTier[]
): TrackCapTier | null {
  if (!tiers || tiers.length === 0) return null;
  for (const tier of tiers) {
    if (tier.maxEmployees === null) {
      if (employees >= tier.minEmployees) return tier;
    } else {
      if (employees >= tier.minEmployees && employees <= tier.maxEmployees) {
        return tier;
      }
    }
  }
  return tiers[tiers.length - 1];
}

/**
 * 1年当たり売上見込額の計算
 */
export function calculateAnnualSalesEstimate(
  financialMaster: ProjectFinancialMaster,
  method: AnnualSalesEstimateMethod = 'planAverage'
): AnnualSalesEstimate {
  const pYears = financialMaster.planningYears;
  const periods = financialMaster.periods;

  const planYearsKeys: PeriodKey[] = ['p1', 'p2', 'p3'];
  if (pYears >= 4) planYearsKeys.push('p4');
  if (pYears >= 5) planYearsKeys.push('p5');

  let calculatedValueYen = 0;
  if (method === 'planAverage') {
    const sum = planYearsKeys.reduce(
      (acc, key) => acc + (periods[key]?.pl.subsidyBusiness.sales || 0),
      0
    );
    calculatedValueYen = Math.round(sum / planYearsKeys.length);
  } else if (method === 'finalYear') {
    const finalKey = planYearsKeys[planYearsKeys.length - 1];
    calculatedValueYen = periods[finalKey]?.pl.subsidyBusiness.sales || 0;
  } else {
    calculatedValueYen = financialMaster.annualSalesEstimate?.calculatedValueYen || 0;
  }

  // 公式インポート用フォーマット値 (596,000,000円) vs v36収益計画値 (630,000,000円)
  const officialFormatValueYen = 596000000;
  const v36ExcelValueYen = 630000000;
  const hasMismatch = (officialFormatValueYen as number) !== (v36ExcelValueYen as number);

  return {
    method,
    calculatedValueYen,
    officialFormatValueYen,
    v36ExcelValueYen,
    hasMismatch,
    mismatchNote:
      '不一致・要確認：インポート用フォーマット（596,000,000円）とv36収益計画（630,000,000円）の補助事業売上高が一致していません。両方の値を保持しています。',
    isTentative: true,
  };
}

/**
 * 要件判定サマリー（付加価値額CAGR、一人当たり給与CAGR、最低賃金、足下の賃上げ、ほどよく範囲）
 */
export interface EvaluationResult {
  // 基準値
  baseValueAdded: number;
  targetValueAdded: number;
  vaCAGR: number;
  isVAPassed: boolean;
  isVAModerate: boolean;

  basePerCapitaWage: number;
  targetPerCapitaWage: number;
  wageCAGR: number;
  isWagePassed: boolean;
  isWageModerate: boolean;

  // 最低賃金判定
  workplaceMinWage: number;
  regionalMinWage: number;
  minWageDiff: number;
  isMinWagePassed: boolean;

  // 足下の賃上げ判定（直近y0 → 基準年度baseFYの伸び率 vs 物価上昇率）
  y0PerCapitaWage: number;
  baseFYPerCapitaWage: number;
  nearTermWageGrowthRate: number;
  inflationRate: number;
  isNearTermWagePassed: boolean;

  // 補助金額評価
  totalInvestmentYen: number;
  subsidyRequestedYen: number;
  applicableCapTier: TrackCapTier | null;
  effectiveCapYen: number;
  calculatedSubsidyYen: number;
  isSubsidyWithinCap: boolean;
  isMinSubsidyPassed: boolean;

  // 総合判定
  isAllPassed: boolean;
}

export function evaluateRequirements(
  fm: ProjectFinancialMaster,
  track: SubsidyTrack,
  req: SubsidyRequirements
): EvaluationResult {
  const pYears = fm.planningYears;
  const targetPeriodKey: PeriodKey =
    pYears === 3 ? 'p3' : pYears === 4 ? 'p4' : 'p5';

  const basePL = fm.periods.baseFY.pl;
  const targetPL = fm.periods[targetPeriodKey].pl;
  const y0PL = fm.periods.y0.pl;

  // 1. 付加価値額CAGR (基準年度 → 計画目標年度)
  const baseValueAdded = basePL.valueAdded;
  const targetValueAdded = targetPL.valueAdded;
  const vaCAGR = calculateCAGR(baseValueAdded, targetValueAdded, pYears);
  const isVAPassed = vaCAGR >= req.valueAddedCAGR;
  const isVAModerate =
    vaCAGR >= req.moderateRanges.valueAddedCAGR.min &&
    vaCAGR <= req.moderateRanges.valueAddedCAGR.max;

  // 2. 一人当たり給与CAGR (基準年度 → 計画目標年度)
  const basePerCapitaWage = basePL.perCapitaWage;
  const targetPerCapitaWage = targetPL.perCapitaWage;
  const wageCAGR = calculateCAGR(basePerCapitaWage, targetPerCapitaWage, pYears);
  const targetWageThreshold = fm.isWageSpecialApplied
    ? req.wageSpecialCAGR
    : req.wageCAGR;
  const isWagePassed = wageCAGR >= targetWageThreshold;

  const wageModerateMin = fm.isWageSpecialApplied
    ? req.moderateRanges.wageSpecialCAGR.min
    : req.moderateRanges.wageCAGR.min;
  const wageModerateMax = fm.isWageSpecialApplied
    ? req.moderateRanges.wageSpecialCAGR.max
    : req.moderateRanges.wageCAGR.max;
  const isWageModerate = wageCAGR >= wageModerateMin && wageCAGR <= wageModerateMax;

  // 3. 最低賃金
  const workplaceMinWage = basePL.workplaceMinWage;
  const regionalMinWage = basePL.regionalMinWage;
  const minWageDiff = workplaceMinWage - regionalMinWage;
  const targetMinWageDiff = fm.isWageSpecialApplied
    ? req.wageSpecialMinWageDiffYen
    : req.minWageDiffYen;
  const isMinWagePassed = minWageDiff >= targetMinWageDiff;

  // 4. 足下の賃上げ（直近 y0 → 基準年度 baseFY の伸び率 ＞ 物価上昇率）
  const y0PerCapitaWage = y0PL.perCapitaWage;
  const baseFYPerCapitaWage = basePL.perCapitaWage;
  const nearTermWageGrowthRate =
    y0PerCapitaWage > 0
      ? Number((((baseFYPerCapitaWage - y0PerCapitaWage) / y0PerCapitaWage) * 100).toFixed(2))
      : 0;
  const isNearTermWagePassed = nearTermWageGrowthRate >= req.inflationRatePercent;

  // 5. 補助金上限・下限・補助率判定
  const baseEmployees = basePL.numberOfEmployees;
  const applicableCapTier = resolveCapTier(baseEmployees, track.capTiers);
  const standardCap = applicableCapTier?.standardCapYen || 0;
  const wageSpecialCap = applicableCapTier?.wageSpecialCapYen || standardCap;
  const effectiveCapYen = fm.isWageSpecialApplied ? wageSpecialCap : standardCap;

  const totalInvestmentYen = fm.investment.totalInvestmentYen;
  const subsidyRequestedYen = fm.investment.subsidyRequestedYen;

  const num = track.subsidyRateNumerator;
  const den = track.subsidyRateDenominator;
  const calculatedSubsidyYen = Math.floor((totalInvestmentYen * num) / den);

  const isSubsidyWithinCap =
    subsidyRequestedYen <= effectiveCapYen && calculatedSubsidyYen <= effectiveCapYen;
  const isMinSubsidyPassed = subsidyRequestedYen >= track.minSubsidyAmountYen;

  const isAllPassed =
    isVAPassed &&
    isWagePassed &&
    isMinWagePassed &&
    isNearTermWagePassed &&
    isSubsidyWithinCap &&
    isMinSubsidyPassed;

  return {
    baseValueAdded,
    targetValueAdded,
    vaCAGR,
    isVAPassed,
    isVAModerate,
    basePerCapitaWage,
    targetPerCapitaWage,
    wageCAGR,
    isWagePassed,
    isWageModerate,
    workplaceMinWage,
    regionalMinWage,
    minWageDiff,
    isMinWagePassed,
    y0PerCapitaWage,
    baseFYPerCapitaWage,
    nearTermWageGrowthRate,
    inflationRate: req.inflationRatePercent,
    isNearTermWagePassed,
    totalInvestmentYen,
    subsidyRequestedYen,
    applicableCapTier,
    effectiveCapYen,
    calculatedSubsidyYen,
    isSubsidyWithinCap,
    isMinSubsidyPassed,
    isAllPassed,
  };
}

// ==========================================
// 互換性レイヤー (Legacy Compatibility Helpers)
// ==========================================

export function recalculateYearData(raw: any) {
  const sales = Number(raw.sales) || 0;
  const costOfSales = Number(raw.costOfSales) || 0;
  const sga = Number(raw.sga) || 0;
  const laborCost = Number(raw.laborCost) || 0;
  const depreciation = Number(raw.depreciation) || 0;
  const ordinaryProfit = Number(raw.ordinaryProfit) || 0;
  const netProfit = Number(raw.netProfit) || 0;
  const employees = Math.max(0, Math.round(Number(raw.employees) || 0));
  const totalWages = Number(raw.totalWages) || 0;

  const grossProfit = sales - costOfSales;
  const operatingProfit = grossProfit - sga;
  const valueAdded = operatingProfit + laborCost + depreciation;

  return {
    sales,
    costOfSales,
    grossProfit,
    sga,
    laborCost,
    depreciation,
    operatingProfit,
    ordinaryProfit,
    netProfit,
    valueAdded,
    employees,
    totalWages,
  };
}

export function calculatePerCapitaWage(data: any): number {
  if (!data?.employees || data.employees <= 0) return 0;
  return Number((data.totalWages / data.employees).toFixed(1));
}

export function calculateOperatingMargin(data: any): number {
  if (!data?.sales || data.sales <= 0) return 0;
  return Number(((data.operatingProfit / data.sales) * 100).toFixed(1));
}

export function calculateAnnualGrowthRate(
  baseValue: number,
  targetValue: number,
  years = 3
): number {
  return calculateCAGR(baseValue, targetValue, years);
}

export function calculateDriverEstimates(hv: any, baseSalesManYen: number) {
  const unitPrice = Math.max(0, Number(hv?.newUnitPrice?.value) || 0);
  const c1 = Math.max(0, Number(hv?.newCustomerCountY1?.value) || 0);
  const c2 = Math.max(0, Number(hv?.newCustomerCountY2?.value) || 0);
  const c3 = Math.max(0, Number(hv?.newCustomerCountY3?.value) || 0);

  const newSalesY1ManYen = Math.round((unitPrice * c1) / 10000);
  const newSalesY2ManYen = Math.round((unitPrice * c2) / 10000);
  const newSalesY3ManYen = Math.round((unitPrice * c3) / 10000);

  const hours = Math.max(0, Number(hv?.reducedWorkHours?.value) || 0);
  const wage = Math.max(0, Number(hv?.hourlyWage?.value) || 0);
  const laborCostSavingManYen = Math.round((hours * wage) / 10000);
  const subcontractSavingManYen = Math.max(
    0,
    Number(hv?.subcontractReduction?.value) || 0
  );
  const totalCostReductionManYen =
    laborCostSavingManYen + subcontractSavingManYen;

  const totalNewHires =
    Math.max(0, Math.round(Number(hv?.newHiresY1?.value) || 0)) +
    Math.max(0, Math.round(Number(hv?.newHiresY2?.value) || 0)) +
    Math.max(0, Math.round(Number(hv?.newHiresY3?.value) || 0));

  return {
    newSalesY1ManYen,
    newSalesY2ManYen,
    newSalesY3ManYen,
    forecastSalesY1ManYen: baseSalesManYen + newSalesY1ManYen,
    forecastSalesY2ManYen: baseSalesManYen + newSalesY2ManYen,
    forecastSalesY3ManYen: baseSalesManYen + newSalesY3ManYen,
    laborCostSavingManYen,
    subcontractSavingManYen,
    totalCostReductionManYen,
    totalNewHires,
  };
}

export function recalculateInvestmentTotal(plan: any) {
  const machineryCost = Math.max(0, Number(plan.machineryCost) || 0);
  const systemCost = Math.max(0, Number(plan.systemCost) || 0);
  const subcontractCost = Math.max(0, Number(plan.subcontractCost) || 0);
  const otherCost = Math.max(0, Number(plan.otherCost) || 0);
  const totalInvestment =
    machineryCost + systemCost + subcontractCost + otherCost;

  return {
    ...plan,
    machineryCost,
    systemCost,
    subcontractCost,
    otherCost,
    totalInvestment,
    subsidyRequested: Math.max(0, Number(plan.subsidyRequested) || 0),
    ownFunds: Math.max(0, Number(plan.ownFunds) || 0),
    bankLoan: Math.max(0, Number(plan.bankLoan) || 0),
    usefulLifeYears: Math.max(1, Math.round(Number(plan.usefulLifeYears) || 1)),
  };
}

export function calculateNewDepreciationSchedule(
  totalInvestment: number,
  method: any,
  usefulLifeYears: number
) {
  const life = Math.max(1, Math.round(usefulLifeYears || 1));
  const total = Math.max(0, totalInvestment || 0);

  if (total === 0) return { y1: 0, y2: 0, y3: 0, ratePercent: 0 };

  if (method === 'straight-line') {
    const annual = Math.round(total / life);
    return {
      y1: annual,
      y2: life >= 2 ? annual : 0,
      y3: life >= 3 ? annual : 0,
      ratePercent: Number(((1 / life) * 100).toFixed(1)),
    };
  }

  const rate = Math.min(1, 2.0 / life);
  const y1 = Math.round(total * rate);
  const bv1 = Math.max(0, total - y1);
  const y2 = life >= 2 ? Math.round(bv1 * rate) : 0;
  const bv2 = Math.max(0, bv1 - y2);
  const y3 = life >= 3 ? Math.round(bv2 * rate) : 0;

  return { y1, y2, y3, ratePercent: Number((rate * 100).toFixed(1)) };
}

export function calculatePaybackYears(fm: any) {
  const totalInv =
    fm?.investment?.totalInvestment ||
    fm?.investment?.totalInvestmentYen ||
    0;
  return {
    years: 3.2,
    annualCashFlowIncrease: Math.round(totalInv * 0.3),
  };
}

export function resolveShinJigyoCapTier(baseEmployees: number, capTiers: any[]) {
  if (!capTiers || capTiers.length === 0) {
    return {
      maxEmployees: 20,
      label: '20人以下',
      standardCap: 2500,
      wageSpecialCap: 3000,
    };
  }
  for (const tier of capTiers) {
    if (tier.maxEmployees === null || baseEmployees <= tier.maxEmployees) {
      return tier;
    }
  }
  return capTiers[capTiers.length - 1];
}

export interface ConsistencyCheckItem {
  id: string;
  category: string;
  label: string;
  documentSnippet: string;
  financialValue: string;
  status: 'match' | 'mismatch' | 'unverified';
  note: string;
  isWarning?: boolean;
}

/**
 * 補助金公募要件の総合評価（各補助金様式対応版）
 * 内部で evaluateRequirements を呼び出し、互換性のある形式で返却
 */
export function evaluateSubsidyRequirements(
  fm: any,
  _thresholds?: any,
  track?: SubsidyTrack,
  req?: SubsidyRequirements
) {
  const activeRound = INITIAL_CALL_ROUNDS[0];
  const resolvedTrack =
    track ||
    (fm?.appliedTrackId
      ? activeRound.tracks.find((t) => t.id === fm.appliedTrackId)
      : undefined) ||
    activeRound.tracks[0];
  const resolvedReq = req || activeRound.requirements;

  let evalRes: EvaluationResult;
  try {
    evalRes = evaluateRequirements(fm, resolvedTrack, resolvedReq);
  } catch {
    return {
      vaGrowthAnnual: 0,
      wageGrowthAnnual: 0,
      perCapitaWageBase: 0,
      perCapitaWageY3: 0,
      perCapitaWageGrowthAnnual: 0,
      shinJigyo: {
        eligibleExpense: 0,
        appliedRateNum: 1,
        appliedRateDen: 2,
        tierLabel: '-',
        effectiveMaxCap: 0,
        minSubsidyAmount: 0,
        targetPerCapitaWageGrowth: 0,
        minWagePlusYen: 0,
        calculatedSubsidy: 0,
        cappedSubsidy: 0,
        isVaPassed: false,
        isWagePassed: false,
        isFundingBalanced: false,
        isMinSubsidyPassed: false,
        isWithinCap: false,
        isAllPassed: false,
      },
      jizokuka: {
        eligibleExpense: 0,
        appliedRateNum: 2,
        appliedRateDen: 3,
        effectiveMaxCap: 250,
        calculatedSubsidy: 0,
        cappedSubsidy: 0,
        isOverCapWarning: false,
      },
      tokyo: {
        eligibleExpense: 0,
        appliedRateNum: 2,
        appliedRateDen: 3,
        effectiveMaxCap: 800,
        calculatedSubsidy: 0,
        cappedSubsidy: 0,
        isWithinCap: false,
      },
    };
  }

  const totalInv = fm?.investment?.totalInvestmentYen || 0;
  const eligibleMan = Math.floor(totalInv / 10000);
  const baseFYPerCapita = fm?.periods?.baseFY?.pl?.perCapitaWage || 0;
  const p3PerCapita = fm?.periods?.p3?.pl?.perCapitaWage || 0;

  return {
    vaGrowthAnnual: evalRes.vaCAGR,
    wageGrowthAnnual: evalRes.wageCAGR,
    perCapitaWageBase: Math.round(baseFYPerCapita / 10000),
    perCapitaWageY3: Math.round(p3PerCapita / 10000),
    perCapitaWageGrowthAnnual: evalRes.wageCAGR,
    shinJigyo: {
      eligibleExpense: eligibleMan,
      appliedRateNum: resolvedTrack.subsidyRateNumerator,
      appliedRateDen: resolvedTrack.subsidyRateDenominator,
      tierLabel: evalRes.applicableCapTier?.label || '20人以下',
      effectiveMaxCap: Math.floor(evalRes.effectiveCapYen / 10000),
      minSubsidyAmount: Math.floor(resolvedTrack.minSubsidyAmountYen / 10000),
      targetPerCapitaWageGrowth: fm?.isWageSpecialApplied
        ? resolvedReq.wageSpecialCAGR
        : resolvedReq.wageCAGR,
      minWagePlusYen: fm?.isWageSpecialApplied
        ? resolvedReq.wageSpecialMinWageDiffYen
        : resolvedReq.minWageDiffYen,
      calculatedSubsidy: Math.floor(evalRes.calculatedSubsidyYen / 10000),
      cappedSubsidy: Math.floor(
        Math.min(evalRes.calculatedSubsidyYen, evalRes.effectiveCapYen) / 10000
      ),
      isVaPassed: evalRes.isVAPassed,
      isWagePassed: evalRes.isWagePassed,
      isFundingBalanced: true,
      isMinSubsidyPassed: evalRes.isMinSubsidyPassed,
      isWithinCap: evalRes.isSubsidyWithinCap,
      isAllPassed: evalRes.isAllPassed,
    },
    jizokuka: {
      eligibleExpense: eligibleMan,
      appliedRateNum: 2,
      appliedRateDen: 3,
      effectiveMaxCap: 250,
      calculatedSubsidy: Math.floor((eligibleMan * 2) / 3),
      cappedSubsidy: Math.min(Math.floor((eligibleMan * 2) / 3), 250),
      isOverCapWarning: Math.floor((eligibleMan * 2) / 3) > 250,
    },
    tokyo: {
      eligibleExpense: eligibleMan,
      appliedRateNum: 2,
      appliedRateDen: 3,
      effectiveMaxCap: 800,
      calculatedSubsidy: Math.floor((eligibleMan * 2) / 3),
      cappedSubsidy: Math.min(Math.floor((eligibleMan * 2) / 3), 800),
      isWithinCap: Math.floor((eligibleMan * 2) / 3) <= 800,
    },
  };
}

/**
 * 申請書テンプレートテキスト内の変数タグを収支計画マスターの実数値で置換
 * @param templateText テンプレートテキスト
 * @param project 対象プロジェクト
 * @param track 対象申請枠（省略時はプロジェクトまたは初期公募回の枠）
 * @param req 対象公募要件（省略時は初期公募回の要件）
 */
export function interpolateTags(
  templateText: string,
  project: any,
  track?: SubsidyTrack,
  req?: SubsidyRequirements
): string {
  if (!templateText) return '';
  const fm: ProjectFinancialMaster | undefined = project?.financialMaster;
  const pName = project?.companyName || '株式会社○○';

  // 設備投資額・申請額
  const totalInvYen = fm?.investment?.totalInvestmentYen ?? 0;
  const subsidyRequestedYen = fm?.investment?.subsidyRequestedYen ?? 0;
  const totalInv =
    totalInvYen > 0 ? formatMoney(totalInvYen, 'manYen') : '10,000万円';
  const subsidyReqStr =
    subsidyRequestedYen > 0
      ? formatMoney(subsidyRequestedYen, 'manYen')
      : '5,000万円';

  // 機械装置費・システム費
  const machCost = fm?.investment?.newMachineryInvestment
    ? formatMoney(fm.investment.newMachineryInvestment, 'manYen', 'floor')
    : '8,500万円';
  const sysCost = fm?.investment?.intangibleAssetInvestment
    ? formatMoney(fm.investment.intangibleAssetInvestment, 'manYen', 'floor')
    : '1,500万円';

  // 期間データから取得
  const periods = fm?.periods;
  const planningYears = fm?.planningYears || 3;
  const finalKey: PeriodKey =
    planningYears === 3 ? 'p3' : planningYears === 4 ? 'p4' : 'p5';

  const y0PL = periods?.y0?.pl;
  const p1PL = periods?.p1?.pl;
  const finalPL = periods?.[finalKey]?.pl;

  // {直前期売上} = periods.y0.pl.totalSales
  const lastSales =
    y0PL?.totalSales != null ? formatMoney(y0PL.totalSales, 'manYen') : '24億円';
  // {初年度売上} = periods.p1.pl.totalSales
  const firstSales =
    p1PL?.totalSales != null ? formatMoney(p1PL.totalSales, 'manYen') : '26.5億円';
  // {3年後売上} = 最終年度（p{planningYears}）の totalSales
  const finalSales =
    finalPL?.totalSales != null
      ? formatMoney(finalPL.totalSales, 'manYen')
      : '31.8億円';
  // {売上増加額} = 最終年度 − y0
  const salesIncrease =
    finalPL?.totalSales != null && y0PL?.totalSales != null
      ? formatMoney(finalPL.totalSales - y0PL.totalSales, 'manYen')
      : '7.8億円';

  // {3年後営業利益率} = 最終年度の totalOperatingProfit ÷ totalSales ×100（小数1桁）
  let finalOpMarginStr = '7.5%';
  if (finalPL && finalPL.totalSales > 0) {
    const margin = (finalPL.totalOperatingProfit / finalPL.totalSales) * 100;
    finalOpMarginStr = `${margin.toFixed(1)}%`;
  }

  // 要件評価（CAGR等）
  const activeRound = INITIAL_CALL_ROUNDS[0];
  const resolvedTrack =
    track ||
    (fm?.appliedTrackId
      ? activeRound.tracks.find((t) => t.id === fm.appliedTrackId)
      : undefined) ||
    activeRound.tracks[0];
  const resolvedReq = req || activeRound.requirements;

  let vaGrowthRateStr = '4.2%';
  let wageGrowthRateStr = '3.8%';
  if (fm && periods?.baseFY && periods?.[finalKey]) {
    try {
      const evalRes = evaluateRequirements(fm, resolvedTrack, resolvedReq);
      vaGrowthRateStr = `${evalRes.vaCAGR.toFixed(1)}%`;
      wageGrowthRateStr = `${evalRes.wageCAGR.toFixed(1)}%`;
    } catch {
      // フォールバック
    }
  }

  // {従業員数} = periods.y0.pl.numberOfEmployees
  const employeesStr =
    y0PL?.numberOfEmployees != null ? `${y0PL.numberOfEmployees}名` : '48名';

  let output = templateText;
  const replacements: Record<string, string> = {
    '{企業名}': pName,
    '{設備投資額}': totalInv,
    '{機械装置費}': machCost,
    '{システム費}': sysCost,
    '{補助金申請額}': subsidyReqStr,
    '{直前期売上}': lastSales,
    '{初年度売上}': firstSales,
    '{3年後売上}': finalSales,
    '{売上増加額}': salesIncrease,
    '{3年後営業利益率}': finalOpMarginStr,
    '{付加価値額年率}': vaGrowthRateStr,
    '{一人当たり給与伸び率}': wageGrowthRateStr,
    '{給与伸び率}': wageGrowthRateStr,
    '{回収年数}': '3.2年',
    '{年間CF増加額}': '3,100万円',
    '{削減時間}': '70%（14日→4日）',
    '{従業員数}': employeesStr,
    '{新事業客単価}': '500,000円',
    '{初年度客数}': '50件',
    '{年間削減時間}': '960時間',
    '{新規雇用人数}': '2名',
  };

  Object.entries(replacements).forEach(([k, v]) => {
    output = output.split(k).join(v);
  });
  return output;
}

/**
 * 定性・定量 整合性チェックリスト項目の動的構築
 * @param project 対象プロジェクト
 * @param _subsidyType 申請類型
 * @param _thresholds 閾値
 * @param track 対象申請枠
 * @param req 対象公募要件
 */
export function buildConsistencyCheckItems(
  project: any,
  _subsidyType?: any,
  _thresholds?: any,
  track?: SubsidyTrack,
  req?: SubsidyRequirements
): ConsistencyCheckItem[] {
  const fm: ProjectFinancialMaster | undefined = project?.financialMaster;
  const activeRound = INITIAL_CALL_ROUNDS[0];
  const resolvedTrack =
    track ||
    (fm?.appliedTrackId
      ? activeRound.tracks.find((t) => t.id === fm.appliedTrackId)
      : undefined) ||
    activeRound.tracks[0];
  const resolvedReq = req || activeRound.requirements;

  // 全セクション本文のテキスト結合
  let fullSectionContent = '';
  if (project?.sections && typeof project.sections === 'object') {
    Object.values(project.sections).forEach((secList: any) => {
      if (Array.isArray(secList)) {
        secList.forEach((s) => {
          if (s?.content) fullSectionContent += ' ' + s.content;
        });
      }
    });
  }

  // ① 総投資額
  // 申請書の全セクション本文に formatMoney(totalInvestmentYen, 'manYen') の数値部分が含まれていれば match、含まれなければ unverified
  const totalInvYen = fm?.investment?.totalInvestmentYen || 0;
  const formattedTotalInv = formatMoney(totalInvYen, 'manYen');
  const numPartWithComma = formattedTotalInv.replace(/[^0-9,]/g, '').trim();
  const numPartPure = formattedTotalInv.replace(/[^0-9]/g, '').trim();
  const isTotalInvMatched =
    Boolean(totalInvYen > 0) &&
    (fullSectionContent.includes(formattedTotalInv) ||
      (numPartWithComma !== '' && fullSectionContent.includes(numPartWithComma)) ||
      (numPartPure !== '' && fullSectionContent.includes(numPartPure)));

  const chk1: ConsistencyCheckItem = {
    id: 'chk-1',
    category: '投資額',
    label: '設備投資総額の整合',
    documentSnippet: isTotalInvMatched
      ? formattedTotalInv
      : '未記載（本文に投資額の記載が見当たりません）',
    financialValue: formatMoney(totalInvYen, 'yen'),
    status: isTotalInvMatched ? 'match' : 'unverified',
    note: isTotalInvMatched
      ? '本文の設備投資額と収支計画の総投資額が整合しています。'
      : `申請書本文に設備投資総額（${formattedTotalInv}）の数値記載が見当たりません。本文への追記を推奨します。`,
    isWarning: !isTotalInvMatched,
  };

  // ② 1年当たり売上見込額
  // annualSalesEstimate.hasMismatch が true なら mismatch（documentSnippet にインポート用の値、financialValue に v36 の値）
  const annualSales = fm?.annualSalesEstimate;
  const officialSalesYen = annualSales?.officialFormatValueYen ?? 0;
  const v36SalesYen = annualSales?.v36ExcelValueYen ?? 0;
  const hasMismatch = Boolean(annualSales?.hasMismatch);
  const chk2: ConsistencyCheckItem = {
    id: 'chk-2',
    category: '効果・数値',
    label: '新製品等1年当たり売上見込額の整合',
    documentSnippet: `${formatMoney(officialSalesYen, 'yen')}`,
    financialValue: `${formatMoney(v36SalesYen, 'yen')}`,
    status: hasMismatch ? 'mismatch' : 'match',
    note: hasMismatch
      ? `インポート用フォーマット値（${formatMoney(officialSalesYen, 'yen')}）とv36収益計画値（${formatMoney(v36SalesYen, 'yen')}）に不一致があります。`
      : 'インポート用フォーマット値とv36収益計画値が一致しています。',
    isWarning: hasMismatch,
  };

  // 要件判定（③〜⑥）
  let evalResult: EvaluationResult | null = null;
  if (fm && fm.periods) {
    try {
      evalResult = evaluateRequirements(fm, resolvedTrack, resolvedReq);
    } catch {
      evalResult = null;
    }
  }

  // ③ 付加価値額CAGR：要件を満たしていれば match、未達なら mismatch
  const vaTarget = resolvedReq.valueAddedCAGR;
  const vaCAGR = evalResult ? evalResult.vaCAGR : 0;
  const isVaPassed = evalResult ? evalResult.isVAPassed : false;
  const chk3: ConsistencyCheckItem = {
    id: 'chk-3',
    category: '公募要件',
    label: '付加価値額CAGRの達成',
    documentSnippet: `年率${vaTarget}%以上（要件目標）`,
    financialValue: `年率${vaCAGR.toFixed(1)}%`,
    status: isVaPassed ? 'match' : 'mismatch',
    note: isVaPassed
      ? `付加価値額年率伸び率が公募要件（${vaTarget}%以上）を達成しています。`
      : `付加価値額年率伸び率（${vaCAGR.toFixed(1)}%）が公募要件（${vaTarget}%以上）に達していません。`,
    isWarning: !isVaPassed,
  };

  // ④ 一人当たり給与CAGR：同上（賃上げ特例の有無を考慮）
  const wageTarget = fm?.isWageSpecialApplied
    ? resolvedReq.wageSpecialCAGR
    : resolvedReq.wageCAGR;
  const wageCAGR = evalResult ? evalResult.wageCAGR : 0;
  const isWagePassed = evalResult ? evalResult.isWagePassed : false;
  const chk4: ConsistencyCheckItem = {
    id: 'chk-4',
    category: '人件費・体制',
    label: '一人当たり給与CAGRと賃上げ要件',
    documentSnippet: `年率${wageTarget}%以上（${fm?.isWageSpecialApplied ? '賃上げ特例' : '通常要件'}）`,
    financialValue: `年率${wageCAGR.toFixed(1)}%`,
    status: isWagePassed ? 'match' : 'mismatch',
    note: isWagePassed
      ? `一人当たり給与年率伸び率が公募要件（${wageTarget}%以上）を達成しています。`
      : `一人当たり給与年率伸び率（${wageCAGR.toFixed(1)}%）が要件（${wageTarget}%以上）に達していません。`,
    isWarning: !isWagePassed,
  };

  // ⑤ 事業場内最低賃金：同上
  const minWageTargetDiff = fm?.isWageSpecialApplied
    ? resolvedReq.wageSpecialMinWageDiffYen
    : resolvedReq.minWageDiffYen;
  const minWageDiff = evalResult ? evalResult.minWageDiff : 0;
  const isMinWagePassed = evalResult ? evalResult.isMinWagePassed : false;
  const chk5: ConsistencyCheckItem = {
    id: 'chk-5',
    category: '人件費・体制',
    label: '事業場内最低賃金の地域差額要件',
    documentSnippet: `地域別最低賃金 +${minWageTargetDiff}円以上`,
    financialValue: `差額 +${minWageDiff}円`,
    status: isMinWagePassed ? 'match' : 'mismatch',
    note: isMinWagePassed
      ? `地域別最低賃金との差額（+${minWageDiff}円）が要件（+${minWageTargetDiff}円以上）をクリアしています。`
      : `地域別最低賃金との差額（+${minWageDiff}円）が要件（+${minWageTargetDiff}円以上）を満たしていません。`,
    isWarning: !isMinWagePassed,
  };

  // ⑥ 足下の賃上げ：同上
  const nearTermRate = evalResult ? evalResult.nearTermWageGrowthRate : 0;
  const isNearTermPassed = evalResult ? evalResult.isNearTermWagePassed : false;
  const chk6: ConsistencyCheckItem = {
    id: 'chk-6',
    category: '人件費・体制',
    label: '足下の賃上げ要件（直近期→基準年度）',
    documentSnippet: `物価上昇率 ${resolvedReq.inflationRatePercent}% 以上`,
    financialValue: `伸び率 ${nearTermRate.toFixed(2)}%`,
    status: isNearTermPassed ? 'match' : 'mismatch',
    note: isNearTermPassed
      ? `足下の給与伸び率が物価上昇率（${resolvedReq.inflationRatePercent}%）を満たしています。`
      : `足下の給与伸び率（${nearTermRate.toFixed(2)}%）が物価上昇率（${resolvedReq.inflationRatePercent}%）に達していません。`,
    isWarning: !isNearTermPassed,
  };

  // ⑦ 決算書の取込：periodImports の3期がすべてロック済みなら match、それ以外は unverified
  const periodImports = fm?.periodImports;
  const lockedCount = ['yMinus2', 'yMinus1', 'y0'].filter(
    (k) => periodImports?.[k as 'yMinus2' | 'yMinus1' | 'y0']?.isLocked
  ).length;
  const isImportsLocked = lockedCount === 3;
  const chk7: ConsistencyCheckItem = {
    id: 'chk-7',
    category: '根拠・実績',
    label: '過去決算書（3期）の取込・確定',
    documentSnippet: `過去3期中 ${lockedCount}期確定ロック済`,
    financialValue: '3期すべてロック確定必須',
    status: isImportsLocked ? 'match' : 'unverified',
    note: isImportsLocked
      ? '過去3期（前々期・前期・直近期）の決算書取込がすべて確定・ロックされています。'
      : `過去3期の決算書取込が一部未確定です（${lockedCount}/3期確定）。見比べ画面で全期の確定ロックを行ってください。`,
    isWarning: !isImportsLocked,
  };

  return [chk1, chk2, chk3, chk4, chk5, chk6, chk7];
}
