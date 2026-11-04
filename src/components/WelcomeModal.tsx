import React, { useState } from 'react';
import { BookOpen, Play } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onStartTour: (dontShowAgain: boolean) => void;
  onSelfExplore: (dontShowAgain: boolean) => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onStartTour,
  onSelfExplore,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="w-full max-w-xl bg-white border border-slate-900 shadow-xl">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="text-xs font-mono tracking-wider text-slate-300">
            SPECIFICATION WALKTHROUGH MOCK
          </div>
          <span className="px-2 py-0.5 text-[11px] bg-slate-800 border border-slate-700 text-slate-200">
            業務指示書（20261102修正版）準拠
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <h2
              id="welcome-modal-title"
              className="text-xl font-bold text-slate-900 tracking-tight"
            >
              補助金申請標準化システム（仕様確認用モック）
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              1回のマスターヒアリングと収支計画確定から、3つの補助金申請書を数値矛盾ゼロ・手戻りゼロで標準作成する業務フローを体験いただけます。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => onStartTour(dontShowAgain)}
              className="flex flex-col items-start justify-between gap-2 p-4 bg-slate-900 text-white hover:bg-slate-800 border border-slate-900 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <Play className="w-4 h-4 fill-white shrink-0" />
                <span>デモツアーを開始（約5分）</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                実案件「株式会社テックプレシジョン」を一気通貫で自動操作しながら、全17ステップで主要機能をご案内します。
              </p>
            </button>

            <button
              type="button"
              onClick={() => onSelfExplore(dontShowAgain)}
              className="flex flex-col items-start justify-between gap-2 p-4 bg-white text-slate-900 hover:bg-slate-50 border border-slate-300 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <BookOpen className="w-4 h-4 text-slate-700 shrink-0" />
                <span>ガイドを見ながら自分で操作</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                画面左側の「操作ガイド・指示書対応表」を開いた状態で、気になる画面や機能を自由にご確認いただけます。
              </p>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="accent-slate-900"
              />
              <span>次回から表示しない</span>
            </label>
            <span className="text-[11px] text-slate-400">
              ※ヘッダーのボタンからいつでもツアーを再開できます
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
