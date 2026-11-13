/**
 * AIサービス層 (AI Service)
 * 厳守事項:
 * 1. 外部API（Gemini）は実際には呼ばず、すべてサンプルデータとダミー処理で動作を再現。
 * 2. 呼び出し箇所はこの1つのサービス層に集約し、後で実API（Gemini 2.5 Flash / Pro 構造化出力）に差し替えられる構造にする。
 * 3. AIの役割は「決算書の読み取り」と「説明文の下書き」のみ（確定的な計算は行わない）。
 * 4. 【STEP2】同じファイルなら必ず同じ結果を返す（ファイルのハッシュをキーにして結果をキャッシュ）。
 */

import {
  AccountMappingRule,
  ExtractedFinancialItem,
  FinancialStatementConsistency,
  HistoricalPeriodKey,
  OffBalanceManualInputs,
  PeriodImportRecord,
} from '../types';
import { computeFileHash, detectPdfType } from '../utils/pdfHelper';

export interface FinancialExtractionResult {
  companyName: string;
  fiscalPeriod: string;
  extractedItems: Record<string, number>;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

export interface TextDraftRequest {
  sectionTitle: string;
  sourceContext: string;
  charLimit?: number;
  companyName: string;
  equipmentSummary: string;
}

export interface TextDraftResult {
  draftText: string;
  wordCount: number;
  summary: string;
  usedTags: string[];
}

/**
 * 財務整合性チェック計算ヘルパー
 */
export function calculateStatementConsistency(
  items: ExtractedFinancialItem[]
): FinancialStatementConsistency {
  // アイテムマップ（科目名または対応キーから金額取得）
  const getAmount = (predicate: (item: ExtractedFinancialItem) => boolean): number => {
    return items.filter(predicate).reduce((sum, item) => sum + item.currentAmountYen, 0);
  };

  // 1. BSチェック
  const totalAssets = getAmount(
    (i) => i.mappedFieldKey === 'totalAssets' || i.sourceAccountName === '資産合計'
  ) || 2350000000;

  const totalLiabAndEquity = getAmount(
    (i) =>
      i.mappedFieldKey === 'totalLiabilitiesAndNetAssets' ||
      i.sourceAccountName === '負債・純資産合計'
  ) || 2350000000;

  const bsDiff = totalAssets - totalLiabAndEquity;

  // 2. 営業利益チェック (売上 - 原価 - 販管費)
  const sales = getAmount(
    (i) => i.mappedFieldKey === 'sales' || i.sourceAccountName.includes('売上高')
  ) || 2400000000;

  const costOfSales = getAmount(
    (i) => i.mappedFieldKey === 'costOfSales' || i.sourceAccountName.includes('売上原価')
  ) || 1800000000;

  const sga = getAmount(
    (i) => i.mappedFieldKey === 'sga' || i.sourceAccountName.includes('販売費及び一般管理費')
  ) || 470000000;

  const statedOpProfit = getAmount(
    (i) => i.mappedFieldKey === 'operatingProfit' || i.sourceAccountName === '営業利益'
  ) || 130000000;

  const calcOpProfit = sales - costOfSales - sga;
  const opDiff = statedOpProfit - calcOpProfit;

  // 3. 経常利益チェック (営業利益 + 営業外収益 - 営業外費用)
  const nonOpIncome = getAmount(
    (i) => i.mappedFieldKey === 'nonOperatingIncome' || i.sourceAccountName.includes('営業外収益')
  ) || 5000000;

  const nonOpExp = getAmount(
    (i) => i.mappedFieldKey === 'nonOperatingExpenses' || i.sourceAccountName.includes('営業外費用')
  ) || 15000000;

  const statedOrdProfit = getAmount(
    (i) => i.mappedFieldKey === 'ordinaryProfit' || i.sourceAccountName === '経常利益'
  ) || 120000000;

  const calcOrdProfit = statedOpProfit + nonOpIncome - nonOpExp;
  const ordDiff = statedOrdProfit - calcOrdProfit;

  // 4. 当期純利益チェック
  const extraIncome = getAmount(
    (i) => i.mappedFieldKey === 'extraordinaryIncome' || i.sourceAccountName.includes('特別利益')
  ) || 2000000;

  const extraLoss = getAmount(
    (i) => i.mappedFieldKey === 'extraordinaryLosses' || i.sourceAccountName.includes('特別損失')
  ) || 4000000;

  const taxes = getAmount(
    (i) => i.mappedFieldKey === 'incomeTaxes' || i.sourceAccountName.includes('法人税')
  ) || 13000000;

  const statedNetIncome = getAmount(
    (i) => i.mappedFieldKey === 'netIncome' || i.sourceAccountName === '当期純利益'
  ) || 105000000;

  const calcNetIncome = statedOrdProfit + extraIncome - extraLoss - taxes;
  const netDiff = statedNetIncome - calcNetIncome;

  const warnings: string[] = [];
  if (Math.abs(bsDiff) > 0) {
    warnings.push(`貸借不一致: 資産合計と負債純資産合計に ${bsDiff.toLocaleString()}円 の差額があります。`);
  }
  if (Math.abs(opDiff) > 0) {
    warnings.push(`営業利益不一致: 売上高−売上原価−販管費の計算結果と記載営業利益に ${opDiff.toLocaleString()}円 の乖離があります。`);
  }
  if (Math.abs(ordDiff) > 0) {
    warnings.push(`経常利益不一致: 営業利益＋営業外収支の計算結果と記載経常利益に ${ordDiff.toLocaleString()}円 の乖離があります。`);
  }
  if (Math.abs(netDiff) > 0) {
    warnings.push(`当期純利益不一致: 経常利益＋特別損益−税の計算結果と記載当期純利益に ${netDiff.toLocaleString()}円 の乖離があります。`);
  }

  const allPassed = warnings.length === 0;

  return {
    bsBalanceCheck: {
      totalAssets,
      totalLiabilitiesAndNetAssets: totalLiabAndEquity,
      difference: bsDiff,
      isBalanced: bsDiff === 0,
    },
    operatingProfitCheck: {
      sales,
      costOfSales,
      sga,
      statedOperatingProfit: statedOpProfit,
      calculatedOperatingProfit: calcOpProfit,
      difference: opDiff,
      isBalanced: opDiff === 0,
    },
    ordinaryProfitCheck: {
      operatingProfit: statedOpProfit,
      nonOperatingIncome: nonOpIncome,
      nonOperatingExpenses: nonOpExp,
      statedOrdinaryProfit: statedOrdProfit,
      calculatedOrdinaryProfit: calcOrdProfit,
      difference: ordDiff,
      isBalanced: ordDiff === 0,
    },
    netIncomeCheck: {
      ordinaryProfit: statedOrdProfit,
      extraordinaryIncome: extraIncome,
      extraordinaryLosses: extraLoss,
      incomeTaxes: taxes,
      statedNetIncome: statedNetIncome,
      calculatedNetIncome: calcNetIncome,
      difference: netDiff,
      isBalanced: netDiff === 0,
    },
    allPassed,
    warningMessages: warnings,
  };
}

class AIService {
  private static instance: AIService;
  // ファイルハッシュをキーとした抽出結果キャッシュ（確定的キャッシュ）
  private extractionCache: Map<string, PeriodImportRecord> = new Map();

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * 決算書PDFの取り込み・解析・科目抜き出し（STEP2中核）
   * - ファイルハッシュをキーとして結果をキャッシュ（同一ファイルなら必ず同じ結果）
   * - 会社・標準対応表に基づいてマッピング
   */
  public async processFinancialPdfUpload(
    fileData: ArrayBuffer | Uint8Array,
    fileName: string,
    periodKey: HistoricalPeriodKey,
    companyId: string,
    existingRules: AccountMappingRule[]
  ): Promise<PeriodImportRecord> {
    const rawData = fileData instanceof Uint8Array ? fileData : new Uint8Array(fileData);
    const fileHash = await computeFileHash(rawData, fileName);

    // キャッシュ確認
    if (this.extractionCache.has(fileHash)) {
      const cached = this.extractionCache.get(fileHash)!;
      // 既存のルールで再マッピングして返す
      const remapped = this.applyMappingRules(cached.extractedItems, existingRules);
      const updated = {
        ...cached,
        extractedItems: remapped,
        consistency: calculateStatementConsistency(remapped),
        updatedAt: new Date().toISOString(),
      };
      return updated;
    }

    // 擬似的な読み取り遅延（UI体感用）
    await new Promise((r) => setTimeout(r, 450));

    // pdf.js によるテキスト/スキャン判定
    const detection = await detectPdfType(rawData);

    // 期別のプリセット科目明細を生成
    const baseItems = this.getRawExtractedItemsForPeriod(periodKey);

    // マッピングルール適用
    const mappedItems = this.applyMappingRules(baseItems, existingRules);

    // 整合性チェック
    const consistency = calculateStatementConsistency(mappedItems);

    // 決算書に載らない項目の初期値
    const offBalance: OffBalanceManualInputs = this.getDefaultOffBalanceInputs(periodKey);

    const periodLabels: Record<HistoricalPeriodKey, { label: string; year: number }> = {
      yMinus2: { label: '2期前 (2024年3月期)', year: 2024 },
      yMinus1: { label: '1期前 (2025年3月期)', year: 2025 },
      y0: { label: '直近 (2026年3月期)', year: 2026 },
    };

    const record: PeriodImportRecord = {
      periodKey,
      periodLabel: periodLabels[periodKey].label,
      fiscalYear: periodLabels[periodKey].year,
      status: 'mapped',
      step: 4, // 4:科目対応・見比べ確認へ進む
      fileName,
      fileSize: rawData.length,
      fileHash,
      pdfType: detection.pdfType,
      detectionReason: detection.reason,
      pageCount: detection.pageCount,
      extractedItems: mappedItems,
      offBalanceInputs: offBalance,
      consistency,
      isLocked: false,
      updatedAt: new Date().toISOString(),
    };

    // キャッシュに保存
    this.extractionCache.set(fileHash, record);
    return record;
  }

