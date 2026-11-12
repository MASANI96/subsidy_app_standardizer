/**
 * ガントスケジュール閲覧専用画面 (ShareView)
 * 【STEP F要件準拠】
 * - 共有URLから読み取ったペイロードを表示する閲覧専用画面
 * - useSubsidyStore は使わず、独立して動作
 * - ヘッダー：社名、「全体スケジュール（閲覧専用）」、発行日時
 * - ナビゲーション・編集ボタンは一切非表示
 * - ScheduleChart (readOnly) と月／週の切替のみ
 * - payload が無効な場合は再発行依頼の警告を表示
 */

import React, { useState } from 'react';
import { Calendar, Eye } from 'lucide-react';
import { SharePayload } from '../../utils/share';
import { isLongTermReportItem } from '../../utils/scheduleBuilder';
import { ScheduleChart } from './ScheduleChart';

export interface ShareViewProps {
  payload: SharePayload | null;
}

export const ShareView: React.FC<ShareViewProps> = ({ payload }) => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [rangeMode, setRangeMode] = useState<'core' | 'all'>('core');

  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-rose-200 p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            URLが無効です
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            共有URLのデータが破損しているか、期限切れの可能性があります。
            担当者に再発行を依頼してください。
          </p>
        </div>
      </div>
    );
  }

  const displayItems =
    rangeMode === 'core' ? payload.items.filter((it) => !isLongTermReportItem(it)) : payload.items;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 閲覧専用ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                <Eye className="w-3.5 h-3.5 text-sky-600" />
                全体スケジュール（閲覧専用）
              </span>
              <span>·</span>
              <span>発行日時: {payload.issuedAt}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {payload.companyName}
            </h1>
          </div>

          {/* 月 / 週 切り替えコントロール */}
          <div className="flex items-center gap-2">
            {/* 表示範囲 切替 */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 border border-slate-200 rounded text-xs">
              <span className="text-slate-500 pl-1.5">範囲:</span>
              <button
                type="button"
                onClick={() => setRangeMode('core')}
                className={`px-2 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                  rangeMode === 'core' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                申請〜精算
              </button>
              <button
                type="button"
                onClick={() => setRangeMode('all')}
                className={`px-2 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                  rangeMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全期間（事業化状況報告を含む）
              </button>
            </div>

            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              表示単位:
            </span>
            <div className="inline-flex rounded border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                月単位
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 font-medium rounded transition-colors cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                週単位
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-4">
        {/* 凡例バー */}
        <div className="bg-white border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-600 rounded-xs inline-block" />
              顧客担当タスク（書類準備・意思決定）
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 bg-slate-900 rounded-xs inline-block" />
              支援側タスク（分析・執筆・監査）
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-slate-900 rotate-45 inline-block" />
              マイルストーン
            </span>
          </div>
          <span className="text-slate-400">※ この画面は閲覧専用です（編集不可）</span>
        </div>

        {/* ガントチャート本体 */}
        <ScheduleChart
          items={displayItems}
          viewMode={viewMode}
          readOnly={true}
        />
      </main>
    </div>
  );
};

