import React, { useMemo } from 'react';
import { ArrowDown, ArrowRight, ExternalLink } from 'lucide-react';
import { SUBSIDY_TYPES } from '../data/initialData';
import { CallRound, Project, Role, SubsidyType } from '../types';
import { SpecTagBadge } from './SpecTagBadge';

interface MappingTableScreenProps {
  project: Project;
  role: Role;
  activeCallRound: CallRound;
  onJumpToEditorSection: (subsidyType: SubsidyType, sectionId: string) => void;
  onJumpToFinancial: () => void;
  onJumpToHearing: () => void;
}

interface DerivedCellInfo {
  sectionId: string;
  sectionTitle: string;
  handlingLabel: '全文' | '要約' | '補強';
  charLimitText: string;
}

function getHandlingType(subsidyType: SubsidyType): '全文' | '要約' | '補強' {
  if (subsidyType === '新事業進出補助金') return '全文';
  if (subsidyType === '小規模事業者持続化補助金') return '要約';
  return '補強';
}

function getHandlingBadgeStyle(handling: '全文' | '要約' | '補強'): string {
  if (handling === '全文') {
    return 'bg-slate-900 text-white border-slate-900';
  }
  if (handling === '要約') {
    return 'bg-sky-50 text-sky-900 border-sky-300';
  }
  return 'bg-amber-50 text-amber-950 border-amber-300';
}

function formatCharLimitDisplay(
  selectedLength: '200' | '500' | 'custom',
  sectionId: string,
  sectionCharLimits: Record<string, number>
): string {
  if (selectedLength === '500') return '推奨 500字以上';
  if (selectedLength === '200') return '指定 約200字';
  const custom = sectionCharLimits[sectionId] ?? 400;
  return `指定 上限${custom}字`;
}

