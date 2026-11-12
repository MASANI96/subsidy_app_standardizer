import ExcelJS from 'exceljs';
import type {
  Project,
  DisplayCurrencyUnit,
  RoundingMode,
  PeriodKey,
  ForecastPeriodKey,
} from '../../types';
import type { evaluateRequirements } from '../financialCalculations';
import { getUnitLabel } from '../financialCalculations';

/**
 * 金額（円単位）を表示単位（円・千円・万円）に換算し、指定の端数処理を行った数値を返す
 */
function convertAmountToUnit(
  amountInYen: number,
  unit: DisplayCurrencyUnit = 'manYen',
  rounding: RoundingMode = 'floor'
): number {
  if (amountInYen === null || amountInYen === undefined || Number.isNaN(amountInYen)) {
    return 0;
  }
  const isNegative = amountInYen < 0;
  const absAmount = Math.abs(amountInYen);
  let converted = absAmount;
  if (unit === 'thousandYen') {
    converted = absAmount / 1000;
  } else if (unit === 'manYen') {
    converted = absAmount / 10000;
  }
  const rounded = rounding === 'floor' ? Math.floor(converted) : Math.round(converted);
  return isNegative ? -rounded : rounded;
}

/**
 * ワークシートの全列幅および見出しスタイルの共通適用
 */
function applySheetStyles(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((col, idx) => {
    col.width = idx === 0 ? 28 : 16;
  });
}

/**
 * 見出しセルにスタイル（太字、薄い灰色背景、罫線）を設定
 */
function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F4F7' },
    };
    cell.alignment = { vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD0D5DD' } },
      left: { style: 'thin', color: { argb: 'FFD0D5DD' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D5DD' } },
      right: { style: 'thin', color: { argb: 'FFD0D5DD' } },
    };
  });
}

/**
 * 顧客説明用サマリーExcelファイル（4シート構成）を出力する
 *
 * @param project 対象の案件データ
 * @param evalResult 財務要件判定結果
 * @param unit 表示金額単位
 * @param rounding 端数処理方式
 * @returns 生成されたBlob
 */
