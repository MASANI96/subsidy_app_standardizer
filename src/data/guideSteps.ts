import { AdminTabId, ScreenId, WorkspaceTabId } from '../types';

export interface GuideStep {
  id: string;
  title: string;
  description: string;
  guideId: string;
  specTag: string; // '―' or '指示書 ...'
  target?: {
    screen?: ScreenId;
    workspaceTab?: WorkspaceTabId;
    adminTab?: AdminTabId;
    projectId?: string;
  };
}

export interface GuideChapter {
  id: string;
  numberLabel: string;
  title: string;
  steps: GuideStep[];
}

export interface SpecCorrespondenceRow {
  id: string;
  tag: string;
  requirement: string;
  screenLabel: string;
  target: {
    screen: ScreenId;
    workspaceTab?: WorkspaceTabId;
    adminTab?: AdminTabId;
    projectId?: string;
    guideId?: string;
  };
}

/**
 * §2: 指示書の要件と画面対応表
 */
export const SPEC_CORRESPONDENCE_ROWS: SpecCorrespondenceRow[] = [
  {
    id: 'spec-2',
    tag: '指示書 2',
    requirement:
      '新事業進出を親マスターとし、持続化＝引き算・要約、東京都＝要件追加',
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
      projectId: 'proj-tech-precision',
      guideId: 'guide-hearing-variables',
    },
  },
  {
    id: 'spec-4-2',
    tag: '指示書 4-② / Step3',
    requirement:
      '収支計画マスター計算シート（直近3期入力→各補助金の様式・勘定科目へ変換、減価償却、要件達成判定・アラート）',
    screenLabel: 'ワークスペース タブ3',
    target: {
      screen: 'workspace',
      workspaceTab: 'financial',
      projectId: 'proj-tech-precision',
      guideId: 'guide-fin-requirements',
    },
  },
  {
    id: 'spec-4-3',
    tag: '指示書 4-③ / Step4',
    requirement:
      '文章モジュールライブラリ（短文約200字・長文約500字以上、変数タグ）',
    screenLabel: '文章モジュールライブラリ',
    target: { screen: 'library', guideId: 'guide-library-list' },
  },
  {
    id: 'spec-4-4',
    tag: '指示書 4-④ / Step5',
    requirement: '3つの補助金対応マッピング',
    screenLabel: 'マッピング表、申請書エディタ',
    target: { screen: 'mapping', guideId: 'guide-mapping-table' },
  },
  {
    id: 'spec-4-5',
    tag: '指示書 4-⑤ / Step5',
    requirement: '定性・定量 整合性チェックリスト',
    screenLabel: 'ワークスペース タブ5',
    target: {
      screen: 'workspace',
      workspaceTab: 'consistency',
      projectId: 'proj-edogawa-foods',
      guideId: 'guide-consistency-table',
    },
  },
  {
    id: 'spec-4-6',
    tag: '指示書 4-⑥ / Step6',
    requirement:
      '標準工程表・ガントチャート（顧客タスク／支援側タスク、フェーズゲート）',
    screenLabel: 'ワークスペース タブ1',
    target: {
      screen: 'workspace',
      workspaceTab: 'schedule',
      projectId: 'proj-tech-precision',
      guideId: 'guide-gantt-chart',
    },
  },
  {
    id: 'spec-4-7',
    tag: '指示書 4-⑦ / Step7',
    requirement: '生成AI用プロンプト集（文章生成用＋整合性チェック用）',
    screenLabel: '生成AI用プロンプト集',
    target: { screen: 'prompts', guideId: 'guide-prompts-generation' },
  },
  {
    id: 'spec-goal',
    tag: '指示書 ゴール',
    requirement:
      '指定文字数・公募要領の要件に合致した本文／そのまま提出できる収支計画／数値矛盾ゼロ',
    screenLabel: '申請書エディタ・収支計画・整合性',
    target: {
      screen: 'workspace',
      workspaceTab: 'editor',
      projectId: 'proj-sankyo-logistics',
      guideId: 'guide-editor-charlimit',
    },
  },
  {
    id: 'spec-5',
    tag: '指示書 5',
    requirement:
      '定性定量の完全一致、引いて使える構造、審査項目の意識、定期メンテナンス前提',
    screenLabel: '整合性・マッピング・審査項目・公募回管理',
    target: {
      screen: 'admin',
      adminTab: 'thresholds',
      guideId: 'guide-admin-rounds',
    },
  },
];

