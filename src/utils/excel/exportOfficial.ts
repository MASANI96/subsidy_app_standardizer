import ExcelJS from 'exceljs';
import type { Project, ExcelTemplateDefinition, ExcelCellMapping } from '../../types';
import type { evaluateRequirements } from '../financialCalculations';
import { applySimulation } from '../planSimulation';
import { getFileFromIndexedDB } from '../storageService';
import { getValueByPath } from './valuePath';

/**
 * 公式インポート用フォーマットのExcelファイルを出力する
 *
 * @param project 対象の案件データ
 * @param template 使用するExcelテンプレート定義
 * @param mappings Excelセル対応定義一覧
 * @param evalResult 財務要件判定結果
 * @returns 生成されたBlobおよび警告メッセージ一覧
 */
export async function exportOfficialFormat(
  project: Project,
  template: ExcelTemplateDefinition,
  mappings: ExcelCellMapping[],
  evalResult: ReturnType<typeof evaluateRequirements>
): Promise<{ blob: Blob; warnings: string[] }> {
  if (!template.fileRecordId) {
    throw new Error('ひな形が未登録です。管理画面＞Excel出力設定で登録してください');
  }

  const warnings: string[] = [];

  // 1. 出力前チェック：要件判定
  if (!evalResult.isVAPassed) {
    warnings.push(`【要件未達】付加価値額CAGR (${evalResult.vaCAGR}%) が要件を満たしていません。`);
  }
  if (!evalResult.isWagePassed) {
    warnings.push(`【要件未達】給与総額/一人当たり給与CAGR (${evalResult.wageCAGR}%) が要件を満たしていません。`);
  }
  if (!evalResult.isMinWagePassed) {
    warnings.push(
      `【要件未達】事業場内最低賃金と地域別最低賃金の差額 (${evalResult.minWageDiff}円) が要件を満たしていません。`
    );
  }
  if (!evalResult.isNearTermWagePassed) {
    warnings.push(
      `【要件未達】足下の給与伸び率 (${evalResult.nearTermWageGrowthRate}%) が物価上昇率を満たしていません。`
    );
  }
  if (!evalResult.isSubsidyWithinCap) {
    warnings.push('【要件未達】補助金申請額が上限額を超過しています。');
  }
  if (!evalResult.isMinSubsidyPassed) {
    warnings.push('【要件未達】補助金申請額が下限額未満です。');
  }

  // 2. 出力前チェック：シミュレーションエラー
  if (project.financialMaster?.simulation?.enabled) {
    const simResult = applySimulation(project.financialMaster);
    if (Array.isArray(simResult.errors) && simResult.errors.length > 0) {
      simResult.errors.forEach((err) => {
        warnings.push(`【シミュレーションエラー】${err}`);
      });
    }
  } else if (Array.isArray((project.financialMaster?.simulation as any)?.errors)) {
    (project.financialMaster.simulation as any).errors.forEach((err: string) => {
      warnings.push(`【シミュレーションエラー】${err}`);
    });
  }

  // 3. 出力前チェック：1年当たり売上見込額の差異
  if (project.financialMaster?.annualSalesEstimate?.hasMismatch) {
    warnings.push('【売上見込乖離】1年当たり売上見込額と算出根拠の間に差異があります。');
  }

  // 4. IndexedDB からテンプレートファイルを取得
  const fileRecord = await getFileFromIndexedDB(template.fileRecordId);
  if (!fileRecord || !fileRecord.data) {
    throw new Error('登録されているひな形ファイルをストレージから読み込めませんでした。');
  }

  let arrayBuffer: ArrayBuffer;
  if (fileRecord.data instanceof ArrayBuffer) {
    arrayBuffer = fileRecord.data;
  } else if (fileRecord.data instanceof Blob) {
    arrayBuffer = await fileRecord.data.arrayBuffer();
  } else {
    throw new Error('ひな形ファイルのバイナリデータ形式が不正です。');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  // 5. 該当テンプレートのマッピングを抽出
  const targetMappings = mappings.filter((m) => m.templateId === template.id);

  // セル対応が1件も無い場合
  if (targetMappings.length === 0) {
    warnings.push(
      `【セル対応未設定】ひな形「${template.name}」のセル対応が1件も登録されていないため、値は書き込まれていません（ひな形のまま出力されます）。管理画面＞Excel出力設定で登録してください。`
    );
  }

  // セル番地が空欄の対応はまとめて1件の警告にする
  const unsetCellMappings = targetMappings.filter((m) => !m.cell || !m.cell.trim());
  if (unsetCellMappings.length > 0) {
    const examples = unsetCellMappings
      .slice(0, 3)
      .map((m) => m.note || m.valuePath)
      .join(' / ');
    warnings.push(
      `【セル番地未設定】${unsetCellMappings.length}件のセル対応はセル番地が空欄のためスキップしました（例: ${examples}）。`
    );
  }

  // 出力前チェック：isTentative が true のセル対応（セル番地が入っているもののみ）
  targetMappings.forEach((m) => {
    if (m.isTentative && m.cell && m.cell.trim()) {
      warnings.push(
        `【仮値対応】セル [${m.sheetName}!${m.cell}] (参照: ${m.valuePath}) は「仮」として設定されています。`
      );
    }
  });

  // 6. 各セルに値を書き込む
  let writtenCount = 0;
  for (const mapping of targetMappings) {
    if (!mapping.cell || !mapping.cell.trim()) {
      continue; // 上でまとめて警告済み
    }
    const worksheet = workbook.getWorksheet(mapping.sheetName);
    if (!worksheet) {
      warnings.push(
        `シート「${mapping.sheetName}」が見つからないため、セル「${mapping.cell}」への書き込みをスキップしました。`
      );
      continue;
    }

    let cell: ExcelJS.Cell;
    try {
      cell = worksheet.getCell(mapping.cell.trim());
    } catch {
      warnings.push(
        `セル番地「${mapping.cell}」が不正なため、「${mapping.sheetName}」への書き込みをスキップしました。`
      );
      continue;
    }

    // 書き込み先のセルに数式があれば書き込まず警告に追加
    if (cell.formula || (cell as any).sharedFormula) {
      warnings.push(
        `セル「${mapping.sheetName}!${mapping.cell}」には数式が設定されているため書き込みをスキップしました。`
      );
      continue;
    }

    const rawValue = getValueByPath(project.financialMaster, mapping.valuePath);
    if (rawValue === undefined || rawValue === null) {
      warnings.push(
        `パス「${mapping.valuePath}」の値を取得できなかったため、セル「${mapping.sheetName}!${mapping.cell}」はスキップされました。`
      );
      continue;
    }

    // 値の変換: boolean は 'はい' / 'いいえ'、金額は円の整数のまま（公式フォーマットは円単位）
    let cellValue: any = rawValue;
    if (typeof rawValue === 'boolean') {
      cellValue = rawValue ? 'はい' : 'いいえ';
    }

    // 書式・入力規則には触れず値のみ設定
    cell.value = cellValue;
    writtenCount++;
  }

  if (targetMappings.length > 0 && writtenCount === 0) {
    warnings.push('【書き込み0件】書き込まれたセルが1件もありません。ひな形のまま出力されています。');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { blob, warnings };
}
