import React, { useMemo, useState } from 'react';
import { TEXT_MODULE_CATEGORIES } from '../data/initialData';
import { Project, TextModule, TextModuleCategory } from '../types';
import { interpolateTags } from '../utils/financialCalculations';

interface ModulePickerModalProps {
  isOpen: boolean;
  sectionTitle: string;
  defaultCategory?: TextModuleCategory | 'ALL';
  defaultLength?: 'all' | 'short' | 'long';
  project: Project;
  modules: TextModule[];
  onInsertText: (interpolatedText: string, mode: 'append' | 'replace') => void;
  onClose: () => void;
}

function renderHighlightedTemplate(text: string): React.ReactNode {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, idx) =>
    part.startsWith('{') && part.endsWith('}') ? (
      <span
        key={idx}
        className="font-mono text-xs font-semibold bg-amber-100 text-amber-950 px-1 py-0.5 border border-amber-300 mx-0.5"
      >
        {part}
      </span>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

export const ModulePickerModal: React.FC<ModulePickerModalProps> = ({
  isOpen,
  sectionTitle,
  defaultCategory = 'ALL',
  defaultLength = 'all',
  project,
  modules,
  onInsertText,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    TextModuleCategory | 'ALL'
  >(defaultCategory);
  const [lengthFilter, setLengthFilter] = useState<'all' | 'short' | 'long'>(
    defaultLength
  );

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      if (selectedCategory !== 'ALL' && m.category !== selectedCategory) {
        return false;
      }
      if (lengthFilter !== 'all' && m.lengthType !== lengthFilter) {
        return false;
      }
      return true;
    });
  }, [modules, selectedCategory, lengthFilter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="module-picker-title"
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-white border border-slate-300 shadow-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <h2
              id="module-picker-title"
              className="text-base font-bold text-slate-900"
            >
              文章モジュールライブラリから挿入（収支マスター実数値へ自動置換）
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              挿入先セクション: <span className="font-semibold">{sectionTitle}</span> · 対象案件:{' '}
              <span className="font-semibold">{project.companyName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-mono text-slate-500 hover:text-slate-900 px-2 py-1 cursor-pointer"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-white">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              全カテゴリ
            </button>
            {TEXT_MODULE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-200 shrink-0">
            {(
              [
                { id: 'all', label: '全文字数' },
                { id: 'short', label: '短文（約200字）' },
                { id: 'long', label: '長文（約500字）' },
              ] as const
            ).map((lf) => (
              <button
                key={lf.id}
                type="button"
                onClick={() => setLengthFilter(lf.id)}
                className={`px-2.5 py-1 text-xs font-medium whitespace-nowrap cursor-pointer ${
                  lengthFilter === lf.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Module Cards List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {filteredModules.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 bg-white border border-slate-200">
              条件に一致する文章モジュールがありません。フィルタを変更してください。
            </div>
          ) : (
            filteredModules.map((mod) => {
              const interpolated = interpolateTags(mod.templateText, project);
              return (
                <div
                  key={mod.id}
                  className="bg-white border border-slate-200 p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="text-xs text-slate-500">
                        {mod.categoryLabel} ·{' '}
                        {mod.lengthType === 'short'
                          ? '短文（約200字）'
                          : '長文（約500字）'}{' '}
                        · 実数値置換後 {interpolated.length}文字
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {mod.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onInsertText(interpolated, 'append');
                          onClose();
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        末尾に追記挿入
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onInsertText(interpolated, 'replace');
                          onClose();
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        この文面をエディタに挿入（全文置換）
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 border border-slate-200 p-3 space-y-1">
                      <div className="font-semibold text-slate-600">
                        テンプレート原文（変数タグ表示）
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {renderHighlightedTemplate(mod.templateText)}
                      </p>
                    </div>

                    <div className="bg-emerald-50/40 border border-emerald-200 p-3 space-y-1">
                      <div className="font-semibold text-emerald-950">
                        収支マスター実数値 置換プレビュー（挿入される文面）
                      </div>
                      <p className="text-slate-900 leading-relaxed">
                        {interpolated}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
