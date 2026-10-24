import React, { useMemo, useState } from 'react';
import { PROJECT_STATUS_LIST } from '../data/initialData';
import { NewProjectInput } from '../hooks/useSubsidyStore';
import {
  DocumentStatus,
  Project,
  ProjectStatus,
  Role,
  ScreenId,
} from '../types';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string;
  role: Role;
  onSelectProjectAndNavigate: (projectId: string, screen: ScreenId) => void;
  onUpdateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  onAddProject: (input: NewProjectInput) => string;
  onNotify: (message: string) => void;
}

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

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  selectedProjectId,
  role,
  onSelectProjectAndNavigate,
  onUpdateProjectStatus,
  onAddProject,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [salesRep, setSalesRep] = useState('田中 健太');
  const [writerName, setWriterName] = useState('佐藤 美咲');
  const [deadline, setDeadline] = useState('2026-12-15');
  const [targetAmount, setTargetAmount] = useState('2,500万円');
  const [formError, setFormError] = useState('');

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesStatus =
        statusFilter === 'ALL' || p.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        p.companyName.toLowerCase().includes(q) ||
        p.industry.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.salesRep.toLowerCase().includes(q) ||
        p.writerName.toLowerCase().includes(q)
      );
    });
  }, [projects, searchQuery, statusFilter]);

  const kpi = useMemo(() => {
    const total = projects.length;
    const hearingOrMaster = projects.filter(
      (p) =>
        p.status === '未着手' ||
        p.status === 'ヒアリング中' ||
        p.status === 'マスター作成済'
    ).length;
    const draftingOrReview = projects.filter(
      (p) =>
        p.status === '申請書作成中' ||
        p.status === '社内レビュー中' ||
        p.status === '顧客確認中'
    ).length;
    const completedDocs = projects.reduce((acc, p) => {
      const docs = Object.values(p.subsidies);
      return acc + docs.filter((d) => d.status === '完成').length;
    }, 0);
    const totalTargetManYen = projects.reduce(
      (acc, p) => acc + (p.targetAmountManYen || 0),
      0
    );

    return {
      total,
      hearingOrMaster,
      draftingOrReview,
      completedDocs,
      totalTargetManYen,
    };
  }, [projects]);

  const handleRowClick = (project: Project) => {
    const targetScreen: ScreenId =
      project.status === '未着手' || project.status === 'ヒアリング中'
        ? 'hearing'
        : 'editor';
    onSelectProjectAndNavigate(project.id, targetScreen);
  };

  const handleSubmitNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !industry.trim()) {
      setFormError('企業名および業種は必須入力項目です。');
      return;
    }
    setFormError('');
    const newId = onAddProject({
      companyName,
      industry,
      salesRep,
      writerName,
      deadline,
      targetAmount,
    });
    setModalOpen(false);
    setCompanyName('');
    setIndustry('');
    onNotify(`新規案件「${companyName.trim()}」を登録しました。`);
    onSelectProjectAndNavigate(newId, 'hearing');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            画面1 · 全社進捗台帳（現在ロール: {role}）
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            案件一覧・進捗管理ダッシュボード
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            + 新規案件登録
          </button>
        </div>
      </div>

      {/* KPI Summary Ledger */}
      <div className="grid grid-cols-2 lg:grid-cols-5 bg-white border border-slate-200 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs text-slate-500 mb-1">管理対象案件数</div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {kpi.total} <span className="text-xs font-normal text-slate-500">件</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 mb-1">ヒアリング・マスター工程</div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {kpi.hearingOrMaster}{' '}
            <span className="text-xs font-normal text-slate-500">件</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 mb-1">申請書作成・レビュー中</div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {kpi.draftingOrReview}{' '}
            <span className="text-xs font-normal text-slate-500">件</span>
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 mb-1">完成済 補助金申請書枠</div>
          <div className="text-xl font-bold text-emerald-800 font-mono tabular-nums">
            {kpi.completedDocs}{' '}
            <span className="text-xs font-normal text-slate-500">枠</span>
          </div>
        </div>
        <div className="p-4 col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-500 mb-1">目標補助金額 合計</div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {kpi.totalTargetManYen.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">万円</span>
          </div>
        </div>
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
          <div className="flex items-center gap-2">
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
              <option value="ALL">すべてのステータス（{projects.length}件）</option>
              {PROJECT_STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {formatStatusDisplay(st)}
                </option>
              ))}
            </select>
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="px-2.5 py-2 text-xs text-slate-600 hover:text-slate-900 underline whitespace-nowrap cursor-pointer"
              >
                条件クリア
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-500">
          行クリックで進捗に応じた作業画面へ遷移します（表示:{' '}
          <span className="font-mono tabular-nums font-semibold text-slate-800">
            {filteredProjects.length}
          </span>{' '}
          件）
        </div>
      </div>

      {/* Main Enterprise Case Table */}
      <div className="bg-white border border-slate-200 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
              <th className="py-3 px-4 whitespace-nowrap">案件番号</th>
              <th className="py-3 px-4 whitespace-nowrap">顧客（企業名 / 業種）</th>
              <th className="py-3 px-4 whitespace-nowrap">担当営業 / 書類作成者</th>
              <th className="py-3 px-4 whitespace-nowrap text-right">
                申請期日 / 目標補助金額
              </th>
              <th className="py-3 px-4 whitespace-nowrap">案件全体ステータス</th>
              <th className="py-3 px-4 whitespace-nowrap">
                各補助金作成状況（3制度連動）
              </th>
              <th className="py-3 px-4 whitespace-nowrap text-right">画面遷移</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filteredProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 px-4 text-center text-sm text-slate-500"
                >
                  該当する案件データがありません。検索条件を変更するか、「+ 新規案件登録」から追加してください。
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
                      <div className="font-mono tabular-nums text-xs text-slate-700">
                        {project.deadline}
                      </div>
                      <div className="font-mono tabular-nums text-sm font-bold text-slate-900 mt-0.5">
                        {project.targetAmount}
                      </div>
                    </td>

                    <td
                      className="py-3.5 px-4 align-top whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        aria-label={`${project.companyName}の全体ステータス`}
                        value={project.status}
                        onChange={(e) => {
                          const next = e.target.value as ProjectStatus;
                          onUpdateProjectStatus(project.id, next);
                          onNotify(
                            `「${project.companyName}」のステータスを「${formatStatusDisplay(next)}」に更新しました。`
                          );
                        }}
                        className={`border px-2.5 py-1 text-xs font-semibold focus:outline-none cursor-pointer ${getProjectStatusStyle(
                          project.status
                        )}`}
                      >
                        {PROJECT_STATUS_LIST.map((st) => (
                          <option key={st} value={st} className="bg-white text-slate-900">
                            {formatStatusDisplay(st)}
                          </option>
                        ))}
                      </select>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-1">
                        更新: {project.updatedAt}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top text-xs whitespace-nowrap">
                      <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1">
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
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectProjectAndNavigate(project.id, 'hearing')
                          }
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          議事録・マスター
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSelectProjectAndNavigate(project.id, 'editor')
                          }
                          className="px-2.5 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-900 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          申請書編集 →
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
                    申請目標期日
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
                  登録してヒアリング画面へ進む →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
