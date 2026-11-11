import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
  PieChart,
  Scale,
  Settings,
  Unlock,
} from 'lucide-react';
import {
  AnnualSalesEstimateMethod,
  DisplayCurrencyUnit,
  EmployeeCountMethod,
  PeriodKey,
  PlanningYearsOption,
  Project,
  Role,
  RoundingMode,
  SubsidyRequirements,
  SubsidyTrack,
  SubsidyTrackId,
  SubsidyVersionRound,
} from '../types';
import {
  evaluateRequirements,
  formatMoney,
  getUnitLabel,
  parseToYen,
} from '../utils/financialCalculations';

interface FinancialMasterEditorProps {
  project: Project;
  role: Role;
  activeCallRound: SubsidyVersionRound;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  onUpdateTrack: (projectId: string, trackId: SubsidyTrackId) => void;
  onUpdatePlanningYears: (projectId: string, years: PlanningYearsOption) => void;
  onUpdateEmployeeCountMethod: (projectId: string, method: EmployeeCountMethod) => void;
  onUpdateAnnualSalesEstimateMethod: (
    projectId: string,
    method: AnnualSalesEstimateMethod
  ) => void;
  onUpdateFiscalMonth: (projectId: string, month: number) => void;
  onOverrideFiscalYears: (
    projectId: string,
    currentFY?: number,
    baseFY?: number
  ) => void;
  onUpdatePeriodMonths: (
    projectId: string,
    periodKey: PeriodKey,
    months: number,
    note?: string
  ) => void;
  onUpdateBSItem: (
    projectId: string,
    periodKey: PeriodKey,
    path: (string | number)[],
    value: number
  ) => void;
  onUpdatePLItem: (
    projectId: string,
    periodKey: PeriodKey,
    segment: 'existingBusiness' | 'subsidyBusiness' | 'root',
    field: string,
    value: number
  ) => void;
  onUpdateInvestment: (projectId: string, updates: any) => void;
  onToggleWageSpecial: (projectId: string, isApplied: boolean) => void;
  onLockPlan: (projectId: string) => void;
  onUnlockPlan: (projectId: string) => void;
  onNotify: (msg: string) => void;
}

type MainTab = 'summary' | 'pl' | 'bs' | 'investment';

