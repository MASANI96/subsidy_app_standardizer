/**
 * 初期データプリセット (Initial Data)
 * 【STEP1要件準拠】
 * 1. 既存の架空5社を削除し、受領した案件1社「株式会社○○」に置き換え。
 * 2. 補助金は「新事業進出・ものづくり商業サービス補助金」（革新枠・新事業枠・グローバル枠）。既存の持続化・東京都は削除。
 * 3. 公募回設定は「版（例：第1回 ver1.3）」として管理。
 * 4. 金額はすべて「円単位の整数」で保持。
 * 5. 公式インポート用フォーマット（596,000,000円）とv36収益計画（630,000,000円）の不一致を保持し「不一致・要確認」フラグを設定。
 */

import {
  BalanceSheetData,
  GanttTemplateTask,
  HearingItem,
  HearingMasterItem,
  HearingVariables,
  InitialProjectDefaults,
  PeriodFiscalInfo,
  PeriodKey,
  PhaseGate,
  ProfitAndLossData,
  Project,
  ProjectFinancialMaster,
  SubsidyAppState,
  SubsidyDocument,
  SubsidySection,
  SubsidyTrack,
  SubsidyType,
  SubsidyVersionRound,
  TentativeItem,
} from '../types';
import {
  calculateAnnualSalesEstimate,
  calculateFiscalYears,
  recalculateBS,
  recalculatePL,
} from '../utils/financialCalculations';

/** 補助金枠定義（3枠） */
export const INITIAL_TRACKS: SubsidyTrack[] = [
  {
    id: 'kakushin',
    name: '革新的新製品・サービス枠',
    shortName: '革新枠',
    description:
      '革新的な製品・サービスの開発や、生産プロセス・サービス提供方法の改善に必要な設備・システム投資等を支援する枠。',
    subsidyRateNumerator: 1,
    subsidyRateDenominator: 2,
    wageSpecialRateNumerator: 2,
    wageSpecialRateDenominator: 3,
    minSubsidyAmountYen: 7500000, // 750万円
    executionPeriodMonths: 10, // 10か月（公募要領ver1.3・仮）
    executionPeriodMonthsTentative: true,
    applicationDeadline: '2026-12-25',
    adoptionDate: '2027-02-28',
    grantDecisionLeadMonths: 1,
    capTiers: [
      {
        id: 'tier-kakushin-1',
        minEmployees: 0,
        maxEmployees: 5,
        label: '5人以下',
        standardCapYen: 7500000, // 750万円
        wageSpecialCapYen: 10000000, // 1,000万円
        isTentative: false,
      },
      {
        id: 'tier-kakushin-2',
        minEmployees: 6,
        maxEmployees: 20,
        label: '6〜20人',
        standardCapYen: 15000000, // 1,500万円
        wageSpecialCapYen: 20000000, // 2,000万円
        isTentative: false,
      },
      {
        id: 'tier-kakushin-3',
        minEmployees: 21,
        maxEmployees: 50,
        label: '21〜50人',
        standardCapYen: 30000000, // 3,000万円
        wageSpecialCapYen: 40000000, // 4,000万円
        isTentative: false,
      },
      {
        id: 'tier-kakushin-4',
        minEmployees: 51,
        maxEmployees: null,
        label: '51人以上',
        standardCapYen: 50000000, // 5,000万円
        wageSpecialCapYen: 70000000, // 7,000万円
        isTentative: false,
      },
    ],
  },
  {
    id: 'shinjigyo',
    name: '新事業進出枠',
    shortName: '新事業枠',
    description:
      '既存事業と異なる新たな事業分野に進出し、高い成長を目指す中堅・中小企業の意欲的な挑戦を支援する枠。',
    subsidyRateNumerator: 1,
    subsidyRateDenominator: 2,
    wageSpecialRateNumerator: 2,
    wageSpecialRateDenominator: 3,
    minSubsidyAmountYen: 7500000, // 750万円
    executionPeriodMonths: 14, // 14か月（公募要領ver1.3・仮）
    executionPeriodMonthsTentative: true,
    applicationDeadline: '2026-12-25',
    adoptionDate: '2027-02-28',
    grantDecisionLeadMonths: 1,
    capTiers: [
      {
        id: 'tier-shinjigyo-1',
        minEmployees: 0,
        maxEmployees: 20,
        label: '20人以下',
        standardCapYen: 25000000, // 2,500万円
        wageSpecialCapYen: 30000000, // 3,000万円
        isTentative: false,
      },
      {
        id: 'tier-shinjigyo-2',
        minEmployees: 21,
        maxEmployees: 50,
        label: '21〜50人',
        standardCapYen: 40000000, // 4,000万円
        wageSpecialCapYen: 50000000, // 5,000万円
        isTentative: false,
      },
      {
        id: 'tier-shinjigyo-3',
        minEmployees: 51,
        maxEmployees: 100,
        label: '51〜100人',
        standardCapYen: 55000000, // 5,500万円
        wageSpecialCapYen: 70000000, // 7,000万円
        isTentative: false,
      },
      {
        id: 'tier-shinjigyo-4',
        minEmployees: 101,
        maxEmployees: null,
        label: '101人以上',
        standardCapYen: 70000000, // 7,000万円
        wageSpecialCapYen: 90000000, // 9,000万円
        isTentative: false,
      },
    ],
  },
  {
    id: 'global',
    name: 'グローバル枠',
    shortName: 'グローバル枠',
    description:
      '海外事業展開を目的とした設備投資や市場開拓・国際共同開発等を強力に後押しする枠。',
    subsidyRateNumerator: 1,
    subsidyRateDenominator: 2,
    minSubsidyAmountYen: 10000000, // 1,000万円
    executionPeriodMonths: 12, // 12か月（仮値）
    executionPeriodMonthsTentative: true,
    applicationDeadline: '2026-12-25',
    adoptionDate: '2027-02-28',
    grantDecisionLeadMonths: 1,
    capTiers: [
      {
        id: 'tier-global-1',
        minEmployees: 0,
        maxEmployees: null,
        label: '全規模一律',
        standardCapYen: 30000000, // 3,000万円
        wageSpecialCapYen: 40000000, // 4,000万円
        isTentative: true,
      },
    ],
  },
];

