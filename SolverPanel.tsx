import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Sparkles, Wand2 } from 'lucide-react';
import {
  ProjectFinancialMaster,
  SubsidyRequirements,
  SubsidyTrack,
} from '../../types';
import { evaluateRequirements, solveToTarget } from '../../utils/financialCalculations';
import { TermHelp } from '../TermHelp';

interface SolverPanelProps {
  projectId: string;
  financialMaster: ProjectFinancialMaster;
  appliedTrack: SubsidyTrack;
  requirements: SubsidyRequirements;
  isLocked: boolean;
  canEdit: boolean;
  onApplySolvedFM: (projectId: string, solvedFM: ProjectFinancialMaster) => void;
  onNotify: (msg: string) => void;
}

export const SolverPanel: React.FC<SolverPanelProps> = ({
  projectId,
  financialMaster,
  appliedTrack,
  requirements,
  isLocked,
  canEdit,
  onApplySolvedFM,
  onNotify,
}) => {
  const [proposal, setProposal] = useState<{
    solvedFM: ProjectFinancialMaster;
    adjustments: string[];
    achieved: boolean;
  } | null>(null);

  const disabled = isLocked || !canEdit;
  const currentEval = evaluateRequirements(financialMaster, appliedTrack, requirements);
  const solvedEval = proposal
    ? evaluateRequirements(proposal.solvedFM, appliedTrack, requirements)
    : null;

  const handleRunSolver = () => {
    const res = solveToTarget(financialMaster, appliedTrack, requirements, {
      keepBaseFYFixed: true,
    });
    setProposal(res);
    onNotify('公募要件達成に向けた逆算シミュレーション案を生成しました。');
  };

  const handleApplyProposal = () => {
    if (!proposal || disabled) return;
    onApplySolvedFM(projectId, proposal.solvedFM);
    setProposal(null);
    onNotify('逆算シミュレーション案を計画値に適用しました。');
  };

  return (
    <div
      data-guide-id="guide-fin-solver"
      className="bg-white border border-slate-200 p-4 space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-indigo-600" />
            <span>公募要件達成 逆算シミュレーション（自動ソルバー）</span>
            <TermHelp termKey="solver" />
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5">
            基準年度（baseFY）や過去実績は固定したまま、計画期間（P1〜P{financialMaster.planningYears}）の給与伸び率・販売数量・最低賃金を自動調整して全要件クリア案を算出します。
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={handleRunSolver}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>要件達成へ逆算シミュレーションを実行</span>
        </button>
      </div>

      {proposal && solvedEval && (
        <div className="bg-indigo-50/70 border border-indigo-200 p-3.5 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200 pb-2">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              逆算提案プレビュー（{proposal.achieved ? '全要件クリア達成' : '部分改善案'}）
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>
                付加価値CAGR: {currentEval.vaCAGR.toFixed(2)}%{' '}
                <ArrowRight className="inline w-3 h-3" />{' '}
                <strong className="text-emerald-800">{solvedEval.vaCAGR.toFixed(2)}%</strong>
              </span>
              <span>
                給与CAGR: {currentEval.wageCAGR.toFixed(2)}%{' '}
                <ArrowRight className="inline w-3 h-3" />{' '}
                <strong className="text-emerald-800">{solvedEval.wageCAGR.toFixed(2)}%</strong>
              </span>
            </div>
          </div>

          <ul className="space-y-1 text-[11px] text-slate-800 list-disc pl-4">
            {proposal.adjustments.map((adj, i) => (
              <li key={i}>{adj}</li>
            ))}
          </ul>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="px-3 py-1 bg-white border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
            >
              閉じる
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleApplyProposal}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              この逆算案をシミュレーションへ適用
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
