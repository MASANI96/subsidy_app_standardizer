/**
 * 補助金申請標準化システム - コア型定義
 * 【全ステップ共通ルール & STEP1 & STEP2準拠】
 * 1. 内部金額はすべて「円単位の整数」で保持。
 * 2. 補助金構造: 補助金定義 → 枠定義 → 要件定義 の階層。
 * 3. 案件期間構造: 実績3期(2期前,1期前,直近) / 申請時事業年度 / 基準年度 / 計画1〜5年目。
 * 4. 決算月数（変則決算）対応、従業員数カウント方式切替、仮の値追跡対応。
 * 5. 【STEP2】決算書PDF取込・pdf.js種類判定・科目対応付け・見比べ画面・確定ロック対応。
 */

export type Role = '営業担当' | '書類作成者' | 'システム管理者';

export type ScreenId =
  | 'projects' // 01. 案件一覧・台帳
  | 'workspace' // 02. 案件ワークスペース
  | 'library' // 03. 文章モジュールライブラリ
  | 'mapping' // 04. マッピング表
  | 'prompts' // 05. 生成AI用プロンプト集
  | 'admin'; // 06. 管理者設定

export type WorkspaceTabId =
  | 'schedule' // 01. 標準工程表・ゲート
  | 'hearing' // 02. マスターヒアリングシート
  | 'financial' // 03. 収支計画マスター計算シート
  | 'editor' // 04. 申請書 作成・編集
  | 'consistency'; // 05. 整合性チェックリスト

export type AdminTabId =
  | 'callRounds' // 公募回・枠・版設定
  | 'initialDefaults' // 案件前提値の初期値
  | 'tentativeList' // 「仮」の値一覧画面
  | 'accountMapping' // 【STEP2】科目対応表管理（標準対応表・企業別対応表）
  | 'templates' // テンプレート・ひな形管理
  | 'scheduleTemplate' // ガント標準テンプレート
  | 'solver' // 自動調整・説明文テンプレート
  | 'backup' // 設定のJSONバックアップ
  | 'prompts' // (互換)
  | 'diffs' // (互換)
  | 'thresholds' // (互換)
  | 'criteria' // (互換)
  | 'permissions'; // (互換)

export type ProjectStatus =
  | '未着手'
  | 'ヒアリング中'
  | 'マスター作成済'
  | '収支計画作成中'
  | '申請書作成中'
  | '社内レビュー中'
  | '顧客確認中'
  | '申請完了'
  | '採択'
  | '不採択';

export type DocumentStatus = '未作成' | '下書き' | '修正中' | '完成';

/** 表示単位 */
export type DisplayCurrencyUnit = 'yen' | 'thousandYen' | 'manYen'; // 円 | 千円 | 万円

/** 端数処理方法 */
export type RoundingMode = 'floor' | 'round'; // 切り捨て | 四捨五入

/** 従業員数カウント方式 */
export type EmployeeCountMethod =
  | 'periodEnd' // (A) 期末人数方式（パートは換算した小数可）
  | 'koboOfficial'; // (B) 公募要領方式（その年度に全月分の給与を受けた従業員のみ）

/** 1年当たり売上見込額の算出方法 */
export type AnnualSalesEstimateMethod =
  | 'planAverage' // 補助事業売上の計画期間平均（初期値・仮）
  | 'finalYear' // 計画最終年度の補助事業売上
  | 'manual'; // 手入力

/** 計画期間年数 (3年 / 4年 / 5年) */
export type PlanningYearsOption = 3 | 4 | 5;

// ==========================================
// 1. 補助金定義・枠定義・要件定義の階層構造
// ==========================================

export type SubsidyTrackId = 'kakushin' | 'shinjigyo' | 'global';

export type SubsidyType = '新事業進出・ものづくり商業サービス補助金';

