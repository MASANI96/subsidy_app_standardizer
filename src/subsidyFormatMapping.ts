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
