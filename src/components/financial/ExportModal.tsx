import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  AlertCircle,
  FileText,
  TableProperties,
} from 'lucide-react';
import type {
  Project,
  ExcelTemplateDefinition,
  ExcelCellMapping,
  SubsidyVersionRound,
  DisplayCurrencyUnit,
  RoundingMode,
} from '../../types';
import { evaluateRequirements } from '../../utils/financialCalculations';
import { exportOfficialFormat } from '../../utils/excel/exportOfficial';
import { exportSummary } from '../../utils/excel/exportSummary';
import { downloadBlob } from '../../utils/download';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  excelTemplates: ExcelTemplateDefinition[];
  excelCellMappings: ExcelCellMapping[];
  activeCallRound: SubsidyVersionRound;
  displayCurrencyUnit: DisplayCurrencyUnit;
  roundingMode: RoundingMode;
  onNotify: (msg: string) => void;
}

/**
 * Excel出力モーダル（公式インポート用フォーマット／顧客説明用サマリー）
 */
export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  excelTemplates = [],
  excelCellMappings = [],
  activeCallRound,
  displayCurrencyUnit,
  roundingMode,
  onNotify,
}) => {
  // 出力種類: 'official' (公式インポート用) | 'summary' (顧客説明用サマリー)
  const [exportType, setExportType] = useState<'official' | 'summary'>('official');

  // 対象枠と一致または'all'のテンプレート一覧
  const availableTemplates = useMemo(() => {
    return excelTemplates.filter(
      (t) => t.targetTrackId === 'all' || t.targetTrackId === project.appliedTrackId
    );
  }, [excelTemplates, project.appliedTrackId]);

  // 選択中テンプレートID（初期値は先頭テンプレート）
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return availableTemplates[0]?.id || '';
  });

  // サマリー用選択単位（初期値は現在の表示単位）
  const [selectedUnit, setSelectedUnit] = useState<DisplayCurrencyUnit>(displayCurrencyUnit);

  // 警告リスト状態
  const [warnings, setWarnings] = useState<string[] | null>(null);
  const [completedFileName, setCompletedFileName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCompletedFileName(null);
    }
  }, [isOpen]);

  // 適用トラックの取得
  const appliedTrack = useMemo(() => {
    const t = activeCallRound.tracks.find((item) => item.id === project.appliedTrackId);
    return t || activeCallRound.tracks[0];
  }, [activeCallRound, project.appliedTrackId]);

  // 財務要件判定の算出
  const evalResult = useMemo(() => {
    return evaluateRequirements(
      project.financialMaster,
      appliedTrack,
      activeCallRound.requirements
    );
  }, [project.financialMaster, appliedTrack, activeCallRound.requirements]);

  // ファイル名の生成
  const { officialFileName, summaryFileName } = useMemo(() => {
    const sanitizedCompany = (project.companyName || '企業名').replace(/[\\/:*?"<>|]/g, '_');
    const versions = project.financialMaster?.planVersions;
    const latestVersion =
      Array.isArray(versions) && versions.length > 0
        ? versions[0].name.replace(/[\\/:*?"<>|]/g, '_')
        : '未保存';

    const d = new Date();
    const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate()
    ).padStart(2, '0')}`;

    return {
      officialFileName: `${sanitizedCompany}_財務情報・収益計画_${latestVersion}_${yyyymmdd}.xlsx`,
      summaryFileName: `${sanitizedCompany}_収益計画サマリー_${latestVersion}_${yyyymmdd}.xlsx`,
    };
  }, [project]);

  if (!isOpen) return null;

  const currentTemplate = availableTemplates.find((t) => t.id === selectedTemplateId);

  // 出力前チェック処理
  const handlePreCheck = () => {
    setErrorMessage(null);
    const warnList: string[] = [];

    // 1. 要件判定チェック
    if (!evalResult.isVAPassed) {
      warnList.push(`【要件未達】付加価値額CAGR (${evalResult.vaCAGR}%) が要件を満たしていません。`);
    }
    if (!evalResult.isWagePassed) {
      warnList.push(`【要件未達】給与総額/一人当たり給与CAGR (${evalResult.wageCAGR}%) が要件を満たしていません。`);
    }
    if (!evalResult.isMinWagePassed) {
      warnList.push(`【要件未達】事業場内最低賃金の規定差額 (+${evalResult.minWageDiff}円) が要件を満たしていません。`);
    }
    if (!evalResult.isNearTermWagePassed) {
      warnList.push(`【要件未達】足下の給与伸び率 (${evalResult.nearTermWageGrowthRate}%) が物価上昇率を満たしていません。`);
    }
    if (!evalResult.isSubsidyWithinCap) {
      warnList.push('【要件未達】補助金申請額が上限額を超過しています。');
    }
    if (!evalResult.isMinSubsidyPassed) {
      warnList.push('【要件未達】補助金申請額が下限額未満です。');
    }

    // 2. シミュレーションエラー
    const sim = project.financialMaster?.simulation;
    if (sim?.enabled) {
      // planSimulation errors
      if (Array.isArray((sim as any).errors) && (sim as any).errors.length > 0) {
        (sim as any).errors.forEach((e: string) => {
          warnList.push(`【シミュレーションエラー】${e}`);
        });
      }
    }

    // 3. 1年当たり売上見込乖離
    if (project.financialMaster?.annualSalesEstimate?.hasMismatch) {
      warnList.push('【売上見込乖離】1年当たり売上見込額と算出根拠の間に差異があります。');
    }

    // 4. 公式出力時の追加チェック
    if (exportType === 'official') {
      if (!currentTemplate) {
        warnList.push('【テンプレート未選択】出力対象のテンプレートが選択されていません。');
      } else if (!currentTemplate.fileRecordId) {
        warnList.push('【ひな形未登録】選択されたテンプレートのひな形ファイルが未登録です。管理画面＞Excel出力設定で登録してください。');
      }

      // isTentative なセル対応
      if (currentTemplate) {
        const targetMappings = excelCellMappings.filter((m) => m.templateId === currentTemplate.id);
        targetMappings.forEach((m) => {
          if (m.isTentative) {
            warnList.push(`【仮値対応】セル [${m.sheetName}!${m.cell}] (参照: ${m.valuePath}) は「仮」として設定されています。`);
          }
        });
      }
    }

    setWarnings(warnList);
  };

  // エクスポート実行処理
  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setCompletedFileName(null);

    try {
      if (exportType === 'official') {
        if (!currentTemplate || !currentTemplate.fileRecordId) {
          throw new Error('ひな形が未登録です。管理画面＞Excel出力設定で登録してください');
        }

        const { blob, warnings: exportWarns } = await exportOfficialFormat(
          project,
          currentTemplate,
          excelCellMappings,
          evalResult
        );

        downloadBlob(blob, officialFileName);
        onNotify(`公式フォーマットを出力しました: ${officialFileName}`);

        if (exportWarns.length > 0) {
          // 出力時の警告を先頭に表示する。モーダルは閉じずに確認してもらう
          setWarnings((prev) => Array.from(new Set([...exportWarns, ...(prev || [])])));
          setCompletedFileName(officialFileName);
        } else {
          onClose();
        }
      } else {
        const blob = await exportSummary(
          project,
          evalResult,
          selectedUnit,
          roundingMode
        );

        downloadBlob(blob, summaryFileName);
        onNotify(`顧客説明用サマリーを出力しました: ${summaryFileName}`);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Excel出力中に予期せぬエラーが発生しました。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white border border-slate-300 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Excel出力</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* ① 出力種類 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              ① 出力種類の選択
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setExportType('official');
                  setCompletedFileName(null);
                  setWarnings(null);
                  setErrorMessage(null);
                }}
                className={`flex flex-col items-start p-3 border text-left transition-colors cursor-pointer ${
                  exportType === 'official'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <TableProperties
                    className={`w-4 h-4 ${
                      exportType === 'official' ? 'text-blue-600' : 'text-slate-500'
                    }`}
                  />
                  <span className="font-bold text-slate-900 text-xs">
                    公式インポート用フォーマット
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  登録済みひな形ファイル（.xlsx）の指定セルへ収支計画の数値を正確に流し込み出力します。
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportType('summary');
                  setCompletedFileName(null);
                  setWarnings(null);
                  setErrorMessage(null);
                }}
                className={`flex flex-col items-start p-3 border text-left transition-colors cursor-pointer ${
                  exportType === 'summary'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText
                    className={`w-4 h-4 ${
                      exportType === 'summary' ? 'text-blue-600' : 'text-slate-500'
                    }`}
                  />
                  <span className="font-bold text-slate-900 text-xs">
                    顧客説明用サマリー
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">
                  計画サマリー・損益計画・人員給与計画・設備投資計画の4シート構成で新規生成します。
                </p>
              </button>
            </div>
          </div>

          {/* ② 公式テンプレート選択 or ③ サマリー単位選択 */}
          {exportType === 'official' ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                ② テンプレート選択（申請枠: {project.appliedTrackId}）
              </label>
              {availableTemplates.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">利用可能なテンプレートがありません</div>
                    <div>
                      管理画面＞テンプレート管理にて、申請枠に対応したExcelひな形ファイルを登録してください。
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      setSelectedTemplateId(e.target.value);
                      setWarnings(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {availableTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.fileName || 'ファイル未設定'})
                      </option>
                    ))}
                  </select>

                  {currentTemplate && !currentTemplate.fileRecordId && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        ひな形が未登録です。管理画面＞Excel出力設定で登録してください。
                      </span>
                    </div>
                  )}

                  {currentTemplate && (
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>対応セル数: {excelCellMappings.filter((m) => m.templateId === currentTemplate.id).length} 件</span>
                      {excelCellMappings.some((m) => m.templateId === currentTemplate.id && m.isTentative) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          仮対応あり
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                ② 表示単位の選択
              </label>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="currencyUnit"
                    value="yen"
                    checked={selectedUnit === 'yen'}
                    onChange={() => setSelectedUnit('yen')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span>円</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="currencyUnit"
                    value="thousandYen"
                    checked={selectedUnit === 'thousandYen'}
                    onChange={() => setSelectedUnit('thousandYen')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span>千円</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="currencyUnit"
                    value="manYen"
                    checked={selectedUnit === 'manYen'}
                    onChange={() => setSelectedUnit('manYen')}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span>万円</span>
                </label>
              </div>
            </div>
          )}

          {/* 出力ファイル名表示 */}
          <div className="p-3 bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">出力予定ファイル名: </span>
            <span className="font-mono font-bold text-slate-800">
              {exportType === 'official' ? officialFileName : summaryFileName}
            </span>
          </div>

          {/* エラーメッセージ */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          {completedFileName && (
            <div className="p-3 border border-sky-300 bg-sky-50 text-xs text-sky-900 space-y-1">
              <div className="font-bold">「{completedFileName}」をダウンロードしました。</div>
              <div>
                ただし、下の一覧にある項目は書き込まれていません。内容を確認してから閉じてください。
              </div>
            </div>
          )}

          {/* ④ 出力前チェックボタン & 警告リスト */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                ③ 出力前チェック
              </label>
              <button
                type="button"
                onClick={handlePreCheck}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                整合性チェック実行
              </button>
            </div>

            {warnings !== null && (
              <div
                className={`p-3 border text-xs space-y-1.5 max-h-40 overflow-y-auto ${
                  warnings.length > 0
                    ? 'bg-amber-50/70 border-amber-300 text-amber-900'
                    : 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                }`}
              >
                {warnings.length === 0 ? (
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>警告はありません。正常に出力可能です。</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>
                        {completedFileName
                          ? `${warnings.length} 件の注意・警告があります（出力済みのファイルを確認してください）`
                          : `${warnings.length} 件の注意・警告があります（このまま出力可能です）`}
                      </span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                      {warnings.map((w, idx) => (
                        <li key={idx}>
                          {w.includes('【仮値') ? (
                            <span>
                              {w.split('は')[0]}
                              <span className="inline-block px-1 py-0.2 mx-1 text-[9px] font-bold bg-amber-200 text-amber-900 rounded-xs">
                                仮
                              </span>
                              は{w.split('は')[1]}
                            </span>
                          ) : (
                            w
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting
                ? '出力中...'
                : warnings && warnings.length > 0
                  ? 'このまま出力'
                  : 'Excelを出力'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

