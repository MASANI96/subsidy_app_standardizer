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
export type Role = '営業担当' | '書類作成者' | 'システム管理者';
export type SubsidyType =
  | '新事業進出補助金'
  | '小規模事業者持続化補助金'
  | '東京都経営強化基盤事業';

export type ScreenId =
  | 'projects'
  | 'workspace'
  | 'library'
  | 'mapping'
  | 'prompts'
  | 'admin';

export type WorkspaceTabId =
  | 'schedule'
  | 'hearing'
  | 'financial'
  | 'editor'
  | 'consistency';

export type AdminTabId =
  | 'prompts'
  | 'diffs'
  | 'thresholds'
  | 'criteria'
  | 'crosscheck'
  | 'effects'
  | 'permissions';

// マスターヒアリングシート：数値計画の算定変数（M1）
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
  // 売上系
  existingUnitPrice: HearingSingleVariable; // 既存事業 客単価（円）
  newUnitPrice: HearingSingleVariable; // 新事業 客単価（円）
  newCustomerCountY1: HearingSingleVariable; // 新事業 想定客数／受注件数 1年目（件/年）
  newCustomerCountY2: HearingSingleVariable; // 新事業 想定客数／受注件数 2年目（件/年）
  newCustomerCountY3: HearingSingleVariable; // 新事業 想定客数／受注件数 3年目（件/年）
  repeatRate: HearingSingleVariable; // リピート率（%）
  // コスト削減系
  reducedWorkHours: HearingSingleVariable; // 削減作業時間（時間/年）
  hourlyWage: HearingSingleVariable; // 時間単価（円/時）
  subcontractReduction: HearingSingleVariable; // 外注費削減額（万円/年）
  defectRate: HearingRangeVariable; // 不良率（現状%→目標%）
  // 生産性系
  leadTime: HearingRangeVariable; // リードタイム（現状日→目標日）
  productionCapacity: HearingRangeVariable; // 生産能力（現状→目標・個/月）
  // 人員系
  newHiresY1: HearingSingleVariable; // 新規雇用予定人数 1年目（名）
  newHiresY2: HearingSingleVariable; // 新規雇用予定人数 2年目（名）
  newHiresY3: HearingSingleVariable; // 新規雇用予定人数 3年目（名）
  plannedWageGrowthRate: HearingSingleVariable; // 賃上げ予定率（%/年）
}

// 財務諸表・収支計画モデル（万円単位統一）
export interface FinancialYearData {
  sales: number; // 売上高（万円）
  costOfSales: number; // 売上原価（万円）
  grossProfit: number; // 売上総利益 (自動計算: sales - costOfSales)
  sga: number; // 販管費（万円）
  laborCost: number; // うち人件費（万円）
  depreciation: number; // うち減価償却費（万円）
  operatingProfit: number; // 営業利益 (自動計算: grossProfit - sga)
  ordinaryProfit: number; // 経常利益（万円）
  netProfit: number; // 当期純利益（万円）
  valueAdded: number; // 付加価値額 (自動計算: operatingProfit + laborCost + depreciation)
  employees: number; // 従業員数（名）
  totalWages: number; // 給与支給総額（万円）
}

export type DepreciationMethod = 'straight-line' | 'declining-balance';

export interface InvestmentPlan {
  machineryCost: number; // 機械装置費（万円）
  systemCost: number; // システム・ソフトウェア費（万円）
  subcontractCost: number; // 外注費（万円）
  otherCost: number; // その他経費（万円）
  totalInvestment: number; // 総投資額（自動計算）
  subsidyRequested: number; // 補助金申請希望額（万円）
  ownFunds: number; // 自己資金（万円）
  bankLoan: number; // 借入金（万円）
  depreciationMethod: DepreciationMethod; // 減価償却方式
  usefulLifeYears: number; // 耐用年数（年）
}

export type FinancialPeriodKey =
  | 'yMinus3'
  | 'yMinus2'
  | 'yMinus1'
  | 'y1'
  | 'y2'
  | 'y3';

