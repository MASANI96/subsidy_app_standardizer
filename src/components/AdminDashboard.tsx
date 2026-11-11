import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Layers,
  ListFilter,
  Plus,
  Settings,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  AdminTabId,
  AnnualSalesEstimateMethod,
  DisplayCurrencyUnit,
  EmployeeCountMethod,
  InitialProjectDefaults,
  PlanningYearsOption,
  Role,
  RoundingMode,
  SubsidyRequirements,
  SubsidyTrack,
  SubsidyTrackId,
  SubsidyVersionRound,
  TentativeItem,
} from '../types';
import { formatMoney, getUnitLabel } from '../utils/financialCalculations';
import { readJsonFromFile } from '../utils/storageService';

interface AdminDashboardProps {
  role: Role;
  callRounds: SubsidyVersionRound[];
  activeVersionId: string;
  initialDefaults: InitialProjectDefaults;
  tentativeItems: TentativeItem[];
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  onSetActiveVersion: (roundId: string) => void;
  onDuplicateVersion: (sourceRoundId: string, newVersionCode: string) => void;
  onUpdateCallRound: (roundId: string, updates: Partial<SubsidyVersionRound>) => void;
  onUpdateTrack: (
    roundId: string,
    trackId: SubsidyTrackId,
    updates: Partial<SubsidyTrack>
  ) => void;
  onUpdateRequirements: (
    roundId: string,
    updates: Partial<SubsidyRequirements>
  ) => void;
  onUpdateInitialDefaults: (defaults: Partial<InitialProjectDefaults>) => void;
  onUpdateTentativeItem: (id: string, updates: Partial<TentativeItem>) => void;
  onAddTentativeItem: (item: Omit<TentativeItem, 'id'>) => void;
  onExportBackup: () => void;
  onImportBackup: (json: unknown) => void;
  onNotify: (msg: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  role,
  callRounds,
  activeVersionId,
  initialDefaults,
  tentativeItems,
  displayCurrencyUnit,
  roundingMode,
  onSetActiveVersion,
  onDuplicateVersion,
  onUpdateCallRound,
  onUpdateTrack,
  onUpdateRequirements,
  onUpdateInitialDefaults,
  onUpdateTentativeItem,
  onExportBackup,
  onImportBackup,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabId>('callRounds');
  const [selectedRoundId, setSelectedRoundId] = useState<string>(activeVersionId);
  const [selectedTrackId, setSelectedTrackId] = useState<SubsidyTrackId>('shinjigyo');
  const [newVersionModalOpen, setNewVersionModalOpen] = useState(false);
  const [newVersionCode, setNewVersionCode] = useState('');

  const currentRound =
    callRounds.find((r) => r.id === selectedRoundId) ?? callRounds[0];
  const currentTrack =
    currentRound.tracks.find((t) => t.id === selectedTrackId) ?? currentRound.tracks[0];

  const canEdit = role === 'システム管理者';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readJsonFromFile(file);
      onImportBackup(data);
      onNotify(`バックアップファイル「${file.name}」を正常に読み込み・適用しました。`);
    } catch (err: any) {
      onNotify(`エラー: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Admin Role Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 p-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">管理者設定（2層構造）</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            公募回・版管理、各枠の閾値・上限・実施期間、シミュレーション初期値、「仮」の値一覧、JSONバックアップ
          </p>
        </div>

        {role !== 'システム管理者' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>閲覧専用モードです（編集には右上の操作ロールを「システム管理者」に変更してください）。</span>
          </div>
        )}
      </div>

      {/* 4 Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-300">
        <button
          type="button"
          onClick={() => setActiveTab('callRounds')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'callRounds'
              ? 'border-blue-700 text-blue-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>公募回設定（版管理・枠・要件閾値）</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('initialDefaults')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'initialDefaults'
              ? 'border-blue-700 text-blue-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>案件の前提値の初期値</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tentativeList')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'tentativeList'
              ? 'border-blue-700 text-blue-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>「仮」の値の一覧画面</span>
          <span className="text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
            {tentativeItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'backup'
              ? 'border-blue-700 text-blue-900 bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>設定のバックアップ（JSON書き出し・読み込み）</span>
        </button>
      </div>

      {/* TAB 1: 公募回設定（版管理・枠定義・要件閾値） */}
      {activeTab === 'callRounds' && (
        <div className="space-y-6">
          {/* 版セレクタ & 複製ツールバー */}
          <div className="bg-white border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label htmlFor="round-select" className="font-bold text-slate-800">
                編集対象の公募回（版）:
              </label>
              <select
                id="round-select"
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold px-3 py-1.5"
              >
                {callRounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.versionCode} {r.isLatest ? '（最新有効版）' : ''}
                  </option>
                ))}
              </select>

              {currentRound.id !== activeVersionId ? (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    onSetActiveVersion(currentRound.id);
                    onNotify(`システム全体の有効版を「${currentRound.versionCode}」に設定しました。`);
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-300 hover:bg-blue-100 cursor-pointer"
                >
                  この版を有効化
                </button>
              ) : (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300">
                  現在有効な公募回版
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!canEdit}
              onClick={() => {
                setNewVersionCode(`${currentRound.versionCode} (新改定版)`);
                setNewVersionModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>この版を複製して新しい版を作成</span>
            </button>
          </div>

          {/* 枠セレクタ（革新枠 / 新事業枠 / グローバル枠） */}
          <div className="bg-white border border-slate-200 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  補助金枠ごとの設定（{currentRound.versionCode}）
                </h3>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-200">
                {currentRound.tracks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTrackId(t.id)}
                    className={`px-3 py-1 text-xs font-semibold cursor-pointer ${
                      selectedTrackId === t.id ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {t.shortName}
                  </button>
                ))}
              </div>
            </div>