export const MappingTableScreen: React.FC<MappingTableScreenProps> = ({
  project,
  role,
  activeCallRound,
  onJumpToEditorSection,
  onJumpToFinancial,
  onJumpToHearing,
}) => {
  // セクション定義（sourceMasterIds等）から二重管理せず動的に導出（M4）
  const qualitativeRows = useMemo(() => {
    return project.masterItems.map((masterItem, idx) => {
      const cells: Record<SubsidyType, DerivedCellInfo[]> = {
        新事業進出補助金: [],
        小規模事業者持続化補助金: [],
        東京都経営強化基盤事業: [],
      };

      SUBSIDY_TYPES.forEach((st) => {
        const matchedSections = project.subsidies[st].sections.filter((sec) =>
          sec.sourceMasterIds.includes(masterItem.id)
        );
        cells[st] = matchedSections.map((sec) => ({
          sectionId: sec.id,
          sectionTitle: sec.title,
          handlingLabel: getHandlingType(st),
          charLimitText: formatCharLimitDisplay(
            sec.selectedLength,
            sec.id,
            activeCallRound.sectionCharLimits
          ),
        }));
      });

      return {
        rowKey: masterItem.id,
        rowNumber: `定性 0${idx + 1}`,
        rowTitle: masterItem.title,
        rowSummary:
          masterItem.content.slice(0, 56) +
          (masterItem.content.length > 56 ? '...' : ''),
        cells,
      };
    });
  }, [project.masterItems, project.subsidies, activeCallRound.sectionCharLimits]);

  // 定量（算定変数・収支計画データ）行もセクション3（定量効果・収益計画）へ動的連動
  const quantitativeRows = useMemo(() => {
    const buildEffectSectionCells = (): Record<SubsidyType, DerivedCellInfo> => {
      const out = {} as Record<SubsidyType, DerivedCellInfo>;
      SUBSIDY_TYPES.forEach((st) => {
        const secs = project.subsidies[st].sections;
        const targetSec = secs[secs.length - 1] ?? secs[0];
        out[st] = {
          sectionId: targetSec.id,
          sectionTitle: targetSec.title,
          handlingLabel: getHandlingType(st),
          charLimitText: formatCharLimitDisplay(
            targetSec.selectedLength,
            targetSec.id,
            activeCallRound.sectionCharLimits
          ),
        };
      });
      return out;
    };

    const effectCells = buildEffectSectionCells();

    return [
      {
        id: 'quant-drivers',
        code: '定量 A',
        title: '数値計画の算定変数（単価・客数・削減工数・雇用予定）',
        subtitle: `新事業単価 ${project.hearingVariables.newUnitPrice.value.toLocaleString()}円 × 3年目 ${project.hearingVariables.newCustomerCountY3.value.toLocaleString()}件 / 削減 ${project.hearingVariables.reducedWorkHours.value.toLocaleString()}時間`,
        effectCells,
        extraNotes: {
          新事業進出補助金:
            '売上増加額・付加価値成長・賃上げ計画の根拠として本文＋様式へ全文展開',
          小規模事業者持続化補助金:
            '新商品の客単価・獲得見込客数に絞って販路開拓効果を簡潔要約',
          東京都経営強化基盤事業:
            'リードタイム短縮・不良率低減・生産能力向上の定量根拠を補強記載',
        } as Record<SubsidyType, string>,
      },
      {
        id: 'quant-financial',
        code: '定量 B',
        title: '収支計画マスターデータ（直近3期実績・将来3ヶ年計画・投資償却）',
        subtitle: `総投資 ${project.financialMaster.investment.totalInvestment.toLocaleString()}万円 / 3年後売上 ${project.financialMaster.forecast.y3.sales.toLocaleString()}万円`,
        effectCells,
        extraNotes: {
          新事業進出補助金:
            '基準年度＋3ヶ年の付加価値額・一人当たり給与総額・設備投資明細へ変換',
          小規模事業者持続化補助金:
            '機械装置等費・広報費・ウェブサイト関連費等の経費明細表へ抽出変換',
          東京都経営強化基盤事業:
            '都内設置の機械装置・システム等導入費（相見積2社突合）および助成額へ変換',
        } as Record<SubsidyType, string>,
      },
    ];
  }, [
    project.subsidies,
    project.hearingVariables,
    project.financialMaster,
    activeCallRound.sectionCharLimits,
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>
              04. 3補助金マッピング表 · 親マスターからの引き算・要件追加構造（現在ロール:{' '}
              {role}）
            </span>
            <SpecTagBadge tag="指示書 2" />
            <SpecTagBadge tag="指示書 4-④ / Step5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            3つの補助金対応マッピング表（親子階層構造・項目対照）
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            対象案件:{' '}
            <span className="font-semibold text-slate-900">
              {project.companyName}
            </span>
            {' · '}適用公募回: {activeCallRound.name}
            {' · '}表内の各セルをクリックすると、該当補助金・該当セクションの申請書エディタへ直接移動します。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onJumpToHearing}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            マスターヒアリングシートへ
          </button>
          <button
            type="button"
            onClick={onJumpToFinancial}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            収支計画マスターへ
          </button>
        </div>
      </div>

      {/* Top Section: Hierarchy Diagram (指示書 2) */}
      <section
        data-guide-id="guide-mapping-hierarchy"
        className="bg-white border border-slate-200 p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                01. 親子マスター展開ロジック（「引いて使える」標準化構造）
              </h2>
              <SpecTagBadge tag="指示書 2" />
              <SpecTagBadge tag="指示書 5" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              最も情報量が多く要件が厳格な「新事業進出補助金」を親マスターとして1回整備し、他制度へは「引き算・要約」と「固有要件の追加」で展開します。
            </p>
          </div>
        </div>

        {/* Clean Box-and-Line Architecture Diagram */}
        <div className="bg-slate-50 border border-slate-200 p-6">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            {/* Root Input Box */}
            <div className="w-full max-w-xl bg-white border border-slate-400 p-3.5 text-center">
              <div className="text-[11px] font-mono font-semibold text-slate-500">
                SINGLE SOURCE OF TRUTH（1回の取材・入力）
              </div>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                マスターヒアリングシート（定性4項目＋算定変数） × 収支計画マスター計算シート
              </div>
            </div>

            <div className="h-5 w-px bg-slate-400" />
            <ArrowDown className="w-4 h-4 text-slate-500 -mt-1" />

            {/* Parent Master Subsidy Box */}
            <button
              type="button"
              onClick={() =>
                onJumpToEditorSection('新事業進出補助金', 'shin-1')
              }
              className="w-full max-w-xl bg-slate-900 text-white border border-slate-900 p-4 text-left hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-white text-slate-900">
                  親マスター（全文展開・各500字以上）
                </span>
                <span className="text-xs text-slate-300 inline-flex items-center gap-1">
                  エディタを開く <ExternalLink className="w-3 h-3" />
                </span>
              </div>
              <div className="text-base font-bold mt-2">
                新事業進出補助金（最大情報量・全項目網羅）
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                企業概要・市場課題・新規事業の詳細・設備投資と内製化・付加価値額および賃上げ3ヶ年計画をフルボリュームで構築
              </p>
            </button>

            {/* Branch Connectors */}
            <div className="w-full max-w-2xl hidden md:grid grid-cols-2">
              <div className="flex flex-col items-center">
                <div className="w-full h-4 border-t border-r border-slate-400 translate-x-1/2" />
              </div>
              <div className="flex flex-col items-center">
                <div className="w-full h-4 border-t border-l border-slate-400 -translate-x-1/2" />
              </div>
            </div>
            <div className="w-full max-w-2xl hidden md:grid grid-cols-2 -mt-px">
              <div className="flex flex-col items-center">
                <div className="h-4 w-px bg-slate-400" />
                <ArrowDown className="w-4 h-4 text-slate-500 -mt-1" />
              </div>
              <div className="flex flex-col items-center">
                <div className="h-4 w-px bg-slate-400" />
                <ArrowDown className="w-4 h-4 text-slate-500 -mt-1" />
              </div>
            </div>

            {/* Mobile Arrow */}
            <div className="md:hidden py-2 flex items-center gap-1 text-xs text-slate-500">
              <ArrowDown className="w-4 h-4" />
              <span>派生展開</span>
            </div>

            {/* Child Subsidy Boxes */}
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Child 1: 持続化（引き算・要約） */}
              <button
                type="button"
                onClick={() =>
                  onJumpToEditorSection('小規模事業者持続化補助金', 'jizo-1')
                }
                className="bg-white border-2 border-slate-300 hover:border-slate-900 p-4 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-50 text-sky-900 border border-sky-300">
                    【引き算・要約】約200字へ凝縮
                  </span>
                  <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                    開く <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-2">
                  小規模事業者持続化補助金
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  親マスターから大規模設備要素を引き算し、「自社の強み」と「展示会・Web・サンプル活用による販路開拓」に焦点を絞って要約。
                </p>
              </button>

              {/* Child 2: 東京都（要件追加） */}
              <button
                type="button"
                onClick={() =>
                  onJumpToEditorSection('東京都経営強化基盤事業', 'tokyo-1')
                }
                className="bg-white border-2 border-slate-300 hover:border-slate-900 p-4 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-950 border border-amber-300">
                    【要件追加】都内基盤・経費妥当性を補強
                  </span>
                  <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                    開く <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 mt-2">
                  東京都経営強化基盤事業
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  親マスターの設備計画をベースに、「都内事業所での生産基盤強化・雇用維持」および「2社以上相見積による経費妥当性」を追加補強。
                </p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section: Mapping Matrix Table (指示書 4-④) */}
      <section
        data-guide-id="guide-mapping-table"
        className="bg-white border border-slate-200"
      >
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                02. 共通マスター項目 × 3補助金 セクション対照マッピング表
              </h2>
              <SpecTagBadge tag="指示書 4-④ / Step5" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              各補助金のセクション定義（sourceMasterIds・文字数設定）から自動生成しています。任意のセルをクリックすると該当セクションの編集画面へ移動します。
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                <th className="py-3 px-4 min-w-[240px] border-r border-slate-200">
                  共通マスター項目（入力元）
                </th>
                {SUBSIDY_TYPES.map((st) => (
                  <th
                    key={st}
                    className="py-3 px-4 min-w-[230px] border-r last:border-r-0 border-slate-200"
                  >
                    <div className="text-slate-900 font-bold">{st}</div>
                    <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                      {st === '新事業進出補助金'
                        ? '親マスター（全文）'
                        : st === '小規模事業者持続化補助金'
                          ? '子展開（引き算・要約）'
                          : '子展開（都内要件追加・補強）'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {/* Qualitative 4 Master Rows */}
              {qualitativeRows.map((row) => (
                <tr key={row.rowKey} className="align-top">
                  <td className="p-4 border-r border-slate-200 bg-slate-50/60">
                    <div className="font-mono text-[11px] font-semibold text-slate-500">
                      {row.rowNumber}
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {row.rowTitle}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {row.rowSummary}
                    </p>
                  </td>

                  {SUBSIDY_TYPES.map((st) => {
                    const cellItems = row.cells[st];
                    return (
                      <td
                        key={st}
                        className="p-3 border-r last:border-r-0 border-slate-200"
                      >
                        <div className="space-y-2">
                          {cellItems.map((ci) => (
                            <button
                              key={ci.sectionId}
                              type="button"
                              onClick={() =>
                                onJumpToEditorSection(st, ci.sectionId)
                              }
                              className="w-full text-left border border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-50 p-3 transition-colors cursor-pointer space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`px-1.5 py-0.5 text-[10px] font-semibold border ${getHandlingBadgeStyle(
                                    ci.handlingLabel
                                  )}`}
                                >
                                  扱い: {ci.handlingLabel}
                                </span>
                                <span className="font-mono tabular-nums text-[11px] text-slate-600">
                                  {ci.charLimitText}
                                </span>
                              </div>
                              <div className="font-bold text-slate-900">
                                {ci.sectionTitle}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                                <span>エディタで開く</span>
                                <ArrowRight className="w-3 h-3" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Quantitative 2 Master Rows (Variables + Financial Sheet) */}
              {quantitativeRows.map((qRow) => (
                <tr key={qRow.id} className="align-top bg-slate-50/30">
                  <td className="p-4 border-r border-slate-200 bg-slate-50/80">
                    <div className="font-mono text-[11px] font-semibold text-slate-500">
                      {qRow.code}
                    </div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {qRow.title}
                    </div>
                    <p className="text-[11px] font-mono tabular-nums text-slate-600 mt-1">
                      {qRow.subtitle}
                    </p>
                  </td>

                  {SUBSIDY_TYPES.map((st) => {
                    const ci = qRow.effectCells[st];
                    return (
                      <td
                        key={st}
                        className="p-3 border-r last:border-r-0 border-slate-200"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onJumpToEditorSection(st, ci.sectionId)
                          }
                          className="w-full text-left border border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-50 p-3 transition-colors cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-semibold border ${getHandlingBadgeStyle(
                                ci.handlingLabel
                              )}`}
                            >
                              扱い: {ci.handlingLabel}＋様式換算
                            </span>
                            <span className="font-mono tabular-nums text-[11px] text-slate-600">
                              {ci.charLimitText}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900">
                            {ci.sectionTitle} ＋ 指定収支・経費様式
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {qRow.extraNotes[st]}
                          </p>
                          <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                            <span>エディタで開く</span>
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