/** 従業員規模別 補助上限額ティア */
export interface TrackCapTier {
  id: string;
  minEmployees: number; // 最小人数 (例: 0, 6, 21, 51, 101)
  maxEmployees: number | null; // 最大人数 (nullは上限なし)
  label: string; // 表示ラベル (例: '5人以下', '21〜50人')
  standardCapYen: number; // 通常補助上限額（円）
  wageSpecialCapYen: number; // 賃上げ特例時補助上限額（円）
  isTentative?: boolean; // 仮の値フラグ
}

/** 補助金の枠定義 */
export interface SubsidyTrack {
  id: SubsidyTrackId;
  name: string; // 例: '革新的新製品・サービス枠', '新事業進出枠', 'グローバル枠'
  shortName: string;
  description: string;
  subsidyRateNumerator: number; // 補助率分子 (通常 1 or 2)
  subsidyRateDenominator: number; // 補助率分母 (通常 2 or 3)
  wageSpecialRateNumerator?: number; // 賃上げ特例時補助率分子
  wageSpecialRateDenominator?: number; // 賃上げ特例時補助率分母
  minSubsidyAmountYen: number; // 補助下限額（円）
  executionPeriodMonths: number; // 補助事業実施期間（月数。初期値10または14）
  executionPeriodMonthsTentative: boolean; // 実施期間の仮フラグ
  applicationDeadline: string; // 申請締切日 (YYYY-MM-DD)
  adoptionDate: string; // 採択予定日 (YYYY-MM-DD)
  grantDecisionLeadMonths: number; // 採択から交付決定までの見込み月数 (例: 1ヶ月)
  capTiers: TrackCapTier[]; // 従業員規模別上限
}

/** 要件定義（閾値・ほどよく範囲） */
export interface SubsidyRequirements {
  // 基本要件閾値
  valueAddedCAGR: number; // 付加価値額CAGR（%） 初期値 4.0
  wageCAGR: number; // 一人当たり給与CAGR（%） 初期値 3.5
  minWageDiffYen: number; // 最低賃金差額（円） 事業場内 >= 地域別 + 30円
  wageSpecialCAGR: number; // 賃上げ特例 給与CAGR（%） 初期値 6.0
  wageSpecialMinWageDiffYen: number; // 賃上げ特例 最賃差額（円） + 50円
  inflationRatePercent: number; // 足下物価上昇率（%） 初期値 2.0 (仮値)
  inflationRateTentative: boolean; // 物価上昇率の仮フラグ

  // 「ほどよく」範囲（仮値・編集可）
  moderateRanges: {
    valueAddedCAGR: { min: number; max: number; isTentative: boolean }; // 初期値 4.0〜5.0%
    wageCAGR: { min: number; max: number; isTentative: boolean }; // 初期値 3.5〜4.5%
    wageSpecialCAGR: { min: number; max: number; isTentative: boolean }; // 初期値 6.0〜7.0%
  };
}

export interface SubsidyRequirementThresholds {
  shinJigyo?: any;
  /** @deprecated */
  jizokuka?: any;
  /** @deprecated */
  tokyo?: any;
}

export interface ReviewCriterion {
  id: string;
  name: string;
  title?: string;
  subsidyType: SubsidyType | string;
  category?: string;
  description?: string;
  keywords: string[];
  weight?: number;
  targetSectionIds?: string[];
  isBonus?: boolean;
}

export interface GenerationPromptItem {
  id: string;
  subsidyType: SubsidyType;
  sectionId: string;
  sectionTitle: string;
  sourceMasterLabel: string;
  recommendedTags: string[];
  promptText: string;
  lengthMode?: string;
}

export interface MasterSchemaTemplate {
  id: string;
  title: string;
  prompt: string;
}

export interface EffectEstimateItem {
  id?: string;
  name?: string;
  manualHours: number;
  systemMinutes: number;
  note?: string;
}

export type TextModuleCategory =
  | 'strength'
  | 'challenge'
  | 'investment'
  | 'effect'
  | 'common'
  | 'market'
  | 'management'
  | 'tech'
  | 'other';

export interface TextModule {
  id: string;
  title: string;
  category: TextModuleCategory;
  categoryLabel?: string;
  lengthType: 'short' | 'long';
  templateText: string;
  tags: string[];
  criteriaIds?: string[];
  relatedCriteriaIds?: string[];
}

