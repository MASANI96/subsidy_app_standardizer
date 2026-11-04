import {
  CallRound,
  DiffLog,
  EffectEstimateItem,
  FinancialMaster,
  GanttTask,
  GenerationPromptItem,
  HearingMasterItem,
  HearingVariables,
  MasterSchemaTemplate,
  PhaseGate,
  Project,
  ReviewCriterion,
  SubsidyAppState,
  SubsidyDocument,
  SubsidyRequirementThresholds,
  SubsidySpecialFlags,
  SubsidyType,
  TextModule,
  TextModuleCategory,
} from '../types';
import { recalculateYearData } from '../utils/financialCalculations';

export const SUBSIDY_TYPES: SubsidyType[] = [
  '新事業進出補助金',
  '小規模事業者持続化補助金',
  '東京都経営強化基盤事業',
];

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

export const TEXT_MODULE_CATEGORIES: {
  id: TextModuleCategory;
  label: string;
}[] = [
  { id: 'strength', label: '自社の強み・競合優位性' },
  { id: 'challenge', label: '現状の経営課題・市場背景' },
  { id: 'investment', label: '設備導入内容・工程変革' },
  { id: 'effect', label: '投資効果・収益回収計画' },
  { id: 'tokyo_base', label: '都内サプライチェーン貢献' },
];

export const MANUAL_CHECK_DEFINITIONS: {
  id: string;
  category: string;
  label: string;
  detail: string;
}[] = [
  {
    id: 'mchk-quote',
    category: '証拠書類・見積整合',
    label:
      '本文記載の設備型式・メーカー名・台数と、添付する相見積書（2社以上）の明細金額が1円単位で一致しているか',
    detail: '機械装置費・システム導入費の税抜/税込区分混同がないことを確認',
  },
  {
    id: 'mchk-labor',
    category: '人員・人件費整合',
    label:
      '事業計画本文の「新規採用・専任チーム配置計画」と、収支計画表の従業員数・給与支給総額の増加幅が整合しているか',
    detail:
      '新事業進出補助金の賃上げ要件（一人当たり給与支給総額の年平均成長率）との齟齬を確認',
  },
  {
    id: 'mchk-minwage',
    category: '最低賃金要件（必須確認）',
    label: '事業場内最低賃金水準（地域別最低賃金＋30円以上）の確認',
    detail:
      '事業計画期間において事業場内最低賃金を地域別最低賃金＋30円以上（最低賃金引上げ特例適用時は＋50円以上）とする計画・賃金台帳原本を確認',
  },
  {
    id: 'mchk-depreciation',
    category: '会計・償却ルール',
    label:
      '導入設備の法定耐用年数および減価償却方法（定額法/定率法）が顧問税理士の処理方針と合致しているか',
    detail:
      '将来3ヶ年の販管費・製造原価内の減価償却費に新規償却分が漏れなく加算されているか確認',
  },
  {
    id: 'mchk-funding',
    category: '資金調達・資金繰り',
    label:
      '補助金交付までのつなぎ資金（自己資金＋金融機関借入枠）が総投資額以上確保されており、金融機関の確認書準備が進んでいるか',
    detail:
      '補助金は原則精算払い（後払い）のため、立替払いに耐えうる資金調達内訳であるか確認',
  },
  {
    id: 'mchk-schedule',
    category: '交付決定・発注時期',
    label:
      '交付決定前の事前着手・発注が含まれていないか、設備納入から検収・支払までの事業実施期間内に収まるスケジュールか',
    detail:
      '海外製・長納期工作機械の場合のリードタイムと補助事業完了期限の整合を確認',
  },
];

