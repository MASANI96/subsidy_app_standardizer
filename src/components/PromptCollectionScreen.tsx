import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { SUBSIDY_TYPES } from '../data/initialData';
import {
  CallRound,
  GenerationPromptItem,
  MasterSchemaTemplate,
  Role,
  SubsidyType,
} from '../types';
import { canEdit } from '../utils/permissions';
import { ReadOnlyRoleBadge, SpecTagBadge } from './SpecTagBadge';

interface PromptCollectionScreenProps {
  role: Role;
  activeCallRound: CallRound;
  masterTemplates: MasterSchemaTemplate[];
  crossCheckPrompt: string;
  onUpdateGenerationPrompt: (
    roundId: string,
    promptId: string,
    promptText: string
  ) => void;
  onUpdateCrossCheckPrompt: (prompt: string) => void;
  onNotify: (message: string) => void;
}

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

export const PromptCollectionScreen: React.FC<PromptCollectionScreenProps> = ({
  role,
  activeCallRound,
  masterTemplates,
  crossCheckPrompt,
  onUpdateGenerationPrompt,
  onUpdateCrossCheckPrompt,
  onNotify,
}) => {
  const [subsidyFilter, setSubsidyFilter] = useState<SubsidyType | 'ALL'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draftGenPrompts, setDraftGenPrompts] = useState<Record<string, string>>(
    {}
  );
  const [draftCrossPrompt, setDraftCrossPrompt] = useState(crossCheckPrompt);

  const canEditPrompts = canEdit(role, 'prompts_edit');

  useEffect(() => {
    const map: Record<string, string> = {};
    activeCallRound.generationPrompts.forEach((gp) => {
      map[gp.id] = gp.promptText;
    });
    setDraftGenPrompts(map);
  }, [activeCallRound.id, activeCallRound.generationPrompts]);

  useEffect(() => {
    setDraftCrossPrompt(crossCheckPrompt);
  }, [crossCheckPrompt]);

  const filteredGenPrompts = activeCallRound.generationPrompts.filter(
    (gp) => subsidyFilter === 'ALL' || gp.subsidyType === subsidyFilter
  );

  const triggerCopiedBadge = (id: string) => {
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : id));
    }, 2000);
  };

  const handleCopySingle = async (id: string, label: string, text: string) => {
    const ok = await copyTextSafe(text);
    if (ok) {
      triggerCopiedBadge(id);
      onNotify(`「${label}」のプロンプトをクリップボードにコピーしました。`);
    } else {
      onNotify('クリップボードへのコピーに失敗しました。');
    }
  };

  const handleCopyAllPrompts = async () => {
    const blocks: string[] = [];
    blocks.push(
      `# 補助金申請標準化システム 生成AI用プロンプト集（適用公募回: ${activeCallRound.name}）`
    );
    blocks.push('\n## 第1部：補助金・セクション別 文章生成プロンプト');
    activeCallRound.generationPrompts.forEach((gp, idx) => {
      const txt = draftGenPrompts[gp.id] ?? gp.promptText;
      blocks.push(
        `\n### ${idx + 1}. [${gp.subsidyType}] ${gp.sectionTitle}\n- 入力元: ${gp.sourceMasterLabel}\n- 推奨変数タグ: ${gp.recommendedTags.join(' ')}\n\n${txt}`
      );
    });
    blocks.push(
      `\n## 第2部：定性・定量 整合性クロスチェック用プロンプト\n\n${draftCrossPrompt}`
    );
    blocks.push('\n## 第3部：マスターヒアリング抽出用プロンプト（参考）');
    masterTemplates.forEach((tpl, idx) => {
      blocks.push(`\n### マスター項目0${idx + 1}: ${tpl.title}\n${tpl.prompt}`);
    });

    const fullText = blocks.join('\n');
    const ok = await copyTextSafe(fullText);
    if (ok) {
      triggerCopiedBadge('COPY_ALL');
      onNotify(
        `全プロンプト（文章生成${activeCallRound.generationPrompts.length}本＋整合性チェック1本＋マスター抽出${masterTemplates.length}本）を一括コピーしました。`
      );
    } else {
      onNotify('クリップボードへの一括コピーに失敗しました。');
    }
  };

  const handleSaveGenPrompt = (gp: GenerationPromptItem) => {
    if (!canEditPrompts) return;
    const val = (draftGenPrompts[gp.id] ?? gp.promptText).trim();
    if (!val) {
      onNotify('プロンプト本文を入力してください。');
      return;
    }
    onUpdateGenerationPrompt(activeCallRound.id, gp.id, val);
    onNotify(
      `[${gp.subsidyType}]「${gp.sectionTitle}」の文章生成プロンプトを保存しました。`
    );
  };

  const handleSaveCrossCheck = () => {
    if (!canEditPrompts) return;
    const val = draftCrossPrompt.trim();
    if (!val) {
      onNotify('整合性クロスチェック用プロンプトを入力してください。');
      return;
    }
    onUpdateCrossCheckPrompt(val);
    onNotify(
      '整合性クロスチェック用プロンプトを保存しました（管理者設定タブと同期済）。'
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>
              05. 生成AI用プロンプト集 · 標準文章生成＆整合性クロスチェック（現在ロール:{' '}
              {role}）
            </span>
            <SpecTagBadge tag="指示書 4-⑦ / Step7" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              生成AI用プロンプト集（文章生成用＋整合性クロスチェック用）
            </h1>
            {!canEditPrompts && (
              <ReadOnlyRoleBadge role={role} note="閲覧＋コピーのみ" />
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            適用公募回: <span className="font-semibold">{activeCallRound.name}</span>
            {' · '}全ロールで閲覧・コピーが可能です（プロンプト本文の書き換えはシステム管理者のみ）。
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyAllPrompts}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            {copiedId === 'COPY_ALL' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>一括コピー完了</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>全プロンプトを一括コピー</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section 1: Generation Prompts (9 items = 3 subsidies x 3 sections) */}
      <section
        data-guide-id="guide-prompts-generation"
        className="bg-white border border-slate-200 p-6 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                01. 補助金・セクション別 文章生成用プロンプト（全{activeCallRound.generationPrompts.length}本）
              </h2>
              <SpecTagBadge tag="指示書 4-⑦" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              すべての生成プロンプトに「金額・数値は {'{設備投資額}'} 等の変数タグまたは収支マスター確定値を引用し、独自の推計数値を作らない」厳格ルールを組み込んでいます。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setSubsidyFilter('ALL')}
              className={`px-3 py-1 text-xs font-semibold cursor-pointer ${
                subsidyFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              すべて（{activeCallRound.generationPrompts.length}）
            </button>
            {SUBSIDY_TYPES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSubsidyFilter(st)}
                className={`px-3 py-1 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                  subsidyFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredGenPrompts.map((gp) => {
            const currentVal = draftGenPrompts[gp.id] ?? gp.promptText;
            const isDirty = currentVal !== gp.promptText;
            const customChars =
              activeCallRound.sectionCharLimits[gp.sectionId] ?? 400;
            const lengthBadge =
              gp.lengthMode === '500'
                ? '長文（推奨500字以上）'
                : gp.lengthMode === '200'
                  ? '短文（約200字）'
                  : `様式指定（上限${customChars}字）`;

            return (
              <article
                key={gp.id}
                className="border border-slate-200 p-5 space-y-3 bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 font-semibold bg-slate-900 text-white">
                        {gp.subsidyType}
                      </span>
                      <span className="px-2 py-0.5 font-mono text-[11px] bg-slate-100 text-slate-700 border border-slate-300">
                        {lengthBadge}
                      </span>
                      <span className="text-slate-500">
                        入力元: {gp.sourceMasterLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                      {gp.sectionTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopySingle(
                          gp.id,
                          `${gp.subsidyType} - ${gp.sectionTitle}`,
                          currentVal
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {copiedId === gp.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>コピー済</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>コピー</span>
                        </>
                      )}
                    </button>

                    {canEditPrompts && (
                      <button
                        type="button"
                        onClick={() => handleSaveGenPrompt(gp)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {isDirty ? '変更を保存*' : '保存'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-500">推奨変数タグ:</span>
                  {gp.recommendedTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 text-[11px] font-mono bg-amber-50 text-amber-950 border border-amber-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <textarea
                  rows={4}
                  readOnly={!canEditPrompts}
                  value={currentVal}
                  onChange={(e) =>
                    setDraftGenPrompts((prev) => ({
                      ...prev,
                      [gp.id]: e.target.value,
                    }))
                  }
                  className="w-full border border-slate-300 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-900 read-only:bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800"
                />
              </article>
            );
          })}
        </div>
      </section>

      {/* Section 2: Consistency Cross-Check Prompt (Single Source with Admin Tab) */}
      <section
        data-guide-id="guide-prompts-crosscheck"
        className="bg-white border border-slate-200 p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                02. 定性・定量 整合性クロスチェック用プロンプト
              </h2>
              <SpecTagBadge tag="指示書 4-⑦" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              完成した事業計画本文と収支計画マスターを突合し、数値矛盾・根拠不足を検出するための監査プロンプトです（「管理者設定」の監査プロンプトと単一データで同期しています）。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                handleCopySingle(
                  'CROSS_CHECK',
                  '整合性クロスチェック用プロンプト',
                  draftCrossPrompt
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copiedId === 'CROSS_CHECK' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>コピー済</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>コピー</span>
                </>
              )}
            </button>

            {canEditPrompts && (
              <button
                type="button"
                onClick={handleSaveCrossCheck}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                監査プロンプトを保存
              </button>
            )}
          </div>
        </div>

        <textarea
          rows={8}
          readOnly={!canEditPrompts}
          value={draftCrossPrompt}
          onChange={(e) => setDraftCrossPrompt(e.target.value)}
          className="w-full border border-slate-300 bg-slate-50/50 p-3.5 text-xs leading-relaxed text-slate-900 read-only:bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800"
        />
      </section>

      {/* Section 3: Master Hearing Extraction Prompts Reference */}
      <section className="bg-white border border-slate-200 p-6 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            03. マスターヒアリングシート 構造化抽出プロンプト（全{masterTemplates.length}項目）
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            打合せ議事録から共通マスター定性項目を抽出するためのプロンプトです。項目の追加・順序変更は「06. 管理者設定」から行えます。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {masterTemplates.map((tpl, idx) => (
            <div
              key={tpl.id}
              className="border border-slate-200 p-4 space-y-2 bg-slate-50/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">
                  0{idx + 1}. {tpl.title}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopySingle(tpl.id, tpl.title, tpl.prompt)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  {copiedId === tpl.id ? 'コピー済' : 'コピー'}
                </button>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {tpl.prompt}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
