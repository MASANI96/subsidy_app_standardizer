import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildMasterItemsFromTemplates,
  createInitialAppState,
  createTechPrecisionSubsidies,
  SUBSIDY_TYPES,
  TECH_PRECISION_MASTER_IMPROVED_4,
  TECH_PRECISION_MASTER_PRESET,
} from '../data/initialData';
import {
  DiffLog,
  DocumentStatus,
  HearingMasterItem,
  Project,
  ProjectStatus,
  Role,
  ScreenId,
  SubsidyAppState,
  SubsidyDocument,
  SubsidyType,
} from '../types';

const STORAGE_KEY = 'subsidy_standardization_mock_v1';

function formatNowTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function parseManYen(amountStr: string): number {
  const normalized = amountStr.replace(/,/g, '').trim();
  const okuMatch = normalized.match(/(\d+(?:\.\d+)?)\s*億/);
  const manMatch = normalized.match(/(\d+(?:\.\d+)?)\s*万/);
  if (okuMatch || manMatch) {
    const oku = okuMatch ? parseFloat(okuMatch[1]) * 10000 : 0;
    const man = manMatch ? parseFloat(manMatch[1]) : 0;
    return Math.round(oku + man);
  }
  const numericOnly = parseFloat(normalized.replace(/[^\d.]/g, ''));
  return Number.isFinite(numericOnly) ? Math.round(numericOnly) : 0;
}