/** 初期公募回（版）：第1回 ver1.3 */
export const INITIAL_CALL_ROUNDS: SubsidyVersionRound[] = [
  {
    id: 'round-ver-1-3',
    versionCode: '第1回 ver1.3',
    subsidyName: '新事業進出・ものづくり商業サービス補助金',
    officialNoticeDate: '2026-10-01',
    memo: '公募要領ver1.3に準拠した最新基準設定。革新・新事業進出・グローバルの3枠を定義。',
    tracks: INITIAL_TRACKS,
    requirements: {
      valueAddedCAGR: 4.0, // 付加価値額年率CAGR 4.0%以上
      wageCAGR: 3.5, // 一人当たり給与CAGR 3.5%以上
      minWageDiffYen: 30, // 事業場内最低賃金 ≧ 地域別最低賃金 + 30円
      wageSpecialCAGR: 6.0, // 賃上げ特例 給与CAGR 6.0%以上
      wageSpecialMinWageDiffYen: 50, // 特例時最賃 ≧ 地域別最低賃金 + 50円
      inflationRatePercent: 2.0, // 足下物価上昇率 2.0%（仮値）
      inflationRateTentative: true,
      moderateRanges: {
        valueAddedCAGR: { min: 4.0, max: 5.0, isTentative: true }, // 付加価値「ほどよく」4.0〜5.0%
        wageCAGR: { min: 3.5, max: 4.5, isTentative: true }, // 給与「ほどよく」3.5〜4.5%
        wageSpecialCAGR: { min: 6.0, max: 7.0, isTentative: true }, // 特例時「ほどよく」6.0〜7.0%
      },
    },
    isLatest: true,
    createdAt: '2026-10-01 10:00',
    sectionCharLimits: {
      'sec-1': 500,
      'sec-2': 500,
      'sec-3': 500,
    },
    reviewCriteria: [],
    generationPrompts: [],
  },
  {
    id: 'round-ver-1-2-legacy',
    versionCode: '第1回 ver1.2（旧版）',
    subsidyName: '新事業進出・ものづくり商業サービス補助金',
    officialNoticeDate: '2026-06-01',
    memo: '過年度・改定前比較検証用サンプル（既存案件の版固定確認用）',
    tracks: INITIAL_TRACKS.map((t) => ({
      ...t,
      minSubsidyAmountYen: 5000000,
    })),
    requirements: {
      valueAddedCAGR: 3.0,
      wageCAGR: 1.5,
      minWageDiffYen: 30,
      wageSpecialCAGR: 3.0,
      wageSpecialMinWageDiffYen: 50,
      inflationRatePercent: 1.5,
      inflationRateTentative: true,
      moderateRanges: {
        valueAddedCAGR: { min: 3.0, max: 4.0, isTentative: true },
        wageCAGR: { min: 1.5, max: 2.5, isTentative: true },
        wageSpecialCAGR: { min: 3.0, max: 4.0, isTentative: true },
      },
    },
    isLatest: false,
    createdAt: '2026-06-01 09:00',
    sectionCharLimits: {
      'sec-1': 500,
      'sec-2': 500,
      'sec-3': 500,
    },
    reviewCriteria: [],
    generationPrompts: [],
  },
];

/** 初期「仮」の値一覧 */
export const INITIAL_TENTATIVE_ITEMS: TentativeItem[] = [
  {
    id: 'tent-1',
    category: '枠設定',
    keyName: 'executionPeriodMonths_kakushin',
    label: '革新的新製品・サービス枠 補助事業実施期間',
    currentValue: 10,
    unit: 'か月',
    rationale: '公募要領ver1.3で一部記載不明のため、標準的な10か月を仮設定',
    isConfirmed: false,
    editableInAdmin: true,
  },
  {
    id: 'tent-2',
    category: '枠設定',
    keyName: 'executionPeriodMonths_shinjigyo',
    label: '新事業進出枠 補助事業実施期間',
    currentValue: 14,
    unit: 'か月',
    rationale: '新事業進出の大型設備導入に伴い、公募要領仮値として14か月を設定',
    isConfirmed: false,
    editableInAdmin: true,
  },
  {
    id: 'tent-3',
    category: '公募回要件',
    keyName: 'inflationRatePercent',
    label: '足下の賃上げ要件 物価上昇率',
    currentValue: 2.0,
    unit: '%',
    rationale: '直近消費者物価指数動向を踏まえた参考基準値（仮値2.0%）',
    isConfirmed: false,
    editableInAdmin: true,
  },
  {
    id: 'tent-4',
    category: '公募回要件',
    keyName: 'moderateRange_valueAdded',
    label: '付加価値額CAGR「ほどよく」範囲',
    currentValue: '4.0〜5.0',
    unit: '%',
    rationale: '審査員に過大計画と見なされないための安全推奨レンジ（仮値）',
    isConfirmed: false,
    editableInAdmin: true,
  },
  {
    id: 'tent-5',
    category: '公募回要件',
    keyName: 'moderateRange_wage',
    label: '一人当たり給与CAGR「ほどよく」範囲（通常 / 特例）',
    currentValue: '3.5〜4.5 / 6.0〜7.0',
    unit: '%',
    rationale: '要件達成かつ実現可能性が疑われない推奨レンジ（仮値）',
    isConfirmed: false,
    editableInAdmin: true,
  },
  {
    id: 'tent-6',
    category: '算出方式',
    keyName: 'annualSalesEstimateMethod',
    label: '新製品等1年当たり売上見込額の算出方法',
    currentValue: '補助事業売上の計画期間平均',
    unit: '方式',
    rationale: '初期デフォルトとして計画3〜5ヶ年の算術平均を適用（仮値）',
    isConfirmed: false,
    editableInAdmin: true,
  },
  {
    id: 'tent-7',
    category: '案件数値',
    keyName: 'annualSalesEstimateMismatch',
    label: '1年当たり売上見込額（インポートフォーマット vs v36）不一致',
    currentValue: '596,000,000円 vs 630,000,000円',
    unit: '円',
    rationale: '提供資料間（インポートシート5.96億円 vs v36計画6.3億円）で数値乖離あり・要確認',
    isConfirmed: false,
    editableInAdmin: true,
  },
];

/** 空のBS初期生成ヘルパー */
export function createEmptyBS(): BalanceSheetData {
  return recalculateBS({
    currentAssets: {
      cashAndDeposits: 0,
      notesReceivable: 0,
      accountsReceivable: 0,
      securities: 0,
      inventories: 0,
      otherCurrentAssets: 0,
      totalCurrentAssets: 0,
    },
    fixedAssets: {
      tangibleFixedAssets: {
        buildings: 0,
        machineryAndEquipment: 0,
        vehicles: 0,
        toolsFurnitureFixtures: 0,
        land: 0,
        constructionInProgress: 0,
        otherTangibleAssets: 0,
        totalTangibleAssets: 0,
      },
      intangibleFixedAssets: {
        software: 0,
        goodwill: 0,
        patentRights: 0,
        otherIntangibleAssets: 0,
        totalIntangibleAssets: 0,
      },
      investmentsAndOtherAssets: {
        investmentSecurities: 0,
        longTermLoans: 0,
        otherInvestments: 0,
        totalInvestments: 0,
      },
      totalFixedAssets: 0,
    },
    deferredAssets: 0,
    totalAssets: 0,
    currentLiabilities: {
      notesPayable: 0,
      accountsPayable: 0,
      shortTermBorrowings: 0,
      accruedExpenses: 0,
      otherCurrentLiabilities: 0,
      totalCurrentLiabilities: 0,
    },
    fixedLiabilities: {
      bondsPayable: 0,
      longTermBorrowings: 0,
      otherFixedLiabilities: 0,
      totalFixedLiabilities: 0,
    },
    totalLiabilities: 0,
    shareholdersEquity: {
      capitalStock: 0,
      capitalSurplus: 0,
      retainedEarnings: 0,
      treasuryStock: 0,
      totalShareholdersEquity: 0,
    },
    valuationAndTranslationAdjustments: 0,
    subscriptionRights: 0,
    totalNetAssets: 0,
    totalLiabilitiesAndNetAssets: 0,
  });
}

