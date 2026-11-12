/**
 * ガントチャート表示コンポーネント (ScheduleChart)
 * 【STEP F要件準拠】
 * - 左に表（タスク名・担当・開始・終了・進捗）、右にバー
 * - 「申請前」「採択後」の見出し行で区切る
 * - 今日の位置に赤い縦線
 * - milestone は◆、支援側（support）は濃紺、顧客（client）は琥珀色、manual には「手動」バッジ
 * - readOnly でないとき：タスク名・担当・進捗・開始/終了日付の編集、行追加、行削除
 */

import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ScheduleItem } from '../../types';
import { addDaysToDateString } from '../../utils/scheduleBuilder';

export interface ScheduleChartProps {
  items: ScheduleItem[];
  viewMode: 'month' | 'week';
  readOnly: boolean;
  onChange?(items: ScheduleItem[]): void;
}

/** YYYY-MM-DD から UTC Date を生成 */
function parseDateUtc(dateStr: string): Date {
  if (!dateStr || !dateStr.includes('-')) {
    return new Date(Date.UTC(2026, 0, 1));
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
}

/** 今日の日付文字列 (YYYY-MM-DD) を取得 */
function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${date}`;
}

export const ScheduleChart: React.FC<ScheduleChartProps> = ({
  items,
  viewMode,
  readOnly,
  onChange,
}) => {
  const todayStr = useMemo(() => getTodayString(), []);
  const todayDate = useMemo(() => parseDateUtc(todayStr), [todayStr]);

  // 全体の日付範囲（最小開始日〜最大終了日）を計算
  const { minDate, totalDays, monthsHeader, weeksHeader, pxPerDay } = useMemo(() => {
    let minTime = todayDate.getTime();
    let maxTime = todayDate.getTime();

    if (items.length > 0) {
      minTime = Math.min(...items.map((it) => parseDateUtc(it.start).getTime()));
      maxTime = Math.max(...items.map((it) => parseDateUtc(it.end).getTime()));
    }

    // 前後に少し余裕を持たせる（開始月の1日〜終了月の末日+14日）
    const minD = new Date(minTime);
    minD.setUTCDate(1); // 月初に合わせる

    const maxD = new Date(maxTime);
    maxD.setUTCDate(maxD.getUTCDate() + 14);

    const startUtc = minD.getTime();
    const endUtc = maxD.getTime();
    const days = Math.max(30, Math.ceil((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1);

    // 1日あたりのピクセル幅（月表示は4px、週表示は14px）
    const dayPx = viewMode === 'month' ? 4 : 14;

    // 月ヘッダー計算
    const mHeaders: { label: string; left: number; width: number }[] = [];
    const currMonthD = new Date(minD);
    while (currMonthD.getTime() <= maxD.getTime()) {
      const year = currMonthD.getUTCFullYear();
      const month = currMonthD.getUTCMonth();
      const nextMonthD = new Date(Date.UTC(year, month + 1, 1));

      const monthStartDays = Math.max(
        0,
        Math.floor((currMonthD.getTime() - startUtc) / (1000 * 60 * 60 * 24))
      );
      const monthEndDays = Math.min(
        days,
        Math.floor((nextMonthD.getTime() - startUtc) / (1000 * 60 * 60 * 24))
      );
      const mDays = monthEndDays - monthStartDays;

      if (mDays > 0) {
        mHeaders.push({
          label: `${year}年${month + 1}月`,
          left: monthStartDays * dayPx,
          width: mDays * dayPx,
        });
      }
      currMonthD.setUTCMonth(currMonthD.getUTCMonth() + 1);
      currMonthD.setUTCDate(1);
    }

    // 週ヘッダー計算 (週表示用: 7日ごと)
    const wHeaders: { label: string; left: number; width: number }[] = [];
    if (viewMode === 'week') {
      for (let dayOffset = 0; dayOffset < days; dayOffset += 7) {
        const d = new Date(startUtc + dayOffset * 24 * 60 * 60 * 1000);
        const label = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
        wHeaders.push({
          label,
          left: dayOffset * dayPx,
          width: 7 * dayPx,
        });
      }
    }

    return {
      minDate: minD,
      totalDays: days,
      monthsHeader: mHeaders,
      weeksHeader: wHeaders,
      pxPerDay: dayPx,
    };
  }, [items, todayDate, viewMode]);

  // 今日の赤い線の位置
  const todayOffsetDays = Math.floor(
    (todayDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const todayLeftPx = todayOffsetDays >= 0 ? todayOffsetDays * pxPerDay : null;
  const chartWidth = totalDays * pxPerDay;

  // 編集ハンドラ
  const handleUpdateItem = (id: string, updates: Partial<ScheduleItem>) => {
    if (!onChange) return;
    const next = items.map((it) => {
      if (it.id !== id) return it;
      const isDateChanged =
        (updates.start !== undefined && updates.start !== it.start) ||
        (updates.end !== undefined && updates.end !== it.end);
      return {
        ...it,
        ...updates,
        manual: isDateChanged ? true : it.manual,
      };
    });
    onChange(next);
  };

  // 削除ハンドラ
  const handleDeleteItem = (item: ScheduleItem) => {
    if (!onChange) return;
    if (window.confirm(`タスク「${item.title}」を削除しますか？`)) {
      onChange(items.filter((it) => it.id !== item.id));
    }
  };

  // 行追加ハンドラ
  const handleAddItem = (phase: 'pre' | 'post') => {
    if (!onChange) return;
    const start = todayStr;
    const end = addDaysToDateString(todayStr, 7);
    const newItem: ScheduleItem = {
      id: `task-custom-${Date.now()}`,
      title: '新規タスク',
      phase,
      owner: 'support',
      start,
      end,
      milestone: false,
      manual: true,
      status: 'not_started',
    };
    onChange([...items, newItem]);
  };

  const preItems = items.filter((it) => it.phase === 'pre');
  const postItems = items.filter((it) => it.phase === 'post');

  // タスクの開始・幅の計算
  const getItemBarGeometry = (item: ScheduleItem) => {
    const sDate = parseDateUtc(item.start);
    const eDate = parseDateUtc(item.end);
    const sDays = Math.max(
      0,
      Math.floor((sDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const eDays = Math.max(
      sDays,
      Math.floor((eDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const left = sDays * pxPerDay;
    const durDays = Math.max(1, eDays - sDays + 1);
    const width = Math.max(item.milestone ? 16 : 8, durDays * pxPerDay);
    return { left, width };
  };

  // 行の描画
  const renderRow = (item: ScheduleItem) => {
    const isClient = item.owner === 'client';
    const isCompleted = item.status === 'completed';
    const { left, width } = getItemBarGeometry(item);

    return (
      <div
        key={item.id}
        className="flex border-b border-slate-200 hover:bg-slate-50/50 transition-colors h-11 items-center"
      >
        {/* 左側: 表（固定列） */}
        <div className="w-[520px] shrink-0 flex items-center gap-2 px-3 text-xs border-r border-slate-200">
          {/* タスク名 & 手動バッジ */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 pr-1">
            {readOnly ? (
              <span
                className={`truncate font-medium ${
                  isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
                }`}
                title={item.title}
              >
                {item.title}
              </span>
            ) : (
              <input
                type="text"
                value={item.title}
                onChange={(e) =>
                  handleUpdateItem(item.id, { title: e.target.value })
                }
                className="w-full px-1.5 py-0.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-800"
                placeholder="タスク名"
              />
            )}
            {item.manual && (
              <span
                className="shrink-0 text-[10px] px-1 py-0.2 text-amber-900 bg-amber-100 border border-amber-300 rounded font-semibold"
                title="手動で日付または項目が変更されています"
              >
                仮・手動
              </span>
            )}
          </div>

          {/* 担当区分 */}
          <div className="w-20 shrink-0">
            {readOnly ? (
              <span
                className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold border rounded ${
                  isClient
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                {isClient ? '顧客' : '支援側'}
              </span>
            ) : (
              <select
                aria-label={`${item.title}の担当者`}
                value={item.owner}
                onChange={(e) =>
                  handleUpdateItem(item.id, {
                    owner: e.target.value as 'support' | 'client',
                  })
                }
                className="w-full text-[11px] border border-slate-300 rounded px-1 py-0.5 bg-white text-slate-800 cursor-pointer"
              >
                <option value="support">支援側</option>
                <option value="client">顧客</option>
              </select>
            )}
          </div>

          {/* 開始日・終了日 */}
          <div className="w-40 shrink-0 flex items-center gap-1 text-[11px]">
            {readOnly ? (
              <span className="font-mono text-slate-600">
                {item.start} ~ {item.end}
              </span>
            ) : (
              <>
                <input
                  type="date"
                  aria-label={`${item.title}の開始日`}
                  value={item.start}
                  onChange={(e) =>
                    handleUpdateItem(item.id, { start: e.target.value })
                  }
                  className="w-[74px] px-0.5 py-0.5 text-[10px] font-mono border border-slate-300 rounded bg-white"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="date"
                  aria-label={`${item.title}の終了日`}
                  value={item.end}
                  onChange={(e) =>
                    handleUpdateItem(item.id, { end: e.target.value })
                  }
                  className="w-[74px] px-0.5 py-0.5 text-[10px] font-mono border border-slate-300 rounded bg-white"
                />
              </>
            )}
          </div>

          {/* 進捗状態 */}
          <div className="w-20 shrink-0">
            {readOnly ? (
              <span
                className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : item.status === 'in_progress'
                      ? 'bg-sky-50 text-sky-800 border-sky-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {isCompleted
                  ? '完了'
                  : item.status === 'in_progress'
                    ? '進行中'
                    : '未着手'}
              </span>
            ) : (
              <select
                aria-label={`${item.title}の進捗`}
                value={item.status}
                onChange={(e) =>
                  handleUpdateItem(item.id, {
                    status: e.target.value as ScheduleItem['status'],
                  })
                }
                className={`w-full text-[11px] font-medium border rounded px-1 py-0.5 cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : item.status === 'in_progress'
                      ? 'bg-sky-50 text-sky-900 border-sky-300'
                      : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                <option value="not_started">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="completed">完了</option>
              </select>
            )}
          </div>

          {/* 削除ボタン（readOnlyでないとき） */}
          {!readOnly && (
            <div className="w-6 shrink-0 flex justify-center">
              <button
                type="button"
                onClick={() => handleDeleteItem(item)}
                className="text-slate-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                title="タスクを削除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 右側: ガントバー（横スクロール内） */}
        <div
          className="relative h-full shrink-0"
          style={{ width: `${chartWidth}px` }}
        >
          {/* 今日の縦線 */}
          {todayLeftPx !== null && (
            <div
              className="absolute top-0 bottom-0 w-[1.5px] bg-red-400 z-10 pointer-events-none"
              style={{ left: `${todayLeftPx}px` }}
            />
          )}

          {/* バー描画 */}
          {item.milestone ? (
            <div
              className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center z-15"
              style={{ left: `${left}px` }}
              title={`【マイルストーン】${item.title} (${item.start})`}
            >
              <div
                className={`w-3.5 h-3.5 rotate-45 border ${
                  isClient
                    ? 'bg-amber-500 border-amber-600'
                    : 'bg-slate-900 border-slate-950'
                } ${isCompleted ? 'ring-2 ring-emerald-400' : ''}`}
              />
              <span className="text-[10px] text-slate-700 ml-2 whitespace-nowrap font-medium select-none">
                ◆ {item.title}
              </span>
            </div>
          ) : (
            <div
              className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-xs flex items-center px-1.5 text-[10px] text-white font-medium truncate select-none shadow-xs transition-opacity z-12 ${
                isClient
                  ? isCompleted
                    ? 'bg-amber-600 opacity-75'
                    : 'bg-amber-500'
                  : isCompleted
                    ? 'bg-slate-700 opacity-75'
                    : 'bg-slate-900'
              }`}
              style={{ left: `${left}px`, width: `${width}px` }}
              title={`${item.title} (${item.start} ~ ${item.end})`}
            >
              <span className="truncate">{item.title}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // セクション見出しの描画
  const renderSectionHeader = (
    phase: 'pre' | 'post',
    title: string,
    count: number
  ) => (
    <div className="flex bg-slate-100/90 border-b border-slate-200 h-8 items-center text-xs font-bold text-slate-800">
      <div className="w-[520px] shrink-0 px-3 flex items-center justify-between border-r border-slate-200">
        <span>
          {title} ({count}件)
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={() => handleAddItem(phase)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            タスクを追加
          </button>
        )}
      </div>
      <div
        className="relative h-full shrink-0"
        style={{ width: `${chartWidth}px` }}
      >
        {todayLeftPx !== null && (
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-red-400 z-10 pointer-events-none"
            style={{ left: `${todayLeftPx}px` }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full border border-slate-200 bg-white">
      {/* 全体の横スクロールコンテナ */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${520 + chartWidth}px` }}>
          {/* ヘッダー行 */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 h-10 items-center">
            {/* 左側ヘッダー */}
            <div className="w-[520px] shrink-0 flex items-center gap-2 px-3 border-r border-slate-200">
              <span className="flex-1">工程タスク名</span>
              <span className="w-20">担当</span>
              <span className="w-40">期間（開始〜終了）</span>
              <span className="w-20">進捗</span>
              {!readOnly && <span className="w-6 text-center">操作</span>}
            </div>

            {/* 右側タイムラインヘッダー */}
            <div
              className="relative h-full shrink-0 select-none"
              style={{ width: `${chartWidth}px` }}
            >
              {/* 月ヘッダー */}
              {monthsHeader.map((m, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 h-5 border-r border-slate-200 px-2 text-[11px] font-bold text-slate-700 flex items-center overflow-hidden"
                  style={{ left: `${m.left}px`, width: `${m.width}px` }}
                >
                  <span className="truncate">{m.label}</span>
                </div>
              ))}

              {/* 週ヘッダー (週モード時のみ) */}
              {viewMode === 'week' && (
                <div className="absolute bottom-0 left-0 right-0 h-5 flex border-t border-slate-200 text-[10px] text-slate-500 font-mono">
                  {weeksHeader.map((w, idx) => (
                    <div
                      key={idx}
                      className="absolute bottom-0 h-full border-r border-slate-200 px-1 flex items-center"
                      style={{ left: `${w.left}px`, width: `${w.width}px` }}
                    >
                      <span>{w.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 今日の赤いインジケーター */}
              {todayLeftPx !== null && (
                <div
                  className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 z-30 pointer-events-none"
                  style={{ left: `${todayLeftPx}px` }}
                >
                  <span className="absolute -top-1 -left-5 bg-red-600 text-white text-[9px] font-bold px-1 rounded shadow-xs whitespace-nowrap">
                    今日
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 申請前セクション */}
          {renderSectionHeader('pre', '申請前フェーズ（採択前）', preItems.length)}
          {preItems.map((item) => renderRow(item))}

          {/* 採択後セクション */}
          {renderSectionHeader('post', '採択後フェーズ（交付〜事業化報告）', postItems.length)}
          {postItems.map((item) => renderRow(item))}
        </div>
      </div>
    </div>
  );
};

