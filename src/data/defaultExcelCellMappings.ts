import type { ExcelCellMapping } from '../types';

/** 初期登録する期間（4・5年度目は計画年数で不要になるため含めない） */
const DEFAULT_PERIODS = [
  { key: 'yMinus2', label: '2期前' },
  { key: 'yMinus1', label: '1期前' },
  { key: 'y0', label: '直近期' },
  { key: 'currentFY', label: '申請時事業年度' },
  { key: 'baseFY', label: '基準年度' },
  { key: 'p1', label: '1年度目' },
  { key: 'p2', label: '2年度目' },
  { key: 'p3', label: '3年度目' },
] as const;

/** 初期登録するPL項目（ProfitAndLossData のフィールド名） */
const DEFAULT_PL_ITEMS = [
  { field: 'totalSales', label: '売上高' },
  { field: 'totalOperatingProfit', label: '営業利益' },
  { field: 'laborCost', label: '人件費' },
  { field: 'depreciation', label: '減価償却費' },
  { field: 'numberOfEmployees', label: '従業員数' },
  { field: 'totalWages', label: '給与支給総額' },
] as const;

/**
 * 公式インポート用フォーマットの主要セル対応（セル番地は空欄・仮）
 * セル番地は管理画面＞Excel出力設定で、実物のExcelを確認して入力する
 */
export function createDefaultExcelCellMappings(
  templateId: string = 'tmpl-official-import'
): ExcelCellMapping[] {
  const rows: ExcelCellMapping[] = [];
  for (const item of DEFAULT_PL_ITEMS) {
    for (const p of DEFAULT_PERIODS) {
      rows.push({
        id: `cm-default-${item.field}-${p.key}`,
        templateId,
        sheetName: 'PL損益計算書・収益計画',
        cell: '',
        valuePath: `periods.${p.key}.pl.${item.field}`,
        note: `${p.label} ${item.label}（セル番地は実物のExcelで確認して入力）`,
        isTentative: true,
      });
    }
  }
  return rows;
}