/** 空のPL初期生成ヘルパー */
export function createEmptyPL(periodMonths = 12): ProfitAndLossData {
  return recalculatePL({
    existingBusiness: {
      sales: 0,
      costOfSales: 0,
      grossProfit: 0,
      sga: 0,
      operatingProfit: 0,
    },
    subsidyBusiness: {
      sales: 0,
      costOfSales: 0,
      grossProfit: 0,
      sga: 0,
      operatingProfit: 0,
    },
    totalSales: 0,
    totalCostOfSales: 0,
    totalGrossProfit: 0,
    totalSga: 0,
    totalOperatingProfit: 0,
    nonOperatingIncome: 0,
    nonOperatingExpenses: 0,
    ordinaryProfit: 0,
    extraordinaryIncome: 0,
    extraordinaryLosses: 0,
    incomeBeforeTaxes: 0,
    incomeTaxes: 0,
    netIncome: 0,
    laborCost: 0,
    depreciation: 0,
    valueAdded: 0,
    numberOfDirectors: 0,
    directorRemuneration: 0,
    numberOfEmployees: 0,
    totalWages: 0,
    perCapitaWage: 0,
    workplaceMinWage: 1113,
    regionalMinWage: 1113,
    periodMonths,
    isIrregularPeriod: periodMonths !== 12,
  });
}

/**
 * デモデータ「株式会社○○」の財務マスター作成
 * インポート用フォーマット（入力済み版）およびv36収益計画Excelの値を使用。
 * 読み取れない値は0を入れ「要確認」とする。
 */