/**
 * §4-A: 操作ガイド章・ステップ定義（一元管理）
 */
export const GUIDE_CHAPTERS: GuideChapter[] = [
  {
    id: 'ch-0',
    numberLabel: '0',
    title: 'はじめに',
    steps: [
      {
        id: 'step-0-1',
        title: '本システムの全体像（親マスターから3補助金へ）',
        description:
          '情報量の最も多い「新事業進出補助金」を親マスターとして整備し、持続化補助金へは引き算・要約、東京都の助成事業へは地域・経費妥当性の要件追加を行うことで、1回の取材から3制度の申請書を効率的に作成できます。',
        guideId: 'guide-mapping-hierarchy',
        specTag: '指示書 2',
        target: { screen: 'mapping' },
      },
      {
        id: 'step-0-2',
        title: 'ロールの切り替え',
        description:
          '画面上部から「営業担当」「書類作成者」「システム管理者」の3ロールをいつでも切り替えられます。ロールごとに編集可能な範囲が制御されており、実運用時の権限分担をそのまま確認できます。',
        guideId: 'guide-header-role',
        specTag: '―',
      },
      {
        id: 'step-0-3',
        title: '公募回の表示',
        description:
          '現在適用されている公募回（年度・回次）が常時表示されます。公募要領の改訂時には管理画面で公募回を切り替えるだけで、要件判定や指定文字数が全案件へ一斉に反映されます。',
        guideId: 'guide-header-round',
        specTag: '指示書 5',
      },
    ],
  },
  {
    id: 'ch-1',
    numberLabel: '1',
    title: '案件管理',
    steps: [
      {
        id: 'step-1-1',
        title: 'ダッシュボードで全体を把握',
        description:
          '進行中の案件数、申請締切が14日以内に迫っている要注意案件、Gate 1〜4の通過状況、および現在選択中ロールの対応待ち案件数をひと目で把握できます。各カードをクリックすると一覧を絞り込めます。',
        guideId: 'guide-dashboard-kpi',
        specTag: '―',
        target: { screen: 'projects' },
      },
      {
        id: 'step-1-2',
        title: '導入効果の試算',
        description:
          '従来の手作業による作成時間と、本システム導入後の標準所要時間を比較した削減効果の試算値を表示しています。前提となる工程別時間は管理者設定から調整できます。',
        guideId: 'guide-dashboard-effect',
        specTag: '―',
        target: { screen: 'projects' },
      },
      {
        id: 'step-1-3',
        title: '案件一覧と進捗',
        description:
          '案件ごとのフェーズゲート通過状況と3補助金の作成ステータスを一覧管理します。行をクリックすると、その案件で現在対応すべきボトルネック工程の画面が直接開きます。',
        guideId: 'guide-project-table',
        specTag: '―',
        target: { screen: 'projects' },
      },
      {
        id: 'step-1-4',
        title: '新規案件の登録',
        description:
          '営業担当またはシステム管理者が新規支援案件を登録すると、標準8週間スケジュール、共通ヒアリング項目、収支計画シートの初期枠が自動的にセットアップされます。',
        guideId: 'guide-project-add',
        specTag: '―',
        target: { screen: 'projects' },
      },
    ],
  },
  {
    id: 'ch-2',
    numberLabel: '2',
    title: '標準工程表',
    steps: [
      {
        id: 'step-2-1',
        title: '顧客タスクと支援側タスク',
        description:
          '申請までの標準8週間（W1〜W8）の工程を、「顧客担当タスク（決算書・相見積書の準備や意思決定）」と「支援側タスク（分析・執筆・監査）」に明確に色分けして可視化します。',
        guideId: 'guide-gantt-chart',
        specTag: '指示書 4-⑥',
        target: {
          screen: 'workspace',
          workspaceTab: 'schedule',
          projectId: 'proj-tech-precision',
        },
      },
      {
        id: 'step-2-2',
        title: 'フェーズゲート管理',
        description:
          '定性マスター確定（Gate 1）、収支計画確定（Gate 2）、整合性クリア（Gate 3）、電子申請完了（Gate 4）の4段階の関門を設け、前工程が曖昧なまま次工程へ進むことによる手戻りを防ぎます。',
        guideId: 'guide-gantt-gates',
        specTag: '指示書 4-⑥',
        target: {
          screen: 'workspace',
          workspaceTab: 'schedule',
          projectId: 'proj-tech-precision',
        },
      },
    ],
  },
  {
    id: 'ch-3',
    numberLabel: '3',
    title: 'マスターヒアリングシート',
    steps: [
      {
        id: 'step-3-1',
        title: '議事録・ヒアリングシートの読み込み',
        description:
          '打合せ議事録ファイル（TXT/PDF）や共有フォルダURLからのテキスト取得に加え、共通フォーマットのヒアリングシート（Excel）から定性・定量の基礎情報を読み込む流れを体験できます。',
        guideId: 'guide-hearing-import',
        specTag: '指示書 4-①',
        target: {
          screen: 'workspace',
          workspaceTab: 'hearing',
          projectId: 'proj-tech-precision',
        },
      },
      {
        id: 'step-3-2',
        title: '定性4項目の共通マスター',
        description:
          'ヒアリング原稿から「強み・競合優位性」「経営課題・背景」「導入設備と取り組み」「期待される効果」の4項目を構造化して抽出します。ここが全補助金の文章の親データとなります。',
        guideId: 'guide-hearing-master',
        specTag: '指示書 4-①',
        target: {
          screen: 'workspace',
          workspaceTab: 'hearing',
          projectId: 'proj-tech-precision',
        },
      },
      {
        id: 'step-3-3',
        title: '数値計画の算定変数',
        description:
          '客単価・想定受注件数・作業削減時間・外注費削減額・新規雇用予定人数など、収支計画の根拠となる変数を「発言・資料メモ」とともに整理します。入力した値は次工程の収支計画マスターへそのまま引き継がれます。',
        guideId: 'guide-hearing-variables',
        specTag: '指示書 Step2',
        target: {
          screen: 'workspace',
          workspaceTab: 'hearing',
          projectId: 'proj-tech-precision',
        },
      },
      {
        id: 'step-3-4',
        title: '3補助金への反映',
        description:
          '定性マスターを確定（Gate 1通過）すると、新事業進出・持続化・東京都の3つの補助金それぞれの構成・文字数特性に合わせた初期ドラフト文面が一括で同期されます。',
        guideId: 'guide-hearing-sync',
        specTag: '指示書 2',
        target: {
          screen: 'workspace',
          workspaceTab: 'hearing',
          projectId: 'proj-tech-precision',
        },
      },
    ],
  },
  {
    id: 'ch-4',
    numberLabel: '4',
    title: '収支計画マスター計算シート',
    steps: [
      {
        id: 'step-4-1',
        title: '直近3期の決算入力',
        description:
          '直近3期の決算実績と将来3ヶ年の計画値を同じ表で管理します。売上総利益・営業利益・付加価値額（営業利益＋人件費＋減価償却費）および一人当たり給与支給総額がリアルタイムに自動計算されます。',
        guideId: 'guide-fin-historical',
        specTag: '指示書 4-②',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          projectId: 'proj-tech-precision',
        },
      },
      {
        id: 'step-4-2',
        title: '売上・コスト算定根拠',
        description:
          'ヒアリングシートで聴取した「新事業客単価×想定客数」や「削減時間×時間単価＋外注費削減」の計算式を明示し、ワンクリックで将来3ヶ年の売上高計画へ反映できます。',
        guideId: 'guide-fin-drivers',
        specTag: '指示書 Step3',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          projectId: 'proj-tech-precision',
        },
      },
      {
        id: 'step-4-3',
        title: '投資計画と減価償却',
        description:
          '機械装置費やシステム費などの投資内訳と、定額法・定率法および耐用年数を設定すると、新規投資分の減価償却費が将来1〜3年目の計画値と投資回収年数へ即座に連動します。',
        guideId: 'guide-fin-investment',
        specTag: '指示書 4-②',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          projectId: 'proj-tech-precision',
        },
      },
      {
        id: 'step-4-4',
        title: '要件達成判定とアラート',
        description:
          '付加価値額年率4.0%以上・一人当たり給与年率3.5%以上・補助下限750万円などの公募要件と、賃上げ・インボイス等の特例適用を自動判定します。未達項目がある場合は不足額とともに具体的な警告を表示します。',
        guideId: 'guide-fin-requirements',
        specTag: '指示書 4-②',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          projectId: 'proj-tech-precision',
        },
      },
      {
        id: 'step-4-5',
        title: '補助金別 様式換算イメージ',
        description:
          '一度入力した財務データと投資内訳から、新事業進出・持続化・東京都それぞれの指定様式における勘定科目構成や経費区分、補助上限・交付見込額へ自動変換したイメージを確認できます。',
        guideId: 'guide-fin-formats',
        specTag: '指示書 4-②',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          projectId: 'proj-tech-precision',
        },
      },
      {
        id: 'step-4-6',
        title: '数値の確定（Gate 2）',
        description:
          '収支計画と要件クリアを確認した上で「Gate 2 通過」として数値をロックします。この確定操作を行って初めて、次工程の申請書エディタでの執筆が解禁されます。',
        guideId: 'guide-fin-lock',
        specTag: '指示書 Step6',
        target: {
          screen: 'workspace',
          workspaceTab: 'financial',
          projectId: 'proj-tech-precision',
        },
      },
    ],
  },
  {
    id: 'ch-5',
    numberLabel: '5',
    title: '申請書作成',
    steps: [
      {
        id: 'step-5-1',
        title: '数値確定前は執筆できない仕組み',
        description:
          '収支計画（Gate 2）が未確定の案件では、申請書エディタ全体にロック画面が表示されます。後から投資額や売上目標が変わって全セクションを書き直す手戻りを仕組みとして防止します。',
        guideId: 'guide-editor-blocker',
        specTag: '指示書 Step6',
        target: {
          screen: 'workspace',
          workspaceTab: 'editor',
          projectId: 'proj-sunrise-seiko',
        },
      },
      {
        id: 'step-5-2',
        title: '補助金の切替とセクション構成',
        description:
          'Gate 2確定済みの案件では、上部タブで3つの補助金を切り替えながら並行して編集できます。親マスターのどの項目からマッピングされた文章かもその場で参照できます。',
        guideId: 'guide-editor-subsidy-tabs',
        specTag: '指示書 4-④',
        target: {
          screen: 'workspace',
          workspaceTab: 'editor',
          projectId: 'proj-sankyo-logistics',
        },
      },
      {
        id: 'step-5-3',
        title: '指定文字数チェック',
        description:
          '各セクションの現在文字数と指定文字数の比率をゲージで表示し、不足・適正・超過（超過文字数表示）をリアルタイムに判定します。提出様式ごとの文字数制限オーバーや記述不足を防ぎます。',
        guideId: 'guide-editor-charlimit',
        specTag: '指示書 ゴール',
        target: {
          screen: 'workspace',
          workspaceTab: 'editor',
          projectId: 'proj-sankyo-logistics',
        },
      },
      {
        id: 'step-5-4',
        title: '審査項目の記載チェック',
        description:
          '公募要領の審査観点に基づき、そのセクションで触れるべき審査項目が本文中に盛り込まれているかをキーワード照合で自動チェックし、記載漏れを未然に防ぎます。',
        guideId: 'guide-editor-criteria',
        specTag: '指示書 5',
        target: {
          screen: 'workspace',
          workspaceTab: 'editor',
          projectId: 'proj-sankyo-logistics',
        },
      },
      {
        id: 'step-5-5',
        title: '文章モジュールの挿入',
        description:
          '過去の採択事例から標準化した文章モジュール（短文・長文）を呼び出し、案件の収支マスター実数値へ自動置換した状態でエディタへ挿入・追記できます。',
        guideId: 'guide-editor-module',
        specTag: '指示書 4-③',
        target: {
          screen: 'workspace',
          workspaceTab: 'editor',
          projectId: 'proj-sankyo-logistics',
        },
      },
      {
        id: 'step-5-6',
        title: '変数タグの一括置換',
        description:
          '本文中に含まれる {設備投資額} や {新事業客単価} などの変数タグを、最新の収支計画マスターおよび算定変数の確定値へワンクリックで一括置換できます。',
        guideId: 'guide-editor-tags',
        specTag: '指示書 Step4',
        target: {
          screen: 'workspace',
          workspaceTab: 'editor',
          projectId: 'proj-sankyo-logistics',
        },
      },
      {
        id: 'step-5-7',
        title: '保存と修正差異の蓄積',
        description:
          '担当者がAI初期文面から加筆・修正して保存すると、変更前後の差分（Diff）が自動的に記録されます。蓄積された修正傾向は管理画面でのプロンプト改善に活用されます。',
        guideId: 'guide-editor-save',
        specTag: '指示書 Step7',
        target: {
          screen: 'workspace',
          workspaceTab: 'editor',
          projectId: 'proj-sankyo-logistics',
        },
      },
    ],
  },
  {
    id: 'ch-6',
    numberLabel: '6',
    title: '整合性チェックリスト',
    steps: [
      {
        id: 'step-6-1',
        title: '自動数値突合',
        description:
          '申請書本文の投資額・売上目標・利益率・回収年数に加え、新規雇用人数と人件費計画、設備スペック金額と投資内訳、客単価×客数と将来売上の整合性を自動で突合します。',
        guideId: 'guide-consistency-table',
        specTag: '指示書 4-⑤',
        target: {
          screen: 'workspace',
          workspaceTab: 'consistency',
          projectId: 'proj-edogawa-foods',
        },
      },
      {
        id: 'step-6-2',
        title: 'AIクロスチェック',
        description:
          '整合性クロスチェック用プロンプトを用いて事業計画書と収支計画を横断監査し、不採択要因となる数値矛盾や根拠不足を100点満点のスコアと具体的な改善提案として出力します。',
        guideId: 'guide-consistency-ai',
        specTag: '指示書 4-⑦',
        target: {
          screen: 'workspace',
          workspaceTab: 'consistency',
          projectId: 'proj-edogawa-foods',
        },
      },
      {
        id: 'step-6-3',
        title: '手動チェックとGate 3',
        description:
          '相見積書の原本照合、事業場内最低賃金水準（地域別＋30円以上）の確認、交付決定前の発注防止など実務上の必須チェックを完了し、Gate 3通過を確定します。',
        guideId: 'guide-consistency-manual',
        specTag: '指示書 4-⑤',
        target: {
          screen: 'workspace',
          workspaceTab: 'consistency',
          projectId: 'proj-edogawa-foods',
        },
      },
    ],
  },
  {
    id: 'ch-7',
    numberLabel: '7',
    title: '文章モジュールライブラリ',
    steps: [
      {
        id: 'step-7-1',
        title: '短文・長文と変数タグ',
        description:
          '約200字の短文と約500字以上の長文モジュールをカテゴリ別・関連審査項目別に管理します。選択中の案件の財務数値がリアルタイムに流し込まれたプレビューを見ながら編集できます。',
        guideId: 'guide-library-list',
        specTag: '指示書 4-③',
        target: { screen: 'library' },
      },
    ],
  },
  {
    id: 'ch-8',
    numberLabel: '8',
    title: 'マッピング表',
    steps: [
      {
        id: 'step-8-1',
        title: '3補助金の対照表',
        description:
          '共通マスターの各項目が3つの補助金のどの申請セクションへ「全文展開」「要約（引き算）」「要件補強」として対応するかを一覧表示します。セルをクリックすると該当エディタへ直接移動します。',
        guideId: 'guide-mapping-table',
        specTag: '指示書 4-④',
        target: { screen: 'mapping' },
      },
    ],
  },
  {
    id: 'ch-9',
    numberLabel: '9',
    title: '生成AI用プロンプト集',
    steps: [
      {
        id: 'step-9-1',
        title: '文章生成プロンプト',
        description:
          '3補助金×各3セクション（計9本）の専用プロンプトを一覧管理し、ワンクリックでコピーできます。すべてのプロンプトに「金額・数値は変数タグを用いて収支マスターと齟齬を出さない」ルールが組み込まれています。',
        guideId: 'guide-prompts-generation',
        specTag: '指示書 4-⑦',
        target: { screen: 'prompts' },
      },
      {
        id: 'step-9-2',
        title: '整合性クロスチェック用プロンプト',
        description:
          '完成した定性本文と定量収支計画の矛盾を検出するための監査用プロンプトです。管理画面の設定と単一データで連動しており、外部生成AIツールへそのまま貼り付けて利用することも可能です。',
        guideId: 'guide-prompts-crosscheck',
        specTag: '指示書 4-⑦',
        target: { screen: 'prompts' },
      },
    ],
  },
  {
    id: 'ch-10',
    numberLabel: '10',
    title: '管理者設定',
    steps: [
      {
        id: 'step-10-1',
        title: '公募回の管理',
        description:
          '公募回（年度・回次）ごとに要件しきい値・指定文字数・審査項目・生成プロンプトをセットで保持できます。過去の公募回を複製して新年度の基準を作成し、ワンクリックで有効化を切り替えられます。',
        guideId: 'guide-admin-rounds',
        specTag: '指示書 5',
        target: { screen: 'admin', adminTab: 'thresholds' },
      },
      {
        id: 'step-10-2',
        title: '公募要件しきい値',
        description:
          '新事業進出の付加価値額・一人当たり給与成長率・従業員規模別上限や、持続化の特例上乗せ額、東京都の助成率などを数値マスタとして管理し、全案件の判定ロジックへ即時反映します。',
        guideId: 'guide-admin-thresholds',
        specTag: '指示書 4-②',
        target: { screen: 'admin', adminTab: 'thresholds' },
      },
      {
        id: 'step-10-3',
        title: '審査項目・加点要素',
        description:
          '補助金ごとの審査項目・加点要素と検出キーワードを定義します。ここで登録したキーワードが、申請書エディタ上の「記載あり✓／未記載」チェックに連動します。',
        guideId: 'guide-admin-criteria',
        specTag: '指示書 5',
        target: { screen: 'admin', adminTab: 'criteria' },
      },
      {
        id: 'step-10-4',
        title: '差異分析と改善示唆',
        description:
          '書類作成者がAI生成文から手修正した履歴（ビジュアルDiff）を横断分析し、頻繁に追記される観点をプロンプト改善案として提示・ワンクリック反映する継続改善の仕組みです。',
        guideId: 'guide-admin-diffs',
        specTag: '指示書 Step7',
        target: { screen: 'admin', adminTab: 'diffs' },
      },
      {
        id: 'step-10-5',
        title: '権限マトリクス',
        description:
          '営業担当・書類作成者・システム管理者の3ロールに対する画面・機能別の編集権限一覧を確認できます。分業体制における誤操作防止とガバナンスを担保します。',
        guideId: 'guide-admin-permissions',
        specTag: '―',
        target: { screen: 'admin', adminTab: 'permissions' },
      },
    ],
  },
];

export const ALL_GUIDE_STEPS: GuideStep[] = GUIDE_CHAPTERS.flatMap(
  (ch) => ch.steps
);
