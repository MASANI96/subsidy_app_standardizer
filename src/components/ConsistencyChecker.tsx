import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Info } from 'lucide-react';
import { MANUAL_CHECK_DEFINITIONS, SUBSIDY_TYPES } from '../data/initialData';
import {
  AICrossCheckResult,
  EffectEstimateItem,
  Project,
  Role,
  SubsidyRequirementThresholds,
  SubsidyType,
  WorkspaceTabId,
} from '../types';
import { buildConsistencyCheckItems } from '../utils/financialCalculations';
import { canConfirmGate, canEdit } from '../utils/permissions';
import {
  ReadOnlyRoleBadge,
  SpecTagBadge,
  WorkspaceEffectBadge,
} from './SpecTagBadge';

interface ConsistencyCheckerProps {
  project: Project;
  role: Role;
  thresholds: SubsidyRequirementThresholds;
  crossCheckPrompt: string;
  effectEstimate?: EffectEstimateItem;
  onRunAICrossCheck: (
    projectId: string,
    subsidyType: SubsidyType
  ) => AICrossCheckResult | null;
  onToggleManualCheck: (projectId: string, checkId: string) => void;
  onToggleGate3: (projectId: string, isPassed: boolean) => void;
  onNavigateTab: (tab: WorkspaceTabId) => void;
  onNavigatePromptsScreen: () => void;
  onNotify: (message: string) => void;
}

const AUDIT_STEPS = [
  '申請書全セクションから定量表現・金額・雇用人数を抽出中...',
  '収支計画マスター・算定根拠（単価×客数・設備内訳）と突合中...',
  '公募要件・審査減点リスクの監査レポートを生成中...',
];