function buildDynamicSubsidiesFromMaster(
  companyName: string,
  industry: string,
  masterItems: HearingMasterItem[],
  promptSuggestionApplied: boolean
): Record<SubsidyType, SubsidyDocument> {
  const m1 =
    masterItems[0]?.content ||
    `${companyName}（${industry}）は専門技術と地域顧客基盤を有する中堅・中小事業者である。`;
  const m2 =
    masterItems[1]?.content ||
    '既存市場の構造変化と既存設備の老朽化・外注依存により、高付加価値分野への事業転換が急務となっている。';
  const m3 =
    masterItems[2]?.content ||
    '最新鋭の生産・デジタル管理設備を導入し、ボトルネック工程の内製化と一貫供給体制を構築する。';
  const m4 =
    masterItems[3]?.content ||
    'リードタイム短縮と外注費削減を実現し、3年後に売上拡大と営業利益率の大幅改善を見込む。';
  const extraMasterNote =
    masterItems.length > 4
      ? masterItems
          .slice(4)
          .map((item) => item.content)
          .filter(Boolean)
          .join(' ')
      : '';

  const roiAppendix = promptSuggestionApplied
    ? ' なお設備投資総額に対する投資回収期間は約3.2年（製品群別の売上内訳・年間キャッシュフロー試算に基づく）と算定しており、投資採算性は十分に確保されている。'
    : '';

  const shin500_1 = `${m1} 一方で、${m2} こうした事業環境の変化に対応するため、自社のコア技術を展開できる成長市場への新事業進出を決断した。${extraMasterNote ? ` ${extraMasterNote}` : ''}`;
  const shin200_1 = `${m1.slice(0, 95)} ${m2.slice(0, 95)}`;

  const shin500_2 = `${m3} 従来工程では複数回の段取り作業や外部委託が発生していたが、本設備の導入により社内一貫体制へと抜本的に刷新される。これにより品質安定性の向上と納期遵守率100%を達成し、新規取引先が求める厳格な要求仕様に応える量産体制を確立する。`;
  const shin200_2 = `${m3}`;

  const shin500_3 = `${m4} 本投資によるコスト構造改善と新規受注の積み上げにより、既存事業への依存から脱却した高収益体質へと転換を図る。${roiAppendix}`;
  const shin200_3 = `${m4}`;

  return {
    新事業進出補助金: {
      subsidyType: '新事業進出補助金',
      status: '下書き',
      lastSavedAt: formatNowTimestamp(),
      sections: [
        {
          id: 'shin-1',
          title: '1. 企業概要・経営環境',
          sourceMasterIds: ['master-1', 'master-2'],
          sourceMasterLabel: 'マスター① 企業概要・強み ＋ マスター② 現状の経営課題・背景',
          text200: shin200_1,
          text500: shin500_1,
          customText: shin500_1,
          selectedLength: '500',
          currentText: shin500_1,
          aiBaselineText: shin500_1,
          isModified: false,
        },
        {
          id: 'shin-2',
          title: '2. 事業化に向けた詳細',
          sourceMasterIds: ['master-3'],
          sourceMasterLabel: 'マスター③ 導入設備/システムの詳細と具体的な取り組み',
          text200: shin200_2,
          text500: shin500_2,
          customText: shin500_2,
          selectedLength: '500',
          currentText: shin500_2,
          aiBaselineText: shin500_2,
          isModified: false,
        },
        {
          id: 'shin-3',
          title: '3. 将来の数値目標・収益計画',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 期待される定性・定量効果（数値計画）',
          text200: shin200_3,
          text500: shin500_3,
          customText: shin500_3,
          selectedLength: '500',
          currentText: shin500_3,
          aiBaselineText: shin500_3,
          isModified: false,
        },
      ],
    },
    小規模事業者持続化補助金: {
      subsidyType: '小規模事業者持続化補助金',
      status: '下書き',
      lastSavedAt: formatNowTimestamp(),
      sections: [
        {
          id: 'jizo-1',
          title: '1. 企業概要・自社の強み',
          sourceMasterIds: ['master-1'],
          sourceMasterLabel: 'マスター① 企業概要・強み・競合優位性（要約抽出）',
          text200: m1,
          text500: shin500_1,
          customText: m1,
          selectedLength: '200',
          currentText: m1,
          aiBaselineText: m1,
          isModified: false,
        },
        {
          id: 'jizo-2',
          title: '2. 今回の取り組み内容',
          sourceMasterIds: ['master-2', 'master-3'],
          sourceMasterLabel: 'マスター② 課題背景 ＋ マスター③ 導入設備と販路開拓展開',
          text200: `${m3} あわせて技術サンプル製作と専門展示会・Web広報を展開し新規顧客を開拓する。`,
          text500: `${shin500_2} さらに導入設備を活用した高付加価値サンプルの製作・展示会出展を通じ、新規取引先の開拓を強力に推進する。`,
          customText: `${m3} あわせて技術サンプル製作と専門展示会・Web広報を展開し新規顧客を開拓する。`,
          selectedLength: '200',
          currentText: `${m3} あわせて技術サンプル製作と専門展示会・Web広報を展開し新規顧客を開拓する。`,
          aiBaselineText: `${m3} あわせて技術サンプル製作と専門展示会・Web広報を展開し新規顧客を開拓する。`,
          isModified: false,
        },
        {
          id: 'jizo-3',
          title: '3. 業務効率化・売上拡大効果',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 期待される定性・定量効果（即納・売上効果）',
          text200: m4,
          text500: shin500_3,
          customText: m4,
          selectedLength: '200',
          currentText: m4,
          aiBaselineText: m4,
          isModified: false,
        },
      ],
    },
    東京都経営強化基盤事業: {
      subsidyType: '東京都経営強化基盤事業',
      status: '下書き',
      lastSavedAt: formatNowTimestamp(),
      sections: [
        {
          id: 'tokyo-1',
          title: '1. 事業の現状と課題',
          sourceMasterIds: ['master-1', 'master-2'],
          sourceMasterLabel: 'マスター① 都内基盤強み ＋ マスター② 課題と背景',
          text200: shin200_1,
          text500: shin500_1,
          customText: `${m1} しかし現在、${m2}`,
          selectedLength: 'custom',
          currentText: `${m1} しかし現在、${m2}`,
          aiBaselineText: `${m1} しかし現在、${m2}`,
          isModified: false,
        },
        {
          id: 'tokyo-2',
          title: '2. 設備導入計画',
          sourceMasterIds: ['master-3'],
          sourceMasterLabel: 'マスター③ 導入設備仕様・設置妥当性・見積根拠',
          text200: shin200_2,
          text500: shin500_2,
          customText: `${m3} 設置スペース・電源環境および複数社相見積による価格妥当性を事前検証済みであり、速やかな稼働開始が可能である。`,
          selectedLength: 'custom',
          currentText: `${m3} 設置スペース・電源環境および複数社相見積による価格妥当性を事前検証済みであり、速やかな稼働開始が可能である。`,
          aiBaselineText: `${m3} 設置スペース・電源環境および複数社相見積による価格妥当性を事前検証済みであり、速やかな稼働開始が可能である。`,
          isModified: false,
        },
        {
          id: 'tokyo-3',
          title: '3. 経営基盤強化の成果目標',
          sourceMasterIds: ['master-4'],
          sourceMasterLabel: 'マスター④ 都内サプライチェーン貢献・削減目標',
          text200: shin200_3,
          text500: shin500_3,
          customText: `${m4} 都内サプライチェーンの高度化と高付加価値な内製基盤の確立に寄与する。${roiAppendix}`,
          selectedLength: 'custom',
          currentText: `${m4} 都内サプライチェーンの高度化と高付加価値な内製基盤の確立に寄与する。${roiAppendix}`,
          aiBaselineText: `${m4} 都内サプライチェーンの高度化と高付加価値な内製基盤の確立に寄与する。${roiAppendix}`,
          isModified: false,
        },
      ],
    },
  };
}