// M8: 現行公募回（2026年11月時点 参考値）しきい値
export const CURRENT_CALL_ROUND_THRESHOLDS: SubsidyRequirementThresholds = {
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
      {
        maxEmployees: 20,
        label: '20人以下',
        standardCap: 2500,
        wageSpecialCap: 3000,
      },
      {
        maxEmployees: 50,
        label: '21〜50人',
        standardCap: 4000,
        wageSpecialCap: 5000,
      },
      {
        maxEmployees: 100,
        label: '51〜100人',
        standardCap: 5500,
        wageSpecialCap: 7000,
      },
      {
        maxEmployees: null,
        label: '101人以上',
        standardCap: 7000,
        wageSpecialCap: 9000,
      },
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

// R3: 旧公募回（比較用サンプル）しきい値
export const LEGACY_CALL_ROUND_THRESHOLDS: SubsidyRequirementThresholds = {
  shinJigyo: {
    valueAddedGrowthRateAnnual: 3.0,
    perCapitaWageGrowthRateAnnual: 1.5,
    perCapitaWageGrowthSpecialAnnual: 3.0,
    minWagePlusYen: 30,
    minWageSpecialPlusYen: 50,
    subsidyRateNumerator: 2,
    subsidyRateDenominator: 3,
    minWageSpecialRateNumerator: 2,
    minWageSpecialRateDenominator: 3,
    minSubsidyAmount: 100,
    capTiers: [
      {
        maxEmployees: 20,
        label: '20人以下',
        standardCap: 3000,
        wageSpecialCap: 3000,
      },
      {
        maxEmployees: 50,
        label: '21〜50人',
        standardCap: 3000,
        wageSpecialCap: 3000,
      },
      {
        maxEmployees: 100,
        label: '51〜100人',
        standardCap: 3000,
        wageSpecialCap: 3000,
      },
      {
        maxEmployees: null,
        label: '101人以上',
        standardCap: 3000,
        wageSpecialCap: 3000,
      },
    ],
  },
  jizokuka: {
    baseMaxSubsidyAmount: 200,
    invoiceSpecialBonus: 0,
    wageSpecialBonus: 0,
    subsidyRateNumerator: 2,
    subsidyRateDenominator: 3,
    deficitWageSpecialRateNumerator: 2,
    deficitWageSpecialRateDenominator: 3,
  },
  tokyo: {
    maxSubsidyAmount: 1500,
    subsidyRateNumerator: 1,
    subsidyRateDenominator: 2,
  },
};

export const INITIAL_THRESHOLDS: SubsidyRequirementThresholds =
  CURRENT_CALL_ROUND_THRESHOLDS;

// R2: 審査項目・加点要素（参考：公募要領にて要確認）
export const INITIAL_REVIEW_CRITERIA_CURRENT: ReviewCriterion[] = [
  {
    id: 'crit-shin-1',
    subsidyType: '新事業進出補助金',
    name: '既存事業の強み・技術優位性の活用',
    description:
      '自社が培った技術・ノウハウ・取引実績が新事業でどのように活かされるか',
    keywords: ['強み', '技術', 'ノウハウ', '優位', '実績', '短納期'],
    targetSectionIds: ['shin-1'],
  },
  {
    id: 'crit-shin-2',
    subsidyType: '新事業進出補助金',
    name: '新市場性・成長分野への事業転換背景',
    description:
      '既存市場の課題を踏まえ、成長が見込まれる新規市場・新分野へ進出する妥当性',
    keywords: ['成長', '新事業', '新分野', '進出', '市場', '需要', 'OEM', 'EV', '医療'],
    targetSectionIds: ['shin-1', 'shin-2'],
  },
  {
    id: 'crit-shin-3',
    subsidyType: '新事業進出補助金',
    name: '設備導入による生産プロセス変革・内製化',
    description:
      '導入設備の具体的仕様と、従来工程のボトルネック解消・内製化の実現方法',
    keywords: ['内製化', '自動化', '工程', '一貫', 'ワンチャッキング', '標準化', '導入'],
    targetSectionIds: ['shin-2'],
  },
  {
    id: 'crit-shin-4',
    subsidyType: '新事業進出補助金',
    name: '数値計画の妥当性・投資回収根拠',
    description:
      '売上増加・コスト削減・営業利益率改善および投資回収見通しの定量根拠',
    keywords: ['売上', '営業利益率', '削減', '回収', 'キャッシュフロー'],
    targetSectionIds: ['shin-3'],
  },
  {
    id: 'crit-shin-5',
    subsidyType: '新事業進出補助金',
    name: '継続的な賃上げ・雇用創出への貢献（加点観点）',
    description:
      '付加価値拡大を通じた従業員への賃金還元・専門人材採用への波及',
    keywords: ['賃上げ', '給与', '雇用', '採用', '人材', '体制'],
    targetSectionIds: ['shin-3'],
    isBonus: true,
  },
  {
    id: 'crit-jizo-1',
    subsidyType: '小規模事業者持続化補助金',
    name: '自社の経営状況分析と強みの明確化',
    description: '顧客から評価されている自社の強み・経営資源の的確な把握',
    keywords: ['強み', '創業', '実績', '信頼', 'ノウハウ', '専門'],
    targetSectionIds: ['jizo-1'],
  },
  {
    id: 'crit-jizo-2',
    subsidyType: '小規模事業者持続化補助金',
    name: '販路開拓の具体策（展示会・広報・サンプル）',
    description:
      '設備導入にとどまらず、新規顧客を獲得するための具体的な販促・営業施策',
    keywords: ['販路', '展示会', '広報', 'Web', 'サンプル', '新規顧客', '新規取引', '開拓'],
    targetSectionIds: ['jizo-2'],
  },
  {
    id: 'crit-jizo-3',
    subsidyType: '小規模事業者持続化補助金',
    name: '業務効率化と売上拡大効果の整合',
    description: '取り組みによる時間短縮・即納化と売上目標の結びつき',
    keywords: ['短縮', '削減', '売上', '利益'],
    targetSectionIds: ['jizo-3'],
  },
  {
    id: 'crit-tokyo-1',
    subsidyType: '東京都経営強化基盤事業',
    name: '都内事業基盤における現状課題の特定',
    description:
      '都内事業所が直面する収益・外注流出・生産上のボトルネックの明確性',
    keywords: ['都内', '東京', '大田区', '江戸川区', '板橋区', '課題', '利益率'],
    targetSectionIds: ['tokyo-1'],
  },
  {
    id: 'crit-tokyo-2',
    subsidyType: '東京都経営強化基盤事業',
    name: '設置環境および相見積による経費妥当性',
    description:
      '都内工場への設置可否確認と、複数社相見積に基づく導入価格の妥当性検証',
    keywords: ['相見積', '妥当性', '設置', '電源', '仕様'],
    targetSectionIds: ['tokyo-2'],
  },
  {
    id: 'crit-tokyo-3',
    subsidyType: '東京都経営強化基盤事業',
    name: '都内サプライチェーン強化・域内波及効果',
    description:
      '高付加価値工程の都内内製化および周辺協力企業・雇用への波及効果',
    keywords: ['サプライチェーン', '地域', '内製', '基盤強化', '波及'],
    targetSectionIds: ['tokyo-3'],
  },
];

export const INITIAL_REVIEW_CRITERIA_LEGACY: ReviewCriterion[] = [
  ...INITIAL_REVIEW_CRITERIA_CURRENT.filter((c) => c.id !== 'crit-shin-5'),
  {
    id: 'crit-legacy-restructure',
    subsidyType: '新事業進出補助金',
    name: '事業再構築・業態転換要件への合致性（旧公募回観点）',
    description: '既存事業からの売上構成比転換および新規性要件の説明',
    keywords: ['転換', '再構築', '脱却', '新分野'],
    targetSectionIds: ['shin-1', 'shin-3'],
  },
];

// M5: 生成AI用プロンプト集（3補助金×3セクション＝計9本）
export const INITIAL_GENERATION_PROMPTS: GenerationPromptItem[] = [
  // 新事業進出補助金（親マスター全情報・長文）
  {
    id: 'gen-shin-1',
    subsidyType: '新事業進出補助金',
    sectionId: 'shin-1',
    sectionTitle: '1. 企業概要・経営環境',
    sourceMasterLabel: 'マスター① 企業概要・強み ＋ マスター② 現状の経営課題・背景',
    recommendedTags: ['{企業名}', '{従業員数}', '{直前期売上}'],
    lengthMode: '500',
    promptText: `あなたは補助金申請支援の専門コンサルタントです。
共通マスターヒアリングシートの「マスター①（企業概要・強み・競合優位性）」および「マスター②（現状の経営課題・投資の背景）」の全情報を使用し、新事業進出補助金のセクション「1. 企業概要・経営環境」の本文を500文字以上の長文で作成してください。

【執筆要件】
1. 審査項目である「自社の技術的強み・取引実績」と「既存市場の構造変化・現行設備のボトルネック」を因果関係が明確になるよう詳述すること。
2. なぜ今、成長市場への新事業進出が必要なのかという緊急性と市場機会を論理的に示すこと。
3. 金額・数値は必ず変数タグ（{企業名}、{従業員数}、{直前期売上} 等）で記述し、収支計画マスターと齟齬を出さないこと。`,
  },
  {
    id: 'gen-shin-2',
    subsidyType: '新事業進出補助金',
    sectionId: 'shin-2',
    sectionTitle: '2. 事業化に向けた詳細',
    sourceMasterLabel: 'マスター③ 導入設備/システムの詳細と具体的な取り組み',
    recommendedTags: [
      '{機械装置費}',
      '{システム費}',
      '{設備投資額}',
      '{補助金申請額}',
      '{新事業客単価}',
      '{初年度客数}',
    ],
    lengthMode: '500',
    promptText: `共通マスターヒアリングシートの「マスター③（導入設備/システムの詳細と具体的な取り組み）」および数値計画の算定変数に基づき、新事業進出補助金のセクション「2. 事業化に向けた詳細」を500文字以上の長文で作成してください。

【執筆要件】
1. 導入予定の機械装置・システムの具体仕様と、従来工程の課題（多段取り・外注依存・歩留まり等）がどう内製化・変革されるかを審査委員が現場をイメージできる粒度で記述すること。
2. ターゲット顧客への提供価値と受注獲得の具体策（単価・ロット想定）を盛り込むこと。
3. 金額・数値は必ず変数タグ（{機械装置費}、{システム費}、{設備投資額}、{補助金申請額}、{新事業客単価}、{初年度客数} 等）で記述し、収支計画マスターと齟齬を出さないこと。`,
  },
  {
    id: 'gen-shin-3',
    subsidyType: '新事業進出補助金',
    sectionId: 'shin-3',
    sectionTitle: '3. 将来の数値目標・収益計画',
    sourceMasterLabel: 'マスター④ 期待される定性・定量効果（数値計画） ＋ 収支計画マスター',
    recommendedTags: [
      '{削減時間}',
      '{年間削減時間}',
      '{初年度売上}',
      '{3年後売上}',
      '{売上増加額}',
      '{3年後営業利益率}',
      '{付加価値額年率}',
      '{一人当たり給与伸び率}',
      '{新規雇用人数}',
      '{回収年数}',
      '{年間CF増加額}',
    ],
    lengthMode: '500',
    promptText: `共通マスターヒアリングシートの「マスター④（期待される定性・定量効果）」および収支計画マスターの確定データに基づき、新事業進出補助金のセクション「3. 将来の数値目標・収益計画」を500文字以上の長文で作成してください。

【執筆要件】
1. 工程リードタイム短縮・作業時間削減・外注費圧縮による原価改善効果を具体的に記述すること。
2. 3年後の全社売上高・売上増加額・営業利益率に加え、公募要件である付加価値額年率・一人当たり給与伸び率・新規雇用計画・投資回収年数を網羅すること。
3. 金額・数値は必ず変数タグ（{3年後売上}、{売上増加額}、{3年後営業利益率}、{付加価値額年率}、{一人当たり給与伸び率}、{回収年数} 等）で記述し、収支計画マスターと齟齬を出さないこと。`,
  },
  // 小規模事業者持続化補助金（引き算・要約・販路開拓焦点）
  {
    id: 'gen-jizo-1',
    subsidyType: '小規模事業者持続化補助金',
    sectionId: 'jizo-1',
    sectionTitle: '1. 企業概要・自社の強み',
    sourceMasterLabel: 'マスター① 企業概要・強み・競合優位性（要約抽出）',
    recommendedTags: ['{企業名}', '{従業員数}', '{直前期売上}'],
    lengthMode: '200',
    promptText: `親マスターの「マスター①（企業概要・強み）」から要素を引き算・要約し、小規模事業者持続化補助金のセクション「1. 企業概要・自社の強み」を約170〜200文字で簡潔に作成してください。

【執筆要件】
1. 過度な設備技術論は省き、「誰に・どのような強みで支持されている小規模事業者か」に焦点を絞って要約すること。
2. 指定文字数（200字上限目安）の80〜100%に収めること。
3. 金額・数値は必ず変数タグ（{企業名}、{従業員数}、{直前期売上}）で記述し、収支計画マスターと齟齬を出さないこと。`,
  },
  {
    id: 'gen-jizo-2',
    subsidyType: '小規模事業者持続化補助金',
    sectionId: 'jizo-2',
    sectionTitle: '2. 今回の取り組み内容',
    sourceMasterLabel: 'マスター② 課題背景 ＋ マスター③ 導入設備と販路開拓展開',
    recommendedTags: ['{機械装置費}', '{システム費}', '{設備投資額}', '{新事業客単価}'],
    lengthMode: '200',
    promptText: `親マスターの「マスター②・③」から販路開拓に関わる要素を抽出・要約し、小規模事業者持続化補助金のセクション「2. 今回の取り組み内容」を約170〜200文字で作成してください。

【執筆要件】
1. 単なる機械導入の説明にならないよう、導入設備を活用した「高精度サンプル製作・専門展示会出展・Web広報・カタログ刷新」による新規顧客開拓ストーリーへ焦点を当てること。
2. 金額・数値は必ず変数タグ（{機械装置費}、{システム費}、{設備投資額} 等）で記述し、収支計画マスターと齟齬を出さないこと。`,
  },
  {
    id: 'gen-jizo-3',
    subsidyType: '小規模事業者持続化補助金',
    sectionId: 'jizo-3',
    sectionTitle: '3. 業務効率化・売上拡大効果',
    sourceMasterLabel: 'マスター④ 期待される定性・定量効果（即納・売上効果）',
    recommendedTags: ['{削減時間}', '{初年度客数}', '{売上増加額}', '{3年後営業利益率}'],
    lengthMode: '200',
    promptText: `親マスターの「マスター④」を引き算・要約し、小規模事業者持続化補助金のセクション「3. 業務効率化・売上拡大効果」を約170〜200文字で作成してください。

【執筆要件】
1. 工程短縮による即納体制の確立と、展示会・広報経由の新規成約による売上・利益拡大効果を端的に結ぶこと。
2. 金額・数値は必ず変数タグ（{削減時間}、{売上増加額}、{3年後営業利益率} 等）で記述し、収支計画マスターと齟齬を出さないこと。`,
  },
  // 東京都経営強化基盤事業（都内基盤・経費妥当性の要件追加）
  {
    id: 'gen-tokyo-1',
    subsidyType: '東京都経営強化基盤事業',
    sectionId: 'tokyo-1',
    sectionTitle: '1. 事業の現状と課題',
    sourceMasterLabel: 'マスター① 都内基盤強み ＋ マスター② 課題と背景',
    recommendedTags: ['{企業名}', '{従業員数}', '{直前期売上}'],
    lengthMode: 'custom',
    promptText: `親マスターの「マスター①・②」をベースに東京都助成事業の固有観点を要件追加し、「1. 事業の現状と課題」を指定文字数（80〜100%目安）で作成してください。

【執筆要件】
1. 都内製造・物流等の産業基盤における自社の役割と、外注流出や旧式設備による収益低下の課題を明確に対比すること。
2. 都内事業所の経営基盤強化が不可欠である理由を補強すること。
3. 金額・数値は必ず変数タグ（{従業員数}、{直前期売上} 等）で記述し、収支計画マスターと齟齬を出さないこと。`,
  },
  {
    id: 'gen-tokyo-2',
    subsidyType: '東京都経営強化基盤事業',
    sectionId: 'tokyo-2',
    sectionTitle: '2. 設備導入計画',
    sourceMasterLabel: 'マスター③ 導入設備仕様・設置妥当性・見積根拠',
    recommendedTags: ['{機械装置費}', '{システム費}', '{設備投資額}'],
    lengthMode: 'custom',
    promptText: `親マスターの「マスター③」に東京都助成事業の審査要件を追加し、「2. 設備導入計画」を指定文字数（80〜100%目安）で作成してください。

【執筆要件】
1. 都内事業所への設置スペース・床耐荷重・電源容量等の事前確認状況を追加記述すること。
2. 複数社からの相見積取得により、導入機種選定および価格の妥当性を検証済みである旨を明記すること。
3. 金額・数値は必ず変数タグ（{機械装置費}、{システム費}、{設備投資額}）で記述し、収支計画マスターと齟齬を出さないこと。`,
  },
  {
    id: 'gen-tokyo-3',
    subsidyType: '東京都経営強化基盤事業',
    sectionId: 'tokyo-3',
    sectionTitle: '3. 経営基盤強化の成果目標',
    sourceMasterLabel: 'マスター④ 都内サプライチェーン貢献・外注費削減目標',
    recommendedTags: [
      '{削減時間}',
      '{売上増加額}',
      '{3年後営業利益率}',
      '{付加価値額年率}',
      '{一人当たり給与伸び率}',
    ],
    lengthMode: 'custom',
    promptText: `親マスターの「マスター④」に地域波及・基盤強化の観点を追加し、「3. 経営基盤強化の成果目標」を指定文字数（80〜100%目安）で作成してください。

【執筆要件】
1. リードタイム短縮・外注費の社内留保による付加価値向上に加え、都内協力企業群との連携・サプライチェーン高度化・雇用維持および賃上げへの貢献を記述すること。
2. 金額・数値は必ず変数タグ（{削減時間}、{売上増加額}、{3年後営業利益率}、{付加価値額年率} 等）で記述し、収支計画マスターと齟齬を出さないこと。`,
  },
];

// R3: 初期公募回データ（2件）
export const INITIAL_CALL_ROUNDS: CallRound[] = [
  {
    id: 'round-2026-current',
    name: '現行公募回（2026年11月時点 参考値）',
    effectiveDate: '2026-11-01',
    memo: '付加価値額年率4.0%・一人当たり給与年率3.5%・従業員規模別上限・持続化特例上乗せ・東京都一般コース（800万円・2/3）を反映した参考設定',
    thresholds: CURRENT_CALL_ROUND_THRESHOLDS,
    sectionCharLimits: {
      'shin-1': 500,
      'shin-2': 500,
      'shin-3': 500,
      'jizo-1': 200,
      'jizo-2': 200,
      'jizo-3': 200,
      'tokyo-1': 400,
      'tokyo-2': 400,
      'tokyo-3': 400,
    },
    reviewCriteria: INITIAL_REVIEW_CRITERIA_CURRENT,
    generationPrompts: INITIAL_GENERATION_PROMPTS,
  },
  {
    id: 'round-legacy-sample',
    name: '旧公募回（比較用サンプル）',
    effectiveDate: '2025-04-01',
    memo: '過年度比較検証用サンプル（新事業：付加価値3.0%／給与1.5%／上限3,000万円・2/3、持続化：200万円・2/3、東京都：1,500万円・1/2）',
    thresholds: LEGACY_CALL_ROUND_THRESHOLDS,
    sectionCharLimits: {
      'shin-1': 500,
      'shin-2': 500,
      'shin-3': 500,
      'jizo-1': 200,
      'jizo-2': 200,
      'jizo-3': 200,
      'tokyo-1': 350,
      'tokyo-2': 350,
      'tokyo-3': 350,
    },
    reviewCriteria: INITIAL_REVIEW_CRITERIA_LEGACY,
    generationPrompts: INITIAL_GENERATION_PROMPTS,
  },
];

// W2: 導入効果試算の初期値（試算例（仮置き））
export const INITIAL_EFFECT_ESTIMATES: EffectEstimateItem[] = [
  {
    id: 'hearing',
    processName: 'ヒアリング整理・マスター作成',
    manualHours: 3,
    systemMinutes: 20,
  },
  {
    id: 'financial',
    processName: '収支計画作成・要件確認',
    manualHours: 8,
    systemMinutes: 60,
  },
  {
    id: 'editor',
    processName: '3補助金の申請書ドラフト作成',
    manualHours: 24,
    systemMinutes: 240, // 4時間
  },
  {
    id: 'consistency',
    processName: '整合性チェック',
    manualHours: 4,
    systemMinutes: 30,
  },
  {
    id: 'schedule',
    processName: '工程・ゲート管理',
    manualHours: 2,
    systemMinutes: 15,
  },
];

export const INITIAL_CROSS_CHECK_PROMPT = `あなたは中小企業診断士および補助金審査委員の視点を持つ品質監査官です。
対象案件の「事業計画書（定性テキスト全項目）」「マスターヒアリング算定変数」と「収支計画マスター（直近3期決算・投資内訳・将来3ヶ年数値計画）」を厳密にクロスチェックし、以下の観点で矛盾・記載漏れ・審査減点リスクを検出してください。

1. 【投資金額・設備スペック内訳の完全一致】定性マスター③および本文中の総投資額・機械装置費・システム費の記載が、収支計画マスターの投資計画表と完全一致しているか。
2. 【ターゲット規模・売上・利益目標の整合性】客単価×想定客数の算定根拠が将来売上に反映され、本文中の3年後売上増加額・全社売上高・営業利益率目標と完全一致しているか。
3. 【投資回収年数・CF根拠】総投資額に対する投資回収年数および年間キャッシュフロー増加根拠が具体的に明記されているか。
4. 【人員計画・一人当たり賃上げ要件の妥当性】新規雇用予定人数と従業員数の推移、および一人当たり給与支給総額の年平均成長率が公募要件と矛盾していないか。`;

export const SAMPLE_MEETING_MINUTES = `【顧客名】株式会社テックプレシジョン
【日時】2026年10月15日 14:00〜15:30
【出席者】代表取締役 高橋様、専務取締役 鈴木様、営業担当 田中
【議事内容メモ】
・当社は大田区で創業35年の精密金属加工業（社員15名、売上2.8億円）。
・主力の自動車向け試作部品の需要が内燃機関縮小により頭打ちになっており、既存事業の利益率が年々低下（営業利益率2.1%）。
・強みはミクロン単位の難削材（チタン・インコネル等）切削技術と、大田区内の中小企業ネットワークを活かした短納期対応（他社比30%短縮）。
・今後の活路として、成長分野である「EVバッテリー冷却部品」および「医療機器用内視鏡精密パーツ」の量産受託に進出したい。すでに取引先から打診あり。
・課題として、既存の3軸加工機では複雑な立体微細形状の同時加工ができず、外注費がかさみ納期遅延の原因になっている。
・今回、最新鋭の5軸マシニングセンタ（DMG森精機製、本体価格約3,800万円）と高精度CAD/CAMソフトウェア（400万円）の合計4,200万円の設備投資を実施したい。
・投資効果として、工程集約によりリードタイムを従来の14日から4日へ70%削減。外注費を年間1,200万円削減。新規案件獲得により3年後に売上+8,000万円、営業利益率8.5%を見込む。`;

export const INITIAL_MASTER_TEMPLATES: MasterSchemaTemplate[] = [
  {
    id: 'master-1',
    title: '企業概要・強み・競合優位性',
    prompt:
      'ヒアリング議事録から対象企業の設立年数・所在地・従業員規模・主力事業を抽出し、技術面および取引体制における他社と比較した定量的・定性的な競合優位性を公募審査員向けに端的に構造化すること。',
  },
  {
    id: 'master-2',
    title: '現状の経営課題・投資の背景',
    prompt:
      '外部環境（市場縮小・構造変化等）による売上・利益率への影響と、既存設備・体制におけるボトルネック（外注依存、納期遅延、技術制約等）を明確に切り分け、本投資および新分野進出の緊急性を記述すること。',
  },
  {
    id: 'master-3',
    title: '導入設備/システムの詳細と具体的な取り組み',
    prompt:
      '導入予定の機械装置・ソフトウェアのメーカー名、型式種別、投資金額の内訳を正確に抽出し、当該設備によってどのように既存工程の課題が解消・内製化されるのか具体的な生産プロセス変革として記述すること。',
  },
  {
    id: 'master-4',
    title: '期待される定性・定量効果（数値計画）',
    prompt:
      'リードタイム短縮率、外注費等のコスト削減額、ならびに今後3〜5年間の売上増加額・営業利益率の改善目標をすべて具体的な数値と根拠とともに整理すること。',
  },
];

export const TECH_PRECISION_MASTER_PRESET: Record<string, string> = {
  'master-1':
    '大田区で創業35年の歴史を持つ精密金属加工企業（従業員15名）。チタンやインコネル等の難削材に対するミクロン単位の超精密切削技術を有し、大田区内の製造業ネットワークを活かした短納期対応力（業界標準比30%短縮）が最大の競合優位性である。',
  'master-2':
    '既存主力事業である内燃機関向け自動車試作部品の需要低迷に伴い営業利益率が2.1%に低下。既存の3軸加工機では複雑形状の一貫加工が不可能で外注依存と納期長期化が課題。高成長が見込まれるEVバッテリー冷却部品および医療機器用内視鏡パーツへの新事業進出が急務となっている。',
  'master-3':
    '最新鋭の5軸マシニングセンタ（DMG森精機製・3,800万円）および高精度CAD/CAMソフトウェア（400万円）の総投資額4,200万円を導入。工程集約によるワンチャッキング連続加工体制を確立し、微細立体形状の内製化を推進する。',
  'master-4':
    '加工リードタイムを14日から4日へと70%短縮、外注加工費を年間1,200万円削減。新分野での受注獲得により、設備導入後3年で売上高8,000万円増、営業利益率8.5%への改善を達成する。',
};

export const TECH_PRECISION_MASTER_IMPROVED_4 =
  '加工リードタイムを14日から4日へと70%短縮し、外注加工費を年間1,200万円削減する。新分野での受注獲得により設備導入後3年で売上高8,000万円増（内訳：EV冷却部品5,000万円、医療内視鏡部品3,000万円）、営業利益率8.5%への改善を達成する。総投資額4,200万円に対する投資回収期間は年間キャッシュフロー増加額（約1,310万円）ベースで約3.2年を見込む。';

export const INITIAL_TEXT_MODULES: TextModule[] = [
  {
    id: 'mod-strength-short',
    category: 'strength',
    categoryLabel: '自社の強み・競合優位性',
    title: '自社の強み（難削材加工・短納期ネットワーク）【短文】',
    lengthType: 'short',
    templateText:
      '創業以来培った難削材（チタン・インコネル等）のミクロン単位切削技術と、従業員{従業員数}の機動力および地域協力工場ネットワークを活かした短納期対応力（業界標準比30%短縮）が最大の強みであり、直前期売上{直前期売上}の安定取引基盤を有する。',
    tags: ['難削材加工', '短納期対応', '小規模持続化向け'],
    relatedCriteriaIds: ['crit-shin-1', 'crit-jizo-1'],
  },
  {
    id: 'mod-strength-long',
    category: 'strength',
    categoryLabel: '自社の強み・競合優位性',
    title: '自社の強み（難削材加工・短納期ネットワーク）【長文】',
    lengthType: 'long',
    templateText:
      '{企業名}（従業員{従業員数}、直前期売上高{直前期売上}）は、チタンやインコネル等の高硬度・難削材に対するミクロン単位の超精密切削技術を中核的な競合優位性としている。長年の試作開発で蓄積した独自の治具設計・切削条件データベースに加え、地域の熱処理・表面処理専門企業と連携した一気通貫の短納期供給体制（業界平均比30%短縮）を確立しており、大手メーカー開発部門から高い技術評価を獲得している。',
    tags: ['難削材加工', '技術優位性', '新事業進出向け'],
    relatedCriteriaIds: ['crit-shin-1', 'crit-tokyo-1'],
  },
  {
    id: 'mod-challenge-short',
    category: 'challenge',
    categoryLabel: '現状の経営課題・市場背景',
    title: '現状課題（内燃機関市場縮小・3軸機ボトルネック）【短文】',
    lengthType: 'short',
    templateText:
      '主力の内燃機関向け試作需要の構造的縮小により収益性が低下している。既存の3軸加工機では複雑立体形状の同時加工が行えず、特殊工程の外注依存による原価高騰と納期長期化がボトルネックとなっており、成長市場への転換が急務である。',
    tags: ['EVシフト', '外注依存解消', '3軸機制約'],
    relatedCriteriaIds: ['crit-shin-2', 'crit-tokyo-1'],
  },
  {
    id: 'mod-challenge-long',
    category: 'challenge',
    categoryLabel: '現状の経営課題・市場背景',
    title: '現状課題（内燃機関市場縮小・3軸機ボトルネック）【長文】',
    lengthType: 'long',
    templateText:
      '自動車産業の急速なEVシフトに伴い、当社の既存主力領域である内燃機関向け試作部品の受注単価・数量ともに頭打ちとなり、利益率の低下が深刻な経営課題となっている。一方、既に引き合いを得ているEV冷却部品や医療機器用精密パーツは複雑な3次元微細形状を伴うため、既存の3軸加工機では複数回の段取り替えと外部委託が不可欠となり、外注加工費の流出およびリードタイム長期化が受注拡大の重大な障壁となっている。',
    tags: ['市場構造変化', 'ボトルネック特定', '新分野展開'],
    relatedCriteriaIds: ['crit-shin-2', 'crit-tokyo-1'],
  },
  {
    id: 'mod-investment-short',
    category: 'investment',
    categoryLabel: '設備導入内容・工程変革',
    title: '設備導入内容（5軸マシニングセンタ工程集約）【短文】',
    lengthType: 'short',
    templateText:
      '最新鋭5軸マシニングセンタ（{機械装置費}）と高精度CAD/CAM（{システム費}）の総額{設備投資額}を導入。従来の複数段取りと外注工程をワンチャッキング連続加工へ集約・内製化し、展示会出展とサンプル提案で新規顧客を開拓する。',
    tags: ['5軸MC', 'ワンチャッキング', '販路開拓'],
    relatedCriteriaIds: ['crit-shin-3', 'crit-jizo-2'],
  },
  {
    id: 'mod-investment-long',
    category: 'investment',
    categoryLabel: '設備導入内容・工程変革',
    title: '設備導入内容（5軸マシニングセンタ工程集約）【長文】',
    lengthType: 'long',
    templateText:
      '複雑微細形状の高精度内製化を実現するため、最新鋭の同時5軸制御マシニングセンタ（機械装置費{機械装置費}）および同時5軸対応CAD/CAMシステム（システム費{システム費}）、総額{設備投資額}（うち補助金申請額{補助金申請額}）の設備投資を実施する。従来は複数工程の段取り替えと二次外注を要していた複雑流路加工をワンチャッキングでの連続無人加工へ抜本的に集約し、平均受注単価{新事業客単価}・初年度{初年度客数}の量産受託体制を確立する。',
    tags: ['5軸MC', 'CAD/CAM連動', '総額・内訳明記'],
    relatedCriteriaIds: ['crit-shin-3', 'crit-tokyo-2'],
  },
  {
    id: 'mod-effect-short',
    category: 'effect',
    categoryLabel: '投資効果・収益回収計画',
    title: '投資効果（売上拡大・リードタイム削減・回収年数）【短文】',
    lengthType: 'short',
    templateText:
      '工程集約によりリードタイムを{削減時間}短縮（年間{年間削減時間}削減）し、初年度売上{初年度売上}、3年後に全社売上{3年後売上}（+{売上増加額}）・営業利益率{3年後営業利益率}を達成する。投資回収期間は約{回収年数}である。',
    tags: ['数値目標', '投資回収年数', '付加価値額'],
    relatedCriteriaIds: ['crit-shin-4', 'crit-jizo-3'],
  },
  {
    id: 'mod-effect-long',
    category: 'effect',
    categoryLabel: '投資効果・収益回収計画',
    title: '投資効果（売上拡大・賃上げ・雇用・回収年数）【長文】',
    lengthType: 'long',
    templateText:
      '本設備の導入により製造リードタイムを{削減時間}削減（年間作業{年間削減時間}削減）し、外注加工費を内製化吸収する。新規量産案件の受注獲得により、初年度売上高{初年度売上}、事業化3年後には全社売上高{3年後売上}（直前期比+{売上増加額}）および営業利益率{3年後営業利益率}を達成する計画である。付加価値額は年率{付加価値額年率}、一人当たり給与支給総額は年率{一人当たり給与伸び率}の成長と新規雇用{新規雇用人数}を実現し、総投資額{設備投資額}に対する投資回収期間は年間CF増加額（約{年間CF増加額}）ベースで約{回収年数}と試算している。',
    tags: ['収支完全連動', 'ROI試算', '賃上げ・雇用要件'],
    relatedCriteriaIds: ['crit-shin-4', 'crit-shin-5'],
  },
  {
    id: 'mod-tokyo-short',
    category: 'tokyo_base',
    categoryLabel: '都内サプライチェーン貢献',
    title: '都内サプライチェーン貢献・経費妥当性【短文】',
    lengthType: 'short',
    templateText:
      '都内本社工場への総額{設備投資額}の導入により高難度加工の域内完結体制を構築。設置電源環境および複数社相見積により価格妥当性を検証済であり、3年後売上{3年後売上}・付加価値額年率{付加価値額年率}成長を通じて都内産業基盤強化に貢献する。',
    tags: ['東京都経営強化', '相見積妥当性', '域内循環'],
    relatedCriteriaIds: ['crit-tokyo-2', 'crit-tokyo-3'],
  },
  {
    id: 'mod-tokyo-long',
    category: 'tokyo_base',
    categoryLabel: '都内サプライチェーン貢献',
    title: '都内サプライチェーン貢献・経費妥当性【長文】',
    lengthType: 'long',
    templateText:
      '都内工場への最新鋭設備（総額{設備投資額}：機械装置{機械装置費}・システム{システム費}）の導入に際しては、設置床耐荷重・電源容量の事前確認および複数商社からの相見積取得により仕様・価格双方の妥当性を厳格に検証済みである。これまで都外へ流出していた高難度加工を都内事業所で内製完結させるとともに、周辺の熱処理・精密検査を担う都内協力企業群へも新規受注を波及させることで、地域サプライチェーンの高度化と新規雇用{新規雇用人数}・一人当たり給与年率{一人当たり給与伸び率}増の賃上げに大きく寄与する。',
    tags: ['東京都経営強化', 'サプライチェーン波及', '雇用・賃上げ'],
    relatedCriteriaIds: ['crit-tokyo-2', 'crit-tokyo-3', 'crit-shin-5'],
  },
];

// M1: 案件別 マスターヒアリング算定変数サンプル値
export function createTechPrecisionHearingVariables(): HearingVariables {
  return {
    existingUnitPrice: {
      value: 350000,
      unit: '円',
      sourceMemo: '既存試作案件の過去1年平均受注ロット単価（販売管理台帳）',
    },
    newUnitPrice: {
      value: 500000,
      unit: '円',
      sourceMemo: 'EV冷却部品・医療内視鏡精密パーツ量産ロット見積単価（高橋社長発言）',
    },
    newCustomerCountY1: {
      value: 50,
      unit: '件/年',
      sourceMemo: '既存ティア1取引先2社からの打診ロット初年度見込（50万円×50件＝2,500万円）',
    },
    newCustomerCountY2: {
      value: 100,
      unit: '件/年',
      sourceMemo: '医療機器メーカー本認定後の定期量産ロット増（50万円×100件＝5,000万円）',
    },
    newCustomerCountY3: {
      value: 160,
      unit: '件/年',
      sourceMemo: '展示会新規開拓＋EV冷却流路通期フル稼働（50万円×160件＝8,000万円）',
    },
    repeatRate: {
      value: 85,
      unit: '%',
      sourceMemo: '量産金型・治具認定後の継続リピート受注率実績',
    },
    reducedWorkHours: {
      value: 960,
      unit: '時間/年',
      sourceMemo: '3軸機での平均4回段取り替え→ワンチャッキング化による段取り・手仕上げ削減時間',
    },
    hourlyWage: {
      value: 3500,
      unit: '円/時',
      sourceMemo: '製造部加工技術者の平均時間当たり労務費単価（賃金台帳ベース）',
    },
    subcontractReduction: {
      value: 1200,
      unit: '万円/年',
      sourceMemo: '外注5軸荒加工・複雑曲面加工の完全内製化による削減額（直前期外注費明細）',
    },
    defectRate: {
      current: 3.2,
      target: 0.4,
      unit: '%',
      sourceMemo: '複数回チャッキング時の芯ズレ不良解消（品質保証記録）',
    },
    leadTime: {
      current: 14,
      target: 4,
      unit: '日',
      sourceMemo: '外注往復および工程待ち解消による製造リードタイム70%短縮（議事録確認済）',
    },
    productionCapacity: {
      current: 120,
      target: 380,
      unit: '個/月',
      sourceMemo: '夜間パレットチェンジャー連続運転による月産キャパシティ拡大試算',
    },
    newHiresY1: {
      value: 1,
      unit: '名',
      sourceMemo: '初年度：5軸CAD/CAMプログラミング専任技術者 1名採用予定',
    },
    newHiresY2: {
      value: 0,
      unit: '名',
      sourceMemo: '2年目：既存オペレーター多能工化育成期間（増員なし）',
    },
    newHiresY3: {
      value: 1,
      unit: '名',
      sourceMemo: '3年目：量産検査・品質保証担当 1名採用予定（計2名増員→17名体制）',
    },
    plannedWageGrowthRate: {
      value: 4.0,
      unit: '%/年',
      sourceMemo: '一人当たり給与支給総額を年率4.0%引き上げ（480万円→540万円/人、専務確認済）',
    },
  };
}

export function createGenericHearingVariables(options: {
  existingUnitPrice: number;
  newUnitPrice: number;
  countY1: number;
  countY2: number;
  countY3: number;
  repeatRate: number;
  reducedHours: number;
  hourlyWage: number;
  subcontractRed: number;
  defectCurr: number;
  defectTarget: number;
  ltCurr: number;
  ltTarget: number;
  capCurr: number;
  capTarget: number;
  hiresY1: number;
  hiresY2: number;
  hiresY3: number;
  wageGrowth: number;
  memoPrefix: string;
}): HearingVariables {
  return {
    existingUnitPrice: {
      value: options.existingUnitPrice,
      unit: '円',
      sourceMemo: `${options.memoPrefix}・既存主力取引の平均単価実績`,
    },
    newUnitPrice: {
      value: options.newUnitPrice,
      unit: '円',
      sourceMemo: `${options.memoPrefix}・新規事業対象製品の想定ロット単価`,
    },
    newCustomerCountY1: {
      value: options.countY1,
      unit: '件/年',
      sourceMemo: '初年度：既存顧客横展開および初期引き合い分',
    },
    newCustomerCountY2: {
      value: options.countY2,
      unit: '件/年',
      sourceMemo: '2年目：展示会・OEM供給の本格稼働分',
    },
    newCustomerCountY3: {
      value: options.countY3,
      unit: '件/年',
      sourceMemo: '3年目：通期安定稼働時の年間受注件数目標',
    },
    repeatRate: {
      value: options.repeatRate,
      unit: '%',
      sourceMemo: '年間継続取引・定期発注想定比率',
    },
    reducedWorkHours: {
      value: options.reducedHours,
      unit: '時間/年',
      sourceMemo: '手作業・段取り・検品自動化による年間削減工数試算',
    },
    hourlyWage: {
      value: options.hourlyWage,
      unit: '円/時',
      sourceMemo: '現場担当者の平均時間単価（法定福利費除く）',
    },
    subcontractReduction: {
      value: options.subcontractRed,
      unit: '万円/年',
      sourceMemo: '外部委託・廃棄ロス・外注費の直接削減見込額',
    },
    defectRate: {
      current: options.defectCurr,
      target: options.defectTarget,
      unit: '%',
      sourceMemo: '自動化導入前後の工程内不良・ロス率比較',
    },
    leadTime: {
      current: options.ltCurr,
      target: options.ltTarget,
      unit: '日',
      sourceMemo: '受注から出荷可能までの標準リードタイム短縮目標',
    },
    productionCapacity: {
      current: options.capCurr,
      target: options.capTarget,
      unit: '個/月',
      sourceMemo: '対象ラインの月間最大処理・製造数量',
    },
    newHiresY1: {
      value: options.hiresY1,
      unit: '名',
      sourceMemo: '1年目 新規採用計画',
    },
    newHiresY2: {
      value: options.hiresY2,
      unit: '名',
      sourceMemo: '2年目 新規採用計画',
    },
    newHiresY3: {
      value: options.hiresY3,
      unit: '名',
      sourceMemo: '3年目 新規採用計画',
    },
    plannedWageGrowthRate: {
      value: options.wageGrowth,
      unit: '%/年',
      sourceMemo: '一人当たり給与支給総額の年平均引上げ目標率',
    },
  };
}

export function createStandardGates(
  passedGateNumbers: number[],
  timestamps?: Partial<Record<'gate-1' | 'gate-2' | 'gate-3' | 'gate-4', string>>
): PhaseGate[] {
  return [
    {
      id: 'gate-1',
      number: 1,
      title: 'Gate 1: 定性マスター確定',
      description: 'ヒアリング議事録の構造化と親マスター全項目の確定',
      isPassed: passedGateNumbers.includes(1),
      passedAt: timestamps?.['gate-1'],
    },
    {
      id: 'gate-2',
      number: 2,
      title: 'Gate 2: 収支計画・要件確定',
      description: '将来3ヶ年収支・減価償却・公募要件クリアの確認と数値ロック',
      isPassed: passedGateNumbers.includes(2),
      passedAt: timestamps?.['gate-2'],
    },
    {
      id: 'gate-3',
      number: 3,
      title: 'Gate 3: 定性・定量 整合性クリア',
      description: '申請書本文と収支計画マスターの数値完全一致・AI監査通過',
      isPassed: passedGateNumbers.includes(3),
      passedAt: timestamps?.['gate-3'],
    },
    {
      id: 'gate-4',
      number: 4,
      title: 'Gate 4: 顧客最終承認・電子申請完了',
      description: '見積書・GビズID確認・jGrants/電子申請提出完了',
      isPassed: passedGateNumbers.includes(4),
      passedAt: timestamps?.['gate-4'],
    },
  ];
}

export function createStandardScheduleTasks(
  stage: 'unstarted' | 'hearing' | 'financial_review' | 'drafting' | 'review'
): GanttTask[] {
  const statusByStage = (
    taskIndex: number
  ): 'not_started' | 'in_progress' | 'completed' => {
    if (stage === 'unstarted') {
      return taskIndex === 0 ? 'in_progress' : 'not_started';
    }
    if (stage === 'hearing') {
      if (taskIndex === 0) return 'completed';
      if (taskIndex === 1) return 'in_progress';
      return 'not_started';
    }
    if (stage === 'financial_review') {
      if (taskIndex <= 4) return 'completed';
      if (taskIndex === 5) return 'in_progress';
      return 'not_started';
    }
    if (stage === 'drafting') {
      if (taskIndex <= 5) return 'completed';
      if (taskIndex === 6) return 'in_progress';
      return 'not_started';
    }
    if (taskIndex <= 6) return 'completed';
    if (taskIndex === 7) return 'in_progress';
    return 'not_started';
  };

  const baseTasks: Omit<GanttTask, 'status'>[] = [
    {
      id: 'task-1',
      title: '決算書3期分・設備相見積書・会社案内データの提出',
      category: 'client',
      startWeek: 1,
      endWeek: 1,
    },
    {
      id: 'task-2',
      title: '初回ヒアリング実施・議事録作成・課題整理',
      category: 'support',
      startWeek: 1,
      endWeek: 2,
    },
    {
      id: 'task-3',
      title: '定性マスターシート生成・確定（★Gate 1）',
      category: 'support',
      startWeek: 2,
      endWeek: 2,
      isGate: true,
      gateId: 'gate-1',
    },
    {
      id: 'task-4',
      title: '収支計画マスター策定・減価償却＆要件シミュレーション',
      category: 'support',
      startWeek: 2,
      endWeek: 3,
    },
    {
      id: 'task-5',
      title: '資金調達前提（自己資金・金融機関借入枠）の確認',
      category: 'client',
      startWeek: 3,
      endWeek: 3,
    },
    {
      id: 'task-6',
      title: '顧客・支援合同 収支計画レビュー・数値確定（★Gate 2）',
      category: 'client',
      startWeek: 3,
      endWeek: 3,
      isGate: true,
      gateId: 'gate-2',
    },
    {
      id: 'task-7',
      title: '3補助金別 申請書ドラフト執筆・文章モジュール展開',
      category: 'support',
      startWeek: 4,
      endWeek: 5,
    },
    {
      id: 'task-8',
      title: '定性・定量 整合性クロスチェック実施（★Gate 3）',
      category: 'support',
      startWeek: 6,
      endWeek: 6,
      isGate: true,
      gateId: 'gate-3',
    },
    {
      id: 'task-9',
      title: '申請書最終ドラフト顧客確認・GビズID／添付書類準備',
      category: 'client',
      startWeek: 7,
      endWeek: 7,
    },
    {
      id: 'task-10',
      title: '電子申請（jGrants / Jグランツ等）本提出完了（★Gate 4）',
      category: 'support',
      startWeek: 8,
      endWeek: 8,
      isGate: true,
      gateId: 'gate-4',
    },
  ];

  return baseTasks.map((t, idx) => ({
    ...t,
    status: statusByStage(idx),
  }));
}

export const DEFAULT_SPECIAL_FLAGS: SubsidySpecialFlags = {
  shinJigyoWageSpecial: false,
  shinJigyoMinWageSpecial: false,
  jizokukaInvoiceSpecial: false,
  jizokukaWageSpecial: false,
  jizokukaDeficit: false,
};

/**
 * M8対応: テックプレシジョンの財務マスター
 * - 売上(2.8億→3.6億/+8,000万)、営業利益率(2.1%→8.5%)、投資額(4,200万=3,800+400)、申請額(2,100万=1/2)、回収年数(3.2年/CF1,310万)を完全維持
 * - 一人当たり給与支給総額を直前期480万円(7,200万/15名)→3年目540万円(9,180万/17名、年率+4.00% >= 3.5%)へ最小限調整し現行公募回の全要件を達成
 */
export function createTechPrecisionFinancialMaster(): FinancialMaster {
  return {
    status: 'draft', // 初期状態ではGate 2未確定（ワンクリック＆ツアーでGate 2確定を体験可能）
    specialFlags: {
      shinJigyoWageSpecial: false,
      shinJigyoMinWageSpecial: false,
      jizokukaInvoiceSpecial: false,
      jizokukaWageSpecial: true, // 持続化：賃金引上げ特例（+150万円→上限200万円）
      jizokukaDeficit: false,
    },
    historical: {
      yMinus3: recalculateYearData({
        sales: 29200,
        costOfSales: 20180,
        sga: 8200,
        laborCost: 8000,
        depreciation: 1200,
        ordinaryProfit: 790,
        netProfit: 520,
        employees: 15,
        totalWages: 7000,
      }),
      yMinus2: recalculateYearData({
        sales: 28500,
        costOfSales: 19820,
        sga: 8000,
        laborCost: 8200,
        depreciation: 1200,
        ordinaryProfit: 650,
        netProfit: 440,
        employees: 15,
        totalWages: 7100,
      }),
      yMinus1: recalculateYearData({
        sales: 28000,
        costOfSales: 19600,
        sga: 7812,
        laborCost: 8400,
        depreciation: 1200,
        ordinaryProfit: 560,
        netProfit: 380,
        employees: 15,
        totalWages: 7200, // 一人当たり 480.0万円
      }),
    },
    forecast: {
      y1: recalculateYearData({
        sales: 30500,
        costOfSales: 20700,
        sga: 8600,
        laborCost: 9200,
        depreciation: 1800, // 既存1,200 + 新規600
        ordinaryProfit: 1150,
        netProfit: 720,
        employees: 16,
        totalWages: 8000, // 一人当たり 500.0万円
      }),
      y2: recalculateYearData({
        sales: 33000,
        costOfSales: 22000,
        sga: 8900,
        laborCost: 9600,
        depreciation: 1800,
        ordinaryProfit: 2040,
        netProfit: 1090,
        employees: 16,
        totalWages: 8320, // 一人当たり 520.0万円
      }),
      y3: recalculateYearData({
        sales: 36000,
        costOfSales: 23640,
        sga: 9300,
        laborCost: 10500,
        depreciation: 1800,
        ordinaryProfit: 2980,
        netProfit: 1460,
        employees: 17,
        totalWages: 9180, // 一人当たり 540.0万円（年平均成長率 +4.00% >= 3.5%）
      }),
    },
    investment: {
      machineryCost: 3800,
      systemCost: 400,
      subcontractCost: 0,
      otherCost: 0,
      totalInvestment: 4200,
      subsidyRequested: 2100, // 補助率1/2 = 2,100万円（下限750万〜上限2,500万の範囲内）
      ownFunds: 1100,
      bankLoan: 1000,
      depreciationMethod: 'straight-line',
      usefulLifeYears: 7,
    },
  };
}

export function createGenericFinancialMaster(options: {
  baseSales: number;
  y3SalesIncrease: number;
  machineryCost: number;
  systemCost: number;
  subsidyRequested: number;
  employees: number;
  locked: boolean;
  lockedAt?: string;
  perCapitaWageAnnualGrowth?: number; // デフォルト 0.038 (3.8%/年)
  specialFlags?: Partial<SubsidySpecialFlags>;
  sgaRatioY3?: number;
}): FinancialMaster {
  const {
    baseSales,
    y3SalesIncrease,
    machineryCost,
    systemCost,
    subsidyRequested,
    employees,
    locked,
    lockedAt,
    perCapitaWageAnnualGrowth = 0.038,
    specialFlags,
    sgaRatioY3 = 0.278,
  } = options;
  const totalInv = machineryCost + systemCost;
  const ownFunds = Math.round((totalInv - subsidyRequested) * 0.5);
  const bankLoan = Math.max(0, totalInv - subsidyRequested - ownFunds);
  const newDep = Math.round(totalInv / 7);
  const baseDep = Math.round(baseSales * 0.04);
  const basePerCapita = 450;
  const baseWages = employees * basePerCapita;

  const empY1 = employees + 1;
  const empY2 = employees + 1;
  const empY3 = employees + 2;

  const wagesY1 = Math.round(
    empY1 * basePerCapita * Math.pow(1 + perCapitaWageAnnualGrowth, 1)
  );
  const wagesY2 = Math.round(
    empY2 * basePerCapita * Math.pow(1 + perCapitaWageAnnualGrowth, 2)
  );
  const wagesY3 = Math.round(
    empY3 * basePerCapita * Math.pow(1 + perCapitaWageAnnualGrowth, 3)
  );

  return {
    status: locked ? 'locked' : 'draft',
    lockedAt,
    specialFlags: {
      ...DEFAULT_SPECIAL_FLAGS,
      ...specialFlags,
    },
    historical: {
      yMinus3: recalculateYearData({
        sales: Math.round(baseSales * 1.03),
        costOfSales: Math.round(baseSales * 0.71),
        sga: Math.round(baseSales * 0.29),
        laborCost: Math.round(baseWages * 1.12),
        depreciation: baseDep,
        ordinaryProfit: Math.round(baseSales * 0.028),
        netProfit: Math.round(baseSales * 0.018),
        employees,
        totalWages: Math.round(baseWages * 0.97),
      }),
      yMinus2: recalculateYearData({
        sales: Math.round(baseSales * 1.01),
        costOfSales: Math.round(baseSales * 0.7),
        sga: Math.round(baseSales * 0.285),
        laborCost: Math.round(baseWages * 1.13),
        depreciation: baseDep,
        ordinaryProfit: Math.round(baseSales * 0.024),
        netProfit: Math.round(baseSales * 0.016),
        employees,
        totalWages: Math.round(baseWages * 0.99),
      }),
      yMinus1: recalculateYearData({
        sales: baseSales,
        costOfSales: Math.round(baseSales * 0.7),
        sga: Math.round(baseSales * 0.275),
        laborCost: Math.round(baseWages * 1.15),
        depreciation: baseDep,
        ordinaryProfit: Math.round(baseSales * 0.023),
        netProfit: Math.round(baseSales * 0.015),
        employees,
        totalWages: baseWages,
      }),
    },
    forecast: {
      y1: recalculateYearData({
        sales: Math.round(baseSales + y3SalesIncrease * 0.35),
        costOfSales: Math.round((baseSales + y3SalesIncrease * 0.35) * 0.67),
        sga: Math.round((baseSales + y3SalesIncrease * 0.35) * 0.28),
        laborCost: Math.round(wagesY1 * 1.15),
        depreciation: baseDep + newDep,
        ordinaryProfit: Math.round((baseSales + y3SalesIncrease * 0.35) * 0.048),
        netProfit: Math.round((baseSales + y3SalesIncrease * 0.35) * 0.032),
        employees: empY1,
        totalWages: wagesY1,
      }),
      y2: recalculateYearData({
        sales: Math.round(baseSales + y3SalesIncrease * 0.7),
        costOfSales: Math.round((baseSales + y3SalesIncrease * 0.7) * 0.65),
        sga: Math.round((baseSales + y3SalesIncrease * 0.7) * 0.28),
        laborCost: Math.round(wagesY2 * 1.15),
        depreciation: baseDep + newDep,
        ordinaryProfit: Math.round((baseSales + y3SalesIncrease * 0.7) * 0.068),
        netProfit: Math.round((baseSales + y3SalesIncrease * 0.7) * 0.045),
        employees: empY2,
        totalWages: wagesY2,
      }),
      y3: recalculateYearData({
        sales: baseSales + y3SalesIncrease,
        costOfSales: Math.round((baseSales + y3SalesIncrease) * 0.64),
        sga: Math.round((baseSales + y3SalesIncrease) * sgaRatioY3),
        laborCost: Math.round(wagesY3 * 1.15),
        depreciation: baseDep + newDep,
        ordinaryProfit: Math.round((baseSales + y3SalesIncrease) * 0.08),
        netProfit: Math.round((baseSales + y3SalesIncrease) * 0.054),
        employees: empY3,
        totalWages: wagesY3,
      }),
    },
    investment: {
      machineryCost,
      systemCost,
      subcontractCost: 0,
      otherCost: 0,
      totalInvestment: totalInv,
      subsidyRequested,
      ownFunds,
      bankLoan,
      depreciationMethod: 'straight-line',
      usefulLifeYears: 7,
    },
  };
}

export function createTechPrecisionSubsidies(): Record<
  SubsidyType,
  SubsidyDocument
> {
  const shinJigyo500_1 =
    '当社は東京都大田区にて創業35年の実績を有する精密金属加工企業（従業員15名、年商2.8億円）である。チタンやインコネル等の難削材に対するミクロン単位の超精密切削加工技術を中核に、大田区内の高度な協力工場ネットワークを活かした短納期対応体制（業界標準比30%短縮）を最大の競合優位性としている。一方、主力である自動車内燃機関向け試作部品市場はEVシフトに伴う構造的な需要縮小に直面しており、直近の営業利益率は2.1%まで低下している。また既存の3軸加工機では複雑立体形状の同時加工が行えず、特殊工程の外注依存による原価高騰と納期長期化が深刻な経営課題となっている。こうした経営環境を打開するため、既に大手取引先から具体的な試作・量産打診を獲得している高成長領域の「EVバッテリー冷却部品」および「医療機器用内視鏡精密パーツ」の量産受託事業へ本格進出する。';
  const shinJigyo200_1 =
    '大田区で創業35年の精密金属加工業（従業員15名）。難削材のミクロン単位切削と業界比30%短縮の短納期対応が強みだが、内燃機関向け試作需要の減少により営業利益率が2.1%へ低下。既存3軸機による外注依存と納期課題を解消し、EV冷却部品・医療内視鏡パーツ分野への新事業進出を図る。';

  const shinJigyo500_2 =
    '新事業における複雑微細形状の高精度量産を実現するため、DMG森精機製の最新鋭5軸マシニングセンタ（本体約3,800万円）および同時5軸制御対応の高精度CAD/CAMソフトウェア（400万円）、総額4,200万円の設備投資を実施する。従来は3軸加工機での複数回にわたる段取り替えと外部専門業者への二次加工委託を要していたが、本設備の導入によりワンチャッキングでの多面・同時5軸連続加工体制が確立される。これにより段取り誤差に起因する不良率を極小化するとともに、これまで外注に依存していたアンダーカット形状や曲面流路加工の完全内製化を実現し、EV・医療機器メーカーが求める厳格な品質基準と量産供給責任を同時に満たす社内一貫生産体制を構築する。';
  const shinJigyo200_2 =
    'DMG森精機製5軸マシニングセンタ（3,800万円）と高精度CAD/CAM（400万円）の計4,200万円を導入。従来の複数段取りと外注工程をワンチャッキング連続加工へ集約・内製化し、EV冷却流路や医療用微細立体部品の高精度量産体制を確立する。';

  const shinJigyo500_3 =
    '本設備投資による工程集約と内製化により、製造リードタイムを従来の14日間から4日間へと70%短縮し、年間1,200万円にのぼる外注加工費を直接削減する。さらに短納期・高品質な5軸量産体制を武器に既存取引先からの打診案件を確実に受注転換し、事業化3年後には新規事業売上高8,000万円の積み増し（全社売上高2.8億円から3.6億円への拡大）および全社営業利益率8.5%（現状2.1%から+6.4ポイント改善）を達成する計画である。創出される営業キャッシュフローにより設備投資額の着実な回収を図るとともに、専門技術人材の採用・雇用拡大と計画的な賃上げ（給与引き上げ）を推進し、自動車内燃機関依存から脱却した高収益な次世代成長基盤を確立する。';
  const shinJigyo200_3 =
    '工程集約によりリードタイムを14日から4日へ70%短縮し、外注費を年間1,200万円削減する。EV・医療分野の新規受注獲得により、導入3年後に売上高8,000万円増加、営業利益率2.1%から8.5%への大幅な収益改善を達成する。';

  const jizokuka200_1 =
    '大田区で創業35年の精密金属加工業（従業員15名）。チタン・インコネル等の難削材におけるミクロン単位の精密切削ノウハウと、地域専門工場との連携による短納期対応力（業界標準比30%短縮）が最大の強みであり、大手メーカー試作開発部門から高い信頼を得ている。';
  const jizokuka500_1 =
    '当社は大田区にて創業35年を数える従業員15名の精密金属加工事業者である。チタンやインコネルといった高硬度・難削材に対するミクロン単位の精密切削ノウハウを長年蓄積しており、大田区内の熱処理・表面処理ネットワークと連携した一気通貫の短納期対応（他社標準比30%短縮）を最大の強みとしている。近年は既存の内燃機関向け試作部品需要が減少傾向にあるものの、当社の難削材加工技術に対するEV関連・医療機器メーカーからの評価は高く、自社の技術的強みを成長市場の量産・高付加価値案件へ展開する好機にある。';

  const jizokuka200_2 =
    'EV冷却部品・医療用内視鏡パーツの販路開拓に向け、5軸マシニングセンタ（3,800万円）とCAD/CAM（400万円）計4,200万円を導入して複雑微細サンプルを内製化する。技術提案書とWeb特設ページ刷新、専門展示会出展を実施し新規顧客を獲得する。';
  const jizokuka500_2 =
    '成長市場であるEVバッテリー冷却部品および医療機器用内視鏡精密パーツへの本格的な販路開拓を推進するため、最新鋭5軸マシニングセンタ（3,800万円）とCAD/CAMシステム（400万円）の計4,200万円を導入し、従来の3軸機では対応困難であった複雑曲面・微細形状のデモンストレーションサンプルを自社内製により製作する。この高精度サンプルを核として、難削材×同時5軸加工の技術力を訴求する専門カタログ・Web特設ページを整備し、医療機器・次世代モビリティ分野の専門商談展示会へ出展することで、設計開発部門からの直接受注ルートを開拓する。';

  const jizokuka200_3 =
    'ワンチャッキング加工の実現でリードタイムを14日から4日へ70%短縮し、即納体制を確立する。外注費年1,200万円の削減と展示会・打診案件からの新規成約により、3年後に売上高8,000万円増・営業利益率8.5%への収益向上を実現する。';
  const jizokuka500_3 =
    '5軸加工の内製化による工程集約により、見積回答から試作・量産納入までの製造リードタイムを従来の14日間から4日間へと70%短縮し、競合他社に対して圧倒的な即納優位性を確立する。これにより外注加工費を年間1,200万円削減して価格競争力と粗利率を同時に引き上げるとともに、既に打診を受けているEV・医療関連取引先からの本受注化および新規引き合い獲得を推進し、導入3年後には売上高8,000万円の拡大と営業利益率8.5%の達成を見込む。';

  const tokyoCustom_1 =
    '当社は大田区で35年にわたり精密金属加工を担い、都内製造業サプライチェーンの一翼を支えてきた（従業員15名）。しかし主力の内燃機関向け自動車試作需要の構造的減少により営業利益率は2.1%まで低下している。また既存の3軸加工機では複雑立体形状の一貫加工ができず、都外を含む外注加工への依存から納期遅延リスクとコスト高止まりが生じている。大田区の高度なモノづくり基盤を維持・発展させるため、5軸加工への高度化による事業構造転換が不可欠である。';
  const tokyo200_1 =
    '大田区で35年続く精密金属加工業（従業員15名）として地域基盤を支えるが、内燃機関向け需要減で営業利益率が2.1%に低下。既存3軸機の外注依存と納期課題を解消し、5軸高度化による都内生産基盤の維持・強化が急務である。';
  const tokyo500_1 =
    '当社は東京都大田区において創業35年の実績を持つ精密金属加工事業者（従業員15名、年商2.8億円）であり、チタン・インコネル等の難削材切削と地域連携による短納期供給（他社比30%短縮）によって都内製造業の試作・開発基盤を支えてきた。しかしながら自動車産業のEVシフトに伴う内燃機関部品の需要減退により、直近の営業利益率は2.1%と低迷している。さらに既存の3軸加工機ではEV・医療分野で求められる複雑立体微細形状の同時加工が不可能であり、特殊工程の外注依存による年間1,200万円の外部流出とリードタイム長期化（14日間）が経営基盤上の重大なボトルネックとなっている。';

  const tokyoCustom_2 =
    '大田区本社工場内にDMG森精機製5軸マシニングセンタ（本体価格約3,800万円）1台および高精度CAD/CAMソフトウェア（400万円）の計4,200万円を導入する。既存工場の床耐荷重・電源容量および搬入動線は事前調査済みであり即時稼働が可能である。複数商社からの相見積取得により市場価格に対する経費妥当性を検証済みであり、従来の複数工程・外注委託をワンチャッキング連続加工へ集約する上で必要不可欠な最新設備仕様を選定している。';
  const tokyo200_2 =
    '大田区本社工場にDMG森精機製5軸マシニングセンタ（3,800万円）と高精度CAD/CAM（400万円）の計4,200万円を導入。設置環境と相見積による価格妥当性を確認済みであり、工程集約による内製化を確実に実現する計画である。';
  const tokyo500_2 =
    '都内本社工場（大田区）の生産高度化に向け、DMG森精機製の最新鋭5軸マシニングセンタ（本体約3,800万円）および同時5軸制御用CAD/CAMソフトウェア（400万円）、総額4,200万円を導入する。選定機種はチタン・インコネル等の難削材における高剛性・熱変位制御に優れ、省スペース設計のため大田区内の限られた工場床面積にも既存レイアウト変更のみで設置可能である。導入経費については複数商社からの相見積取得により仕様・価格双方の妥当性を精査済みであり、外注工程の完全内製化とワンチャッキング加工体制の構築に直結する投資計画となっている。';

  const tokyoCustom_3 =
    '本事業により製造リードタイムを14日から4日へ70%短縮し、外注加工費を年間1,200万円削減して付加価値額の社内留保を高める。EVバッテリー冷却部品や医療機器用内視鏡パーツの高難度加工を都内工場で完結させ、周辺協力企業への受注波及を通じて地域サプライチェーンの高度化に貢献し、3年後に売上高8,000万円増・営業利益率8.5%への経営基盤強化を達成する。';
  const tokyo200_3 =
    'リードタイム70%短縮と外注費年1,200万円削減を達成し、都内工場での高付加価値内製体制を確立。地域サプライチェーン強化に貢献しつつ、3年後に売上+8,000万円・営業利益率8.5%を実現する。';
  const tokyo500_3 =
    '本設備導入により、加工リードタイムを従来の14日間から4日間へと70%短縮するとともに、外部流出していた外注加工費を年間1,200万円削減し、都内事業所における付加価値額および労働生産性を大幅に向上させる。さらに大田区内の表面処理・検査工程を担う協力企業群とも新分野（EVバッテリー冷却部品・医療用内視鏡精密パーツ）の受注を共有することで地域サプライチェーン全体の活性化に寄与する。設備稼働後3年で売上高8,000万円の増加、営業利益率8.5%への改善を達成し、盤石な経営基盤と雇用維持・技術承継体制を確立する。';

  return {
    新事業進出補助金: {
      subsidyType: '新事業進出補助金',
      status: '下書き',
      lastSavedAt: '2026-10-20 16:40',
      sections: [
        {
          id: 'shin-1',
          title: '1. 企業概要・経営環境',
          sourceMasterIds: ['master-1', 'master-2'],
          sourceMasterLabel: 'マスター① 企業概要・強み ＋ マスター② 現状の経営課題・背景',
          text200: shinJigyo200_1,
          text500: shinJigyo500_1,
          customText: shinJigyo500_1,
          selectedLength: '500',
          currentText: shinJigyo500_1,
          aiBaselineText: shinJigyo500_1,
          isModified: false,
        },
        {
          id: 'shin-2',
          title: '2. 事業化に向けた詳細',
          sourceMasterIds: ['master-3'],
          sourceMasterLabel: 'マスター③ 導入設備/システムの詳細と具体的な取り組み',
          text200: shinJigyo200_2,
          text500: shinJigyo500_2,
          customText: shinJigyo500_2,
          selectedLength: '500',
          currentText: shinJigyo500_2,
          aiBaselineText: shinJigyo500_2,
          isModified: false,
        },
        {
          id: 'shin-3',
          title: '3. 将来の数値目標・収益計画',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 期待される定性・定量効果（数値計画）',
          text200: shinJigyo200_3,
          text500: shinJigyo500_3,
          customText: shinJigyo500_3,
          selectedLength: '500',
          currentText: shinJigyo500_3,
          aiBaselineText: shinJigyo500_3,
          isModified: false,
        },
      ],
    },
    小規模事業者持続化補助金: {
      subsidyType: '小規模事業者持続化補助金',
      status: '下書き',
      lastSavedAt: '2026-10-20 16:40',
      sections: [
        {
          id: 'jizo-1',
          title: '1. 企業概要・自社の強み',
          sourceMasterIds: ['master-1'],
          sourceMasterLabel: 'マスター① 企業概要・強み・競合優位性（要約抽出）',
          text200: jizokuka200_1,
          text500: jizokuka500_1,
          customText: jizokuka200_1,
          selectedLength: '200',
          currentText: jizokuka200_1,
          aiBaselineText: jizokuka200_1,
          isModified: false,
        },
        {
          id: 'jizo-2',
          title: '2. 今回の取り組み内容',
          sourceMasterIds: ['master-2', 'master-3'],
          sourceMasterLabel: 'マスター② 課題背景 ＋ マスター③ 導入設備と販路開拓展開',
          text200: jizokuka200_2,
          text500: jizokuka500_2,
          customText: jizokuka200_2,
          selectedLength: '200',
          currentText: jizokuka200_2,
          aiBaselineText: jizokuka200_2,
          isModified: false,
        },
        {
          id: 'jizo-3',
          title: '3. 業務効率化・売上拡大効果',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 期待される定性・定量効果（即納・売上効果）',
          text200: jizokuka200_3,
          text500: jizokuka500_3,
          customText: jizokuka200_3,
          selectedLength: '200',
          currentText: jizokuka200_3,
          aiBaselineText: jizokuka200_3,
          isModified: false,
        },
      ],
    },
    東京都経営強化基盤事業: {
      subsidyType: '東京都経営強化基盤事業',
      status: '修正中',
      lastSavedAt: '2026-10-21 10:15',
      sections: [
        {
          id: 'tokyo-1',
          title: '1. 事業の現状と課題',
          sourceMasterIds: ['master-1', 'master-2'],
          sourceMasterLabel: 'マスター① 都内基盤強み ＋ マスター② 3軸機の課題と背景',
          text200: tokyo200_1,
          text500: tokyo500_1,
          customText: tokyoCustom_1,
          selectedLength: 'custom',
          currentText: tokyoCustom_1,
          aiBaselineText: tokyoCustom_1,
          isModified: false,
        },
        {
          id: 'tokyo-2',
          title: '2. 設備導入計画',
          sourceMasterIds: ['master-3'],
          sourceMasterLabel: 'マスター③ 導入設備仕様・設置妥当性・見積根拠',
          text200: tokyo200_2,
          text500: tokyo500_2,
          customText: tokyoCustom_2,
          selectedLength: 'custom',
          currentText: tokyoCustom_2,
          aiBaselineText: tokyoCustom_2,
          isModified: false,
        },
        {
          id: 'tokyo-3',
          title: '3. 経営基盤強化の成果目標',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 都内サプライチェーン貢献・外注費削減目標',
          text200: tokyo200_3,
          text500: tokyo500_3,
          customText: tokyoCustom_3,
          selectedLength: 'custom',
          currentText: tokyoCustom_3,
          aiBaselineText: tokyoCustom_3,
          isModified: false,
        },
      ],
    },
  };
}

function createGenericSubsidies(
  companyName: string,
  industry: string,
  statuses: [
    SubsidyDocument['status'],
    SubsidyDocument['status'],
    SubsidyDocument['status'],
  ],
  populated: boolean,
  numbers?: {
    employees: number;
    machinery: number;
    system: number;
    salesDelta: number;
    y3Margin: string;
    leadTime: string;
  }
): Record<SubsidyType, SubsidyDocument> {
  const emptyOrText = (shortText: string, longText: string, tokyoText?: string) => ({
    t200: populated ? shortText : '',
    t500: populated ? longText : '',
    tCustom: populated ? (tokyoText ?? shortText) : '',
  });

  const totalInv = numbers ? numbers.machinery + numbers.system : 3000;
  const emp = numbers?.employees ?? 20;
  const salesDelta = numbers?.salesDelta ?? 5500;
  const margin = numbers?.y3Margin ?? '8.2%';
  const lt = numbers?.leadTime ?? '65%短縮';

  const s1 = emptyOrText(
    `${companyName}（${industry}、従業員${emp}名）は地域の中核企業として高い専門ノウハウと長年の実績・顧客信頼を強みとするが、人手不足と既存工程の非効率により収益改善と新分野開拓が急務である。`,
    `${companyName}（従業員${emp}名）は東京都内の${industry}において長年の実績と安定した取引基盤を有し、専門ノウハウに基づくきめ細かな品質管理体制を最大の強み・競合優位性としている。しかし近年は原材料・エネルギー価格の高騰および熟練人材の高齢化に伴い、手作業や旧式設備に依存した従来工程では営業利益率の維持が困難な経営課題に直面している。持続的成長を実現するため、需要拡大が見込まれる成長市場への新事業進出と抜本的な生産性改革が不可欠である。`,
    `${companyName}（従業員${emp}名）は都内${industry}の中核として実績と専門技術強みを有するが、旧式設備と手作業のボトルネックによるコスト増で利益率が低迷している。都内事業基盤を維持・強化するため、高付加価値分野への展開と生産工程の刷新が急務の課題である。`
  );
  const s2 = emptyOrText(
    `自動化設備（${(numbers?.machinery ?? 2500).toLocaleString()}万円）とシステム（${(numbers?.system ?? 500).toLocaleString()}万円）計${totalInv.toLocaleString()}万円を導入しサンプル試作を内製化。専門展示会出展とWeb広報で新規顧客の販路を開拓する。`,
    `既存のボトルネック工程を抜本的に解消するため、最新鋭の専用自動化機器（${(numbers?.machinery ?? 2500).toLocaleString()}万円）およびデジタル工程管理システム（${(numbers?.system ?? 500).toLocaleString()}万円）、総額${totalInv.toLocaleString()}万円を一貫導入する。従来は熟練担当者の属人的な判断と手作業に頼っていた検査・加工・データ連携プロセスを自動化・内製化し、不良率の大幅低減と高付加価値OEM・新規市場ニーズに応える社内一貫供給体制を確立する。`,
    `都内事業所へ自動化設備（${(numbers?.machinery ?? 2500).toLocaleString()}万円）および管理システム（${(numbers?.system ?? 500).toLocaleString()}万円）の総額${totalInv.toLocaleString()}万円を導入する。設置スペース・電源容量は事前確認済みであり、複数社相見積の取得によって仕様および導入価格の妥当性を厳格に検証済みである。これにより手作業ボトルネックを内製化・標準化する。`
  );
  const s3 = emptyOrText(
    `工程時間を${lt}しコストを大幅削減。展示会・Web経由の新規取引獲得により導入3年後に売上高${salesDelta.toLocaleString()}万円増加、営業利益率${margin}への利益改善を達成する。`,
    `本設備の本稼働により対象工程時間を${lt}し、受注から納品までのリードタイム短縮と外注・ロス費用の大幅削減を実現する。高付加価値案件の受注拡大により、事業終了後3年で売上高${salesDelta.toLocaleString()}万円の増加および営業利益率${margin}への改善を達成する計画である。創出されるキャッシュフローにより着実な投資回収を図るとともに、専門人材の雇用創出と計画的な給与引き上げ（賃上げ）を継続実施する。`,
    `対象工程時間を${lt}してコスト流出を削減し、都内事業所での高付加価値な内製化体制を確立する。都内周辺協力企業への受注波及を通じて地域サプライチェーンの基盤強化に貢献しつつ、3年後に売上高${salesDelta.toLocaleString()}万円増加・営業利益率${margin}への改善と従業員の雇用・賃上げを実現する。`
  );

  return {
    新事業進出補助金: {
      subsidyType: '新事業進出補助金',
      status: statuses[0],
      sections: [
        {
          id: 'shin-1',
          title: '1. 企業概要・経営環境',
          sourceMasterIds: ['master-1', 'master-2'],
          sourceMasterLabel: 'マスター① 企業概要・強み ＋ マスター② 現状の経営課題・背景',
          text200: s1.t200,
          text500: s1.t500,
          customText: s1.t500,
          selectedLength: '500',
          currentText: s1.t500,
          aiBaselineText: s1.t500,
          isModified: false,
        },
        {
          id: 'shin-2',
          title: '2. 事業化に向けた詳細',
          sourceMasterIds: ['master-3'],
          sourceMasterLabel: 'マスター③ 導入設備/システムの詳細と具体的な取り組み',
          text200: s2.t200,
          text500: s2.t500,
          customText: s2.t500,
          selectedLength: '500',
          currentText: s2.t500,
          aiBaselineText: s2.t500,
          isModified: false,
        },
        {
          id: 'shin-3',
          title: '3. 将来の数値目標・収益計画',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 期待される定性・定量効果（数値計画）',
          text200: s3.t200,
          text500: s3.t500,
          customText: s3.t500,
          selectedLength: '500',
          currentText: s3.t500,
          aiBaselineText: s3.t500,
          isModified: false,
        },
      ],
    },
    小規模事業者持続化補助金: {
      subsidyType: '小規模事業者持続化補助金',
      status: statuses[1],
      sections: [
        {
          id: 'jizo-1',
          title: '1. 企業概要・自社の強み',
          sourceMasterIds: ['master-1'],
          sourceMasterLabel: 'マスター① 企業概要・強み・競合優位性（要約抽出）',
          text200: s1.t200,
          text500: s1.t500,
          customText: s1.t200,
          selectedLength: '200',
          currentText: s1.t200,
          aiBaselineText: s1.t200,
          isModified: false,
        },
        {
          id: 'jizo-2',
          title: '2. 今回の取り組み内容',
          sourceMasterIds: ['master-2', 'master-3'],
          sourceMasterLabel: 'マスター② 課題背景 ＋ マスター③ 導入設備と販路開拓展開',
          text200: s2.t200,
          text500: s2.t500,
          customText: s2.t200,
          selectedLength: '200',
          currentText: s2.t200,
          aiBaselineText: s2.t200,
          isModified: false,
        },
        {
          id: 'jizo-3',
          title: '3. 業務効率化・売上拡大効果',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 期待される定性・定量効果（即納・売上効果）',
          text200: s3.t200,
          text500: s3.t500,
          customText: s3.t200,
          selectedLength: '200',
          currentText: s3.t200,
          aiBaselineText: s3.t200,
          isModified: false,
        },
      ],
    },
    東京都経営強化基盤事業: {
      subsidyType: '東京都経営強化基盤事業',
      status: statuses[2],
      sections: [
        {
          id: 'tokyo-1',
          title: '1. 事業の現状と課題',
          sourceMasterIds: ['master-1', 'master-2'],
          sourceMasterLabel: 'マスター① 都内基盤強み ＋ マスター② 課題と背景',
          text200: s1.t200,
          text500: s1.t500,
          customText: s1.tCustom,
          selectedLength: 'custom',
          currentText: s1.tCustom,
          aiBaselineText: s1.tCustom,
          isModified: false,
        },
        {
          id: 'tokyo-2',
          title: '2. 設備導入計画',
          sourceMasterIds: ['master-3'],
          sourceMasterLabel: 'マスター③ 導入設備仕様・設置妥当性・見積根拠',
          text200: s2.t200,
          text500: s2.t500,
          customText: s2.tCustom,
          selectedLength: 'custom',
          currentText: s2.tCustom,
          aiBaselineText: s2.tCustom,
          isModified: false,
        },
        {
          id: 'tokyo-3',
          title: '3. 経営基盤強化の成果目標',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 都内サプライチェーン貢献・削減目標',
          text200: s3.t200,
          text500: s3.t500,
          customText: s3.tCustom,
          selectedLength: 'custom',
          currentText: s3.tCustom,
          aiBaselineText: s3.tCustom,
          isModified: false,
        },
      ],
    },
  };
}

export function buildMasterItemsFromTemplates(
  templates: MasterSchemaTemplate[],
  presetMap?: Record<string, string>
): HearingMasterItem[] {
  return templates.map((tpl) => ({
    id: tpl.id,
    title: tpl.title,
    prompt: tpl.prompt,
    content: presetMap?.[tpl.id] ?? '',
  }));
}

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-tech-precision',
    code: 'AN-2026-041',
    companyName: '株式会社テックプレシジョン',
    industry: '精密金属加工業（東京都大田区）',
    salesRep: '田中 健太',
    writerName: '佐藤 美咲',
    deadline: '2026-11-30',
    applicationDeadline: '2026-11-30',
    targetAmount: '2,100万円',
    targetAmountManYen: 2100,
    status: '収支計画作成中',
    rawHearingText: SAMPLE_MEETING_MINUTES,
    hearingSourceNote: '2026/10/15 初回訪問ヒアリング議事録（田中）',
    masterItems: buildMasterItemsFromTemplates(
      INITIAL_MASTER_TEMPLATES,
      TECH_PRECISION_MASTER_PRESET
    ),
    hearingVariables: createTechPrecisionHearingVariables(),
    subsidies: createTechPrecisionSubsidies(),
    financialMaster: createTechPrecisionFinancialMaster(),
    gates: createStandardGates([1], { 'gate-1': '2026-10-18 15:20' }),
    scheduleTasks: createStandardScheduleTasks('financial_review'),
    manualChecks: {
      'mchk-quote': true,
      'mchk-minwage': true,
      'mchk-depreciation': true,
    },
    updatedAt: '2026-10-21 10:15',
  },
  {
    id: 'proj-edogawa-foods',
    code: 'AN-2026-038',
    companyName: '株式会社江戸川フーズラボ',
    industry: '業務用冷凍食品製造業（東京都江戸川区）',
    salesRep: '山本 浩二',
    writerName: '高橋 誠',
    deadline: '2026-11-12',
    applicationDeadline: '2026-11-12', // 申請締切14日以内（警告対象デモ案件）
    targetAmount: '3,000万円',
    targetAmountManYen: 3000,
    status: '社内レビュー中',
    rawHearingText: `【顧客名】株式会社江戸川フーズラボ\n【議事メモ】都内ホテル・外食向け冷凍調理品メーカー（社員24名）。急速凍結ラインの老朽化により電力費高騰・歩留まり低下が発生。液体急速凍結機（総額4,500万円）を導入し、高単価な介護食・病院食OEM市場へ新事業進出を図る。`,
    hearingSourceNote: 'Google Drive 共有フォルダより取得済',
    masterItems: buildMasterItemsFromTemplates(INITIAL_MASTER_TEMPLATES, {
      'master-1':
        '江戸川区で創業28年の業務用調理冷凍食品メーカー（従業員24名）。都内ホテル・飲食店向けの少量多品種レシピ開発力とHACCP準拠の衛生管理体制が強み。',
      'master-2':
        '旧式のエアブラスト凍結機による電力コスト増大と凍結ムラによる歩留まり低下が課題。成長市場である高齢者施設・病院向け嚥下調整冷凍食OEMへの進出を目指す。',
      'master-3':
        '高効率液体急速凍結システム（3,900万円）および自動真空包装ライン管理ソフト（600万円）の総投資額4,500万円を導入し、細胞破壊を抑えた高品質凍結と省人化を実現する。',
      'master-4':
        '凍結工程時間を65%短縮、年間電力費・廃棄ロスを計840万円削減。病院・介護施設向けOEM受注により3年後に売上高6,500万円増、営業利益率8.2%を達成する。',
    }),
    hearingVariables: createGenericHearingVariables({
      existingUnitPrice: 180000,
      newUnitPrice: 250000,
      countY1: 91, // 25万円 × 91件 = 2,275万円 (38,000 + 2,275 = 40,275万円)
      countY2: 182, // 25万円 × 182件 = 4,550万円 (38,000 + 4,550 = 42,550万円)
      countY3: 260, // 25万円 × 260件 = 6,500万円 (38,000 + 6,500 = 44,500万円)
      repeatRate: 90,
      reducedHours: 1100,
      hourlyWage: 2800,
      subcontractRed: 840,
      defectCurr: 4.5,
      defectTarget: 0.8,
      ltCurr: 6,
      ltTarget: 2,
      capCurr: 18000,
      capTarget: 42000,
      hiresY1: 1,
      hiresY2: 0,
      hiresY3: 1,
      wageGrowth: 3.8,
      memoPrefix: '介護・病院食OEMヒアリングシート',
    }),
    subsidies: createGenericSubsidies(
      '株式会社江戸川フーズラボ',
      '業務用冷凍食品製造業',
      ['完成', '完成', '修正中'],
      true,
      {
        employees: 24,
        machinery: 3900,
        system: 600,
        salesDelta: 6500,
        y3Margin: '8.2%',
        leadTime: '65%短縮',
      }
    ),
    financialMaster: createGenericFinancialMaster({
      baseSales: 38000,
      y3SalesIncrease: 6500,
      machineryCost: 3900,
      systemCost: 600,
      subsidyRequested: 3000, // 最賃特例2/3適用で 4,500×2/3 = 3,000万円（21〜50人上限4,000万円以内）
      employees: 24,
      locked: true,
      lockedAt: '2026-10-19 14:00',
      perCapitaWageAnnualGrowth: 0.038,
      specialFlags: {
        shinJigyoMinWageSpecial: true,
      },
    }),
    gates: createStandardGates([1, 2, 3], {
      'gate-1': '2026-10-12 11:00',
      'gate-2': '2026-10-19 14:00',
      'gate-3': '2026-10-22 17:45',
    }),
    scheduleTasks: createStandardScheduleTasks('review'),
    manualChecks: {
      'mchk-quote': true,
      'mchk-labor': true,
      'mchk-minwage': true,
      'mchk-depreciation': true,
      'mchk-funding': true,
      'mchk-schedule': true,
    },
    lastAICrossCheck: {
      timestamp: '2026-10-22 17:45',
      overallScore: 94,
      isPass: true,
      summary:
        '監査スコア 94点：重大な数値矛盾は検出されませんでした（軽微な補強提案 1件）。Gate 3（整合性チェック）通過基準を満たしています。',
      issues: [
        {
          severity: 'warning',
          targetSection: '新事業進出補助金 · 効果・数値',
          title: '定量根拠の補強推奨: 投資回収年数（キャッシュフロー試算）',
          description:
            '本文中に回収年数の明記なし（収支マスター試算値: 約2.5年（年平均CF増 1,795万円））',
          recommendation:
            '審査加点のため、申請書第3項へ投資回収年数（文章モジュール等）の追記を推奨します。',
        },
      ],
    },
    updatedAt: '2026-10-22 18:05',
  },
  {
    id: 'proj-sankyo-logistics',
    code: 'AN-2026-042',
    companyName: '三協精密物流株式会社',
    industry: '定温倉庫・精密機器輸送業（東京都板橋区）',
    salesRep: '鈴木 翔太',
    writerName: '佐藤 美咲',
    deadline: '2026-12-05',
    applicationDeadline: '2026-12-05',
    targetAmount: '1,800万円',
    targetAmountManYen: 1800,
    status: '申請書作成中',
    rawHearingText: `【顧客名】三協精密物流株式会社\n【議事メモ】半導体・医療検査装置向け定温保管・輸送を展開（社員19名）。手作業検品による入出庫滞留を解消するため、RFID自動検品ゲート（2,000万円）とWMS倉庫管理システム（700万円）計2,700万円を導入予定。`,
    hearingSourceNote: '営業ヒアリングシート_三協精密物流.txt',
    masterItems: buildMasterItemsFromTemplates(INITIAL_MASTER_TEMPLATES, {
      'master-1':
        '板橋区を拠点とする精密機器・医療試薬特化型の定温物流企業（従業員19名）。振動抑制車両と厳格な温湿度管理ノウハウにより大手装置メーカーとの直取引実績を有する。',
      'master-2':
        '2024年問題に伴う荷役時間短縮要請が強まる中、目視・ハンディ端末による入出庫検品に1ロット平均50分を要しており、庫内回転率の低下と残業増加が課題。',
      'master-3':
        'RFID一括読取ゲート設備（2,000万円）およびロット別温湿度連動WMS（700万円）の総投資額2,700万円を導入し、パレット単位での非接触一括検品とリアルタイム在庫可視化を実現する。',
      'master-4':
        '入出庫検品時間を50分から8分へ84%短縮し、荷役残業代を年間560万円削減。医薬・半導体関連の新規荷主獲得により3年後売上高5,200万円増を見込む。',
    }),
    hearingVariables: createGenericHearingVariables({
      existingUnitPrice: 150000,
      newUnitPrice: 200000,
      countY1: 91, // 20万円 × 91件 = 1,820万円 (31,000 + 1,820 = 32,820万円)
      countY2: 182, // 20万円 × 182件 = 3,640万円 (31,000 + 3,640 = 34,640万円)
      countY3: 260, // 20万円 × 260件 = 5,200万円 (31,000 + 5,200 = 36,200万円)
      repeatRate: 88,
      reducedHours: 1600,
      hourlyWage: 3500,
      subcontractRed: 0,
      defectCurr: 1.8,
      defectTarget: 0.1,
      ltCurr: 3,
      ltTarget: 1,
      capCurr: 450,
      capTarget: 1200,
      hiresY1: 1,
      hiresY2: 0,
      hiresY3: 1,
      wageGrowth: 3.7,
      memoPrefix: '定温物流ヒアリングシート',
    }),
    subsidies: createGenericSubsidies(
      '三協精密物流株式会社',
      '定温倉庫・精密機器輸送業',
      ['修正中', '下書き', '未作成'],
      true,
      {
        employees: 19,
        machinery: 2000,
        system: 700,
        salesDelta: 5200,
        y3Margin: '8.2%',
        leadTime: '84%短縮',
      }
    ),
    financialMaster: createGenericFinancialMaster({
      baseSales: 31000,
      y3SalesIncrease: 5200,
      machineryCost: 2000,
      systemCost: 700,
      subsidyRequested: 1800, // 最賃特例2/3適用で 2,700×2/3 = 1,800万円（20人以下上限2,500万円以内）
      employees: 19,
      locked: true,
      lockedAt: '2026-10-22 16:30',
      perCapitaWageAnnualGrowth: 0.037,
      specialFlags: {
        shinJigyoMinWageSpecial: true,
        jizokukaInvoiceSpecial: true,
      },
    }),
    gates: createStandardGates([1, 2], {
      'gate-1': '2026-10-19 10:30',
      'gate-2': '2026-10-22 16:30',
    }),
    scheduleTasks: createStandardScheduleTasks('drafting'),
    manualChecks: {
      'mchk-quote': true,
      'mchk-depreciation': true,
    },
    updatedAt: '2026-10-23 09:30',
  },
  {
    // M8 要件未達アラート＆公募回切替比較デモ用案件（現行公募回4.0%/3.5%では未達、旧公募回3.0%/1.5%では達成）
    id: 'proj-sakura-clinic',
    code: 'AN-2026-044',
    companyName: '株式会社武蔵野マテリアル工芸',
    industry: '産業用セラミックス加工業（東京都昭島市）',
    salesRep: '田中 健太',
    writerName: '高橋 誠',
    deadline: '2026-12-18',
    applicationDeadline: '2026-12-18',
    targetAmount: '1,800万円',
    targetAmountManYen: 1800,
    status: 'ヒアリング中',
    rawHearingText: '',
    hearingSourceNote: '議事録データ取込待ち（暫定ヒアリング変数のみ入力）',
    masterItems: buildMasterItemsFromTemplates(INITIAL_MASTER_TEMPLATES),
    hearingVariables: createGenericHearingVariables({
      existingUnitPrice: 280000,
      newUnitPrice: 400000,
      countY1: 50,
      countY2: 100,
      countY3: 150, // 算定上は +6,000万円だが収支計画はまだ +2,200万円のまま（未反映検出デモ）
      repeatRate: 75,
      reducedHours: 640,
      hourlyWage: 3200,
      subcontractRed: 450,
      defectCurr: 5.0,
      defectTarget: 1.2,
      ltCurr: 18,
      ltTarget: 7,
      capCurr: 200,
      capTarget: 480,
      hiresY1: 1,
      hiresY2: 0,
      hiresY3: 1,
      wageGrowth: 2.0,
      memoPrefix: '初回仮聴取メモ',
    }),
    subsidies: createGenericSubsidies(
      '株式会社武蔵野マテリアル工芸',
      '産業用セラミックス加工業',
      ['未作成', '未作成', '未作成'],
      false
    ),
    financialMaster: createGenericFinancialMaster({
      baseSales: 24000,
      y3SalesIncrease: 2200, // 付加価値額伸び率 ~3.3%（現行4.0%未達 / 旧3.0%達成）
      machineryCost: 3200,
      systemCost: 400,
      subsidyRequested: 1800,
      employees: 14,
      locked: false,
      perCapitaWageAnnualGrowth: 0.02, // 一人当たり給与年率 ~2.0%（現行3.5%未達 / 旧1.5%達成）
      sgaRatioY3: 0.34,
    }),
    gates: createStandardGates([]),
    scheduleTasks: createStandardScheduleTasks('hearing'),
    manualChecks: {},
    updatedAt: '2026-10-23 11:10',
  },
  {
    // Gate 2未確定ブロッカー確認用案件（ガイド5-1指定）
    id: 'proj-sunrise-seiko',
    code: 'AN-2026-045',
    companyName: '有限会社サンライズ精工',
    industry: 'エンジニアリングプラスチック成形（東京都葛飾区）',
    salesRep: '鈴木 翔太',
    writerName: '未割当',
    deadline: '2026-12-25',
    applicationDeadline: '2026-12-25',
    targetAmount: '1,125万円',
    targetAmountManYen: 1125,
    status: '未着手',
    rawHearingText: '',
    hearingSourceNote: '初回ヒアリング日程調整中',
    masterItems: buildMasterItemsFromTemplates(INITIAL_MASTER_TEMPLATES),
    hearingVariables: createGenericHearingVariables({
      existingUnitPrice: 120000,
      newUnitPrice: 180000,
      countY1: 85,
      countY2: 175,
      countY3: 250, // 18万円×250件 = 4,500万円
      repeatRate: 80,
      reducedHours: 720,
      hourlyWage: 3000,
      subcontractRed: 380,
      defectCurr: 4.0,
      defectTarget: 0.6,
      ltCurr: 10,
      ltTarget: 3,
      capCurr: 3500,
      capTarget: 8000,
      hiresY1: 1,
      hiresY2: 0,
      hiresY3: 1,
      wageGrowth: 3.8,
      memoPrefix: '事前アンケート票',
    }),
    subsidies: createGenericSubsidies(
      '有限会社サンライズ精工',
      'エンジニアリングプラスチック成形',
      ['未作成', '未作成', '未作成'],
      false
    ),
    financialMaster: createGenericFinancialMaster({
      baseSales: 19500,
      y3SalesIncrease: 4500,
      machineryCost: 2250,
      systemCost: 0,
      subsidyRequested: 1125, // 2,250万円 × 1/2 = 1,125万円
      employees: 11,
      locked: false,
      perCapitaWageAnnualGrowth: 0.038,
    }),
    gates: createStandardGates([]),
    scheduleTasks: createStandardScheduleTasks('unstarted'),
    manualChecks: {},
    updatedAt: '2026-10-23 13:00',
  },
];