export function createDemoCompanyFinancialMaster(): ProjectFinancialMaster {
  const fiscalMonth = 3;
  const appliedTrack = INITIAL_TRACKS[1]; // 新事業進出枠
  const autoCalc = calculateFiscalYears(
    fiscalMonth,
    appliedTrack.applicationDeadline,
    appliedTrack.adoptionDate,
    appliedTrack.executionPeriodMonths
  );

  const createPeriodData = (
    key: PeriodKey,
    label: string,
    subLabel: string,
    year: number,
    isHist: boolean,
    isCurrent: boolean,
    isBase: boolean,
    isFore: boolean,
    salesExisting: number,
    salesSubsidy: number,
    cosExisting: number,
    cosSubsidy: number,
    sgaExisting: number,
    sgaSubsidy: number,
    labor: number,
    deprec: number,
    employees: number,
    wages: number,
    workMinWage: number,
    regMinWage: number
  ) => {
    const bs = createEmptyBS();
    // 実績および計画BSのモデルデータ
    bs.currentAssets.cashAndDeposits = Math.round(salesExisting * 0.18);
    bs.currentAssets.accountsReceivable = Math.round(salesExisting * 0.22);
    bs.currentAssets.inventories = Math.round(cosExisting * 0.15);
    bs.fixedAssets.tangibleFixedAssets.machineryAndEquipment = Math.round(
      salesExisting * 0.35 + (isFore ? 85000000 : 0)
    );
    bs.fixedAssets.intangibleFixedAssets.software = Math.round(
      salesExisting * 0.05 + (isFore ? 15000000 : 0)
    );
    bs.fixedAssets.tangibleFixedAssets.buildings = Math.round(salesExisting * 0.2);
    bs.shareholdersEquity.capitalStock = 50000000;
    bs.shareholdersEquity.retainedEarnings = Math.round(salesExisting * 0.4);
    bs.currentLiabilities.shortTermBorrowings = Math.round(salesExisting * 0.12);
    bs.fixedLiabilities.longTermBorrowings = Math.round(
      salesExisting * 0.25 + (isFore ? 30000000 : 0)
    );

    const calculatedBS = recalculateBS(bs);

    const pl = createEmptyPL(12);
    pl.existingBusiness.sales = salesExisting;
    pl.existingBusiness.costOfSales = cosExisting;
    pl.existingBusiness.sga = sgaExisting;
    pl.subsidyBusiness.sales = salesSubsidy;
    pl.subsidyBusiness.costOfSales = cosSubsidy;
    pl.subsidyBusiness.sga = sgaSubsidy;
    pl.laborCost = labor;
    pl.depreciation = deprec;
    pl.numberOfDirectors = 3;
    pl.directorRemuneration = 36000000;
    pl.numberOfEmployees = employees;
    pl.totalWages = wages;
    pl.workplaceMinWage = workMinWage;
    pl.regionalMinWage = regMinWage;

    const calculatedPL = recalculatePL(pl);

    const fiscalInfo: PeriodFiscalInfo = {
      key,
      label,
      subLabel,
      fiscalYear: year,
      fiscalMonth,
      periodMonths: 12,
      isIrregular: false,
      isHistorical: isHist,
      isCurrentFY: isCurrent,
      isBaseFY: isBase,
      isForecast: isFore,
    };

    return { bs: calculatedBS, pl: calculatedPL, fiscalInfo };
  };

  const periods: Record<PeriodKey, ReturnType<typeof createPeriodData>> = {
    // 2期前 (2024年3月期)
    yMinus2: createPeriodData(
      'yMinus2',
      '2期前',
      '実績 (2024年3月期)',
      2024,
      true,
      false,
      false,
      false,
      2100000000, // 既存売上 21億円
      0, // 補助事業売上 なし
      1580000000,
      0,
      430000000,
      0,
      280000000,
      50000000,
      45,
      225000000,
      1130,
      1113
    ),
    // 1期前 (2025年3月期)
    yMinus1: createPeriodData(
      'yMinus1',
      '1期前',
      '実績 (2025年3月期)',
      2025,
      true,
      false,
      false,
      false,
      2250000000, // 既存売上 22.5億円
      0,
      1690000000,
      0,
      450000000,
      0,
      295000000,
      55000000,
      46,
      234600000,
      1150,
      1113
    ),
    // 直近 (2026年3月期)
    y0: createPeriodData(
      'y0',
      '直近',
      '直近実績 (2026年3月期)',
      2026,
      true,
      false,
      false,
      false,
      2400000000, // 既存売上 24億円
      0,
      1800000000,
      0,
      470000000,
      0,
      310000000,
      60000000,
      48,
      249600000, // 520万円/人
      1170,
      1113
    ),
    // 申請時事業年度 (2027年3月期)
    currentFY: createPeriodData(
      'currentFY',
      '申請時事業年度',
      '進行期 (2027年3月期)',
      2027,
      false,
      true,
      false,
      false,
      2450000000,
      0,
      1830000000,
      0,
      480000000,
      0,
      320000000,
      62000000,
      49,
      259700000, // 530万円/人
      1180,
      1113
    ),
    // 基準年度 (2028年3月期) ＝ 完了予定日を含む期
    baseFY: createPeriodData(
      'baseFY',
      '基準年度',
      '事業完了期 (2028年3月期)',
      2028,
      false,
      false,
      true,
      false,
      2500000000,
      150000000, // 補助事業初期売上 1.5億円
      1860000000,
      95000000,
      490000000,
      35000000,
      335000000,
      75000000, // 設備導入に伴う増
      50,
      270000000, // 540万円/人
      1210, // 最低賃金 + 50円以上クリア
      1150
    ),
    // 計画1年目 (2029年3月期)
    p1: createPeriodData(
      'p1',
      '計画1年目',
      '目標期 (2029年3月期)',
      2029,
      false,
      false,
      false,
      true,
      2520000000,
      450000000, // 補助事業売上
      1870000000,
      280000000,
      495000000,
      85000000,
      355000000,
      82000000,
      52,
      291200000, // 560万円/人
      1230,
      1150
    ),
    // 計画2年目 (2030年3月期)
    p2: createPeriodData(
      'p2',
      '計画2年目',
      '目標期 (2030年3月期)',
      2030,
      false,
      false,
      false,
      true,
      2540000000,
      596000000, // インポート用フォーマット値 (596,000,000円)
      1880000000,
      370000000,
      500000000,
      110000000,
      375000000,
      82000000,
      54,
      313200000, // 580万円/人
      1250,
      1150
    ),
    // 計画3年目 (2031年3月期)
    p3: createPeriodData(
      'p3',
      '計画3年目',
      '目標期 (2031年3月期)',
      2031,
      false,
      false,
      false,
      true,
      2550000000,
      630000000, // v36収益計画値 (630,000,000円)
      1885000000,
      390000000,
      505000000,
      115000000,
      395000000,
      82000000,
      55,
      330000000, // 600万円/人 (年率3.5%以上、特例時要件クリア)
      1260,
      1150
    ),
    // 計画4年目 (2032年3月期)
    p4: createPeriodData(
      'p4',
      '計画4年目',
      '目標期 (2032年3月期)',
      2032,
      false,
      false,
      false,
      true,
      2560000000,
      680000000,
      1890000000,
      420000000,
      510000000,
      120000000,
      410000000,
      80000000,
      56,
      347200000,
      1280,
      1150
    ),
    // 計画5年目 (2033年3月期)
    p5: createPeriodData(
      'p5',
      '計画5年目',
      '目標期 (2033年3月期)',
      2033,
      false,
      false,
      false,
      true,
      2570000000,
      720000000,
      1895000000,
      445000000,
      515000000,
      125000000,
      425000000,
      78000000,
      57,
      364800000,
      1300,
      1150
    ),
  };

  const initialFinancial: ProjectFinancialMaster = {
    status: 'draft',
    appliedTrackId: 'shinjigyo',
    planningYears: 3, // デフォルト3年計画
    employeeCountMethod: 'periodEnd', // (A) 期末人数方式
    fiscalMonth,
    autoFiscalCalc: autoCalc,
    isWageSpecialApplied: true, // 賃上げ特例適用
    investment: {
      newMachineryInvestment: 85000000, // 機械装置 8,500万円
      intangibleAssetInvestment: 15000000, // ソフトウェア 1,500万円
      rdCost: 0, // 読み取れず0・要確認
      humanResourceDevelopmentCost: 0, // 読み取れず0・要確認
      totalInvestmentYen: 100000000, // 総投資額 1億円
      subsidyRequestedYen: 50000000, // 補助金申請額 5,000万円 (1/2または2/3規模区分内)
      totalInvestment: 100000000,
      subsidyRequested: 50000000,
      ownFundsYen: 20000000, // 自己資金 2,000万円
      bankLoansYen: 30000000, // 借入金 3,000万円
      otherFundsYen: 0,
      usefulLifeYears: 7,
      depreciationMethod: 'straight-line',
    },
    annualSalesEstimate: {
      method: 'planAverage',
      calculatedValueYen: 558666667, // (4.5億 + 5.96億 + 6.3億) / 3
      officialFormatValueYen: 596000000,
      v36ExcelValueYen: 630000000,
      hasMismatch: true,
      mismatchNote:
        '不一致・要確認：公式インポート用フォーマット値（596,000,000円）とv36収益計画値（630,000,000円）が一致していません。両方の値を保持しています。',
      isTentative: true,
    },
    forecast: {
      y1: {
        sales: 450000000,
        costOfSales: 315000000,
        grossProfit: 135000000,
        sga: 70000000,
        laborCost: 155000000,
        depreciation: 14285714,
        operatingProfit: 65000000,
        ordinaryProfit: 63000000,
        netProfit: 44000000,
        valueAdded: 234285714,
        employees: 48,
        totalWages: 180000000,
      },
      y2: {
        sales: 596000000,
        costOfSales: 417200000,
        grossProfit: 178800000,
        sga: 78000000,
        laborCost: 165000000,
        depreciation: 14285714,
        operatingProfit: 100800000,
        ordinaryProfit: 98000000,
        netProfit: 68600000,
        valueAdded: 280085714,
        employees: 50,
        totalWages: 192000000,
      },
      y3: {
        sales: 630000000,
        costOfSales: 441000000,
        grossProfit: 189000000,
        sga: 82000000,
        laborCost: 175000000,
        depreciation: 14285714,
        operatingProfit: 107000000,
        ordinaryProfit: 104000000,
        netProfit: 72800000,
        valueAdded: 296285714,
        employees: 52,
        totalWages: 205000000,
      },
    },
    periods,
  };

  initialFinancial.annualSalesEstimate = calculateAnnualSalesEstimate(
    initialFinancial,
    'planAverage'
  );

  return initialFinancial;
}

