import React, { useMemo, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { PROJECT_STATUS_LIST } from '../data/initialData';
import { NewProjectInput } from '../hooks/useSubsidyStore';
import {
  DocumentStatus,
  EffectEstimateItem,
  Project,
  ProjectStatus,
  Role,
  SubsidyRequirementThresholds,
  WorkspaceTabId,
} from '../types';
import { evaluateSubsidyRequirements } from '../utils/financialCalculations';
import { canEdit } from '../utils/permissions';
import { formatMinutesJa, ReadOnlyRoleBadge } from './SpecTagBadge';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string;
  role: Role;
  thresholds: SubsidyRequirementThresholds;
  effectEstimates: EffectEstimateItem[];
  onOpenWorkspace: (projectId: string, tab: WorkspaceTabId) => void;
  onUpdateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  onAddProject: (input: NewProjectInput) => string;
  onNavigateAdminEffects: () => void;
  onNotify: (message: string) => void;
}

type KpiFilterMode =
  | 'ALL'
  | 'IN_PROGRESS'
  | 'DEADLINE_14D'
  | 'GATE_1'
  | 'GATE_2'
  | 'GATE_3'
  | 'GATE_4'
  | 'ROLE_PENDING';

function formatStatusDisplay(status: ProjectStatus): string {
  if (status === 'ヒアリング中') return 'ヒアリング中（議事録受領）';
  return status;
}

function getProjectStatusStyle(status: ProjectStatus): string {
  switch (status) {
    case '未着手':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'ヒアリング中':
      return 'bg-amber-50 text-amber-900 border-amber-300';
    case 'マスター作成済':
    case '収支計画作成中':
      return 'bg-sky-50 text-sky-900 border-sky-300';
    case '申請書作成中':
      return 'bg-indigo-50 text-indigo-950 border-indigo-300';
    case '社内レビュー中':
    case '顧客確認中':
      return 'bg-violet-50 text-violet-950 border-violet-300';
    case '申請完了':
    case '採択':
      return 'bg-emerald-50 text-emerald-900 border-emerald-300';
    case '不採択':
      return 'bg-rose-50 text-rose-900 border-rose-300';
  }
}

function getDocStatusTextClass(status: DocumentStatus): string {
  switch (status) {
    case '未作成':
      return 'text-slate-400';
    case '下書き':
      return 'text-slate-700 font-medium';
    case '修正中':
      return 'text-amber-800 font-semibold';
    case '完成':
      return 'text-emerald-800 font-semibold';
  }
}

function getDaysUntilDeadline(dateStr: string): number {
  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  if (!y || !m || !d) return 999;
  const targetMidnight = new Date(y, m - 1, d).getTime();
  return Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
}

function isProjectInProgress(p: Project): boolean {
  return (
    p.status !== '申請完了' && p.status !== '採択' && p.status !== '不採択'
  );
}