export const INITIAL_DIFF_LOGS: DiffLog[] = [
  {
    id: 'diff-preset-1',
    projectId: 'proj-tech-precision',
    projectName: '株式会社テックプレシジョン',
    subsidyType: '東京都経営強化基盤事業',
    sectionTitle: '3. 経営基盤強化の成果目標',
    aiText:
      '本事業により製造リードタイムを14日から4日へ70%短縮し、外注加工費を年間1,200万円削減して付加価値額の社内留保を高める。EVバッテリー冷却部品や医療機器用内視鏡パーツの高難度加工を都内工場で完結させることで地域サプライチェーンの高度化に貢献し、3年後に売上高8,000万円増・営業利益率8.5%への経営基盤強化を達成する。',
    humanText:
      '本事業により製造リードタイムを14日から4日へ70%短縮し、外注加工費を年間1,200万円削減して付加価値額の社内留保を高める。EVバッテリー冷却部品（売上内訳5,000万円）や医療機器用内視鏡パーツ（同3,000万円）の高難度加工を都内工場で完結させることで地域サプライチェーンの高度化に貢献し、3年後に売上高8,000万円増・営業利益率8.5%への経営基盤強化を達成する。なお総投資額4,200万円に対する投資回収期間は年間キャッシュフロー増加額ベースで約3.2年と試算しており投資採算性は十分に高い。',
    editorName: '佐藤 美咲',
    timestamp: '2026-10-21 10:15',
  },
  {
    id: 'diff-preset-2',
    projectId: 'proj-edogawa-foods',
    projectName: '株式会社江戸川フーズラボ',
    subsidyType: '新事業進出補助金',
    sectionTitle: '3. 将来の数値目標・収益計画',
    aiText:
      '凍結工程時間を65%短縮、年間電力費・廃棄ロスを計840万円削減。病院・介護施設向けOEM受注により3年後に売上高6,500万円増、営業利益率8.2%を達成する計画である。',
    humanText:
      '凍結工程時間を65%短縮、年間電力費360万円・廃棄ロス480万円の計840万円を削減する。病院向け4,000万円・介護施設向け2,500万円のOEM受注により3年後に売上高6,500万円増、営業利益率8.2%を達成する計画である。設備投資額4,500万円の投資回収年数は約2.5年を見込む。',
    editorName: '高橋 誠',
    timestamp: '2026-10-22 18:05',
  },
];