/** 公募回（版）エンティティ */
export interface SubsidyVersionRound {
  id: string; // 例: 'round-ver-1-3'
  versionCode: string; // 例: '第1回 ver1.3'
  subsidyName: string; // '新事業進出・ものづくり商業サービス補助金'
  officialNoticeDate: string; // 公募要領施行日
  memo: string;
  tracks: SubsidyTrack[]; // 3枠（革新 / 新事業 / グローバル）
  requirements: SubsidyRequirements;
  isLatest: boolean;
  createdAt: string;
  name?: string;
  thresholds?: SubsidyRequirementThresholds;
  sectionCharLimits: Record<string, number>;
  reviewCriteria: ReviewCriterion[];
  generationPrompts: GenerationPromptItem[];
}

export type CallRound = SubsidyVersionRound;

// ==========================================
// 2. 期間構造（案件ごと）
// ==========================================

export type PeriodKey =
  | 'yMinus2' // 2期前 (実績)
  | 'yMinus1' // 1期前 (実績)
  | 'y0' // 直近 (実績)
  | 'currentFY' // 申請時事業年度
  | 'baseFY' // 基準年度（補助事業完了予定日を含む期）
  | 'p1' // 計画1年目
  | 'p2' // 計画2年目
  | 'p3' // 計画3年目
  | 'p4' // 計画4年目
  | 'p5'; // 計画5年目

/** 予測期のキー */
export type ForecastPeriodKey = 'currentFY' | 'baseFY' | 'p1' | 'p2' | 'p3' | 'p4' | 'p5';
export const FORECAST_PERIOD_KEYS: ForecastPeriodKey[] = ['currentFY', 'baseFY', 'p1', 'p2', 'p3', 'p4', 'p5'];

/** 年度別の数値 */
export type ForecastNumbers = Record<ForecastPeriodKey, number>;

/** 減価償却資産（定額法・月割） */
export interface SimAsset {
  id: string;
  name: string;
  acquisitionCostYen: number;
  acquisitionYm: string; // 'YYYY-MM'
  usefulLifeYears: number;
  allocation: 'salesRatio' | 'subsidyOnly' | 'existingOnly';
}

/** 計画シミュレーションの前提値（すべて案件ごとに編集可） */
export interface PlanSimulation {
  enabled: boolean; // true のとき予測期PLを自動計算（予測期の手入力は不可）
  existingGrowthRate: ForecastNumbers; // 既存事業 売上成長率（%・前年比）
  existingCostRate: number; // 既存事業 原価率（%）
  existingOtherSgaRate: number; // 既存事業 その他販管費率（%・人件費と減価償却費を除く）
  subsidyUnitPriceYen: number; // 補助事業 単価
  subsidyMonthlyQty: ForecastNumbers; // 補助事業 月あたり販売数量
  subsidyOperatingMonths: ForecastNumbers; // 補助事業 稼働月数（0〜12）
  subsidyCostRate: number;
  subsidyOtherSgaRate: number;
  existingDepreciationYen: ForecastNumbers; // 既存資産の減価償却費
  assets: SimAsset[];
  headcountIncrease: ForecastNumbers; // 期中増員数
  perCapitaWageGrowthRate: ForecastNumbers; // 一人当たり給与の伸び率（%）
  salaryShareOfLaborCostPercent: number | null; // 人件費に占める給与の割合（%）。null＝未入力
  directorRemunerationMode: 'ratio' | 'amount';
  directorRemunerationRatioPercent: number; // 人件費に対する割合（%）
  directorRemunerationAmountYen: ForecastNumbers;
  nonOperatingIncomeYen: ForecastNumbers;
  nonOperatingExpensesYen: ForecastNumbers;
  incomeTaxRatePercent: number; // 法人税等の実効税率（%・仮）
  workplaceMinWage: ForecastNumbers;
  regionalMinWage: ForecastNumbers;
  pinnedKeys: string[]; // 固定ピン（STEP Cで使用）
  solverTargets: { key: string; min: number; max: number; step: number }[]; // STEP Cで使用
}

