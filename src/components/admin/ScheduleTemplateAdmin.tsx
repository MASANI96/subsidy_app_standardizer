import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Calendar, Plus, Trash2, CheckSquare } from 'lucide-react';
import { PhaseGate, ScheduleTemplateTask } from '../../types';

interface ScheduleTemplateAdminProps {
  canEdit: boolean;
  scheduleTemplates: ScheduleTemplateTask[];
  onAddScheduleTemplate: (task: Omit<ScheduleTemplateTask, 'id'>) => void;
  onUpdateScheduleTemplate: (id: string, updates: Partial<ScheduleTemplateTask>) => void;
  onDeleteScheduleTemplate: (id: string) => void;
  onMoveScheduleTemplate: (id: string, direction: 'up' | 'down') => void;
}

const ANCHOR_LABELS: Record<ScheduleTemplateTask['anchor'], string> = {
  deadline: '申請締切日',
  adoption: '採択日',
  grantDecision: '交付決定日',
  completion: '事業完了日',
};

/**
 * ガント標準テンプレート管理コンポーネント (STEP D-4)
 * 案件作成時に生成される標準スケジュール・ゲート連動タスク（申請前・採択後）の定義を管理します。
 */
export const ScheduleTemplateAdmin: React.FC<ScheduleTemplateAdminProps> = ({
  canEdit,
  scheduleTemplates,
  onAddScheduleTemplate,
  onUpdateScheduleTemplate,
  onDeleteScheduleTemplate,
  onMoveScheduleTemplate,
}) => {
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'pre' | 'post'>('all');

  // 新規タスク追加フォームステート
  const [newTitle, setNewTitle] = useState('');
  const [newPhase, setNewPhase] = useState<'pre' | 'post'>('pre');
  const [newOwner, setNewOwner] = useState<'support' | 'client'>('support');
  const [newAnchor, setNewAnchor] = useState<ScheduleTemplateTask['anchor']>('deadline');
  const [newOffsetDays, setNewOffsetDays] = useState<number>(-14);
  const [newDurationDays, setNewDurationDays] = useState<number>(7);
  const [newMilestone, setNewMilestone] = useState(false);
  const [newUseExecutionPeriod, setNewUseExecutionPeriod] = useState(false);
  const [newGateId, setNewGateId] = useState<PhaseGate['id'] | ''>('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddScheduleTemplate({
      title: newTitle.trim(),
      phase: newPhase,
      owner: newOwner,
      anchor: newAnchor,
      offsetDays: Number(newOffsetDays) || 0,
      durationDays: newMilestone ? 0 : Number(newDurationDays) || 0,
      milestone: newMilestone,
      useExecutionPeriod: newUseExecutionPeriod,
      gateId: newGateId ? (newGateId as PhaseGate['id']) : undefined,
    });

    setNewTitle('');
    setNewMilestone(false);
    setNewUseExecutionPeriod(false);
    setNewGateId('');
  };

  const filteredTasks =
    phaseFilter === 'all'
      ? scheduleTemplates
      : scheduleTemplates.filter((t) => t.phase === phaseFilter);

  return (
    <div className="bg-white border border-slate-200 p-5 space-y-6">
      {/* サブヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">ガント標準工程表テンプレート設定 (STEP F 連携)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            申請前および採択後の各基準日（締切日・採択日・交付決定日・完了日）からの相対日数で標準工程を定義します。すべて「仮」値です。
          </p>
        </div>

        {/* フェーズフィルタ */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPhaseFilter('all')}
            className={`px-3 py-1 cursor-pointer transition-colors ${
              phaseFilter === 'all'
                ? 'bg-white text-blue-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            全フェーズ ({scheduleTemplates.length})
          </button>
          <button
            type="button"
            onClick={() => setPhaseFilter('pre')}
            className={`px-3 py-1 cursor-pointer transition-colors ${
              phaseFilter === 'pre'
                ? 'bg-white text-blue-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            申請前
          </button>
          <button
            type="button"
            onClick={() => setPhaseFilter('post')}
            className={`px-3 py-1 cursor-pointer transition-colors ${
              phaseFilter === 'post'
                ? 'bg-white text-blue-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            採択後
          </button>
        </div>
      </div>

      {/* 新規タスク追加フォーム（管理者のみ） */}
      {canEdit && (
        <form onSubmit={handleAddTask} className="bg-slate-50 border border-slate-200 p-3.5 space-y-3 text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>新規標準タスクの追加</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
            <div className="lg:col-span-2">
              <label className="text-[11px] text-slate-600 block mb-1">タスク名 *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例: キックオフ・ヒアリング"
                className="w-full bg-white border border-slate-300 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">フェーズ *</label>
              <select
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value as 'pre' | 'post')}
                className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-medium"
              >
                <option value="pre">申請前</option>
                <option value="post">採択後</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">担当（オーナー） *</label>
              <select
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value as 'support' | 'client')}
                className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-medium"
              >
                <option value="support">支援側（当社）</option>
                <option value="client">顧客（申請企業）</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">基準日 *</label>
              <select
                value={newAnchor}
                onChange={(e) => setNewAnchor(e.target.value as ScheduleTemplateTask['anchor'])}
                className="w-full bg-white border border-slate-300 px-2 py-1 text-xs font-medium"
              >
                <option value="deadline">申請締切日</option>
                <option value="adoption">採択日</option>
                <option value="grantDecision">交付決定日</option>
                <option value="completion">事業完了日</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-600 block mb-1">連動フェーズゲート</label>
              <select
                value={newGateId}
                onChange={(e) => setNewGateId(e.target.value as PhaseGate['id'] | '')}
                className="w-full bg-white border border-slate-300 px-2 py-1 text-xs"
              >
                <option value="">なし</option>
                <option value="gate-1">Gate 1: キックオフ・ヒアリング</option>
                <option value="gate-2">Gate 2: 収支計画・要件確認</option>
                <option value="gate-3">Gate 3: 申請書作成・社内レビュー</option>
                <option value="gate-4">Gate 4: 顧客最終確認・電子申請</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-600 whitespace-nowrap">オフセット日数:</label>
              <input
                type="number"
                value={newOffsetDays}
                onChange={(e) => setNewOffsetDays(Number(e.target.value))}
                className="w-20 bg-white border border-slate-300 px-2 py-1 text-xs text-right font-mono"
              />
              <span className="text-slate-500 text-[11px]">日</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-600 whitespace-nowrap">所要期間:</label>
              <input
                type="number"
                min="0"
                disabled={newMilestone}
                value={newDurationDays}
                onChange={(e) => setNewDurationDays(Number(e.target.value))}
                className="w-20 bg-white border border-slate-300 px-2 py-1 text-xs text-right font-mono disabled:bg-slate-100"
              />
              <span className="text-slate-500 text-[11px]">日</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-slate-700">マイルストーン（期日）</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUseExecutionPeriod}
                  onChange={(e) => setNewUseExecutionPeriod(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-slate-700">実施期間月数を適用</span>
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>タスクを追加</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* タスク一覧テーブル */}
      <div className="overflow-x-auto border border-slate-200">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
              {canEdit && <th className="py-2.5 px-2 w-16 text-center">順序</th>}
              <th className="py-2.5 px-3 min-w-[180px]">タスク名</th>
              <th className="py-2.5 px-3 w-20">フェーズ</th>
              <th className="py-2.5 px-3 w-28">担当</th>
              <th className="py-2.5 px-3 w-28">基準日</th>
              <th className="py-2.5 px-3 w-24 text-right">オフセット</th>
              <th className="py-2.5 px-3 w-24 text-right">所要期間</th>
              <th className="py-2.5 px-3 w-28 text-center">属性</th>
              <th className="py-2.5 px-3 w-28">連動ゲート</th>
              {canEdit && <th className="py-2.5 px-3 w-16 text-center">削除</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredTasks.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 10 : 8}
                  className="py-8 text-center text-slate-400 bg-slate-50/50"
                >
                  登録されている標準タスクがありません。
                </td>
              </tr>
            ) : (
              filteredTasks.map((task, idx) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  {/* 順序変更 */}
                  {canEdit && (
                    <td className="py-1.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => onMoveScheduleTemplate(task.id, 'up')}
                          className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                          title="上へ移動"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === filteredTasks.length - 1}
                          onClick={() => onMoveScheduleTemplate(task.id, 'down')}
                          className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                          title="下へ移動"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}

                  {/* タスク名 */}
                  <td className="py-1.5 px-3">
                    {canEdit ? (
                      <input
                        type="text"
                        defaultValue={task.title}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val && val !== task.title) {
                            onUpdateScheduleTemplate(task.id, { title: val });
                          }
                        }}
                        className="w-full bg-white border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-800"
                      />
                    ) : (
                      <span className="font-semibold text-slate-800">{task.title}</span>
                    )}
                  </td>

                  {/* フェーズ */}
                  <td className="py-1.5 px-3">
                    {canEdit ? (
                      <select
                        value={task.phase}
                        onChange={(e) =>
                          onUpdateScheduleTemplate(task.id, {
                            phase: e.target.value as 'pre' | 'post',
                          })
                        }
                        className="bg-white border border-slate-300 px-1 py-0.5 text-xs"
                      >
                        <option value="pre">申請前</option>
                        <option value="post">採択後</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10px] font-bold ${
                          task.phase === 'pre'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {task.phase === 'pre' ? '申請前' : '採択後'}
                      </span>
                    )}
                  </td>

                  {/* 担当 */}
                  <td className="py-1.5 px-3">
                    {canEdit ? (
                      <select
                        value={task.owner}
                        onChange={(e) =>
                          onUpdateScheduleTemplate(task.id, {
                            owner: e.target.value as 'support' | 'client',
                          })
                        }
                        className="bg-white border border-slate-300 px-1 py-0.5 text-xs"
                      >
                        <option value="support">支援側（当社）</option>
                        <option value="client">顧客（申請企業）</option>
                      </select>
                    ) : (
                      <span className="text-slate-700">
                        {task.owner === 'support' ? '支援側' : '顧客'}
                      </span>
                    )}
                  </td>

                  {/* 基準日 */}
                  <td className="py-1.5 px-3">
                    {canEdit ? (
                      <select
                        value={task.anchor}
                        onChange={(e) =>
                          onUpdateScheduleTemplate(task.id, {
                            anchor: e.target.value as ScheduleTemplateTask['anchor'],
                          })
                        }
                        className="bg-white border border-slate-300 px-1 py-0.5 text-xs font-semibold text-slate-700"
                      >
                        <option value="deadline">申請締切日</option>
                        <option value="adoption">採択日</option>
                        <option value="grantDecision">交付決定日</option>
                        <option value="completion">事業完了日</option>
                      </select>
                    ) : (
                      <span className="font-semibold text-slate-700">
                        {ANCHOR_LABELS[task.anchor]}
                      </span>
                    )}
                  </td>

                  {/* オフセット */}
                  <td className="py-1.5 px-3 text-right">
                    {canEdit ? (
                      <input
                        type="number"
                        defaultValue={task.offsetDays}
                        onBlur={(e) =>
                          onUpdateScheduleTemplate(task.id, {
                            offsetDays: Number(e.target.value) || 0,
                          })
                        }
                        className="w-16 bg-white border border-slate-300 px-1 py-0.5 text-right font-mono text-xs"
                      />
                    ) : (
                      <span className="font-mono">{task.offsetDays}日</span>
                    )}
                  </td>

                  {/* 所要期間 */}
                  <td className="py-1.5 px-3 text-right">
                    {task.useExecutionPeriod ? (
                      <span className="text-blue-700 text-[11px] font-semibold">実施月数連動</span>
                    ) : task.milestone ? (
                      <span className="text-slate-400 text-[11px]">（マイルストーン）</span>
                    ) : canEdit ? (
                      <input
                        type="number"
                        min="0"
                        defaultValue={task.durationDays}
                        onBlur={(e) =>
                          onUpdateScheduleTemplate(task.id, {
                            durationDays: Number(e.target.value) || 0,
                          })
                        }
                        className="w-16 bg-white border border-slate-300 px-1 py-0.5 text-right font-mono text-xs"
                      />
                    ) : (
                      <span className="font-mono">{task.durationDays}日</span>
                    )}
                  </td>

                  {/* 属性 */}
                  <td className="py-1.5 px-3 text-center space-x-1">
                    {task.milestone && (
                      <span className="inline-block text-[10px] px-1 bg-purple-100 text-purple-800 border border-purple-200 font-bold">
                        期日
                      </span>
                    )}
                    {task.useExecutionPeriod && (
                      <span className="inline-block text-[10px] px-1 bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                        実施期間
                      </span>
                    )}
                    <span className="inline-block text-[10px] px-1 bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                      仮
                    </span>
                  </td>

                  {/* 連動ゲート */}
                  <td className="py-1.5 px-3">
                    {canEdit ? (
                      <select
                        value={task.gateId || ''}
                        onChange={(e) =>
                          onUpdateScheduleTemplate(task.id, {
                            gateId: (e.target.value as PhaseGate['id']) || undefined,
                          })
                        }
                        className="bg-white border border-slate-300 px-1 py-0.5 text-xs max-w-[120px]"
                      >
                        <option value="">なし</option>
                        <option value="gate-1">Gate 1</option>
                        <option value="gate-2">Gate 2</option>
                        <option value="gate-3">Gate 3</option>
                        <option value="gate-4">Gate 4</option>
                      </select>
                    ) : (
                      <span className="text-slate-600 font-medium">
                        {task.gateId ? task.gateId.toUpperCase() : '-'}
                      </span>
                    )}
                  </td>

                  {/* 削除 */}
                  {canEdit && (
                    <td className="py-1.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`タスク「${task.title}」を削除しますか？`)) {
                            onDeleteScheduleTemplate(task.id);
                          }
                        }}
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
  );
};

