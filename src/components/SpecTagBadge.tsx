import React from 'react';
import { Lock } from 'lucide-react';
import { EffectEstimateItem, Role } from '../types';

export const SpecTagBadge: React.FC<{ tag: string; className?: string }> = ({
  tag,
  className = '',
}) => {
  if (!tag || tag === '―') return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-300 whitespace-nowrap shrink-0 ${className}`}
      title={`クライアント業務指示書 対応要件: ${tag}`}
    >
      {tag}
    </span>
  );
};

export const ReadOnlyRoleBadge: React.FC<{
  role: Role;
  note?: string;
  className?: string;
}> = ({ role, note, className = '' }) => {
  const tooltip = note
    ? `現在ロール「${role}」では${note}となっています。編集する場合は画面上部の「操作ロール」を切り替えてください。`
    : `現在ロール「${role}」ではこの領域の入力・更新がロックされています。編集する場合は画面上部の「操作ロール」を切り替えてください。`;

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap shrink-0 cursor-help ${className}`}
    >
      <Lock className="w-3 h-3 text-slate-500 shrink-0" />
      <span>{note ? `${role}は${note}` : `${role}は閲覧のみ`}</span>
    </span>
  );
};

export function formatMinutesJa(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60}時間`;
  }
  if (minutes > 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}時間${m}分`;
  }
  return `${minutes}分`;
}

export const WorkspaceEffectBadge: React.FC<{
  estimate?: EffectEstimateItem;
}> = ({ estimate }) => {
  if (!estimate) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap shrink-0 tabular-nums"
      title="手作業による従来工程との所要時間比較（管理者設定で試算前提を変更可能）"
    >
      <span>
        従来 約{estimate.manualHours}時間 → 約{formatMinutesJa(estimate.systemMinutes)}（試算例（仮置き））
      </span>
    </span>
  );
};
