import { Role } from '../types';

export type PermissionFeatureKey =
  | 'projects_edit' // 案件一覧（新規登録・ステータス変更）
  | 'schedule_task_edit' // 標準工程表（タスク進捗状態更新）
  | 'gate_1_confirm' // Gate 1（定性マスター確定）
  | 'gate_2_confirm' // Gate 2（収支計画確定・ロック解除）
  | 'gate_3_confirm' // Gate 3（整合性チェック確定）
  | 'gate_4_confirm' // Gate 4（電子申請完了確定）
  | 'hearing_edit' // マスターヒアリングシート（取込・生成・変数編集）
  | 'financial_edit' // 収支計画マスター計算シート編集
  | 'editor_edit' // 申請書作成・編集・モジュール挿入・保存
  | 'consistency_edit' // 整合性チェック実行・手動チェック更新
  | 'library_edit' // 文章モジュールライブラリ追加・編集・削除
  | 'prompts_edit' // 生成AI用プロンプト集の編集（閲覧・コピーは全ロール可）
  | 'admin_edit'; // 管理者設定（公募回・しきい値・審査項目・試算設定・プロンプト等）

export interface PermissionMatrixRow {
  key: PermissionFeatureKey;
  category: string;
  featureLabel: string;
  description: string;
  roles: Record<Role, boolean>;
  readOnlyNote?: string;
}

/**
 * R4: 全画面共通の単一権限マトリクス定義
 */
export const PERMISSION_MATRIX: PermissionMatrixRow[] = [
  {
    key: 'projects_edit',
    category: '案件一覧・台帳',
    featureLabel: '新規案件の登録・全体ステータス変更',
    description: '新規顧客案件の台帳登録および案件ステータスの手動変更',
    roles: {
      営業担当: true,
      書類作成者: false,
      システム管理者: true,
    },
    readOnlyNote: '閲覧・検索・ワークスペース移動のみ可',
  },
  {
    key: 'schedule_task_edit',
    category: '標準工程表（タブ1）',
    featureLabel: '顧客／支援側タスクの進捗状態更新',
    description: '8週間ガントチャート上の各タスク進捗（未着手・進行中・完了）の更新',
    roles: {
      営業担当: true,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'gate_1_confirm',
    category: 'フェーズゲート',
    featureLabel: 'Gate 1（定性マスター）の確定',
    description: '初回ヒアリング内容・定性4項目の確定と3補助金への初期同期',
    roles: {
      営業担当: true,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'gate_2_confirm',
    category: 'フェーズゲート',
    featureLabel: 'Gate 2（収支計画・要件）の確定・解除',
    description: '収支計画マスターの数値ロックおよび申請書エディタのロック解除',
    roles: {
      営業担当: false,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'gate_3_confirm',
    category: 'フェーズゲート',
    featureLabel: 'Gate 3（定性・定量 整合性）の確定',
    description: '本文数値と収支計画の整合確認完了・監査通過の確定',
    roles: {
      営業担当: false,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'gate_4_confirm',
    category: 'フェーズゲート',
    featureLabel: 'Gate 4（顧客最終承認・電子申請完了）の確定',
    description: 'GビズID・添付書類最終確認およびjGrants電子申請完了の記録',
    roles: {
      営業担当: false,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'hearing_edit',
    category: 'マスターヒアリング（タブ2）',
    featureLabel: '議事録・Excel取込／マスター生成／算定変数編集',
    description: 'ヒアリング原稿取込、定性4項目の生成・編集、数値計画の算定変数入力',
    roles: {
      営業担当: true,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'financial_edit',
    category: '収支計画マスター（タブ3）',
    featureLabel: '決算実績・算定根拠反映・投資計画・特例設定の編集',
    description: '直近3期・将来3ヶ年収支、減価償却、補助金特例フラグの編集',
    roles: {
      営業担当: false,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'editor_edit',
    category: '申請書作成（タブ4）',
    featureLabel: '申請書本文の執筆・モジュール挿入・AI再生成・保存',
    description: '3補助金別の本文編集、文字数モード切替、変数タグ置換、保存',
    roles: {
      営業担当: false,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'consistency_edit',
    category: '整合性チェック（タブ5）',
    featureLabel: 'AIクロスチェック実行・手動突合チェックの更新',
    description: '整合性クロスチェック監査の実行および提出前チェックリストの記録',
    roles: {
      営業担当: false,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'library_edit',
    category: '文章モジュールライブラリ',
    featureLabel: '標準文章モジュールの新規登録・編集・削除',
    description: '短文・長文テンプレートおよび変数タグ・関連審査項目の管理',
    roles: {
      営業担当: false,
      書類作成者: true,
      システム管理者: true,
    },
  },
  {
    key: 'prompts_edit',
    category: '生成AI用プロンプト集',
    featureLabel: '文章生成・クロスチェック用プロンプト本文の編集',
    description: '全ロールで閲覧・クリップボードコピーが可能。本文の書き換えは管理者のみ',
    roles: {
      営業担当: false,
      書類作成者: false,
      システム管理者: true,
    },
    readOnlyNote: '閲覧＋コピー可',
  },
  {
    key: 'admin_edit',
    category: '管理者設定',
    featureLabel: '公募回・要件しきい値・審査項目・改善示唆・試算設定の編集',
    description: '年度公募回の切替・複製、要件しきい値、審査項目、マスター構成等の変更',
    roles: {
      営業担当: false,
      書類作成者: false,
      システム管理者: true,
    },
  },
];

const MATRIX_MAP: Record<PermissionFeatureKey, Record<Role, boolean>> =
  PERMISSION_MATRIX.reduce(
    (acc, row) => {
      acc[row.key] = row.roles;
      return acc;
    },
    {} as Record<PermissionFeatureKey, Record<Role, boolean>>
  );

export function canEdit(role: Role, feature: PermissionFeatureKey): boolean {
  return Boolean(MATRIX_MAP[feature]?.[role]);
}

export function canConfirmGate(
  role: Role,
  gateId: 'gate-1' | 'gate-2' | 'gate-3' | 'gate-4'
): boolean {
  if (gateId === 'gate-1') return canEdit(role, 'gate_1_confirm');
  if (gateId === 'gate-2') return canEdit(role, 'gate_2_confirm');
  if (gateId === 'gate-3') return canEdit(role, 'gate_3_confirm');
  return canEdit(role, 'gate_4_confirm');
}