export interface NewProjectInput {
  companyName: string;
  industry: string;
  salesRep: string;
  writerName: string;
  deadline: string;
  targetAmount: string;
}

export function useSubsidyStore() {
  const [state, setState] = useState<SubsidyAppState>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SubsidyAppState;
        if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial state if storage unavailable or malformed
    }
    return createInitialAppState();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const selectedProject = useMemo(() => {
    return (
      state.projects.find((p) => p.id === state.selectedProjectId) ??
      state.projects[0]
    );
  }, [state.projects, state.selectedProjectId]);

  const setRole = useCallback((role: Role) => {
    setState((prev) => ({ ...prev, role }));
  }, []);

  const setActiveScreen = useCallback((activeScreen: ScreenId) => {
    setState((prev) => ({ ...prev, activeScreen }));
  }, []);

  const selectProject = useCallback(
    (projectId: string, navigateTo?: ScreenId) => {
      setState((prev) => ({
        ...prev,
        selectedProjectId: projectId,
        activeScreen: navigateTo ?? prev.activeScreen,
      }));
    },
    []
  );

  const addProject = useCallback((input: NewProjectInput) => {
    const newId = `proj-${Date.now()}`;
    const nextNum = 46 + Math.floor(Math.random() * 50);
    const code = `AN-2026-0${nextNum}`;
    const formattedAmount = input.targetAmount.includes('万') || input.targetAmount.includes('億')
      ? input.targetAmount.trim()
      : `${Number(input.targetAmount.replace(/[^\d]/g, '') || 2000).toLocaleString()}万円`;

    setState((prev) => {
      const masterItems = buildMasterItemsFromTemplates(prev.masterTemplates);
      const emptySubsidies = buildDynamicSubsidiesFromMaster(
        input.companyName,
        input.industry,
        masterItems.map((m) => ({ ...m, content: '' })),
        prev.promptSuggestionApplied
      );
      SUBSIDY_TYPES.forEach((st) => {
        emptySubsidies[st].status = '未作成';
        emptySubsidies[st].sections.forEach((sec) => {
          sec.currentText = '';
          sec.aiBaselineText = '';
          sec.customText = '';
        });
      });

      const newProject: Project = {
        id: newId,
        code,
        companyName: input.companyName.trim(),
        industry: input.industry.trim(),
        salesRep: input.salesRep.trim() || '田中 健太',
        writerName: input.writerName.trim() || '佐藤 美咲',
        deadline: input.deadline || '2026-12-25',
        targetAmount: formattedAmount,
        targetAmountManYen: parseManYen(formattedAmount),
        status: '未着手',
        rawHearingText: '',
        hearingSourceNote: '新規登録案件（議事録未取込）',
        masterItems,
        subsidies: emptySubsidies,
        updatedAt: formatNowTimestamp(),
      };

      return {
        ...prev,
        projects: [newProject, ...prev.projects],
        selectedProjectId: newId,
      };
    });

    return newId;
  }, []);

  const updateProjectStatus = useCallback(
    (projectId: string, status: ProjectStatus) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? { ...p, status, updatedAt: formatNowTimestamp() }
            : p
        ),
      }));
    },
    []
  );

  const updateRawHearingText = useCallback(
    (projectId: string, rawHearingText: string, hearingSourceNote?: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const nextStatus: ProjectStatus =
            p.status === '未着手' && rawHearingText.trim().length > 0
              ? 'ヒアリング中'
              : p.status;
          return {
            ...p,
            rawHearingText,
            hearingSourceNote: hearingSourceNote ?? p.hearingSourceNote,
            status: nextStatus,
            updatedAt: formatNowTimestamp(),
          };
        }),
      }));
    },
    []
  );

  const generateMasterFromHearing = useCallback((projectId: string) => {
    setState((prev) => {
      const target = prev.projects.find((p) => p.id === projectId);
      if (!target) return prev;

      const isTechPrecision =
        target.id === 'proj-tech-precision' ||
        target.rawHearingText.includes('テックプレシジョン') ||
        target.companyName.includes('テックプレシジョン');

      const generatedMasterItems: HearingMasterItem[] = prev.masterTemplates.map(
        (tpl, idx) => {
          if (isTechPrecision) {
            if (tpl.id === 'master-4' && prev.promptSuggestionApplied) {
              return {
                id: tpl.id,
                title: tpl.title,
                prompt: tpl.prompt,
                content: TECH_PRECISION_MASTER_IMPROVED_4,
              };
            }
            if (TECH_PRECISION_MASTER_PRESET[tpl.id]) {
              return {
                id: tpl.id,
                title: tpl.title,
                prompt: tpl.prompt,
                content: TECH_PRECISION_MASTER_PRESET[tpl.id],
              };
            }
            return {
              id: tpl.id,
              title: tpl.title,
              prompt: tpl.prompt,
              content: `大田区の本社工場における推進体制として、代表取締役直轄の5軸量産移行プロジェクトチーム（製造責任者・CAD/CAM専任技術者計4名）を編成済。既存取引先からの試作評価を経て段階的に量産移行する実行計画を策定している。`,
            };
          }

          // Fallback intelligent extraction for custom/other companies
          const rawSnippet = target.rawHearingText.trim();
          const defaultExtracts = [
            `${target.companyName}（${target.industry}）は専門性の高い現場技術と既存顧客からの厚い信頼を有し、短納期・高品質な対応体制を競合優位性としている。`,
            `既存主力領域の需要構造変化と旧来設備の制約により利益率改善が課題となっており、成長分野への事業展開と工程内製化が急務である。`,
            `目標補助金額（${target.targetAmount}）を見据えた最新鋭の専用設備および管理ソフトウェアを導入し、ボトルネック工程の自動化・内製化を実現する。`,
            prev.promptSuggestionApplied
              ? `工程リードタイムを65%短縮し外注費を年間900万円削減。3年後に売上高6,000万円増（内訳：新規主力品4,000万円・周辺受託2,000万円）、営業利益率8.0%を達成し、投資回収期間は約3.4年を見込む。`
              : `工程リードタイムを65%短縮し外注費を年間900万円削減。新規受注獲得により導入3年後に売上高6,000万円増、営業利益率8.0%への改善を達成する。`,
          ];

          return {
            id: tpl.id,
            title: tpl.title,
            prompt: tpl.prompt,
            content:
              defaultExtracts[idx] ??
              (rawSnippet
                ? `ヒアリング原稿に基づき「${tpl.title}」の要点を構造化抽出：社内専任体制のもと計画的に導入・運用を推進し、地域経済および取引先サプライチェーンへ貢献する。`
                : `${target.companyName}における「${tpl.title}」の計画骨子を整備し、審査項目に合致する具体根拠を明示する。`),
          };
        }
      );

      let nextSubsidies: Record<SubsidyType, SubsidyDocument>;
      if (isTechPrecision) {
        nextSubsidies = createTechPrecisionSubsidies();
        if (prev.promptSuggestionApplied) {
          const roiSentence =
            'なお総投資額4,200万円に対する投資回収期間は年間キャッシュフロー増加額（約1,310万円）ベースで約3.2年、3年後売上増8,000万円の内訳はEV冷却部品5,000万円・医療内視鏡部品3,000万円と具体試算している。';
          nextSubsidies['新事業進出補助金'].sections[2].text500 += roiSentence;
          nextSubsidies['新事業進出補助金'].sections[2].currentText =
            nextSubsidies['新事業進出補助金'].sections[2].text500;
          nextSubsidies['新事業進出補助金'].sections[2].aiBaselineText =
            nextSubsidies['新事業進出補助金'].sections[2].text500;
          nextSubsidies['東京都経営強化基盤事業'].sections[2].customText +=
            roiSentence;
          nextSubsidies['東京都経営強化基盤事業'].sections[2].currentText =
            nextSubsidies['東京都経営強化基盤事業'].sections[2].customText;
          nextSubsidies['東京都経営強化基盤事業'].sections[2].aiBaselineText =
            nextSubsidies['東京都経営強化基盤事業'].sections[2].customText;
        }
        nextSubsidies['東京都経営強化基盤事業'].status = '下書き';
      } else {
        nextSubsidies = buildDynamicSubsidiesFromMaster(
          target.companyName,
          target.industry,
          generatedMasterItems,
          prev.promptSuggestionApplied
        );
      }

      const advanceStatuses: ProjectStatus[] = ['未着手', 'ヒアリング中'];
      const nextProjectStatus: ProjectStatus = advanceStatuses.includes(
        target.status
      )
        ? 'マスター作成済'
        : target.status;

      return {
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                masterItems: generatedMasterItems,
                subsidies: nextSubsidies,
                status: nextProjectStatus,
                updatedAt: formatNowTimestamp(),
              }
            : p
        ),
      };
    });
  }, []);

  const saveMasterItem = useCallback(
    (projectId: string, itemId: string, content: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const updatedMaster = p.masterItems.map((item) =>
            item.id === itemId ? { ...item, content } : item
          );
          const nextStatus: ProjectStatus =
            p.status === '未着手' || p.status === 'ヒアリング中'
              ? 'マスター作成済'
              : p.status;
          return {
            ...p,
            masterItems: updatedMaster,
            status: nextStatus,
            updatedAt: formatNowTimestamp(),
          };
        }),
      }));
    },
    []
  );

  const syncMasterToSubsidies = useCallback((projectId: string) => {
    setState((prev) => {
      const target = prev.projects.find((p) => p.id === projectId);
      if (!target) return prev;

      const isTechPrecisionUnchanged =
        target.id === 'proj-tech-precision' &&
        target.masterItems.every(
          (m) =>
            !TECH_PRECISION_MASTER_PRESET[m.id] ||
            m.content === TECH_PRECISION_MASTER_PRESET[m.id]
        );

      const nextSubsidies = isTechPrecisionUnchanged
        ? createTechPrecisionSubsidies()
        : buildDynamicSubsidiesFromMaster(
            target.companyName,
            target.industry,
            target.masterItems,
            prev.promptSuggestionApplied
          );

      return {
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                subsidies: nextSubsidies,
                status:
                  p.status === '未着手' || p.status === 'ヒアリング中'
                    ? 'マスター作成済'
                    : p.status,
                updatedAt: formatNowTimestamp(),
              }
            : p
        ),
      };
    });
  }, []);

  const updateSubsidySectionLength = useCallback(
    (
      projectId: string,
      subsidyType: SubsidyType,
      sectionId: string,
      selectedLength: '200' | '500' | 'custom'
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          return {
            ...p,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                sections: doc.sections.map((sec) =>
                  sec.id === sectionId ? { ...sec, selectedLength } : sec
                ),
              },
            },
          };
        }),
      }));
    },
    []
  );

  const regenerateSubsidySection = useCallback(
    (projectId: string, subsidyType: SubsidyType, sectionId: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          const updatedSections = doc.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            let nextText =
              sec.selectedLength === '200'
                ? sec.text200
                : sec.selectedLength === '500'
                  ? sec.text500
                  : sec.customText;

            if (
              prev.promptSuggestionApplied &&
              sec.sourceMasterIds.includes('master-4') &&
              !nextText.includes('回収期間')
            ) {
              nextText +=
                ' なお総投資額に対する投資回収期間は約3.2年（売上内訳：EV冷却部品5,000万円・医療内視鏡部品3,000万円）と具体試算している。';
            }

            return {
              ...sec,
              currentText: nextText,
              aiBaselineText: nextText,
              isModified: false,
            };
          });

          return {
            ...p,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                status: doc.status === '未作成' ? '下書き' : doc.status,
                sections: updatedSections,
              },
            },
            updatedAt: formatNowTimestamp(),
          };
        }),
      }));
    },
    []
  );

  const updateSubsidySectionText = useCallback(
    (
      projectId: string,
      subsidyType: SubsidyType,
      sectionId: string,
      currentText: string
    ) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          return {
            ...p,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                sections: doc.sections.map((sec) =>
                  sec.id === sectionId
                    ? {
                        ...sec,
                        currentText,
                        isModified:
                          currentText.trim() !== sec.aiBaselineText.trim(),
                      }
                    : sec
                ),
              },
            },
          };
        }),
      }));
    },
    []
  );

  const saveSubsidyDocument = useCallback(
    (
      projectId: string,
      subsidyType: SubsidyType,
      explicitStatus?: DocumentStatus
    ): number => {
      let recordedCount = 0;
      const now = formatNowTimestamp();

      setState((prev) => {
        const target = prev.projects.find((p) => p.id === projectId);
        if (!target) return prev;

        const doc = target.subsidies[subsidyType];
        const newDiffEntries: DiffLog[] = [];

        const updatedSections = doc.sections.map((sec) => {
          const aiClean = sec.aiBaselineText.trim();
          const humanClean = sec.currentText.trim();
          if (aiClean && humanClean && aiClean !== humanClean) {
            newDiffEntries.push({
              id: `diff-${Date.now()}-${sec.id}`,
              projectId: target.id,
              projectName: target.companyName,
              subsidyType,
              sectionTitle: sec.title,
              aiText: sec.aiBaselineText,
              humanText: sec.currentText,
              editorName:
                target.writerName && target.writerName !== '未割当'
                  ? target.writerName
                  : '書類作成担当者',
              timestamp: now,
            });
            return {
              ...sec,
              aiBaselineText: sec.currentText,
              isModified: false,
            };
          }
          return { ...sec, isModified: false };
        });

        recordedCount = newDiffEntries.length;

        const nextDocStatus: DocumentStatus =
          explicitStatus ??
          (doc.status === '完成'
            ? '完成'
            : newDiffEntries.length > 0 || doc.status === '下書き'
              ? '修正中'
              : '下書き');

        const earlyProjectStatuses: ProjectStatus[] = [
          '未着手',
          'ヒアリング中',
          'マスター作成済',
        ];
        const nextProjectStatus: ProjectStatus = earlyProjectStatuses.includes(
          target.status
        )
          ? '申請書作成中'
          : target.status;

        return {
          ...prev,
          diffLogs: [...newDiffEntries, ...prev.diffLogs],
          projects: prev.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  status: nextProjectStatus,
                  updatedAt: now,
                  subsidies: {
                    ...p.subsidies,
                    [subsidyType]: {
                      ...doc,
                      status: nextDocStatus,
                      lastSavedAt: now,
                      sections: updatedSections,
                    },
                  },
                }
              : p
          ),
        };
      });

      return recordedCount;
    },
    []
  );

  const updateSubsidyStatus = useCallback(
    (projectId: string, subsidyType: SubsidyType, status: DocumentStatus) => {
      const now = formatNowTimestamp();
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id !== projectId) return p;
          const doc = p.subsidies[subsidyType];
          return {
            ...p,
            updatedAt: now,
            subsidies: {
              ...p.subsidies,
              [subsidyType]: {
                ...doc,
                status,
                lastSavedAt: now,
              },
            },
          };
        }),
      }));
    },
    []
  );

  const addMasterTemplate = useCallback((title: string, prompt: string) => {
    const newId = `master-${Date.now()}`;
    setState((prev) => {
      const newTemplate = {
        id: newId,
        title: title.trim(),
        prompt: prompt.trim(),
      };
      return {
        ...prev,
        masterTemplates: [...prev.masterTemplates, newTemplate],
        projects: prev.projects.map((p) => ({
          ...p,
          masterItems: [
            ...p.masterItems,
            {
              id: newId,
              title: newTemplate.title,
              prompt: newTemplate.prompt,
              content: '',
            },
          ],
        })),
      };
    });
  }, []);

  const updateMasterTemplate = useCallback(
    (id: string, title: string, prompt: string) => {
      setState((prev) => ({
        ...prev,
        masterTemplates: prev.masterTemplates.map((tpl) =>
          tpl.id === id ? { ...tpl, title, prompt } : tpl
        ),
        projects: prev.projects.map((p) => ({
          ...p,
          masterItems: p.masterItems.map((m) =>
            m.id === id ? { ...m, title, prompt } : m
          ),
        })),
      }));
    },
    []
  );

  const deleteMasterTemplate = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      masterTemplates: prev.masterTemplates.filter((tpl) => tpl.id !== id),
      projects: prev.projects.map((p) => ({
        ...p,
        masterItems: p.masterItems.filter((m) => m.id !== id),
      })),
    }));
  }, []);

  const moveMasterTemplate = useCallback(
    (id: string, direction: 'up' | 'down') => {
      setState((prev) => {
        const idx = prev.masterTemplates.findIndex((t) => t.id === id);
        if (idx < 0) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= prev.masterTemplates.length) return prev;

        const nextTemplates = [...prev.masterTemplates];
        [nextTemplates[idx], nextTemplates[swapIdx]] = [
          nextTemplates[swapIdx],
          nextTemplates[idx],
        ];

        const orderIds = nextTemplates.map((t) => t.id);

        return {
          ...prev,
          masterTemplates: nextTemplates,
          projects: prev.projects.map((p) => {
            const byId = new Map(p.masterItems.map((m) => [m.id, m]));
            const ordered = orderIds
              .map((oid) => byId.get(oid))
              .filter((item): item is HearingMasterItem => Boolean(item));
            return { ...p, masterItems: ordered };
          }),
        };
      });
    },
    []
  );

  const applyPromptImprovementSuggestion = useCallback(() => {
    const appendSentence =
      '設備導入による投資回収シミュレーション（年数・内訳）を必ず具体数値で明記すること。';

    setState((prev) => {
      const targetTemplate =
        prev.masterTemplates.find((t) => t.id === 'master-4') ??
        prev.masterTemplates[prev.masterTemplates.length - 1];
      if (!targetTemplate) return prev;

      const targetId = targetTemplate.id;
      const updatePromptText = (oldPrompt: string) =>
        oldPrompt.includes('投資回収シミュレーション')
          ? oldPrompt
          : `${oldPrompt.trim()} ${appendSentence}`;

      return {
        ...prev,
        promptSuggestionApplied: true,
        masterTemplates: prev.masterTemplates.map((tpl) =>
          tpl.id === targetId
            ? { ...tpl, prompt: updatePromptText(tpl.prompt) }
            : tpl
        ),
        projects: prev.projects.map((p) => ({
          ...p,
          masterItems: p.masterItems.map((m) =>
            m.id === targetId
              ? { ...m, prompt: updatePromptText(m.prompt) }
              : m
          ),
        })),
      };
    });
  }, []);

  const resetAllData = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    setState(createInitialAppState());
  }, []);

  return {
    state,
    selectedProject,
    setRole,
    setActiveScreen,
    selectProject,
    addProject,
    updateProjectStatus,
    updateRawHearingText,
    generateMasterFromHearing,
    saveMasterItem,
    syncMasterToSubsidies,
    updateSubsidySectionLength,
    regenerateSubsidySection,
    updateSubsidySectionText,
    saveSubsidyDocument,
    updateSubsidyStatus,
    addMasterTemplate,
    updateMasterTemplate,
    deleteMasterTemplate,
    moveMasterTemplate,
    applyPromptImprovementSuggestion,
    resetAllData,
  };
}