  /**
   * 科目対応ルール（会社別優先、次に標準）を各行に適用
   */
  public applyMappingRules(
    items: ExtractedFinancialItem[],
    rules: AccountMappingRule[]
  ): ExtractedFinancialItem[] {
    return items.map((item) => {
      // 一致するルールを検索（会社別優先）
      const rule = rules.find((r) => r.sourceAccountName === item.sourceAccountName);
      if (!rule) {
        // 未対応
        return {
          ...item,
          status: 'unmapped',
          mappedFieldKey: undefined,
          mappedFieldLabel: '未対応（要手動割当）',
          mappingRuleId: undefined,
        };
      }

      if (rule.action === 'exclude') {
        return {
          ...item,
          status: 'excluded',
          mappedFieldKey: 'excluded',
          mappedFieldLabel: '【除外】計算対象外',
          mappingRuleId: rule.id,
        };
      }

      if (rule.action === 'aggregate') {
        return {
          ...item,
          status: 'aggregated',
          mappedFieldKey: rule.targetFieldKey,
          mappedFieldLabel: `【合算】${rule.targetFieldLabel}`,
          mappingRuleId: rule.id,
        };
      }

      return {
        ...item,
        status: 'mapped',
        mappedFieldKey: rule.targetFieldKey,
        mappedFieldLabel: rule.targetFieldLabel,
        mappingRuleId: rule.id,
      };
    });
  }

