import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Lock, Share2, X } from 'lucide-react';
import {
  EffectEstimateItem,
  GanttTask,
  PhaseGate,
  Project,
  Role,
  WorkspaceTabId,
} from '../types';
import { canConfirmGate, canEdit } from '../utils/permissions';
import {
  ReadOnlyRoleBadge,
  SpecTagBadge,
  WorkspaceEffectBadge,
} from './SpecTagBadge';
import { TermHelp } from './TermHelp';

interface GanttScheduleProps {
  project: Project;
  role: Role;
  effectEstimate?: EffectEstimateItem;
  executionPeriodMonths?: number;
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
  onOpenShareView?: (projectId: string) => void;
  onNotify: (message: string) => void;
}

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];

export const GanttSchedule: React.FC<GanttScheduleProps> = ({
  project,
  role,
  effectEstimate,
  executionPeriodMonths = 10,
  onUpdateTaskStatus,
  onToggleGatePassed,
  onNavigateTab,
  onNavigateBackToList,
  onOpenShareView,
  onNotify,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'client' | 'support'
  >('all');
  const [scheduleRangeMode, setScheduleRangeMode] = useState<
    '8weeks' | 'fullProject'
  >('8weeks');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return `?share=1&projectId=${project.id}`;
    return `${window.location.origin}${window.location.pathname}?share=1&projectId=${encodeURIComponent(project.id)}`;
  }, [project.id]);

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      onNotify('顧客共有用の閲覧URLをクリップボードにコピーしました。');
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
      onNotify('URLをコピーしました（手動コピーも利用できます）。');
    }
  };

  const canEditTasks = canEdit(role, 'schedule_task_edit');
  const canConfirmGate4 = canConfirmGate(role, 'gate-4');

  // 最初の未通過ゲートを「現在地（アクティブゲート）」として判定
  const currentActiveGateNumber = useMemo(() => {
    const firstUnpassed = project.gates.find((g) => !g.isPassed);
    return firstUnpassed ? firstUnpassed.number : 5;
  }, [project.gates]);

  const filteredTasks = useMemo(() => {
    if (categoryFilter === 'all') return project.scheduleTasks;
    return project.scheduleTasks.filter((t) => t.category === categoryFilter);
  }, [project.scheduleTasks, categoryFilter]);

  const stats = useMemo(() => {
    const total = project.scheduleTasks.length;
    const completed = project.scheduleTasks.filter(
      (t) => t.status === 'completed'
    ).length;
    const clientPending = project.scheduleTasks.filter(
      (t) => t.category === 'client' && t.status !== 'completed'
    ).length;
    return {
      total,
      completed,
      progressPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      clientPending,
    };
  }, [project.scheduleTasks]);

  const gateDestinationTab = (gateNumber: number): WorkspaceTabId => {
    if (gateNumber === 1) return 'hearing';
    if (gateNumber === 2) return 'financial';
    if (gateNumber === 3) return 'consistency';
    return 'schedule';
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
              ワークスペース タブ1 · 標準8週間工程・フェーズゲート管理（ロール:{' '}
              {role}）
            </span>
            <SpecTagBadge tag="指示書 4-⑥ / Step6" />
            <WorkspaceEffectBadge estimate={effectEstimate} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 inline-flex items-center gap-2">
              <span>標準工程表（ガントチャート）・フェーズゲート管理</span>
              <TermHelp termKey="gate" />
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
            <span className="font-mono tabular-nums font-semibold">
              {stats.clientPending}件
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-guide-id="guide-gantt-share"
            onClick={() => setShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-300 hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>共有URLを発行</span>
          </button>

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

      {/* 8-Week Standard Gantt Chart */}
      <section
        data-guide-id="guide-gantt-chart"
        className="bg-white border border-slate-200"
      >
        {/* Toolbar & Legend */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900">
              {scheduleRangeMode === '8weeks'
                ? '標準8週間スケジュール（顧客タスク・支援側タスク分離）'
                : `全期間マスターマイルストーン（申請〜採択〜交付決定〜完了・実績報告 約${executionPeriodMonths}か月）`}
            </h2>
            <SpecTagBadge tag="指示書 4-⑥" />
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 bg-amber-600 inline-block" />
                顧客担当タスク（書類準備・意思決定）
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 bg-slate-800 inline-block" />
                支援側タスク（分析・執筆・監査）
              </span>
            </div>
          </div>

          {/* Range Toggle & Filter Control */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setScheduleRangeMode('8weeks')}
                className={`px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  scheduleRangeMode === '8weeks'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                標準8週（申請まで）
              </button>
              <button
                type="button"
                onClick={() => setScheduleRangeMode('fullProject')}
                className={`px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  scheduleRangeMode === 'fullProject'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全期間（完了まで）
              </button>
            </div>

            {scheduleRangeMode === '8weeks' && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-200">
                {(
                  [
                    { id: 'all', label: '全タスク表示' },
                    { id: 'client', label: '顧客タスクのみ' },
                    { id: 'support', label: '支援側タスクのみ' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCategoryFilter(f.id)}
                    className={`px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      categoryFilter === f.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Gantt Table or Full Project Timeline */}
        {scheduleRangeMode === '8weeks' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  <th className="py-2.5 px-4 w-28 whitespace-nowrap">担当区分</th>
                  <th className="py-2.5 px-4 min-w-[280px]">
                    工程タスク名 / フェーズゲート
                  </th>
                  <th className="py-2.5 px-3 w-32 whitespace-nowrap">進捗状態</th>
                  {WEEKS.map((w) => (
                    <th
                      key={w}
                      className="py-2.5 px-2 text-center font-mono tabular-nums w-16 border-l border-slate-200 whitespace-nowrap"
                    >
                      W{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredTasks.map((task) => {
                  const isClient = task.category === 'client';
                  const isCompleted = task.status === 'completed';
                  const isInProgress = task.status === 'in_progress';
                  const canModifyThisRow = task.gateId
                    ? canConfirmGate(role, task.gateId)
                    : canEditTasks;

                  return (
                    <tr
                      key={task.id}
                      className={`transition-colors ${
                        task.isGate ? 'bg-slate-50/70' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-semibold border ${
                            isClient
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {isClient ? '顧客タスク' : '支援側タスク'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-medium ${
                              isCompleted
                                ? 'text-slate-600'
                                : 'text-slate-900 font-semibold'
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.gateId === 'gate-2' && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('financial')}
                              className="text-[11px] font-semibold text-sky-800 hover:underline whitespace-nowrap cursor-pointer"
                            >
                              [収支計画を開く]
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          aria-label={`${task.title}の進捗ステータス`}
                          disabled={!canModifyThisRow}
                          title={
                            canModifyThisRow
                              ? 'タスク進捗を更新'
                              : `${role}ロールではこのゲートタスクの確定はできません`
                          }
                          value={task.status}
                          onChange={(e) => {
                            const next = e.target.value as GanttTask['status'];
                            if (task.gateId === 'gate-2') {
                              onToggleGatePassed(
                                project.id,
                                'gate-2',
                                next === 'completed'
                              );
                              onNotify(
                                next === 'completed'
                                  ? 'Gate 2（収支計画）を確定済に更新し、申請書編集ロックを解除しました。'
                                  : 'Gate 2を未確定に戻しました。'
                              );
                            } else if (task.gateId) {
                              onToggleGatePassed(
                                project.id,
                                task.gateId,
                                next === 'completed'
                              );
                              onNotify(
                                `フェーズゲート「${task.title}」の状態を更新しました。`
                              );
                            } else {
                              onUpdateTaskStatus(project.id, task.id, next);
                              onNotify(
                                `タスク「${task.title}」の状態を更新しました。`
                              );
                            }
                          }}
                          className={`border px-2 py-1 text-xs font-semibold focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : isInProgress
                                ? 'bg-sky-50 text-sky-900 border-sky-300'
                                : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          <option value="not_started">未着手</option>
                          <option value="in_progress">進行中</option>
                          <option value="completed">完了</option>
                        </select>
                      </td>

                      {WEEKS.map((w) => {
                        const activeInWeek =
                          w >= task.startWeek && w <= task.endWeek;
                        return (
                          <td
                            key={w}
                            className="py-3 px-1.5 border-l border-slate-200 align-middle"
                          >
                            {activeInWeek && (
                              <div
                                className={`h-5 w-full flex items-center justify-center text-[10px] font-mono text-white ${
                                  isClient
                                    ? isCompleted
                                      ? 'bg-amber-600/80'
                                      : isInProgress
                                        ? 'bg-amber-600'
                                        : 'bg-amber-300 text-amber-950'
                                    : isCompleted
                                      ? 'bg-slate-700'
                                      : isInProgress
                                        ? 'bg-slate-900'
                                        : 'bg-slate-300 text-slate-800'
                                }`}
                              >
                                {w === task.startWeek
                                  ? task.isGate
                                    ? '★GATE'
                                    : isCompleted
                                      ? '済'
                                      : ''
                                  : ''}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-300 px-4 py-2.5 text-xs text-amber-950">
              <strong>【ご注意】</strong> 交付決定を受ける前に設備・システムの発注や契約を行うと「事前着手」となり補助対象外になります。必ず「フェーズ3: 交付決定」後に発注してください。
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                    <th className="py-2.5 px-4 w-48">フェーズ</th>
                    <th className="py-2.5 px-4 w-44">目安時期</th>
                    <th className="py-2.5 px-4">主要マイルストーン・顧客確認事項</th>
                    <th className="py-2.5 px-4 w-32">主担当</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">1. 申請準備〜提出</td>
                    <td className="py-3 px-4 font-mono">W1〜W8（締切 {project.deadline}）</td>
                    <td className="py-3 px-4 text-slate-700">
                      ヒアリング確定（Gate1）→ 収支計画ロック（Gate2）→ 申請書・整合性監査（Gate3）→ jGrants電子申請（Gate4）
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-[11px] font-semibold">支援側＋顧客</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">2. 審査・採択発表</td>
                    <td className="py-3 px-4 font-mono">申請後 約2〜3ヶ月</td>
                    <td className="py-3 px-4 text-slate-700">
                      事務局審査を経て採択通知を受領。交付申請用の見積再取得・必要書類を準備。
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold">顧客＋支援側</span>
                    </td>
                  </tr>
                  <tr className="bg-blue-50/30">
                    <td className="py-3 px-4 font-bold text-blue-900">3. 交付申請・交付決定</td>
                    <td className="py-3 px-4 font-mono">採択後 約1〜2ヶ月</td>
                    <td className="py-3 px-4 text-blue-950 font-medium">
                      交付決定通知書の受領（★ここから設備・システムの発注・契約が可能になります）
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-blue-100 border border-blue-300 text-blue-900 text-[11px] font-semibold">重要マイルストーン</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">4. 補助事業実施期間</td>
                    <td className="py-3 px-4 font-mono">交付決定後 {executionPeriodMonths}か月間</td>
                    <td className="py-3 px-4 text-slate-700">
                      5軸加工機・CAD/CAMシステムの発注・納品・検収・支払完了。試作稼働と実績証憑の保管。
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-semibold">顧客中心</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">5. 実績報告・補助金入金</td>
                    <td className="py-3 px-4 font-mono">事業完了後 30日以内〜</td>
                    <td className="py-3 px-4 text-slate-700">
                      確定検査・実績報告提出を経て補助金確定・振込。以降3〜5年間の事業化状況報告（年次賃上げ確認）。
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-[11px] font-semibold">支援側＋顧客</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Customer Share URL Modal */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-300 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  顧客共有用 閲覧専用スケジュールURLの発行
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              以下のURLをクライアント（代表者・経理担当者など）へ共有すると、編集操作や他社データを含まない「閲覧専用の工程表・準備書類リスト画面」を表示できます。
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                共有用URL（ブラウザ内デモ対応）
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleCopyShareUrl}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  {shareCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>コピー済</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>コピー</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                閉じる
              </button>
              {onOpenShareView && (
                <button
                  type="button"
                  onClick={() => {
                    setShareModalOpen(false);
                    onOpenShareView(project.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>閲覧画面をプレビュー</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
