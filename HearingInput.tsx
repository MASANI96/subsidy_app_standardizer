import React, { useEffect, useRef, useState } from 'react';
import { Check, FileSpreadsheet } from 'lucide-react';
import { SAMPLE_MEETING_MINUTES } from '../data/initialData';
import {
  EffectEstimateItem,
  HearingMasterItem,
  HearingRangeVariable,
  HearingSingleVariable,
  HearingVariables,
  Project,
  Role,
} from '../types';
import { canConfirmGate, canEdit } from '../utils/permissions';
import {
  ReadOnlyRoleBadge,
  SpecTagBadge,
  WorkspaceEffectBadge,
} from './SpecTagBadge';

interface HearingInputProps {
  project: Project;
  role: Role;
  promptSuggestionApplied: boolean;
  effectEstimate?: EffectEstimateItem;
  onUpdateRawText: (
    projectId: string,
    text: string,
    sourceNote?: string
  ) => void;
  onUpdateHearingVariables: (
    projectId: string,
    variables: HearingVariables
  ) => void;
  onImportSampleExcel: (projectId: string) => void;
  onGenerateMaster: (projectId: string) => void;
  onSaveMasterItem: (
    projectId: string,
    itemId: string,
    content: string
  ) => void;
  onSyncMasterToSubsidies: (projectId: string) => void;
  onNavigateToFinancial: () => void;
  onNavigateBackToList: () => void;
  onNotify: (message: string) => void;
}

const PARSE_STEPS = [
  'テキスト構造化中...',
  '公募要項キーフレーズ照合中...',
  '定性マスターシートへマッピング中...',
];

type SingleVarKey =
  | 'existingUnitPrice'
  | 'newUnitPrice'
  | 'newCustomerCountY1'
  | 'newCustomerCountY2'
  | 'newCustomerCountY3'
  | 'repeatRate'
  | 'reducedWorkHours'
  | 'hourlyWage'
  | 'subcontractReduction'
  | 'newHiresY1'
  | 'newHiresY2'
  | 'newHiresY3'
  | 'plannedWageGrowthRate';

type RangeVarKey = 'defectRate' | 'leadTime' | 'productionCapacity';