export const DEFAULT_DEMO_HEARING_VARIABLES: HearingVariables = {
  existingUnitPrice: { value: 25000, unit: '円/個', sourceMemo: '既存試作部品平均単価' },
  newUnitPrice: { value: 68000, unit: '円/個', sourceMemo: 'EV向け高付加価値流路ブロック単価' },
  newCustomerCountY1: { value: 5, unit: '社', sourceMemo: 'Tier1メーカー引合' },
  newCustomerCountY2: { value: 12, unit: '社', sourceMemo: '量産試作展開' },
  newCustomerCountY3: { value: 20, unit: '社', sourceMemo: '本格量産移行' },
  repeatRate: { value: 85, unit: '%', sourceMemo: '試作からの量産採用率' },
  reducedWorkHours: { value: 320, unit: '時間/月', sourceMemo: '段取り時間削減' },
  hourlyWage: { value: 2150, unit: '円/時', sourceMemo: '現場技術者平均時給' },
  subcontractReduction: { value: 18000000, unit: '円/年', sourceMemo: '内製化による外注費低減' },
  defectRate: { current: 3.2, target: 0.5, unit: '%', sourceMemo: 'ワンチャッキング加工による不良低減' },
  leadTime: { current: 14, target: 4, unit: '日', sourceMemo: '工程集約によるリードタイム短縮' },
  productionCapacity: { current: 200, target: 600, unit: '個/月', sourceMemo: '5軸マシニング増設による月産能力' },
  newHiresY1: { value: 2, unit: '名', sourceMemo: 'CAMオペレーター採用' },
  newHiresY2: { value: 2, unit: '名', sourceMemo: '検査工程増員' },
  newHiresY3: { value: 2, unit: '名', sourceMemo: '加工エンジニア' },
  plannedWageGrowthRate: { value: 3.5, unit: '%/年', sourceMemo: '公募要件CAGR 3.5%対応' },
};

const DEMO_SECTIONS_COMPAT: SubsidySection[] = [
  {
    id: 'sec-1',
    title: '1. 企業概要・経営環境（新事業進出の背景）',
    sourceMasterIds: ['master-1', 'master-2'],
    sourceMasterLabel: 'マスター① 企業概要・強み ＋ マスター② 現状課題',
    currentText:
      '株式会社○○は、長年培った難削材の超精密加工技術を基盤とし、大手メーカーの試作開発を支えてきた。現在、既存主力事業の市場環境変化を踏まえ、高い成長性が見込まれるEV冷却流路パーツおよび医療機器分野への新事業進出を決定した。',
    aiBaselineText:
      '株式会社○○は、長年培った難削材の超精密加工技術を基盤とし、大手メーカーの試作開発を支えてきた。現在、既存主力事業の市場環境変化を踏まえ、高い成長性が見込まれるEV冷却流路パーツおよび医療機器分野への新事業進出を決定した。',
    charLimit: 500,
    isModified: false,
    selectedLength: '500',
  },
  {
    id: 'sec-2',
    title: '2. 新事業に向けた具体的取り組み（設備導入と生産変革）',
    sourceMasterIds: ['master-3'],
    sourceMasterLabel: 'マスター③ 導入設備仕様',
    currentText:
      '本事業では、総額100,000,000円（機械装置費85,000,000円、ソフトウェア費15,000,000円）の設備投資を実施する。最新の同時5軸マシニングセンタを導入することにより、従来外注に依存していた高難度微細加工を完全内製化し、リードタイム短縮と品質安定化を実現する。',
    aiBaselineText:
      '本事業では、総額100,000,000円（機械装置費85,000,000円、ソフトウェア費15,000,000円）の設備投資を実施する。最新の同時5軸マシニングセンタを導入することにより、従来外注に依存していた高難度微細加工を完全内製化し、リードタイム短縮と品質安定化を実現する。',
    charLimit: 500,
    isModified: false,
    selectedLength: '500',
  },
  {
    id: 'sec-3',
    title: '3. 将来の収益計画・賃上げ・波及効果',
    sourceMasterIds: ['master-4'],
    sourceMasterLabel: 'マスター④ 数値目標・回収計画',
    currentText:
      '事業完了後、補助事業売上は計画3年目に630,000,000円（インポートフォーマット記載596,000,000円・要確認）を達成し、全社付加価値額のCAGRは4.0%以上を堅持する。また事業場内最低賃金を地域別最賃+50円以上へ引き上げ、一人当たり給与支給総額CAGR 3.5%以上の持続的賃上げを確実に実行する。',
    aiBaselineText:
      '事業完了後、補助事業売上は計画3年目に630,000,000円（インポートフォーマット記載596,000,000円・要確認）を達成し、全社付加価値額のCAGRは4.0%以上を堅持する。また事業場内最低賃金を地域別最賃+50円以上へ引き上げ、一人当たり給与支給総額CAGR 3.5%以上の持続的賃上げを確実に実行する。',
    charLimit: 500,
    isModified: false,
    selectedLength: '500',
  },
];

const DEMO_COMPAT_SUBSIDIES: Record<SubsidyType, SubsidyDocument> = {
  '新事業進出・ものづくり商業サービス補助金': {
    subsidyType: '新事業進出・ものづくり商業サービス補助金',
    status: '修正中',
    sections: DEMO_SECTIONS_COMPAT,
    lastSavedAt: '2026-11-10 18:00',
  },
  新事業進出補助金: {
    subsidyType: '新事業進出補助金',
    status: '修正中',
    sections: DEMO_SECTIONS_COMPAT,
    lastSavedAt: '2026-11-10 18:00',
  },
  小規模事業者持続化補助金: {
    subsidyType: '小規模事業者持続化補助金',
    status: '下書き',
    sections: DEMO_SECTIONS_COMPAT,
    lastSavedAt: '2026-11-10 18:00',
  },
  東京都経営強化基盤事業: {
    subsidyType: '東京都経営強化基盤事業',
    status: '下書き',
    sections: DEMO_SECTIONS_COMPAT,
    lastSavedAt: '2026-11-10 18:00',
  },
};

const DEMO_MASTER_ITEMS: HearingMasterItem[] = [
  {
    id: 'master-1',
    title: '1. 企業概要・強み・競合優位性',
    content:
      '株式会社○○は創業38年の歴史を有する精密金属加工企業であり、チタンやインコネル等の難削材に対するミクロン単位の立体切削技術と地域サプライチェーン連携による短納期供給力を中核的な強みとしている。',
    prompt: '強みと取引基盤を抽出',
  },
  {
    id: 'master-2',
    title: '2. 現状の経営課題・新事業進出の背景',
    content:
      '既存主力事業である内燃機関自動車部品の需要縮小に伴い利益率が低下。高成長が見込まれるEVバッテリー冷却ユニット部品および次世代医療機器部品への新事業進出が急務となっている。',
    prompt: '市場課題と進出理由',
  },
  {
    id: 'master-3',
    title: '3. 導入設備仕様・内製化プロセス',
    content:
      '最新鋭の大型同時5軸マシニングセンタ（8,500万円）および専用CAMシステム（1,500万円）の総額1億円を導入し、複数工程の段取り替えをワンチャッキング連続加工へ集約・内製完結化する。',
    prompt: '設備仕様と工程集約',
  },
  {
    id: 'master-4',
    title: '4. 数値目標・投資回収・賃上げ計画',
    content:
      'リードタイムを70%短縮し外注費を内製化。補助事業売上は計画3年目に6.3億円を見込み、付加価値額年率4.0%以上および従業員一人当たり給与年率3.5%以上の継続的賃上げを達成する。',
    prompt: '定性・定量効果',
  },
];

