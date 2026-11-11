/**
 * 補助金申請標準化システム - コア型定義
 * 【全ステップ共通ルール & STEP1準拠】
 * 1. 内部金額はすべて「円単位の整数」で保持。
 * 2. 補助金構造: 補助金定義 → 枠定義 → 要件定義 の階層。
 * 3. 案件期間構造: 実績3期(2期前,1期前,直近) / 申請時事業年度 / 基準年度 / 計画1〜5年目。
 * 4. 決算月数（変則決算）対応、従業員数カウント方式切替、仮の値追跡対応。
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
  | 'templates' // テンプレート・ひな形管理
  | 'backup' // 設定のJSONバックアップ
  | 'prompts' // (互換)
  | 'diffs' // (互換)
  | 'thresholds' // (互換)
  | 'criteria' // (互換)
  | 'crosscheck' // (互換)
  | 'effects' // (互換)
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

export type SubsidyType =
  | '新事業進出・ものづくり商業サービス補助金'
  | '新事業進出補助金'
  | '小規模事業者持続化補助金'
  | '東京都経営強化基盤事業';

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

/** 互換用閾値型 */
export interface ShinJigyoCapTier {
  maxEmployees: number | null;
  label: string;
  standardCap: number;
  wageSpecialCap: number;
}

export interface SubsidyRequirementThresholds {
  shinJigyo: {
    valueAddedGrowthRateAnnual: number;
    perCapitaWageGrowthRateAnnual: number;
    perCapitaWageGrowthSpecialAnnual: number;
    minWagePlusYen: number;
    minWageSpecialPlusYen: number;
    subsidyRateNumerator: number;
    subsidyRateDenominator: number;
    minWageSpecialRateNumerator: number;
    minWageSpecialRateDenominator: number;
    minSubsidyAmount: number;
    capTiers: ShinJigyoCapTier[];
  };
  jizokuka: {
    baseMaxSubsidyAmount: number;
    invoiceSpecialBonus: number;
    wageSpecialBonus: number;
    subsidyRateNumerator: number;
    subsidyRateDenominator: number;
    deficitWageSpecialRateNumerator: number;
    deficitWageSpecialRateDenominator: number;
  };
  tokyo: {
    maxSubsidyAmount: number;
    subsidyRateNumerator: number;
    subsidyRateDenominator: number;
  };
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
  // 互換用プロパティ
  name?: string;
  effectiveDate?: string;
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

export type FinancialPeriodKey =
  | 'yMinus3'
  | 'yMinus2'
  | 'yMinus1'
  | 'y1'
  | 'y2'
  | 'y3'
  | PeriodKey;

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
  // 互換用プロパティ
  machineryCost?: number;
  systemCost?: number;
  subcontractCost?: number;
  otherCost?: number;
  totalInvestment: number;
  subsidyRequested: number;
  ownFunds?: number;
  bankLoan?: number;
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

export interface SubsidySpecialFlags {
  shinJigyoWageSpecial?: boolean;
  shinJigyoMinWageSpecial?: boolean;
  jizokukaInvoiceSpecial?: boolean;
  jizokukaWageSpecial?: boolean;
  jizokukaDeficit?: boolean;
}

export interface FinancialYearData {
  sales: number;
  costOfSales: number;
  grossProfit: number;
  sga: number;
  laborCost: number;
  depreciation: number;
  operatingProfit: number;
  ordinaryProfit: number;
  netProfit: number;
  valueAdded: number;
  employees: number;
  totalWages: number;
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
  // 互換用プロパティ
  specialFlags?: SubsidySpecialFlags;
  historical?: {
    yMinus3: FinancialYearData;
    yMinus2: FinancialYearData;
    yMinus1: FinancialYearData;
  };
  forecast: {
    y1: FinancialYearData;
    y2: FinancialYearData;
    y3: FinancialYearData;
  };
}

export type FinancialMaster = ProjectFinancialMaster;

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
// 5. 案件（Project）エンティティ & その他互換型
// ==========================================

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
  existingUnitPrice: HearingSingleVariable;
  newUnitPrice: HearingSingleVariable;
  newCustomerCountY1: HearingSingleVariable;
  newCustomerCountY2: HearingSingleVariable;
  newCustomerCountY3: HearingSingleVariable;
  repeatRate: HearingSingleVariable;
  reducedWorkHours: HearingSingleVariable;
  hourlyWage: HearingSingleVariable;
  subcontractReduction: HearingSingleVariable;
  defectRate: HearingRangeVariable;
  leadTime: HearingRangeVariable;
  productionCapacity: HearingRangeVariable;
  newHiresY1: HearingSingleVariable;
  newHiresY2: HearingSingleVariable;
  newHiresY3: HearingSingleVariable;
  plannedWageGrowthRate: HearingSingleVariable;
}