export const HearingInput: React.FC<HearingInputProps> = ({
  project,
  role,
  promptSuggestionApplied,
  effectEstimate,
  onUpdateRawText,
  onUpdateHearingVariables,
  onImportSampleExcel,
  onGenerateMaster,
  onSaveMasterItem,
  onSyncMasterToSubsidies,
  onNavigateToFinancial,
  onNavigateBackToList,
  onNotify,
}) => {
  const [driveUrl, setDriveUrl] = useState(
    'https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ_techprecision'
  );
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [isParsing, setIsParsing] = useState(false);
  const [parseStepIndex, setParseStepIndex] = useState(0);
  const [parseProgress, setParseProgress] = useState(0);

  const [draftItems, setDraftItems] = useState<Record<string, string>>({});
  const [savedItemFlags, setSavedItemFlags] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedPromptIds, setExpandedPromptIds] = useState<
    Record<string, boolean>
  >({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const masterSectionRef = useRef<HTMLDivElement | null>(null);

  const canEditHearing = canEdit(role, 'hearing_edit');
  const canConfirmG1 = canConfirmGate(role, 'gate-1');

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    project.masterItems.forEach((item) => {
      nextDrafts[item.id] = item.content;
    });
    setDraftItems(nextDrafts);
    setSavedItemFlags({});
  }, [project.id, project.masterItems]);

  const gate1 = project.gates.find((g) => g.id === 'gate-1');
  const isGate1Passed = Boolean(gate1?.isPassed);
  const hv = project.hearingVariables;

  const updateSingleVar = (
    key: SingleVarKey,
    patch: Partial<HearingSingleVariable>
  ) => {
    if (!canEditHearing) return;
    onUpdateHearingVariables(project.id, {
      ...hv,
      [key]: {
        ...hv[key],
        ...patch,
      },
    });
  };

  const updateRangeVar = (
    key: RangeVarKey,
    patch: Partial<HearingRangeVariable>
  ) => {
    if (!canEditHearing) return;
    onUpdateHearingVariables(project.id, {
      ...hv,
      [key]: {
        ...hv[key],
        ...patch,
      },
    });
  };

  const handleFileProcess = (file: File) => {
    if (!canEditHearing) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      onImportSampleExcel(project.id);
      onNotify(
        `ヒアリングシート「${file.name}」から数値計画の算定変数データを読み込みました。`
      );
      return;
    }
    if (ext === 'pdf') {
      const simulatedPdfText =
        project.rawHearingText.trim() || SAMPLE_MEETING_MINUTES;
      onUpdateRawText(
        project.id,
        simulatedPdfText,
        `PDFファイル取込: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
      );
      onNotify(`PDFファイル「${file.name}」からテキストデータを抽出しました。`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content =
        typeof ev.target?.result === 'string' && ev.target.result.trim()
          ? ev.target.result
          : SAMPLE_MEETING_MINUTES;
      onUpdateRawText(
        project.id,
        content,
        `ファイル取込: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
      );
      onNotify(`ファイル「${file.name}」を読み込みました。`);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleFetchFromUrl = () => {
    if (!canEditHearing) return;
    if (!driveUrl.trim()) {
      onNotify('共有フォルダまたはドキュメントのURLを入力してください。');
      return;
    }
    setIsFetchingUrl(true);
    window.setTimeout(() => {
      setIsFetchingUrl(false);
      onUpdateRawText(
        project.id,
        SAMPLE_MEETING_MINUTES,
        `共有URL連携取得: ${driveUrl.trim().slice(0, 48)}...`
      );
      onNotify('指定された共有URLからヒアリング議事録データを取得しました。');
    }, 600);
  };

  const handleInsertSampleMinutes = () => {
    if (!canEditHearing) return;
    onUpdateRawText(
      project.id,
      SAMPLE_MEETING_MINUTES,
      'デモ用プリセット: 株式会社○○ 初回議事録'
    );
    onNotify(
      '株式会社○○のデモ用サンプル議事録を挿入しました。'
    );
  };

  const handleImportExcelSheet = () => {
    if (!canEditHearing) return;
    onImportSampleExcel(project.id);
    onNotify(
      `「${project.companyName}」のマスターヒアリングシート（Excel）から数値計画の算定変数（単価・客数・削減工数・雇用予定）を読み込みました。`
    );
  };

  const handleRunMasterGeneration = () => {
    if (!canEditHearing) return;
    if (!project.rawHearingText.trim()) {
      onUpdateRawText(
        project.id,
        SAMPLE_MEETING_MINUTES,
        'デモ用プリセット自動補完: 株式会社○○'
      );
    }

    setIsParsing(true);
    setParseStepIndex(0);
    setParseProgress(0.33);

    window.setTimeout(() => {
      setParseStepIndex(1);
      setParseProgress(0.68);
    }, 680);

    window.setTimeout(() => {
      setParseStepIndex(2);
      setParseProgress(1);
    }, 1360);

    window.setTimeout(() => {
      onGenerateMaster(project.id);
      setIsParsing(false);
      onNotify(
        'ヒアリング情報の解析が完了し、定性マスターシート生成およびGate 1を通過しました。'
      );
      masterSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 2000);
  };

  const handleSaveSingleItem = (item: HearingMasterItem) => {
    if (!canEditHearing) return;
    const val = draftItems[item.id] ?? item.content;
    onSaveMasterItem(project.id, item.id, val);
    setSavedItemFlags((prev) => ({ ...prev, [item.id]: true }));
    onNotify(`マスター項目「${item.title}」を保存しました。`);
  };

  const handleConfirmGate1AndSync = () => {
    if (!canConfirmG1) return;
    project.masterItems.forEach((item) => {
      const val = draftItems[item.id] ?? item.content;
      onSaveMasterItem(project.id, item.id, val);
    });
    onSyncMasterToSubsidies(project.id);
    const allSaved: Record<string, boolean> = {};
    project.masterItems.forEach((m) => {
      allSaved[m.id] = true;
    });
    setSavedItemFlags(allSaved);
    onNotify(
      'Gate 1（マスターヒアリングシート）を確定し、申請書マスターおよび収支計画シミュレーションへ基礎情報を同期しました。'
    );
  };

  const renderSingleVarRow = (
    key: SingleVarKey,
    label: string,
    step = 1
  ): React.ReactNode => {
    const v = hv[key];
    return (
      <tr key={key} className="hover:bg-slate-50/50">
        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
          {label}
        </td>
        <td className="py-2 px-3 whitespace-nowrap">
          <div className="flex items-center justify-end gap-1.5">
            <input
              type="number"
              step={step}
              disabled={!canEditHearing}
              value={v.value}
              onChange={(e) =>
                updateSingleVar(key, { value: Number(e.target.value) || 0 })
              }
              aria-label={label}
              className="w-28 text-right font-mono tabular-nums border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-slate-800"
            />
            <span className="text-xs text-slate-500 w-12">{v.unit}</span>
          </div>
        </td>
        <td className="py-2 px-3">
          <input
            type="text"
            disabled={!canEditHearing}
            value={v.sourceMemo}
            onChange={(e) =>
              updateSingleVar(key, { sourceMemo: e.target.value })
            }
            placeholder="ヒアリング発言・見積書・根拠資料名を記録..."
            aria-label={`${label}の根拠メモ`}
            className="w-full border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-800"
          />
        </td>
      </tr>
    );
  };

  const renderRangeVarRow = (
    key: RangeVarKey,
    label: string,
    step = 0.1
  ): React.ReactNode => {
    const v = hv[key];
    return (
      <tr key={key} className="hover:bg-slate-50/50">
        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
          {label}
        </td>
        <td className="py-2 px-3 whitespace-nowrap">
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[11px] text-slate-500">現状</span>
            <input
              type="number"
              step={step}
              disabled={!canEditHearing}
              value={v.current}
              onChange={(e) =>
                updateRangeVar(key, { current: Number(e.target.value) || 0 })
              }
              aria-label={`${label}（現状）`}
              className="w-20 text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-slate-800"
            />
            <span className="text-xs text-slate-400">→</span>
            <span className="text-[11px] text-slate-500">目標</span>
            <input
              type="number"
              step={step}
              disabled={!canEditHearing}
              value={v.target}
              onChange={(e) =>
                updateRangeVar(key, { target: Number(e.target.value) || 0 })
              }
              aria-label={`${label}（目標）`}
              className="w-20 text-right font-mono tabular-nums border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 disabled:bg-slate-100 focus:outline-none focus:border-slate-800"
            />
            <span className="text-xs text-slate-500 w-12">{v.unit}</span>
          </div>
        </td>
        <td className="py-2 px-3">
          <input
            type="text"
            disabled={!canEditHearing}
            value={v.sourceMemo}
            onChange={(e) =>
              updateRangeVar(key, { sourceMemo: e.target.value })
            }
            placeholder="ヒアリング発言・根拠資料名を記録..."
            aria-label={`${label}の根拠メモ`}
            className="w-full border border-slate-200 bg-slate-50/50 px-2.5 py-1 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-slate-800"
          />
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-8">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
            <button
              type="button"
              onClick={onNavigateBackToList}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              ← 案件一覧へ戻る
            </button>
            <span aria-hidden="true">·</span>
            <span>
              ワークスペース タブ2 · 共通ヒアリングシート構造（ロール: {role}）
            </span>
            <SpecTagBadge tag="指示書 4-① / Step2" />
            <WorkspaceEffectBadge estimate={effectEstimate} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              マスターヒアリングシート（定性4項目＋数値計画の算定変数）
            </h1>
            {isGate1Passed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300">
                <Check className="w-3.5 h-3.5" />
                Gate 1 確定済
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300">
                Gate 1 未確定
              </span>
            )}
            {!canEditHearing && <ReadOnlyRoleBadge role={role} />}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            対象案件:{' '}
            <span className="font-semibold text-slate-900">
              {project.companyName}
            </span>
            {' · '}業種: {project.industry}
            {' · '}目標補助金額:{' '}
            <span className="font-mono tabular-nums font-semibold">
              {project.targetAmount}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canEditHearing}
            onClick={handleImportExcelSheet}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
            <span>ヒアリングシート（Excel）を読み込む</span>
          </button>
          <button
            type="button"
            disabled={!canEditHearing}
            onClick={handleInsertSampleMinutes}
            className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            デモ用サンプル議事録を挿入
          </button>
        </div>
      </div>

      {/* Step 1: Dual Input Methods + Excel Import + Raw Text Area */}
      <section
        data-guide-id="guide-hearing-import"
        className="bg-white border border-slate-200 p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  01. マスターヒアリングシート・議事録データの読み込み
                </h2>
                <SpecTagBadge tag="指示書 4-①" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                議事録ファイル（.txt / .pdf）、共有フォルダURL、または共通ヒアリングシート（Excel）から定性・定量の基礎情報を取り込みます。
              </p>
            </div>
          </div>
          {project.hearingSourceNote && (
            <span className="text-xs text-slate-600 font-mono">
              取込元: {project.hearingSourceNote}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Method A: File Drag & Drop */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800">
              方式A: 議事録ファイル取込（.txt / .pdf 対応）
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border border-dashed p-4 text-center transition-colors min-h-[108px] flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-slate-900 bg-slate-100'
                  : 'border-slate-300 bg-slate-50'
              }`}
            >
              <p className="text-xs text-slate-700 mb-2.5">
                議事録（.txt / .pdf）をドラッグ＆ドロップまたは選択
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.md,.csv,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileProcess(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                disabled={!canEditHearing}
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ファイルを選択...
              </button>
            </div>
          </div>

          {/* Method B: Shared Folder URL */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800">
              方式B: Google Drive / 社内共有フォルダURL連携
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between min-h-[108px]">
              <label
                htmlFor="drive-url-input"
                className="text-xs text-slate-600 mb-2 block"
              >
                議事録ドキュメントまたはフォルダの共有URLから取得
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="drive-url-input"
                  type="url"
                  disabled={!canEditHearing}
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="flex-1 min-w-0 bg-white border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                />
                <button
                  type="button"
                  disabled={isFetchingUrl || !canEditHearing}
                  onClick={handleFetchFromUrl}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isFetchingUrl ? '取得中...' : '取得'}
                </button>
              </div>
            </div>
          </div>

          {/* Method C: Common Hearing Sheet Excel Simulation */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800">
              方式C: 共通マスターヒアリングシート（Excel）取込
            </div>
            <div className="border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between min-h-[108px]">
              <p className="text-xs text-slate-600 leading-relaxed">
                顧客記入済のExcelシートから、単価・客数・工数削減・雇用予定などの「数値計画の算定変数」を一括反映します。
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!canEditHearing}
                  onClick={handleImportExcelSheet}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-800" />
                  <span>ヒアリングシート（Excel）を読み込む</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Raw Hearing Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="raw-hearing-textarea"
              className="text-xs font-semibold text-slate-800"
            >
              取込済ヒアリング原稿・打合せメモ（直接編集・追記可能）
            </label>
            <span className="font-mono tabular-nums text-xs text-slate-500">
              原稿文字数: {project.rawHearingText.length} 文字
            </span>
          </div>
          <textarea
            id="raw-hearing-textarea"
            rows={6}
            disabled={!canEditHearing}
            value={project.rawHearingText}
            onChange={(e) => onUpdateRawText(project.id, e.target.value)}
            placeholder="「デモ用サンプル議事録を挿入」ボタンを押すか、ここに会議メモ・メール文面を貼り付けてください。"
            className="w-full bg-slate-50/60 border border-slate-300 p-3.5 text-sm leading-relaxed text-slate-900 focus:bg-white focus:outline-none focus:border-slate-800"
          />
        </div>

        <div className="pt-2 border-t border-slate-200 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-xs text-slate-600">
            登録されているマスター抽出プロンプト（全{project.masterItems.length}項目
            {promptSuggestionApplied ? ' · 改善案反映済' : ''}）に基づき定性マスターを生成します。
          </div>
          <button
            type="button"
            disabled={isParsing || !canEditHearing}
            onClick={handleRunMasterGeneration}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isParsing
              ? '解析処理を実行中...'
              : 'ヒアリング情報を解析し定性マスターを自動生成'}
          </button>
        </div>

        {isParsing && (
          <div className="border border-slate-300 bg-slate-50 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>{PARSE_STEPS[parseStepIndex]}</span>
              <span className="font-mono tabular-nums">
                {Math.round(parseProgress * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-slate-900 origin-left transition-transform duration-500 ease-out"
                style={{ transform: `scaleX(${parseProgress})` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Step 2: Qualitative Master Sheet (4 Common Master Items) */}
      <section
        ref={masterSectionRef}
        data-guide-id="guide-hearing-master"
        className="bg-white border border-slate-200 p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                02. 共通ヒアリングシート 第1部：定性マスター4項目（全補助金共通・親データ）
              </h2>
              <SpecTagBadge tag="指示書 4-①" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              自動抽出された定性4項目（強み／経営課題／導入設備／期待効果）を精査・編集します。申請書各セクションの生成文面はこの親データから展開されます。
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {project.masterItems.map((item, index) => {
            const currentVal = draftItems[item.id] ?? item.content;
            const isDirty = currentVal !== item.content;
            const isSavedRecently = savedItemFlags[item.id] && !isDirty;
            const promptOpen = Boolean(expandedPromptIds[item.id]);

            return (
              <div
                key={item.id}
                className="border border-slate-200 p-4 space-y-3 bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      0{index + 1}.
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPromptIds((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className="text-slate-500 hover:text-slate-800 underline whitespace-nowrap cursor-pointer"
                    >
                      {promptOpen
                        ? '抽出プロンプトを隠す'
                        : '抽出プロンプトを確認'}
                    </button>
                    <span className="text-slate-300" aria-hidden="true">
                      |
                    </span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {currentVal.length} 文字
                    </span>
                    {isDirty ? (
                      <span className="text-amber-800 font-semibold">
                        未保存の変更あり
                      </span>
                    ) : isSavedRecently ? (
                      <span className="text-emerald-800 font-semibold">
                        保存済
                      </span>
                    ) : null}
                    <button
                      type="button"
                      disabled={!canEditHearing}
                      onClick={() => handleSaveSingleItem(item)}
                      className="px-3 py-1 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      保存
                    </button>
                  </div>
                </div>

                {promptOpen && (
                  <div className="bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">
                      AI抽出指示プロンプト:{' '}
                    </span>
                    {item.prompt}
                  </div>
                )}

                <textarea
                  rows={3}
                  disabled={!canEditHearing}
                  value={currentVal}
                  onChange={(e) =>
                    setDraftItems((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  placeholder="上の「ヒアリング情報を解析し定性マスターを自動生成」を実行するか、直接入力してください。"
                  className="w-full border border-slate-300 p-3 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Step 3 (M1): Quantitative Plan Calculation Variables Section */}
      <section
        data-guide-id="guide-hearing-variables"
        className="bg-white border border-slate-200 p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                03. 共通ヒアリングシート 第2部：数値計画の算定変数（業種共通）
              </h2>
              <SpecTagBadge tag="指示書 Step2" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              収支計画の算定根拠となる「単価・数量・削減工数・リードタイム・雇用計画」と、その裏付け（発言・資料名）を記録します。次工程「タブ3: 収支計画マスター」へそのまま連動します。
            </p>
          </div>
          <button
            type="button"
            disabled={!canEditHearing}
            onClick={handleImportExcelSheet}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            案件サンプル変数を再読込
          </button>
        </div>

        <div className="space-y-6">
          {/* Group 1: 売上系 */}
          <div className="border border-slate-200">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-900">
              A. 売上系変数（単価 × 想定客数／受注件数）
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2 px-3 w-64">算定変数名</th>
                    <th className="py-2 px-3 w-64 text-right">数値・単位</th>
                    <th className="py-2 px-3">
                      根拠メモ（ヒアリング発言・参照資料名）
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {renderSingleVarRow(
                    'existingUnitPrice',
                    '既存事業 客単価',
                    1000
                  )}
                  {renderSingleVarRow('newUnitPrice', '新事業 客単価', 1000)}
                  {renderSingleVarRow(
                    'newCustomerCountY1',
                    '新事業 想定客数／受注件数（1年目）',
                    1
                  )}
                  {renderSingleVarRow(
                    'newCustomerCountY2',
                    '新事業 想定客数／受注件数（2年目）',
                    1
                  )}
                  {renderSingleVarRow(
                    'newCustomerCountY3',
                    '新事業 想定客数／受注件数（3年目）',
                    1
                  )}
                  {renderSingleVarRow('repeatRate', 'リピート率', 1)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Group 2: コスト削減系 */}
          <div className="border border-slate-200">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-900">
              B. コスト削減系変数（作業工数削減・外注内製化・歩留まり改善）
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2 px-3 w-64">算定変数名</th>
                    <th className="py-2 px-3 w-64 text-right">数値・単位</th>
                    <th className="py-2 px-3">
                      根拠メモ（ヒアリング発言・参照資料名）
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {renderSingleVarRow(
                    'reducedWorkHours',
                    '削減作業時間',
                    10
                  )}
                  {renderSingleVarRow('hourlyWage', '時間単価', 100)}
                  {renderSingleVarRow(
                    'subcontractReduction',
                    '外注費削減額',
                    10
                  )}
                  {renderRangeVarRow('defectRate', '不良率（現状→目標）', 0.1)}
                </tbody>
              </table>
            </div>
          </div>

          {/* Group 3: 生産性系 & Group 4: 人員系 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="border border-slate-200">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-900">
                C. 生産性系変数（リードタイム・月産能力）
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <tbody className="divide-y divide-slate-200">
                    {renderRangeVarRow(
                      'leadTime',
                      'リードタイム（現状→目標）',
                      0.5
                    )}
                    {renderRangeVarRow(
                      'productionCapacity',
                      '生産能力（現状→目標）',
                      10
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border border-slate-200">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-900">
                D. 人員・賃上げ計画変数（雇用創出・賃上げ率）
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <tbody className="divide-y divide-slate-200">
                    {renderSingleVarRow(
                      'newHiresY1',
                      '新規雇用予定人数（1年目）',
                      1
                    )}
                    {renderSingleVarRow(
                      'newHiresY2',
                      '新規雇用予定人数（2年目）',
                      1
                    )}
                    {renderSingleVarRow(
                      'newHiresY3',
                      '新規雇用予定人数（3年目）',
                      1
                    )}
                    {renderSingleVarRow(
                      'plannedWageGrowthRate',
                      '賃上げ予定率',
                      0.1
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Gate 1 Confirm & 3-Subsidy Sync Footer */}
        <div
          data-guide-id="guide-hearing-sync"
          className="border-t border-slate-200 pt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                マスターヒアリングシートの確定と収支計画・申請書への初期同期（Gate 1）
              </span>
              <SpecTagBadge tag="指示書 2" />
            </div>
            <p className="text-xs text-slate-600">
              確定すると、単価・客数・増員・賃上げ率を「収支計画マスター（シミュレーション）」へ自動反映し、申請書マスターの基礎文面を同期して次工程へ進みます。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!canConfirmG1}
              onClick={handleConfirmGate1AndSync}
              className="px-4 py-2.5 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 hover:bg-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              全項目を確定・収支＆申請書へ同期（Gate 1 通過）
            </button>
            <button
              type="button"
              disabled={!canConfirmG1}
              onClick={() => {
                handleConfirmGate1AndSync();
                onNavigateToFinancial();
              }}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Gate 1を確定して「03. 収支計画マスター」へ進む →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
