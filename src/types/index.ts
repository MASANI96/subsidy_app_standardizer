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
export type ScreenId = 'projects' | 'workspace' | 'library' | 'admin';
export type WorkspaceTabId =
  | 'schedule'
  | 'hearing'
  | 'financial'
  | 'editor'
  | 'consistency';

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

export interface FinancialMaster {
  status: 'draft' | 'locked'; // 収支確定ステータス
  lockedAt?: string;
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

// 補助金要件判定しきい値（管理画面で変更可能）
export interface SubsidyRequirementThresholds {
  shinJigyo: {
    valueAddedGrowthRateAnnual: number; // 付加価値額 年率伸び率目標（%）（標準: 3.0%）
    wageGrowthRateAnnual: number; // 給与支給総額 年率伸び率目標（%）（標準: 1.5%）
    maxSubsidyAmount: number; // 補助上限額（万円）（標準: 3,000万円）
    subsidyRateNumerator: number; // 補助率分子 (例: 2)
    subsidyRateDenominator: number; // 補助率分母 (例: 3)
  };
  jizokuka: {
    maxSubsidyAmount: number; // 補助上限額（万円）（標準: 200万円）
    subsidyRateNumerator: number; // 2
    subsidyRateDenominator: number; // 3
  };
  tokyo: {
    maxSubsidyAmount: number; // 助成限度額（万円）（標準: 1,500万円）
    subsidyRateNumerator: number; // 1
    subsidyRateDenominator: number; // 2
  };
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
  category: '投資額' | '効果・数値' | '人件費・体制' | 'リードタイム';
  label: string;
  documentSnippet: string; // 申請書から抽出された表記
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
  targetAmount: string;
  targetAmountManYen: number;
  status: ProjectStatus;
  rawHearingText: string;
  hearingSourceNote?: string;
  masterItems: HearingMasterItem[];
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
  thresholds: SubsidyRequirementThresholds;
  crossCheckPrompt: string;
  diffLogs: DiffLog[];
  promptSuggestionApplied: boolean;
}