/** 単一デモ企業「株式会社○○」 */
export const DEMO_PROJECT_MARUMARU: Project = {
  id: 'proj-marumaru-1',
  code: 'AN-2026-001',
  companyName: '株式会社○○',
  industry: '精密機械・金属加工業',
  salesRep: '田中 健太',
  writerName: '佐藤 美咲',
  deadline: '2026-12-25',
  status: '収支計画作成中',
  appliedVersionId: 'round-ver-1-3',
  appliedTrackId: 'shinjigyo',
  financialMaster: createDemoCompanyFinancialMaster(),
  masterItems: DEMO_MASTER_ITEMS,
  hearingVariables: DEFAULT_DEMO_HEARING_VARIABLES,
  subsidies: DEMO_COMPAT_SUBSIDIES,
  hearingMasterItems: [
    {
      id: 'h-1',
      title: '1. 企業概要・強み・競合優位性',
      content:
        '株式会社○○は創業38年の歴史を有する精密金属加工企業であり、チタンやインコネル等の難削材に対するミクロン単位の立体切削技術と地域サプライチェーン連携による短納期供給力を中核的な強みとしている。',
      prompt: '強みと取引基盤を抽出',
    },
    {
      id: 'h-2',
      title: '2. 現状の経営課題・新事業進出の背景',
      content:
        '既存主力事業である内燃機関自動車部品の需要縮小に伴い利益率が低下。高成長が見込まれるEVバッテリー冷却ユニット部品および次世代医療機器部品への新事業進出が急務となっている。',
      prompt: '市場課題と進出理由',
    },
    {
      id: 'h-3',
      title: '3. 導入設備仕様・内製化プロセス',
      content:
        '最新鋭の大型同時5軸マシニングセンタ（8,500万円）および専用CAMシステム（1,500万円）の総額1億円を導入し、複数工程の段取り替えをワンチャッキング連続加工へ集約・内製完結化する。',
      prompt: '設備仕様と工程集約',
    },
    {
      id: 'h-4',
      title: '4. 数値目標・投資回収・賃上げ計画',
      content:
        'リードタイムを70%短縮し外注費を内製化。補助事業売上は計画3年目に6.3億円を見込み、付加価値額年率4.0%以上および従業員一人当たり給与年率3.5%以上の継続的賃上げを達成する。',
      prompt: '定性・定量効果',
    },
  ],
  rawHearingText: `【顧客名】株式会社○○
【日時】2026年10月20日 15:00
【出席者】代表取締役、専務取締役、営業担当 田中
【内容メモ】
・精密金属加工で創業38年、社員48名。
・既存の自動車試作部品はEVシフトで縮小傾向。
・EV向けアルミ冷却部品および医療用精密パーツの量産受注に向け、最新鋭5軸マシニングセンタ（8,500万円）とCAD/CAMシステム（1,500万円）の総額1億円を投資予定。
・公式インポートフォーマットの記載では新製品1年当たり売上見込は596,000,000円だが、v36収益計画Excelでは補助事業売上630,000,000円となっており差異あり要確認。`,
  sections: [
    {
      id: 'sec-1',
      title: '1. 企業概要・経営環境（新事業進出の背景）',
      sourceMasterIds: ['h-1', 'h-2'],
      sourceMasterLabel: 'マスター① 企業概要・強み ＋ マスター② 現状課題',
      currentText:
        '株式会社○○は、長年培った難削材の超精密加工技術を基盤とし、大手メーカーの試作開発を支えてきた。現在、既存主力事業の市場環境変化を踏まえ、高い成長性が見込まれるEV冷却流路パーツおよび医療機器分野への新事業進出を決定した。',
      aiBaselineText:
        '株式会社○○は、長年培った難削材の超精密加工技術を基盤とし、大手メーカーの試作開発を支えてきた。現在、既存主力事業の市場環境変化を踏まえ、高い成長性が見込まれるEV冷却流路パーツおよび医療機器分野への新事業進出を決定した。',
      charLimit: 500,
      isModified: false,
    },
    {
      id: 'sec-2',
      title: '2. 新事業に向けた具体的取り組み（設備導入と生産変革）',
      sourceMasterIds: ['h-3'],
      sourceMasterLabel: 'マスター③ 導入設備仕様',
      currentText:
        '本事業では、総額100,000,000円（機械装置費85,000,000円、ソフトウェア費15,000,000円）の設備投資を実施する。最新の同時5軸マシニングセンタを導入することにより、従来外注に依存していた高難度微細加工を完全内製化し、リードタイム短縮と品質安定化を実現する。',
      aiBaselineText:
        '本事業では、総額100,000,000円（機械装置費85,000,000円、ソフトウェア費15,000,000円）の設備投資を実施する。最新の同時5軸マシニングセンタを導入することにより、従来外注に依存していた高難度微細加工を完全内製化し、リードタイム短縮と品質安定化を実現する。',
      charLimit: 500,
      isModified: false,
    },
    {
      id: 'sec-3',
      title: '3. 将来の収益計画・賃上げ・波及効果',
      sourceMasterIds: ['h-4'],
      sourceMasterLabel: 'マスター④ 数値目標・回収計画',
      currentText:
        '事業完了後、補助事業売上は計画3年目に630,000,000円（インポートフォーマット記載596,000,000円・要確認）を達成し、全社付加価値額のCAGRは4.0%以上を堅持する。また事業場内最低賃金を地域別最賃+50円以上へ引き上げ、一人当たり給与支給総額CAGR 3.5%以上の持続的賃上げを確実に実行する。',
      aiBaselineText:
        '事業完了後、補助事業売上は計画3年目に630,000,000円（インポートフォーマット記載596,000,000円・要確認）を達成し、全社付加価値額のCAGRは4.0%以上を堅持する。また事業場内最低賃金を地域別最賃+50円以上へ引き上げ、一人当たり給与支給総額CAGR 3.5%以上の持続的賃上げを確実に実行する。',
      charLimit: 500,
      isModified: false,
    },
  ],
  gates: [
    {
      id: 'gate-1',
      number: 1,
      title: 'マスターヒアリング合意',
      description: '顧客とのヒアリング議事録および骨子マスターの確定',
      isPassed: true,
      passedAt: '2026-10-22 11:30',
    },
    {
      id: 'gate-2',
      number: 2,
      title: '収支計画確定・ロック',
      description: 'BS/PL・投資計画・CAGR・公募要件チェックの確定',
      isPassed: false,
    },
    {
      id: 'gate-3',
      number: 3,
      title: '申請書ドラフト・整合性検証',
      description: '申請書本文と数値計画の完全一致突合完了',
      isPassed: false,
    },
    {
      id: 'gate-4',
      number: 4,
      title: '顧客最終承認・電子申請',
      description: '顧客代表者による最終確認とjGrants申請完了',
      isPassed: false,
    },
  ],
  scheduleTasks: [
    {
      id: 'task-1',
      title: '初期ヒアリング・議事録整理',
      category: 'support',
      startWeek: 1,
      endWeek: 2,
      status: 'completed',
      gateId: 'gate-1',
    },
    {
      id: 'task-2',
      title: '直近3期決算書・インポートフォーマット取込',
      category: 'support',
      startWeek: 2,
      endWeek: 3,
      status: 'completed',
    },
    {
      id: 'task-3',
      title: '収支計画（BS/PL分割・設備投資）策定',
      category: 'support',
      startWeek: 3,
      endWeek: 4,
      status: 'in_progress',
      gateId: 'gate-2',
    },
    {
      id: 'task-4',
      title: '申請書本文ドラフト作成・整合性チェック',
      category: 'support',
      startWeek: 4,
      endWeek: 6,
      status: 'not_started',
      gateId: 'gate-3',
    },
    {
      id: 'task-5',
      title: '社内レビュー・最終顧客確認',
      category: 'client',
      startWeek: 6,
      endWeek: 7,
      status: 'not_started',
      gateId: 'gate-4',
    },
    {
      id: 'task-6',
      title: 'jGrants電子申請完了',
      category: 'client',
      startWeek: 7,
      endWeek: 8,
      status: 'not_started',
    },
  ],
  manualChecks: {
    'mchk-mismatch-checked': false,
    'mchk-bs-balanced': true,
    'mchk-minwage-confirmed': true,
  },
  updatedAt: '2026-11-10 18:00',
};