export interface PeriodFiscalInfo {
  key: PeriodKey;
  label: string;
  subLabel: string;
  fiscalYear: number;
  fiscalMonth: number;
  periodMonths: number;
  isIrregular: boolean;
  isHistorical: boolean;
  isCurrentFY: boolean;
  isBaseFY: boolean;
  isForecast: boolean;
}

export interface AutoFiscalYearCalculation {
  applicationDeadline: string;
  adoptionDate: string;
  grantDecisionEstimatedDate: string;
  executionPeriodMonths: number;
  projectCompletionEstimatedDate: string;
  companyFiscalMonth: number;
  calculatedCurrentFY: number;
  calculatedBaseFY: number;
  explanationText: string;
  isOverriddenCurrentFY: boolean;
  isOverriddenBaseFY: boolean;
  overriddenCurrentFY?: number;
  overriddenBaseFY?: number;
}

// ==========================================
// 2.5. 【STEP C】逆算・固定ピン・版管理・説明文
// ==========================================

/** 逆算調整の候補変数 */
export interface SolverCandidate {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  affects: 'valueAdded' | 'wage';
}

/** 収支計画のスナップショット */
export interface PlanSnapshot {
  periods: ProjectFinancialMaster['periods'];
  simulation: PlanSimulation;
  investment: InvestmentPlanYen;
  planningYears: PlanningYearsOption;
  appliedTrackId: SubsidyTrackId;
  isWageSpecialApplied: boolean;
  employeeCountMethod: EmployeeCountMethod;
  fiscalMonth: number;
}

/** 収支計画の保存版 */
export interface PlanVersion {
  id: string;
  name: string;
  memo: string;
  createdAt: string;
  snapshot: PlanSnapshot;
}

/** 説明文テンプレート */
export interface NarrativeTemplate {
  id: 'valueAdded' | 'wage';
  title: string;
  template: string;
}

// ==========================================
// 3. 財務項目モデル（公式インポート用フォーマット準拠）
// ==========================================

export interface BalanceSheetData {
  currentAssets: {
    cashAndDeposits: number;
    notesReceivable: number;
    accountsReceivable: number;
    securities: number;
    inventories: number;
    otherCurrentAssets: number;
    totalCurrentAssets: number;
  };
  fixedAssets: {
    tangibleFixedAssets: {
      buildings: number;
      machineryAndEquipment: number;
      vehicles: number;
      toolsFurnitureFixtures: number;
      land: number;
      constructionInProgress: number;
      otherTangibleAssets: number;
      totalTangibleAssets: number;
    };
    intangibleFixedAssets: {
      software: number;
      goodwill: number;
      patentRights: number;
      otherIntangibleAssets: number;
      totalIntangibleAssets: number;
    };
    investmentsAndOtherAssets: {
      investmentSecurities: number;
      longTermLoans: number;
      otherInvestments: number;
      totalInvestments: number;
    };
    totalFixedAssets: number;
  };
  deferredAssets: number;
  totalAssets: number;
  currentLiabilities: {
    notesPayable: number;
    accountsPayable: number;
    shortTermBorrowings: number;
    accruedExpenses: number;
    otherCurrentLiabilities: number;
    totalCurrentLiabilities: number;
  };
  fixedLiabilities: {
    bondsPayable: number;
    longTermBorrowings: number;
    otherFixedLiabilities: number;
    totalFixedLiabilities: number;
  };
  totalLiabilities: number;
  shareholdersEquity: {
    capitalStock: number;
    capitalSurplus: number;
    retainedEarnings: number;
    treasuryStock: number;
    totalShareholdersEquity: number;
  };
  valuationAndTranslationAdjustments: number;
  subscriptionRights: number;
  totalNetAssets: number;
  totalLiabilitiesAndNetAssets: number;
}

export interface BusinessSegmentPL {
  sales: number;
  costOfSales: number;
  grossProfit: number;
  sga: number;
  operatingProfit: number;
}

