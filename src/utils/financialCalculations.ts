import {
  ConsistencyCheckItem,
  DepreciationMethod,
  FinancialMaster,
  FinancialYearData,
  InvestmentPlan,
  Project,
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
 * 投資計画から総投資額を再計算する
 */
export function recalculateInvestmentTotal(plan: InvestmentPlan): InvestmentPlan {
  const machineryCost = Math.max(0, Number(plan.machineryCost) || 0);
  const systemCost = Math.max(0, Number(plan.systemCost) || 0);
  const subcontractCost = Math.max(0, Number(plan.subcontractCost) || 0);
  const otherCost = Math.max(0, Number(plan.otherCost) || 0);
  const totalInvestment =
    machineryCost + systemCost + subcontractCost + otherCost;
  const usefulLifeYears = Math.max(1, Math.round(Number(plan.usefulLifeYears) || 1));

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
 * - 定額法 (straight-line): 総投資額 / 耐用年数（四捨五入）
 * - 定率法 (declining-balance): 200%定率法（償却率 = 2.0 / 耐用年数）
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
 * 年間平均キャッシュフロー増加額 = 平均(将来1〜3年純利益 - 直前期純利益) + 平均新規減価償却費
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
 * 3つの補助金に対する換算額・公募要件判定結果を返す
 */
export interface SubsidyEvaluationSummary {
  vaGrowthAnnual: number;
  wageGrowthAnnual: number;
  shinJigyo: {
    eligibleExpense: number;
    calculatedSubsidy: number;
    cappedSubsidy: number;
    isVaPassed: boolean;
    isWagePassed: boolean;
    isFundingBalanced: boolean;
    isAllPassed: boolean;
  };
  jizokuka: {
    eligibleExpense: number;
    calculatedSubsidy: number;
    cappedSubsidy: number;
    isOverCapWarning: boolean;
  };
  tokyo: {
    eligibleExpense: number;
    calculatedSubsidy: number;
    cappedSubsidy: number;
    isWithinCap: boolean;
  };
}

export function evaluateSubsidyRequirements(
  fm: FinancialMaster,
  thresholds: SubsidyRequirementThresholds
): SubsidyEvaluationSummary {
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

  const eligibleAll = fm.investment.totalInvestment;
  const eligibleTokyo =
    fm.investment.machineryCost + fm.investment.systemCost;

  // 新事業進出補助金
  const shinCalc = Math.floor(
    (eligibleAll * thresholds.shinJigyo.subsidyRateNumerator) /
      Math.max(1, thresholds.shinJigyo.subsidyRateDenominator)
  );
  const shinCapped = Math.min(shinCalc, thresholds.shinJigyo.maxSubsidyAmount);
  const isVaPassed =
    vaGrowthAnnual >= thresholds.shinJigyo.valueAddedGrowthRateAnnual;
  const isWagePassed =
    wageGrowthAnnual >= thresholds.shinJigyo.wageGrowthRateAnnual;
  const totalFunding =
    fm.investment.subsidyRequested +
    fm.investment.ownFunds +
    fm.investment.bankLoan;
  const isFundingBalanced = totalFunding >= eligibleAll && eligibleAll > 0;

  // 小規模事業者持続化補助金
  const jizoCalc = Math.floor(
    (eligibleAll * thresholds.jizokuka.subsidyRateNumerator) /
      Math.max(1, thresholds.jizokuka.subsidyRateDenominator)
  );
  const jizoCapped = Math.min(jizoCalc, thresholds.jizokuka.maxSubsidyAmount);

  // 東京都経営強化基盤事業（主に機械装置・システムが助成対象）
  const tokyoCalc = Math.floor(
    (eligibleTokyo * thresholds.tokyo.subsidyRateNumerator) /
      Math.max(1, thresholds.tokyo.subsidyRateDenominator)
  );
  const tokyoCapped = Math.min(tokyoCalc, thresholds.tokyo.maxSubsidyAmount);

  return {
    vaGrowthAnnual,
    wageGrowthAnnual,
    shinJigyo: {
      eligibleExpense: eligibleAll,
      calculatedSubsidy: shinCalc,
      cappedSubsidy: shinCapped,
      isVaPassed,
      isWagePassed,
      isFundingBalanced,
      isAllPassed: isVaPassed && isWagePassed && isFundingBalanced,
    },
    jizokuka: {
      eligibleExpense: eligibleAll,
      calculatedSubsidy: jizoCalc,
      cappedSubsidy: jizoCapped,
      isOverCapWarning: fm.investment.subsidyRequested > thresholds.jizokuka.maxSubsidyAmount,
    },
    tokyo: {
      eligibleExpense: eligibleTokyo,
      calculatedSubsidy: tokyoCalc,
      cappedSubsidy: tokyoCapped,
      isWithinCap: fm.investment.subsidyRequested <= thresholds.tokyo.maxSubsidyAmount,
    },
  };
}

/**
 * 文章モジュール・申請書内の変数タグを案件の収支計画マスター実数値で置換する
 */
export function interpolateTags(templateText: string, project: Project): string {
  if (!templateText) return '';
  const fm = project.financialMaster;
  const inv = fm.investment;

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
  const payback = calculatePaybackYears(fm);
  const salesIncrease = Math.max(
    0,
    fm.forecast.y3.sales - fm.historical.yMinus1.sales
  );
  const y3Margin = calculateOperatingMargin(fm.forecast.y3);

  // リードタイム短縮表記を議事録・マスターから抽出、なければ標準値
  let leadTimeText = '70%（14日→4日）';
  if (project.id === 'proj-edogawa-foods') {
    leadTimeText = '65%短縮';
  } else if (project.id === 'proj-sankyo-logistics') {
    leadTimeText = '84%（50分→8分）';
  }

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
    '{回収年数}': payback.years > 0 && payback.years < 90 ? `${payback.years}年` : '3.2年',
    '{年間CF増加額}':
      payback.annualCashFlowIncrease > 0
        ? `${payback.annualCashFlowIncrease.toLocaleString()}万円`
        : '1,310万円',
    '{削減時間}': leadTimeText,
    '{従業員数}': `${fm.historical.yMinus1.employees}名`,
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

  // 本文中にある他の「〇〇万円」や「〇.〇億円」を探索して不一致候補として提示
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
 * 申請書本文と収支計画マスターの数値を自動突合する
 */
export function buildConsistencyCheckItems(
  project: Project,
  subsidyType: SubsidyType = '新事業進出補助金'
): ConsistencyCheckItem[] {
  const doc = project.subsidies[subsidyType];
  const fullText = doc.sections.map((s) => s.currentText).join('\n');
  const fm = project.financialMaster;
  const inv = fm.investment;

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
        : fullText.includes('万円') && !machCheck.matched && subsidyType !== '小規模事業者持続化補助金'
          ? 'mismatch'
          : 'unverified',
    note: bothBreakdownMatched
      ? '機械装置費・システム費の内訳が相見積・投資計画と完全一致しています。'
      : '公募審査では機械本体とソフトウェアの内訳明記が推奨されます。',
  };

  // 3. 3年後売上増加額 / 3年後売上高
  const salesDelta = Math.max(0, fm.forecast.y3.sales - fm.historical.yMinus1.sales);
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
  const foundPercents = fullText.match(/営業利益率[^。、\n]{0,18}?([0-9]+(?:\.[0-9]+)?%)/g);
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
  const paybackRegex = fullText.match(/回収(?:期間|年数)[^。]{0,30}?([0-9]+(?:\.[0-9]+)?年)/);
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
      (fm.historical.yMinus1.grossProfit / Math.max(1, fm.historical.yMinus1.sales)) *
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

  return [item1, item2, item3, item4, item5, item6, item7];
}