/** ガント標準テンプレート（STEP5用） */
export const INITIAL_GANTT_TEMPLATES: GanttTemplateTask[] = [
  {
    id: 'gtpl-1',
    title: 'キックオフ・ヒアリング議事録作成',
    category: 'support',
    startWeek: 1,
    endWeek: 2,
    gateId: 'gate-1',
  },
  {
    id: 'gtpl-2',
    title: '決算書3期分受領・インポートシート入力',
    category: 'client',
    startWeek: 2,
    endWeek: 3,
  },
  {
    id: 'gtpl-3',
    title: '収支計画マスター策定・要件シミュレーション',
    category: 'support',
    startWeek: 3,
    endWeek: 4,
    gateId: 'gate-2',
  },
  {
    id: 'gtpl-4',
    title: '申請書本文作成・文章モジュール挿入',
    category: 'support',
    startWeek: 4,
    endWeek: 6,
    gateId: 'gate-3',
  },
  {
    id: 'gtpl-5',
    title: '相見積書・賃金台帳等の添付証憑準備',
    category: 'client',
    startWeek: 5,
    endWeek: 7,
  },
  {
    id: 'gtpl-6',
    title: '社内最終チェック・顧客電子申請',
    category: 'client',
    startWeek: 7,
    endWeek: 8,
    gateId: 'gate-4',
  },
];

/** AI用の説明文テンプレート（プロンプト集） */
export const INITIAL_AI_PROMPTS = [
  {
    id: 'ai-prompt-1',
    title: '企業概要・強み・競合優位性の構造化抽出',
    targetSection: '1. 企業概要・経営環境',
    promptText:
      'ヒアリング議事録から、企業の沿革・主力事業・保有技術を抽出し、他社と差別化されている競合優位性を論理的かつ具体的に記述してください。',
  },
  {
    id: 'ai-prompt-2',
    title: '新事業進出の背景・市場機会の説明文下書き',
    targetSection: '1. 企業概要・経営環境',
    promptText:
      '既存市場の構造的縮小やボトルネックと、進出先となる新市場の成長性を対比させ、なぜ本設備投資が今必要なのか緊急性を記述してください。',
  },
  {
    id: 'ai-prompt-3',
    title: '導入設備・工程内製化の技術詳細',
    targetSection: '2. 新事業に向けた具体的取り組み',
    promptText:
      '導入する機械装置・ソフトウェアの仕様と、従来工程（段取り・外注等）がどのように短縮・内製化されるかを審査員に伝わる具体度で記述してください。',
  },
  {
    id: 'ai-prompt-4',
    title: '収益目標・投資回収・賃上げ計画の定量説明',
    targetSection: '3. 将来の収益計画・賃上げ',
    promptText:
      '収支計画の将来3〜5年の売上・付加価値額成長率・一人当たり給与支給総額および投資回収年数の数値を漏れなく反映し、確実性の高い計画として記述してください。',
  },
];

/** アプリケーション初期ステート */
export function createInitialAppState(): SubsidyAppState {
  const defaults: InitialProjectDefaults = {
    planningYears: 3,
    employeeCountMethod: 'periodEnd',
    annualSalesEstimateMethod: 'planAverage',
    displayCurrencyUnit: 'manYen', // 画面表示の初期値は「万円」
    roundingMode: 'floor', // 端数処理の初期値は「切り捨て」
    defaultFiscalMonth: 3,
  };

  return {
    role: '書類作成者',
    activeScreen: 'projects',
    workspaceTab: 'financial',
    selectedProjectId: DEMO_PROJECT_MARUMARU.id,
    displayCurrencyUnit: 'manYen',
    roundingMode: 'floor',
    callRounds: INITIAL_CALL_ROUNDS,
    activeVersionId: 'round-ver-1-3',
    initialDefaults: defaults,
    excelTemplates: [
      {
        id: 'tmpl-official-import',
        name: '公式インポート用フォーマット（ものづくり・新事業進出）',
        description: '中小企業庁公式の財務データインポート用Excelひな形（全BS/PL行対応）',
        targetTrackId: 'all',
        fileName: 'import_format_official_ver1.3.xlsx',
        uploadedAt: '2026-10-01',
      },
      {
        id: 'tmpl-v36-revenue',
        name: 'v36収益計画Excelひな形',
        description: '既存事業・補助事業分割対応の収支シミュレーションひな形',
        targetTrackId: 'shinjigyo',
        fileName: 'v36_revenue_plan_template.xlsx',
        uploadedAt: '2026-10-15',
      },
    ],
    ganttStandardTemplates: INITIAL_GANTT_TEMPLATES,
    aiPromptTemplates: INITIAL_AI_PROMPTS,
    tentativeItems: INITIAL_TENTATIVE_ITEMS,
    projects: [JSON.parse(JSON.stringify(DEMO_PROJECT_MARUMARU)) as Project],
  };
}

// ==========================================
// 互換性エクスポート (Legacy Compatibility Exports)
// ==========================================

export const SUBSIDY_TYPES = [
  '新事業進出・ものづくり商業サービス補助金',
  '新事業進出補助金',
  '小規模事業者持続化補助金',
  '東京都経営強化基盤事業',
] as const;

