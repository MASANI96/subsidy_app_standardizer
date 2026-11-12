import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Lock,
  RefreshCw,
  Share2,
  X,
} from 'lucide-react';
import {
  EffectEstimateItem,
  GanttTask,
  PhaseGate,
  Project,
  ProjectSchedule,
  Role,
  ScheduleItem,
  ScheduleTemplateTask,
  WorkspaceTabId,
} from '../types';
import { canConfirmGate } from '../utils/permissions';
import { buildShareUrl, SharePayload } from '../utils/share';
import { isLongTermReportItem } from '../utils/scheduleBuilder';
import { ScheduleChart } from './gantt/ScheduleChart';
import {
  ReadOnlyRoleBadge,
  SpecTagBadge,
  WorkspaceEffectBadge,
} from './SpecTagBadge';

interface GanttScheduleProps {
  project: Project;
  role: Role;
  effectEstimate?: EffectEstimateItem;
  onUpdateTaskStatus: (
    projectId: string,
    taskId: string,
    status: GanttTask['status']
  ) => void;
  onToggleGatePassed: (
    projectId: string,
    gateId: PhaseGate['id'],
    isPassed: boolean
  ) => void;
  onNavigateTab: (tab: WorkspaceTabId) => void;
  onNavigateBackToList: () => void;
  onNotify: (message: string) => void;
  scheduleTemplates?: ScheduleTemplateTask[];
  onUpdateSchedule?: (
    projectId: string,
    updater: (s: ProjectSchedule) => ProjectSchedule
  ) => void;
  onRebuildSchedule?: (projectId: string) => void;
  onMarkScheduleShared?: (projectId: string) => void;
}

