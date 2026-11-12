import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Info,
  Layers,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Unlock,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AccountMappingAction,
  AccountMappingRule,
  DisplayCurrencyUnit,
  ExtractedFinancialItem,
  HistoricalPeriodKey,
  OffBalanceManualInputs,
  PeriodImportRecord,
  Project,
  Role,
  RoundingMode,
} from '../types';
import { formatMoney, getUnitLabel } from '../utils/financialCalculations';
import {
  generateDemoFinancialStatementPdf,
  renderFallbackFinancialPageToCanvas,
  renderPdfPageToCanvas,
} from '../utils/pdfHelper';
import { getFileFromIndexedDB } from '../utils/storageService';

interface FinancialStatementImportViewProps {
  project: Project;
  role: Role;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  standardAccountMappings: AccountMappingRule[];
  companyAccountMappings: AccountMappingRule[];
  onUploadPdf: (
    projectId: string,
    periodKey: HistoricalPeriodKey,
    fileData: ArrayBuffer | Uint8Array,
    fileName: string
  ) => Promise<any>;
  onUpdateItemAmount: (
    projectId: string,
    periodKey: HistoricalPeriodKey,
    itemId: string,
    newAmountYen: number,
    editorRole: string,
    reason?: string
  ) => void;
  onAssignMapping: (
    projectId: string,
    periodKey: HistoricalPeriodKey,
    itemId: string,
    action: AccountMappingAction,
    targetFieldKey: string,
    targetFieldLabel: string
  ) => void;
  onUpdateOffBalance: (
    projectId: string,
    periodKey: HistoricalPeriodKey,
    inputs: Partial<OffBalanceManualInputs>
  ) => void;
  onLockPeriod: (
    projectId: string,
    periodKey: HistoricalPeriodKey,
    role: Role
  ) => void;
  onUnlockPeriod: (
    projectId: string,
    periodKey: HistoricalPeriodKey
  ) => void;
  onNotify: (msg: string) => void;
  onNavigateToFinancialSheet?: () => void;
}

/** 公式フォーマット項目の選択肢一覧 */
export const FORMAT_TARGET_OPTIONS = [
  // 損益項目
  { category: '損益計算書 (PL)', key: 'sales', label: '売上高' },
  { category: '損益計算書 (PL)', key: 'costOfSales', label: '売上原価' },
  { category: '損益計算書 (PL)', key: 'sga', label: '販売費及び一般管理費（販管費）' },
  { category: '損益計算書 (PL)', key: 'laborCost', label: '人件費（合算対象）' },
  { category: '損益計算書 (PL)', key: 'depreciation', label: '減価償却費（付加価値額対象）' },
  { category: '損益計算書 (PL)', key: 'directorRemuneration', label: '役員報酬' },
  { category: '損益計算書 (PL)', key: 'operatingProfit', label: '営業利益' },
  { category: '損益計算書 (PL)', key: 'nonOperatingIncome', label: '営業外収益' },
  { category: '損益計算書 (PL)', key: 'nonOperatingExpenses', label: '営業外費用' },
  { category: '損益計算書 (PL)', key: 'ordinaryProfit', label: '経常利益' },
  { category: '損益計算書 (PL)', key: 'extraordinaryIncome', label: '特別利益' },
  { category: '損益計算書 (PL)', key: 'extraordinaryLosses', label: '特別損失' },
  { category: '損益計算書 (PL)', key: 'incomeTaxes', label: '法人税等' },
  { category: '損益計算書 (PL)', key: 'netIncome', label: '当期純利益' },
  // 貸借項目
  { category: '貸借対照表 (BS)', key: 'cashAndDeposits', label: '現金及び預金' },
  { category: '貸借対照表 (BS)', key: 'notesReceivable', label: '受取手形' },
  { category: '貸借対照表 (BS)', key: 'accountsReceivable', label: '売掛金' },
  { category: '貸借対照表 (BS)', key: 'inventories', label: '棚卸資産' },
  { category: '貸借対照表 (BS)', key: 'buildings', label: '建物及び構築物' },
  { category: '貸借対照表 (BS)', key: 'machineryAndEquipment', label: '機械及び装置' },
  { category: '貸借対照表 (BS)', key: 'software', label: 'ソフトウェア' },
  { category: '貸借対照表 (BS)', key: 'totalAssets', label: '資産合計' },
  { category: '貸借対照表 (BS)', key: 'notesPayable', label: '支払手形' },
  { category: '貸借対照表 (BS)', key: 'accountsPayable', label: '買掛金' },
  { category: '貸借対照表 (BS)', key: 'shortTermBorrowings', label: '短期借入金' },
  { category: '貸借対照表 (BS)', key: 'longTermBorrowings', label: '長期借入金' },
  { category: '貸借対照表 (BS)', key: 'capitalStock', label: '資本金' },
  { category: '貸借対照表 (BS)', key: 'retainedEarnings', label: '利益剰余金' },
  { category: '貸借対照表 (BS)', key: 'totalLiabilitiesAndNetAssets', label: '負債・純資産合計' },
];

