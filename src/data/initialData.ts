import {
  DiffLog,
  HearingMasterItem,
  MasterSchemaTemplate,
  Project,
  SubsidyAppState,
  SubsidyDocument,
  SubsidyType,
} from '../types';

export const SUBSIDY_TYPES: SubsidyType[] = [
  '新事業進出補助金',
  '小規模事業者持続化補助金',
  '東京都経営強化基盤事業',
];

export const PROJECT_STATUS_LIST = [
  '未着手',
  'ヒアリング中',
  'マスター作成済',
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
    '最新鋭の5軸マシニングセンタ（DMG森精機製）および高精度CAD/CAMソフトウェア（総投資額4,200万円）を導入。工程集約によるワンチャッキング連続加工体制を確立し、微細立体形状の内製化を推進する。',
  'master-4':
    '加工リードタイムを14日から4日へと70%短縮、外注加工費を年間1,200万円削減。新分野での受注獲得により、設備導入後3年で売上高8,000万円増、営業利益率8.5%への改善を達成する。',
};

export const TECH_PRECISION_MASTER_IMPROVED_4 =
  '加工リードタイムを14日から4日へと70%短縮し、外注加工費を年間1,200万円削減する。新分野での受注獲得により設備導入後3年で売上高8,000万円増（内訳：EV冷却部品5,000万円、医療内視鏡部品3,000万円）、営業利益率8.5%への改善を達成する。総投資額4,200万円に対する投資回収期間は年間キャッシュフロー増加額（約1,310万円）ベースで約3.2年を見込む。';

