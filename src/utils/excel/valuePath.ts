/**
 * オブジェクトからドット区切りのパス（例: 'periods.y0.pl.totalSales'）で値を取得するユーティリティ関数
 * 
 * @param obj 対象のオブジェクト
 * @param path ドット区切りのキーパス
 * @returns 取得された値（存在しない場合は undefined）
 */
export function getValueByPath(obj: any, path: string): unknown {
  if (!obj || typeof obj !== 'object' || !path || typeof path !== 'string') {
    return undefined;
  }

  const cleanPath = path.trim();
  if (!cleanPath) {
    return undefined;
  }

  // ドット区切り、および [index] や [key] の記法も考慮してプロパティ名を分割
  const parts = cleanPath
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