export const FinancialStatementImportView: React.FC<
  FinancialStatementImportViewProps
> = ({
  project,
  role,
  displayCurrencyUnit,
  roundingMode,
  standardAccountMappings,
  companyAccountMappings,
  onUploadPdf,
  onUpdateItemAmount,
  onAssignMapping,
  onUpdateOffBalance,
  onLockPeriod,
  onUnlockPeriod,
  onNotify,
  onNavigateToFinancialSheet,
}) => {
  // 選択中の期（2期前 / 1期前 / 直近）
  const [selectedPeriod, setSelectedPeriod] = useState<HistoricalPeriodKey>('y0');
  // PDFビューアの現在ページ・拡大率
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  // 選択中の行アイテム（ハイライト用）
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // フィルター
  const [filterMode, setFilterMode] = useState<
    'all' | 'unmapped' | 'bs' | 'pl' | 'modified'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // ローディング状態
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  // ロック解除確認モーダル
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState<boolean>(false);
  // 金額編集中の値
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValueStr, setEditValueStr] = useState<string>('');
  // 履歴表示モーダル
  const [historyModalItem, setHistoryModalItem] = useState<ExtractedFinancialItem | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canEdit = role === '書類作成者' || role === 'システム管理者';

  // 現在の期の取込レコード
  const currentRecord: PeriodImportRecord | undefined = useMemo(() => {
    return project.financialMaster.periodImports?.[selectedPeriod];
  }, [project.financialMaster.periodImports, selectedPeriod]);

  const isLocked = Boolean(currentRecord?.isLocked);

  // 選択中のアイテム
  const activeItem = useMemo(() => {
    if (!currentRecord || !selectedItemId) return null;
    return currentRecord.extractedItems.find((i) => i.id === selectedItemId) || null;
  }, [currentRecord, selectedItemId]);

  // 未対応科目リスト
  const unmappedItems = useMemo(() => {
    if (!currentRecord) return [];
    return currentRecord.extractedItems.filter((i) => i.status === 'unmapped');
  }, [currentRecord]);

  // 表示アイテム一覧（フィルタ・検索後）
  const displayedItems = useMemo(() => {
    if (!currentRecord) return [];
    let list = [...currentRecord.extractedItems];

    // 未対応科目を常に一番上部に優先配置（STEP2要件）
    list.sort((a, b) => {
      if (a.status === 'unmapped' && b.status !== 'unmapped') return -1;
      if (a.status !== 'unmapped' && b.status === 'unmapped') return 1;
      return a.pageNumber - b.pageNumber;
    });

    if (filterMode === 'unmapped') {
      list = list.filter((i) => i.status === 'unmapped');
    } else if (filterMode === 'bs') {
      list = list.filter((i) => i.category.startsWith('BS_'));
    } else if (filterMode === 'pl') {
      list = list.filter((i) => i.category.startsWith('PL_'));
    } else if (filterMode === 'modified') {
      list = list.filter((i) => i.isModified);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.sourceAccountName.toLowerCase().includes(q) ||
          (i.mappedFieldLabel && i.mappedFieldLabel.toLowerCase().includes(q))
      );
    }
    return list;
  }, [currentRecord, filterMode, searchQuery]);

  // PDF描画の実行
  useEffect(() => {
    let isCancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    async function loadAndRender() {
      if (!currentRecord?.fileRecordId) {
        // ファイル未保存時はリアルな高品質フォールバック財務諸表を描画
        renderFallbackFinancialPageToCanvas(currentPage, canvas!, zoomScale);
        return;
      }

      try {
        const fileRecord = await getFileFromIndexedDB(currentRecord.fileRecordId);
        if (isCancelled) return;
        if (fileRecord && fileRecord.data) {
          await renderPdfPageToCanvas(
            fileRecord.data as ArrayBuffer,
            currentPage,
            canvas!,
            zoomScale
          );
        } else {
          renderFallbackFinancialPageToCanvas(currentPage, canvas!, zoomScale);
        }
      } catch (err) {
        console.warn('PDF canvas render fallback triggered:', err);
        if (!isCancelled) {
          renderFallbackFinancialPageToCanvas(currentPage, canvas!, zoomScale);
        }
      }
    }

    loadAndRender();

    return () => {
      isCancelled = true;
    };
  }, [currentRecord?.fileRecordId, currentPage, zoomScale, selectedPeriod]);

  // 右側の行をクリックしたときのハイライト & ページジャンプ
  const handleSelectRow = (item: ExtractedFinancialItem) => {
    setSelectedItemId(item.id);
    if (item.pageNumber !== currentPage) {
      setCurrentPage(item.pageNumber);
    }
  };

  // ファイルアップロード処理（実ファイル）
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      onNotify('PDF形式（.pdf）のファイルを選択してください。');
      return;
    }

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      await onUploadPdf(project.id, selectedPeriod, buffer, file.name);
      onNotify(`決算書PDF「${file.name}」を取り込み、AI読み取り・科目照合を完了しました。`);
    } catch (err: any) {
      onNotify(`取込エラー: ${err.message}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // デモ用サンプル決算書PDFの自動読込
  const handleLoadDemoPdf = async (isScan = false) => {
    setIsProcessing(true);
    try {
      const demoBytes = generateDemoFinancialStatementPdf(selectedPeriod, isScan);
      const demoFileName = isScan
        ? `scanned_statement_${selectedPeriod}_03.pdf`
        : `financial_statement_${selectedPeriod}_03.pdf`;
      await onUploadPdf(project.id, selectedPeriod, demoBytes, demoFileName);
      onNotify(
        isScan
          ? `スキャン画像PDFサンプルを取り込みました（OCR/画像解析モードで判定）。`
          : `デモ決算書PDF（${selectedPeriod}）を取り込み、科目を自動照合しました。`
      );
    } catch (err: any) {
      onNotify(`エラー: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 金額編集のコミット
  const handleSaveAmountEdit = (item: ExtractedFinancialItem) => {
    const parsed = parseInt(editValueStr.replace(/[^\d-]/g, ''), 10);
    if (!isNaN(parsed) && parsed !== item.currentAmountYen) {
      onUpdateItemAmount(
        project.id,
        selectedPeriod,
        item.id,
        parsed,
        role,
        '見比べ画面による直接修正'
      );
      onNotify(`科目「${item.sourceAccountName}」の金額を修正し、修正履歴を記録しました。`);
    }
    setEditingItemId(null);
  };

  // 手動割当の実行（合算 / 除外 / フォーマット項目）
  const handleAssignSelect = (
    item: ExtractedFinancialItem,
    selectedValue: string
  ) => {
    if (isLocked || !canEdit) return;

    if (selectedValue === 'exclude') {
      onAssignMapping(
        project.id,
        selectedPeriod,
        item.id,
        'exclude',
        'excluded',
        '【除外】計算対象外'
      );
      onNotify(`科目「${item.sourceAccountName}」を除外設定にしました（会社別対応表に保存）。`);
      return;
    }

    if (selectedValue.startsWith('aggregate:')) {
      const key = selectedValue.replace('aggregate:', '');
      const opt = FORMAT_TARGET_OPTIONS.find((o) => o.key === key);
      const label = opt ? opt.label : key;
      onAssignMapping(
        project.id,
        selectedPeriod,
        item.id,
        'aggregate',
        key,
        label
      );
      onNotify(`科目「${item.sourceAccountName}」を「${label}」へ合算設定しました（会社別対応表に保存）。`);
      return;
    }

    // map
    const opt = FORMAT_TARGET_OPTIONS.find((o) => o.key === selectedValue);
    if (opt) {
      onAssignMapping(
        project.id,
        selectedPeriod,
        item.id,
        'map',
        opt.key,
        opt.label
      );
      onNotify(`科目「${item.sourceAccountName}」を「${opt.label}」に対応付けました（会社別対応表に保存）。`);
    }
  };

  const periodOptions: { key: HistoricalPeriodKey; label: string; year: string }[] = [
    { key: 'yMinus2', label: '2期前', year: '2024年3月期' },
    { key: 'yMinus1', label: '1期前', year: '2025年3月期' },
    { key: 'y0', label: '直近', year: '2026年3月期' },
  ];

  return (
    <div data-guide-id="guide-fin-import" className="space-y-5">
      {/* 1. Header Step Navigation & Period Selector */}
      <div className="bg-white border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">
                【STEP2】決算書PDFの取込・見比べ・科目対応付け
              </span>
              <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                期別取込・確定ロック
              </span>
            </div>
            <p className="text-xs text-slate-500">
              pdf.jsによるテキスト判定・見比べ画面・直接修正と修正履歴・合計整合性チェック・会社別対応表の自動適用
            </p>
          </div>

          {/* 収支計画シートへ ＆ 期切り替えタブ (2期前 / 1期前 / 直近) */}
          <div className="flex flex-wrap items-center gap-3">
            {onNavigateToFinancialSheet && (
              <button
                type="button"
                onClick={onNavigateToFinancialSheet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <span>収支計画シートへ</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">対象期:</span>
              <div className="inline-flex bg-slate-100 p-0.5 border border-slate-300">
              {periodOptions.map((opt) => {
                const isSelected = selectedPeriod === opt.key;
                const rec = project.financialMaster.periodImports?.[opt.key];
                const locked = rec?.isLocked;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(opt.key);
                      setSelectedItemId(null);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {locked && <Lock className="w-3 h-3 text-amber-400" />}
                    <span>{opt.label}</span>
                    <span className="text-[10px] opacity-80">({opt.year})</span>
                    {locked ? (
                      <span className="text-[9px] bg-amber-600/50 px-1 py-0.2 rounded-xs">
                        確定済
                      </span>
                    ) : rec ? (
                      <span className="text-[9px] bg-blue-600/50 px-1 py-0.2 rounded-xs">
                        確認中
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

        {/* 6-Step Visual Workflow Indicator */}
        <div className="mt-4 pt-1">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            {[
              {
                step: 1,
                title: '① PDF取込',
                desc: 'IndexedDB保存',
                active: Boolean(currentRecord?.fileName),
              },
              {
                step: 2,
                title: '② 種類判定',
                desc: currentRecord?.pdfType === 'text_pdf' ? 'テキストPDF' : 'スキャン画像',
                active: Boolean(currentRecord?.pdfType),
              },
              {
                step: 3,
                title: '③ AI読取',
                desc: 'ハッシュ確定的抽出',
                active: Boolean(currentRecord && currentRecord.extractedItems.length > 0),
              },
              {
                step: 4,
                title: '④ 科目対応',
                desc: unmappedItems.length === 0 ? '全科目照合済' : `${unmappedItems.length}件未対応`,
                active: Boolean(currentRecord),
                warn: unmappedItems.length > 0,
              },
              {
                step: 5,
                title: '⑤ 見比べ確認',
                desc: currentRecord?.consistency.allPassed ? '合計整合合格' : '差額要確認',
                active: Boolean(currentRecord),
                warn: Boolean(currentRecord && !currentRecord.consistency.allPassed),
              },
              {
                step: 6,
                title: '⑥ 確定・ロック',
                desc: isLocked ? '収支計画連動済' : '未確定',
                active: isLocked,
                locked: isLocked,
              },
            ].map((s) => (
              <div
                key={s.step}
                className={`p-2.5 border transition-colors ${
                  s.locked
                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold'
                    : s.warn
                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold'
                      : s.active
                        ? 'bg-blue-50 border-blue-300 text-blue-950'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>{s.title}</span>
                  {s.locked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                  ) : s.warn ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  ) : s.active ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  ) : null}
                </div>
                <div className="text-[10px] mt-1 opacity-80">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Bar: PDF Upload / Demo Load / Lock Button */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* 実PDFアップロードボタン */}
            <button
              type="button"
              disabled={isLocked || !canEdit || isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{selectedPeriod}の決算書PDFをアップロード</span>
            </button>

            {/* デモ決算書PDF自動読込（ワンクリック） */}
            <button
              type="button"
              disabled={isLocked || !canEdit || isProcessing}
              onClick={() => handleLoadDemoPdf(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-300 text-xs font-semibold hover:bg-blue-100 disabled:opacity-50 transition-colors cursor-pointer"
              title="株式会社○○の標準3ページ決算書PDFを生成して即座に解析"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>デモ決算書PDFを読込（テキストPDF）</span>
            </button>

            {/* スキャン画像PDF判定テスト用 */}
            <button
              type="button"
              disabled={isLocked || !canEdit || isProcessing}
              onClick={() => handleLoadDemoPdf(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
              title="テキストを持たない画像PDFの判定をテスト"
            >
              <FileSearch className="w-3.5 h-3.5 text-slate-500" />
              <span>スキャン画像PDFの判定をテスト</span>
            </button>

            {isProcessing && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>pdf.js解析 & AI読み取り実行中...</span>
              </span>
            )}
          </div>

          {/* Lock / Unlock Controls */}
          <div className="flex items-center gap-2">
            {isLocked ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>確定・ロック済（{currentRecord?.lockedAt}）</span>
                </span>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setUnlockConfirmOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  確定解除...
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canEdit || !currentRecord}
                onClick={() => {
                  onLockPeriod(project.id, selectedPeriod, role);
                  onNotify(`【${selectedPeriod}】の実績値を確定ロックし、収支計画マスターへ反映しました。`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 shadow-xs transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>実績値を確定して収支計画に反映・ロック</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Detection & Hash Info Card */}
        {currentRecord && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-500">取込ファイル:</span>
              <strong className="text-slate-800 font-mono flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                {currentRecord.fileName || '未設定'}
              </strong>

              {/* 判定結果バッジ（テキストPDF vs スキャン画像PDF） */}
              {currentRecord.pdfType === 'text_pdf' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  テキストPDF（直接テキスト抽出）
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-300 font-bold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  スキャン画像PDF（OCR/画像解析で読み取り）
                </span>
              )}

              <span className="text-[11px] text-slate-500">
                {currentRecord.detectionReason}
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0 font-mono">
              <span>総ページ: {currentRecord.pageCount}頁</span>
              <span>ハッシュ: {currentRecord.fileHash?.slice(0, 16)}...</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Split Comparison View (見比べ画面) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Pane: PDF Viewer (pdf.js) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 shadow-xs flex flex-col">
          {/* PDF Viewer Controls Header */}
          <div className="p-3 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <FileSearch className="w-4 h-4 text-blue-400" />
              <span>決算書PDFビューア（pdf.js）</span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                title="前のページ"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-semibold px-1">
                {currentPage} / {currentRecord?.pageCount || 3}
              </span>
              <button
                type="button"
                disabled={currentPage >= (currentRecord?.pageCount || 3)}
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(currentRecord?.pageCount || 3, p + 1)
                  )
                }
                className="p-1 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                title="次のページ"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-slate-600 mx-1" />

              {/* Zoom Controls */}
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.8, Number((z - 0.15).toFixed(2))))}
                className="p-1 hover:bg-slate-700 cursor-pointer"
                title="縮小"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] w-10 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
                className="p-1 hover:bg-slate-700 cursor-pointer"
                title="拡大"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* PDF Page Quick Jump Tabs */}
          <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">ページ切替:</span>
            {[
              { p: 1, label: 'P1: 貸借対照表 (BS)' },
              { p: 2, label: 'P2: 損益計算書 (PL)' },
              { p: 3, label: 'P3: 販管費内訳書' },
            ].map((tab) => (
              <button
                key={tab.p}
                type="button"
                onClick={() => setCurrentPage(tab.p)}
                className={`px-2 py-0.5 text-xs font-semibold cursor-pointer transition-colors ${
                  currentPage === tab.p
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Canvas Container with Highlight Box Overlay */}
          <div className="relative bg-slate-200 p-4 overflow-auto max-h-[750px] flex justify-center">
            <div className="relative inline-block shadow-md bg-white">
              <canvas ref={canvasRef} className="block max-w-full" />

              {/* Highlight Box Overlay for Active Row */}
              {activeItem && activeItem.pageNumber === currentPage && (
                <div
                  style={{
                    left: `${activeItem.highlightBox.xRatio * 100}%`,
                    top: `${activeItem.highlightBox.yRatio * 100}%`,
                    width: `${activeItem.highlightBox.widthRatio * 100}%`,
                    height: `${activeItem.highlightBox.heightRatio * 100}%`,
                  }}
                  className="absolute border-2 border-blue-600 bg-blue-500/25 ring-4 ring-blue-400/40 animate-pulse pointer-events-none transition-all rounded-xs"
                >
                  <span className="absolute -top-5 left-0 bg-blue-700 text-white text-[10px] px-1.5 py-0.2 font-bold whitespace-nowrap shadow-xs">
                    {activeItem.sourceAccountName}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>※右側の行をクリックすると該当ページへ自動ジャンプし該当箇所をハイライトします</span>
            {activeItem && (
              <span className="font-semibold text-blue-700">
                選択中: P{activeItem.pageNumber}「{activeItem.sourceAccountName}」
              </span>
            )}
          </div>
        </div>

        {/* Right Pane: Extracted Line Items, Mapping, Modification & Consistency */}
        <div className="lg:col-span-7 space-y-4">
          {/* Consistency Checks Card (合計チェック) */}
          {currentRecord && (
            <div
              className={`p-4 border ${
                currentRecord.consistency.allPassed
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-rose-50 border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {currentRecord.consistency.allPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-bold ${
                      currentRecord.consistency.allPassed
                        ? 'text-emerald-900'
                        : 'text-rose-950'
                    }`}
                  >
                    財務諸表 合計整合性チェック（資産負債一致・利益計算一致）
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 ${
                    currentRecord.consistency.allPassed
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-rose-200 text-rose-950'
                  }`}
                >
                  {currentRecord.consistency.allPassed ? '全整合式 合格' : '要確認・乖離あり'}
                </span>
              </div>

              {/* 4 Check Metrics Grid */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 text-xs">
                {/* 1. BS Balance */}
                <div className="bg-white p-2 border border-slate-200">
                  <div className="text-[10px] text-slate-500">① 資産 ＝ 負債・純資産</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {currentRecord.consistency.bsBalanceCheck.isBalanced ? (
                      <span className="text-emerald-700">一致 (¥0)</span>
                    ) : (
                      <span className="text-rose-700">
                        差額 ¥{currentRecord.consistency.bsBalanceCheck.difference.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Operating Profit */}
                <div className="bg-white p-2 border border-slate-200">
                  <div className="text-[10px] text-slate-500">② 売上−原価−販管費＝営業利益</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {currentRecord.consistency.operatingProfitCheck.isBalanced ? (
                      <span className="text-emerald-700">一致 (¥0)</span>
                    ) : (
                      <span className="text-rose-700">
                        差額 ¥
                        {currentRecord.consistency.operatingProfitCheck.difference.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Ordinary Profit */}
                <div className="bg-white p-2 border border-slate-200">
                  <div className="text-[10px] text-slate-500">③ 営業利益＋外収支＝経常利益</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {currentRecord.consistency.ordinaryProfitCheck.isBalanced ? (
                      <span className="text-emerald-700">一致 (¥0)</span>
                    ) : (
                      <span className="text-rose-700">
                        差額 ¥
                        {currentRecord.consistency.ordinaryProfitCheck.difference.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Net Income */}
                <div className="bg-white p-2 border border-slate-200">
                  <div className="text-[10px] text-slate-500">④ 経常利益＋特別−税＝当期利益</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {currentRecord.consistency.netIncomeCheck.isBalanced ? (
                      <span className="text-emerald-700">一致 (¥0)</span>
                    ) : (
                      <span className="text-rose-700">
                        差額 ¥{currentRecord.consistency.netIncomeCheck.difference.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Warning Messages */}
              {currentRecord.consistency.warningMessages.length > 0 && (
                <div className="mt-2 text-[11px] text-rose-800 space-y-1">
                  {currentRecord.consistency.warningMessages.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 font-medium">
                      <span>• {w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unmapped Items Top Alert Banner (未対応科目の最上部表示) */}
          {unmappedItems.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-400 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    未対応の勘定科目が {unmappedItems.length} 件あります（プルダウンで手動割当・合算・除外を選択してください）
                  </span>
                </div>
                <span className="text-[10px] px-1 bg-amber-200 text-amber-900 font-bold">
                  仮
                </span>
              </div>
              <div className="text-[11px] text-amber-800 leading-relaxed">
                ※手動で割り当てたルールは会社固有の対応表に自動保存され、次回以降の決算書取込時に自動適用されます。
              </div>
            </div>
          )}

          {/* Line Items Table Card */}
          <div className="bg-white border border-slate-200 shadow-xs">
            {/* Filter & Search Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'all' as const, label: 'すべて' },
                  { id: 'unmapped' as const, label: `未対応のみ (${unmappedItems.length})`, warn: unmappedItems.length > 0 },
                  { id: 'bs' as const, label: '貸借対照表 (BS)' },
                  { id: 'pl' as const, label: '損益計算書 (PL)' },
                  { id: 'modified' as const, label: '修正済のみ' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setFilterMode(btn.id)}
                    className={`px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                      filterMode === btn.id
                        ? 'bg-slate-900 text-white'
                        : btn.warn
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="科目名を絞り込み..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-slate-300 pl-7 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 w-48 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 border-b border-slate-300 text-[11px]">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">頁</th>
                    <th className="py-2 px-3 min-w-[150px]">決算書の科目名</th>
                    <th className="py-2 px-3 min-w-[110px] text-right">読取金額</th>
                    <th className="py-2 px-3 min-w-[140px] text-right">修正後金額（直接編集可）</th>
                    <th className="py-2 px-3 min-w-[180px]">対応フォーマット項目 / 割当</th>
                    <th className="py-2 px-3 w-16 text-center">履歴</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        該当する勘定科目がありません。
                      </td>
                    </tr>
                  ) : (
                    displayedItems.map((item) => {
                      const isSelected = selectedItemId === item.id;
                      const isUnmapped = item.status === 'unmapped';
                      const isEditing = editingItemId === item.id;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleSelectRow(item)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-100/70 border-l-4 border-l-blue-600'
                              : isUnmapped
                                ? 'bg-amber-50 hover:bg-amber-100/60'
                                : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* ページ番号（クリックでジャンプ） */}
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold ${
                                isSelected
                                  ? 'bg-blue-700 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              P{item.pageNumber}
                            </span>
                          </td>

                          {/* 決算書科目名 */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900">
                              <span>{item.sourceAccountName}</span>
                              {isUnmapped && (
                                <span className="text-[10px] px-1 bg-amber-200 text-amber-900 border border-amber-400 font-bold">
                                  未対応
                                </span>
                              )}
                              {item.isModified && (
                                <span className="text-[10px] px-1 bg-blue-100 text-blue-800 border border-blue-300 font-bold">
                                  修正済
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              分類: {item.categoryLabel}
                            </div>
                          </td>

                          {/* 読取金額 */}
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {item.extractedAmountYen.toLocaleString()}円
                          </td>

                          {/* 修正後金額（直接入力・インライン編集） */}
                          <td
                            className="py-1.5 px-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editValueStr}
                                  onChange={(e) => setEditValueStr(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveAmountEdit(item);
                                    if (e.key === 'Escape') setEditingItemId(null);
                                  }}
                                  className="w-32 text-right bg-white border border-blue-600 px-1 py-0.5 text-xs font-mono font-bold text-slate-900"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveAmountEdit(item)}
                                  className="px-1.5 py-0.5 bg-blue-600 text-white text-[11px] font-bold"
                                >
                                  保存
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  if (!isLocked && canEdit) {
                                    setEditingItemId(item.id);
                                    setEditValueStr(String(item.currentAmountYen));
                                  }
                                }}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-right font-mono font-bold cursor-pointer ${
                                  item.isModified
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
                                }`}
                                title={isLocked ? 'ロック中のため編集不可' : 'クリックして金額を修正'}
                              >
                                <span>{item.currentAmountYen.toLocaleString()}円</span>
                                {!isLocked && canEdit && (
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                )}
                              </div>
                            )}
                          </td>

                          {/* 対応フォーマット項目 / 割当プルダウン */}
                          <td
                            className="py-1.5 px-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              disabled={isLocked || !canEdit}
                              value={
                                item.status === 'excluded'
                                  ? 'exclude'
                                  : item.status === 'aggregated'
                                    ? `aggregate:${item.mappedFieldKey}`
                                    : item.mappedFieldKey || ''
                              }
                              onChange={(e) => handleAssignSelect(item, e.target.value)}
                              className={`w-full text-xs font-medium px-2 py-1 border focus:outline-none focus:border-slate-800 ${
                                isUnmapped
                                  ? 'bg-amber-100/60 border-amber-400 text-amber-950 font-bold'
                                  : 'bg-white border-slate-300 text-slate-800'
                              }`}
                            >
                              <option value="">-- 割当を選択してください --</option>
                              <optgroup label="特殊処理（除外・合算）">
                                <option value="exclude">【除外】計算対象外にする</option>
                                <option value="aggregate:laborCost">【合算】人件費に合算計上</option>
                                <option value="aggregate:costOfSales">【合算】売上原価に合算計上</option>
                                <option value="aggregate:sga">【合算】販管費に合算計上</option>
                              </optgroup>
                              <optgroup label="公式フォーマット損益項目 (PL)">
                                {FORMAT_TARGET_OPTIONS.filter((o) =>
                                  o.category.startsWith('損益')
                                ).map((opt) => (
                                  <option key={opt.key} value={opt.key}>
                                    {opt.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="公式フォーマット貸借項目 (BS)">
                                {FORMAT_TARGET_OPTIONS.filter((o) =>
                                  o.category.startsWith('貸借')
                                ).map((opt) => (
                                  <option key={opt.key} value={opt.key}>
                                    {opt.label}
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>

                          {/* 修正履歴ボタン */}
                          <td
                            className="py-2 px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.modificationHistory.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setHistoryModalItem(item)}
                                className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                                title="修正履歴を確認"
                              >
                                <History className="w-3 h-3" />
                                <span>{item.modificationHistory.length}</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                全 {currentRecord?.extractedItems.length || 0} 科目中、表示中{' '}
                {displayedItems.length} 科目
              </span>
              <span>
                金額単位: <strong className="text-slate-800">{getUnitLabel(displayCurrencyUnit)}</strong>（内部保持: 円単位整数）
              </span>
            </div>
          </div>

          {/* 4. 決算書に載らない項目（手入力フォーム） */}
          {currentRecord && (
            <div className="bg-white border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    決算書に載らない項目（手入力・収支計画マスター連動）
                  </span>
                  <span className="text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                    仮
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  ※確定ロック時に収支計画マスターの該当期（{selectedPeriod}）へ自動反映されます
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
                {/* 1. 従業員数 */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    従業員数（人）
                  </label>
                  <input
                    type="number"
                    disabled={isLocked || !canEdit}
                    value={currentRecord.offBalanceInputs.numberOfEmployees}
                    onChange={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        numberOfEmployees: Number(e.target.value) || 0,
                      })
                    }
                    onBlur={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        numberOfEmployees: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-slate-800 disabled:opacity-75"
                  />
                </div>

                {/* 2. 給与支給総額 */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    給与支給総額（円）
                  </label>
                  <input
                    type="number"
                    disabled={isLocked || !canEdit}
                    value={currentRecord.offBalanceInputs.totalWages}
                    onChange={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        totalWages: Number(e.target.value) || 0,
                      })
                    }
                    onBlur={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        totalWages: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-slate-800 disabled:opacity-75"
                  />
                </div>

                {/* 3. 役員数 */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    役員数（人）
                  </label>
                  <input
                    type="number"
                    disabled={isLocked || !canEdit}
                    value={currentRecord.offBalanceInputs.numberOfDirectors}
                    onChange={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        numberOfDirectors: Number(e.target.value) || 0,
                      })
                    }
                    onBlur={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        numberOfDirectors: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-slate-800 disabled:opacity-75"
                  />
                </div>

                {/* 4. 役員報酬 */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    役員報酬額（円）
                  </label>
                  <input
                    type="number"
                    disabled={isLocked || !canEdit}
                    value={currentRecord.offBalanceInputs.directorRemuneration}
                    onChange={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        directorRemuneration: Number(e.target.value) || 0,
                      })
                    }
                    onBlur={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        directorRemuneration: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-slate-800 disabled:opacity-75"
                  />
                </div>

                {/* 5. 事業場内最低賃金 */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    事業場内最賃（円/時）
                  </label>
                  <input
                    type="number"
                    disabled={isLocked || !canEdit}
                    value={currentRecord.offBalanceInputs.workplaceMinWage}
                    onChange={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        workplaceMinWage: Number(e.target.value) || 0,
                      })
                    }
                    onBlur={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        workplaceMinWage: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-slate-800 disabled:opacity-75"
                  />
                </div>

                {/* 6. 地域別最低賃金 */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    地域別最賃（円/時）
                  </label>
                  <input
                    type="number"
                    disabled={isLocked || !canEdit}
                    value={currentRecord.offBalanceInputs.regionalMinWage}
                    onChange={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        regionalMinWage: Number(e.target.value) || 0,
                      })
                    }
                    onBlur={(e) =>
                      onUpdateOffBalance(project.id, selectedPeriod, {
                        regionalMinWage: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-slate-800 disabled:opacity-75"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Unlock Confirmation Dialog */}
      {unlockConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-300 p-6 shadow-xl">
            <div className="flex items-center gap-2 text-amber-700 mb-2 font-bold">
              <AlertTriangle className="w-5 h-5" />
              <span>確定ロック解除の確認</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              確認済みの実績値（{selectedPeriod}）の確定ロックを解除しますか？
              <br />
              解除すると金額や科目の修正が可能になりますが、後続のSTEP3シミュレーションやGate2承認に影響を与える可能性があります。
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUnlockConfirmOpen(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  onUnlockPeriod(project.id, selectedPeriod);
                  setUnlockConfirmOpen(false);
                  onNotify(`【${selectedPeriod}】の確定ロックを解除しました。再編集可能です。`);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 cursor-pointer"
              >
                ロック解除して再編集する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modification History Popover Modal */}
      {historyModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-300 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <History className="w-4 h-4 text-blue-600" />
                <span>科目「{historyModalItem.sourceAccountName}」の修正履歴</span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="text-slate-400 hover:text-slate-800 font-mono text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              <div className="text-xs text-slate-500 mb-2">
                読取当初金額:{' '}
                <strong className="font-mono text-slate-800">
                  {historyModalItem.extractedAmountYen.toLocaleString()}円
                </strong>{' '}
                → 現在金額:{' '}
                <strong className="font-mono text-blue-700">
                  {historyModalItem.currentAmountYen.toLocaleString()}円
                </strong>
              </div>

              {historyModalItem.modificationHistory.map((log, idx) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-semibold text-slate-700">
                      第{historyModalItem.modificationHistory.length - idx}回 修正
                    </span>
                    <span>
                      {log.modifiedAt} by {log.modifiedBy}
                    </span>
                  </div>
                  <div className="font-mono font-bold text-slate-900">
                    {log.previousAmountYen.toLocaleString()}円 →{' '}
                    <span className="text-blue-700">{log.newAmountYen.toLocaleString()}円</span>
                  </div>
                  {log.reason && (
                    <div className="text-[11px] text-slate-600">理由: {log.reason}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