export async function exportSummary(
  project: Project,
  evalResult: ReturnType<typeof evaluateRequirements>,
  unit: DisplayCurrencyUnit,
  rounding: RoundingMode
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const fm = project.financialMaster;
  const unitLabel = getUnitLabel(unit);

  // 表示する期間列の算出
  const visiblePeriods: { key: PeriodKey; label: string; subLabel: string }[] = [
    { key: 'yMinus2', label: '2期前', subLabel: '実績 (Y-2)' },
    { key: 'yMinus1', label: '1期前', subLabel: '実績 (Y-1)' },
    { key: 'y0', label: '直近', subLabel: '直近実績 (Y0)' },
    { key: 'currentFY', label: '申請時事業年度', subLabel: '進行期' },
    { key: 'baseFY', label: '基準年度', subLabel: '事業完了期' },
    { key: 'p1', label: '計画1年目', subLabel: '事業化1年目' },
    { key: 'p2', label: '計画2年目', subLabel: '事業化2年目' },
    { key: 'p3', label: '計画3年目', subLabel: '事業化3年目' },
  ];
  if (fm.planningYears >= 4) {
    visiblePeriods.push({ key: 'p4', label: '計画4年目', subLabel: '事業化4年目' });
  }
  if (fm.planningYears >= 5) {
    visiblePeriods.push({ key: 'p5', label: '計画5年目', subLabel: '事業化5年目' });
  }

  const targetPeriodKey: PeriodKey =
    fm.planningYears === 3 ? 'p3' : fm.planningYears === 4 ? 'p4' : 'p5';

  const baseFYInfo = fm.periods.baseFY.fiscalInfo;
  const targetPeriodInfo = fm.periods[targetPeriodKey].fiscalInfo;

  // ----------------------------------------------------
  // シート1: 「計画サマリー」
  // ----------------------------------------------------
  const sheetSummary = workbook.addWorksheet('計画サマリー');
  sheetSummary.views = [{ showGridLines: true }];

  sheetSummary.addRow(['【基本情報】', '']);
  const trackName =
    project.appliedTrackId === 'kakushin'
      ? '革新的新製品・サービス枠'
      : project.appliedTrackId === 'shinjigyo'
        ? '新事業進出枠'
        : project.appliedTrackId === 'global'
          ? 'グローバル枠'
          : project.appliedTrackId;

  sheetSummary.addRow(['社名', project.companyName]);
  sheetSummary.addRow(['申請枠', trackName]);
  sheetSummary.addRow(['事業計画期間', `${fm.planningYears}年間`]);
  sheetSummary.addRow([
    '基準年度',
    `${baseFYInfo.label} (${baseFYInfo.fiscalYear}年${baseFYInfo.fiscalMonth}月期)`,
  ]);
  sheetSummary.addRow(['賃上げ特例の有無', fm.isWageSpecialApplied ? 'あり' : 'なし']);
  sheetSummary.addRow([
    '従業員数の数え方',
    fm.employeeCountMethod === 'koboOfficial' ? '公募要領方式' : '期末人数方式',
  ]);
  sheetSummary.addRow(['表示単位', unitLabel]);
  sheetSummary.addRow([]);

  // 主要指標
  sheetSummary.addRow(['【主要指標】', `基準年度 (${baseFYInfo.label})`, `目標年度 (${targetPeriodInfo.label})`, '伸び率 (CAGR)']);
  const summaryHeaderRow = sheetSummary.lastRow!;
  styleHeaderRow(summaryHeaderRow);

  const baseSales = convertAmountToUnit(fm.periods.baseFY.pl.totalSales, unit, rounding);
  const targetSales = convertAmountToUnit(fm.periods[targetPeriodKey].pl.totalSales, unit, rounding);

  const baseVA = convertAmountToUnit(fm.periods.baseFY.pl.valueAdded, unit, rounding);
  const targetVA = convertAmountToUnit(fm.periods[targetPeriodKey].pl.valueAdded, unit, rounding);

  const baseWage = convertAmountToUnit(fm.periods.baseFY.pl.perCapitaWage, 'yen', rounding);
  const targetWage = convertAmountToUnit(fm.periods[targetPeriodKey].pl.perCapitaWage, 'yen', rounding);

  const rowSales = sheetSummary.addRow(['売上高', baseSales, targetSales, '-']);
  rowSales.getCell(2).numFmt = '#,##0';
  rowSales.getCell(3).numFmt = '#,##0';

  const rowVA = sheetSummary.addRow(['付加価値額', baseVA, targetVA, `${evalResult.vaCAGR}%`]);
  rowVA.getCell(2).numFmt = '#,##0';
  rowVA.getCell(3).numFmt = '#,##0';

  const rowWage = sheetSummary.addRow(['一人当たり給与 (円/人)', baseWage, targetWage, `${evalResult.wageCAGR}%`]);
  rowWage.getCell(2).numFmt = '#,##0';
  rowWage.getCell(3).numFmt = '#,##0';

  sheetSummary.addRow([]);

  // 要件判定
  sheetSummary.addRow(['【要件判定結果】', '判定', '実績 / 計画値', '要件']);
  const reqHeaderRow = sheetSummary.lastRow!;
  styleHeaderRow(reqHeaderRow);

  sheetSummary.addRow(['付加価値額年率伸び率 (CAGR)', evalResult.isVAPassed ? '○' : '×', `${evalResult.vaCAGR}%`, '要件値以上']);
  sheetSummary.addRow(['給与総額/一人当たり給与年率伸び率 (CAGR)', evalResult.isWagePassed ? '○' : '×', `${evalResult.wageCAGR}%`, '要件値以上']);
  sheetSummary.addRow(['事業場内最低賃金', evalResult.isMinWagePassed ? '○' : '×', `地域最賃 +${evalResult.minWageDiff}円`, '地域最賃 +規定差額以上']);
  sheetSummary.addRow(['足下の給与伸び率', evalResult.isNearTermWagePassed ? '○' : '×', `${evalResult.nearTermWageGrowthRate}%`, `物価上昇率 (${evalResult.inflationRate}%) 以上`]);
  sheetSummary.addRow(['補助上限判定', evalResult.isSubsidyWithinCap ? '○' : '×', '上限額以内', '上限以内']);
  sheetSummary.addRow(['補助下限判定', evalResult.isMinSubsidyPassed ? '○' : '×', '下限額以上', '下限以上']);
  sheetSummary.addRow(['総合判定', evalResult.isAllPassed ? '○ (適合)' : '× (不適合)', '', '']);

  applySheetStyles(sheetSummary);

  // ----------------------------------------------------
  // シート2: 「損益計画」
  // ----------------------------------------------------
  const sheetPL = workbook.addWorksheet('損益計画');
  sheetPL.views = [{ showGridLines: true }];

  // ヘッダー行
  const plHeaderTitles = [
    `科目 (単位: ${unitLabel})`,
    ...visiblePeriods.map((p) => `${p.label} (${p.subLabel})`),
  ];
  sheetPL.addRow(plHeaderTitles);
  styleHeaderRow(sheetPL.lastRow!);

  // 行定義
  const plRowDefinitions: {
    label: string;
    getValue: (p: PeriodKey) => number;
    isBold?: boolean;
  }[] = [
    {
      label: '既存事業 売上高',
      getValue: (k) => fm.periods[k].pl.existingBusiness.sales,
    },
    {
      label: '補助事業 売上高',
      getValue: (k) => fm.periods[k].pl.subsidyBusiness.sales,
    },
    {
      label: '売上高 合計',
      getValue: (k) => fm.periods[k].pl.totalSales,
      isBold: true,
    },
    {
      label: '売上原価',
      getValue: (k) => fm.periods[k].pl.totalCostOfSales,
    },
    {
      label: '売上総利益',
      getValue: (k) => fm.periods[k].pl.totalGrossProfit,
      isBold: true,
    },
    {
      label: '販売費及び一般管理費',
      getValue: (k) => fm.periods[k].pl.totalSga,
    },
    {
      label: '営業利益',
      getValue: (k) => fm.periods[k].pl.totalOperatingProfit,
      isBold: true,
    },
    {
      label: '営業外収益',
      getValue: (k) => fm.periods[k].pl.nonOperatingIncome,
    },
    {
      label: '営業外費用',
      getValue: (k) => fm.periods[k].pl.nonOperatingExpenses,
    },
    {
      label: '経常利益',
      getValue: (k) => fm.periods[k].pl.ordinaryProfit,
      isBold: true,
    },
    {
      label: '（内訳）人件費',
      getValue: (k) => fm.periods[k].pl.laborCost,
    },
    {
      label: '（内訳）減価償却費',
      getValue: (k) => fm.periods[k].pl.depreciation,
    },
    {
      label: '付加価値額',
      getValue: (k) => fm.periods[k].pl.valueAdded,
      isBold: true,
    },
  ];

  for (const def of plRowDefinitions) {
    const rowValues = [
      def.label,
      ...visiblePeriods.map((p) =>
        convertAmountToUnit(def.getValue(p.key), unit, rounding)
      ),
    ];
    const row = sheetPL.addRow(rowValues);
    if (def.isBold) {
      row.getCell(1).font = { bold: true };
    }
    for (let c = 2; c <= rowValues.length; c++) {
      const cell = row.getCell(c);
      cell.numFmt = '#,##0';
      if (def.isBold) {
        cell.font = { bold: true };
      }
    }
  }

  applySheetStyles(sheetPL);

  // ----------------------------------------------------
  // シート3: 「人員・給与計画」
  // ----------------------------------------------------
  const sheetHR = workbook.addWorksheet('人員・給与計画');
  sheetHR.views = [{ showGridLines: true }];

  const hrHeaderTitles = [
    '項目',
    ...visiblePeriods.map((p) => `${p.label} (${p.subLabel})`),
  ];
  sheetHR.addRow(hrHeaderTitles);
  styleHeaderRow(sheetHR.lastRow!);

  // 従業員数 (人)
  const empRow = sheetHR.addRow([
    '従業員数 (人)',
    ...visiblePeriods.map((p) => fm.periods[p.key].pl.numberOfEmployees),
  ]);
  for (let c = 2; c <= visiblePeriods.length + 1; c++) {
    empRow.getCell(c).numFmt = '#,##0.0';
  }

  // 給与支給総額
  const totalWagesRow = sheetHR.addRow([
    `給与支給総額 (単位: ${unitLabel})`,
    ...visiblePeriods.map((p) =>
      convertAmountToUnit(fm.periods[p.key].pl.totalWages, unit, rounding)
    ),
  ]);
  for (let c = 2; c <= visiblePeriods.length + 1; c++) {
    totalWagesRow.getCell(c).numFmt = '#,##0';
  }

  // 一人当たり給与 (円/人)
  const perCapitaRow = sheetHR.addRow([
    '一人当たり給与 (円/人)',
    ...visiblePeriods.map((p) => fm.periods[p.key].pl.perCapitaWage),
  ]);
  for (let c = 2; c <= visiblePeriods.length + 1; c++) {
    perCapitaRow.getCell(c).numFmt = '#,##0';
  }

  // 役員数 (人)
  const dirCountRow = sheetHR.addRow([
    '役員数 (人)',
    ...visiblePeriods.map((p) => fm.periods[p.key].pl.numberOfDirectors),
  ]);
  for (let c = 2; c <= visiblePeriods.length + 1; c++) {
    dirCountRow.getCell(c).numFmt = '#,##0';
  }

  // 役員報酬
  const dirRemunRow = sheetHR.addRow([
    `役員報酬 (単位: ${unitLabel})`,
    ...visiblePeriods.map((p) =>
      convertAmountToUnit(fm.periods[p.key].pl.directorRemuneration, unit, rounding)
    ),
  ]);
  for (let c = 2; c <= visiblePeriods.length + 1; c++) {
    dirRemunRow.getCell(c).numFmt = '#,##0';
  }

  // 事業場内最低賃金 (円)
  const wpMinRow = sheetHR.addRow([
    '事業場内最低賃金 (円)',
    ...visiblePeriods.map((p) => fm.periods[p.key].pl.workplaceMinWage),
  ]);
  for (let c = 2; c <= visiblePeriods.length + 1; c++) {
    wpMinRow.getCell(c).numFmt = '#,##0';
  }

  // 地域別最低賃金 (円)
  const regMinRow = sheetHR.addRow([
    '地域別最低賃金 (円)',
    ...visiblePeriods.map((p) => fm.periods[p.key].pl.regionalMinWage),
  ]);
  for (let c = 2; c <= visiblePeriods.length + 1; c++) {
    regMinRow.getCell(c).numFmt = '#,##0';
  }

  // simulation が有効な場合の追加行（期中増員数・一人当たり給与伸び率）
  if (fm.simulation && fm.simulation.enabled) {
    const isForecast = (k: PeriodKey): k is ForecastPeriodKey =>
      ['currentFY', 'baseFY', 'p1', 'p2', 'p3', 'p4', 'p5'].includes(k);

    // 期中増員数
    const headcountValues = visiblePeriods.map((p) => {
      if (isForecast(p.key) && fm.simulation.headcountIncrease) {
        return fm.simulation.headcountIncrease[p.key] ?? '-';
      }
      return '-';
    });
    sheetHR.addRow(['【シミュレーション】期中増員数 (人)', ...headcountValues]);

    // 一人当たり給与の伸び率 (%)
    const wageGrowthValues = visiblePeriods.map((p) => {
      if (isForecast(p.key) && fm.simulation.perCapitaWageGrowthRate) {
        const rate = fm.simulation.perCapitaWageGrowthRate[p.key];
        return rate !== undefined && rate !== null ? `${rate}%` : '-';
      }
      return '-';
    });
    sheetHR.addRow(['【シミュレーション】給与伸び率 (%)', ...wageGrowthValues]);
  }

  applySheetStyles(sheetHR);

  // ----------------------------------------------------
  // シート4: 「設備投資・減価償却計画」
  // ----------------------------------------------------
  const sheetInv = workbook.addWorksheet('設備投資・減価償却計画');
  sheetInv.views = [{ showGridLines: true }];

  // 1. 設備投資計画サマリー
  sheetInv.addRow([`【設備投資計画】 (単位: ${unitLabel})`, '']);
  const invHeaderRow = sheetInv.lastRow!;
  invHeaderRow.getCell(1).font = { bold: true };

  const invItems: { label: string; yenValue: number }[] = [
    { label: '機械装置・システム投資額', yenValue: fm.investment.newMachineryInvestment },
    { label: '無形固定資産投資額', yenValue: fm.investment.intangibleAssetInvestment },
    { label: '研究開発費', yenValue: fm.investment.rdCost },
    { label: '人材育成費', yenValue: fm.investment.humanResourceDevelopmentCost },
    { label: '設備投資額 合計', yenValue: fm.investment.totalInvestmentYen },
    { label: '補助金申請額', yenValue: fm.investment.subsidyRequestedYen },
    { label: '自己資金', yenValue: fm.investment.ownFundsYen },
    { label: '金融機関借入金', yenValue: fm.investment.bankLoansYen },
    { label: 'その他調達資金', yenValue: fm.investment.otherFundsYen },
  ];

  for (const item of invItems) {
    const converted = convertAmountToUnit(item.yenValue, unit, rounding);
    const row = sheetInv.addRow([item.label, converted]);
    row.getCell(2).numFmt = '#,##0';
    if (item.label.includes('合計') || item.label.includes('補助金申請額')) {
      row.font = { bold: true };
    }
  }

  sheetInv.addRow(['減価償却方法', fm.investment.depreciationMethod === 'straight-line' ? '定額法' : '定率法']);
  sheetInv.addRow(['法定耐用年数', `${fm.investment.usefulLifeYears}年`]);
  sheetInv.addRow([]);

  // 2. 計画資産一覧 (simulation.assets)
  sheetInv.addRow(['【シミュレーション対象資産一覧】', '', '', '', '']);
  sheetInv.addRow([
    '資産名',
    `取得価額 (${unitLabel})`,
    '取得年月',
    '耐用年数 (年)',
    '負担区分',
  ]);
  const assetHeaderRow = sheetInv.lastRow!;
  styleHeaderRow(assetHeaderRow);

  const assets = fm.simulation?.assets || [];
  if (assets.length === 0) {
    sheetInv.addRow(['（登録資産なし）', '', '', '', '']);
  } else {
    for (const asset of assets) {
      const convertedCost = convertAmountToUnit(asset.acquisitionCostYen, unit, rounding);
      const allocLabel =
        asset.allocation === 'subsidyOnly'
          ? '補助事業専従'
          : asset.allocation === 'salesRatio'
            ? '売上按分'
            : '既存事業のみ';

      const row = sheetInv.addRow([
        asset.name,
        convertedCost,
        asset.acquisitionYm,
        asset.usefulLifeYears,
        allocLabel,
      ]);
      row.getCell(2).numFmt = '#,##0';
    }
  }

  applySheetStyles(sheetInv);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
