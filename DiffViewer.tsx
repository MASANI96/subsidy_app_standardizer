import React, { useMemo } from 'react';

interface DiffToken {
  type: 'equal' | 'removed' | 'added';
  text: string;
}

/**
 * Splits Japanese / alphanumeric business prose into natural semantic tokens
 * so visual diff highlights clean phrases and figures rather than noisy single characters.
 */
function tokenizeJapaneseText(text: string): string[] {
  if (!text) return [];
  const pattern =
    /[0-9０-９,，.．]+(?:%|％|万円|億円|円|年|ヶ月|日|名|台|倍|ポイント)?|[A-Za-z0-9_/-]+|[一-龠々〆ヵヶ]+|[ぁ-んー]+|[ァ-ヴー]+|[、。！？「」『』（）()・：\s]+|./gu;
  return text.match(pattern) ?? [text];
}

function computeTokenDiff(oldText: string, newText: string): DiffToken[] {
  const a = tokenizeJapaneseText(oldText);
  const b = tokenizeJapaneseText(newText);
  const m = a.length;
  const n = b.length;

  // LCS dynamic programming table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const rawOps: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      rawOps.push({ type: 'equal', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rawOps.push({ type: 'removed', text: a[i] });
      i++;
    } else {
      rawOps.push({ type: 'added', text: b[j] });
      j++;
    }
  }
  while (i < m) {
    rawOps.push({ type: 'removed', text: a[i++] });
  }
  while (j < n) {
    rawOps.push({ type: 'added', text: b[j++] });
  }

  // Merge consecutive tokens of the same type for clean visual spans
  const merged: DiffToken[] = [];
  for (const op of rawOps) {
    const prev = merged[merged.length - 1];
    if (prev && prev.type === op.type) {
      prev.text += op.text;
    } else {
      merged.push({ ...op });
    }
  }
  return merged;
}

interface DiffViewerProps {
  aiText: string;
  humanText: string;
  compact?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  aiText,
  humanText,
  compact = false,
}) => {
  const diffTokens = useMemo(
    () => computeTokenDiff(aiText, humanText),
    [aiText, humanText]
  );

  const charDelta = humanText.length - aiText.length;

  return (
    <div className="border border-slate-200 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {/* Left: AI Original Output */}
        <div className={compact ? 'p-3' : 'p-4'}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">
              AI初期出力文面（修正前）
            </span>
            <span className="font-mono tabular-nums text-slate-500">
              {aiText.length} 文字
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
            {diffTokens
              .filter((t) => t.type !== 'added')
              .map((token, idx) =>
                token.type === 'removed' ? (
                  <span
                    key={idx}
                    className="bg-rose-100 text-rose-900 line-through decoration-rose-400 px-0.5"
                  >
                    {token.text}
                  </span>
                ) : (
                  <span key={idx}>{token.text}</span>
                )
              )}
          </p>
        </div>

        {/* Right: Human Final Output */}
        <div className={compact ? 'p-3 bg-slate-50/40' : 'p-4 bg-slate-50/40'}>
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2 mb-2.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              担当者修正文面（保存確定版）
            </span>
            <span className="font-mono tabular-nums text-slate-600">
              {humanText.length} 文字（
              {charDelta >= 0 ? `+${charDelta}` : charDelta}）
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
            {diffTokens
              .filter((t) => t.type !== 'removed')
              .map((token, idx) =>
                token.type === 'added' ? (
                  <span
                    key={idx}
                    className="bg-emerald-100 text-emerald-950 font-medium underline decoration-emerald-500 px-0.5"
                  >
                    {token.text}
                  </span>
                ) : (
                  <span key={idx}>{token.text}</span>
                )
              )}
          </p>
        </div>
      </div>
    </div>
  );
};
