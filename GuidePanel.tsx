import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  MessageSquareText,
  Navigation,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  GUIDE_CHAPTERS,
  GuideChapter,
  GuideStep,
  SPEC_CORRESPONDENCE_ROWS,
  SpecCorrespondenceRow,
} from '../data/guideSteps';
import { SpecTagBadge } from './SpecTagBadge';

interface GuidePanelProps {
  isOpen: boolean;
  currentChapterIndex: number;
  activeStepId: string | null;
  checkedStepIds: string[];
  onClose: () => void;
  onSelectChapter: (chapterIndex: number, chapter: GuideChapter) => void;
  onSelectStep: (chapterIndex: number, step: GuideStep) => void;
  onSelectSpecRow: (row: SpecCorrespondenceRow) => void;
  onHighlightGuideId: (guideId: string) => void;
  onResetAllData: () => void;
}

export const GuidePanel: React.FC<GuidePanelProps> = ({
  isOpen,
  currentChapterIndex,
  activeStepId,
  checkedStepIds,
  onClose,
  onSelectChapter,
  onSelectStep,
  onSelectSpecRow,
  onHighlightGuideId,
  onResetAllData,
}) => {
  const [panelTab, setPanelTab] = useState<'script' | 'spec'>('script');
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const safeIndex = Math.max(
    0,
    Math.min(currentChapterIndex, GUIDE_CHAPTERS.length - 1)
  );
  const currentChapter = GUIDE_CHAPTERS[safeIndex];
  const progressPct = Math.round(
    ((safeIndex + 1) / GUIDE_CHAPTERS.length) * 100
  );

  const handlePrev = () => {
    if (safeIndex > 0) {
      onSelectChapter(safeIndex - 1, GUIDE_CHAPTERS[safeIndex - 1]);
    }
  };

  const handleNext = () => {
    if (safeIndex < GUIDE_CHAPTERS.length - 1) {
      onSelectChapter(safeIndex + 1, GUIDE_CHAPTERS[safeIndex + 1]);
    }
  };

  return (
    <aside
      aria-label="説明ガイド＆進行ナビ"
      className="w-[340px] shrink-0 bg-white border-r border-slate-300 flex flex-col max-h-[calc(100vh-52px)] sticky top-[52px] z-20"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-blue-300 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-tight truncate">
              説明ガイド＆進行ナビ（台本00〜11）
            </div>
            <div className="text-[10px] text-slate-300 font-mono">
              {String(safeIndex + 1).padStart(2, '0')} / {GUIDE_CHAPTERS.length} 章
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="説明ガイドを閉じる"
          className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          aria-label="説明ガイドを閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-tabs: Script Nav / Spec Table */}
      <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100 shrink-0">
        <button
          type="button"
          onClick={() => setPanelTab('script')}
          className={`py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            panelTab === 'script'
              ? 'bg-white border-blue-700 text-blue-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          台本ナビ（00〜11）
        </button>
        <button
          type="button"
          onClick={() => setPanelTab('spec')}
          className={`py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            panelTab === 'spec'
              ? 'bg-white border-blue-700 text-blue-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          機能・指示書対応表
        </button>
      </div>

      {panelTab === 'script' ? (
        <>
          {/* Progress + Chapter Jump + Prev/Next */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 space-y-2.5 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>進行状況（目安 {currentChapter.durationHint}）</span>
                <span className="font-mono font-bold text-slate-900">
                  {currentChapter.numberLabel} / 11 章
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-blue-700 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="guide-chapter-select" className="sr-only">
                章を選択
              </label>
              <select
                id="guide-chapter-select"
                value={safeIndex}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  onSelectChapter(idx, GUIDE_CHAPTERS[idx]);
                }}
                className="w-full bg-white border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-700"
              >
                {GUIDE_CHAPTERS.map((ch, idx) => (
                  <option key={ch.id} value={idx}>
                    {ch.numberLabel}. {ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={safeIndex === 0}
                onClick={handlePrev}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>前へ</span>
              </button>
              <button
                type="button"
                disabled={safeIndex === GUIDE_CHAPTERS.length - 1}
                onClick={handleNext}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>次へ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Current Chapter Details */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* Chapter Title */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300">
                  台本 {currentChapter.numberLabel}
                </span>
                <span className="text-[11px] text-slate-500">
                  確認済ステップ: {checkedStepIds.length}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {currentChapter.title}
              </h3>
            </div>

            {/* Talking Points */}
            <div className="bg-amber-50/70 border border-amber-200 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <MessageSquareText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>クライアントへ話すポイント</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-800 leading-relaxed list-disc pl-4">
                {currentChapter.talkingPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            {/* Step-by-Step Operations */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-700">
                操作手順・注目ポイント（クリックで遷移＆強調）
              </div>
              {currentChapter.steps.map((step, sIdx) => {
                const isActive = activeStepId === step.id;
                const isChecked = checkedStepIds.includes(step.id);

                return (
                  <div
                    key={step.id}
                    className={`border p-3 space-y-2 transition-colors ${
                      isActive
                        ? 'bg-blue-50/60 border-blue-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 w-4 h-4 text-[10px] font-mono font-bold flex items-center justify-center border shrink-0 ${
                          isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isActive
                              ? 'bg-blue-700 border-blue-700 text-white'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                        }`}
                      >
                        {isChecked ? <Check className="w-2.5 h-2.5" /> : sIdx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {step.title}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-6">
                      <button
                        type="button"
                        onClick={() => onSelectStep(safeIndex, step)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <Navigation className="w-3 h-3 shrink-0" />
                        <span>{step.actionLabel || 'この画面を表示して強調'}</span>
                      </button>
                      <button
                        type="button"
                        title="該当箇所をもう一度ハイライト"
                        onClick={() => {
                          onSelectStep(safeIndex, step);
                          onHighlightGuideId(step.guideId);
                        }}
                        className="p-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer shrink-0"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: Specification Correspondence Table */
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50">
          <div className="p-2.5 bg-white border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            業務指示書の要件と実装画面の対応一覧です。クリックで該当画面・該当機能へ直接移動してハイライトします。
          </div>

          {SPEC_CORRESPONDENCE_ROWS.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelectSpecRow(row)}
              className="w-full text-left bg-white border border-slate-200 hover:border-blue-600 p-3 space-y-1.5 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <SpecTagBadge tag={row.tag} />
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300 whitespace-nowrap">
                  <Check className="w-2.5 h-2.5" />
                  実装済
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 leading-snug">
                {row.requirement}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>対応画面: {row.screenLabel}</span>
                <span className="underline text-blue-800 font-semibold">開く →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Footer: Reset Demo Data */}
      <div className="px-3.5 py-2.5 border-t border-slate-200 bg-slate-50 shrink-0">
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>デモデータを初期状態に戻す（リセット）</span>
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-rose-800">
              全編集内容を破棄して初期データへ戻しますか？
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2 py-1 text-[11px] bg-white border border-slate-300 text-slate-700 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAllData();
                  setConfirmReset(false);
                }}
                className="px-2 py-1 text-[11px] font-bold bg-rose-700 text-white hover:bg-rose-800 cursor-pointer"
              >
                リセット実行
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