export interface ProfitAndLossData {
  existingBusiness: BusinessSegmentPL;
  subsidyBusiness: BusinessSegmentPL;
  totalSales: number;
  totalCostOfSales: number;
  totalGrossProfit: number;
  totalSga: number;
  totalOperatingProfit: number;
  nonOperatingIncome: number;
  nonOperatingExpenses: number;
  ordinaryProfit: number;
  extraordinaryIncome: number;
  extraordinaryLosses: number;
  incomeBeforeTaxes: number;
  incomeTaxes: number;
  netIncome: number;
  laborCost: number;
  depreciation: number;
  valueAdded: number;
  numberOfDirectors: number;
  directorRemuneration: number;
  numberOfEmployees: number;
  totalWages: number;
  perCapitaWage: number;
  workplaceMinWage: number;
  regionalMinWage: number;
  periodMonths: number;
  isIrregularPeriod: boolean;
  periodNote?: string;
}

export type DepreciationMethod = 'straight-line' | 'declining-balance';

export interface InvestmentPlanYen {
  newMachineryInvestment: number;
  intangibleAssetInvestment: number;
  rdCost: number;
  humanResourceDevelopmentCost: number;
  totalInvestmentYen: number;
  subsidyRequestedYen: number;
  ownFundsYen: number;
  bankLoansYen: number;
  otherFundsYen: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  totalInvestment?: number;
  subsidyRequested?: number;
  machineryCost?: number;
  systemCost?: number;
  subcontractCost?: number;
  otherCost?: number;
  [key: string]: any;
}

export type InvestmentPlan = InvestmentPlanYen;

export interface AnnualSalesEstimate {
  method: AnnualSalesEstimateMethod;
  calculatedValueYen: number;
  officialFormatValueYen: number;
  v36ExcelValueYen: number;
  hasMismatch: boolean;
  mismatchNote: string;
  isTentative: boolean;
}

export interface ProjectFinancialMaster {
  status: 'draft' | 'locked';
  lockedAt?: string;
  appliedTrackId: SubsidyTrackId;
  planningYears: PlanningYearsOption;
  employeeCountMethod: EmployeeCountMethod;
  fiscalMonth: number;
  autoFiscalCalc: AutoFiscalYearCalculation;
  isWageSpecialApplied: boolean;
  annualSalesEstimate: AnnualSalesEstimate;
  investment: InvestmentPlanYen;
  periods: Record<
    PeriodKey,
    {
      bs: BalanceSheetData;
      pl: ProfitAndLossData;
      fiscalInfo: PeriodFiscalInfo;
    }
  >;
  /** 【STEP2】決算書PDF取込・見比べ・科目対応付けの実績管理（2期前, 1期前, 直近） */
  periodImports?: Partial<Record<HistoricalPeriodKey, PeriodImportRecord>>;
  forecast?: any;
  /** 【STEP B】計画シミュレーション前提値 */
  simulation: PlanSimulation;
  /** 【STEP C】保存された版一覧 */
  planVersions: PlanVersion[];
  /** 【STEP C】説明文の下書き（付加価値・賃上げ根拠） */
  narratives: Record<'valueAdded' | 'wage', string>;
}

// ==========================================
// 3.5. 【STEP2】決算書PDF取込・科目マッピング・見比べ型定義
// ==========================================

export type HistoricalPeriodKey = 'yMinus2' | 'yMinus1' | 'y0';

/** PDFの種類判定結果 */
export type PdfImportType = 'text_pdf' | 'scanned_pdf'; // テキストPDF | スキャン画像PDF

/** 科目の対応付けアクション */
export type AccountMappingAction = 'map' | 'aggregate' | 'exclude'; // マッピング | 合算 | 除外

/** 公式フォーマット側の項目分類 */
export type FormatAccountCategory =
  | 'BS_ASSET'
  | 'BS_LIABILITY'
  | 'BS_EQUITY'
  | 'PL_REVENUE'
  | 'PL_COST'
  | 'PL_SGA'
  | 'PL_NON_OP'
  | 'PL_EXTRA'
  | 'PL_TAX'
  | 'OFF_BALANCE';