export function createTechPrecisionSubsidies(): Record<SubsidyType, SubsidyDocument> {
  const shinJigyo500_1 =
    '当社は東京都大田区にて創業35年の実績を有する精密金属加工企業（従業員15名、年商2.8億円）である。チタンやインコネル等の難削材に対するミクロン単位の超精密切削加工技術を中核に、大田区内の高度な協力工場ネットワークを活かした短納期対応体制（業界標準比30%短縮）を最大の競合優位性としている。一方、主力である自動車内燃機関向け試作部品市場はEVシフトに伴う構造的な需要縮小に直面しており、直近の営業利益率は2.1%まで低下している。また既存の3軸加工機では複雑立体形状の同時加工が行えず、特殊工程の外注依存による原価高騰と納期長期化が深刻な経営課題となっている。こうした経営環境を打開するため、既に引き合いを獲得している高成長領域の「EVバッテリー冷却部品」および「医療機器用内視鏡精密パーツ」の量産受託事業へ本格進出する。';
  const shinJigyo200_1 =
    '大田区で創業35年の精密金属加工業（15名）。難削材のミクロン単位切削と業界比30%短縮の短納期対応が強みだが、内燃機関向け試作需要の減少により営業利益率が2.1%へ低下。既存3軸機による外注依存と納期課題を解消し、EV冷却部品・医療内視鏡パーツ分野への新事業進出を図る。';

  const shinJigyo500_2 =
    '新事業における複雑微細形状の高精度量産を実現するため、DMG森精機製の最新鋭5軸マシニングセンタ（本体約3,800万円）および同時5軸制御対応の高精度CAD/CAMソフトウェア（400万円）、総額4,200万円の設備投資を実施する。従来は3軸加工機での複数回にわたる段取り替えと外部専門業者への二次加工委託を要していたが、本設備の導入によりワンチャッキングでの多面・同時5軸連続加工体制が確立される。これにより段取り誤差に起因する不良率を極小化するとともに、これまで外注に依存していたアンダーカット形状や曲面流路加工の完全内製化を実現し、EV・医療機器メーカーが求める厳格な品質基準と量産供給責任を同時に満たす生産体制を構築する。';
  const shinJigyo200_2 =
    'DMG森精機製5軸マシニングセンタ（3,800万円）と高精度CAD/CAM（400万円）の計4,200万円を導入。従来の複数段取りと外注工程をワンチャッキング連続加工へ集約・内製化し、EV冷却流路や医療用微細立体部品の高精度量産体制を確立する。';

  const shinJigyo500_3 =
    '本設備投資による工程集約と内製化により、製造リードタイムを従来の14日間から4日間へと70%短縮し、年間1,200万円にのぼる外注加工費を直接削減する。さらに短納期・高品質な5軸量産体制を武器に既存取引先からの打診案件を確実に受注転換し、事業化3年後には新規事業売上高8,000万円の積み増し（全社売上高2.8億円から3.6億円への拡大）および全社営業利益率8.5%（現状2.1%から+6.4ポイント改善）を達成する計画である。創出される営業キャッシュフローにより設備投資額の着実な回収を図り、自動車内燃機関依存から脱却した高収益な次世代成長基盤を確立する。';
  const shinJigyo200_3 =
    '工程集約によりリードタイムを14日から4日へ70%短縮し、外注費を年間1,200万円削減する。EV・医療分野の新規受注獲得により、導入3年後に売上高8,000万円増加、営業利益率2.1%から8.5%への大幅な収益改善を達成する。';

  const jizokuka200_1 =
    '大田区で創業35年の精密金属加工業（従業員15名）。チタン・インコネル等の難削材におけるミクロン単位の切削ノウハウと、地域連携による短納期対応力（業界標準比30%短縮）が最大の強みであり、大手メーカー試作開発で高い信頼を得ている。';
  const jizokuka500_1 =
    '当社は大田区にて創業35年を数える従業員15名の精密金属加工事業者である。チタンやインコネルといった高硬度・難削材に対するミクロン単位の精密切削ノウハウを長年蓄積しており、大田区内の熱処理・表面処理ネットワークと連携した一気通貫の短納期対応（他社標準比30%短縮）を最大の強みとしている。近年は既存の内燃機関向け試作部品需要が減少傾向にあるものの、当社の難削材加工技術に対するEV関連・医療機器メーカーからの評価は高く、自社の技術的強みを成長市場の量産・高付加価値案件へ展開する好機にある。';

  const jizokuka200_2 =
    'EVバッテリー冷却部品および医療用内視鏡パーツの新規販路開拓に向け、5軸マシニングセンタと高精度CAD/CAMを導入して複雑微細サンプル品を内製化する。あわせて加工事例を掲載した技術提案書刷新と専門展示会出展を実施し新規顧客を獲得する。';
  const jizokuka500_2 =
    '成長市場であるEVバッテリー冷却部品および医療機器用内視鏡精密パーツへの本格的な販路開拓を推進するため、最新鋭5軸マシニングセンタとCAD/CAMシステムを導入し、従来の3軸機では対応困難であった複雑曲面・微細形状のデモンストレーションサンプルを自社内製により製作する。この高精度サンプルを核として、難削材×同時5軸加工の技術力を訴求する専門カタログ・Web特設ページを整備し、医療機器・次世代モビリティ分野の専門商談展示会へ出展することで、設計開発部門からの直接受注ルートを開拓する。';

  const jizokuka200_3 =
    'ワンチャッキング加工の実現でリードタイムを14日から4日へ70%短縮し、即納体制を確立。外注費年1,200万円の削減と展示会・打診案件からの新規成約により、3年後に売上高8,000万円増・営業利益率8.5%への向上を実現する。';
  const jizokuka500_3 =
    '5軸加工の内製化による工程集約により、見積回答から試作・量産納入までの製造リードタイムを従来の14日間から4日間へと70%短縮し、競合他社に対して圧倒的な即納優位性を確立する。これにより外注加工費を年間1,200万円削減して価格競争力と粗利率を同時に引き上げるとともに、既に打診を受けているEV・医療関連取引先からの本受注化および新規引き合い獲得を推進し、導入3年後には売上高8,000万円の拡大と営業利益率8.5%の達成を見込む。';

  const tokyoCustom_1 =
    '当社は大田区で35年にわたり精密金属加工を担い、都内製造業サプライチェーンの一翼を支えてきた（従業員15名）。しかし主力の内燃機関向け自動車試作需要の構造的減少により営業利益率は2.1%まで低下している。また既存の3軸加工機では複雑立体形状の一貫加工ができず、都外を含む外注加工への依存から納期遅延リスクとコスト高止まりが生じている。大田区の高度なモノづくり基盤を維持・発展させるため、5軸加工への高度化による事業構造転換が不可欠である。';
  const tokyo200_1 =
    '大田区で35年続く精密金属加工業として地域基盤を支えるが、内燃機関向け需要減で営業利益率が2.1%に低下。既存3軸機の外注依存と納期課題を解消し、5軸高度化による都内生産基盤の維持・強化が急務である。';
  const tokyo500_1 =
    '当社は東京都大田区において創業35年の実績を持つ精密金属加工事業者（従業員15名、年商2.8億円）であり、チタン・インコネル等の難削材切削と地域連携による短納期供給（他社比30%短縮）によって都内製造業の試作・開発基盤を支えてきた。しかしながら自動車産業のEVシフトに伴う内燃機関部品の需要減退により、直近の営業利益率は2.1%と低迷している。さらに既存の3軸加工機ではEV・医療分野で求められる複雑立体微細形状の同時加工が不可能であり、特殊工程の外注依存による年間1,200万円の外部流出とリードタイム長期化（14日間）が経営基盤上の重大なボトルネックとなっている。';

  const tokyoCustom_2 =
    '大田区本社工場内にDMG森精機製5軸マシニングセンタ（本体価格約3,800万円）1台および高精度CAD/CAMソフトウェア（400万円）の計4,200万円を導入する。既存工場の床耐荷重・電源容量および搬入動線は事前調査済みであり即時稼働が可能である。相見積取得により市場価格に対する経費妥当性を検証済みであり、従来の複数工程・外注委託をワンチャッキング連続加工へ集約する上で必要不可欠な最新設備仕様を選定している。';
  const tokyo200_2 =
    '大田区本社工場にDMG森精機製5軸マシニングセンタ（3,800万円）と高精度CAD/CAM（400万円）を導入。設置環境と相見積による価格妥当性を確認済みであり、工程集約による内製化を確実に実現する計画である。';
  const tokyo500_2 =
    '都内本社工場（大田区）の生産高度化に向け、DMG森精機製の最新鋭5軸マシニングセンタ（本体約3,800万円）および同時5軸制御用CAD/CAMソフトウェア（400万円）、総額4,200万円を導入する。選定機種はチタン・インコネル等の難削材における高剛性・熱変位制御に優れ、省スペース設計のため大田区内の限られた工場床面積にも既存レイアウト変更のみで設置可能である。導入経費については複数商社からの相見積取得により仕様・価格双方の妥当性を精査済みであり、外注工程の完全内製化とワンチャッキング加工体制の構築に直結する投資計画となっている。';

  const tokyoCustom_3 =
    '本事業により製造リードタイムを14日から4日へ70%短縮し、外注加工費を年間1,200万円削減して付加価値額の社内留保を高める。EVバッテリー冷却部品や医療機器用内視鏡パーツの高難度加工を都内工場で完結させることで地域サプライチェーンの高度化に貢献し、3年後に売上高8,000万円増・営業利益率8.5%への経営基盤強化を達成する。';
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
  populated: boolean
): Record<SubsidyType, SubsidyDocument> {
  const emptyOrText = (shortText: string, longText: string) => ({
    t200: populated ? shortText : '',
    t500: populated ? longText : '',
  });

  const s1 = emptyOrText(
    `${companyName}（${industry}）は地域の中核企業として高い専門性と顧客基盤を有するが、人手不足と既存工程の非効率により収益率改善と新領域開拓が急務となっている。`,
    `${companyName}は${industry}において長年の実績と安定した取引基盤を有し、きめ細かな品質管理体制を強みとしている。しかし近年は原材料・エネルギー価格の高騰および熟練人材の高齢化に伴い、手作業や旧式設備に依存した従来工程では利益率の維持が困難となっている。持続的成長を実現するため、高付加価値領域への事業展開と抜本的な生産性改革が不可欠である。`
  );
  const s2 = emptyOrText(
    `最新鋭の自動化設備および統合管理システムを導入し、ボトルネック工程を内製化・標準化することで高品質・短納期の供給体制を構築する。`,
    `既存のボトルネック工程を解消するため、最新の自動化機器およびデジタル工程管理システムを一貫導入する。従来は熟練担当者の属人的な判断と手作業に頼っていた検査・加工・データ連携プロセスをデジタル標準化し、不良率低減と稼働率向上を同時に実現することで、大口取引先が求める厳格なトレーサビリティと安定供給基準を満たす体制を構築する。`
  );
  const s3 = emptyOrText(
    `作業工数を45%削減しリードタイムを半減。新規取引獲得により導入3年後に売上高5,500万円増加、営業利益率7.8%への改善を達成する。`,
    `設備稼働により対象工程の作業工数を45%削減し、受注から納品までのリードタイムを従来の半分へ短縮する。固定費・外注費の圧縮に加え、高付加価値案件の受注拡大により、事業終了後3年で売上高5,500万円の増加および営業利益率7.8%への改善を達成する計画である。`
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
          customText: s1.t200,
          selectedLength: 'custom',
          currentText: s1.t200,
          aiBaselineText: s1.t200,
          isModified: false,
        },
        {
          id: 'tokyo-2',
          title: '2. 設備導入計画',
          sourceMasterIds: ['master-3'],
          sourceMasterLabel: 'マスター③ 導入設備仕様・設置妥当性・見積根拠',
          text200: s2.t200,
          text500: s2.t500,
          customText: s2.t200,
          selectedLength: 'custom',
          currentText: s2.t200,
          aiBaselineText: s2.t200,
          isModified: false,
        },
        {
          id: 'tokyo-3',
          title: '3. 経営基盤強化の成果目標',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 都内サプライチェーン貢献・削減目標',
          text200: s3.t200,
          text500: s3.t500,
          customText: s3.t200,
          selectedLength: 'custom',
          currentText: s3.t200,
          aiBaselineText: s3.t200,
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
    targetAmount: '2,100万円',
    targetAmountManYen: 2100,
    status: 'マスター作成済',
    rawHearingText: SAMPLE_MEETING_MINUTES,
    hearingSourceNote: '2026/10/15 初回訪問ヒアリング議事録（田中）',
    masterItems: buildMasterItemsFromTemplates(
      INITIAL_MASTER_TEMPLATES,
      TECH_PRECISION_MASTER_PRESET
    ),
    subsidies: createTechPrecisionSubsidies(),
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
        '高効率液体急速凍結システムおよび自動真空包装ライン（総投資額4,500万円）を導入し、細胞破壊を抑えた高品質凍結と包装工程の省人化を実現する。',
      'master-4':
        '凍結工程時間を65%短縮、年間電力費・廃棄ロスを計840万円削減。病院・介護施設向けOEM受注により3年後に売上高6,500万円増、営業利益率8.2%を達成する。',
    }),
    subsidies: createGenericSubsidies(
      '株式会社江戸川フーズラボ',
      '業務用冷凍食品製造業',
      ['完成', '完成', '修正中'],
      true
    ),
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
    targetAmount: '1,800万円',
    targetAmountManYen: 1800,
    status: '申請書作成中',
    rawHearingText: `【顧客名】三協精密物流株式会社\n【議事メモ】半導体・医療検査装置向け定温保管・輸送を展開（社員19名）。手作業検品による入出庫滞留を解消するため、RFID自動検品ゲートとWMS（倉庫管理システム）計2,700万円を導入予定。`,
    hearingSourceNote: '営業ヒアリングシート_三協精密物流.txt',
    masterItems: buildMasterItemsFromTemplates(INITIAL_MASTER_TEMPLATES, {
      'master-1':
        '板橋区を拠点とする精密機器・医療試薬特化型の定温物流企業（従業員19名）。振動抑制車両と厳格な温湿度管理ノウハウにより大手装置メーカーとの直取引実績を有する。',
      'master-2':
        '2024年問題に伴う荷役時間短縮要請が強まる中、目視・ハンディ端末による入出庫検品に1ロット平均50分を要しており、庫内回転率の低下と残業増加が課題。',
      'master-3':
        'RFID一括読取ゲート設備およびロット別温湿度連動WMS（総投資額2,700万円）を導入し、パレット単位での非接触一括検品とリアルタイム在庫可視化を実現する。',
      'master-4':
        '入出庫検品時間を50分から8分へ84%短縮し、荷役残業代を年間560万円削減。医薬・半導体関連の新規荷主獲得により3年後売上高5,200万円増を見込む。',
    }),
    subsidies: createGenericSubsidies(
      '三協精密物流株式会社',
      '定温倉庫・精密機器輸送業',
      ['修正中', '下書き', '未作成'],
      true
    ),
    updatedAt: '2026-10-23 09:30',
  },
  {
    id: 'proj-sakura-clinic',
    code: 'AN-2026-044',
    companyName: '株式会社武蔵野マテリアル工芸',
    industry: '産業用セラミックス加工業（東京都昭島市）',
    salesRep: '田中 健太',
    writerName: '高橋 誠',
    deadline: '2026-12-18',
    targetAmount: '2,400万円',
    targetAmountManYen: 2400,
    status: 'ヒアリング中',
    rawHearingText: '',
    hearingSourceNote: '議事録データ取込待ち',
    masterItems: buildMasterItemsFromTemplates(INITIAL_MASTER_TEMPLATES),
    subsidies: createGenericSubsidies(
      '株式会社武蔵野マテリアル工芸',
      '産業用セラミックス加工業',
      ['未作成', '未作成', '未作成'],
      false
    ),
    updatedAt: '2026-10-23 11:10',
  },
  {
    id: 'proj-sunrise-seiko',
    code: 'AN-2026-045',
    companyName: '有限会社サンライズ精工',
    industry: 'エンジニアリングプラスチック成形（東京都葛飾区）',
    salesRep: '鈴木 翔太',
    writerName: '未割当',
    deadline: '2027-01-15',
    targetAmount: '1,500万円',
    targetAmountManYen: 1500,
    status: '未着手',
    rawHearingText: '',
    hearingSourceNote: '初回ヒアリング日程調整中',
    masterItems: buildMasterItemsFromTemplates(INITIAL_MASTER_TEMPLATES),
    subsidies: createGenericSubsidies(
      '有限会社サンライズ精工',
      'エンジニアリングプラスチック成形',
      ['未作成', '未作成', '未作成'],
      false
    ),
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
      '凍結工程時間を65%短縮、年間電力費360万円・廃棄ロス480万円の計840万円を削減する。病院向け4,000万円・介護施設向け2,500万円のOEM受注により3年後に売上高6,500万円増、営業利益率8.2%を達成する計画である。設備投資額4,500万円の投資回収年数は約4.1年を見込む。',
    editorName: '高橋 誠',
    timestamp: '2026-10-22 18:05',
  },
];

export function createInitialAppState(): SubsidyAppState {
  return {
    role: '営業担当',
    activeScreen: 'projects',
    selectedProjectId: 'proj-tech-precision',
    projects: INITIAL_PROJECTS,
    masterTemplates: INITIAL_MASTER_TEMPLATES,
    diffLogs: INITIAL_DIFF_LOGS,
    promptSuggestionApplied: false,
  };
}
