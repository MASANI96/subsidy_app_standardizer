/**
 * AIサービス層 (AI Service)
 * 厳守事項:
 * 外部API（Gemini）は実際には呼ばず、すべてサンプルデータとダミー処理で動作を再現。
 * 呼び出し箇所はこの1つのサービス層に集約し、後で実APIに差し替えられる構造にする。
 * AIの役割は「決算書の読み取り」と「説明文の下書き」のみ（数値計算・生成は一切行わない）。
 */

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

class AIService {
  private static instance: AIService;

  private constructor() {
    // 将来の実APIキーやクライアント初期化用
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * 決算書PDF / 画像等からの財務数値読み取り（ダミー確定的処理）
   * 実装時はGemini 2.5 Flash / Pro による構造化抽出APIに差し替え可能
   */
  public async extractFinancialsFromDocument(
    _fileData: ArrayBuffer | Blob | string,
    fileName: string
  ): Promise<FinancialExtractionResult> {
    // 擬似的なネットワーク遅延をわずかにエミュレート (UI体感用)
    await new Promise((r) => setTimeout(r, 400));

    return {
      companyName: '株式会社○○',
      fiscalPeriod: '2026年3月期',
      extractedItems: {
        sales: 2450000000,
        costOfSales: 1820000000,
        sga: 480000000,
        operatingProfit: 150000000,
        laborCost: 320000000,
        depreciation: 65000000,
      },
      confidence: 'high',
      notes: [
        `ファイル「${fileName}」から貸借対照表・損益計算書を読み取りました（モック処理）。`,
        '公式インポートフォーマット行ラベルにマッピング済みです。',
      ],
    };
  }

  /**
   * 申請書説明文の下書き作成（ダミー確定的処理）
   * 実装時はGemini generateContent によるテキスト生成に差し替え可能
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