export const GanttSchedule: React.FC<GanttScheduleProps> = ({
  project,
  role,
  effectEstimate,
  onToggleGatePassed,
  onNavigateTab,
  onNavigateBackToList,
  onNotify,
  onUpdateSchedule,
  onRebuildSchedule,
  onMarkScheduleShared,
}) => {
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'client' | 'support'>('all');
  const [rangeMode, setRangeMode] = useState<'core' | 'all'>('core');
  const [shareModalUrl, setShareModalUrl] = useState<string | null>(null);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);

  const canConfirmGate4 = canConfirmGate(role, 'gate-4');

  // 最初の未通過ゲートを「現在地（アクティブゲート）」として判定
  const currentActiveGateNumber = useMemo(() => {
    const firstUnpassed = project.gates.find((g) => !g.isPassed);
    return firstUnpassed ? firstUnpassed.number : 5;
  }, [project.gates]);

  const schedule = project.schedule || { items: [], viewMode: 'month' };
  const viewMode = schedule.viewMode || 'month';

  // 担当フィルタ
  const filteredItems = useMemo(() => {
    let list = schedule.items;
    if (ownerFilter !== 'all') {
      list = list.filter((it) => it.owner === ownerFilter);
    }
    if (rangeMode === 'core') {
      list = list.filter((it) => !isLongTermReportItem(it));
    }
    return list;
  }, [schedule.items, ownerFilter, rangeMode]);

  const hiddenReportCount = useMemo(
    () => (rangeMode === 'core' ? schedule.items.filter((it) => isLongTermReportItem(it)).length : 0),
    [schedule.items, rangeMode]
  );

  // 進捗サマリー
  const stats = useMemo(() => {
    const items = schedule.items;
    const total = items.length;
    const completed = items.filter((t) => t.status === 'completed').length;
    const clientPending = items.filter(
      (t) => t.owner === 'client' && t.status !== 'completed'
    ).length;
    return {
      total,
      completed,
      progressPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      clientPending,
    };
  }, [schedule.items]);

  const gateDestinationTab = (gateNumber: number): WorkspaceTabId => {
    if (gateNumber === 1) return 'hearing';
    if (gateNumber === 2) return 'financial';
    if (gateNumber === 3) return 'consistency';
    return 'schedule';
  };

  // スケジュール変更ハンドラ
  const handleScheduleItemsChange = (newItems: ScheduleItem[]) => {
    if (!onUpdateSchedule) return;
    // 表示していなかった項目（担当フィルタ外・事業化状況報告）はそのまま残す
    const shownIds = new Set(filteredItems.map((it) => it.id));
    const hiddenItems = schedule.items.filter((it) => !shownIds.has(it.id));
    onUpdateSchedule(project.id, (s) => ({
      ...s,
      items: [...newItems, ...hiddenItems],
    }));
  };

  // 表示単位（月／週）切替
  const handleViewModeToggle = (mode: 'month' | 'week') => {
    if (!onUpdateSchedule) return;
    onUpdateSchedule(project.id, (s) => ({ ...s, viewMode: mode }));
  };

  // 締切日から再計算
  const handleRebuildSchedule = () => {
    const manualCount = schedule.items.filter((it) => it.manual).length;
    if (manualCount > 0) {
      const ok = window.confirm(
        `手動で変更した${manualCount}件は維持されます。再計算しますか？`
      );
      if (!ok) return;
    }
    if (onRebuildSchedule) {
      onRebuildSchedule(project.id);
      onNotify('締切日からスケジュールを再計算しました。');
    }
  };

  // 共有URL発行
  const handleShare = () => {
    const nowStr = new Date().toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const payload: SharePayload = {
      v: 1,
      companyName: project.companyName,
      issuedAt: nowStr,
      items: schedule.items,
    };

    const url = buildShareUrl(payload);
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(url).catch(() => {});
      }
    } catch {
      // ignore
    }

    onMarkScheduleShared?.(project.id);
    setShareModalUrl(url);
    setHasCopiedUrl(true);
    onNotify('共有URLを発行し、クリップボードにコピーしました。');
  };

  const copyModalUrl = () => {
    if (!shareModalUrl) return;
    try {
      navigator.clipboard.writeText(shareModalUrl).then(() => {
        setHasCopiedUrl(true);
        setTimeout(() => setHasCopiedUrl(false), 2500);
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
            <button
              type="button"
              onClick={onNavigateBackToList}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              ← 案件一覧へ戻る
            </button>
            <span aria-hidden="true">·</span>
            <span>
              ワークスペース タブ1 · 全体スケジュール・フェーズゲート管理（ロール:{' '}
              {role}）
            </span>
            <SpecTagBadge tag="指示書 4-⑥ / Step6 / STEP F" />
            <WorkspaceEffectBadge estimate={effectEstimate} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              全体スケジュール（申請〜事業化状況報告）
            </h1>
            {!canConfirmGate4 && (
              <ReadOnlyRoleBadge role={role} note="Gate 2〜4の確定は制限" />
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            対象案件:{' '}
            <span className="font-semibold text-slate-900">
              {project.companyName}
            </span>
            {' · '}全体完了率:{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-900">
              {stats.progressPct}%（{stats.completed}/{stats.total}タスク）
            </span>
            {' · '}顧客側残タスク:{' '}
            <span className="font-mono tabular-nums font-semibold text-amber-700">
              {stats.clientPending}件
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('financial')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {project.financialMaster.status === 'locked'
              ? '収支計画マスターを確認（Gate 2済）→'
              : '収支計画を確定してGate 2を通過する →'}
          </button>
        </div>
      </div>

      {/* Phase Gates Overview Strip (Gate 1 - Gate 4) */}
      <section
        data-guide-id="guide-gantt-gates"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 divide-y md:divide-y-0 md:divide-x divide-slate-200"
      >
        {project.gates.map((gate) => {
          const isCurrent = gate.number === currentActiveGateNumber;
          const isPassed = gate.isPassed;

          return (
            <div
              key={gate.id}
              className={`p-5 flex flex-col justify-between gap-4 ${
                isPassed
                  ? 'bg-emerald-50/30'
                  : isCurrent
                    ? 'bg-sky-50/40'
                    : 'bg-white'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    GATE 0{gate.number}
                  </span>
                  {isPassed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-emerald-900 bg-emerald-100 border border-emerald-300 whitespace-nowrap">
                      <Check className="w-3 h-3" />
                      通過済
                    </span>
                  ) : isCurrent ? (
                    <span className="px-2 py-0.5 text-xs font-semibold text-sky-900 bg-sky-100 border border-sky-300 whitespace-nowrap">
                      現在工程（要確定）
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 whitespace-nowrap">
                      <Lock className="w-3 h-3" />
                      未達ロック
                    </span>
                  )}
                </div>

                <h2 className="text-sm font-bold text-slate-900">
                  {gate.title.replace(/^Gate \d:\s*/, '')}
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {gate.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                {gate.passedAt ? (
                  <span className="font-mono tabular-nums text-[11px] text-emerald-800">
                    確定: {gate.passedAt}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">未確定</span>
                )}

                {gate.number <= 3 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateTab(gateDestinationTab(gate.number))
                    }
                    className="font-semibold text-slate-900 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    該当工程を開く →
                  </button>
                ) : canConfirmGate4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !gate.isPassed;
                      onToggleGatePassed(project.id, gate.id, nextVal);
                      onNotify(
                        nextVal
                          ? 'Gate 4（電子申請提出完了）を通過済みに更新しました。'
                          : 'Gate 4を未通過状態に戻しました。'
                      );
                    }}
                    className="font-semibold text-slate-800 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    {gate.isPassed ? '未完了に戻す' : '申請完了を記録'}
                  </button>
                ) : (
                  <span
                    className="text-[11px] text-slate-400 inline-flex items-center gap-1"
                    title={`${role}ロールではGate 4の確定はできません`}
                  >
                    <Lock className="w-3 h-3" />
                    閲覧のみ
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Gate 2 Notice Callout if Not Locked */}
      {project.financialMaster.status !== 'locked' && (
        <div className="bg-amber-50 border border-amber-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-amber-950 leading-relaxed">
            <span className="font-bold">
              【手戻り防止フェーズゲート制御中】
            </span>{' '}
            現在 Gate 2（収支計画マスター）が未確定のため、「04. 申請書 作成・編集」タブはロックされています。先に数値計画・公募要件を確定させてください。
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('financial')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            タブ3: 収支計画マスターへ移動 →
          </button>
        </div>
      )}

      {/* ガントチャートエリア */}
      <section
        data-guide-id="guide-gantt-chart"
        className="bg-white border border-slate-200"
      >
        {/* Toolbar & Filter & Actions */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              全体スケジュール（申請〜事業化状況報告）
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-amber-600 rounded-xs inline-block" />
                顧客担当
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-slate-900 rounded-xs inline-block" />
                支援側
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-slate-900 rotate-45 inline-block" />
                マイルストーン
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 担当フィルタ */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-200 rounded">
              {(
                [
                  { id: 'all', label: '全タスク' },
                  { id: 'client', label: '顧客のみ' },
                  { id: 'support', label: '支援側のみ' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOwnerFilter(f.id)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors rounded cursor-pointer ${
                    ownerFilter === f.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 月／週 切替 */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-200 rounded text-xs">
              <span className="text-slate-500 pl-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                表示:
              </span>
              <button
                type="button"
                onClick={() => handleViewModeToggle('month')}
                className={`px-2 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                月
              </button>
              <button
                type="button"
                onClick={() => handleViewModeToggle('week')}
                className={`px-2 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                週
              </button>
            </div>

            {/* 表示範囲 切替 */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-200 rounded text-xs">
              <span className="text-slate-500 pl-1.5">範囲:</span>
              <button
                type="button"
                onClick={() => setRangeMode('core')}
                className={`px-2 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                  rangeMode === 'core' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                申請〜精算
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('all')}
                className={`px-2 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                  rangeMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全期間（事業化状況報告を含む）
              </button>
            </div>

            {/* 締切日から再計算ボタン */}
            <button
              type="button"
              onClick={handleRebuildSchedule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded cursor-pointer transition-colors"
              title="公募要件の締切日・採択日や決算月をもとにタスク日程を再計算します（手動変更項目は保持されます）"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
              締切日から再計算
            </button>

            {/* 共有URLを発行ボタン */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-guide-id="guide-gantt-share"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded cursor-pointer transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-600" />
                共有URLを発行
              </button>
              {schedule.lastSharedAt && (
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  最終発行: {schedule.lastSharedAt}
                </span>
              )}
            </div>
          </div>
        </div>

        {hiddenReportCount > 0 && (
          <div className="px-4 py-2 text-[11px] text-slate-500 bg-slate-50 border-b border-slate-200">
            事業化状況報告 {hiddenReportCount} 件は非表示中です。「範囲：全期間」で表示できます。
          </div>
        )}

        {/* ScheduleChart Component */}
        <ScheduleChart
          items={filteredItems}
          viewMode={viewMode}
          readOnly={false}
          onChange={handleScheduleItemsChange}
        />
      </section>

      {/* 共有URL発行モーダル */}
      {shareModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  閲覧専用共有URLを発行しました
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShareModalUrl(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                共有URL（クリップボードにコピー済）
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareModalUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyModalUrl}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {hasCopiedUrl ? '済' : 'コピー'}
                </button>
              </div>
            </div>

            {/* 注意書き */}
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-950 space-y-1 leading-relaxed">
              <div className="font-bold flex items-center gap-1 text-amber-900">
                <span>ご案内・注意点</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900/90">
                <li>内容を変更した場合はURLを再発行してください</li>
                <li>URLを知っている人は誰でも閲覧できます</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <a
                href={shareModalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                別タブで閲覧画面を開く
              </a>
              <button
                type="button"
                onClick={() => setShareModalUrl(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