// 案件ごとの補助金特例適用フラグ（M8）
export interface SubsidySpecialFlags {
  shinJigyoWageSpecial: boolean; // 新事業：賃上げ特例（上限引上げ・一人当たり給与年率6.0%以上）
  shinJigyoMinWageSpecial: boolean; // 新事業：地域別最低賃金引上げ特例（補助率 2/3）
  jizokukaInvoiceSpecial: boolean; // 持続化：インボイス特例（＋50万円）
  jizokukaWageSpecial: boolean; // 持続化：賃金引上げ特例（＋150万円）
  jizokukaDeficit: boolean; // 持続化：赤字事業者（賃上げ特例併用で補助率 3/4）
}

export interface FinancialMaster {
  status: 'draft' | 'locked'; // 収支確定ステータス
  lockedAt?: string;
  specialFlags: SubsidySpecialFlags;
  historical: {
    yMinus3: FinancialYearData; // 前々々期
    yMinus2: FinancialYearData; // 前々期
    yMinus1: FinancialYearData; // 直前期（前期）
  };
  forecast: {
    y1: FinancialYearData; // 将来1年目
    y2: FinancialYearData; // 将来2年目
    y3: FinancialYearData; // 将来3年目
  };
  investment: InvestmentPlan;
}

export interface ShinJigyoCapTier {
  maxEmployees: number | null; // 20, 50, 100, null (101人以上)
  label: string;
  standardCap: number; // 通常上限（万円）
  wageSpecialCap: number; // 賃上げ特例時上限（万円）
}

// 補助金要件判定しきい値（M8: 従業員規模別上限・下限・特例対応）
export interface SubsidyRequirementThresholds {
  shinJigyo: {
    valueAddedGrowthRateAnnual: number; // 付加価値額 年平均成長率目標（%）
    perCapitaWageGrowthRateAnnual: number; // 一人当たり給与支給総額 年平均成長率目標（%）
    perCapitaWageGrowthSpecialAnnual: number; // 賃上げ特例適用時 一人当たり給与年平均成長率目標（%）
    minWagePlusYen: number; // 事業場内最低賃金：地域別最低賃金＋N円
    minWageSpecialPlusYen: number; // 特例時：地域別最低賃金＋N円
    subsidyRateNumerator: number; // 通常補助率分子 (1)
    subsidyRateDenominator: number; // 通常補助率分母 (2)
    minWageSpecialRateNumerator: number; // 最賃特例補助率分子 (2)
    minWageSpecialRateDenominator: number; // 最賃特例補助率分母 (3)
    minSubsidyAmount: number; // 補助下限額（万円）（750）
    capTiers: ShinJigyoCapTier[]; // 従業員規模別上限
  };
  jizokuka: {
    baseMaxSubsidyAmount: number; // 通常補助上限額（万円）（50）
    invoiceSpecialBonus: number; // インボイス特例上乗せ（万円）（50）
    wageSpecialBonus: number; // 賃金引上げ特例上乗せ（万円）（150）
    subsidyRateNumerator: number; // 通常補助率分子 (2)
    subsidyRateDenominator: number; // 通常補助率分母 (3)
    deficitWageSpecialRateNumerator: number; // 賃上げ特例＋赤字事業者 補助率分子 (3)
    deficitWageSpecialRateDenominator: number; // 賃上げ特例＋赤字事業者 補助率分母 (4)
  };
  tokyo: {
    maxSubsidyAmount: number; // 助成限度額（万円）（800）
    subsidyRateNumerator: number; // 助成率分子 (2)
    subsidyRateDenominator: number; // 助成率分母 (3)
  };
}

// 審査項目・加点要素（R2）
export interface ReviewCriterion {
  id: string;
  subsidyType: SubsidyType;
  name: string;
  description: string;
  keywords: string[];
  targetSectionIds: string[];
  isBonus?: boolean;
}

// 生成AI用プロンプト集：文章生成プロンプト（M5）
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

