import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Plus, Trash2, Upload, AlertCircle, Info, Check } from 'lucide-react';
import { ExcelCellMapping, ExcelTemplateDefinition } from '../../types';
import { saveFileToIndexedDB } from '../../utils/storageService';

interface ExcelTemplateAdminProps {
  canEdit: boolean;
  excelTemplates: ExcelTemplateDefinition[];
  excelCellMappings: ExcelCellMapping[];
  onUpdateExcelTemplate: (id: string, updates: Partial<ExcelTemplateDefinition>) => void;
  onAddExcelCellMapping: (mapping: Omit<ExcelCellMapping, 'id'>) => void;
  onUpdateExcelCellMapping: (id: string, updates: Partial<ExcelCellMapping>) => void;
  onDeleteExcelCellMapping: (id: string) => void;
  onNotify?: (msg: string) => void;
}

/**
 * Excel出力設定・ひな形管理コンポーネント (STEP D-3)
 * ひな形xlsxファイルの登録/差し替え（IndexedDB保存）とセル対応表（excelCellMappings）の編集を提供します。
 */
export const ExcelTemplateAdmin: React.FC<ExcelTemplateAdminProps> = ({
  canEdit,
  excelTemplates,
  excelCellMappings,
  onUpdateExcelTemplate,
  onAddExcelCellMapping,
  onUpdateExcelCellMapping,
  onDeleteExcelCellMapping,
  onNotify,
}) => {
  const [activeTemplateIdForFilter, setActiveTemplateIdForFilter] = useState<string>('all');

  // 新規セル対応用ステート
  const [newTemplateId, setNewTemplateId] = useState<string>(
    excelTemplates[0]?.id || ''
  );
  const [newSheetName, setNewSheetName] = useState('Sheet1');
  const [newCell, setNewCell] = useState('');
  const [newValuePath, setNewValuePath] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newIsTentative, setNewIsTentative] = useState(true);

  // ファイルアップロード対象ID用
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetTemplateIdForUpload, setTargetTemplateIdForUpload] = useState<string | null>(null);

  const handleUploadClick = (templateId: string) => {
    setTargetTemplateIdForUpload(templateId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const templateId = targetTemplateIdForUpload;
    if (!file || !templateId) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const now = new Date();
      const uploadedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const recordId = 'tmpl-file-' + templateId;

      await saveFileToIndexedDB({
        id: recordId,
        projectId: '__admin__',
        fileName: file.name,
        fileType:
          file.type ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: file.size,
        data: arrayBuffer,
        uploadedAt,
      });

      onUpdateExcelTemplate(templateId, {
        fileName: file.name,
        fileRecordId: recordId,
        uploadedAt,
      });

      onNotify?.(`テンプレート「${file.name}」を正常に登録・保存しました。`);
    } catch (err: any) {
      onNotify?.(`ファイル保存エラー: ${err.message}`);
    } finally {
      setTargetTemplateIdForUpload(null);
    }
  };

  const handleAddMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCell.trim() || !newValuePath.trim()) return;

    onAddExcelCellMapping({
      templateId: newTemplateId,
      sheetName: newSheetName.trim() || 'Sheet1',
      cell: newCell.trim().toUpperCase(),
      valuePath: newValuePath.trim(),
      note: newNote.trim(),
      isTentative: newIsTentative,
    });

    setNewCell('');
    setNewValuePath('');
    setNewNote('');
  };

  const filteredMappings =
    activeTemplateIdForFilter === 'all'
      ? excelCellMappings
      : excelCellMappings.filter((m) => m.templateId === activeTemplateIdForFilter);

  return (
    <div className="bg-white border border-slate-200 p-5 space-y-6">
      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* サブヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Excel出力設定・ひな形管理 (STEP E 連携)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            中小企業庁公式の財務フォーマットや事業計画書Excelのひな形ファイル、および出力先セルマッピングを定義します。
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>公式フォーマットのセル位置は確定後にここで修正してください</span>
          <span className="text-[10px] px-1 bg-amber-200 text-amber-900 font-bold ml-1">仮</span>
        </div>
      </div>

      {/* 1. テンプレート一覧 */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>登録テンプレートひな形一覧</span>
        </h4>

        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2.5 px-3">テンプレートID</th>
                <th className="py-2.5 px-3">名称 / 説明</th>
                <th className="py-2.5 px-3">対象枠</th>
                <th className="py-2.5 px-3">ファイル名</th>
                <th className="py-2.5 px-3">登録日時</th>
                {canEdit && <th className="py-2.5 px-3 text-center">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {excelTemplates.map((tmpl) => (
                <tr key={tmpl.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono font-bold text-slate-700">
                    {tmpl.id}
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-slate-900">{tmpl.name}</div>
                    <div className="text-[11px] text-slate-500">{tmpl.description}</div>
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-medium">
                      {tmpl.targetTrackId === 'all'
                        ? '全枠共通'
                        : tmpl.targetTrackId === 'shinjigyo'
                        ? '新事業進出枠'
                        : tmpl.targetTrackId === 'kakushin'
                        ? '革新枠'
                        : 'グローバル枠'}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-700">
                    <div className="flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{tmpl.fileName}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                    {tmpl.uploadedAt ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        {tmpl.uploadedAt}
                      </span>
                    ) : (
                      <span className="text-slate-400">未登録</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleUploadClick(tmpl.id)}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-blue-50 text-blue-800 border border-slate-300 hover:border-blue-300 font-semibold cursor-pointer inline-flex items-center gap-1 transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        <span>ひな形xlsxを登録／差し替え</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. 値のパスの説明ボックス */}
      <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
        <div className="font-bold text-slate-800 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>値のパス（valuePath）の指定方法について</span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          セル対応表の「値のパス」には、案件データ（ProjectFinancialMaster 等）から読み出すプロパティパスを指定します。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
          <div className="bg-white p-2 border border-slate-200">
            <span className="text-blue-700 font-bold block">periods.y0.pl.totalSales</span>
            <span className="text-slate-500 font-sans text-[10px]">直近期 (y0) の売上高</span>
          </div>
          <div className="bg-white p-2 border border-slate-200">
            <span className="text-blue-700 font-bold block">periods.p3.pl.valueAdded</span>
            <span className="text-slate-500 font-sans text-[10px]">計画3年目 (p3) の付加価値額</span>
          </div>
          <div className="bg-white p-2 border border-slate-200">
            <span className="text-blue-700 font-bold block">periods.y0.bs.totalAssets</span>
            <span className="text-slate-500 font-sans text-[10px]">直近期 (y0) の総資産合計</span>
          </div>
          <div className="bg-white p-2 border border-slate-200">
            <span className="text-blue-700 font-bold block">planningYears</span>
            <span className="text-slate-500 font-sans text-[10px]">計画期間年数 (3 / 4 / 5)</span>
          </div>
          <div className="bg-white p-2 border border-slate-200">
            <span className="text-blue-700 font-bold block">isWageSpecialApplied</span>
            <span className="text-slate-500 font-sans text-[10px]">賃上げ特例適用フラグ (boolean)</span>
          </div>
          <div className="bg-white p-2 border border-slate-200">
            <span className="text-blue-700 font-bold block">annualSalesEstimate.calculatedValueYen</span>
            <span className="text-slate-500 font-sans text-[10px]">1年当たり売上見込額（円）</span>
          </div>
        </div>
      </div>

      {/* 3. セル対応表 (excelCellMappings) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span>セル対応定義表（マッピング定義）</span>
            <span className="text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
              仮
            </span>
          </h4>

          {/* テンプレート絞り込み */}
          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-600 font-semibold">表示対象:</label>
            <select
              value={activeTemplateIdForFilter}
              onChange={(e) => setActiveTemplateIdForFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="all">すべてのテンプレート ({excelCellMappings.length}件)</option>
              {excelTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 新規マッピング行追加フォーム */}
        {canEdit && (
          <form onSubmit={handleAddMapping} className="bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>セル対応定義の新規追加</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">テンプレート *</label>
                <select
                  value={newTemplateId}
                  onChange={(e) => setNewTemplateId(e.target.value)}
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-medium"
                >
                  {excelTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">シート名 *</label>
                <input
                  type="text"
                  required
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="例: Sheet1, 様式2"
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">セル番地 *</label>
                <input
                  type="text"
                  required
                  value={newCell}
                  onChange={(e) => setNewCell(e.target.value)}
                  placeholder="例: B12, C5"
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-mono uppercase"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-[11px] text-slate-600 block mb-1">値のパス (valuePath) *</label>
                <input
                  type="text"
                  required
                  value={newValuePath}
                  onChange={(e) => setNewValuePath(e.target.value)}
                  placeholder="例: periods.y0.pl.totalSales"
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">メモ</label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="補足メモ"
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsTentative}
                  onChange={(e) => setNewIsTentative(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>仮設定として登録（「仮」バッジ付与）</span>
              </label>
              <button
                type="submit"
                className="px-3.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>対応セルを追加</span>
              </button>
            </div>
          </form>
        )}

        {/* テーブル一覧 */}
        <div className="overflow-x-auto border border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2 px-3">テンプレート</th>
                <th className="py-2 px-3 w-28">シート名</th>
                <th className="py-2 px-3 w-24">セル番地</th>
                <th className="py-2 px-3">値のパス (valuePath)</th>
                <th className="py-2 px-3">メモ</th>
                <th className="py-2 px-3 w-16 text-center">仮</th>
                {canEdit && <th className="py-2 px-3 w-16 text-center">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMappings.length === 0 ? (
                <tr>
                  <td
                    colSpan={canEdit ? 7 : 6}
                    className="py-8 text-center text-slate-400 bg-slate-50/50"
                  >
                    登録されているセル対応定義がありません。
                  </td>
                </tr>
              ) : (
                filteredMappings.map((map) => (
                  <tr key={map.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3">
                      {canEdit ? (
                        <select
                          value={map.templateId}
                          onChange={(e) =>
                            onUpdateExcelCellMapping(map.id, { templateId: e.target.value })
                          }
                          className="bg-white border border-slate-300 px-1.5 py-0.5 text-xs max-w-[180px]"
                        >
                          {excelTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {excelTemplates.find((t) => t.id === map.templateId)?.name ||
                            map.templateId}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      {canEdit ? (
                        <input
                          type="text"
                          defaultValue={map.sheetName}
                          onBlur={(e) =>
                            onUpdateExcelCellMapping(map.id, { sheetName: e.target.value })
                          }
                          className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-xs font-mono"
                        />
                      ) : (
                        <span className="font-mono text-slate-800">{map.sheetName}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      {canEdit ? (
                        <input
                          type="text"
                          defaultValue={map.cell}
                          onBlur={(e) =>
                            onUpdateExcelCellMapping(map.id, {
                              cell: e.target.value.toUpperCase(),
                            })
                          }
                          className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-xs font-mono uppercase font-bold text-blue-900"
                        />
                      ) : (
                        <span className="font-mono font-bold text-blue-900">{map.cell}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      {canEdit ? (
                        <input
                          type="text"
                          defaultValue={map.valuePath}
                          onBlur={(e) =>
                            onUpdateExcelCellMapping(map.id, { valuePath: e.target.value })
                          }
                          className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-xs font-mono text-slate-800"
                        />
                      ) : (
                        <span className="font-mono text-slate-800">{map.valuePath}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      {canEdit ? (
                        <input
                          type="text"
                          defaultValue={map.note || ''}
                          onBlur={(e) =>
                            onUpdateExcelCellMapping(map.id, { note: e.target.value })
                          }
                          className="w-full bg-white border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600"
                        />
                      ) : (
                        <span className="text-slate-600">{map.note || '-'}</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {canEdit ? (
                        <input
                          type="checkbox"
                          checked={!!map.isTentative}
                          onChange={(e) =>
                            onUpdateExcelCellMapping(map.id, { isTentative: e.target.checked })
                          }
                          className="rounded border-slate-300 cursor-pointer"
                        />
                      ) : map.isTentative ? (
                        <span className="inline-block text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                          仮
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-1.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteExcelCellMapping(map.id)}
                          title="削除"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