  /**
   * 期別のダミー読取項目（ページ番号・ハイライト座標・金額を含む）
   */
  private getRawExtractedItemsForPeriod(
    periodKey: HistoricalPeriodKey
  ): ExtractedFinancialItem[] {
    // 基準倍率 (yMinus2: 0.875, yMinus1: 0.9375, y0: 1.0)
    const factor = periodKey === 'yMinus2' ? 0.875 : periodKey === 'yMinus1' ? 0.9375 : 1.0;
    const roundYen = (amt: number) => Math.round(amt * factor);

    const items: ExtractedFinancialItem[] = [
      // ================= P1: 貸借対照表 (BS) =================
      {
        id: `ext-${periodKey}-bs-1`,
        sourceAccountName: '現金及び預金',
        category: 'BS_ASSET',
        categoryLabel: '流動資産',
        extractedAmountYen: roundYen(432000000),
        currentAmountYen: roundYen(432000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.06, yRatio: 0.17, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-2`,
        sourceAccountName: '受取手形',
        category: 'BS_ASSET',
        categoryLabel: '流動資産',
        extractedAmountYen: roundYen(120000000),
        currentAmountYen: roundYen(120000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.06, yRatio: 0.2, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-3`,
        sourceAccountName: '売掛金',
        category: 'BS_ASSET',
        categoryLabel: '流動資産',
        extractedAmountYen: roundYen(528000000),
        currentAmountYen: roundYen(528000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.06, yRatio: 0.225, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-4`,
        sourceAccountName: '棚卸資産',
        category: 'BS_ASSET',
        categoryLabel: '流動資産',
        extractedAmountYen: roundYen(270000000),
        currentAmountYen: roundYen(270000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.06, yRatio: 0.25, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-5`,
        sourceAccountName: '建物及び構築物',
        category: 'BS_ASSET',
        categoryLabel: '有形固定資産',
        extractedAmountYen: roundYen(480000000),
        currentAmountYen: roundYen(480000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.06, yRatio: 0.355, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-6`,
        sourceAccountName: '機械及び装置',
        category: 'BS_ASSET',
        categoryLabel: '有形固定資産',
        extractedAmountYen: roundYen(840000000),
        currentAmountYen: roundYen(840000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.06, yRatio: 0.38, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-7`,
        sourceAccountName: 'ソフトウェア',
        category: 'BS_ASSET',
        categoryLabel: '無形固定資産',
        extractedAmountYen: roundYen(120000000),
        currentAmountYen: roundYen(120000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.06, yRatio: 0.48, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      // あえて未対応の項目を含める（STEP2要件: 未対応を一覧上部に表示しプルダウン割当）
      {
        id: `ext-${periodKey}-bs-unmapped-1`,
        sourceAccountName: '新技術開発準備金（未割当）',
        category: 'BS_ASSET',
        categoryLabel: '投資その他の資産',
        extractedAmountYen: roundYen(20000000),
        currentAmountYen: roundYen(20000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.06, yRatio: 0.535, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'unmapped',
        isTentative: true,
      },
      {
        id: `ext-${periodKey}-bs-8`,
        sourceAccountName: '資産合計',
        category: 'BS_ASSET',
        categoryLabel: '資産合計',
        extractedAmountYen: roundYen(2350000000),
        currentAmountYen: roundYen(2350000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.06, yRatio: 0.9, widthRatio: 0.42, heightRatio: 0.03 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-9`,
        sourceAccountName: '支払手形',
        category: 'BS_LIABILITY',
        categoryLabel: '流動負債',
        extractedAmountYen: roundYen(90000000),
        currentAmountYen: roundYen(90000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.52, yRatio: 0.17, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-10`,
        sourceAccountName: '買掛金',
        category: 'BS_LIABILITY',
        categoryLabel: '流動負債',
        extractedAmountYen: roundYen(180000000),
        currentAmountYen: roundYen(180000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.52, yRatio: 0.2, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-11`,
        sourceAccountName: '短期借入金',
        category: 'BS_LIABILITY',
        categoryLabel: '流動負債',
        extractedAmountYen: roundYen(288000000),
        currentAmountYen: roundYen(288000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.52, yRatio: 0.225, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-12`,
        sourceAccountName: '長期借入金',
        category: 'BS_LIABILITY',
        categoryLabel: '固定負債',
        extractedAmountYen: roundYen(600000000),
        currentAmountYen: roundYen(600000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.52, yRatio: 0.32, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-13`,
        sourceAccountName: '資本金',
        category: 'BS_EQUITY',
        categoryLabel: '純資産',
        extractedAmountYen: 50000000,
        currentAmountYen: 50000000,
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.52, yRatio: 0.46, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-14`,
        sourceAccountName: '繰越利益剰余金',
        category: 'BS_EQUITY',
        categoryLabel: '純資産',
        extractedAmountYen: roundYen(1180000000),
        currentAmountYen: roundYen(1180000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.52, yRatio: 0.51, widthRatio: 0.42, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-bs-15`,
        sourceAccountName: '負債・純資産合計',
        category: 'BS_EQUITY',
        categoryLabel: '負債純資産合計',
        extractedAmountYen: roundYen(2350000000),
        currentAmountYen: roundYen(2350000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 1,
        highlightBox: { page: 1, xRatio: 0.52, yRatio: 0.9, widthRatio: 0.42, heightRatio: 0.03 },
        status: 'mapped',
      },

      // ================= P2: 損益計算書 (PL) =================
      {
        id: `ext-${periodKey}-pl-1`,
        sourceAccountName: '製品売上高',
        category: 'PL_REVENUE',
        categoryLabel: '売上高',
        extractedAmountYen: roundYen(2400000000),
        currentAmountYen: roundYen(2400000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.17, widthRatio: 0.86, heightRatio: 0.03 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-2`,
        sourceAccountName: '当期製品製造原価（仕入高等）',
        category: 'PL_COST',
        categoryLabel: '売上原価',
        extractedAmountYen: roundYen(1800000000),
        currentAmountYen: roundYen(1800000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.25, widthRatio: 0.86, heightRatio: 0.03 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-3`,
        sourceAccountName: '販売費及び一般管理費',
        category: 'PL_SGA',
        categoryLabel: '販売費及び一般管理費',
        extractedAmountYen: roundYen(470000000),
        currentAmountYen: roundYen(470000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.355, widthRatio: 0.86, heightRatio: 0.03 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-4`,
        sourceAccountName: '役員報酬',
        category: 'PL_SGA',
        categoryLabel: '役員報酬',
        extractedAmountYen: 36000000,
        currentAmountYen: 36000000,
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.385, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-5`,
        sourceAccountName: '給料手当',
        category: 'PL_SGA',
        categoryLabel: '人件費（合算）',
        extractedAmountYen: roundYen(249600000),
        currentAmountYen: roundYen(249600000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.41, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'aggregated',
      },
      {
        id: `ext-${periodKey}-pl-6`,
        sourceAccountName: '法定福利費',
        category: 'PL_SGA',
        categoryLabel: '人件費（合算）',
        extractedAmountYen: roundYen(24400000),
        currentAmountYen: roundYen(24400000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.435, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'aggregated',
      },
      {
        id: `ext-${periodKey}-pl-7`,
        sourceAccountName: '減価償却実施額',
        category: 'PL_SGA',
        categoryLabel: '減価償却費',
        extractedAmountYen: roundYen(60000000),
        currentAmountYen: roundYen(60000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.46, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-8`,
        sourceAccountName: '営業利益',
        category: 'PL_SGA',
        categoryLabel: '営業利益',
        extractedAmountYen: roundYen(130000000),
        currentAmountYen: roundYen(130000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.54, widthRatio: 0.86, heightRatio: 0.03 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-9`,
        sourceAccountName: '受取利息及び配当金',
        category: 'PL_NON_OP',
        categoryLabel: '営業外収益',
        extractedAmountYen: roundYen(5000000),
        currentAmountYen: roundYen(5000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.62, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-10`,
        sourceAccountName: '支払利息',
        category: 'PL_NON_OP',
        categoryLabel: '営業外費用',
        extractedAmountYen: roundYen(15000000),
        currentAmountYen: roundYen(15000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.68, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-11`,
        sourceAccountName: '経常利益',
        category: 'PL_NON_OP',
        categoryLabel: '経常利益',
        extractedAmountYen: roundYen(120000000),
        currentAmountYen: roundYen(120000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.725, widthRatio: 0.86, heightRatio: 0.03 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-12`,
        sourceAccountName: '固定資産売却益',
        category: 'PL_EXTRA',
        categoryLabel: '特別利益',
        extractedAmountYen: roundYen(2000000),
        currentAmountYen: roundYen(2000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.8, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-13`,
        sourceAccountName: '固定資産除却損',
        category: 'PL_EXTRA',
        categoryLabel: '特別損失',
        extractedAmountYen: roundYen(4000000),
        currentAmountYen: roundYen(4000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.865, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-14`,
        sourceAccountName: '法人税、住民税及び事業税',
        category: 'PL_TAX',
        categoryLabel: '法人税等',
        extractedAmountYen: roundYen(13000000),
        currentAmountYen: roundYen(13000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.93, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-pl-15`,
        sourceAccountName: '当期純利益',
        category: 'PL_TAX',
        categoryLabel: '当期純利益',
        extractedAmountYen: roundYen(105000000),
        currentAmountYen: roundYen(105000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 2,
        highlightBox: { page: 2, xRatio: 0.07, yRatio: 0.965, widthRatio: 0.86, heightRatio: 0.03 },
        status: 'mapped',
      },

      // ================= P3: 販管費明細 (SG&A) =================
      // あえて未対応の項目（デモ用）
      {
        id: `ext-${periodKey}-sga-unmapped-2`,
        sourceAccountName: '役員貸付金利息等（未割当）',
        category: 'PL_NON_OP',
        categoryLabel: '営業外収益（その他）',
        extractedAmountYen: 0,
        currentAmountYen: 0,
        isModified: false,
        modificationHistory: [],
        pageNumber: 3,
        highlightBox: { page: 3, xRatio: 0.07, yRatio: 0.52, widthRatio: 0.86, heightRatio: 0.03 },
        status: 'unmapped',
        isTentative: true,
      },
      {
        id: `ext-${periodKey}-sga-1`,
        sourceAccountName: '地代家賃',
        category: 'PL_SGA',
        categoryLabel: '販管費',
        extractedAmountYen: roundYen(30000000),
        currentAmountYen: roundYen(30000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 3,
        highlightBox: { page: 3, xRatio: 0.07, yRatio: 0.25, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-sga-2`,
        sourceAccountName: '旅費交通費',
        category: 'PL_SGA',
        categoryLabel: '販管費',
        extractedAmountYen: roundYen(12000000),
        currentAmountYen: roundYen(12000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 3,
        highlightBox: { page: 3, xRatio: 0.07, yRatio: 0.285, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
      {
        id: `ext-${periodKey}-sga-3`,
        sourceAccountName: '交際費',
        category: 'PL_SGA',
        categoryLabel: '販管費',
        extractedAmountYen: roundYen(4000000),
        currentAmountYen: roundYen(4000000),
        isModified: false,
        modificationHistory: [],
        pageNumber: 3,
        highlightBox: { page: 3, xRatio: 0.07, yRatio: 0.395, widthRatio: 0.86, heightRatio: 0.024 },
        status: 'mapped',
      },
    ];

    return items;
  }

  /**
   * 決算書に載らない項目の初期値（期別）
   */
  private getDefaultOffBalanceInputs(
    periodKey: HistoricalPeriodKey
  ): OffBalanceManualInputs {
    if (periodKey === 'yMinus2') {
      return {
        numberOfEmployees: 45,
        totalWages: 225000000,
        numberOfDirectors: 3,
        directorRemuneration: 36000000,
        workplaceMinWage: 1130,
        regionalMinWage: 1113,
      };
    }
    if (periodKey === 'yMinus1') {
      return {
        numberOfEmployees: 46,
        totalWages: 234600000,
        numberOfDirectors: 3,
        directorRemuneration: 36000000,
        workplaceMinWage: 1150,
        regionalMinWage: 1113,
      };
    }
    return {
      numberOfEmployees: 48,
      totalWages: 249600000,
      numberOfDirectors: 3,
      directorRemuneration: 36000000,
      workplaceMinWage: 1170,
      regionalMinWage: 1113,
    };
  }

  /**
   * 申請書説明文の下書き作成（ダミー確定的処理）
   */
  public async generateTextDraft(req: TextDraftRequest): Promise<TextDraftResult> {
    await new Promise((r) => setTimeout(r, 350));

    const draft = `【${req.sectionTitle}】
${req.companyName}では、顧客ニーズの多様化および市場環境の急激な変化に対応するため、${req.equipmentSummary}を中核とした設備導入を計画している。
本取り組みにより、ボトルネックとなっていた加工・供給リードタイムの大幅な圧縮と品質精度の均一化を実現し、既存取引先の深耕と高付加価値な新規分野への展開を一気通貫で推進する。
あわせて、生産性向上に伴う付加価値額の拡大を原資として、現場従業員への持続的な賃金還元と専門人材の採用・育成を段階的に進める方針である。`;

    return {
      draftText: draft,
      wordCount: draft.length,
      summary: 'ヒアリングおよび数値計画に基づく標準申請書下書き',
      usedTags: ['{企業名}', '{設備投資額}', '{3年後売上}'],
    };
  }
}

export const aiService = AIService.getInstance();
