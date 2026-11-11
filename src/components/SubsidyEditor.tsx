import React, { useEffect, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { DOCUMENT_STATUS_LIST, SUBSIDY_TYPES } from '../data/initialData';
import {
  CallRound,
  DocumentStatus,
  EffectEstimateItem,
  Project,
  Role,
  SubsidySection,
  SubsidyType,
  TextModule,
  TextModuleCategory,
} from '../types';
import { interpolateTags } from '../utils/financialCalculations';
import { canEdit } from '../utils/permissions';
import { DiffViewer } from './DiffViewer';
import { ModulePickerModal } from './ModulePickerModal';
import {
  ReadOnlyRoleBadge,
  SpecTagBadge,
  WorkspaceEffectBadge,
} from './SpecTagBadge';

export interface EditorExternalTarget {
  subsidyType: SubsidyType;
  sectionId?: string;
  nonce: number;
}

interface SubsidyEditorProps {
  project: Project;
  role: Role;
  textModules: TextModule[];
  activeCallRound: CallRound;
  effectEstimate?: EffectEstimateItem;
  externalTarget?: EditorExternalTarget | null;
  onUpdateSectionLength: (
    projectId: string,
    subsidyType: SubsidyType,
    sectionId: string,
    length: '200' | '500' | 'custom'
  ) => void;
  onRegenerateSection: (
    projectId: string,
    subsidyType: SubsidyType,
    sectionId: string
  ) => void;
  onUpdateSectionText: (
    projectId: string,
    subsidyType: SubsidyType,
    sectionId: string,
    text: string
  ) => void;
  onReplaceAllTagsInDoc: (
    projectId: string,
    subsidyType: SubsidyType
  ) => void;
  onSaveDocument: (
    projectId: string,
    subsidyType: SubsidyType,
    explicitStatus?: DocumentStatus
  ) => number;
  onUpdateDocumentStatus: (
    projectId: string,
    subsidyType: SubsidyType,
    status: DocumentStatus
  ) => void;
  onNavigateToFinancial: () => void;
  onNavigateToConsistency: () => void;
  onNavigateToAdminDiff: () => void;
  onNotify: (message: string) => void;
}

const SUBSIDY_META: Record<
  SubsidyType,
  { subtitle: string; guideline: string }
> = {
  '新事業進出・ものづくり商業サービス補助金': {
    subtitle: '革新的新製品・サービス枠／新事業進出枠／グローバル枠',
    guideline:
      '推奨文字数: 各項目 500字以上（事業実施体制・革新性・市場ニーズ・数値計画を明確に記述）',
  },
  新事業進出補助金: {
    subtitle: '親データ・最大ボリューム（事業再構築・新分野展開向け詳細記述）',
    guideline:
      '推奨文字数: 各項目 500字以上（事業環境・設備優位性・3ヶ年収益計画を詳述）',
  },
  小規模事業者持続化補助金: {
    subtitle: '販路開拓・強みに焦点を当てて抽出・要約',
    guideline:
      '推奨文字数: 各項目 約200字（自社の強みと展示会・サンプル活用による販路拡大を簡潔記述）',
  },
  東京都経営強化基盤事業: {
    subtitle: '都内基盤強化・設備導入の妥当性と経費根拠を補強',
    guideline:
      '推奨文字数: 各項目 約350〜400字（都内サプライチェーン維持・相見積妥当性を明記）',
  },
};

function evaluateCharLimitStatus(
  currentLen: number,
  selectedLength: '200' | '500' | 'custom',
  customLimit: number
): {
  targetChars: number;
  isMinimumRule: boolean;
  ratioPct: number;
  status: 'shortage' | 'optimal' | 'over';
  label: string;
} {
  if (selectedLength === '500') {
    const target = 500;
    const ratioPct = Math.min(100, Math.round((currentLen / target) * 100));
    if (currentLen < target * 0.8) {
      return {
        targetChars: target,
        isMinimumRule: true,
        ratioPct,
        status: 'shortage',
        label: `不足（推奨${target}字以上まであと${target - currentLen}文字）`,
      };
    }
    if (currentLen < target) {
      return {
        targetChars: target,
        isMinimumRule: true,
        ratioPct,
        status: 'shortage',
        label: `やや不足（推奨${target}字以上まであと${target - currentLen}文字）`,
      };
    }
    return {
      targetChars: target,
      isMinimumRule: true,
      ratioPct: 100,
      status: 'optimal',
      label: `適正（推奨${target}字以上を達成）`,
    };
  }

  const target = selectedLength === '200' ? 200 : customLimit || 400;
  const rawRatio = target > 0 ? (currentLen / target) * 100 : 100;
  const ratioPct = Math.min(100, Math.round(rawRatio));

  if (currentLen > target) {
    return {
      targetChars: target,
      isMinimumRule: false,
      ratioPct: 100,
      status: 'over',
      label: `超過（+${currentLen - target}文字 / 上限${target}字）`,
    };
  }
  if (rawRatio < 80) {
    return {
      targetChars: target,
      isMinimumRule: false,
      ratioPct,
      status: 'shortage',
      label: `不足（指定${target}字の80%未満・残り${target - currentLen}文字）`,
    };
  }
  return {
    targetChars: target,
    isMinimumRule: false,
    ratioPct,
    status: 'optimal',
    label: `適正（80〜100%圏内 / 上限${target}字）`,
  };
}

export const SubsidyEditor: React.FC<SubsidyEditorProps> = ({
  project,
  role,
  textModules,
  activeCallRound,
  effectEstimate,
  externalTarget,
  onUpdateSectionLength,
  onRegenerateSection,
  onUpdateSectionText,
  onReplaceAllTagsInDoc,
  onSaveDocument,
  onUpdateDocumentStatus,
  onNavigateToFinancial,
  onNavigateToConsistency,
  onNavigateToAdminDiff,
  onNotify,
}) => {
  const [selectedSubsidy, setSelectedSubsidy] =
    useState<SubsidyType>('新事業進出補助金');
  const [regeneratingIds, setRegeneratingIds] = useState<
    Record<string, boolean>
  >({});
  const [openMasterPreviewIds, setOpenMasterPreviewIds] = useState<
    Record<string, boolean>
  >({});
  const [openDiffPreviewIds, setOpenDiffPreviewIds] = useState<
    Record<string, boolean>
  >({});
  const [lastSaveFeedback, setLastSaveFeedback] = useState<{
    subsidyType: SubsidyType;
    diffCount: number;
    timestamp: string;
  } | null>(null);

  const [pickerTargetSection, setPickerTargetSection] =
    useState<SubsidySection | null>(null);

  const canEditDoc = canEdit(role, 'editor_edit');
  const isFinancialLocked = project.financialMaster.status === 'locked';

  // M4: マッピング表のセルクリック等からの遷移対応
  useEffect(() => {
    if (!externalTarget) return;
    setSelectedSubsidy(externalTarget.subsidyType);
    if (externalTarget.sectionId && isFinancialLocked) {
      window.setTimeout(() => {
        const el = document.getElementById(
          `editor-section-${externalTarget.sectionId}`
        );
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('guide-highlight-active');
          window.setTimeout(() => {
            el.classList.remove('guide-highlight-active');
          }, 2000);
        }
      }, 180);
    }
  }, [externalTarget, isFinancialLocked]);

  const currentDoc = project.subsidies[selectedSubsidy];
  const modifiedCount = currentDoc.sections.filter((s) => s.isModified).length;

  // 【厳格ロック制御】Gate 2（収支計画）が未確定の場合、全画面ブロッカーを表示し編集・AI再生成を厳格ロック
  if (!isFinancialLocked) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <span>
                ワークスペース タブ4 · 申請書マッピング・仕上げ工程（ロール: {role}）
              </span>
              <SpecTagBadge tag="指示書 Step6" />
              <WorkspaceEffectBadge estimate={effectEstimate} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              補助金別申請書 作成・編集
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              対象案件:{' '}
              <span className="font-semibold text-slate-900">
                {project.companyName}
              </span>
              {' · '}作成担当: {project.writerName}
            </p>
          </div>
        </div>

        {/* Full-Screen Strict Gate 2 Blocker */}
        <div
          data-guide-id="guide-editor-blocker"
          className="bg-white border-2 border-amber-400 p-10 md:p-14 text-center space-y-6"
        >
          <div className="mx-auto w-14 h-14 bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-800">
            <Lock className="w-7 h-7" />
          </div>

          <div className="max-w-2xl mx-auto space-y-3">
            <div className="text-xs font-mono font-bold text-amber-900">
              PHASE GATE 02 LOCKED
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              【フェーズゲート未達】収支計画（数値）が確定していません。
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              手戻りを防止するため、先に『タブ3: 収支計画マスター計算シート』で数値を確定してください。
              <br />
              収支計画マスターにて投資内訳・減価償却・付加価値額伸び率要件を確認し、「この収支計画で確定する（Gate 2 通過）」を実行すると、本エディタでの執筆・文章モジュール挿入・AI再生成がすべてアンロックされます。
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateToFinancial}
              className="px-7 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              収支計画マスターへ移動する →
            </button>
          </div>

          {/* Read-only preview summary so user sees current draft status */}
          <div className="max-w-xl mx-auto pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs text-slate-500">
            <div>
              <span className="block text-slate-400">現在の総投資額案</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800">
                {project.financialMaster.investment.totalInvestment.toLocaleString()}{' '}
                万円
              </span>
            </div>
            <div>
              <span className="block text-slate-400">補助金申請希望額</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800">
                {project.financialMaster.investment.subsidyRequested.toLocaleString()}{' '}
                万円
              </span>
            </div>
            <div>
              <span className="block text-slate-400">3年後売上目標案</span>
              <span className="font-mono tabular-nums font-semibold text-slate-800">
                {project.financialMaster.forecast.y3.sales.toLocaleString()}{' '}
                万円
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const inferCategoryForSection = (
    idx: number,
    subsidy: SubsidyType
  ): TextModuleCategory | 'ALL' => {
    if (idx === 0) return 'strength';
    if (idx === 1) return 'investment';
    if (subsidy === '東京都経営強化基盤事業') return 'tokyo_base';
    return 'effect';
  };

  const handleRegenerateClick = (section: SubsidySection) => {
    if (!canEditDoc) return;
    setRegeneratingIds((prev) => ({ ...prev, [section.id]: true }));
    window.setTimeout(() => {
      onRegenerateSection(project.id, selectedSubsidy, section.id);
      setRegeneratingIds((prev) => ({ ...prev, [section.id]: false }));
      const lengthLabel =
        section.selectedLength === '200'
          ? '短文（約200字）'
          : section.selectedLength === '500'
            ? '長文（約500字以上）'
            : '指定文字数（標準ボリューム）';
      onNotify(`「${section.title}」を${lengthLabel}設定で再生成しました。`);
    }, 800);
  };

  const handleInsertSampleHumanEdit = (section: SubsidySection) => {
    if (!canEditDoc) return;
    const templateAppendix =
      'なお、総投資額{設備投資額}（機械装置{機械装置費}・システム{システム費}）に対する投資回収期間は年間キャッシュフロー増加額約{年間CF増加額}ベースで約{回収年数}と試算しており、3年後売上増{売上増加額}（全社{3年後売上}）の達成確度は高い。';
    const interpolated = interpolateTags(templateAppendix, project);
    if (section.currentText.includes('投資回収期間')) {
      onNotify('既に投資回収年数・内訳の加筆例が反映されています。');
      return;
    }
    onUpdateSectionText(
      project.id,
      selectedSubsidy,
      section.id,
      `${section.currentText.trim()}${interpolated}`
    );
    setOpenDiffPreviewIds((prev) => ({ ...prev, [section.id]: true }));
    onNotify(
      '収支計画マスター連動の具体数値（投資回収年数・内訳）を加筆しました。「この内容で申請書を保存」で差異ログに記録されます。'
    );
  };

  const handleSave = (explicitStatus?: DocumentStatus) => {
    if (!canEditDoc) return;
    const count = onSaveDocument(project.id, selectedSubsidy, explicitStatus);
    const nowStr = new Date().toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setLastSaveFeedback({
      subsidyType: selectedSubsidy,
      diffCount: count,
      timestamp: nowStr,
    });
    if (count > 0) {
      onNotify(
        `${selectedSubsidy}を保存し、担当者による修正差分（${count}件）を差異ログに自動記録しました。`
      );
    } else {
      onNotify(`${selectedSubsidy}の内容を保存しました。`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>
              ワークスペース タブ4 · Gate 2 収支確定済（
              {project.financialMaster.lockedAt}） · ロール: {role}
            </span>
            <SpecTagBadge tag="指示書 4-④ / Step5" />
            <SpecTagBadge tag="指示書 ゴール" />
            <WorkspaceEffectBadge estimate={effectEstimate} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              補助金別申請書 作成・編集
            </h1>
            {!canEditDoc && <ReadOnlyRoleBadge role={role} />}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            対象案件:{' '}
            <span className="font-semibold text-slate-900">
              {project.companyName}
            </span>
            {' · '}総投資額:{' '}
            <span className="font-mono tabular-nums font-semibold">
              {project.financialMaster.investment.totalInvestment.toLocaleString()}
              万円
            </span>
            {' · '}3年後売上目標:{' '}
            <span className="font-mono tabular-nums font-semibold">
              {project.financialMaster.forecast.y3.sales.toLocaleString()}万円
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-guide-id="guide-editor-tags"
            disabled={!canEditDoc}
            onClick={() => {
              onReplaceAllTagsInDoc(project.id, selectedSubsidy);
              onNotify(
                `${selectedSubsidy}内の変数タグ {...} を最新の収支マスター数値へ一括置換しました。`
              );
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            本文中の変数タグを収支数値へ再置換
          </button>
          <button
            type="button"
            onClick={onNavigateToConsistency}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            05. 定性・定量 整合性チェックへ →
          </button>
        </div>
      </div>

      {/* 1. Subsidy Switching Tabs */}
      <div
        data-guide-id="guide-editor-subsidy-tabs"
        className="grid grid-cols-1 md:grid-cols-3 border border-slate-200 bg-white divide-y md:divide-y-0 md:divide-x divide-slate-200"
      >
        {SUBSIDY_TYPES.map((st) => {
          const isActive = selectedSubsidy === st;
          const doc = project.subsidies[st];
          return (
            <button
              key={st}
              type="button"
              onClick={() => {
                setSelectedSubsidy(st);
                setLastSaveFeedback(null);
              }}
              className={`p-4 text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-bold whitespace-nowrap">{st}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 border whitespace-nowrap ${
                    isActive
                      ? 'border-slate-600 bg-slate-800 text-slate-100'
                      : doc.status === '完成'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : doc.status === '修正中'
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-slate-200 bg-slate-100 text-slate-600'
                  }`}
                >
                  {doc.status}
                </span>
              </div>
              <p
                className={`text-xs leading-snug ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {SUBSIDY_META[st].subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Subsidy Toolbar */}
      <div className="bg-white border border-slate-200 px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs font-semibold text-slate-900">
            選択様式: {selectedSubsidy}（適用公募回: {activeCallRound.name}）
          </div>
          <div className="text-xs text-slate-500">
            {SUBSIDY_META[selectedSubsidy].guideline}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <label
              htmlFor="subsidy-doc-status"
              className="font-semibold text-slate-700 whitespace-nowrap"
            >
              申請書ステータス:
            </label>
            <select
              id="subsidy-doc-status"
              disabled={!canEditDoc}
              value={currentDoc.status}
              onChange={(e) => {
                const next = e.target.value as DocumentStatus;
                onUpdateDocumentStatus(project.id, selectedSubsidy, next);
                onNotify(
                  `${selectedSubsidy}のステータスを「${next}」に更新しました。`
                );
              }}
              className="bg-slate-50 border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-900 disabled:opacity-60 focus:outline-none focus:border-slate-800"
            >
              {DOCUMENT_STATUS_LIST.map((ds) => (
                <option key={ds} value={ds}>
                  {ds}
                </option>
              ))}
            </select>
          </div>

          {currentDoc.status !== '完成' && (
            <button
              type="button"
              disabled={!canEditDoc}
              onClick={() => handleSave('完成')}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              保存してステータスを「完成」にする
            </button>
          )}
        </div>
      </div>

      {/* Save Confirmation Banner */}
      {lastSaveFeedback && lastSaveFeedback.subsidyType === selectedSubsidy && (
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs leading-relaxed">
            <span className="font-bold">
              [{lastSaveFeedback.timestamp} 保存完了]
            </span>{' '}
            {lastSaveFeedback.diffCount > 0
              ? `AI初期出力からの手動修正（${lastSaveFeedback.diffCount}項目）を検知し、差異分析ログ（LocalStorage）に自動記録しました。`
              : '申請書テキストを保存しました（AI初期出力からの差分はありません）。'}
          </div>
          {lastSaveFeedback.diffCount > 0 && (
            <button
              type="button"
              onClick={onNavigateToAdminDiff}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              管理者画面でDiffログを見る →
            </button>
          )}
        </div>
      )}

      {/* Mapped Sections */}
      <div className="space-y-6">
        {currentDoc.sections.map((section, idx) => {
          const isRegenerating = Boolean(regeneratingIds[section.id]);
          const showMasterRef = Boolean(openMasterPreviewIds[section.id]);
          const showInlineDiff = Boolean(openDiffPreviewIds[section.id]);

          const referencedMasters = project.masterItems.filter((m) =>
            section.sourceMasterIds.includes(m.id)
          );

          const customCharLimit =
            activeCallRound.sectionCharLimits[section.id] ?? 400;
          const charEval = evaluateCharLimitStatus(
            section.currentText.length,
            section.selectedLength || '500',
            customCharLimit
          );

          // R2: このセクションに対応する審査項目とキーワード照合
          const sectionCriteria = activeCallRound.reviewCriteria.filter(
            (rc) =>
              rc.subsidyType === selectedSubsidy &&
              rc.targetSectionIds.includes(section.id)
          );

          return (
            <section
              id={`editor-section-${section.id}`}
              key={section.id}
              className="bg-white border border-slate-200 p-6 space-y-4"
            >
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-200 pb-3.5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-base font-bold text-slate-900">
                      {section.title}
                    </h2>
                    {section.isModified ? (
                      <span className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5">
                        手修正あり（保存時にDiff記録）
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        AIマッピング出力基準
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>自動マッピング元: {section.sourceMasterLabel}</span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMasterPreviewIds((prev) => ({
                          ...prev,
                          [section.id]: !prev[section.id],
                        }))
                      }
                      className="text-slate-700 hover:text-slate-900 underline whitespace-nowrap cursor-pointer"
                    >
                      {showMasterRef
                        ? '親マスター原文を閉じる'
                        : '親マスター原文を表示'}
                    </button>
                  </div>
                </div>

                {/* Controls: Insert from Module Library + Character Length + AI Regenerate */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-guide-id={
                      idx === 0 ? 'guide-editor-module' : undefined
                    }
                    disabled={!canEditDoc}
                    onClick={() => setPickerTargetSection(section)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    + 文章モジュールから挿入
                  </button>

                  <label
                    htmlFor={`len-${section.id}`}
                    className="text-xs font-medium text-slate-600 whitespace-nowrap ml-1"
                  >
                    文字数制御:
                  </label>
                  <select
                    id={`len-${section.id}`}
                    disabled={!canEditDoc}
                    value={section.selectedLength}
                    onChange={(e) =>
                      onUpdateSectionLength(
                        project.id,
                        selectedSubsidy,
                        section.id,
                        e.target.value as '200' | '500' | 'custom'
                      )
                    }
                    className="bg-slate-50 border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-900 disabled:opacity-60 focus:outline-none focus:border-slate-800"
                  >
                    <option value="200">短文（上限 200字）</option>
                    <option value="500">長文（推奨 500字以上）</option>
                    <option value="custom">
                      様式指定（上限 {customCharLimit}字）
                    </option>
                  </select>

                  <button
                    type="button"
                    disabled={isRegenerating || !canEditDoc}
                    onClick={() => handleRegenerateClick(section)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-300 hover:bg-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isRegenerating ? '再構成中...' : 'AI再生成'}
                  </button>
                </div>
              </div>

              {showMasterRef && (
                <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                  <div className="text-xs font-semibold text-slate-700">
                    参照中の定性マスター親データ
                  </div>
                  {referencedMasters.length > 0 ? (
                    referencedMasters.map((rm) => (
                      <div
                        key={rm.id}
                        className="text-xs text-slate-700 leading-relaxed"
                      >
                        <span className="font-semibold text-slate-900">
                          [{rm.title}]:{' '}
                        </span>
                        {rm.content || '（未入力）'}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500">
                      親マスター項目が設定されていません。
                    </div>
                  )}
                </div>
              )}

              {/* R2: Review Criteria Coverage Strip */}
              {sectionCriteria.length > 0 && (
                <div
                  data-guide-id={
                    idx === 0 ? 'guide-editor-criteria' : undefined
                  }
                  className="bg-slate-50 border border-slate-200 px-3.5 py-2.5 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        このセクションで触れるべき審査項目
                      </span>
                      <SpecTagBadge tag="指示書 5" />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      参考（公募要領にて要確認）
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sectionCriteria.map((rc) => {
                      const matchedKeywords = rc.keywords.filter((kw) =>
                        section.currentText.includes(kw)
                      );
                      const isCovered = matchedKeywords.length > 0;
                      return (
                        <div
                          key={rc.id}
                          title={`${rc.description}（照合語: ${rc.keywords.join('・')}）`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border ${
                            isCovered
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                              : 'bg-amber-50/70 border-amber-300 text-amber-950'
                          }`}
                        >
                          {isCovered ? (
                            <Check className="w-3 h-3 text-emerald-800 shrink-0" />
                          ) : null}
                          <span className="font-semibold">
                            {rc.isBonus ? `[加点] ${rc.name}` : rc.name}:
                          </span>
                          <span>
                            {isCovered
                              ? '記載あり✓'
                              : `未記載（例: ${rc.keywords.slice(0, 2).join('・')}）`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {isRegenerating ? (
                <div className="border border-slate-200 bg-slate-50 p-6 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-700">
                    指定文字数と確定済収支マスターに合わせて申請書文面を再生成しています...
                  </div>
                  <div className="h-3 bg-slate-200 w-11/12" />
                  <div className="h-3 bg-slate-200 w-full" />
                  <div className="h-3 bg-slate-200 w-4/5" />
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={section.selectedLength === '200' ? 4 : 6}
                    disabled={!canEditDoc}
                    value={section.currentText}
                    onChange={(e) =>
                      onUpdateSectionText(
                        project.id,
                        selectedSubsidy,
                        section.id,
                        e.target.value
                      )
                    }
                    placeholder="マスター情報または「+ 文章モジュールから挿入」で文面を展開できます。{設備投資額} 等の変数タグも使用可能です。"
                    className="w-full border border-slate-300 p-3.5 text-sm leading-relaxed text-slate-900 disabled:bg-slate-50 focus:outline-none focus:border-slate-800"
                  />

                  {/* M6: Character Count Gauge & Status Bar */}
                  <div
                    data-guide-id={
                      idx === 0 ? 'guide-editor-charlimit' : undefined
                    }
                    className="border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono tabular-nums text-slate-800">
                          現在{' '}
                          <strong className="text-sm text-slate-950">
                            {section.currentText.length}
                          </strong>{' '}
                          / 指定{' '}
                          {charEval.isMinimumRule
                            ? `${charEval.targetChars}字以上`
                            : `${charEval.targetChars}字`}
                        </span>
                        <span className="text-slate-400">
                          （AI基準: {section.aiBaselineText.length}文字）
                        </span>
                      </div>

                      <span
                        className={`px-2 py-0.5 text-xs font-semibold border ${
                          charEval.status === 'optimal'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : charEval.status === 'over'
                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        {charEval.label}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          charEval.status === 'optimal'
                            ? 'bg-emerald-700'
                            : charEval.status === 'over'
                              ? 'bg-rose-700'
                              : 'bg-amber-600'
                        }`}
                        style={{ width: `${charEval.ratioPct}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-0.5">
                      <div className="flex flex-wrap items-center gap-3">
                        {idx === 2 && canEditDoc && (
                          <button
                            type="button"
                            onClick={() => handleInsertSampleHumanEdit(section)}
                            className="text-slate-700 hover:text-slate-900 underline cursor-pointer"
                          >
                            + 回収年数・売上内訳の加筆例を追記（収支マスター連動）
                          </button>
                        )}
                        {section.currentText.includes('{') && canEditDoc && (
                          <button
                            type="button"
                            onClick={() => {
                              const replaced = interpolateTags(
                                section.currentText,
                                project
                              );
                              onUpdateSectionText(
                                project.id,
                                selectedSubsidy,
                                section.id,
                                replaced
                              );
                              onNotify(
                                `「${section.title}」内の変数タグを収支実数値へ置換しました。`
                              );
                            }}
                            className="text-amber-800 font-semibold hover:underline cursor-pointer"
                          >
                            未置換の変数タグ {'{...}'} を今すぐ実数値化
                          </button>
                        )}
                        {section.isModified && (
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDiffPreviewIds((prev) => ({
                                ...prev,
                                [section.id]: !prev[section.id],
                              }))
                            }
                            className="text-slate-800 font-medium hover:text-slate-950 underline cursor-pointer"
                          >
                            {showInlineDiff
                              ? 'AI元文面との比較を隠す'
                              : 'AI元文面との差分をプレビュー'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {showInlineDiff && section.isModified && (
                    <div className="pt-1">
                      <DiffViewer
                        aiText={section.aiBaselineText}
                        humanText={section.currentText}
                        compact
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Bottom Save & Diff Record Action Bar */}
      <div
        data-guide-id="guide-editor-save"
        className="bg-white border border-slate-300 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">
              {selectedSubsidy} の編集内容を確定・保存
            </span>
            <SpecTagBadge tag="指示書 Step7" />
          </div>
          <p className="text-xs text-slate-600">
            {modifiedCount > 0
              ? `現在 ${modifiedCount} 項目に加筆・モジュール挿入があります。保存するとAI初期文面との差分（Diff）が自動蓄積されます。`
              : '保存後、「05. 整合性チェックリスト」タブで本文数値と収支計画マスターの完全一致を検証してください。'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {currentDoc.status !== '完成' && (
            <button
              type="button"
              disabled={!canEditDoc}
              onClick={() => handleSave('完成')}
              className="px-4 py-2.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              完成として保存
            </button>
          )}
          <button
            type="button"
            disabled={!canEditDoc}
            onClick={() => handleSave()}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            この内容で申請書を保存
          </button>
        </div>
      </div>

      {/* Module Picker Modal */}
      {pickerTargetSection && (
        <ModulePickerModal
          isOpen={Boolean(pickerTargetSection)}
          sectionTitle={pickerTargetSection.title}
          defaultCategory={inferCategoryForSection(
            currentDoc.sections.findIndex(
              (s) => s.id === pickerTargetSection.id
            ),
            selectedSubsidy
          )}
          defaultLength={
            pickerTargetSection.selectedLength === '200'
              ? 'short'
              : pickerTargetSection.selectedLength === '500'
                ? 'long'
                : 'all'
          }
          project={project}
          modules={textModules}
          reviewCriteria={activeCallRound.reviewCriteria}
          onInsertText={(interpolatedText, mode) => {
            const nextText =
              mode === 'replace' || !pickerTargetSection.currentText.trim()
                ? interpolatedText
                : `${pickerTargetSection.currentText.trim()}\n${interpolatedText}`;
            onUpdateSectionText(
              project.id,
              selectedSubsidy,
              pickerTargetSection.id,
              nextText
            );
            setOpenDiffPreviewIds((prev) => ({
              ...prev,
              [pickerTargetSection.id]: true,
            }));
            onNotify(
              `文章モジュール（変数タグ実数値置換済）を「${pickerTargetSection.title}」へ${
                mode === 'replace' ? '挿入' : '追記'
              }しました。`
            );
          }}
          onClose={() => setPickerTargetSection(null)}
        />
      )}
    </div>
  );
};
