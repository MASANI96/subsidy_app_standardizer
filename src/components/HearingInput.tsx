import React, { useEffect, useRef, useState } from 'react';
import { SAMPLE_MEETING_MINUTES } from '../data/initialData';
import { HearingMasterItem, Project, Role } from '../types';

interface HearingInputProps {
  project: Project;
  role: Role;
  promptSuggestionApplied: boolean;
  onUpdateRawText: (
    projectId: string,
    text: string,
    sourceNote?: string
  ) => void;
  onGenerateMaster: (projectId: string) => void;
  onSaveMasterItem: (
    projectId: string,
    itemId: string,
    content: string
  ) => void;
  onSyncMasterToSubsidies: (projectId: string) => void;
  onNavigateToEditor: () => void;
  onNavigateBackToList: () => void;
  onNotify: (message: string) => void;
}

const PARSE_STEPS = [
  'テキスト構造化中...',
  '公募要項キーフレーズ照合中...',
  'マスターシートへマッピング中...',
];

export const HearingInput: React.FC<HearingInputProps> = ({
  project,
  role,
  promptSuggestionApplied,
  onUpdateRawText,
  onGenerateMaster,
  onSaveMasterItem,
  onSyncMasterToSubsidies,
  onNavigateToEditor,
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
  const [hasSavedMasterSession, setHasSavedMasterSession] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const masterSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    project.masterItems.forEach((item) => {
      nextDrafts[item.id] = item.content;
    });
    setDraftItems(nextDrafts);
    setSavedItemFlags({});
  }, [project.id, project.masterItems]);

  const hasAnyMasterContent = project.masterItems.some(
    (m) => (draftItems[m.id] ?? m.content).trim().length > 0
  );

  const handleFileProcess = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
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
    onUpdateRawText(
      project.id,
      SAMPLE_MEETING_MINUTES,
      'デモ用プリセット: 株式会社テックプレシジョン 初回議事録'
    );
    onNotify(
      '株式会社テックプレシジョンのデモ用サンプル議事録を挿入しました。'
    );
  };

  const handleRunMasterGeneration = () => {
    if (!project.rawHearingText.trim()) {
      onUpdateRawText(
        project.id,
        SAMPLE_MEETING_MINUTES,
        'デモ用プリセット自動補完: 株式会社テックプレシジョン'
      );
    }

    setIsParsing(true);
    setParseStepIndex(0);
    setParseProgress(0.33);

    const t1 = window.setTimeout(() => {
      setParseStepIndex(1);
      setParseProgress(0.68);
    }, 680);

    const t2 = window.setTimeout(() => {
      setParseStepIndex(2);
      setParseProgress(1);
    }, 1360);

    const t3 = window.setTimeout(() => {
      onGenerateMaster(project.id);
      setIsParsing(false);
      setHasSavedMasterSession(true);
      onNotify(
        'ヒアリング情報の解析が完了し、マスターヒアリングシートおよび各補助金下書きへ反映しました。'
      );
      masterSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 2000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  };

  const handleSaveSingleItem = (item: HearingMasterItem) => {
    const val = draftItems[item.id] ?? item.content;
    onSaveMasterItem(project.id, item.id, val);
    setSavedItemFlags((prev) => ({ ...prev, [item.id]: true }));
    setHasSavedMasterSession(true);
    onNotify(`マスター項目「${item.title}」を保存しました。`);
  };

  const handleSaveAllAndSync = () => {
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
    setHasSavedMasterSession(true);
    onNotify(
      'マスターヒアリングシート全項目を保存し、3つの補助金フォーマットへ同期しました。'
    );
  };

  return (
    <div className="space-y-8">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <button
              type="button"
              onClick={onNavigateBackToList}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              ← 案件一覧へ戻る
            </button>
            <span aria-hidden="true">·</span>
            <span>画面2 · ヒアリング構造化工程（現在ロール: {role}）</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ヒアリングデータ読込・マスターシート生成
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            対象案件: <span className="font-semibold text-slate-900">{project.companyName}</span>
            {' · '}業種: {project.industry}
            {' · '}目標補助金額:{' '}
            <span className="font-mono tabular-nums font-semibold">
              {project.targetAmount}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInsertSampleMinutes}
            className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            デモ用サンプル議事録をワンクリック挿入
          </button>
        </div>
      </div>

      {/* Step 1: Dual Input Methods + Raw Text Area */}
      <section className="bg-white border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              01. ヒアリング原稿・議事録データの取込
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ローカルファイル（.txt / .pdf）または共有フォルダURLから生議事録を取り込みます。
            </p>
          </div>
          {project.hearingSourceNote && (
            <span className="text-xs text-slate-600 font-mono">
              取込元: {project.hearingSourceNote}
            </span>
          )}
        </div>

        {/* Method A & Method B Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Method A: File Drag & Drop */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800">
              方式A: ファイル取込（.txt / .pdf 対応）
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border border-dashed p-5 text-center transition-colors ${
                isDragging
                  ? 'border-slate-900 bg-slate-100'
                  : 'border-slate-300 bg-slate-50'
              }`}
            >
              <p className="text-xs text-slate-700 mb-3">
                ここに議事録ファイル（.txt / .pdf）をドラッグ＆ドロップ、またはファイルを選択
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.md,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileProcess(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
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
            <div className="border border-slate-200 bg-slate-50 p-5 flex flex-col justify-between min-h-[106px]">
              <label htmlFor="drive-url-input" className="text-xs text-slate-600 mb-2 block">
                議事録ドキュメントまたはフォルダの共有URLを入力して取得
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="drive-url-input"
                  type="url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="flex-1 bg-white border border-slate-300 px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800"
                />
                <button
                  type="button"
                  disabled={isFetchingUrl}
                  onClick={handleFetchFromUrl}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isFetchingUrl ? '取得中...' : '取得'}
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
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={handleInsertSampleMinutes}
                className="text-slate-700 hover:text-slate-900 underline cursor-pointer"
              >
                テックプレシジョン議事録をセット
              </button>
              <span className="font-mono tabular-nums text-slate-500">
                原稿文字数: {project.rawHearingText.length} 文字
              </span>
            </div>
          </div>
          <textarea
            id="raw-hearing-textarea"
            rows={8}
            value={project.rawHearingText}
            onChange={(e) => onUpdateRawText(project.id, e.target.value)}
            placeholder="「デモ用サンプル議事録をワンクリック挿入」ボタンを押すか、ここに会議メモ・メール文面を貼り付けてください。"
            className="w-full bg-slate-50/60 border border-slate-300 p-3.5 text-sm leading-relaxed text-slate-900 focus:bg-white focus:outline-none focus:border-slate-800"
          />
        </div>

        {/* Step 2: Parse Trigger & 2-Second Progress Feedback */}
        <div className="pt-2 border-t border-slate-200 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-xs text-slate-600">
            登録されているマスター抽出プロンプト（全{project.masterItems.length}項目
            {promptSuggestionApplied ? ' · 改善案反映済' : ''}）に基づき自動構造化します。
          </div>
          <button
            type="button"
            disabled={isParsing}
            onClick={handleRunMasterGeneration}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isParsing
              ? '解析処理を実行中...'
              : 'ヒアリング情報を解析しマスターを自動生成'}
          </button>
        </div>

        {/* 2-Second Simulated AI Progress Bar */}
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
            <div className="flex items-center gap-4 text-[11px] text-slate-500">
              {PARSE_STEPS.map((label, idx) => (
                <span
                  key={label}
                  className={
                    idx <= parseStepIndex
                      ? 'font-semibold text-slate-900'
                      : 'text-slate-400'
                  }
                >
                  {idx + 1}. {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Step 3: Master Hearing Sheet (Auto-Extracted & Manually Editable) */}
      <section
        ref={masterSectionRef}
        className="bg-white border border-slate-200 p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              02. マスターヒアリングシート（全補助金共通・親データ）
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              自動抽出された内容を精査・手動編集し保存してください。ここでの内容が3つの補助金フォーマットへ自動展開されます。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAllAndSync}
              className="px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              全項目を一括保存・補助金へ反映
            </button>
          </div>
        </div>

        <div className="space-y-6">
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
                      {promptOpen ? '抽出プロンプトを隠す' : '抽出プロンプトを確認'}
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
                      onClick={() => handleSaveSingleItem(item)}
                      className="px-3 py-1 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
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
                  value={currentVal}
                  onChange={(e) =>
                    setDraftItems((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  placeholder="上の「ヒアリング情報を解析しマスターを自動生成」を実行するか、直接入力してください。"
                  className="w-full border border-slate-300 p-3 text-sm leading-relaxed text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            );
          })}
        </div>

        {/* Proceed to Screen 3 Bar */}
        {(hasSavedMasterSession || hasAnyMasterContent) && (
          <div className="border-t border-slate-200 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              マスターヒアリングシートの準備が整いました。各補助金の様式・文字数規定に合わせた申請書編集へ進めます。
            </div>
            <button
              type="button"
              onClick={() => {
                handleSaveAllAndSync();
                onNavigateToEditor();
              }}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              補助金別マッピング・申請書作成画面へ進む →
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