/** 科目対応ルール（標準対応表・企業別対応表） */
export interface AccountMappingRule {
  id: string;
  sourceAccountName: string; // 決算書科目名（例: 給料手当, 減価償却実施額, 雑費）
  action: AccountMappingAction; // 'map' | 'aggregate' | 'exclude'
  targetFieldKey: string; // 対応フォーマット項目キー（例: 'laborCost', 'costOfSales', 'depreciation'）
  targetFieldLabel: string; // 対応フォーマット項目名（例: '人件費', '売上原価', '減価償却費'）
  aggregateWithKey?: string; // 合算先キー
  scope: 'standard' | 'company'; // 'standard': 共通標準対応表 | 'company': 企業別対応表
  companyId?: string; // 会社ID
  note?: string; // 補足メモ
  isTentative?: boolean; // 「仮」バッジ用
}

/** 修正履歴レコード */
export interface AmountModificationLog {
  id: string;
  previousAmountYen: number;
  newAmountYen: number;
  modifiedAt: string;
  modifiedBy: string;
  reason?: string;
}

/** PDF上のハイライト座標（パーセント比率 0〜1） */
export interface PdfHighlightBox {
  page: number; // 該当ページ番号 (1-indexed)
  xRatio: number; // 0〜1
  yRatio: number; // 0〜1
  widthRatio: number; // 0〜1
  heightRatio: number; // 0〜1
}

/** 抜き出された科目行アイテム */
export interface ExtractedFinancialItem {
  id: string;
  sourceAccountName: string; // 決算書上の科目名
  category: FormatAccountCategory;
  categoryLabel: string;
  extractedAmountYen: number; // 読み取った金額（円）
  currentAmountYen: number; // 修正後の金額（円）
  isModified: boolean; // 修正されたか
  modificationHistory: AmountModificationLog[]; // 修正履歴
  pageNumber: number; // 該当ページ番号 (1-indexed)
  highlightBox: PdfHighlightBox; // PDFハイライト座標
  status: 'mapped' | 'unmapped' | 'excluded' | 'aggregated'; // 対応状況
  mappedFieldKey?: string; // 対応フォーマット項目キー
  mappedFieldLabel?: string; // 対応フォーマット項目表示名
  mappingRuleId?: string; // 適用された対応ルールのID
  isTentative?: boolean; // 仮の値フラグ
}

/** 決算書に載らない項目（手入力） */
export interface OffBalanceManualInputs {
  numberOfEmployees: number; // 従業員数（人）
  totalWages: number; // 給与支給総額（円）
  numberOfDirectors: number; // 役員数（人）
  directorRemuneration: number; // 役員報酬（円）
  workplaceMinWage: number; // 事業場内最低賃金（円/時）
  regionalMinWage: number; // 地域別最低賃金（円/時）
}

/** 財務諸表整合性チェック結果 */
export interface FinancialStatementConsistency {
  // ① 資産合計 ＝ 負債・純資産合計
  bsBalanceCheck: {
    totalAssets: number;
    totalLiabilitiesAndNetAssets: number;
    difference: number;
    isBalanced: boolean;
  };
  // ② 売上高 − 売上原価 − 販管費 ＝ 営業利益
  operatingProfitCheck: {
    sales: number;
    costOfSales: number;
    sga: number;
    statedOperatingProfit: number;
    calculatedOperatingProfit: number;
    difference: number;
    isBalanced: boolean;
  };
  // ③ 営業利益 ＋ 営業外収益 − 営業外費用 ＝ 経常利益
  ordinaryProfitCheck: {
    operatingProfit: number;
    nonOperatingIncome: number;
    nonOperatingExpenses: number;
    statedOrdinaryProfit: number;
    calculatedOrdinaryProfit: number;
    difference: number;
    isBalanced: boolean;
  };
  // ④ 経常利益 ＋ 特別損益 − 法人税等 ＝ 当期純利益
  netIncomeCheck: {
    ordinaryProfit: number;
    extraordinaryIncome: number;
    extraordinaryLosses: number;
    incomeTaxes: number;
    statedNetIncome: number;
    calculatedNetIncome: number;
    difference: number;
    isBalanced: boolean;
  };
  allPassed: boolean;
  warningMessages: string[];
}

