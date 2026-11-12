/**
 * スケジュール自動生成ユーティリティ (Schedule Builder)
 * 【STEP F要件準拠】
 * テンプレートと財務マスター・公募回枠情報から日付ベースの工程表を確定的に生成する
 */

import {
  ProjectFinancialMaster,
  ScheduleItem,
  ScheduleTemplateTask,
  SubsidyTrack,
} from '../types';

/**
 * 日付文字列 (YYYY-MM-DD) に日数を加減算して YYYY-MM-DD を返す
 * @param dateStr 基準日 (YYYY-MM-DD)
 * @param days 加算（または減算）する日数
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr || !dateStr.includes('-')) {
    dateStr = '2026-12-25';
  }
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 1;
  const day = parts[2] || 1;

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  const resY = date.getUTCFullYear();
  const resM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(date.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

/**
 * テンプレート・財務マスター・枠定義からスケジュール項目一覧を生成する
 * 
 * - 基準日：
 *   deadline = track.applicationDeadline
 *   adoption = track.adoptionDate
 *   grantDecision = fm.autoFiscalCalc.grantDecisionEstimatedDate
 *   completion = fm.autoFiscalCalc.projectCompletionEstimatedDate
 * - start = 基準日 + offsetDays、end = start + durationDays（useExecutionPeriod なら end = completion）
 *   milestone は start = end
 * - keep に同じ templateId で manual=true の項目があればそのまま使う
 * - templateId の無い手動追加の項目も末尾に残す
 * - status は keep の同じ templateId の値を引き継ぐ（無ければ 'not_started'）
 *
 * @param templates ガント標準テンプレートタスク一覧
 * @param fm 財務マスター
 * @param track 適用補助金枠定義
 * @param keep 現在のスケジュール項目（手動編集保持・ステータス引き継ぎ用）
 */
export function buildScheduleFromTemplate(
  templates: ScheduleTemplateTask[],
  fm: ProjectFinancialMaster,
  track: SubsidyTrack,
  keep?: ScheduleItem[]
): ScheduleItem[] {
  const deadline = track?.applicationDeadline || '2026-12-25';
  const adoption = track?.adoptionDate || '2027-02-28';
  const grantDecision =
    fm?.autoFiscalCalc?.grantDecisionEstimatedDate || '2027-03-31';
  const completion =
    fm?.autoFiscalCalc?.projectCompletionEstimatedDate || '2028-01-31';

  const anchorMap: Record<ScheduleTemplateTask['anchor'], string> = {
    deadline,
    adoption,
    grantDecision,
    completion,
  };

  const keepList = keep || [];
  const keepByTemplateId = new Map<string, ScheduleItem>();
  const customItemsWithoutTemplateId: ScheduleItem[] = [];

  for (const item of keepList) {
    if (item.templateId) {
      keepByTemplateId.set(item.templateId, item);
    } else {
      customItemsWithoutTemplateId.push(item);
    }
  }

  const generatedItems: ScheduleItem[] = templates.map((tmpl) => {
    const existing = keepByTemplateId.get(tmpl.id);

    // keep に同じ templateId で manual=true の項目があれば、その項目をそのまま使う
    if (existing && existing.manual) {
      return { ...existing };
    }

    const anchorDate = anchorMap[tmpl.anchor] || deadline;
    const start = addDaysToDateString(anchorDate, tmpl.offsetDays || 0);

    let end: string;
    if (tmpl.milestone) {
      end = start;
    } else if (tmpl.useExecutionPeriod) {
      end = completion;
    } else {
      end = addDaysToDateString(start, tmpl.durationDays || 0);
    }

    // status は keep の同じ templateId の値を引き継ぐ（無ければ 'not_started'）
    const status = existing ? existing.status : 'not_started';

    return {
      id: existing ? existing.id : tmpl.id,
      title: tmpl.title,
      phase: tmpl.phase,
      owner: tmpl.owner,
      start,
      end,
      milestone: !!tmpl.milestone,
      manual: false,
      templateId: tmpl.id,
      gateId: tmpl.gateId,
      status,
    };
  });

  // templateId の無い手動追加の項目も末尾に残す
  return [...generatedItems, ...customItemsWithoutTemplateId];
}

/** 事業化状況報告（長期の報告）かどうか */
export function isLongTermReportItem(item: { templateId?: string; title: string }): boolean {
  return (item.templateId ?? '').startsWith('st-post-rep-') || item.title.includes('事業化状況報告');
}

