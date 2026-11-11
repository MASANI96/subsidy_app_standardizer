import { InvestmentPlan, SubsidyType } from '../types';

export type InvestmentCostField =
  | 'machineryCost'
  | 'systemCost'
  | 'subcontractCost'
  | 'otherCost';

export interface FormatExpenseMappingRule {
  id: string;
  subsidyCategoryName: string;
  sourceFields: InvestmentCostField[];
  isEligible: boolean;
  note: string;
}

/**
 * M3: 投資区分（machineryCost/systemCost/subcontractCost/otherCost）→各補助金の経費区分名の対応定数
 * 公募要領の改訂時には本定数のみを更新すれば全画面の様式換算に反映される
 */
export const EXPENSE_CATEGORY_MAPPING: Record<
  SubsidyType,
  FormatExpenseMappingRule[]
> = {
  '新事業進出・ものづくり商業サービス補助金': [
    {
      id: 'mono-exp-1',
      subsidyCategoryName: '機械装置・システム構築費',
      sourceFields: ['machineryCost', 'systemCost'],
      isEligible: true,
      note: '製品・サービス開発に必要な専用機械装置・検査機器・システム構築費',
    },
    {
      id: 'mono-exp-2',
      subsidyCategoryName: '技術導入費・専門家経費・運搬費',
      sourceFields: ['subcontractCost'],
      isEligible: true,
      note: '先端技術導入、学識経験者指導、大型機械搬入費用等',
    },
    {
      id: 'mono-exp-3',
      subsidyCategoryName: '外注費・知的財産権等関連経費・クラウドサービス利用費',
      sourceFields: ['otherCost'],
      isEligible: true,
      note: '試作品評価外注・特許出願調査費用・クラウド利用料等',
    },
  ],
  新事業進出補助金: [
    {
      id: 'shin-exp-1',
      subsidyCategoryName: '機械装置・システム構築費',
      sourceFields: ['machineryCost', 'systemCost'],
      isEligible: true,
      note: '専用工作機械・製造装置および同時導入するソフトウェア構築費を合算計上',
    },
    {
      id: 'shin-exp-2',
      subsidyCategoryName: '外注費',
      sourceFields: ['subcontractCost'],
      isEligible: true,
      note: '新事業に必要な設計・検査・一部加工等の外部委託経費',
    },
    {
      id: 'shin-exp-3',
      subsidyCategoryName: 'その他経費（技術導入費・クラウドサービス利用費・広告宣伝費等）',
      sourceFields: ['otherCost'],
      isEligible: true,
      note: '新市場開拓に伴う広告宣伝・展示会・クラウド利用料等',
    },
  ],
  小規模事業者持続化補助金: [
    {
      id: 'jizo-exp-1',
      subsidyCategoryName: '機械装置等費',
      sourceFields: ['machineryCost'],
      isEligible: true,
      note: '販路開拓・新商品試作に直結する製造装置・検査機器等',
    },
    {
      id: 'jizo-exp-2',
      subsidyCategoryName: 'ウェブサイト関連費',
      sourceFields: ['systemCost'],
      isEligible: true,
      note: '※制度上、補助金交付申請額全体の1/4（最大50万円）が上限であり単独申請不可',
    },
    {
      id: 'jizo-exp-3',
      subsidyCategoryName: '外注費',
      sourceFields: ['subcontractCost'],
      isEligible: true,
      note: '店舗改装・デザイン委託・試作品評価等の外注業務',
    },
    {
      id: 'jizo-exp-4',
      subsidyCategoryName: '広報費・展示会等出展費',
      sourceFields: ['otherCost'],
      isEligible: true,
      note: '専門展示会出展小間料・技術カタログ印刷・販促ツール制作費',
    },
  ],
  東京都経営強化基盤事業: [
    {
      id: 'tokyo-exp-1',
      subsidyCategoryName: '機械装置・器具備品費',
      sourceFields: ['machineryCost'],
      isEligible: true,
      note: '都内事業所へ設置する生産設備・検査装置（2社以上の相見積必須）',
    },
    {
      id: 'tokyo-exp-2',
      subsidyCategoryName: 'システム等導入費',
      sourceFields: ['systemCost'],
      isEligible: true,
      note: '生産管理・CAD/CAM等の業務高度化ソフトウェア導入費',
    },
    {
      id: 'tokyo-exp-3',
      subsidyCategoryName: '外注委託費（助成対象外区分）',
      sourceFields: ['subcontractCost'],
      isEligible: false,
      note: '本コース（一般コース仮設定）では設備・システム導入を主対象とするため対象外整理',
    },
    {
      id: 'tokyo-exp-4',
      subsidyCategoryName: 'その他諸経費・広報費（助成対象外区分）',
      sourceFields: ['otherCost'],
      isEligible: false,
      note: '広告宣伝費・消耗品費等は助成対象外経費として自己資金充当',
    },
  ],
};

export const INVESTMENT_FIELD_LABELS: Record<InvestmentCostField, string> = {
  machineryCost: '機械装置・工具器具費',
  systemCost: 'システム・ソフトウェア費',
  subcontractCost: '外注費・専門家経費',
  otherCost: 'その他補助対象経費',
};

export function computeMappedExpenseRows(
  subsidyType: SubsidyType,
  investment: InvestmentPlan
): {
  id: string;
  subsidyCategoryName: string;
  sourceLabel: string;
  amountManYen: number;
  isEligible: boolean;
  note: string;
}[] {
  const rules = EXPENSE_CATEGORY_MAPPING[subsidyType];
  return rules.map((rule) => {
    const amountManYen = rule.sourceFields.reduce(
      (sum, field) => sum + (investment[field] || 0),
      0
    );
    const sourceLabel = rule.sourceFields
      .map((f) => INVESTMENT_FIELD_LABELS[f])
      .join(' ＋ ');
    return {
      id: rule.id,
      subsidyCategoryName: rule.subsidyCategoryName,
      sourceLabel,
      amountManYen,
      isEligible: rule.isEligible,
      note: rule.note,
    };
  });
}
