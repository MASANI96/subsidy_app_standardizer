import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

export type TermKey =
  | 'PL'
  | 'BS'
  | 'valueAdded'
  | 'CAGR'
  | 'baseFY'
  | 'currentFY'
  | 'perCapitaWage'
  | 'minWage'
  | 'solver'
  | 'gate'
  | 'mapping';

interface TermDefinition {
  title: string;
  shortDesc: string;
  example: string;
}

const TERM_DEFINITIONS: Record<TermKey, TermDefinition> = {
  PL: {
    title: 'PL（損益計算書）',
    shortDesc:
      '1年間の「売上」から「原価・経費」を引いて、いくら「利益」が出たかを表す成績表です。補助金では既存事業と新規（補助）事業に分けて計画を作ります。',
    example: '例：売上31億 − 原価・販管費29億 ＝ 営業利益1.9億',
  },
  BS: {
    title: 'BS（貸借対照表）',
    shortDesc:
      '決算日の時点で会社が持っている「資産（現金や機械）」と、「負債（借金など）＋純資産（自己資本）」のバランスを表す表です。左右が必ず同じ金額になります。',
    example: '左（資産合計）＝ 右（負債合計 ＋ 純資産合計）',
  },
  valueAdded: {
    title: '付加価値額',
    shortDesc:
      '会社が新しく生み出した儲けの合計です。補助金審査で最も重視される指標で、「営業利益 ＋ 人件費 ＋ 減価償却費」の足し算で決まります。',
    example: '赤字でも、人件費や設備の償却費があれば付加価値額はプラスになります。',
  },
  CAGR: {
    title: 'CAGR（年平均成長率）',
    shortDesc:
      '複数年のトータルの伸びを「1年あたり平均何％ずつ増えたか」に直した数値です。補助金では基準年度から計画最終年度までの伸び率が年4.0%以上など求められます。',
    example: '例：3年間で1.14倍に増えると CAGR 約4.4%/年（公募要件4.0%以上をクリア）',
  },
  baseFY: {
    title: '基準年度',
    shortDesc:
      '将来の成長率（CAGR）を測るときの「スタート地点」となる決算期です。原則として、補助事業（設備導入など）が完了する予定日を含む年度が自動設定されます。',
    example: '締切・採択・実施期間からシステムが自動算出します（手動修正も可能）。',
  },
  currentFY: {
    title: '申請時事業年度',
    shortDesc:
      '補助金を申請するまさに今（進行中）の決算年度です。直近の確定済み決算（Y0）の次の期にあたります。',
    example: '直近決算が2026年3月期の場合、2027年3月期が申請時事業年度です。',
  },
  perCapitaWage: {
    title: '一人当たり給与支給総額',
    shortDesc:
      '従業員に払った給与の合計を、従業員数で割った「社員1人あたりの年間平均給与」です。賃上げ要件ではこの平均額が毎年3.5%（特例6.0%）以上増える計画が必要です。',
    example: '例：給与総額2.7億円 ÷ 50名 ＝ 一人当たり540万円/年',
  },
  minWage: {
    title: '事業場内最低賃金 vs 地域別最低賃金',
    shortDesc:
      '都道府県ごとに国が定めた最低時給（地域別）よりも、自社内で一番低い時給（事業場内）を＋30円（賃上げ特例なら＋50円）以上高く保つルールです。',
    example: '例：地域別 1,100円 に対し、社内最低時給 1,160円 → 差額 +60円（適合）',
  },
  solver: {
    title: '要件達成・逆算シミュレーション（ソルバー）',
    shortDesc:
      '「基準年度の数値や過去実績は変えずに、将来計画（P1〜P3等）の賃上げ率や販売数量をどう調整すれば公募要件をすべて満たせるか」を自動で逆算提案する機能です。',
    example: '未達が出たときにワンクリックで達成ライン＋安全な「ほどよく範囲」を提案します。',
  },
  gate: {
    title: 'フェーズゲート（Gate 1〜4）',
    shortDesc:
      '工程の節目ごとの「関所（承認チェック）」です。前の工程を確定・合意してから次へ進むことで、後工程の申請書作成での数値ズレや手戻りを防ぎます。',
    example: '例：Gate 2「収支計画ロック」を通過すると申請書編集がロック解除されます。',
  },
  mapping: {
    title: 'タグ・マッピング（数値連動）',
    shortDesc:
      '申請書文章の中に `{設備投資額}` や `{3年後売上}` のような差し込みタグを埋め込む仕組みです。収支計画の数値が変わっても、タグ一括置換で常に最新数値と一致します。',
    example: '手書きによる「1億円 vs 9,500万円」などの転記ミスをゼロにします。',
  },
};

interface TermHelpProps {
  termKey: TermKey;
  label?: string;
  className?: string;
}

export const TermHelp: React.FC<TermHelpProps> = ({ termKey, label, className = '' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const def = TERM_DEFINITIONS[termKey];

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  if (!def) return null;

  return (
    <span ref={containerRef} className={`relative inline-flex items-center gap-1 ${className}`}>
      {label && <span>{label}</span>}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        title={`${def.title}のかんたん解説を見る`}
        aria-label={`${def.title}のかんたん解説`}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 hover:bg-blue-600 text-slate-700 hover:text-white transition-colors cursor-pointer shrink-0 align-middle"
      >
        <HelpCircle className="w-3 h-3" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed sm:absolute z-[80] left-4 right-4 sm:left-0 sm:right-auto top-24 sm:top-full sm:mt-1.5 w-auto sm:w-80 bg-white border-2 border-blue-600 shadow-xl p-3.5 text-left text-slate-800 rounded-sm"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
            <span className="text-xs font-bold text-blue-900">{def.title}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-700 font-normal">
            {def.shortDesc}
          </p>
          <div className="mt-2 bg-blue-50 border border-blue-100 px-2.5 py-1.5 text-[10px] text-blue-900 font-medium leading-snug">
            {def.example}
          </div>
        </div>
      )}
    </span>
  );
};
