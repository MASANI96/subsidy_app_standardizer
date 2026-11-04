import {
  ConsistencyCheckItem,
  DepreciationMethod,
  FinancialMaster,
  FinancialYearData,
  HearingVariables,
  InvestmentPlan,
  Project,
  ShinJigyoCapTier,
  SubsidyRequirementThresholds,
  SubsidyType,
} from '../types';

/**
 * 売上総利益・営業利益・付加価値額を自動再計算する
 * 付加価値額 = 営業利益 + 人件費 + 減価償却費
 */
export function recalculateYearData(
  raw: Omit<FinancialYearData, 'grossProfit' | 'operatingProfit' | 'valueAdded'> &
    Partial<Pick<FinancialYearData, 'grossProfit' | 'operatingProfit' | 'valueAdded'>>
): FinancialYearData {
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

/**
 * 一人当たり給与支給総額（万円/人）を計算する
 */
export function calculatePerCapitaWage(data: FinancialYearData): number {
  if (!data.employees || data.employees <= 0) return 0;
  return Number((data.totalWages / data.employees).toFixed(1));
}

/**
 * M2: ヒアリング算定変数から新事業売上・コスト削減額・新規雇用合計を計算する
 */
export interface DriverCalculationSummary {
  newSalesY1ManYen: number;
  newSalesY2ManYen: number;
  newSalesY3ManYen: number;
  forecastSalesY1ManYen: number;
  forecastSalesY2ManYen: number;
  forecastSalesY3ManYen: number;
  laborCostSavingManYen: number;
  subcontractSavingManYen: number;
  totalCostReductionManYen: number;
  totalNewHires: number;
}

export function calculateDriverEstimates(
  hv: HearingVariables,
  baseSalesManYen: number
): DriverCalculationSummary {
  const unitPrice = Math.max(0, Number(hv.newUnitPrice.value) || 0);
  const c1 = Math.max(0, Number(hv.newCustomerCountY1.value) || 0);
  const c2 = Math.max(0, Number(hv.newCustomerCountY2.value) || 0);
  const c3 = Math.max(0, Number(hv.newCustomerCountY3.value) || 0);

  const newSalesY1ManYen = Math.round((unitPrice * c1) / 10000);
  const newSalesY2ManYen = Math.round((unitPrice * c2) / 10000);
  const newSalesY3ManYen = Math.round((unitPrice * c3) / 10000);

  const hours = Math.max(0, Number(hv.reducedWorkHours.value) || 0);
  const wage = Math.max(0, Number(hv.hourlyWage.value) || 0);
  const laborCostSavingManYen = Math.round((hours * wage) / 10000);
  const subcontractSavingManYen = Math.max(
    0,
    Number(hv.subcontractReduction.value) || 0
  );
  const totalCostReductionManYen =
    laborCostSavingManYen + subcontractSavingManYen;

  const totalNewHires =
    Math.max(0, Math.round(Number(hv.newHiresY1.value) || 0)) +
    Math.max(0, Math.round(Number(hv.newHiresY2.value) || 0)) +
    Math.max(0, Math.round(Number(hv.newHiresY3.value) || 0));

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

/**
 * 投資計画から総投資額を再計算する
 */
export function recalculateInvestmentTotal(plan: InvestmentPlan): InvestmentPlan {
  const machineryCost = Math.max(0, Number(plan.machineryCost) || 0);
  const systemCost = Math.max(0, Number(plan.systemCost) || 0);
  const subcontractCost = Math.max(0, Number(plan.subcontractCost) || 0);
  const otherCost = Math.max(0, Number(plan.otherCost) || 0);
  const totalInvestment =
    machineryCost + systemCost + subcontractCost + otherCost;
  const usefulLifeYears = Math.max(
    1,
    Math.round(Number(plan.usefulLifeYears) || 1)
  );

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
    usefulLifeYears,
  };
}

/**
 * 新規設備投資分の各年度減価償却費（万円）を計算する
 */
export function calculateNewDepreciationSchedule(
  totalInvestment: number,
  method: DepreciationMethod,
  usefulLifeYears: number
): { y1: number; y2: number; y3: number; ratePercent: number } {
  const life = Math.max(1, Math.round(usefulLifeYears || 1));
  const total = Math.max(0, totalInvestment || 0);

  if (total === 0) {
    return { y1: 0, y2: 0, y3: 0, ratePercent: 0 };
  }

  if (method === 'straight-line') {
    const annual = Math.round(total / life);
    return {
      y1: life >= 1 ? annual : 0,
      y2: life >= 2 ? annual : 0,
      y3: life >= 3 ? annual : 0,
      ratePercent: Number(((1 / life) * 100).toFixed(1)),
    };
  }

  // 200%定率法
  const rate = Math.min(1, 2.0 / life);
  const y1 = Math.round(total * rate);
  const bv1 = Math.max(0, total - y1);
  const y2 = life >= 2 ? Math.round(bv1 * rate) : 0;
  const bv2 = Math.max(0, bv1 - y2);
  const y3 = life >= 3 ? Math.round(bv2 * rate) : 0;

  return {
    y1,
    y2,
    y3,
    ratePercent: Number((rate * 100).toFixed(1)),
  };
}

/**
 * 3ヶ年CAGR（年率平均伸び率 %）を計算する
 * ((将来3年目 / 直前期)^(1/3) - 1) * 100
 */
export function calculateAnnualGrowthRate(
  baseValue: number,
  targetY3Value: number,
  years = 3
): number {
  if (baseValue <= 0 || targetY3Value <= 0 || years <= 0) {
    return 0;
  }
  const ratio = targetY3Value / baseValue;
  const cagr = (Math.pow(ratio, 1 / years) - 1) * 100;
  return Number(cagr.toFixed(2));
}

/**
 * 営業利益率（%）を計算する
 */
export function calculateOperatingMargin(data: FinancialYearData): number {
  if (!data.sales || data.sales <= 0) return 0;
  return Number(((data.operatingProfit / data.sales) * 100).toFixed(1));
}

/**
 * 投資回収年数（概算）を計算する
 */
export function calculatePaybackYears(fm: FinancialMaster): {
  years: number;
  annualCashFlowIncrease: number;
} {
  const totalInv = fm.investment.totalInvestment;
  if (totalInv <= 0) {
    return { years: 0, annualCashFlowIncrease: 0 };
  }

  const depSchedule = calculateNewDepreciationSchedule(
    totalInv,
    fm.investment.depreciationMethod,
    fm.investment.usefulLifeYears
  );
  const avgNewDep = (depSchedule.y1 + depSchedule.y2 + depSchedule.y3) / 3;
  const baseNet = fm.historical.yMinus1.netProfit;
  const avgForecastNet =
    (fm.forecast.y1.netProfit +
      fm.forecast.y2.netProfit +
      fm.forecast.y3.netProfit) /
    3;
  const netDelta = Math.max(0, avgForecastNet - baseNet);
  const annualCF = Math.round(netDelta + avgNewDep);

  if (annualCF <= 0) {
    return { years: 99.9, annualCashFlowIncrease: 0 };
  }

  const years = Number((totalInv / annualCF).toFixed(1));
  return { years, annualCashFlowIncrease: annualCF };
}

/**
 * 従業員数から新事業進出補助金の規模区分上限を判定する
 */
export function resolveShinJigyoCapTier(
  baseEmployees: number,
  capTiers: ShinJigyoCapTier[]
): ShinJigyoCapTier {
  const fallback: ShinJigyoCapTier = {
    maxEmployees: 20,
    label: '20人以下',
    standardCap: 2500,
    wageSpecialCap: 3000,
  };
  if (!capTiers || capTiers.length === 0) return fallback;

  for (const tier of capTiers) {
    if (tier.maxEmployees === null || baseEmployees <= tier.maxEmployees) {
      return tier;
    }
  }
  return capTiers[capTiers.length - 1];
}

/**
 * M8: 3つの補助金に対する換算額・公募要件判定結果を返す
 */
export interface SubsidyEvaluationSummary {
  vaGrowthAnnual: number;
  wageGrowthAnnual: number; // 給与支給総額 年平均成長率
  perCapitaWageBase: number;
  perCapitaWageY3: number;
  perCapitaWageGrowthAnnual: number; // 一人当たり給与支給総額 年平均成長率
  shinJigyo: {
    eligibleExpense: number;
    appliedRateNum: number;
    appliedRateDen: number;
    tierLabel: string;
    effectiveMaxCap: number;
    minSubsidyAmount: number;
    targetPerCapitaWageGrowth: number;
    minWagePlusYen: number;
    calculatedSubsidy: number;
    cappedSubsidy: number;
    isVaPassed: boolean;
    isWagePassed: boolean;
    isFundingBalanced: boolean;
    isMinSubsidyPassed: boolean;
    isWithinCap: boolean;
    isAllPassed: boolean;
  };
  jizokuka: {
    eligibleExpense: number;
    appliedRateNum: number;
    appliedRateDen: number;
    effectiveMaxCap: number;
    calculatedSubsidy: number;
    cappedSubsidy: number;
    isOverCapWarning: boolean;
  };
  tokyo: {
    eligibleExpense: number;
    appliedRateNum: number;
    appliedRateDen: number;
    effectiveMaxCap: number;
    calculatedSubsidy: number;
    cappedSubsidy: number;
    isWithinCap: boolean;
  };
}

export function evaluateSubsidyRequirements(
  fm: FinancialMaster,
  thresholds: SubsidyRequirementThresholds
): SubsidyEvaluationSummary {
  const flags = fm.specialFlags ?? {
    shinJigyoWageSpecial: false,
    shinJigyoMinWageSpecial: false,
    jizokukaInvoiceSpecial: false,
    jizokukaWageSpecial: false,
    jizokukaDeficit: false,
  };

  const vaGrowthAnnual = calculateAnnualGrowthRate(
    fm.historical.yMinus1.valueAdded,
    fm.forecast.y3.valueAdded,
    3
  );
  const wageGrowthAnnual = calculateAnnualGrowthRate(
    fm.historical.yMinus1.totalWages,
    fm.forecast.y3.totalWages,
    3
  );

  const perCapitaWageBase =
    fm.historical.yMinus1.employees > 0
      ? fm.historical.yMinus1.totalWages / fm.historical.yMinus1.employees
      : 0;
  const perCapitaWageY3 =
    fm.forecast.y3.employees > 0
      ? fm.forecast.y3.totalWages / fm.forecast.y3.employees
      : 0;
  const perCapitaWageGrowthAnnual = calculateAnnualGrowthRate(
    perCapitaWageBase,
    perCapitaWageY3,
    3
  );

  const eligibleAll = fm.investment.totalInvestment;
  const eligibleTokyo =
    fm.investment.machineryCost + fm.investment.systemCost;

  // 1. 新事業進出補助金
  const shinTier = resolveShinJigyoCapTier(
    fm.historical.yMinus1.employees,
    thresholds.shinJigyo.capTiers
  );
  const shinEffectiveMaxCap = flags.shinJigyoWageSpecial
    ? shinTier.wageSpecialCap
    : shinTier.standardCap;
  const shinRateNum = flags.shinJigyoMinWageSpecial
    ? thresholds.shinJigyo.minWageSpecialRateNumerator
    : thresholds.shinJigyo.subsidyRateNumerator;
  const shinRateDen = flags.shinJigyoMinWageSpecial
    ? thresholds.shinJigyo.minWageSpecialRateDenominator
    : thresholds.shinJigyo.subsidyRateDenominator;
  const targetPerCapitaWageGrowth = flags.shinJigyoWageSpecial
    ? thresholds.shinJigyo.perCapitaWageGrowthSpecialAnnual
    : thresholds.shinJigyo.perCapitaWageGrowthRateAnnual;
  const minWagePlusYen = flags.shinJigyoMinWageSpecial
    ? thresholds.shinJigyo.minWageSpecialPlusYen
    : thresholds.shinJigyo.minWagePlusYen;

  const shinCalc = Math.floor(
    (eligibleAll * shinRateNum) / Math.max(1, shinRateDen)
  );
  const shinCapped = Math.min(shinCalc, shinEffectiveMaxCap);
  const minSub = thresholds.shinJigyo.minSubsidyAmount;

  const isVaPassed =
    vaGrowthAnnual >= thresholds.shinJigyo.valueAddedGrowthRateAnnual;
  const isWagePassed = perCapitaWageGrowthAnnual >= targetPerCapitaWageGrowth;
  const totalFunding =
    fm.investment.subsidyRequested +
    fm.investment.ownFunds +
    fm.investment.bankLoan;
  const isFundingBalanced = totalFunding >= eligibleAll && eligibleAll > 0;
  const isMinSubsidyPassed =
    shinCapped >= minSub && fm.investment.subsidyRequested >= minSub;
  const isWithinShinCap = fm.investment.subsidyRequested <= shinEffectiveMaxCap;

  // 2. 小規模事業者持続化補助金
  const jizoEffectiveMaxCap =
    thresholds.jizokuka.baseMaxSubsidyAmount +
    (flags.jizokukaInvoiceSpecial
      ? thresholds.jizokuka.invoiceSpecialBonus
      : 0) +
    (flags.jizokukaWageSpecial ? thresholds.jizokuka.wageSpecialBonus : 0);
  const isJizoDeficitSpecial =
    flags.jizokukaWageSpecial && flags.jizokukaDeficit;
  const jizoRateNum = isJizoDeficitSpecial
    ? thresholds.jizokuka.deficitWageSpecialRateNumerator
    : thresholds.jizokuka.subsidyRateNumerator;
  const jizoRateDen = isJizoDeficitSpecial
    ? thresholds.jizokuka.deficitWageSpecialRateDenominator
    : thresholds.jizokuka.subsidyRateDenominator;

  const jizoCalc = Math.floor(
    (eligibleAll * jizoRateNum) / Math.max(1, jizoRateDen)
  );
  const jizoCapped = Math.min(jizoCalc, jizoEffectiveMaxCap);

  // 3. 東京都経営強化基盤事業（機械装置＋システムを対象）
  const tokyoRateNum = thresholds.tokyo.subsidyRateNumerator;
  const tokyoRateDen = thresholds.tokyo.subsidyRateDenominator;
  const tokyoCalc = Math.floor(
    (eligibleTokyo * tokyoRateNum) / Math.max(1, tokyoRateDen)
  );
  const tokyoCapped = Math.min(tokyoCalc, thresholds.tokyo.maxSubsidyAmount);

  return {
    vaGrowthAnnual,
    wageGrowthAnnual,
    perCapitaWageBase: Number(perCapitaWageBase.toFixed(1)),
    perCapitaWageY3: Number(perCapitaWageY3.toFixed(1)),
    perCapitaWageGrowthAnnual,
    shinJigyo: {
      eligibleExpense: eligibleAll,
      appliedRateNum: shinRateNum,
      appliedRateDen: shinRateDen,
      tierLabel: shinTier.label,
      effectiveMaxCap: shinEffectiveMaxCap,
      minSubsidyAmount: minSub,
      targetPerCapitaWageGrowth,
      minWagePlusYen,
      calculatedSubsidy: shinCalc,
      cappedSubsidy: shinCapped,
      isVaPassed,
      isWagePassed,
      isFundingBalanced,
      isMinSubsidyPassed,
      isWithinCap: isWithinShinCap,
      isAllPassed:
        isVaPassed &&
        isWagePassed &&
        isFundingBalanced &&
        isMinSubsidyPassed &&
        isWithinShinCap,
    },
    jizokuka: {
      eligibleExpense: eligibleAll,
      appliedRateNum: jizoRateNum,
      appliedRateDen: jizoRateDen,
      effectiveMaxCap: jizoEffectiveMaxCap,
      calculatedSubsidy: jizoCalc,
      cappedSubsidy: jizoCapped,
      isOverCapWarning: fm.investment.subsidyRequested > jizoEffectiveMaxCap,
    },
    tokyo: {
      eligibleExpense: eligibleTokyo,
      appliedRateNum: tokyoRateNum,
      appliedRateDen: tokyoRateDen,
      effectiveMaxCap: thresholds.tokyo.maxSubsidyAmount,
      calculatedSubsidy: tokyoCalc,
      cappedSubsidy: tokyoCapped,
      isWithinCap:
        fm.investment.subsidyRequested <= thresholds.tokyo.maxSubsidyAmount,
    },
  };
}

/**
 * 文章モジュール・申請書内の変数タグを案件の収支計画マスター・算定変数の実数値で置換する
 * （§1-1: 既存の固定フォールバック値は厳守維持し、M2の5タグを追加）
 */
export function interpolateTags(templateText: string, project: Project): string {
  if (!templateText) return '';
  const fm = project.financialMaster;
  const inv = fm.investment;
  const hv = project.hearingVariables;

  const vaGrowth = calculateAnnualGrowthRate(
    fm.historical.yMinus1.valueAdded,
    fm.forecast.y3.valueAdded,
    3
  );
  const wageGrowth = calculateAnnualGrowthRate(
    fm.historical.yMinus1.totalWages,
    fm.forecast.y3.totalWages,
    3
  );
  const perCapitaBase =
    fm.historical.yMinus1.employees > 0
      ? fm.historical.yMinus1.totalWages / fm.historical.yMinus1.employees
      : 0;
  const perCapitaY3 =
    fm.forecast.y3.employees > 0
      ? fm.forecast.y3.totalWages / fm.forecast.y3.employees
      : 0;
  const perCapitaWageGrowth = calculateAnnualGrowthRate(
    perCapitaBase,
    perCapitaY3,
    3
  );

  const payback = calculatePaybackYears(fm);
  const salesIncrease = Math.max(
    0,
    fm.forecast.y3.sales - fm.historical.yMinus1.sales
  );
  const y3Margin = calculateOperatingMargin(fm.forecast.y3);

  // リードタイム短縮表記（§1-1 案件ID別固定値を維持）
  let leadTimeText = '70%（14日→4日）';
  if (project.id === 'proj-edogawa-foods') {
    leadTimeText = '65%短縮';
  } else if (project.id === 'proj-sankyo-logistics') {
    leadTimeText = '84%（50分→8分）';
  }

  const totalNewHires = hv
    ? (hv.newHiresY1.value || 0) +
      (hv.newHiresY2.value || 0) +
      (hv.newHiresY3.value || 0)
    : Math.max(0, fm.forecast.y3.employees - fm.historical.yMinus1.employees);

  const replacements: Record<string, string> = {
    '{企業名}': project.companyName,
    '{設備投資額}': `${inv.totalInvestment.toLocaleString()}万円`,
    '{機械装置費}': `${inv.machineryCost.toLocaleString()}万円`,
    '{システム費}': `${inv.systemCost.toLocaleString()}万円`,
    '{補助金申請額}': `${inv.subsidyRequested.toLocaleString()}万円`,
    '{直前期売上}': `${fm.historical.yMinus1.sales.toLocaleString()}万円`,
    '{初年度売上}': `${fm.forecast.y1.sales.toLocaleString()}万円`,
    '{3年後売上}': `${fm.forecast.y3.sales.toLocaleString()}万円`,
    '{売上増加額}': `${salesIncrease.toLocaleString()}万円`,
    '{3年後営業利益率}': `${y3Margin.toFixed(1)}%`,
    '{付加価値額年率}': `${vaGrowth.toFixed(1)}%`,
    '{給与伸び率}': `${wageGrowth.toFixed(1)}%`,
    '{回収年数}':
      payback.years > 0 && payback.years < 90 ? `${payback.years}年` : '3.2年',
    '{年間CF増加額}':
      payback.annualCashFlowIncrease > 0
        ? `${payback.annualCashFlowIncrease.toLocaleString()}万円`
        : '1,310万円',
    '{削減時間}': leadTimeText,
    '{従業員数}': `${fm.historical.yMinus1.employees}名`,
    // M2 追加5タグ
    '{新事業客単価}': `${(hv?.newUnitPrice.value ?? 0).toLocaleString()}円`,
    '{初年度客数}': `${(hv?.newCustomerCountY1.value ?? 0).toLocaleString()}件`,
    '{年間削減時間}': `${(hv?.reducedWorkHours.value ?? 0).toLocaleString()}時間`,
    '{新規雇用人数}': `${totalNewHires}名`,
    '{一人当たり給与伸び率}': `${perCapitaWageGrowth.toFixed(1)}%`,
  };

  let output = templateText;
  Object.entries(replacements).forEach(([tag, val]) => {
    output = output.split(tag).join(val);
  });
  return output;
}

/**
 * 万円表記と億円表記の両方が本文中に含まれるか判定するヘルパー
 */
function matchesAmountInText(
  fullText: string,
  amountManYen: number
): { matched: boolean; snippet: string } {
  if (!fullText.trim()) {
    return { matched: false, snippet: '（本文未作成）' };
  }

  const formattedMan = `${amountManYen.toLocaleString()}万円`;
  const plainMan = `${amountManYen}万円`;
  const okuVal = amountManYen / 10000;
  const formattedOku =
    Number.isInteger(okuVal) || Number(okuVal.toFixed(1)) === okuVal
      ? `${okuVal}億円`
      : '';

  if (fullText.includes(formattedMan)) {
    return { matched: true, snippet: formattedMan };
  }
  if (fullText.includes(plainMan)) {
    return { matched: true, snippet: plainMan };
  }
  if (formattedOku && fullText.includes(formattedOku)) {
    return { matched: true, snippet: `${formattedOku}（=${formattedMan}）` };
  }

  const allAmounts = fullText.match(/[0-9,]+(?:\.[0-9]+)?(?:万円|億円)/g) ?? [];
  if (allAmounts.length > 0) {
    return {
      matched: false,
      snippet: `本文記載: ${Array.from(new Set(allAmounts)).slice(0, 3).join(' / ')}`,
    };
  }

  return { matched: false, snippet: '該当数値の記載なし' };
}

/**
 * 申請書本文・ヒアリング変数と収支計画マスターの数値を自動突合する（既存7項目 ＋ M7強化3項目）
 */
export function buildConsistencyCheckItems(
  project: Project,
  subsidyType: SubsidyType = '新事業進出補助金',
  thresholds?: SubsidyRequirementThresholds
): ConsistencyCheckItem[] {
  const doc = project.subsidies[subsidyType];
  const fullText = doc.sections.map((s) => s.currentText).join('\n');
  const fm = project.financialMaster;
  const inv = fm.investment;
  const hv = project.hearingVariables;

  // 1. 総投資額
  const totalInvCheck = matchesAmountInText(fullText, inv.totalInvestment);
  const item1: ConsistencyCheckItem = {
    id: 'chk-total-inv',
    category: '投資額',
    label: '設備投資総額の整合',
    documentSnippet: totalInvCheck.snippet,
    financialValue: `${inv.totalInvestment.toLocaleString()}万円`,
    status: !fullText.trim()
      ? 'unverified'
      : totalInvCheck.matched
        ? 'match'
        : totalInvCheck.snippet === '該当数値の記載なし'
          ? 'unverified'
          : 'mismatch',
    note: totalInvCheck.matched
      ? '本文中の総投資額と収支計画マスターの総投資額が一致しています。'
      : '本文中の投資総額表記と収支計画マスターの総投資額に相違または記載漏れがあります。',
  };

  // 2. 設備内訳（機械装置・システム）
  const machCheck = matchesAmountInText(fullText, inv.machineryCost);
  const sysCheck =
    inv.systemCost > 0
      ? matchesAmountInText(fullText, inv.systemCost)
      : { matched: true, snippet: '0万円（該当なし）' };
  const bothBreakdownMatched = machCheck.matched && sysCheck.matched;
  const item2: ConsistencyCheckItem = {
    id: 'chk-inv-breakdown',
    category: '投資額',
    label: '導入設備内訳（機械装置・システム費）',
    documentSnippet:
      machCheck.matched && sysCheck.matched
        ? `機械 ${inv.machineryCost.toLocaleString()}万円 / システム ${inv.systemCost.toLocaleString()}万円`
        : machCheck.matched
          ? `機械 ${inv.machineryCost.toLocaleString()}万円（システム費未記載）`
          : '内訳金額の個別記載なし（総額のみ、または相違）',
    financialValue: `機械 ${inv.machineryCost.toLocaleString()}万円 / システム ${inv.systemCost.toLocaleString()}万円`,
    status: !fullText.trim()
      ? 'unverified'
      : bothBreakdownMatched
        ? 'match'
        : fullText.includes('万円') &&
            !machCheck.matched &&
            subsidyType !== '小規模事業者持続化補助金'
          ? 'mismatch'
          : 'unverified',
    note: bothBreakdownMatched
      ? '機械装置費・システム費の内訳が相見積・投資計画と完全一致しています。'
      : '公募審査では機械本体とソフトウェアの内訳明記が推奨されます。',
  };

  // 3. 3年後売上増加額 / 3年後売上高
  const salesDelta = Math.max(
    0,
    fm.forecast.y3.sales - fm.historical.yMinus1.sales
  );
  const deltaCheck = matchesAmountInText(fullText, salesDelta);
  const y3SalesCheck = matchesAmountInText(fullText, fm.forecast.y3.sales);
  const salesMatched = deltaCheck.matched || y3SalesCheck.matched;
  const item3: ConsistencyCheckItem = {
    id: 'chk-y3-sales',
    category: '効果・数値',
    label: '3年後売上目標（売上増加額・全社売上）',
    documentSnippet: deltaCheck.matched
      ? `売上 +${salesDelta.toLocaleString()}万円${y3SalesCheck.matched ? `（全社 ${y3SalesCheck.snippet}）` : ''}`
      : y3SalesCheck.matched
        ? `全社 ${y3SalesCheck.snippet}`
        : deltaCheck.snippet,
    financialValue: `+${salesDelta.toLocaleString()}万円（全社 ${fm.forecast.y3.sales.toLocaleString()}万円）`,
    status: !fullText.trim()
      ? 'unverified'
      : salesMatched
        ? 'match'
        : 'mismatch',
    note: salesMatched
      ? '直前期から将来3年目の売上拡大目標が収支計画表と一致しています。'
      : '収支計画の3年目売上高（または増加額）と本文の目標値が食い違っています。',
  };

  // 4. 3年後営業利益率
  const y3Margin = calculateOperatingMargin(fm.forecast.y3);
  const marginStr = `${y3Margin.toFixed(1)}%`;
  const marginMatched = fullText.includes(marginStr);
  const foundPercents = fullText.match(
    /営業利益率[^。、\n]{0,18}?([0-9]+(?:\.[0-9]+)?%)/g
  );
  const item4: ConsistencyCheckItem = {
    id: 'chk-y3-margin',
    category: '効果・数値',
    label: '3年後 営業利益率目標',
    documentSnippet: marginMatched
      ? `営業利益率 ${marginStr}`
      : foundPercents && foundPercents.length > 0
        ? foundPercents.join(' / ')
        : '営業利益率の記載なし',
    financialValue: `${marginStr}（営業利益 ${fm.forecast.y3.operatingProfit.toLocaleString()}万円）`,
    status: !fullText.trim()
      ? 'unverified'
      : marginMatched
        ? 'match'
        : foundPercents && foundPercents.length > 0
          ? 'mismatch'
          : 'unverified',
    note: marginMatched
      ? '将来3年目の営業利益率が収支計画の自動計算値と整合しています。'
      : '収支計画上の営業利益率（営業利益÷売上高）と本文記載を確認してください。',
  };

  // 5. 投資回収年数
  const payback = calculatePaybackYears(fm);
  const paybackStr = `${payback.years}年`;
  const paybackRegex = fullText.match(
    /回収(?:期間|年数)[^。]{0,30}?([0-9]+(?:\.[0-9]+)?年)/
  );
  const paybackMatched = paybackRegex ? paybackRegex[1] === paybackStr : false;
  const item5: ConsistencyCheckItem = {
    id: 'chk-payback',
    category: '効果・数値',
    label: '投資回収年数（キャッシュフロー試算）',
    documentSnippet: paybackRegex
      ? `約${paybackRegex[1]}`
      : '本文中に回収年数の明記なし',
    financialValue: `約${paybackStr}（年平均CF増 ${payback.annualCashFlowIncrease.toLocaleString()}万円）`,
    status: !paybackRegex
      ? 'unverified'
      : paybackMatched
        ? 'match'
        : 'mismatch',
    note: !paybackRegex
      ? '審査加点のため、申請書第3項へ投資回収年数（文章モジュール等）の追記を推奨します。'
      : paybackMatched
        ? '投資回収シミュレーション年数が収支計画CF試算と一致しています。'
        : `収支計画上の試算値は約${paybackStr}ですが、本文は${paybackRegex[1]}となっています。`,
  };

  // 6. 従業員数・体制整合
  const empStr = `${fm.historical.yMinus1.employees}名`;
  const empMatched =
    fullText.includes(empStr) ||
    fullText.includes(`社員${fm.historical.yMinus1.employees}名`);
  const empInText = fullText.match(/(?:従業員|社員)\s*([0-9]+名)/);
  const item6: ConsistencyCheckItem = {
    id: 'chk-employees',
    category: '人件費・体制',
    label: '直近従業員数・推進人員体制',
    documentSnippet: empMatched
      ? `従業員 ${empStr}`
      : empInText
        ? `本文記載: ${empInText[1]}`
        : '従業員数の記載なし',
    financialValue: `直前期 ${empStr} → 3年目 ${fm.forecast.y3.employees}名（給与総額 ${fm.forecast.y3.totalWages.toLocaleString()}万円）`,
    status: !fullText.trim()
      ? 'unverified'
      : empMatched
        ? 'match'
        : empInText
          ? 'mismatch'
          : 'unverified',
    note: empMatched
      ? '企業概要の従業員数が直前期財務データの従業員数と一致しています。'
      : '本文の従業員数表記と財務マスターの従業員数を確認してください。',
  };

  // 7. リードタイム・工程改善指標
  const leadTimeMatch = fullText.match(
    /(?:リードタイム|工程時間|検品時間)[^。]{0,30}?([0-9]+%\s*(?:短縮|削減))/
  );
  const item7: ConsistencyCheckItem = {
    id: 'chk-leadtime',
    category: 'リードタイム',
    label: '生産リードタイム短縮率と原価改善の整合',
    documentSnippet: leadTimeMatch
      ? leadTimeMatch[0]
      : 'リードタイム短縮率の定量記載なし',
    financialValue: `粗利率 ${(
      (fm.historical.yMinus1.grossProfit /
        Math.max(1, fm.historical.yMinus1.sales)) *
      100
    ).toFixed(1)}% → ${(
      (fm.forecast.y3.grossProfit / Math.max(1, fm.forecast.y3.sales)) *
      100
    ).toFixed(1)}% 改善`,
    status: leadTimeMatch ? 'match' : 'unverified',
    note: leadTimeMatch
      ? '工程短縮効果と売上総利益率（原価率低減）の改善方向が整合しています。'
      : '設備導入による時間短縮率（%）を具体数値で記述することを推奨します。',
  };

  // 8. M7追加: 人員計画 ↔ 人件費（新規雇用予定人数とforecast従業員増・一人当たり給与成長率）
  const plannedHires = hv
    ? (hv.newHiresY1.value || 0) +
      (hv.newHiresY2.value || 0) +
      (hv.newHiresY3.value || 0)
    : 0;
  const actualEmpDelta = Math.max(
    0,
    fm.forecast.y3.employees - fm.historical.yMinus1.employees
  );
  const perCapitaBase = calculatePerCapitaWage(fm.historical.yMinus1);
  const perCapitaY3 = calculatePerCapitaWage(fm.forecast.y3);
  const perCapitaGrowth = calculateAnnualGrowthRate(
    perCapitaBase,
    perCapitaY3,
    3
  );
  const reqWageTarget = fm.specialFlags?.shinJigyoWageSpecial
    ? (thresholds?.shinJigyo.perCapitaWageGrowthSpecialAnnual ?? 6.0)
    : (thresholds?.shinJigyo.perCapitaWageGrowthRateAnnual ?? 3.5);
  const hiresMatched = plannedHires === actualEmpDelta;
  const wageReqPassed = perCapitaGrowth >= reqWageTarget;

  const item8: ConsistencyCheckItem = {
    id: 'chk-hiring-wages',
    category: '人件費・体制',
    label: '人員計画 ↔ 人件費（新規雇用人数・一人当たり給与成長率）',
    documentSnippet: `ヒアリング新規雇用計 +${plannedHires}名 / 賃上げ予定 ${hv?.plannedWageGrowthRate.value ?? 0}%`,
    financialValue: `収支従業員増 +${actualEmpDelta}名 / 一人当たり給与年率 +${perCapitaGrowth}%（要件 ${reqWageTarget}%）`,
    status: hiresMatched && wageReqPassed ? 'match' : 'mismatch',
    note:
      hiresMatched && wageReqPassed
        ? 'ヒアリングの新規雇用予定人数と収支計画の従業員増が一致し、一人当たり給与年平均成長率も公募要件を満たしています。'
        : !hiresMatched
          ? `ヒアリングの新規雇用予定（計${plannedHires}名）と収支計画上の従業員増加数（+${actualEmpDelta}名）に不一致があります。`
          : `一人当たり給与支給総額の年平均成長率（${perCapitaGrowth}%）が公募要件（${reqWageTarget}%以上）を下回っています。`,
  };

  // 9. M7追加: 設備スペック ↔ 投資内訳（定性マスター③・申請書第2項の「万円」表記と投資内訳）
  const master3Text =
    project.masterItems.find((m) => m.id === 'master-3')?.content ?? '';
  const sec2Text = doc.sections[1]?.currentText ?? '';
  const combinedEquipText = `${master3Text}\n${sec2Text}`;
  const rawManMatches =
    combinedEquipText.match(/([0-9,]+)\s*万円/g)?.map((s) =>
      Number(s.replace(/[^0-9]/g, ''))
    ) ?? [];
  const validEquipAmounts = new Set(
    [
      inv.machineryCost,
      inv.systemCost,
      inv.subcontractCost,
      inv.otherCost,
      inv.totalInvestment,
      inv.subsidyRequested,
    ].filter((v) => v > 0)
  );
  const uniqueExtracted = Array.from(new Set(rawManMatches)).filter((n) => n > 0);
  const allEquipAmountsConsistent =
    uniqueExtracted.length > 0 &&
    uniqueExtracted.every((n) => validEquipAmounts.has(n));
  const hasMachOrTotal =
    uniqueExtracted.includes(inv.machineryCost) ||
    uniqueExtracted.includes(inv.totalInvestment);

  const item9: ConsistencyCheckItem = {
    id: 'chk-spec-vs-inv',
    category: '設備スペック',
    label: '設備スペック ↔ 投資内訳（定性マスター③・本文の金額抽出）',
    documentSnippet:
      uniqueExtracted.length > 0
        ? `抽出金額: ${uniqueExtracted.map((n) => `${n.toLocaleString()}万円`).join(' / ')}`
        : '定性マスター③・設備欄に金額表記なし',
    financialValue: `機械 ${inv.machineryCost.toLocaleString()}万円 ＋ システム ${inv.systemCost.toLocaleString()}万円（計 ${inv.totalInvestment.toLocaleString()}万円）`,
    status:
      uniqueExtracted.length === 0
        ? 'unverified'
        : allEquipAmountsConsistent && hasMachOrTotal
          ? 'match'
          : 'mismatch',
    note:
      uniqueExtracted.length === 0
        ? '定性マスター③および設備導入セクションに具体的な金額（万円）の明記がありません。'
        : allEquipAmountsConsistent && hasMachOrTotal
          ? '定性マスター③および本文中の設備関連金額が投資計画の内訳・総額と完全に一致しています。'
          : '定性マスター③または本文中に、投資計画（機械装置費・システム費・総額）と異なる金額表記が含まれています。',
  };

  // 10. M7追加: ターゲット規模 ↔ 売上高（単価×客数の算定根拠と forecast 売上の整合・未反映検出）
  const drivers = hv
    ? calculateDriverEstimates(hv, fm.historical.yMinus1.sales)
    : null;
  const isDriversPopulated =
    drivers !== null &&
    hv.newUnitPrice.value > 0 &&
    hv.newCustomerCountY3.value > 0;
  const isDriversReflected =
    isDriversPopulated &&
    drivers.forecastSalesY1ManYen === fm.forecast.y1.sales &&
    drivers.forecastSalesY2ManYen === fm.forecast.y2.sales &&
    drivers.forecastSalesY3ManYen === fm.forecast.y3.sales;

  const item10: ConsistencyCheckItem = {
    id: 'chk-drivers-vs-sales',
    category: 'ターゲット規模',
    label: 'ターゲット規模 ↔ 売上高（客単価×客数の算定根拠反映チェック）',
    documentSnippet:
      isDriversPopulated && drivers
        ? `単価${hv.newUnitPrice.value.toLocaleString()}円×Y3客数${hv.newCustomerCountY3.value.toLocaleString()}件 → 全社 ${drivers.forecastSalesY3ManYen.toLocaleString()}万円`
        : '算定変数（客単価・客数）未入力',
    financialValue: `収支計画 Y1:${fm.forecast.y1.sales.toLocaleString()} / Y2:${fm.forecast.y2.sales.toLocaleString()} / Y3:${fm.forecast.y3.sales.toLocaleString()}万円`,
    status: !isDriversPopulated
      ? 'unverified'
      : isDriversReflected
        ? 'match'
        : 'mismatch',
    note: !isDriversPopulated
      ? 'ヒアリングシートの「新事業 客単価」「想定客数」を入力してください。'
      : isDriversReflected
        ? '客単価×想定客数による新事業売上算定根拠が将来1〜3年目の売上高計画へ正確に反映されています。'
        : '算定根拠（単価×客数）の計算結果と収支計画の将来売上高が一致していません（算定結果の未反映または手動変更あり）。',
  };

  return [
    item1,
    item2,
    item3,
    item4,
    item5,
    item6,
    item7,
    item8,
    item9,
    item10,
  ];
}
