export type ProjectStatus =
  | '未着手'
  | 'ヒアリング中'
  | 'マスター作成済'
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

export type ScreenId = 'projects' | 'hearing' | 'editor' | 'admin';

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
  selectedProjectId: string;
  projects: Project[];
  masterTemplates: MasterSchemaTemplate[];
  diffLogs: DiffLog[];
  promptSuggestionApplied: boolean;
}