/** 各期（2期前 / 1期前 / 直近）の取込ステータスとデータレコード */
export interface PeriodImportRecord {
  periodKey: HistoricalPeriodKey;
  periodLabel: string; // '2期前 (2024年3月期)'
  fiscalYear: number;
  status: 'unimported' | 'analyzing' | 'mapped' | 'locked';
  step: 1 | 2 | 3 | 4 | 5 | 6; // 1:アップロード 2:判定 3:AI読取 4:科目対応 5:見比べ確認 6:確定ロック
  fileRecordId?: string; // IndexedDB内のファイルID
  fileName?: string;
  fileSize?: number;
  fileHash?: string;
  pdfType?: PdfImportType;
  detectionReason?: string;
  pageCount: number;
  extractedItems: ExtractedFinancialItem[];
  offBalanceInputs: OffBalanceManualInputs;
  consistency: FinancialStatementConsistency;
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  updatedAt: string;
}

// ==========================================
// 4. 「仮」の値（Tentative Value）管理
// ==========================================

export interface TentativeItem {
  id: string;
  category: '公募回要件' | '枠設定' | '期間構造' | '案件数値' | '算出方式';
  keyName: string;
  label: string;
  currentValue: string | number;
  unit: string;
  rationale: string;
  isConfirmed: boolean;
  editableInAdmin: boolean;
}

// ==========================================
// 5. 案件（Project）エンティティ
// ==========================================

export interface HearingItem {
  id: string;
  title: string;
  content: string;
  prompt: string;
}

export interface SubsidySection {
  id: string;
  title: string;
  sourceMasterIds: string[];
  sourceMasterLabel: string;
  currentText: string;
  aiBaselineText: string;
  charLimit: number;
  isModified: boolean;
  selectedLength?: string | number;
}

export interface HearingMasterItem {
  id: string;
  title: string;
  content: string;
  prompt: string;
}

export interface HearingSingleVariable {
  value: number;
  unit: string;
  sourceMemo: string;
}

export interface HearingRangeVariable {
  current: number;
  target: number;
  unit: string;
  sourceMemo: string;
}

export interface HearingVariables {
  [key: string]: any;
}

export interface SubsidyDocument {
  subsidyType: SubsidyType;
  status: DocumentStatus;
  sections: SubsidySection[];
  lastSavedAt: string;
}

export interface AICrossCheckIssue {
  severity: 'error' | 'warning' | 'info';
  category?: string;
  title?: string;
  message?: string;
  sectionId?: string;
  sectionTitle?: string;
  sourceText?: string;
  masterText?: string;
  correctionSuggestion?: string;
  targetSection?: string;
  description?: string;
  recommendation?: string;
}

export interface AICrossCheckResult {
  timestamp: string;
  isPass: boolean;
  summary: string;
  overallScore: number;
  issues: AICrossCheckIssue[];
}

export interface PhaseGate {
  id: 'gate-1' | 'gate-2' | 'gate-3' | 'gate-4';
  number: number;
  title: string;
  description: string;
  isPassed: boolean;
  passedAt?: string;
}

export interface GanttTask {
  id: string;
  title: string;
  category: 'client' | 'support';
  startWeek: number;
  endWeek: number;
  status: 'not_started' | 'in_progress' | 'completed';
  isGate?: boolean;
  gateId?: 'gate-1' | 'gate-2' | 'gate-3' | 'gate-4';
}

/** 【STEP F】ガントチャート スケジュール項目 */
export interface ScheduleItem {
  id: string;
  title: string;
  phase: 'pre' | 'post';
  owner: 'support' | 'client';
  start: string; /* YYYY-MM-DD */
  end: string; /* YYYY-MM-DD */
  milestone: boolean;
  manual: boolean;
  templateId?: string;
  gateId?: PhaseGate['id'];
  status: 'not_started' | 'in_progress' | 'completed';
}