            {/* 枠設定項目フォーム */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  補助下限額（円）:
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  defaultValue={currentTrack.minSubsidyAmountYen}
                  onBlur={(e) =>
                    onUpdateTrack(currentRound.id, currentTrack.id, {
                      minSubsidyAmountYen: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 px-2 py-1 font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  ={formatMoney(currentTrack.minSubsidyAmountYen, 'manYen', 'floor')}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  通常補助率:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    disabled={!canEdit}
                    defaultValue={currentTrack.subsidyRateNumerator}
                    onBlur={(e) =>
                      onUpdateTrack(currentRound.id, currentTrack.id, {
                        subsidyRateNumerator: Number(e.target.value) || 1,
                      })
                    }
                    className="w-12 text-center bg-slate-50 border border-slate-300 px-1 py-1 font-mono"
                  />
                  <span>/</span>
                  <input
                    type="number"
                    disabled={!canEdit}
                    defaultValue={currentTrack.subsidyRateDenominator}
                    onBlur={(e) =>
                      onUpdateTrack(currentRound.id, currentTrack.id, {
                        subsidyRateDenominator: Number(e.target.value) || 2,
                      })
                    }
                    className="w-12 text-center bg-slate-50 border border-slate-300 px-1 py-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <span>事業実施期間（月数）:</span>
                  <span className="text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                    仮
                  </span>
                </label>
                <input
                  type="number"
                  disabled={!canEdit}
                  defaultValue={currentTrack.executionPeriodMonths}
                  onBlur={(e) =>
                    onUpdateTrack(currentRound.id, currentTrack.id, {
                      executionPeriodMonths: Number(e.target.value) || 10,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 px-2 py-1 font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  公募要領ver1.3初期値: 10か月または14か月
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  申請締切日 / 採択予定日:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    disabled={!canEdit}
                    defaultValue={currentTrack.applicationDeadline}
                    onBlur={(e) =>
                      onUpdateTrack(currentRound.id, currentTrack.id, {
                        applicationDeadline: e.target.value,
                      })
                    }
                    className="w-1/2 bg-slate-50 border border-slate-300 px-1 py-1 text-[11px]"
                  />
                  <input
                    type="date"
                    disabled={!canEdit}
                    defaultValue={currentTrack.adoptionDate}
                    onBlur={(e) =>
                      onUpdateTrack(currentRound.id, currentTrack.id, {
                        adoptionDate: e.target.value,
                      })
                    }
                    className="w-1/2 bg-slate-50 border border-slate-300 px-1 py-1 text-[11px]"
                  />
                </div>
              </div>
            </div>

            {/* 規模別上限テーブル */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">
                従業員規模別 補助上限額テーブル（円単位）
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="py-2 px-3">規模ラベル</th>
                      <th className="py-2 px-3">通常上限（円）</th>
                      <th className="py-2 px-3">賃上げ特例時上限（円）</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentTrack.capTiers.map((tier, idx) => (
                      <tr key={tier.id}>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {tier.label}
                        </td>
                        <td className="py-1 px-3">
                          <input
                            type="number"
                            disabled={!canEdit}
                            defaultValue={tier.standardCapYen}
                            onBlur={(e) => {
                              const updatedTiers = [...currentTrack.capTiers];
                              updatedTiers[idx] = {
                                ...tier,
                                standardCapYen: Number(e.target.value) || 0,
                              };
                              onUpdateTrack(currentRound.id, currentTrack.id, {
                                capTiers: updatedTiers,
                              });
                            }}
                            className="w-48 bg-white border border-slate-300 px-2 py-0.5 font-mono text-right"
                          />
                          <span className="ml-1 text-[10px] text-slate-400">
                            ({formatMoney(tier.standardCapYen, 'manYen', 'floor')})
                          </span>
                        </td>
                        <td className="py-1 px-3">
                          <input
                            type="number"
                            disabled={!canEdit}
                            defaultValue={tier.wageSpecialCapYen}
                            onBlur={(e) => {
                              const updatedTiers = [...currentTrack.capTiers];
                              updatedTiers[idx] = {
                                ...tier,
                                wageSpecialCapYen: Number(e.target.value) || 0,
                              };
                              onUpdateTrack(currentRound.id, currentTrack.id, {
                                capTiers: updatedTiers,
                              });
                            }}
                            className="w-48 bg-white border border-slate-300 px-2 py-0.5 font-mono text-right"
                          />
                          <span className="ml-1 text-[10px] text-slate-400">
                            ({formatMoney(tier.wageSpecialCapYen, 'manYen', 'floor')})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 要件閾値・ほどよく範囲・物価上昇率 */}
          <div className="bg-white border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              要件閾値・「ほどよく」範囲・足下の物価上昇率設定
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              {/* 付加価値額要件 */}
              <div className="border border-slate-200 p-3 space-y-2">
                <span className="font-bold text-slate-800 block">付加価値額 CAGR 閾値</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">基準目標:</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    defaultValue={currentRound.requirements.valueAddedCAGR}
                    onBlur={(e) =>
                      onUpdateRequirements(currentRound.id, {
                        valueAddedCAGR: Number(e.target.value) || 4.0,
                      })
                    }
                    className="w-16 text-right bg-slate-50 border border-slate-300 px-1 py-0.5 font-mono"
                  />
                  <span>%以上</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                  <span className="text-slate-500">ほどよく範囲（仮）:</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    defaultValue={currentRound.requirements.moderateRanges.valueAddedCAGR.min}
                    onBlur={(e) =>
                      onUpdateRequirements(currentRound.id, {
                        moderateRanges: {
                          ...currentRound.requirements.moderateRanges,
                          valueAddedCAGR: {
                            ...currentRound.requirements.moderateRanges.valueAddedCAGR,
                            min: Number(e.target.value) || 4.0,
                          },
                        },
                      })
                    }
                    className="w-12 text-right bg-slate-50 border border-slate-300 px-1 py-0.5 font-mono"
                  />
                  <span>〜</span>
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    defaultValue={currentRound.requirements.moderateRanges.valueAddedCAGR.max}
                    onBlur={(e) =>
                      onUpdateRequirements(currentRound.id, {
                        moderateRanges: {
                          ...currentRound.requirements.moderateRanges,
                          valueAddedCAGR: {
                            ...currentRound.requirements.moderateRanges.valueAddedCAGR,
                            max: Number(e.target.value) || 5.0,
                          },
                        },
                      })
                    }
                    className="w-12 text-right bg-slate-50 border border-slate-300 px-1 py-0.5 font-mono"
                  />
                  <span>%</span>
                  <span className="text-[10px] px-1 bg-amber-100 text-amber-800 font-bold">仮</span>
                </div>
              </div>

              {/* 給与要件 */}
              <div className="border border-slate-200 p-3 space-y-2">
                <span className="font-bold text-slate-800 block">一人当たり給与 CAGR 閾値</span>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">通常基準:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canEdit}
                      defaultValue={currentRound.requirements.wageCAGR}
                      onBlur={(e) =>
                        onUpdateRequirements(currentRound.id, {
                          wageCAGR: Number(e.target.value) || 3.5,
                        })
                      }
                      className="w-16 text-right bg-slate-50 border border-slate-300 px-1 py-0.5 font-mono"
                    />
                    <span>%以上</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">特例基準:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      disabled={!canEdit}
                      defaultValue={currentRound.requirements.wageSpecialCAGR}
                      onBlur={(e) =>
                        onUpdateRequirements(currentRound.id, {
                          wageSpecialCAGR: Number(e.target.value) || 6.0,
                        })
                      }
                      className="w-16 text-right bg-slate-50 border border-slate-300 px-1 py-0.5 font-mono"
                    />
                    <span>%以上</span>
                  </div>
                </div>
              </div>

              {/* 足下物価上昇率 */}
              <div className="border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">足下の物価上昇率（仮値）</span>
                  <span className="text-[10px] px-1 bg-amber-100 text-amber-800 font-bold">仮</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  直近→基準年度の一人当たり給与伸び率が上回るべき物価上昇率。
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    disabled={!canEdit}
                    defaultValue={currentRound.requirements.inflationRatePercent}
                    onBlur={(e) =>
                      onUpdateRequirements(currentRound.id, {
                        inflationRatePercent: Number(e.target.value) || 2.0,
                      })
                    }
                    className="w-20 text-right bg-slate-50 border border-slate-300 px-2 py-1 font-mono"
                  />
                  <span>%（仮値・編集可）</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 案件の前提値の初期値 */}
      {activeTab === 'initialDefaults' && (
        <div className="bg-white border border-slate-200 p-5 space-y-5">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            新規案件登録時の前提値初期設定
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs max-w-3xl">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                デフォルト事業計画期間（年数）:
              </label>
              <select
                disabled={!canEdit}
                value={initialDefaults.planningYears}
                onChange={(e) =>
                  onUpdateInitialDefaults({
                    planningYears: Number(e.target.value) as PlanningYearsOption,
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5"
              >
                <option value={3}>3年間（P1〜P3）</option>
                <option value={4}>4年間（P1〜P4）</option>
                <option value={5}>5年間（P1〜P5）</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                従業員数カウント方式の初期値:
              </label>
              <select
                disabled={!canEdit}
                value={initialDefaults.employeeCountMethod}
                onChange={(e) =>
                  onUpdateInitialDefaults({
                    employeeCountMethod: e.target.value as EmployeeCountMethod,
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5"
              >
                <option value="periodEnd">(A) 期末人数方式（パート換算小数可）</option>
                <option value="koboOfficial">(B) 公募要領方式（全月給与支給者のみ）</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                新製品等1年当たり売上見込額 算出方式の初期値:
              </label>
              <select
                disabled={!canEdit}
                value={initialDefaults.annualSalesEstimateMethod}
                onChange={(e) =>
                  onUpdateInitialDefaults({
                    annualSalesEstimateMethod: e.target.value as AnnualSalesEstimateMethod,
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5"
              >
                <option value="planAverage">補助事業売上の計画期間平均（仮）</option>
                <option value="finalYear">計画最終年度の補助事業売上</option>
                <option value="manual">手入力指定</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                デフォルト決算月:
              </label>
              <select
                disabled={!canEdit}
                value={initialDefaults.defaultFiscalMonth}
                onChange={(e) =>
                  onUpdateInitialDefaults({
                    defaultFiscalMonth: Number(e.target.value) || 3,
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    {m}月決算
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 「仮」の値の一覧画面 */}
      {activeTab === 'tentativeList' && (
        <div className="bg-white border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                システム内に存在する「仮 (Tentative)」の値 一覧確認
              </h3>
              <p className="text-xs text-slate-500">
                画面上の「仮」バッジが付与された設定値および案件前提値を一覧で確認・編集できます。
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="py-2.5 px-3">カテゴリ</th>
                  <th className="py-2.5 px-3">項目名</th>
                  <th className="py-2.5 px-3">現在の値</th>
                  <th className="py-2.5 px-3">仮と設定された根拠・公募要領注記</th>
                  <th className="py-2.5 px-3">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tentativeItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-700">
                      <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">
                      {item.label}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-900">
                      {item.currentValue} {item.unit}
                    </td>
                    <td className="py-2 px-3 text-slate-600 leading-relaxed max-w-md">
                      {item.rationale}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300">
                        仮の値（要確定）
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 設定のバックアップ（JSON書き出し・読み込み） */}
      {activeTab === 'backup' && (
        <div className="bg-white border border-slate-200 p-5 space-y-6 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900">設定・案件データのバックアップ</h3>
            <p className="text-xs text-slate-500 mt-1">
              現在の公募回設定、案件データ、シミュレーション変数をJSONファイルとしてダウンロード保存、または復元します。
            </p>
          </div>

          <div className="border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">1. JSON書き出し（エクスポート）</h4>
            <p className="text-xs text-slate-600">
              現在のすべてのデータを安全にローカルファイルとして書き出します。
            </p>
            <button
              type="button"
              onClick={onExportBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSONバックアップファイルをダウンロード</span>
            </button>
          </div>

          <div className="border border-slate-200 p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">2. JSON読み込み（インポート）</h4>
            <p className="text-xs text-slate-600">
              過去に書き出したJSONファイルを選択してシステムに復元します（既存データは上書きされます）。
            </p>
            <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>JSONファイルを選択して復元...</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* 新版作成モーダル */}
      {newVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-300 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              公募回（版）の複製・新規作成
            </h3>
            <p className="text-xs text-slate-600">
              「{currentRound.versionCode}」の設定内容を複製して新しい版を作成します。既存案件の数値は作成時の版で固定され、新版を作成しても変更されません。
            </p>
            <div>
              <label htmlFor="new-version-name" className="text-xs font-semibold text-slate-700 block mb-1">
                新しい版の名前（例：第2回 ver1.4）:
              </label>
              <input
                id="new-version-name"
                type="text"
                value={newVersionCode}
                onChange={(e) => setNewVersionCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewVersionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  onDuplicateVersion(currentRound.id, newVersionCode);
                  setNewVersionModalOpen(false);
                  onNotify(`新しい公募回版「${newVersionCode}」を作成しました。`);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 cursor-pointer"
              >
                版を作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