export const FinancialMasterEditor: React.FC<FinancialMasterEditorProps> = ({
  project,
  role,
  activeCallRound,
  displayCurrencyUnit,
  roundingMode,
  onUpdateTrack,
  onUpdatePlanningYears,
  onUpdateEmployeeCountMethod,
  onUpdateAnnualSalesEstimateMethod,
  onUpdateFiscalMonth,
  onOverrideFiscalYears,
  onUpdatePeriodMonths,
  onUpdateBSItem,
  onUpdatePLItem,
  onUpdateInvestment,
  onToggleWageSpecial,
  onLockPlan,
  onUnlockPlan,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('summary');
  const [plSegmentView, setPlSegmentView] = useState<'total' | 'split'>('split');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [tempCurrentFY, setTempCurrentFY] = useState(
    project.financialMaster.autoFiscalCalc.calculatedCurrentFY
  );
  const [tempBaseFY, setTempBaseFY] = useState(
    project.financialMaster.autoFiscalCalc.calculatedBaseFY
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tangible: true,
    intangible: false,
    investments: false,
    currentAssets: true,
    currentLiabilities: true,
    fixedLiabilities: true,
    equity: true,
  });

  const fm = project.financialMaster;
  const isLocked = fm.status === 'locked';
  const canEdit = role === '書類作成者' || role === 'システム管理者';

  // 適用トラックの取得
  const appliedTrack: SubsidyTrack = useMemo(() => {
    return (
      activeCallRound.tracks.find((t) => t.id === fm.appliedTrackId) ??
      activeCallRound.tracks[0]
    );
  }, [activeCallRound, fm.appliedTrackId]);

  // 要件判定
  const evalResult = useMemo(() => {
    return evaluateRequirements(fm, appliedTrack, activeCallRound.requirements);
  }, [fm, appliedTrack, activeCallRound.requirements]);

  // 表示する期間列の決定（3年・4年・5年でフィルタ）
  const visiblePeriods = useMemo(() => {
    const list: { key: PeriodKey; label: string; subLabel: string; isBase: boolean }[] = [
      { key: 'yMinus2', label: '2期前', subLabel: '実績 (Y-2)', isBase: false },
      { key: 'yMinus1', label: '1期前', subLabel: '実績 (Y-1)', isBase: false },
      { key: 'y0', label: '直近', subLabel: '直近実績 (Y0)', isBase: false },
      { key: 'currentFY', label: '申請時事業年度', subLabel: '進行期', isBase: false },
      { key: 'baseFY', label: '基準年度', subLabel: '事業完了期', isBase: true },
      { key: 'p1', label: '計画1年目', subLabel: '事業化1年目', isBase: false },
      { key: 'p2', label: '計画2年目', subLabel: '事業化2年目', isBase: false },
      { key: 'p3', label: '計画3年目', subLabel: '事業化3年目', isBase: false },
    ];
    if (fm.planningYears >= 4) {
      list.push({ key: 'p4', label: '計画4年目', subLabel: '事業化4年目', isBase: false });
    }
    if (fm.planningYears >= 5) {
      list.push({ key: 'p5', label: '計画5年目', subLabel: '事業化5年目', isBase: false });
    }
    return list;
  }, [fm.planningYears]);

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleCellChange = (
    valStr: string,
    onSave: (valInYen: number) => void
  ) => {
    if (isLocked || !canEdit) return;
    const yen = parseToYen(valStr, displayCurrencyUnit);
    onSave(yen);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar: Status, Lock, Version, Track, Planning Years */}
      <div className="bg-white border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                収支計画マスター（公式フォーマット準拠）
              </span>
              {isLocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  確定ロック中（Gate 2通過済）
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-medium">
                  <Unlock className="w-3.5 h-3.5" />
                  下書き編集中
                </span>
              )}
            </div>

            {/* 枠選択 */}
            <div className="flex items-center gap-1.5 ml-2">
              <label htmlFor="track-select" className="text-xs font-semibold text-slate-700">
                申請枠:
              </label>
              <select
                id="track-select"
                disabled={isLocked || !canEdit}
                value={fm.appliedTrackId}
                onChange={(e) =>
                  onUpdateTrack(project.id, e.target.value as SubsidyTrackId)
                }
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold px-2.5 py-1 focus:outline-none focus:border-slate-800 disabled:opacity-75"
              >
                {activeCallRound.tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 計画期間年数選択（3年 / 4年 / 5年） */}
            <div className="flex items-center gap-1.5 ml-2">
              <label htmlFor="plan-years-select" className="text-xs font-semibold text-slate-700">
                事業計画期間:
              </label>
              <select
                id="plan-years-select"
                disabled={isLocked || !canEdit}
                value={fm.planningYears}
                onChange={(e) =>
                  onUpdatePlanningYears(
                    project.id,
                    Number(e.target.value) as PlanningYearsOption
                  )
                }
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold px-2 py-1 focus:outline-none focus:border-slate-800 disabled:opacity-75"
              >
                <option value={3}>3年間（P1〜P3）</option>
                <option value={4}>4年間（P1〜P4）</option>
                <option value={5}>5年間（P1〜P5）</option>
              </select>
            </div>

            {/* 賃上げ特例スイッチ */}
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer ml-2">
              <input
                type="checkbox"
                disabled={isLocked || !canEdit}
                checked={fm.isWageSpecialApplied}
                onChange={(e) => onToggleWageSpecial(project.id, e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-0"
              />
              <span>賃上げ特例を適用（上限引上げ・給与CAGR+6.0%・最賃+50円）</span>
            </label>
          </div>

          {/* Action buttons: Lock / Unlock */}
          <div className="flex items-center gap-2">
            {isLocked ? (
              <button
                type="button"
                onClick={() => {
                  onUnlockPlan(project.id);
                  onNotify('収支計画のロックを解除しました。再編集可能です。');
                }}
                disabled={!canEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>ロック解除（再編集）</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onLockPlan(project.id);
                  onNotify('収支計画を確定ロックしました（Gate 2通過）。');
                }}
                disabled={!canEdit}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 transition-colors cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>収支計画を確定・ロック（Gate 2）</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. 基準年度自動算出の根拠表示バー */}
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-slate-800 leading-relaxed font-medium">
                {fm.autoFiscalCalc.explanationText}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span>
                  決算月:{' '}
                  <select
                    value={fm.fiscalMonth}
                    disabled={isLocked || !canEdit}
                    onChange={(e) => onUpdateFiscalMonth(project.id, Number(e.target.value))}
                    className="font-semibold text-slate-800 bg-white border border-slate-300 px-1 py-0.5"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {m}月決算
                      </option>
                    ))}
                  </select>
                </span>
                <span>
                  申請締切日: <strong className="text-slate-700">{appliedTrack.applicationDeadline}</strong>
                </span>
                <span>
                  採択予定日: <strong className="text-slate-700">{appliedTrack.adoptionDate}</strong>
                </span>
                <span>
                  枠実施期間: <strong className="text-slate-700">{appliedTrack.executionPeriodMonths}か月</strong>
                  {appliedTrack.executionPeriodMonthsTentative && (
                    <span className="ml-1 text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                      仮
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fm.autoFiscalCalc.isOverriddenBaseFY || fm.autoFiscalCalc.isOverriddenCurrentFY ? (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 border border-amber-200 text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                手動上書き中
              </span>
            ) : null}
            <button
              type="button"
              disabled={isLocked || !canEdit}
              onClick={() => {
                setTempCurrentFY(fm.autoFiscalCalc.calculatedCurrentFY);
                setTempBaseFY(fm.autoFiscalCalc.calculatedBaseFY);
                setShowOverrideModal(true);
              }}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              基準年度の手動変更...
            </button>
          </div>
        </div>

        {/* 3. 従業員数カウント方式 & 1年当たり売上見込額（不一致バッジ含む） */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100 pt-2.5">
          <div className="flex flex-wrap items-center gap-4">
            {/* 従業員数カウント方式 */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">従業員数の数え方:</span>
              <div className="inline-flex bg-slate-100 p-0.5 border border-slate-300">
                <button
                  type="button"
                  disabled={isLocked || !canEdit}
                  onClick={() => onUpdateEmployeeCountMethod(project.id, 'periodEnd')}
                  className={`px-2 py-0.5 text-xs font-medium cursor-pointer ${
                    fm.employeeCountMethod === 'periodEnd'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  (A) 期末人数方式
                </button>
                <button
                  type="button"
                  disabled={isLocked || !canEdit}
                  onClick={() => onUpdateEmployeeCountMethod(project.id, 'koboOfficial')}
                  className={`px-2 py-0.5 text-xs font-medium cursor-pointer ${
                    fm.employeeCountMethod === 'koboOfficial'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  (B) 公募要領方式
                </button>
              </div>
              <span className="text-[11px] text-slate-500">
                {fm.employeeCountMethod === 'periodEnd'
                  ? '※期末時点の在籍人数（パートは換算小数可・帳票注記）'
                  : '※当該年度に全月分の給与を受けた従業員のみ（公募要領準拠・帳票注記）'}
              </span>
            </div>

            {/* 1年当たり売上見込額の算出方法 */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">新製品等1年当たり売上見込額:</span>
              <select
                disabled={isLocked || !canEdit}
                value={fm.annualSalesEstimate.method}
                onChange={(e) =>
                  onUpdateAnnualSalesEstimateMethod(
                    project.id,
                    e.target.value as AnnualSalesEstimateMethod
                  )
                }
                className="bg-white border border-slate-300 text-xs font-medium px-2 py-0.5"
              >
                <option value="planAverage">補助事業売上の計画期間平均（仮）</option>
                <option value="finalYear">計画最終年度の補助事業売上</option>
                <option value="manual">手入力指定</option>
              </select>
              <span className="text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                仮
              </span>
              <span className="font-mono font-bold text-slate-900">
                {formatMoney(
                  fm.annualSalesEstimate.calculatedValueYen,
                  displayCurrencyUnit,
                  roundingMode
                )}
              </span>
            </div>
          </div>

          {/* 公式インポート 596M vs v36 630M 不一致バッジ */}
          {fm.annualSalesEstimate.hasMismatch && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] text-rose-800">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>
                <strong>不一致・要確認:</strong> インポート用フォーマット:{' '}
                <span className="font-mono font-bold">596,000,000円</span> vs v36収益計画:{' '}
                <span className="font-mono font-bold">630,000,000円</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Navigation Tabs (要件判定サマリー / 損益計算書PL / 貸借対照表BS / 投資計画) */}
      <div className="flex items-center gap-2 border-b border-slate-300 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'summary'
              ? 'border-blue-600 text-blue-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>公募要件・規模上限判定サマリー</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pl')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'pl'
              ? 'border-blue-600 text-blue-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>損益計算書（既存事業／補助事業分割・全社計）</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bs')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'bs'
              ? 'border-blue-600 text-blue-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>貸借対照表（公式インポートフォーマット準拠）</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('investment')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'investment'
              ? 'border-blue-600 text-blue-800 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>設備投資計画・資金調達内訳</span>
        </button>
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: 要件判定サマリー */}
      {activeTab === 'summary' && (
        <div className="space-y-5">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* 1. 付加価値額CAGR */}
            <div className="bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="font-semibold">付加価値額 CAGR</span>
                {evalResult.isVAPassed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                    <CheckCircle2 className="w-3 h-3" /> 要件クリア
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5">
                    <AlertCircle className="w-3 h-3" /> 未達
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {evalResult.vaCAGR.toFixed(2)}%
                </span>
                <span className="text-xs text-slate-500">
                  / 要件: {activeCallRound.requirements.valueAddedCAGR}%以上
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 pt-1.5">
                <span>ほどよく範囲 (4.0〜5.0%):</span>
                {evalResult.isVAModerate ? (
                  <span className="text-emerald-700 font-semibold">範囲内（安全）</span>
                ) : (
                  <span className="text-amber-700 font-semibold">範囲外（要調整）</span>
                )}
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                基準: {formatMoney(evalResult.baseValueAdded, displayCurrencyUnit, roundingMode)} → 目標:{' '}
                {formatMoney(evalResult.targetValueAdded, displayCurrencyUnit, roundingMode)}
              </div>
            </div>

            {/* 2. 一人当たり給与CAGR */}
            <div className="bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="font-semibold">一人当たり給与 CAGR</span>
                {evalResult.isWagePassed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                    <CheckCircle2 className="w-3 h-3" /> 要件クリア
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5">
                    <AlertCircle className="w-3 h-3" /> 未達
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {evalResult.wageCAGR.toFixed(2)}%
                </span>
                <span className="text-xs text-slate-500">
                  / 要件:{' '}
                  {fm.isWageSpecialApplied
                    ? activeCallRound.requirements.wageSpecialCAGR
                    : activeCallRound.requirements.wageCAGR}
                  %以上
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 pt-1.5">
                <span>
                  ほどよく範囲 ({fm.isWageSpecialApplied ? '6.0〜7.0%' : '3.5〜4.5%'}):
                </span>
                {evalResult.isWageModerate ? (
                  <span className="text-emerald-700 font-semibold">範囲内（安全）</span>
                ) : (
                  <span className="text-amber-700 font-semibold">範囲外（要調整）</span>
                )}
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                基準: {formatMoney(evalResult.basePerCapitaWage, 'yen', roundingMode)} → 目標:{' '}
                {formatMoney(evalResult.targetPerCapitaWage, 'yen', roundingMode)}
              </div>
            </div>

            {/* 3. 事業場内最低賃金 */}
            <div className="bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="font-semibold">事業場内 最低賃金</span>
                {evalResult.isMinWagePassed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                    <CheckCircle2 className="w-3 h-3" /> 要件クリア
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5">
                    <AlertCircle className="w-3 h-3" /> 未達
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {evalResult.workplaceMinWage.toLocaleString()}円
                </span>
                <span className="text-xs text-slate-500">
                  (+{evalResult.minWageDiff}円)
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 pt-1.5">
                <span>地域別最賃:</span>
                <span className="font-mono">{evalResult.regionalMinWage.toLocaleString()}円</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                要件: 地域別 +
                {fm.isWageSpecialApplied
                  ? activeCallRound.requirements.wageSpecialMinWageDiffYen
                  : activeCallRound.requirements.minWageDiffYen}
                円以上
              </div>
            </div>

            {/* 4. 足下の賃上げ（物価上昇率との対比） */}
            <div className="bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="font-semibold">足下の賃上げ（物価対比）</span>
                {evalResult.isNearTermWagePassed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                    <CheckCircle2 className="w-3 h-3" /> 達成
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5">
                    <AlertCircle className="w-3 h-3" /> 未達
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {evalResult.nearTermWageGrowthRate.toFixed(2)}%
                </span>
                <span className="text-xs text-slate-500">
                  / 物価: {evalResult.inflationRate.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 pt-1.5">
                <span>物価上昇率（仮値）:</span>
                <span className="font-bold text-slate-800">2.0%</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                直近({formatMoney(evalResult.y0PerCapitaWage, 'yen', roundingMode)}) → 基準年度(
                {formatMoney(evalResult.baseFYPerCapitaWage, 'yen', roundingMode)})
              </div>
            </div>
          </div>

          {/* 規模区分別上限・下限・申請額チェック表 */}
          <div className="bg-white border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                【{appliedTrack.name}】従業員規模別 補助金交付限度額判定
              </h3>
              <span className="text-xs text-slate-500">
                基準年度従業員数: <strong>{fm.periods.baseFY.pl.numberOfEmployees}名</strong>（
                {evalResult.applicableCapTier?.label || '判定中'}）
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-y border-slate-200">
                    <th className="py-2.5 px-3">従業員規模</th>
                    <th className="py-2.5 px-3">通常補助上限額</th>
                    <th className="py-2.5 px-3">賃上げ特例時上限額</th>
                    <th className="py-2.5 px-3">補助率</th>
                    <th className="py-2.5 px-3">貴社適用上限額</th>
                    <th className="py-2.5 px-3">総投資額</th>
                    <th className="py-2.5 px-3">補助金交付申請額</th>
                    <th className="py-2.5 px-3">判定結果</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {appliedTrack.capTiers.map((tier) => {
                    const isCurrentTier = evalResult.applicableCapTier?.id === tier.id;
                    return (
                      <tr
                        key={tier.id}
                        className={isCurrentTier ? 'bg-blue-50/70 font-semibold text-slate-900' : 'text-slate-600'}
                      >
                        <td className="py-2.5 px-3 flex items-center gap-1.5">
                          {isCurrentTier && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <span>{tier.label}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {formatMoney(tier.standardCapYen, displayCurrencyUnit, roundingMode)}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {formatMoney(tier.wageSpecialCapYen, displayCurrencyUnit, roundingMode)}
                        </td>
                        <td className="py-2.5 px-3">
                          {appliedTrack.subsidyRateNumerator}/{appliedTrack.subsidyRateDenominator}
                          {fm.isWageSpecialApplied && appliedTrack.wageSpecialRateNumerator ? (
                            <span className="text-blue-700 ml-1 font-bold">
                              （特例 {appliedTrack.wageSpecialRateNumerator}/
                              {appliedTrack.wageSpecialRateDenominator}）
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {isCurrentTier
                            ? formatMoney(evalResult.effectiveCapYen, displayCurrencyUnit, roundingMode)
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {isCurrentTier
                            ? formatMoney(evalResult.totalInvestmentYen, displayCurrencyUnit, roundingMode)
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-800">
                          {isCurrentTier
                            ? formatMoney(evalResult.subsidyRequestedYen, displayCurrencyUnit, roundingMode)
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          {isCurrentTier ? (
                            evalResult.isSubsidyWithinCap && evalResult.isMinSubsidyPassed ? (
                              <span className="text-emerald-700 font-bold">上限内・下限クリア</span>
                            ) : !evalResult.isMinSubsidyPassed ? (
                              <span className="text-rose-700 font-bold">下限（750万円）未達</span>
                            ) : (
                              <span className="text-rose-700 font-bold">上限超過</span>
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 損益計算書 (PL) */}
      {activeTab === 'pl' && (
        <div className="bg-white border border-slate-200 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-800">損益計算書 表示切替:</span>
              <div className="inline-flex bg-slate-100 p-0.5 border border-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setPlSegmentView('split')}
                  className={`px-3 py-1 font-medium cursor-pointer ${
                    plSegmentView === 'split' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  既存事業／補助事業 分割明細
                </button>
                <button
                  type="button"
                  onClick={() => setPlSegmentView('total')}
                  className={`px-3 py-1 font-medium cursor-pointer ${
                    plSegmentView === 'total' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  全社合算計のみ
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              ※金額単位: <strong className="text-slate-800">{getUnitLabel(displayCurrencyUnit)}</strong>（
              {roundingMode === 'floor' ? '切り捨て' : '四捨五入'}）
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-800 text-white divide-x divide-slate-700">
                  <th className="py-2.5 px-3 min-w-[220px]">勘定科目 / 期</th>
                  {visiblePeriods.map((p) => {
                    const info = fm.periods[p.key]?.fiscalInfo;
                    return (
                      <th
                        key={p.key}
                        className={`py-2 px-3 text-right min-w-[125px] ${
                          p.isBase ? 'bg-blue-900 text-blue-100' : ''
                        }`}
                      >
                        <div className="font-bold">{p.label}</div>
                        <div className="text-[10px] opacity-80">{p.subLabel}</div>
                        {info?.isIrregular && (
                          <div className="text-[10px] text-amber-300 font-bold">
                            変則（{info.periodMonths}か月）
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* 1. 売上高 */}
                <tr className="bg-slate-100/70 font-bold text-slate-900">
                  <td className="py-2 px-3">■ 売上高（全社計）</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2 px-3 text-right font-mono">
                      {formatMoney(fm.periods[p.key]?.pl.totalSales, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>
                {plSegmentView === 'split' && (
                  <>
                    <tr className="text-slate-600 text-[11px]">
                      <td className="py-1.5 px-5 pl-6">└ 既存事業 売上高</td>
                      {visiblePeriods.map((p) => (
                        <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                          <input
                            type="text"
                            disabled={isLocked || !canEdit}
                            defaultValue={formatMoney(
                              fm.periods[p.key]?.pl.existingBusiness.sales,
                              displayCurrencyUnit,
                              roundingMode,
                              false
                            )}
                            onBlur={(e) =>
                              handleCellChange(e.target.value, (yen) =>
                                onUpdatePLItem(project.id, p.key, 'existingBusiness', 'sales', yen)
                              )
                            }
                            className="w-full text-right bg-white border border-slate-200 px-1 py-0.5 focus:border-blue-600"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="text-blue-700 bg-blue-50/40 text-[11px] font-semibold">
                      <td className="py-1.5 px-5 pl-6">└ 補助事業 売上高（新製品・新事業）</td>
                      {visiblePeriods.map((p) => (
                        <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                          <input
                            type="text"
                            disabled={isLocked || !canEdit}
                            defaultValue={formatMoney(
                              fm.periods[p.key]?.pl.subsidyBusiness.sales,
                              displayCurrencyUnit,
                              roundingMode,
                              false
                            )}
                            onBlur={(e) =>
                              handleCellChange(e.target.value, (yen) =>
                                onUpdatePLItem(project.id, p.key, 'subsidyBusiness', 'sales', yen)
                              )
                            }
                            className="w-full text-right bg-white border border-blue-200 px-1 py-0.5 focus:border-blue-600 text-blue-900"
                          />
                        </td>
                      ))}
                    </tr>
                  </>
                )}

                {/* 2. 売上原価 */}
                <tr className="bg-slate-100/70 font-bold text-slate-900">
                  <td className="py-2 px-3">■ 売上原価（全社計）</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2 px-3 text-right font-mono">
                      {formatMoney(fm.periods[p.key]?.pl.totalCostOfSales, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>
                {plSegmentView === 'split' && (
                  <>
                    <tr className="text-slate-600 text-[11px]">
                      <td className="py-1.5 px-5 pl-6">└ 既存事業 売上原価</td>
                      {visiblePeriods.map((p) => (
                        <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                          <input
                            type="text"
                            disabled={isLocked || !canEdit}
                            defaultValue={formatMoney(
                              fm.periods[p.key]?.pl.existingBusiness.costOfSales,
                              displayCurrencyUnit,
                              roundingMode,
                              false
                            )}
                            onBlur={(e) =>
                              handleCellChange(e.target.value, (yen) =>
                                onUpdatePLItem(project.id, p.key, 'existingBusiness', 'costOfSales', yen)
                              )
                            }
                            className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="text-slate-600 text-[11px]">
                      <td className="py-1.5 px-5 pl-6">└ 補助事業 売上原価</td>
                      {visiblePeriods.map((p) => (
                        <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                          <input
                            type="text"
                            disabled={isLocked || !canEdit}
                            defaultValue={formatMoney(
                              fm.periods[p.key]?.pl.subsidyBusiness.costOfSales,
                              displayCurrencyUnit,
                              roundingMode,
                              false
                            )}
                            onBlur={(e) =>
                              handleCellChange(e.target.value, (yen) =>
                                onUpdatePLItem(project.id, p.key, 'subsidyBusiness', 'costOfSales', yen)
                              )
                            }
                            className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                          />
                        </td>
                      ))}
                    </tr>
                  </>
                )}

                {/* 3. 売上総利益 */}
                <tr className="bg-slate-50 font-semibold text-slate-800">
                  <td className="py-2 px-3">■ 売上総利益（粗利）</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2 px-3 text-right font-mono">
                      {formatMoney(fm.periods[p.key]?.pl.totalGrossProfit, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>

                {/* 4. 販管費 */}
                <tr className="bg-slate-100/70 font-bold text-slate-900">
                  <td className="py-2 px-3">■ 販売費及び一般管理費（全社計）</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2 px-3 text-right font-mono">
                      {formatMoney(fm.periods[p.key]?.pl.totalSga, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>

                {/* 5. 営業利益 */}
                <tr className="bg-blue-50/60 font-bold text-blue-900 border-y border-blue-200">
                  <td className="py-2.5 px-3">★ 営業利益</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2.5 px-3 text-right font-mono text-sm">
                      {formatMoney(fm.periods[p.key]?.pl.totalOperatingProfit, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>

                {/* 6. 人件費・減価償却費・付加価値額 */}
                <tr className="text-slate-700">
                  <td className="py-1.5 px-3 font-semibold">人件費（労務費・役員報酬等含）</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                      <input
                        type="text"
                        disabled={isLocked || !canEdit}
                        defaultValue={formatMoney(
                          fm.periods[p.key]?.pl.laborCost,
                          displayCurrencyUnit,
                          roundingMode,
                          false
                        )}
                        onBlur={(e) =>
                          handleCellChange(e.target.value, (yen) =>
                            onUpdatePLItem(project.id, p.key, 'root', 'laborCost', yen)
                          )
                        }
                        className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="text-slate-700">
                  <td className="py-1.5 px-3 font-semibold">減価償却費</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                      <input
                        type="text"
                        disabled={isLocked || !canEdit}
                        defaultValue={formatMoney(
                          fm.periods[p.key]?.pl.depreciation,
                          displayCurrencyUnit,
                          roundingMode,
                          false
                        )}
                        onBlur={(e) =>
                          handleCellChange(e.target.value, (yen) =>
                            onUpdatePLItem(project.id, p.key, 'root', 'depreciation', yen)
                          )
                        }
                        className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                      />
                    </td>
                  ))}
                </tr>

                {/* 付加価値額 */}
                <tr className="bg-emerald-50/70 font-bold text-emerald-950 border-y-2 border-emerald-300">
                  <td className="py-2.5 px-3">
                    ★ 付加価値額（営業利益 ＋ 人件費 ＋ 減価償却費）
                  </td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2.5 px-3 text-right font-mono text-sm">
                      {formatMoney(fm.periods[p.key]?.pl.valueAdded, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>

                {/* 従業員数・給与・最低賃金 */}
                <tr className="text-slate-700 bg-slate-50/50">
                  <td className="py-1.5 px-3 font-semibold">
                    従業員数（{fm.employeeCountMethod === 'periodEnd' ? '期末人数' : '公募要領'}）
                  </td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                      <input
                        type="number"
                        disabled={isLocked || !canEdit}
                        defaultValue={fm.periods[p.key]?.pl.numberOfEmployees}
                        onBlur={(e) =>
                          onUpdatePLItem(
                            project.id,
                            p.key,
                            'root',
                            'numberOfEmployees',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-16 text-right bg-white border border-slate-200 px-1 py-0.5"
                      />
                      <span className="ml-1 text-[10px] text-slate-500">名</span>
                    </td>
                  ))}
                </tr>

                <tr className="text-slate-700">
                  <td className="py-1.5 px-3 font-semibold">給与支給総額</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                      <input
                        type="text"
                        disabled={isLocked || !canEdit}
                        defaultValue={formatMoney(
                          fm.periods[p.key]?.pl.totalWages,
                          displayCurrencyUnit,
                          roundingMode,
                          false
                        )}
                        onBlur={(e) =>
                          handleCellChange(e.target.value, (yen) =>
                            onUpdatePLItem(project.id, p.key, 'root', 'totalWages', yen)
                          )
                        }
                        className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                      />
                    </td>
                  ))}
                </tr>

                <tr className="text-slate-800 font-semibold bg-slate-100/50">
                  <td className="py-1.5 px-3">一人当たり給与支給総額（給与総額÷人数）</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                      {formatMoney(fm.periods[p.key]?.pl.perCapitaWage, 'yen', roundingMode)}
                    </td>
                  ))}
                </tr>

                <tr className="text-slate-700">
                  <td className="py-1.5 px-3">事業場内 最低賃金</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                      <input
                        type="number"
                        disabled={isLocked || !canEdit}
                        defaultValue={fm.periods[p.key]?.pl.workplaceMinWage}
                        onBlur={(e) =>
                          onUpdatePLItem(
                            project.id,
                            p.key,
                            'root',
                            'workplaceMinWage',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-20 text-right bg-white border border-slate-200 px-1 py-0.5"
                      />
                      <span className="ml-0.5 text-[10px] text-slate-500">円</span>
                    </td>
                  ))}
                </tr>

                <tr className="text-slate-700">
                  <td className="py-1.5 px-3">地域別 最低賃金（手入力）</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-1.5 px-3 text-right font-mono">
                      <input
                        type="number"
                        disabled={isLocked || !canEdit}
                        defaultValue={fm.periods[p.key]?.pl.regionalMinWage}
                        onBlur={(e) =>
                          onUpdatePLItem(
                            project.id,
                            p.key,
                            'root',
                            'regionalMinWage',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-20 text-right bg-white border border-slate-200 px-1 py-0.5"
                      />
                      <span className="ml-0.5 text-[10px] text-slate-500">円</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 貸借対照表 (BS) */}
      {activeTab === 'bs' && (
        <div className="bg-white border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              貸借対照表（公式インポート用フォーマット行ラベル準拠）
            </span>
            <div className="text-slate-500">
              金額単位: <strong className="text-slate-800">{getUnitLabel(displayCurrencyUnit)}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-800 text-white divide-x divide-slate-700">
                  <th className="py-2.5 px-3 min-w-[240px]">BS科目 / 期</th>
                  {visiblePeriods.map((p) => (
                    <th
                      key={p.key}
                      className={`py-2 px-3 text-right min-w-[120px] ${
                        p.isBase ? 'bg-blue-900 text-blue-100' : ''
                      }`}
                    >
                      <div>{p.label}</div>
                      <div className="text-[10px] opacity-80">{p.subLabel}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* 流動資産合計 */}
                <tr className="bg-slate-100 font-bold text-slate-900 cursor-pointer" onClick={() => toggleSection('currentAssets')}>
                  <td className="py-2 px-3 flex items-center gap-1">
                    {expandedSections.currentAssets ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    【流動資産合計】
                  </td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2 px-3 text-right font-mono">
                      {formatMoney(fm.periods[p.key]?.bs.currentAssets.totalCurrentAssets, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>
                {expandedSections.currentAssets && (
                  <>
                    <tr className="text-[11px] text-slate-600">
                      <td className="py-1 px-5 pl-6">現金及び預金</td>
                      {visiblePeriods.map((p) => (
                        <td key={p.key} className="py-1 px-3 text-right font-mono">
                          <input
                            type="text"
                            disabled={isLocked || !canEdit}
                            defaultValue={formatMoney(
                              fm.periods[p.key]?.bs.currentAssets.cashAndDeposits,
                              displayCurrencyUnit,
                              roundingMode,
                              false
                            )}
                            onBlur={(e) =>
                              handleCellChange(e.target.value, (yen) =>
                                onUpdateBSItem(project.id, p.key, ['currentAssets', 'cashAndDeposits'], yen)
                              )
                            }
                            className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="text-[11px] text-slate-600">
                      <td className="py-1 px-5 pl-6">売掛金</td>
                      {visiblePeriods.map((p) => (
                        <td key={p.key} className="py-1 px-3 text-right font-mono">
                          <input
                            type="text"
                            disabled={isLocked || !canEdit}
                            defaultValue={formatMoney(
                              fm.periods[p.key]?.bs.currentAssets.accountsReceivable,
                              displayCurrencyUnit,
                              roundingMode,
                              false
                            )}
                            onBlur={(e) =>
                              handleCellChange(e.target.value, (yen) =>
                                onUpdateBSItem(project.id, p.key, ['currentAssets', 'accountsReceivable'], yen)
                              )
                            }
                            className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="text-[11px] text-slate-600">
                      <td className="py-1 px-5 pl-6">棚卸資産</td>
                      {visiblePeriods.map((p) => (
                        <td key={p.key} className="py-1 px-3 text-right font-mono">
                          <input
                            type="text"
                            disabled={isLocked || !canEdit}
                            defaultValue={formatMoney(
                              fm.periods[p.key]?.bs.currentAssets.inventories,
                              displayCurrencyUnit,
                              roundingMode,
                              false
                            )}
                            onBlur={(e) =>
                              handleCellChange(e.target.value, (yen) =>
                                onUpdateBSItem(project.id, p.key, ['currentAssets', 'inventories'], yen)
                              )
                            }
                            className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                          />
                        </td>
                      ))}
                    </tr>
                  </>
                )}

                {/* 固定資産合計 */}
                <tr className="bg-slate-100 font-bold text-slate-900 cursor-pointer" onClick={() => toggleSection('tangible')}>
                  <td className="py-2 px-3 flex items-center gap-1">
                    {expandedSections.tangible ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    【固定資産合計】
                  </td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2 px-3 text-right font-mono">
                      {formatMoney(fm.periods[p.key]?.bs.fixedAssets.totalFixedAssets, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>
                {expandedSections.tangible && (
                  <>
                    <tr className="text-[11px] text-slate-600">
                      <td className="py-1 px-5 pl-6">機械及び装置</td>
                      {visiblePeriods.map((p) => (
                        <td key={p.key} className="py-1 px-3 text-right font-mono">
                          <input
                            type="text"
                            disabled={isLocked || !canEdit}
                            defaultValue={formatMoney(
                              fm.periods[p.key]?.bs.fixedAssets.tangibleFixedAssets.machineryAndEquipment,
                              displayCurrencyUnit,
                              roundingMode,
                              false
                            )}
                            onBlur={(e) =>
                              handleCellChange(e.target.value, (yen) =>
                                onUpdateBSItem(
                                  project.id,
                                  p.key,
                                  ['fixedAssets', 'tangibleFixedAssets', 'machineryAndEquipment'],
                                  yen
                                )
                              )
                            }
                            className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="text-[11px] text-slate-600">
                      <td className="py-1 px-5 pl-6">ソフトウェア（無形固定資産）</td>
                      {visiblePeriods.map((p) => (
                        <td key={p.key} className="py-1 px-3 text-right font-mono">
                          <input
                            type="text"
                            disabled={isLocked || !canEdit}
                            defaultValue={formatMoney(
                              fm.periods[p.key]?.bs.fixedAssets.intangibleFixedAssets.software,
                              displayCurrencyUnit,
                              roundingMode,
                              false
                            )}
                            onBlur={(e) =>
                              handleCellChange(e.target.value, (yen) =>
                                onUpdateBSItem(
                                  project.id,
                                  p.key,
                                  ['fixedAssets', 'intangibleFixedAssets', 'software'],
                                  yen
                                )
                              )
                            }
                            className="w-full text-right bg-white border border-slate-200 px-1 py-0.5"
                          />
                        </td>
                      ))}
                    </tr>
                  </>
                )}

                {/* 資産合計 */}
                <tr className="bg-blue-50 font-bold text-blue-950 border-y-2 border-blue-300">
                  <td className="py-2.5 px-3">★ 資産合計</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2.5 px-3 text-right font-mono text-sm">
                      {formatMoney(fm.periods[p.key]?.bs.totalAssets, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>

                {/* 負債合計 */}
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td className="py-2 px-3">【負債合計】</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2 px-3 text-right font-mono">
                      {formatMoney(fm.periods[p.key]?.bs.totalLiabilities, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>

                {/* 純資産合計 */}
                <tr className="bg-slate-100 font-bold text-slate-900">
                  <td className="py-2 px-3">【純資産合計】</td>
                  {visiblePeriods.map((p) => (
                    <td key={p.key} className="py-2 px-3 text-right font-mono">
                      {formatMoney(fm.periods[p.key]?.bs.totalNetAssets, displayCurrencyUnit, roundingMode, false)}
                    </td>
                  ))}
                </tr>

                {/* 負債・純資産合計 */}
                <tr className="bg-blue-50 font-bold text-blue-950 border-y-2 border-blue-300">
                  <td className="py-2.5 px-3">★ 負債・純資産合計</td>
                  {visiblePeriods.map((p) => {
                    const bs = fm.periods[p.key]?.bs;
                    const isBalanced = bs && bs.totalAssets === bs.totalLiabilitiesAndNetAssets;
                    return (
                      <td key={p.key} className="py-2.5 px-3 text-right font-mono text-sm">
                        {formatMoney(bs?.totalLiabilitiesAndNetAssets, displayCurrencyUnit, roundingMode, false)}
                        {!isBalanced && (
                          <div className="text-[10px] text-rose-600 font-bold">貸借不一致</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 設備投資計画 */}
      {activeTab === 'investment' && (
        <div className="bg-white border border-slate-200 p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              設備投資計画・資金調達内訳（円単位保持）
            </h3>
            <span className="text-xs text-slate-500">
              表示単位: <strong className="text-slate-800">{getUnitLabel(displayCurrencyUnit)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 投資内訳 */}
            <div className="border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                1. 投資経費内訳
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label htmlFor="machinery-inv" className="font-medium text-slate-700">新規設備投資（機械装置等）:</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="machinery-inv"
                      type="text"
                      disabled={isLocked || !canEdit}
                      defaultValue={formatMoney(
                        fm.investment.newMachineryInvestment,
                        displayCurrencyUnit,
                        roundingMode,
                        false
                      )}
                      onBlur={(e) =>
                        handleCellChange(e.target.value, (yen) =>
                          onUpdateInvestment(project.id, { newMachineryInvestment: yen })
                        )
                      }
                      className="w-32 text-right bg-white border border-slate-300 px-2 py-1 font-mono"
                    />
                    <span className="text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="intangible-inv" className="font-medium text-slate-700">無形資産投資（ソフトウェア・システム等）:</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="intangible-inv"
                      type="text"
                      disabled={isLocked || !canEdit}
                      defaultValue={formatMoney(
                        fm.investment.intangibleAssetInvestment,
                        displayCurrencyUnit,
                        roundingMode,
                        false
                      )}
                      onBlur={(e) =>
                        handleCellChange(e.target.value, (yen) =>
                          onUpdateInvestment(project.id, { intangibleAssetInvestment: yen })
                        )
                      }
                      className="w-32 text-right bg-white border border-slate-300 px-2 py-1 font-mono"
                    />
                    <span className="text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="rd-cost" className="font-medium text-slate-700">研究開発費（読み取れず0・要確認）:</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="rd-cost"
                      type="text"
                      disabled={isLocked || !canEdit}
                      defaultValue={formatMoney(fm.investment.rdCost, displayCurrencyUnit, roundingMode, false)}
                      onBlur={(e) =>
                        handleCellChange(e.target.value, (yen) =>
                          onUpdateInvestment(project.id, { rdCost: yen })
                        )
                      }
                      className="w-32 text-right bg-white border border-slate-300 px-2 py-1 font-mono"
                    />
                    <span className="text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                      要確認
                    </span>
                    <span className="text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="hr-dev-cost" className="font-medium text-slate-700">能力開発費（読み取れず0・要確認）:</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="hr-dev-cost"
                      type="text"
                      disabled={isLocked || !canEdit}
                      defaultValue={formatMoney(
                        fm.investment.humanResourceDevelopmentCost,
                        displayCurrencyUnit,
                        roundingMode,
                        false
                      )}
                      onBlur={(e) =>
                        handleCellChange(e.target.value, (yen) =>
                          onUpdateInvestment(project.id, { humanResourceDevelopmentCost: yen })
                        )
                      }
                      className="w-32 text-right bg-white border border-slate-300 px-2 py-1 font-mono"
                    />
                    <span className="text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                      要確認
                    </span>
                    <span className="text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                  <span>総投資額合計:</span>
                  <span className="font-mono text-sm text-blue-900">
                    {formatMoney(fm.investment.totalInvestmentYen, displayCurrencyUnit, roundingMode)}
                  </span>
                </div>
              </div>
            </div>

            {/* 資金調達内訳 */}
            <div className="border border-slate-200 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                2. 資金調達内訳
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label htmlFor="subsidy-requested" className="font-medium text-slate-700">補助金交付申請額:</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="subsidy-requested"
                      type="text"
                      disabled={isLocked || !canEdit}
                      defaultValue={formatMoney(
                        fm.investment.subsidyRequestedYen,
                        displayCurrencyUnit,
                        roundingMode,
                        false
                      )}
                      onBlur={(e) =>
                        handleCellChange(e.target.value, (yen) =>
                          onUpdateInvestment(project.id, { subsidyRequestedYen: yen })
                        )
                      }
                      className="w-32 text-right bg-white border border-slate-300 px-2 py-1 font-mono font-bold text-blue-800"
                    />
                    <span className="text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="own-funds" className="font-medium text-slate-700">自己資金:</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="own-funds"
                      type="text"
                      disabled={isLocked || !canEdit}
                      defaultValue={formatMoney(fm.investment.ownFundsYen, displayCurrencyUnit, roundingMode, false)}
                      onBlur={(e) =>
                        handleCellChange(e.target.value, (yen) =>
                          onUpdateInvestment(project.id, { ownFundsYen: yen })
                        )
                      }
                      className="w-32 text-right bg-white border border-slate-300 px-2 py-1 font-mono"
                    />
                    <span className="text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="bank-loans" className="font-medium text-slate-700">金融機関借入金:</label>
                  <div className="flex items-center gap-1">
                    <input
                      id="bank-loans"
                      type="text"
                      disabled={isLocked || !canEdit}
                      defaultValue={formatMoney(fm.investment.bankLoansYen, displayCurrencyUnit, roundingMode, false)}
                      onBlur={(e) =>
                        handleCellChange(e.target.value, (yen) =>
                          onUpdateInvestment(project.id, { bankLoansYen: yen })
                        )
                      }
                      className="w-32 text-right bg-white border border-slate-300 px-2 py-1 font-mono"
                    />
                    <span className="text-slate-500">{getUnitLabel(displayCurrencyUnit)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                  <span>調達合計:</span>
                  <span className="font-mono text-sm text-slate-900">
                    {formatMoney(
                      fm.investment.subsidyRequestedYen +
                        fm.investment.ownFundsYen +
                        fm.investment.bankLoansYen,
                      displayCurrencyUnit,
                      roundingMode
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 手動上書きモーダル */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-300 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              基準年度・申請時事業年度の手動上書き
            </h3>
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 border border-amber-200">
              ※通常は申請締切日・実施期間・決算月から自動算出されます。手動上書きを行うと画面に警告バッジが表示されます。
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  申請時事業年度（西暦年・○月期）:
                </label>
                <input
                  type="number"
                  value={tempCurrentFY}
                  onChange={(e) => setTempCurrentFY(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 px-2 py-1"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  基準年度（補助事業完了予定年度・西暦年）:
                </label>
                <input
                  type="number"
                  value={tempBaseFY}
                  onChange={(e) => setTempBaseFY(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 px-2 py-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  onOverrideFiscalYears(project.id, tempCurrentFY, tempBaseFY);
                  setShowOverrideModal(false);
                  onNotify('基準年度の手動上書き設定を保存しました。');
                }}
                className="px-3 py-1.5 text-xs text-white bg-blue-700 font-semibold"
              >
                上書き保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