export const PROJECT_STATUS_LIST = [
  '未着手',
  'ヒアリング中',
  'マスター作成済',
  '収支計画作成中',
  '申請書作成中',
  '社内レビュー中',
  '顧客確認中',
  '申請完了',
  '採択',
  '不採択',
] as const;

export const DOCUMENT_STATUS_LIST = [
  '未作成',
  '下書き',
  '修正中',
  '完成',
] as const;

export const TEXT_MODULE_CATEGORIES = [
  { id: 'strength', label: '自社の強み・競合優位性' },
  { id: 'challenge', label: '現状の経営課題・市場背景' },
  { id: 'investment', label: '設備導入内容・工程変革' },
  { id: 'effect', label: '投資効果・収益回収計画' },
  { id: 'tokyo_base', label: '都内サプライチェーン貢献' },
] as const;

export const SAMPLE_MEETING_MINUTES = `【顧客名】株式会社○○
【日時】2026年10月20日 15:00
【出席者】代表取締役、専務取締役、営業担当 田中
【内容メモ】
・精密金属加工で創業38年、社員48名。
・既存の自動車試作部品はEVシフトで縮小傾向。
・EV向けアルミ冷却部品および医療用精密パーツの量産受注に向け、最新鋭5軸マシニングセンタ（8,500万円）とCAD/CAMシステム（1,500万円）の総額1億円を投資予定。
・公式インポートフォーマットの記載では新製品1年当たり売上見込は596,000,000円だが、v36収益計画Excelでは補助事業売上630,000,000円となっており差異あり要確認。`;

export const CURRENT_CALL_ROUND_THRESHOLDS: any = {
  shinJigyo: {
    valueAddedGrowthRateAnnual: 4.0,
    perCapitaWageGrowthRateAnnual: 3.5,
    perCapitaWageGrowthSpecialAnnual: 6.0,
    minWagePlusYen: 30,
    minWageSpecialPlusYen: 50,
    subsidyRateNumerator: 1,
    subsidyRateDenominator: 2,
    minWageSpecialRateNumerator: 2,
    minWageSpecialRateDenominator: 3,
    minSubsidyAmount: 750,
    capTiers: [
      { maxEmployees: 20, label: '20人以下', standardCap: 2500, wageSpecialCap: 3000 },
      { maxEmployees: 50, label: '21〜50人', standardCap: 4000, wageSpecialCap: 5000 },
      { maxEmployees: 100, label: '51〜100人', standardCap: 5500, wageSpecialCap: 7000 },
      { maxEmployees: null, label: '101人以上', standardCap: 7000, wageSpecialCap: 9000 },
    ],
  },
  jizokuka: {
    baseMaxSubsidyAmount: 50,
    invoiceSpecialBonus: 50,
    wageSpecialBonus: 150,
    subsidyRateNumerator: 2,
    subsidyRateDenominator: 3,
    deficitWageSpecialRateNumerator: 3,
    deficitWageSpecialRateDenominator: 4,
  },
  tokyo: {
    maxSubsidyAmount: 800,
    subsidyRateNumerator: 2,
    subsidyRateDenominator: 3,
  },
};

export const LEGACY_CALL_ROUND_THRESHOLDS = CURRENT_CALL_ROUND_THRESHOLDS;
export const INITIAL_THRESHOLDS = CURRENT_CALL_ROUND_THRESHOLDS;

export const INITIAL_MASTER_TEMPLATES = [
  { id: 'master-1', title: '企業概要・強み・競合優位性', prompt: '企業の強みを抽出' },
  { id: 'master-2', title: '現状の経営課題・投資の背景', prompt: '外部環境とボトルネック' },
  { id: 'master-3', title: '導入設備/システムの詳細と具体的な取り組み', prompt: '設備仕様と工程集約' },
  { id: 'master-4', title: '期待される定性・定量効果（数値計画）', prompt: 'リードタイム・売上増' },
];

export const INITIAL_TEXT_MODULES = [
  {
    id: 'mod-1',
    category: 'strength' as const,
    categoryLabel: '自社の強み',
    title: '難削材切削技術と短納期対応力',
    lengthType: 'long' as const,
    templateText: '{企業名}（従業員{従業員数}）は難削材の超精密切削技術を強みとし、総額{設備投資額}の導入により新事業進出を図る。',
    tags: ['精密加工', '新事業進出'],
  },
];

export const INITIAL_EFFECT_ESTIMATES = [
  { id: 'hearing' as const, processName: 'ヒアリング整理', manualHours: 3, systemMinutes: 20 },
  { id: 'financial' as const, processName: '収支計画作成', manualHours: 8, systemMinutes: 60 },
  { id: 'editor' as const, processName: '申請書作成', manualHours: 24, systemMinutes: 240 },
  { id: 'consistency' as const, processName: '整合性チェック', manualHours: 4, systemMinutes: 30 },
  { id: 'schedule' as const, processName: '工程管理', manualHours: 2, systemMinutes: 15 },
];

export const INITIAL_CROSS_CHECK_PROMPT = '申請書本文と収支計画の数値（総投資額・売上・賃上げ）を厳密に突合してください。';

export const TECH_PRECISION_MASTER_PRESET: Record<string, string> = {
  'master-1': '株式会社○○の創業以来の強みと技術基盤。',
  'master-2': '既存市場の縮小と新事業進出の背景。',
  'master-3': '最新5軸加工機の導入による内製化。',
  'master-4': 'リードタイム70%短縮と3年後売上拡大。',
};
export const TECH_PRECISION_MASTER_IMPROVED_4 = TECH_PRECISION_MASTER_PRESET['master-4'];
export const INITIAL_REVIEW_CRITERIA_CURRENT: any[] = [];
export const INITIAL_REVIEW_CRITERIA_LEGACY: any[] = [];
export const INITIAL_GENERATION_PROMPTS: any[] = [];
export const MANUAL_CHECK_DEFINITIONS: any[] = [];

export function createStandardGates(passedList: string[] = []) {
  return DEMO_PROJECT_MARUMARU.gates;
}

export function createStandardScheduleTasks(status: string = 'unstarted') {
  return DEMO_PROJECT_MARUMARU.scheduleTasks;
}

export function createTechPrecisionSubsidies(): any {
  return {};
}

export function buildMasterItemsFromTemplates(tpls: any[]) {
  return INITIAL_MASTER_TEMPLATES.map((t) => ({
    id: t.id,
    title: t.title,
    content: TECH_PRECISION_MASTER_PRESET[t.id] || '',
    prompt: t.prompt,
  }));
}

export function getSampleHearingVariablesForProject(pId: string): HearingVariables {
  return JSON.parse(JSON.stringify(DEFAULT_DEMO_HEARING_VARIABLES));
}

export function createGenericFinancialMaster(opts: any) {
  return createDemoCompanyFinancialMaster();
}

export function createGenericHearingVariables(opts: any): HearingVariables {
  return JSON.parse(JSON.stringify(DEFAULT_DEMO_HEARING_VARIABLES));
}