function isProjectRolePending(
  p: Project,
  role: Role,
  thresholds: SubsidyRequirementThresholds
): boolean {
  const g1 = Boolean(p.gates.find((g) => g.id === 'gate-1')?.isPassed);
  const g2 = p.financialMaster.status === 'locked';
  const g3 = Boolean(p.gates.find((g) => g.id === 'gate-3')?.isPassed);
  const g4 = Boolean(p.gates.find((g) => g.id === 'gate-4')?.isPassed);

  if (role === '営業担当') {
    const hasPendingClientTask = p.scheduleTasks.some(
      (t) => t.category === 'client' && t.status !== 'completed'
    );
    return !g1 || hasPendingClientTask;
  }
  if (role === '書類作成者') {
    return (g1 && !g2) || (g2 && !g3);
  }
  // システム管理者: 要件未達案件 または Gate3済でGate4最終承認待ち案件
  const evalRes = evaluateSubsidyRequirements(p.financialMaster, thresholds);
  return !evalRes.shinJigyo.isAllPassed || (g3 && !g4);
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  selectedProjectId,
  role,
  thresholds,
  effectEstimates,
  onOpenWorkspace,
  onUpdateProjectStatus,
  onAddProject,
  onNavigateAdminEffects,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [kpiFilter, setKpiFilter] = useState<KpiFilterMode>('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [salesRep, setSalesRep] = useState('田中 健太');
  const [writerName, setWriterName] = useState('佐藤 美咲');
  const [deadline, setDeadline] = useState('2026-12-15');
  const [targetAmount, setTargetAmount] = useState('2,500万円');
  const [formError, setFormError] = useState('');

  const canEditProjects = canEdit(role, 'projects_edit');

  const kpi = useMemo(() => {
    const total = projects.length;
    const inProgressList = projects.filter(isProjectInProgress);
    const deadline14dList = projects.filter((p) => {
      if (!isProjectInProgress(p)) return false;
      const days = getDaysUntilDeadline(p.applicationDeadline);
      return days <= 14;
    });

    const gateCounts = [1, 2, 3, 4].map((num) => ({
      number: num,
      passedCount: projects.filter(
        (p) => p.gates.find((g) => g.number === num)?.isPassed
      ).length,
    }));

    const rolePendingList = projects.filter((p) =>
      isProjectRolePending(p, role, thresholds)
    );

    const manualHoursPerProject = effectEstimates.reduce(
      (sum, item) => sum + item.manualHours,
      0
    );
    const systemMinutesPerProject = effectEstimates.reduce(
      (sum, item) => sum + item.systemMinutes,
      0
    );
    const systemHoursPerProject = systemMinutesPerProject / 60;
    const savedHoursPerProject = Number(
      Math.max(0, manualHoursPerProject - systemHoursPerProject).toFixed(1)
    );
    const totalSavedHoursAllProjects = Number(
      (savedHoursPerProject * total).toFixed(1)
    );

    return {
      total,
      inProgressCount: inProgressList.length,
      deadline14dCount: deadline14dList.length,
      gateCounts,
      rolePendingCount: rolePendingList.length,
      manualHoursPerProject,
      systemMinutesPerProject,
      savedHoursPerProject,
      totalSavedHoursAllProjects,
    };
  }, [projects, role, thresholds, effectEstimates]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

      if (kpiFilter === 'IN_PROGRESS' && !isProjectInProgress(p)) return false;
      if (kpiFilter === 'DEADLINE_14D') {
        if (!isProjectInProgress(p)) return false;
        if (getDaysUntilDeadline(p.applicationDeadline) > 14) return false;
      }
      if (kpiFilter === 'GATE_1') {
        if (!p.gates.find((g) => g.number === 1)?.isPassed) return false;
      }
      if (kpiFilter === 'GATE_2') {
        if (!p.gates.find((g) => g.number === 2)?.isPassed) return false;
      }
      if (kpiFilter === 'GATE_3') {
        if (!p.gates.find((g) => g.number === 3)?.isPassed) return false;
      }
      if (kpiFilter === 'GATE_4') {
        if (!p.gates.find((g) => g.number === 4)?.isPassed) return false;
      }
      if (
        kpiFilter === 'ROLE_PENDING' &&
        !isProjectRolePending(p, role, thresholds)
      ) {
        return false;
      }

      if (!q) return true;
      return (
        p.companyName.toLowerCase().includes(q) ||
        p.industry.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.salesRep.toLowerCase().includes(q) ||
        p.writerName.toLowerCase().includes(q)
      );
    });
  }, [projects, searchQuery, statusFilter, kpiFilter, role, thresholds]);

  const toggleKpiFilter = (mode: KpiFilterMode) => {
    setKpiFilter((prev) => (prev === mode ? 'ALL' : mode));
  };

  const kpiFilterLabel: Record<KpiFilterMode, string> = {
    ALL: '',
    IN_PROGRESS: '進行中案件',
    DEADLINE_14D: '申請締切14日以内の案件',
    GATE_1: 'Gate 1 通過済',
    GATE_2: 'Gate 2 通過済',
    GATE_3: 'Gate 3 通過済',
    GATE_4: 'Gate 4 通過済',
    ROLE_PENDING: `${role}の対応待ち案件`,
  };

  const handleRowClick = (project: Project) => {
    if (project.status === '未着手' || project.status === 'ヒアリング中') {
      onOpenWorkspace(project.id, 'hearing');
    } else if (project.financialMaster.status !== 'locked') {
      onOpenWorkspace(project.id, 'financial');
    } else {
      onOpenWorkspace(project.id, 'editor');
    }
  };

  const handleSubmitNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditProjects) return;
    if (!companyName.trim() || !industry.trim()) {
      setFormError('企業名および業種は必須入力項目です。');
      return;
    }
    setFormError('');
    const trimmedName = companyName.trim();
    const newId = onAddProject({
      companyName: trimmedName,
      industry,
      salesRep,
      writerName,
      deadline,
      targetAmount,
    });
    setModalOpen(false);
    setCompanyName('');
    setIndustry('');
    onNotify(
      `新規案件「${trimmedName}」を登録しました。ヒアリング・マスター工程を開始できます。`
    );
    onOpenWorkspace(newId, 'hearing');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            01. 案件一覧・台帳 · 全社フェーズゲート進捗管理（現在ロール: {role}）
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              補助金支援案件 進捗管理ダッシュボード・台帳
            </h1>
            {!canEditProjects && (
              <ReadOnlyRoleBadge
                role={role}
                note="新規登録・ステータス変更不可"
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-guide-id="guide-project-add"
            disabled={!canEditProjects}
            title={
              canEditProjects
                ? '新規支援案件を登録します'
                : `${role}ロールでは新規案件登録はできません（営業担当・システム管理者のみ）`
            }
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            + 新規案件登録
          </button>
        </div>
      </div>

      {/* W1 + W2: Operational KPI Dashboard & Effect Estimate */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* W1: 4 Operational KPI Cards */}
        <section
          data-guide-id="guide-dashboard-kpi"
          className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
        >
          {/* KPI 1: 進行中案件数 */}
          <button
            type="button"
            onClick={() => toggleKpiFilter('IN_PROGRESS')}
            className={`p-4 text-left transition-colors cursor-pointer flex flex-col justify-between ${
              kpiFilter === 'IN_PROGRESS'
                ? 'bg-slate-900 text-white'
                : 'hover:bg-slate-50'
            }`}
          >
            <div
              className={`text-xs font-medium ${
                kpiFilter === 'IN_PROGRESS' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              進行中案件数
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono tabular-nums">
                {kpi.inProgressCount}
              </span>
              <span
                className={`text-xs ${
                  kpiFilter === 'IN_PROGRESS'
                    ? 'text-slate-300'
                    : 'text-slate-500'
                }`}
              >
                / 全{kpi.total}件
              </span>
            </div>
            <div
              className={`mt-2 text-[11px] ${
                kpiFilter === 'IN_PROGRESS' ? 'text-slate-300' : 'text-slate-400'
              }`}
            >
              クリックで一覧絞込
            </div>
          </button>

          {/* KPI 2: 申請締切14日以内の案件（警告表示） */}
          <button
            type="button"
            onClick={() => toggleKpiFilter('DEADLINE_14D')}
            className={`p-4 text-left transition-colors cursor-pointer flex flex-col justify-between ${
              kpiFilter === 'DEADLINE_14D'
                ? 'bg-amber-900 text-white'
                : kpi.deadline14dCount > 0
                  ? 'bg-amber-50/70 hover:bg-amber-100/70'
                  : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span
                className={`text-xs font-semibold ${
                  kpiFilter === 'DEADLINE_14D'
                    ? 'text-amber-100'
                    : kpi.deadline14dCount > 0
                      ? 'text-amber-950'
                      : 'text-slate-500'
                }`}
              >
                申請締切14日以内
              </span>
              {kpi.deadline14dCount > 0 && (
                <AlertTriangle
                  className={`w-3.5 h-3.5 shrink-0 ${
                    kpiFilter === 'DEADLINE_14D'
                      ? 'text-amber-200'
                      : 'text-amber-700'
                  }`}
                />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold font-mono tabular-nums ${
                  kpiFilter === 'DEADLINE_14D'
                    ? 'text-white'
                    : kpi.deadline14dCount > 0
                      ? 'text-amber-900'
                      : 'text-slate-900'
                }`}
              >
                {kpi.deadline14dCount}
              </span>
              <span
                className={`text-xs ${
                  kpiFilter === 'DEADLINE_14D'
                    ? 'text-amber-100'
                    : 'text-slate-600'
                }`}
              >
                件（優先対応）
              </span>
            </div>
            <div
              className={`mt-2 text-[11px] ${
                kpiFilter === 'DEADLINE_14D'
                  ? 'text-amber-200'
                  : kpi.deadline14dCount > 0
                    ? 'text-amber-800 font-medium'
                    : 'text-slate-400'
              }`}
            >
              {kpi.deadline14dCount > 0
                ? '期限超過防止アラート対象'
                : '直近14日以内の締切なし'}
            </div>
          </button>

          {/* KPI 3: Gate別進捗（Gate 1〜4 通過件数の横棒） */}
          <div className="p-4 flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-500 mb-1.5">
              Gate別進捗（クリック絞込）
            </div>
            <div className="space-y-1.5">
              {kpi.gateCounts.map((gc) => {
                const mode = `GATE_${gc.number}` as KpiFilterMode;
                const isSelected = kpiFilter === mode;
                const pct =
                  kpi.total > 0
                    ? Math.round((gc.passedCount / kpi.total) * 100)
                    : 0;
                return (
                  <button
                    key={gc.number}
                    type="button"
                    onClick={() => toggleKpiFilter(mode)}
                    className={`w-full text-left group cursor-pointer ${
                      isSelected ? 'font-bold text-slate-950' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="group-hover:underline">
                        G{gc.number}通過
                        {isSelected ? ' [絞込中]' : ''}
                      </span>
                      <span>
                        {gc.passedCount}/{kpi.total}件
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 border border-slate-200 mt-0.5">
                      <div
                        className={`h-full transition-all ${
                          isSelected ? 'bg-emerald-700' : 'bg-slate-800'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI 4: 現在ロールの対応待ちタスク件数 */}
          <button
            type="button"
            onClick={() => toggleKpiFilter('ROLE_PENDING')}
            className={`p-4 text-left transition-colors cursor-pointer flex flex-col justify-between ${
              kpiFilter === 'ROLE_PENDING'
                ? 'bg-slate-900 text-white'
                : 'hover:bg-slate-50'
            }`}
          >
            <div
              className={`text-xs font-medium ${
                kpiFilter === 'ROLE_PENDING'
                  ? 'text-slate-300'
                  : 'text-slate-500'
              }`}
            >
              {role}の対応待ち
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono tabular-nums">
                {kpi.rolePendingCount}
              </span>
              <span
                className={`text-xs ${
                  kpiFilter === 'ROLE_PENDING'
                    ? 'text-slate-300'
                    : 'text-slate-500'
                }`}
              >
                件
              </span>
            </div>
            <div
              className={`mt-2 text-[11px] leading-snug ${
                kpiFilter === 'ROLE_PENDING'
                  ? 'text-slate-300'
                  : 'text-slate-500'
              }`}
            >
              {role === '営業担当'
                ? 'Gate1未確定・顧客残タスク'
                : role === '書類作成者'
                  ? '収支未確定・Gate3未検証'
                  : '要件未達・Gate4承認待ち'}
            </div>
          </button>
        </section>

        {/* W2: 導入効果試算カード */}
        <section
          data-guide-id="guide-dashboard-effect"
          className="xl:col-span-4 bg-white border border-slate-300 p-4 flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-700 shrink-0" />
              <h2 className="text-xs font-bold text-slate-900">
                標準化による工数削減効果
              </h2>
            </div>
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
              試算例（仮置き）
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2.5">
            <div>
              <div className="text-[11px] text-slate-500">1案件あたり削減</div>
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-800 mt-0.5">
                -{kpi.savedHoursPerProject}
                <span className="text-xs font-normal text-slate-600"> 時間</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                従来{kpi.manualHoursPerProject}h →{' '}
                {formatMinutesJa(kpi.systemMinutesPerProject)}
              </div>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="text-[11px] text-slate-500">
                台帳全{kpi.total}案件 合計削減
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                約 {kpi.totalSavedHoursAllProjects}
                <span className="text-xs font-normal text-slate-600"> 時間</span>
              </div>
              <div className="text-[10px] text-slate-500">
                3制度同時展開を含む試算
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>工程別の所要時間前提に連動</span>
            <button
              type="button"
              onClick={onNavigateAdminEffects}
              className="text-slate-700 hover:text-slate-900 underline cursor-pointer whitespace-nowrap"
            >
              試算前提を確認・変更 →
            </button>
          </div>
        </section>
      </div>

      {/* Search & Status Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div className="flex-1 max-w-md">
            <label htmlFor="project-search" className="sr-only">
              案件検索
            </label>
            <input
              id="project-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="企業名・業種・案件番号・担当者名で検索..."
              className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-800"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="status-filter"
              className="text-xs font-medium text-slate-600 whitespace-nowrap"
            >
              ステータス絞込:
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-800"
            >
              <option value="ALL">
                すべてのステータス（{projects.length}件）
              </option>
              {PROJECT_STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {formatStatusDisplay(st)}
                </option>
              ))}
            </select>
            {kpiFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-900 text-white">
                <span>KPI絞込: {kpiFilterLabel[kpiFilter]}</span>
                <button
                  type="button"
                  onClick={() => setKpiFilter('ALL')}
                  className="font-mono hover:text-slate-300 cursor-pointer"
                  aria-label="KPI絞込を解除"
                >
                  ×
                </button>
              </span>
            )}
            {(searchQuery || statusFilter !== 'ALL' || kpiFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setKpiFilter('ALL');
                }}
                className="px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 underline whitespace-nowrap cursor-pointer"
              >
                条件クリア
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-500">
          行クリックで現在のボトルネック工程タブへ遷移します（表示:{' '}
          <span className="font-mono tabular-nums font-semibold text-slate-800">
            {filteredProjects.length}
          </span>{' '}
          件）
        </div>
      </div>

      {/* Main Enterprise Case Table */}
      <div
        data-guide-id="guide-project-table"
        className="bg-white border border-slate-200 overflow-x-auto"
      >
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
              <th className="py-3 px-4 whitespace-nowrap">案件番号</th>
              <th className="py-3 px-4 whitespace-nowrap">
                顧客（企業名 / 業種）
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                担当営業 / 書類作成者
              </th>
              <th className="py-3 px-4 whitespace-nowrap text-right">
                申請締切 / 申請希望額（総投資）
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                フェーズゲート通過状況（Gate 1〜4）
              </th>
              <th className="py-3 px-4 whitespace-nowrap">案件全体ステータス</th>
              <th className="py-3 px-4 whitespace-nowrap">
                各補助金作成状況
              </th>
              <th className="py-3 px-4 whitespace-nowrap text-right">
                ワークスペース起動
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filteredProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 px-4 text-center text-sm text-slate-500"
                >
                  該当する案件データがありません。絞り込み条件を解除するか、「+ 新規案件登録」から追加してください。
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = project.id === selectedProjectId;
                const shinStatus = project.subsidies['新事業進出補助金'].status;
                const jizoStatus =
                  project.subsidies['小規模事業者持続化補助金'].status;
                const tokyoStatus =
                  project.subsidies['東京都経営強化基盤事業'].status;
                const gate2Locked =
                  project.financialMaster.status === 'locked';
                const daysLeft = getDaysUntilDeadline(
                  project.applicationDeadline
                );
                const isUrgentDeadline =
                  isProjectInProgress(project) && daysLeft <= 14;

                return (
                  <tr
                    key={project.id}
                    onClick={() => handleRowClick(project)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-50/90 hover:bg-slate-100/80'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4 align-top font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                      <div>{project.code}</div>
                      {isSelected && (
                        <div className="mt-1 text-[11px] font-sans font-semibold text-slate-900">
                          [選択中]
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900">
                        {project.companyName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {project.industry}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top text-xs whitespace-nowrap">
                      <div className="text-slate-800">
                        <span className="text-slate-500">営業:</span>{' '}
                        {project.salesRep}
                      </div>
                      <div className="text-slate-800 mt-1">
                        <span className="text-slate-500">作成:</span>{' '}
                        {project.writerName}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 font-mono tabular-nums text-xs">
                        {isUrgentDeadline && (
                          <span className="px-1.5 py-0.5 text-[10px] font-sans font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            残{Math.max(0, daysLeft)}日
                          </span>
                        )}
                        <span
                          className={
                            isUrgentDeadline
                              ? 'font-bold text-amber-900'
                              : 'text-slate-700'
                          }
                        >
                          {project.applicationDeadline}
                        </span>
                      </div>
                      <div className="font-mono tabular-nums text-sm font-bold text-slate-900 mt-0.5">
                        {project.targetAmount}
                      </div>
                      <div className="font-mono tabular-nums text-[11px] text-slate-500">
                        総投資{' '}
                        {project.financialMaster.investment.totalInvestment.toLocaleString()}
                        万円
                      </div>
                    </td>

                    {/* Phase Gates G1-G4 */}
                    <td
                      className="py-3.5 px-4 align-top whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-2 gap-1 text-[11px] font-mono tabular-nums">
                        {project.gates.map((gate) => {
                          const targetTab: WorkspaceTabId =
                            gate.number === 1
                              ? 'hearing'
                              : gate.number === 2
                                ? 'financial'
                                : gate.number === 3
                                  ? 'consistency'
                                  : 'schedule';
                          return (
                            <button
                              key={gate.id}
                              type="button"
                              onClick={() =>
                                onOpenWorkspace(project.id, targetTab)
                              }
                              title={`${gate.title}（クリックして移動）`}
                              className={`px-2 py-0.5 border text-left transition-colors cursor-pointer whitespace-nowrap ${
                                gate.isPassed
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400'
                              }`}
                            >
                              G{gate.number}:{' '}
                              {gate.isPassed ? '通過済' : '未通過'}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    <td
                      className="py-3.5 px-4 align-top whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        aria-label={`${project.companyName}の全体ステータス`}
                        disabled={!canEditProjects}
                        title={
                          canEditProjects
                            ? '案件全体ステータスを変更'
                            : `${role}は閲覧のみ`
                        }
                        value={project.status}
                        onChange={(e) => {
                          const next = e.target.value as ProjectStatus;
                          onUpdateProjectStatus(project.id, next);
                          onNotify(
                            `「${project.companyName}」のステータスを「${formatStatusDisplay(next)}」に更新しました。`
                          );
                        }}
                        className={`border px-2.5 py-1 text-xs font-semibold focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer ${getProjectStatusStyle(
                          project.status
                        )}`}
                      >
                        {PROJECT_STATUS_LIST.map((st) => (
                          <option
                            key={st}
                            value={st}
                            className="bg-white text-slate-900"
                          >
                            {formatStatusDisplay(st)}
                          </option>
                        ))}
                      </select>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-1">
                        更新: {project.updatedAt}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top text-xs whitespace-nowrap">
                      <div className="grid grid-cols-[auto_auto] gap-x-2.5 gap-y-1">
                        <span className="text-slate-500">新事業進出:</span>
                        <span className={getDocStatusTextClass(shinStatus)}>
                          {shinStatus}
                        </span>
                        <span className="text-slate-500">持続化:</span>
                        <span className={getDocStatusTextClass(jizoStatus)}>
                          {jizoStatus}
                        </span>
                        <span className="text-slate-500">都経営強化:</span>
                        <span className={getDocStatusTextClass(tokyoStatus)}>
                          {tokyoStatus}
                        </span>
                      </div>
                    </td>

                    <td
                      className="py-3.5 px-4 align-top text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenWorkspace(project.id, 'schedule')
                          }
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          工程表
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenWorkspace(project.id, 'financial')
                          }
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          収支計画
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenWorkspace(project.id, 'editor')}
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          {gate2Locked ? '申請書編集 →' : '申請書(要G2) →'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Project Registration Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-modal-title"
        >
          <div className="w-full max-w-lg bg-white border border-slate-300 shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2
                id="new-project-modal-title"
                className="text-base font-bold text-slate-900"
              >
                新規補助金支援案件の登録
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-sm font-mono text-slate-500 hover:text-slate-900 px-2 py-1 cursor-pointer"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitNewProject} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-xs text-rose-900">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  顧客企業名 <span className="text-rose-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="例: 株式会社大田精機製作所"
                  className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  業種・所在地 <span className="text-rose-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="例: 金属プレス・金型製造業（東京都大田区）"
                  className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    担当営業
                  </label>
                  <input
                    type="text"
                    value={salesRep}
                    onChange={(e) => setSalesRep(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    書類作成担当者
                  </label>
                  <input
                    type="text"
                    value={writerName}
                    onChange={(e) => setWriterName(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    申請締切日
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    目標補助金額
                  </label>
                  <input
                    type="text"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="例: 2,500万円"
                    className="w-full border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  登録してワークスペースを開く →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
