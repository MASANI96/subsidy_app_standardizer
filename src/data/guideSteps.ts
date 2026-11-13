import { DEMO_PROJECT_MARUMARU } from './initialData';
import {
  AdminTabId,
  FinancialMasterSubTab,
  ScreenId,
  WorkspaceTabId,
} from '../types';

export interface GuideTarget {
  screen?: ScreenId;
  workspaceTab?: WorkspaceTabId;
  financialSubTab?: FinancialMasterSubTab;
  openFinancialModal?: 'versions' | 'export' | null;
  openOverviewModal?: 'overview' | 'summary' | null;
  adminTab?: AdminTabId;
  projectId?: string;
}

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  actionLabel?: string;
  guideId: string;
  specTag: string;
  target?: GuideTarget;
}

export interface GuideChapter {
  id: string;
  numberLabel: string; // '00'..'11'
  title: string;
  durationHint: string;
  talkingPoints: string[];
  defaultTarget?: GuideTarget;
  steps: GuideStep[];
}

export interface SpecCorrespondenceRow {
  id: string;
  tag: string;
  requirement: string;
  screenLabel: string;
  target: GuideTarget & { screen: ScreenId; guideId?: string };
}

/**
 * 仕様要件と画面対応一覧（新事業進出・ものづくり商業サービス補助金統合版）
 */
export const SPEC_CORRESPONDENCE_ROWS: SpecCorrespondenceRow[] = [
  {
    id: 'spec-2',
    tag: '指示書 2',
    requirement:
      '新事業進出・ものづくり商業サービス補助金（革新枠・新事業枠・グローバル枠）の一元標準化構造',
    screenLabel: 'マッピング表（階層図）',
    target: { screen: 'mapping', guideId: 'guide-mapping-hierarchy' },
  },
  {
    id: 'spec-4-1',
    tag: '指示書 4-① / Step2',
    requirement:
      'マスターヒアリングシートの読み込み（定性4項目＋数値計画の算定変数）',
    screenLabel: 'ワークスペース タブ2',
    target: {
      screen: 'workspace',
      workspaceTab: 'hearing',
      projectId: DEMO_PROJECT_MARUMARU.id,
      guideId: 'guide-hearing-variables',
    },
  },
  {
    id: 'spec-4-2',
    tag: '指示書 4-② / Step3',
    requirement:
      '決算書PDF取込・科目対応・見比べ画面＆収支計画シミュレーション（リアルタイム要件判定・逆算ソルバー・複数案比較）',
    screenLabel: 'ワークスペース タブ3',
    target: {
      screen: 'workspace',
      workspaceTab: 'financial',
      financialSubTab: 'simulation',
      projectId: DEMO_PROJECT_MARUMARU.id,
      guideId: 'guide-sim-judgment',
    },
  },
  {
    id: 'spec-4-3',
    tag: '指示書 4-③ / Step4',
    requirement:
      '文章モジュールライブラリ（短文約200字・長文約500字以上、変数タグ自動差し込み）',
    screenLabel: '03. 文章モジュール',
    target: { screen: 'library', guideId: 'guide-library-list' },
  },
  {
    id: 'spec-4-4',
    tag: '指示書 4-④ / Step5',
    requirement: '申請枠・必須記載セクションと共通マスターの対応マッピング表',
    screenLabel: '04. マッピング表',
    target: { screen: 'mapping', guideId: 'guide-mapping-table' },
  },
  {
    id: 'spec-4-5',
    tag: '指示書 4-⑤ / Step5',
    requirement: '定性・定量 整合性チェックリスト（自動数値突合・AI監査・手動確認）',
    screenLabel: 'ワークスペース タブ5',
    target: {
      screen: 'workspace',
      workspaceTab: 'consistency',
      projectId: DEMO_PROJECT_MARUMARU.id,
      guideId: 'guide-consistency-table',
    },
  },
  {
    id: 'spec-4-6',
    tag: '指示書 4-⑥ / Step6',
    requirement:
      '標準工程表・ガントチャート（8週／全期間切替・フェーズゲート・顧客共有URL発行）',
    screenLabel: 'ワークスペース タブ1',
    target: {
      screen: 'workspace',
      workspaceTab: 'schedule',
      projectId: DEMO_PROJECT_MARUMARU.id,
      guideId: 'guide-gantt-gates',
    },
  },
  {
    id: 'spec-4-7',
    tag: '指示書 4-⑦ / Step7',
    requirement: '生成AI用プロンプト集（文章生成用＋整合性クロスチェック用）',
    screenLabel: '05. 生成AIプロンプト',
    target: { screen: 'prompts', guideId: 'guide-prompts-generation' },
  },
  {
    id: 'spec-5',
    tag: '指示書 5',
    requirement:
      '公募回版管理・要件閾値・科目対応表・ロール別権限マトリクス・仮の値一元管理',
    screenLabel: '06. 管理者設定',
    target: {
      screen: 'admin',
      adminTab: 'callRounds',
      guideId: 'guide-admin-rounds',
    },
  },
];