/** 【STEP F】案件スケジュール */
export interface ProjectSchedule {
  items: ScheduleItem[];
  viewMode: 'month' | 'week';
  lastSharedAt?: string;
}

export interface Project {
  id: string;
  code: string;
  companyName: string;
  industry: string;
  salesRep: string;
  writerName: string;
  deadline: string;
  status: ProjectStatus;
  appliedVersionId: string;
  appliedTrackId: SubsidyTrackId;
  financialMaster: ProjectFinancialMaster;
  hearingMasterItems: HearingItem[];
  rawHearingText: string;
  sections: SubsidySection[];
  gates: PhaseGate[];
  scheduleTasks: GanttTask[];
  /** 【STEP F】日付ベースの全体スケジュール */
  schedule: ProjectSchedule;
  manualChecks: Record<string, boolean>;
  updatedAt: string;
  // 互換用プロパティ
  masterItems: HearingMasterItem[];
  hearingVariables: HearingVariables;
  subsidies: Record<SubsidyType, SubsidyDocument>;
  lastAICrossCheck?: AICrossCheckResult;
  targetAmount?: number;
  hearingSourceNote?: string;
}

// ==========================================
// 6. アプリケーション全体状態 (AppState)
// ==========================================

export interface InitialProjectDefaults {
  planningYears: PlanningYearsOption;
  employeeCountMethod: EmployeeCountMethod;
  annualSalesEstimateMethod: AnnualSalesEstimateMethod;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  defaultFiscalMonth: number;
  simulationDefaults: PlanSimulation;
}

export interface ExcelTemplateDefinition {
  id: string;
  name: string;
  description: string;
  targetTrackId: SubsidyTrackId | 'all';
  fileName: string;
  fileRecordId?: string;
  uploadedAt?: string;
}

/** Excelセル対応定義 (STEP D/E) */
export interface ExcelCellMapping {
  id: string;
  templateId: string;
  sheetName: string;
  cell: string;
  valuePath: string;
  note?: string;
  isTentative?: boolean;
}

/** ガント標準テンプレートタスク (STEP D/F) */
export interface ScheduleTemplateTask {
  id: string;
  title: string;
  phase: 'pre' | 'post';
  owner: 'support' | 'client';
  anchor: 'deadline' | 'adoption' | 'grantDecision' | 'completion';
  offsetDays: number;
  durationDays: number;
  useExecutionPeriod?: boolean;
  milestone?: boolean;
  gateId?: PhaseGate['id'];
}

export interface GanttTemplateTask {
  id: string;
  title: string;
  category: 'client' | 'support';
  startWeek: number;
  endWeek: number;
  gateId?: 'gate-1' | 'gate-2' | 'gate-3' | 'gate-4';
}

export interface AIPromptTemplate {
  id: string;
  title: string;
  targetSection: string;
  promptText: string;
}

export interface SubsidyAppState {
  role: Role;
  activeScreen: ScreenId;
  workspaceTab: WorkspaceTabId;
  selectedProjectId: string;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  callRounds: SubsidyVersionRound[];
  activeVersionId: string;
  initialDefaults: InitialProjectDefaults;
  excelTemplates: ExcelTemplateDefinition[];
  excelCellMappings: ExcelCellMapping[];
  scheduleTemplates: ScheduleTemplateTask[];
  ganttStandardTemplates: GanttTemplateTask[];
  aiPromptTemplates: AIPromptTemplate[];
  tentativeItems: TentativeItem[];
  /** 【STEP2】共通の標準科目対応表（管理画面で編集可） */
  standardAccountMappings: AccountMappingRule[];
  /** 【STEP2】会社ごとの科目対応表（会社IDをキーに保持、次回取込で自動適用） */
  companyAccountMappings: Record<string, AccountMappingRule[]>;
  /** 【STEP C】逆算（自動調整）の候補変数一覧 */
  solverCandidates: SolverCandidate[];
  /** 【STEP C】説明文テンプレート一覧 */
  narrativeTemplates: NarrativeTemplate[];
  projects: Project[];
}