export interface HearingItem {
  id: string;
  title: string;
  content: string;
  prompt: string;
}

export type HearingMasterItem = HearingItem;

export interface SubsidySection {
  id: string;
  title: string;
  sourceMasterIds: string[];
  sourceMasterLabel: string;
  currentText: string;
  aiBaselineText: string;
  charLimit: number;
  isModified: boolean;
  text200?: string;
  text500?: string;
  customText?: string;
  selectedLength?: '200' | '500' | 'custom';
}

export interface SubsidyDocument {
  subsidyType: SubsidyType;
  status: DocumentStatus;
  sections: SubsidySection[];
  lastSavedAt?: string;
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

export interface ConsistencyCheckItem {
  id: string;
  category:
    | '投資額'
    | '効果・数値'
    | '人件費・体制'
    | 'リードタイム'
    | '設備スペック'
    | 'ターゲット規模'
    | string;
  label: string;
  documentSnippet: string;
  financialValue: string;
  status: 'match' | 'mismatch' | 'unverified';
  note: string;
  isWarning?: boolean;
}

export interface AICrossCheckIssue {
  severity: 'error' | 'warning' | 'info';
  targetSection: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface AICrossCheckResult {
  timestamp: string;
  overallScore: number;
  isPass: boolean;
  summary: string;
  issues: AICrossCheckIssue[];
}

export interface ReviewCriterion {
  id: string;
  subsidyType: SubsidyType;
  name: string;
  description: string;
  keywords: string[];
  targetSectionIds: string[];
  isBonus?: boolean;
}

export interface GenerationPromptItem {
  id: string;
  subsidyType: SubsidyType;
  sectionId: string;
  sectionTitle: string;
  sourceMasterLabel: string;
  recommendedTags: string[];
  lengthMode: '200' | '500' | 'custom';
  promptText: string;
}

export interface EffectEstimateItem {
  id: WorkspaceTabId;
  processName: string;
  manualHours: number;
  systemMinutes: number;
}

export type TextModuleCategory =
  | 'strength'
  | 'challenge'
  | 'investment'
  | 'effect'
  | 'tokyo_base';

export interface TextModule {
  id: string;
  category: TextModuleCategory;
  categoryLabel: string;
  title: string;
  lengthType: 'short' | 'long';
  templateText: string;
  tags: string[];
  relatedCriteriaIds?: string[];
}

export interface DiffLog {
  id: string;
  projectId: string;
  projectName: string;
  subsidyType: SubsidyType;
  sectionTitle: string;
  aiText: string;
  humanText: string;
  editorName: string;
  timestamp: string;
}

export interface MasterSchemaTemplate {
  id: string;
  title: string;
  prompt: string;
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
  manualChecks: Record<string, boolean>;
  updatedAt: string;
  // 互換用プロパティ
  applicationDeadline?: string;
  targetAmount?: string;
  targetAmountManYen?: number;
  masterItems: HearingMasterItem[];
  hearingVariables: HearingVariables;
  subsidies: Record<SubsidyType, SubsidyDocument>;
  hearingSourceNote?: string;
  lastAICrossCheck?: AICrossCheckResult;
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
  ganttStandardTemplates: GanttTemplateTask[];
  aiPromptTemplates: AIPromptTemplate[];
  tentativeItems: TentativeItem[];
  projects: Project[];
  // 互換用プロパティ
  masterTemplates?: MasterSchemaTemplate[];
  textModules?: TextModule[];
  thresholds?: SubsidyRequirementThresholds;
  activeCallRoundId?: string;
  effectEstimates?: EffectEstimateItem[];
  crossCheckPrompt?: string;
  diffLogs?: DiffLog[];
  promptSuggestionApplied?: boolean;
}