/**
 * 説明会台本（00〜11）完全連動ガイド章定義（全12章）
 */
export const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: 'ch-00',
    numberLabel: '00',
    title: '本日のご説明と全体構成',
    durationHint: '約2分',
    talkingPoints: [
      '本モックは「新事業進出・ものづくり商業サービス補助金」の申請支援業務を標準化・仕組み化するための叩き台です。',
      '外部APIや実ファイル保存を伴わず、ブラウザ内だけで確定計算・要件判定・比較・申請書連動を体験できます。',
      '専門用語の横にある「？」アイコンを押すと、会計・補助金の非専門家でも直感的に意味を確認できます。',
    ],
    defaultTarget: { screen: 'projects' },
    steps: [
      {
        id: 'step-00-1',
        title: '説明ガイドの操作方法を確認する',
        description:
          '左パネル上部の「← 前へ」「次へ →」または章内の操作ボタンを押すと、説明順に各画面・サブタブへ自動遷移し、注目箇所が青い枠で強調ハイライトされます。',
        actionLabel: '案件一覧画面を表示',
        guideId: 'guide-project-table',
        specTag: '台本 00',
        target: { screen: 'projects' },
      },
      {
        id: 'step-00-2',
        title: '全体構成・5ステップ俯瞰図を開く',
        description:
          'システム全体の設計思想（受領データの統合、確定計算ロジック、手戻り防止ゲート）をまとめた俯瞰図モーダルを表示します。',
        actionLabel: '全体俯瞰図モーダルを開く',
        guideId: 'guide-project-table',
        specTag: '台本 00-01',
        target: { screen: 'projects', openOverviewModal: 'overview' },
      },
    ],
  },
  {
    id: 'ch-01',
    numberLabel: '01',
    title: '業務課題と標準化アプローチ',
    durationHint: '約3分',
    talkingPoints: [
      '従来の申請支援では「ヒアリング内容の属人化」「数値と文章の食い違い」「手戻りによる工数増」が大きな課題でした。',
      '本システムは①受領データの単一マスター化、②Gate 1〜4による段階確定、③変数タグによる自動連動で手戻りを根絶します。',
    ],
    defaultTarget: { screen: 'projects', openOverviewModal: 'overview' },
    steps: [
      {
        id: 'step-01-1',
        title: '業務課題と標準化アプローチ（俯瞰モーダル）',
        description:
          '5ステップの業務フローと、なぜ「収支確定前に文章を書かせない（Gate 2）」のかをクライアントへご説明します。',
        actionLabel: '標準化アプローチ図を開く',
        guideId: 'guide-project-table',
        specTag: '台本 01',
        target: { screen: 'projects', openOverviewModal: 'overview' },
      },
    ],
  },
  {
    id: 'ch-02',
    numberLabel: '02',
    title: '案件一覧・台帳と顧客進捗管理',
    durationHint: '約3分',
    talkingPoints: [
      '「株式会社○○」様（精密金属加工業・従業員48名・新事業進出枠・設備投資1億円/申請額5,000万円）の案件で全体を実演します。',
      '1年当たり売上見込額の「仮」や資料間差異（5.96億 vs 6.3億）も台帳上で一目で検知できます。',
    ],
    defaultTarget: { screen: 'projects' },
    steps: [
      {
        id: 'step-02-1',
        title: '案件進捗台帳とKPI・フェーズゲート状況を確認',
        description:
          '一覧画面では適用枠・版、総投資額・申請額、1年当たり売上見込額、Gate 1〜4の通過状況を横断確認できます。',
        actionLabel: '案件台帳テーブルを強調',
        guideId: 'guide-project-table',
        specTag: '台本 02',
        target: { screen: 'projects' },
      },
      {
        id: 'step-02-2',
        title: '新規案件の追加登録（自動セットアップ）',
        description:
          '「新規案件を追加登録」ボタンから企業名・適用枠・締切日を登録すると、標準8週間スケジュールと収支枠が自動生成されます。',
        actionLabel: '新規案件登録ボタンを強調',
        guideId: 'guide-project-add',
        specTag: '台本 02',
        target: { screen: 'projects' },
      },
    ],
  },
  {
    id: 'ch-03',
    numberLabel: '03',
    title: '工程表・顧客共有とヒアリング連携',
    durationHint: '約4分',
    talkingPoints: [
      '顧客担当タスクと支援側タスクを分離し、「標準8週（申請まで）」と「全期間（採択〜交付決定〜完了まで）」を切り替えられます。',
      '「共有URLを発行」から編集権限を含まない閲覧専用画面をクライアント（秘書様など）へそのまま共有可能です。',
      'ヒアリングシートで聴取した単価525万円・月7〜10件・増員5名・年6.2%賃上げ等の変数がそのまま収支計算へ連動します。',
    ],
    defaultTarget: {
      screen: 'workspace',
      workspaceTab: 'schedule',
      projectId: DEMO_PROJECT_MARUMARU.id,
    },
    steps: [
      {
        id: 'step-03-1',
        title: '標準工程表・フェーズゲート（Gate 1〜4）',
        description:
          'Gate 1（定性確定）→ Gate 2（収支確定）→ Gate 3（整合性監査）→ Gate 4（電子申請）の順で進行を統制します。',
        actionLabel: '工程表・ゲート画面へ移動',
        guideId: 'guide-gantt-gates',
        specTag: '台本 03 / 指示書 4-⑥',
        target: {
          screen: 'workspace',
          workspaceTab: 'schedule',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
      {
        id: 'step-03-2',
        title: '顧客共有用URLの発行と閲覧専用プレビュー',
        description:
          '右上の「共有URLを発行」ボタンから、クライアントへ送付する読み取り専用工程ビューを確認できます。',
        actionLabel: '共有URL発行ボタンを強調',
        guideId: 'guide-gantt-share',
        specTag: '台本 03',
        target: {
          screen: 'workspace',
          workspaceTab: 'schedule',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
      {
        id: 'step-03-3',
        title: 'マスターヒアリングシート（算定変数と定性4項目）',
        description:
          '「サンプル議事録読込」や算定変数（単価525万円・月7〜10件・増員5名・賃上げ6.2%）を確認し、「マスターへ同期」で収支・申請書へ展開します。',
        actionLabel: 'ヒアリング算定変数へ移動',
        guideId: 'guide-hearing-variables',
        specTag: '台本 03 / 指示書 4-①',
        target: {
          screen: 'workspace',
          workspaceTab: 'hearing',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
    ],
  },
  {
    id: 'ch-04',
    numberLabel: '04',
    title: '決算書PDF取込・科目対応・見比べ（STEP2）',
    durationHint: '約4分',
    talkingPoints: [
      '直近3期の決算書PDFを取り込むと、帳票種別（PL/BS/製造原価/販管費）を自動判定し、勘定科目を標準科目へマッピングします。',
      '左側にPDFプレビュー・右側に抽出項目と貸借バランスを表示する「見比べ確定画面」で税理士確認レベルの検算が可能です。',
    ],
    defaultTarget: {
      screen: 'workspace',
      workspaceTab: 'financial',
      financialSubTab: 'import',
      projectId: DEMO_PROJECT_MARUMARU.id,
    },
    steps: [
      {
        id: 'step-04-1',
        title: '決算書PDF取込・科目マッピング・確定見比べ画面',
        description:
          '2期前・1期前・直近の3期分の取込ステータスと、未割当科目のルール登録・オフバランス入力・確定ロック操作を確認します。',
        actionLabel: '決算書PDF取込タブへ移動',
        guideId: 'guide-fin-import',
        specTag: '台本 04 / STEP2',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          financialSubTab: 'import',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
    ],
  },
  {
    id: 'ch-05',
    numberLabel: '05',
    title: '計画シミュレーションとリアルタイム判定',
    durationHint: '約5分',
    talkingPoints: [
      '左側の前提値（月間販売数量・単価・新規雇用・賃上げ率・最低賃金）を動かすと、右側の要件判定パネルがその場で緑（達成）／赤（未達）に切り替わります。',
      '賃上げ率を「3.8%」等に下げると特例基準（6.0%）が即座に赤になり、「6.2%」へ戻すと全要件達成（緑）に戻ります。',
    ],
    defaultTarget: {
      screen: 'workspace',
      workspaceTab: 'financial',
      financialSubTab: 'simulation',
      projectId: DEMO_PROJECT_MARUMARU.id,
    },
    steps: [
      {
        id: 'step-05-1',
        title: '左側：賃上げ・雇用・販売前提のシミュレーション入力',
        description:
          '一人当たり給与伸び率のクイック検証ボタン（2.0% / 3.8% / 6.2% / 7.0%）を押して、要件達成・未達の変化を実演します。',
        actionLabel: '賃上げシミュレーション入力を強調',
        guideId: 'guide-sim-wage-inputs',
        specTag: '台本 05',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          financialSubTab: 'simulation',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
      {
        id: 'step-05-2',
        title: '右側：リアルタイム要件判定パネル（4大要件＆交付見込額）',
        description:
          '①付加価値額CAGR（4.0%〜）・②一人当たり給与CAGR（特例6.0%〜）・③足下賃上げ（2.0%〜）・④最低賃金（+50円〜）を常時監視します。',
        actionLabel: '右側のリアルタイム判定パネルを強調',
        guideId: 'guide-sim-judgment',
        specTag: '台本 05',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          financialSubTab: 'simulation',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
    ],
  },
  {
    id: 'ch-06',
    numberLabel: '06',
    title: '逆算ソルバーによる要件達成提案',
    durationHint: '約3分',
    talkingPoints: [
      '「基準年度は固定したまま、目標の付加価値額伸び率（例：4.5%）や給与伸び率（例：6.2%）を達成するには年間あと何件売ればよいか？」を逆算します。',
      '算出された差分案は「この調整案を計画に適用」ボタン1つで即座に収支シートへ反映できます。',
    ],
    defaultTarget: {
      screen: 'workspace',
      workspaceTab: 'financial',
      financialSubTab: 'simulation',
      projectId: DEMO_PROJECT_MARUMARU.id,
    },
    steps: [
      {
        id: 'step-06-1',
        title: '目標逆算ソルバーパネルで達成案を試算・適用',
        description:
          '「基準年度を固定して目標を逆算する」を実行し、月間販売数量や賃上げ率の具体的な調整案を確認します。',
        actionLabel: '逆算ソルバーを強調',
        guideId: 'guide-fin-solver',
        specTag: '台本 06',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          financialSubTab: 'simulation',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
    ],
  },
  {
    id: 'ch-07',
    numberLabel: '07',
    title: '複数案（標準・強気・保守）比較＆Excel出力プレビュー',
    durationHint: '約4分',
    talkingPoints: [
      'あらかじめ「標準案」「強気案」「保守案（賃上げ未達）」の3パターンを保存済みです。ワンクリックで切り替えて比較できます。',
      'Excel出力プレビュー画面では、公式インポート形式への転記先セル番号マッピングと4シート分のサマリーを確認できます。',
    ],
    defaultTarget: {
      screen: 'workspace',
      workspaceTab: 'financial',
      financialSubTab: 'simulation',
      projectId: DEMO_PROJECT_MARUMARU.id,
    },
    steps: [
      {
        id: 'step-07-1',
        title: '保存版の比較ドロワーを開く（標準案・強気案・保守案）',
        description:
          '右上の「保存版（比較・復元）」から3案の数値差を比較し、「保守案」を読み込んで判定が赤に変わる様子や「標準案」への復元を体験します。',
        actionLabel: '保存版の比較ドロワーを開く',
        guideId: 'guide-fin-versions',
        specTag: '台本 07',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          financialSubTab: 'simulation',
          openFinancialModal: 'versions',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
      {
        id: 'step-07-2',
        title: 'Excel出力プレビュー（セル転記マップ・出力前チェック）',
        description:
          '出力前チェック結果、顧客確認用4シートのプレビュー（円/千円/万円切替可）、および公式Excelセル対応表を確認します。',
        actionLabel: 'Excel出力プレビューを開く',
        guideId: 'guide-fin-export',
        specTag: '台本 07',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          financialSubTab: 'simulation',
          openFinancialModal: 'export',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
    ],
  },
  {
    id: 'ch-08',
    numberLabel: '08',
    title: 'Gate 2ロック解除＆申請書AI生成・タグ連動',
    durationHint: '約4分',
    talkingPoints: [
      'Gate 2（収支計画確定ロック）前は申請書エディタがブロックされ、数値確定後の手戻りをシステムで防止します。',
      '確定ロック解除後、申請書本文中の {設備投資額} 等の変数タグが収支マスターの実数値へ一括置換されます。',
    ],
    defaultTarget: {
      screen: 'workspace',
      workspaceTab: 'editor',
      projectId: DEMO_PROJECT_MARUMARU.id,
    },
    steps: [
      {
        id: 'step-08-1',
        title: '収支計画を確定ロック（Gate 2通過）',
        description:
          '収支計画タブ右上の「数値を確定してロックする（Gate 2）」を押すと、申請書エディタの編集ブロックが解除されます。',
        actionLabel: 'Gate 2 確定ボタンを強調',
        guideId: 'guide-fin-lock',
        specTag: '台本 08 / Step6',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          financialSubTab: 'simulation',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
      {
        id: 'step-08-2',
        title: '申請書エディタ（文字数判定・モジュール挿入・タグ置換）',
        description:
          'Gate 2確定後、審査項目キーワードの自動検出・200/500字モード・文章モジュール挿入・変数タグ一括置換を確認できます。',
        actionLabel: '申請書エディタタブへ移動',
        guideId: 'guide-editor-tags',
        specTag: '台本 08 / 指示書 ゴール',
        target: {
          screen: 'workspace',
          workspaceTab: 'editor',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
    ],
  },
  {
    id: 'ch-09',
    numberLabel: '09',
    title: '定性・定量 整合性チェック＆マッピング表',
    durationHint: '約4分',
    talkingPoints: [
      '「本文に書いた投資額・売上・増員数」と「収支計画マスター」に1円・1名でも食い違いがあれば提出前に自動検知します。',
      'AIクロスチェック（2秒監査）と4項目の手動確認を完了するとGate 3が通過となります。',
    ],
    defaultTarget: {
      screen: 'workspace',
      workspaceTab: 'consistency',
      projectId: DEMO_PROJECT_MARUMARU.id,
    },
    steps: [
      {
        id: 'step-09-1',
        title: '自動数値突合・AIクロスチェック・手動チェック（Gate 3）',
        description:
          '本文と収支表の自動突合テーブルおよびAIクロスチェック監査を実行し、手動確認リスト4項目を確認します。',
        actionLabel: '整合性チェックタブへ移動',
        guideId: 'guide-consistency-table',
        specTag: '台本 09 / 指示書 4-⑤',
        target: {
          screen: 'workspace',
          workspaceTab: 'consistency',
          projectId: DEMO_PROJECT_MARUMARU.id,
        },
      },
      {
        id: 'step-09-2',
        title: '共通マスターと申請項目・収支の対照マッピング表',
        description:
          'どのヒアリング項目・収支数値が申請書のどのセクションへ展開されるかを一覧で確認し、該当エディタへ直接ジャンプできます。',
        actionLabel: 'マッピング表画面へ移動',
        guideId: 'guide-mapping-table',
        specTag: '台本 09 / 指示書 4-④',
        target: { screen: 'mapping' },
      },
    ],
  },
  {
    id: 'ch-10',
    numberLabel: '10',
    title: 'ロール権限・管理者設定・仮の値・プロンプト集',
    durationHint: '約4分',
    talkingPoints: [
      '画面上部の「操作ロール（営業担当・書類作成者・システム管理者）」を切り替えると編集権限が即座に切り替わります。',
      '管理者設定では公募回ごとの要件しきい値・事業実施期間（「仮」の値を含む）・科目対応表・権限マトリクスを一元管理できます。',
    ],
    defaultTarget: {
      screen: 'admin',
      adminTab: 'callRounds',
    },
    steps: [
      {
        id: 'step-10-1',
        title: 'ロール切替による権限ガードの確認',
        description:
          'ツールバー右側の「操作ロール」を「営業担当」に切り替えると、収支数値編集やGate 2確定ボタンが閲覧専用に保護されます。',
        actionLabel: '操作ロール切替バーを強調',
        guideId: 'guide-header-role',
        specTag: '台本 10',
        target: { screen: 'admin', adminTab: 'permissions' },
      },
      {
        id: 'step-10-2',
        title: '公募回設定・「仮」の値一覧・科目対応表',
        description:
          '公募要領改訂時の版複製や、モック内の「仮 (Tentative)」バッジ付与項目の一覧確認ができます。',
        actionLabel: '管理者設定「仮」の値一覧へ',
        guideId: 'guide-admin-tentative',
        specTag: '台本 10 / 指示書 5',
        target: { screen: 'admin', adminTab: 'tentativeList' },
      },
      {
        id: 'step-10-3',
        title: '生成AI用プロンプト集・文章モジュールライブラリ',
        description:
          '数値タグ強制ルール付きの生成プロンプト集と、ワンクリックコピー機能・クロスチェック監査プロンプトを確認します。',
        actionLabel: '生成AIプロンプト集へ移動',
        guideId: 'guide-prompts-generation',
        specTag: '台本 10 / 指示書 4-⑦',
        target: { screen: 'prompts' },
      },
    ],
  },
  {
    id: 'ch-11',
    numberLabel: '11',
    title: 'まとめ・本番化に向けた確認事項',
    durationHint: '約2分',
    talkingPoints: [
      '本日のまとめモーダルで、標準化効果と本番開発に向けてクライアント側でご確認いただきたい5つの論点を整理します。',
      '説明後は左下の「デモデータを初期状態に戻す（リセット）」でいつでも綺麗な状態から社内再検討いただけます。',
    ],
    defaultTarget: { screen: 'projects', openOverviewModal: 'summary' },
    steps: [
      {
        id: 'step-11-1',
        title: '説明まとめ＆本番化に向けた5つの確認事項を開く',
        description:
          '導入効果の振り返りと、公式Excelテンプレート実物の受領・仮の値の確定・SSO/権限要件等の確認リストを表示します。',
        actionLabel: 'まとめ＆確認事項モーダルを開く',
        guideId: 'guide-project-table',
        specTag: '台本 11',
        target: { screen: 'projects', openOverviewModal: 'summary' },
      },
    ],
  },
];

export const ALL_GUIDE_STEPS: GuideStep[] = GUIDE_CHAPTERS.flatMap(
  (ch) => ch.steps
);
