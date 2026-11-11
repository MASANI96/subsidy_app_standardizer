import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Plus,
  Search,
} from 'lucide-react';
import {
  DisplayCurrencyUnit,
  Project,
  ProjectStatus,
  Role,
  RoundingMode,
  SubsidyTrackId,
  SubsidyVersionRound,
  WorkspaceTabId,
} from '../types';
import { formatMoney } from '../utils/financialCalculations';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string;
  role: Role;
  activeCallRound: SubsidyVersionRound;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  onOpenWorkspace: (projectId: string, tab: WorkspaceTabId) => void;
  onUpdateProjectStatus: (projectId: string, status: ProjectStatus) => void;
  onAddProject: (input: {
    companyName: string;
    industry: string;
    salesRep: string;
    writerName: string;
    deadline: string;
    appliedTrackId?: SubsidyTrackId;
  }) => string;
  onNotify: (message: string) => void;
}

const PROJECT_STATUSES: ProjectStatus[] = [
  '未着手',
  'ヒアリング中',
  'マスター作成済',
  '収支計画作成中',
  '申請書作成中',
  '社内レビュー中',
  '顧客確認中',
  '申請完了',
  '採択',
  '不採択',
];

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  selectedProjectId,
  role,
  activeCallRound,
  displayCurrencyUnit,
  roundingMode,
  onOpenWorkspace,
  onUpdateProjectStatus,
  onAddProject,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newIndustry, setNewIndustry] = useState('精密金属加工業');
  const [newSalesRep, setNewSalesRep] = useState('田中 健太');
  const [newWriterName, setNewWriterName] = useState('佐藤 美咲');
  const [newDeadline, setNewDeadline] = useState('2026-12-25');
  const [newTrackId, setNewTrackId] = useState<SubsidyTrackId>('shinjigyo');

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchSearch =
        !searchQuery ||
        p.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.salesRep.includes(searchQuery);

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const handleCreateProject = () => {
    if (!newCompanyName.trim()) {
      onNotify('企業名を入力してください。');
      return;
    }
    const newId = onAddProject({
      companyName: newCompanyName,
      industry: newIndustry,
      salesRep: newSalesRep,
      writerName: newWriterName,
      deadline: newDeadline,
      appliedTrackId: newTrackId,
    });
    setNewModalOpen(false);
    onNotify(`新規案件「${newCompanyName}」を登録しました。`);
    onOpenWorkspace(newId, 'financial');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            01. 案件一覧・進捗台帳
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            新事業進出・ものづくり商業サービス補助金の申請案件を一元管理（受領案件データ：株式会社○○）
          </p>
        </div>

        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>新規案件を追加登録</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="企業名、案件番号、担当者で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 focus:border-slate-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-600 font-medium">進捗ステータス:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 px-2.5 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">すべて表示 ({projects.length})</option>
            {PROJECT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Table */}
      <div className="bg-white border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-3 px-4">案件番号 / 企業名</th>
                <th className="py-3 px-3">適用枠・版</th>
                <th className="py-3 px-3">総投資額 / 申請額</th>
                <th className="py-3 px-3">1年当たり売上見込額</th>
                <th className="py-3 px-3">進捗ステータス</th>
                <th className="py-3 px-3">フェーズゲート通過</th>
                <th className="py-3 px-3">申請締切日</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProjects.map((proj) => {
                const fm = proj.financialMaster;
                const isSelected = proj.id === selectedProjectId;
                const track =
                  activeCallRound.tracks.find((t) => t.id === fm.appliedTrackId) ??
                  activeCallRound.tracks[0];
                const passedGatesCount =
                  proj.gates.filter((g) => g.isPassed).length || 0;

                return (
                  <tr
                    key={proj.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-slate-500 font-semibold">
                        {proj.code}
                      </div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{proj.companyName}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold border border-blue-200">
                            選択中
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {proj.industry} / 営業: {proj.salesRep}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>{track.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        版: {proj.appliedVersionId}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900">
                        {formatMoney(
                          fm.investment.totalInvestmentYen,
                          displayCurrencyUnit,
                          roundingMode
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-blue-800">
                        申請: {formatMoney(fm.investment.subsidyRequestedYen, displayCurrencyUnit, roundingMode)}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900">
                          {formatMoney(
                            fm.annualSalesEstimate.calculatedValueYen,
                            displayCurrencyUnit,
                            roundingMode
                          )}
                        </span>
                        <span className="text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                          仮
                        </span>
                      </div>
                      {fm.annualSalesEstimate.hasMismatch && (
                        <div className="text-[10px] text-rose-700 font-bold">
                          ※5.96億 vs 6.3億 不一致あり
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={proj.status}
                        onChange={(e) =>
                          onUpdateProjectStatus(
                            proj.id,
                            e.target.value as ProjectStatus
                          )
                        }
                        className="bg-white border border-slate-300 text-xs font-semibold px-2 py-1"
                      >
                        {PROJECT_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-800">
                          {passedGatesCount}/4
                        </span>
                        <div className="flex items-center gap-1">
                          {proj.gates.map((g) => (
                            <span
                              key={g.id}
                              title={`${g.title}: ${g.isPassed ? '通過済' : '未通過'}`}
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                g.isPassed
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {g.number}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-700 font-medium">
                      {proj.deadline}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenWorkspace(proj.id, 'financial')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <span>収支計画を開く</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新規登録モーダル */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-300 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">新規案件の登録</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  企業名（例：株式会社○○）:
                </label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5"
                  placeholder="株式会社○○"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  業種:
                </label>
                <input
                  type="text"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  申請枠:
                </label>
                <select
                  value={newTrackId}
                  onChange={(e) => setNewTrackId(e.target.value as SubsidyTrackId)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 font-semibold"
                >
                  {activeCallRound.tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    営業担当:
                  </label>
                  <input
                    type="text"
                    value={newSalesRep}
                    onChange={(e) => setNewSalesRep(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    書類作成担当:
                  </label>
                  <input
                    type="text"
                    value={newWriterName}
                    onChange={(e) => setNewWriterName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  申請締切日:
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 cursor-pointer"
              >
                登録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