export function getSampleHearingVariablesForProject(
  projectId: string
): HearingVariables {
  const found = INITIAL_PROJECTS.find((p) => p.id === projectId);
  if (found) {
    return JSON.parse(JSON.stringify(found.hearingVariables)) as HearingVariables;
  }
  return createTechPrecisionHearingVariables();
}

export function createInitialAppState(): SubsidyAppState {
  return {
    role: '営業担当',
    activeScreen: 'projects',
    workspaceTab: 'schedule',
    selectedProjectId: 'proj-tech-precision',
    projects: JSON.parse(JSON.stringify(INITIAL_PROJECTS)) as Project[],
    masterTemplates: JSON.parse(
      JSON.stringify(INITIAL_MASTER_TEMPLATES)
    ) as MasterSchemaTemplate[],
    textModules: JSON.parse(
      JSON.stringify(INITIAL_TEXT_MODULES)
    ) as TextModule[],
    thresholds: JSON.parse(
      JSON.stringify(CURRENT_CALL_ROUND_THRESHOLDS)
    ) as SubsidyRequirementThresholds,
    callRounds: JSON.parse(JSON.stringify(INITIAL_CALL_ROUNDS)) as CallRound[],
    activeCallRoundId: 'round-2026-current',
    effectEstimates: JSON.parse(
      JSON.stringify(INITIAL_EFFECT_ESTIMATES)
    ) as EffectEstimateItem[],
    crossCheckPrompt: INITIAL_CROSS_CHECK_PROMPT,
    diffLogs: JSON.parse(JSON.stringify(INITIAL_DIFF_LOGS)) as DiffLog[],
    promptSuggestionApplied: false,
  };
}
