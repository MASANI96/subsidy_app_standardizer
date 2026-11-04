import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  ALL_GUIDE_STEPS,
  GUIDE_CHAPTERS,
  GuideStep,
  SPEC_CORRESPONDENCE_ROWS,
  SpecCorrespondenceRow,
} from '../data/guideSteps';
import { SpecTagBadge } from './SpecTagBadge';

interface GuidePanelProps {
  isOpen: boolean;
  checkedStepIds: string[];
  activeStepId: string | null;
  onToggleOpen: () => void;
  onSelectStep: (step: GuideStep) => void;
  onSelectSpecRow: (row: SpecCorrespondenceRow) => void;
  onResetProgress: () => void;
  onStartDemoTour: () => void;
}

export const GuidePanel: React.FC<GuidePanelProps> = ({
  isOpen,
  checkedStepIds,
  activeStepId,
  onToggleOpen,
  onSelectStep,
  onSelectSpecRow,
  onResetProgress,
  onStartDemoTour,
}) => {
  const [panelTab, setPanelTab] = useState<'guide' | 'spec'>('guide');
  const [openChapterIds, setOpenChapterIds] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      GUIDE_CHAPTERS.forEach((ch, idx) => {
        initial[ch.id] = idx <= 4; // 初期状態で主要章を開いておく
      });
      return initial;
    }
  );

  const totalSteps = ALL_GUIDE_STEPS.length;
  const checkedCount = checkedStepIds.length;
  const progressPct =
    totalSteps > 0 ? Math.round((checkedCount / totalSteps) * 100) : 0;

  if (!isOpen) {
    return (
      <aside
        aria-label="操作ガイド（折りたたみ中）"
        className="w-12 shrink-0 bg-white border-r border-slate-300 flex flex-col items-center py-4 gap-4 select-none"
      >
        <button
          type="button"
          onClick={onToggleOpen}
          title="操作ガイド・指示書対応表を開く"
          className="p-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleOpen}
          className="flex flex-col items-center gap-2 text-slate-700 hover:text-slate-950 cursor-pointer py-2"
        >
          <BookOpen className="w-4 h-4" />
          <span
            className="text-xs font-bold tracking-widest"
            style={{ writingMode: 'vertical-rl' }}
          >
            ガイド
          </span>
          <span className="text-[10px] font-mono tabular-nums text-slate-500">
            {checkedCount}/{totalSteps}
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="操作ガイド・指示書対応表"
      className="w-80 shrink-0 bg-white border-r border-slate-300 flex flex-col max-h-[calc(100vh-52px)] sticky top-[52px]"
    >
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-300 shrink-0" />
          <span className="text-xs font-bold tracking-tight">
            仕様確認・操作ガイド
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          title="ガイドパネルを折りたたむ"
          className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="ガイドパネルを折りたたむ"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 2-Tab Switcher */}
      <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100 shrink-0">
        <button
          type="button"
          onClick={() => setPanelTab('guide')}
          className={`py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            panelTab === 'guide'
              ? 'bg-white border-slate-900 text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          操作ガイド（{checkedCount}/{totalSteps}）
        </button>
        <button
          type="button"
          onClick={() => setPanelTab('spec')}
          className={`py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            panelTab === 'spec'
              ? 'bg-white border-slate-900 text-slate-900'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          指示書対応表
        </button>
      </div>

      {/* TAB 1: Step-by-Step Interactive Guide */}
      {panelTab === 'guide' && (
        <>
          {/* Demo Tour CTA + Progress Bar */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 space-y-2.5 shrink-0">
            <button
              type="button"
              onClick={onStartDemoTour}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>デモツアーを開始（約5分）</span>
            </button>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>各項目クリックで該当箇所へ移動・強調</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {checkedCount}/{totalSteps} 確認済
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-emerald-700 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Chapters Accordion List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
            {GUIDE_CHAPTERS.map((chapter) => {
              const isOpenChapter = Boolean(openChapterIds[chapter.id]);
              const chapterDoneCount = chapter.steps.filter((s) =>
                checkedStepIds.includes(s.id)
              ).length;

              return (
                <div key={chapter.id} className="bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenChapterIds((prev) => ({
                        ...prev,
                        [chapter.id]: !prev[chapter.id],
                      }))
                    }
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0">
                        {chapter.numberLabel.padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {chapter.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono tabular-nums text-slate-500">
                        {chapterDoneCount}/{chapter.steps.length}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                          isOpenChapter ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isOpenChapter && (
                    <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/40">
                      {chapter.steps.map((step) => {
                        const isChecked = checkedStepIds.includes(step.id);
                        const isCurrent = activeStepId === step.id;
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => onSelectStep(step)}
                            className={`w-full px-3.5 py-2.5 text-left transition-colors cursor-pointer space-y-1 ${
                              isCurrent
                                ? 'bg-slate-900 text-white'
                                : 'hover:bg-slate-100/80 text-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <span
                                  className={`mt-0.5 w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                                    isChecked
                                      ? isCurrent
                                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                        : 'bg-emerald-700 border-emerald-700 text-white'
                                      : isCurrent
                                        ? 'border-slate-500'
                                        : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isChecked && <Check className="w-2.5 h-2.5" />}
                                </span>
                                <span
                                  className={`text-xs font-bold leading-snug ${
                                    isCurrent ? 'text-white' : 'text-slate-900'
                                  }`}
                                >
                                  {step.title}
                                </span>
                              </div>
                            </div>

                            {step.specTag !== '―' && (
                              <div className="pl-5">
                                <span
                                  className={`inline-block px-1.5 py-0.5 text-[10px] font-mono border ${
                                    isCurrent
                                      ? 'bg-slate-800 text-slate-200 border-slate-600'
                                      : 'bg-slate-100 text-slate-600 border-slate-300'
                                  }`}
                                >
                                  {step.specTag}
                                </span>
                              </div>
                            )}

                            <p
                              className={`pl-5 text-[11px] leading-relaxed ${
                                isCurrent ? 'text-slate-200' : 'text-slate-600'
                              }`}
                            >
                              {step.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Reset Link */}
          <div className="px-3.5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onResetProgress}
              className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ガイドの確認状況をリセット</span>
            </button>
          </div>
        </>
      )}

      {/* TAB 2: Specification Correspondence Table (§2) */}
      {panelTab === 'spec' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/40">
          <div className="p-2.5 bg-white border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            「【業務指示・依頼書】補助金申請作業の標準化・仕組み化プロジェクト（20261102修正版）」の全要件と画面の対応一覧です。クリックで該当画面へ移動します。
          </div>

          {SPEC_CORRESPONDENCE_ROWS.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelectSpecRow(row)}
              className="w-full text-left bg-white border border-slate-200 hover:border-slate-900 p-3 space-y-1.5 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <SpecTagBadge tag={row.tag} />
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300 whitespace-nowrap">
                  <Check className="w-2.5 h-2.5" />
                  モック実装済
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 leading-snug">
                {row.requirement}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>対応画面: {row.screenLabel}</span>
                <span className="underline text-slate-700">開く →</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};
