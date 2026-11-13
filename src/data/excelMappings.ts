import { ProjectFinancialMaster } from '../types';

export interface ExcelCellMapping {
  id: string;
  sheetName: string;
  cellAddress: string;
  itemLabel: string;
  path: string;
  unitDisplay: 'yen' | 'percent' | 'number' | 'text';
  note: string;
}

/**
 * 公式インポート用フォーマット Excel セル対応表
 * （プレビュー検証用：内部の円単位整数データとの対応関係を明示）
 */
export const excelCellMappings: ExcelCellMapping[] = [
  {
    id: 'map-01',
    sheetName: '基本情報',
    cellAddress: 'C5',
    itemLabel: '決算月',
    path: 'fiscalMonth',
    unitDisplay: 'number',
    note: '決算月（月）',
  },
  {
    id: 'map-02',
    sheetName: '基本情報',
    cellAddress: 'C7',
    itemLabel: '申請時事業年度',
    path: 'autoFiscalCalc.calculatedCurrentFY',
    unitDisplay: 'number',
    note: '申請締切日と決算月から自動算出',
  },
  {
    id: 'map-03',
    sheetName: '基本情報',
    cellAddress: 'C8',
    itemLabel: '基準年度（補助事業完了期）',
    path: 'autoFiscalCalc.calculatedBaseFY',
    unitDisplay: 'number',
    note: '交付決定見込日＋実施期間から自動算出',
  },
  {
    id: 'map-04',
    sheetName: 'PL計画',
    cellAddress: 'E12',
    itemLabel: '基準年度 全社売上高',
    path: 'periods.baseFY.pl.totalSales',
    unitDisplay: 'yen',
    note: '既存事業＋補助事業の合算',
  },
  {
    id: 'map-05',
    sheetName: 'PL計画',
    cellAddress: 'H12',
    itemLabel: '計画3年目 全社売上高',
    path: 'periods.p3.pl.totalSales',
    unitDisplay: 'yen',
    note: '目標最終年度（3年計画時）',
  },
  {
    id: 'map-06',
    sheetName: 'PL計画',
    cellAddress: 'H14',
    itemLabel: '計画3年目 補助事業売上高',
    path: 'periods.p3.pl.subsidyBusiness.sales',
    unitDisplay: 'yen',
    note: '単価×月間数量×12か月連動',
  },
  {
    id: 'map-07',
    sheetName: 'PL計画',
    cellAddress: 'E24',
    itemLabel: '基準年度 営業利益',
    path: 'periods.baseFY.pl.totalOperatingProfit',
    unitDisplay: 'yen',
    note: '粗利−販管費',
  },
  {
    id: 'map-08',
    sheetName: 'PL計画',
    cellAddress: 'H24',
    itemLabel: '計画3年目 営業利益',
    path: 'periods.p3.pl.totalOperatingProfit',
    unitDisplay: 'yen',
    note: '付加価値額算出基礎',
  },
  {
    id: 'map-09',
    sheetName: 'PL計画',
    cellAddress: 'E28',
    itemLabel: '基準年度 付加価値額',
    path: 'periods.baseFY.pl.valueAdded',
    unitDisplay: 'yen',
    note: '営業利益＋人件費＋減価償却費',
  },
  {
    id: 'map-10',
    sheetName: 'PL計画',
    cellAddress: 'H28',
    itemLabel: '計画3年目 付加価値額',
    path: 'periods.p3.pl.valueAdded',
    unitDisplay: 'yen',
    note: '年率4.0%以上成長の判定対象',
  },
  {
    id: 'map-11',
    sheetName: '人員・賃金',
    cellAddress: 'E35',
    itemLabel: '基準年度 従業員数',
    path: 'periods.baseFY.pl.numberOfEmployees',
    unitDisplay: 'number',
    note: '規模区分上限（21〜50人等）判定基準',
  },
  {
    id: 'map-12',
    sheetName: '人員・賃金',
    cellAddress: 'E37',
    itemLabel: '基準年度 給与支給総額',
    path: 'periods.baseFY.pl.totalWages',
    unitDisplay: 'yen',
    note: '一人当たり給与算出の分子',
  },
  {
    id: 'map-13',
    sheetName: '人員・賃金',
    cellAddress: 'H38',
    itemLabel: '計画3年目 一人当たり給与支給総額',
    path: 'periods.p3.pl.perCapitaWage',
    unitDisplay: 'yen',
    note: '賃上げ要件（特例6.0%以上）判定対象',
  },
  {
    id: 'map-14',
    sheetName: '人員・賃金',
    cellAddress: 'E41',
    itemLabel: '基準年度 事業場内最低賃金',
    path: 'periods.baseFY.pl.workplaceMinWage',
    unitDisplay: 'yen',
    note: '時給（円）地域別最賃+50円以上',
  },
  {
    id: 'map-15',
    sheetName: '投資計画',
    cellAddress: 'D10',
    itemLabel: '機械装置費（設備投資）',
    path: 'investment.newMachineryInvestment',
    unitDisplay: 'yen',
    note: '見積書突合対象',
  },
  {
    id: 'map-16',
    sheetName: '投資計画',
    cellAddress: 'D11',
    itemLabel: 'ソフトウェア等（無形資産）',
    path: 'investment.intangibleAssetInvestment',
    unitDisplay: 'yen',
    note: 'CAD/CAMシステム等',
  },
  {
    id: 'map-17',
    sheetName: '投資計画',
    cellAddress: 'D15',
    itemLabel: '総投資額合計',
    path: 'investment.totalInvestmentYen',
    unitDisplay: 'yen',
    note: '補助対象経費合計',
  },
  {
    id: 'map-18',
    sheetName: '投資計画',
    cellAddress: 'D18',
    itemLabel: '補助金交付申請額',
    path: 'investment.subsidyRequestedYen',
    unitDisplay: 'yen',
    note: '上限額・下限750万円判定対象',
  },
  {
    id: 'map-19',
    sheetName: 'BS計画',
    cellAddress: 'E50',
    itemLabel: '基準年度 資産合計',
    path: 'periods.baseFY.bs.totalAssets',
    unitDisplay: 'yen',
    note: '負債・純資産合計と一致',
  },
  {
    id: 'map-20',
    sheetName: '売上見込',
    cellAddress: 'F12',
    itemLabel: '新製品等1年当たり売上見込額',
    path: 'annualSalesEstimate.calculatedValueYen',
    unitDisplay: 'yen',
    note: '算出方式（計画期間平均/最終年度）連動',
  },
];

export function getValueByPath(
  obj: ProjectFinancialMaster | Record<string, any> | undefined | null,
  path: string
): any {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}