// 公募回（年度）管理エンティティ（R3）
export interface CallRound {
  id: string;
  name: string;
  effectiveDate: string;
  memo: string;
  thresholds: SubsidyRequirementThresholds;
  sectionCharLimits: Record<string, number>; // セクションID別の指定文字数（例: tokyo-1: 400）
  reviewCriteria: ReviewCriterion[];
  generationPrompts: GenerationPromptItem[];
}

// 導入効果試算項目（W2）
export interface EffectEstimateItem {
  id: WorkspaceTabId;
  processName: string;
  manualHours: number; // 従来の手作業（時間）
  systemMinutes: number; // 本システム（分）
}

// 文章モジュールライブラリ
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
  lengthType: 'short' | 'long'; // 200字 or 500字
  templateText: string; // 変数タグ（例: {設備投資額}）を含むテンプレート
  tags: string[];
  relatedCriteriaIds?: string[]; // R2: 関連審査項目タグ
}

// ガントチャートタスク＆フェーズゲート
export interface GanttTask {
  id: string;
  title: string;
  category: 'client' | 'support'; // 顧客タスク | 支援側タスク
  startWeek: number; // 1〜8
  endWeek: number;
  status: 'not_started' | 'in_progress' | 'completed';
  isGate?: boolean;
  gateId?: 'gate-1' | 'gate-2' | 'gate-3' | 'gate-4';
}

export interface PhaseGate {
  id: 'gate-1' | 'gate-2' | 'gate-3' | 'gate-4';
  number: number;
  title: string;
  description: string;
  isPassed: boolean;
  passedAt?: string;
}

// 整合性チェック
export interface ConsistencyCheckItem {
  id: string;
  category:
    | '投資額'
    | '効果・数値'
    | '人件費・体制'
    | 'リードタイム'
    | '設備スペック'
    | 'ターゲット規模';
  label: string;
  documentSnippet: string; // 申請書・ヒアリングから抽出された表記
  financialValue: string; // 収支計画上の数値
  status: 'match' | 'mismatch' | 'unverified';
  note: string;
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
  overallScore: number; // 100点満点
  isPass: boolean;
  summary: string;
  issues: AICrossCheckIssue[];
}

export interface HearingMasterItem {
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
  text200: string;
  text500: string;
  customText: string;
  selectedLength: '200' | '500' | 'custom';
  currentText: string;
  aiBaselineText: string;
  isModified: boolean;
}

export interface SubsidyDocument {
  subsidyType: SubsidyType;
  status: DocumentStatus;
  sections: SubsidySection[];
  lastSavedAt?: string;
}

export interface Project {
  id: string;
  code: string;
  companyName: string;
  industry: string;
  salesRep: string;
  writerName: string;
  deadline: string;
  applicationDeadline: string; // W1: 申請締切日（YYYY-MM-DD）
  targetAmount: string;
  targetAmountManYen: number;
  status: ProjectStatus;
  rawHearingText: string;
  hearingSourceNote?: string;
  masterItems: HearingMasterItem[];
  hearingVariables: HearingVariables; // M1: 数値計画の算定変数
  subsidies: Record<SubsidyType, SubsidyDocument>;
  financialMaster: FinancialMaster;
  gates: PhaseGate[];
  scheduleTasks: GanttTask[];
  manualChecks: Record<string, boolean>; // 手動チェック項目
  lastAICrossCheck?: AICrossCheckResult;
  updatedAt: string;
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

export interface SubsidyAppState {
  role: Role;
  activeScreen: ScreenId;
  workspaceTab: WorkspaceTabId;
  selectedProjectId: string;
  projects: Project[];
  masterTemplates: MasterSchemaTemplate[];
  textModules: TextModule[];
  thresholds: SubsidyRequirementThresholds; // 現在有効な公募回のしきい値と同期
  callRounds: CallRound[]; // R3: 公募回リスト
  activeCallRoundId: string; // R3: 現在有効な公募回ID
  effectEstimates: EffectEstimateItem[]; // W2: 導入効果試算マスタ
  crossCheckPrompt: string;
  diffLogs: DiffLog[];
  promptSuggestionApplied: boolean;
}