export const ConsistencyChecker: React.FC<ConsistencyCheckerProps> = ({
  project,
  role,
  thresholds,
  crossCheckPrompt,
  effectEstimate,
  onRunAICrossCheck,
  onToggleManualCheck,
  onToggleGate3,
  onNavigateTab,
  onNavigatePromptsScreen,
  onNotify,
}) => {
  const [targetSubsidy, setTargetSubsidy] =
    useState<SubsidyType>('新事業進出補助金');
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [auditStepIndex, setAuditStepIndex] = useState(0);
  const [auditProgress, setAuditProgress] = useState(0);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const canEditConsistency = canEdit(role, 'consistency_edit');
  const canConfirmG3 = canConfirmGate(role, 'gate-3');

  const checkItems = useMemo(
    () => buildConsistencyCheckItems(project, targetSubsidy, thresholds),
    [project, targetSubsidy, thresholds]
  );

  const summaryCounts = useMemo(() => {
    const matchCount = checkItems.filter((i) => i.status === 'match').length;
    const mismatchCount = checkItems.filter(
      (i) => i.status === 'mismatch'
    ).length;
    const unverifiedCount = checkItems.filter(
      (i) => i.status === 'unverified'
    ).length;
    return { matchCount, mismatchCount, unverifiedCount };
  }, [checkItems]);

  const completedManualCount = useMemo(() => {
    return MANUAL_CHECK_DEFINITIONS.filter((d) => project.manualChecks[d.id])
      .length;
  }, [project.manualChecks]);

  const gate3 = project.gates.find((g) => g.id === 'gate-3');
  const isGate3Passed = Boolean(gate3?.isPassed);

  const handleRunCrossCheck = () => {
    if (!canEditConsistency) return;
    setIsRunningAudit(true);
    setAuditStepIndex(0);
    setAuditProgress(0.32);

    window.setTimeout(() => {
      setAuditStepIndex(1);
      setAuditProgress(0.68);
    }, 680);

    window.setTimeout(() => {
      setAuditStepIndex(2);
      setAuditProgress(1);
    }, 1360);

    window.setTimeout(() => {
      const res = onRunAICrossCheck(project.id, targetSubsidy);
      setIsRunningAudit(false);
      if (res?.isPass) {
        onNotify(
          `AI整合性クロスチェック完了（${res.overallScore}点）：重大な数値矛盾はなく、Gate 3を通過済みに更新しました。`
        );
      } else {
        onNotify(
          `AI整合性クロスチェック完了（${res?.overallScore ?? 0}点）：要確認の指摘事項を検出しました。`
        );
      }
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 mb-1">
            <span>
              ワークスペース タブ5 · 事業計画書（定性）× 収支計画書（定量）突合監査（ロール:{' '}
              {role}）
            </span>
            <SpecTagBadge tag="指示書 4-⑤ / Step5" />
            <SpecTagBadge tag="指示書 ゴール" />
            <WorkspaceEffectBadge estimate={effectEstimate} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              定性・定量 整合性チェックリスト
            </h1>
            {isGate3Passed ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300">
                <Check className="w-3.5 h-3.5" />
                Gate 3 通過済（{gate3?.passedAt}）
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300">
                Gate 3 未通過
              </span>
            )}
            {!canEditConsistency && <ReadOnlyRoleBadge role={role} />}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            対象案件:{' '}
            <span className="font-semibold text-slate-900">
              {project.companyName}
            </span>
            {' · '}不採択の主要因となる「本文記載の金額・雇用・設備・単価根拠」と「収支計画表」の数値食い違いを提出前に完全排除します。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('financial')}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            03. 収支計画を見直す
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('editor')}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            04. 申請書本文を修正する
          </button>
        </div>
      </div>

      {/* SECTION 1: Automated Numerical Cross-Reference Table */}
      <section
        data-guide-id="guide-consistency-table"
        className="bg-white border border-slate-200"
      >
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                01. 自動数値突合テーブル（申請書本文・算定変数 vs 収支計画マスター）
              </h2>
              <SpecTagBadge tag="指示書 4-⑤" />
              <SpecTagBadge tag="指示書 5" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              突合結果: 完全一致{' '}
              <span className="font-mono tabular-nums font-bold text-emerald-800">
                {summaryCounts.matchCount}件
              </span>{' '}
              / 相違あり{' '}
              <span className="font-mono tabular-nums font-bold text-rose-700">
                {summaryCounts.mismatchCount}件
              </span>{' '}
              / 未記載・確認推奨{' '}
              <span className="font-mono tabular-nums font-bold text-slate-700">
                {summaryCounts.unverifiedCount}件
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="consistency-subsidy-select"
              className="text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              検証対象の申請書様式:
            </label>
            <select
              id="consistency-subsidy-select"
              value={targetSubsidy}
              onChange={(e) => setTargetSubsidy(e.target.value as SubsidyType)}
              className="bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
            >
              {SUBSIDY_TYPES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                <th className="py-3 px-4 whitespace-nowrap">監査カテゴリ</th>
                <th className="py-3 px-4 whitespace-nowrap">検証項目</th>
                <th className="py-3 px-4">申請書・ヒアリング側の表記</th>
                <th className="py-3 px-4">収支計画マスター確定値</th>
                <th className="py-3 px-4 whitespace-nowrap">突合判定</th>
                <th className="py-3 px-4">監査コメント・対応指針</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {checkItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                    {item.category}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                    {item.label}
                  </td>
                  <td className="py-3.5 px-4 font-mono tabular-nums text-slate-800">
                    {item.documentSnippet}
                  </td>
                  <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-slate-900">
                    {item.financialValue}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {item.status === 'match' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300">
                        <Check className="w-3 h-3" />
                        完全一致
                      </span>
                    ) : item.status === 'mismatch' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-rose-900 bg-rose-50 border border-rose-300">
                        <AlertTriangle className="w-3 h-3" />
                        相違あり
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-300">
                        未記載・確認推奨
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 leading-relaxed">
                    {item.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: AI Consistency Cross-Check Simulation */}
      <section
        data-guide-id="guide-consistency-ai"
        className="bg-white border border-slate-200 p-6 space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                02. AI整合性クロスチェック監査（2秒シミュレーション）
              </h2>
              <SpecTagBadge tag="指示書 4-⑦" />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>
                整合性クロスチェック用プロンプトに基づき、論理矛盾・数値不整合を総合診断します。
              </span>
              <button
                type="button"
                onClick={() => setShowPromptPreview((p) => !p)}
                className="text-slate-700 hover:text-slate-900 underline cursor-pointer"
              >
                {showPromptPreview
                  ? '監査プロンプトを隠す'
                  : '適用中の監査プロンプトを確認'}
              </button>
              <button
                type="button"
                onClick={onNavigatePromptsScreen}
                className="text-slate-700 hover:text-slate-900 underline cursor-pointer"
              >
                生成AI用プロンプト集を開く →
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={isRunningAudit || !canEditConsistency}
            onClick={handleRunCrossCheck}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isRunningAudit
              ? 'AIクロスチェック監査を実行中...'
              : 'AIクロスチェックを実行'}
          </button>
        </div>

        {showPromptPreview && (
          <div className="bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
            {crossCheckPrompt}
          </div>
        )}

        {/* 2-Second Progress Bar */}
        {isRunningAudit && (
          <div className="border border-slate-300 bg-slate-50 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>{AUDIT_STEPS[auditStepIndex]}</span>
              <span className="font-mono tabular-nums">
                {Math.round(auditProgress * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-slate-900 origin-left transition-transform duration-500 ease-out"
                style={{ transform: `scaleX(${auditProgress})` }}
              />
            </div>
          </div>
        )}

        {/* Cross-Check Report Display */}
        {project.lastAICrossCheck ? (
          <div className="space-y-4">
            <div
              className={`border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                project.lastAICrossCheck.isPass
                  ? 'bg-emerald-50/40 border-emerald-300'
                  : 'bg-rose-50/40 border-rose-300'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
                  <span>最終実行日時: {project.lastAICrossCheck.timestamp}</span>
                  <span>·</span>
                  <span>
                    判定:{' '}
                    <strong
                      className={
                        project.lastAICrossCheck.isPass
                          ? 'text-emerald-900'
                          : 'text-rose-900'
                      }
                    >
                      {project.lastAICrossCheck.isPass
                        ? '監査基準クリア（Gate 3 通過）'
                        : '要修正事項あり'}
                    </strong>
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                  {project.lastAICrossCheck.summary}
                </p>
              </div>

              <div className="shrink-0 text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                <div className="text-[11px] text-slate-500">整合性監査スコア</div>
                <div className="font-mono tabular-nums text-3xl font-bold text-slate-900">
                  {project.lastAICrossCheck.overallScore}
                  <span className="text-sm font-normal text-slate-500">
                    {' '}
                    / 100点
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {project.lastAICrossCheck.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 p-4 space-y-2 bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {issue.severity === 'error' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-rose-900 bg-rose-50 border border-rose-300">
                          <AlertTriangle className="w-3 h-3" />
                          重大な矛盾
                        </span>
                      ) : issue.severity === 'warning' ? (
                        <span className="px-2 py-0.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300">
                          改善推奨
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300">
                          <Info className="w-3 h-3" />
                          整合性クリア
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-slate-900">
                        {issue.title}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500">
                      対象: {issue.targetSection}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {issue.description}
                  </p>
                  <div className="text-xs text-slate-800 bg-slate-50 border border-slate-200 px-3 py-2">
                    <span className="font-semibold">推奨アクション: </span>
                    {issue.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-600">
            まだAI整合性クロスチェックが実行されていません。右上の「AIクロスチェックを実行」ボタンをクリックすると、2秒間の横断監査シミュレーションを経て詳細レポートが生成されます。
          </div>
        )}
      </section>

      {/* SECTION 3: Manual Verification Checklist */}
      <section
        data-guide-id="guide-consistency-manual"
        className="bg-white border border-slate-200 p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                03. 提出前 手動突合チェックリスト（証拠書類・最賃・実務確認）
              </h2>
              <SpecTagBadge tag="指示書 4-⑤" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              添付見積書原本・事業場内最低賃金（地域別最賃＋30円以上）・税理士確認・交付決定スケジュール等の人間系チェック項目です（自動保存）。
            </p>
          </div>
          <div className="font-mono tabular-nums text-xs font-semibold text-slate-800">
            確認完了: {completedManualCount} / {MANUAL_CHECK_DEFINITIONS.length}{' '}
            項目
          </div>
        </div>

        <div className="divide-y divide-slate-200 border border-slate-200">
          {MANUAL_CHECK_DEFINITIONS.map((chk) => {
            const checked = Boolean(project.manualChecks[chk.id]);
            return (
              <label
                key={chk.id}
                className={`flex items-start gap-3.5 p-4 transition-colors ${
                  canEditConsistency ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                } ${checked ? 'bg-emerald-50/25' : 'bg-white hover:bg-slate-50'}`}
              >
                <input
                  type="checkbox"
                  disabled={!canEditConsistency}
                  checked={checked}
                  onChange={() => onToggleManualCheck(project.id, chk.id)}
                  className="mt-1 w-4 h-4 accent-slate-900 shrink-0"
                />
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">{chk.category}</div>
                  <div
                    className={`text-sm font-semibold ${
                      checked ? 'text-slate-700' : 'text-slate-900'
                    }`}
                  >
                    {chk.label}
                  </div>
                  <div className="text-xs text-slate-500">{chk.detail}</div>
                </div>
              </label>
            );
          })}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            自動突合・AI監査および手動確認が完了したら、Gate 3（整合性チェック）を通過済にして顧客最終確認工程へ進みます。
          </div>
          <button
            type="button"
            disabled={!canConfirmG3}
            onClick={() => {
              const nextVal = !isGate3Passed;
              onToggleGate3(project.id, nextVal);
              onNotify(
                nextVal
                  ? 'Gate 3（定性・定量 整合性チェック）を通過済みに更新しました。'
                  : 'Gate 3を未通過に戻しました。'
              );
            }}
            className={`px-5 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
              isGate3Passed
                ? 'text-slate-800 bg-white border border-slate-300 hover:bg-slate-100'
                : 'text-white bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {isGate3Passed
              ? 'Gate 3 通過を取り消す'
              : 'Gate 3（整合性チェック完了）として確定する'}
          </button>
        </div>
      </section>
    </div>
  );
};
