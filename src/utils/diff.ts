/**
 * 計画版管理・差分比較ユーティリティ (diff.ts)
 * 【STEP C準拠】
 * PlanSnapshot 間の差分を再帰的平坦化により抽出し、比較結果を返す。
 * periods の fiscalInfo は比較対象外。
 */

import { PlanSnapshot } from '../types';

/**
 * オブジェクトを平坦化する
 * （periods の fiscalInfo は比較対象外としてスキップ）
 *
 * @param obj 対象オブジェクト
 * @param prefix パスのプレフィックス
 * @returns 平坦化されたキー・値マップ
 */
export function flatten(
  obj: any,
  prefix = ''
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  if (obj === null || obj === undefined) {
    result[prefix || 'root'] = '';
    return result;
  }

  if (typeof obj !== 'object') {
    result[prefix || 'root'] = obj;
    return result;
  }

  for (const key of Object.keys(obj)) {
    // periods の fiscalInfo は比較対象外
    if (key === 'fiscalInfo') {
      continue;
    }

    const currentPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value === null || value === undefined) {
      result[currentPath] = '';
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        result[currentPath] = '[]';
      } else {
        value.forEach((item, index) => {
          const itemPath = `${currentPath}[${index}]`;
          if (typeof item === 'object' && item !== null) {
            Object.assign(result, flatten(item, itemPath));
          } else {
            result[itemPath] = item;
          }
        });
      }
    } else if (typeof value === 'object') {
      Object.assign(result, flatten(value, currentPath));
    } else {
      result[currentPath] = value;
    }
  }

  return result;
}

export interface SnapshotDiffItem {
  path: string;
  before: any;
  after: any;
}

/**
 * 2つの PlanSnapshot の差分を抽出する
 *
 * @param a 比較元スナップショット（変更前）
 * @param b 比較先スナップショット（変更後）
 * @returns 差分項目のリスト
 */
export function diffSnapshots(
  a: PlanSnapshot,
  b: PlanSnapshot
): SnapshotDiffItem[] {
  const flatA = flatten(a);
  const flatB = flatten(b);

  const allKeys = new Set([...Object.keys(flatA), ...Object.keys(flatB)]);
  const diffs: SnapshotDiffItem[] = [];

  for (const key of Array.from(allKeys).sort()) {
    const valA = flatA[key];
    const valB = flatB[key];

    if (valA !== valB) {
      diffs.push({
        path: key,
        before: valA !== undefined ? valA : '(未設定)',
        after: valB !== undefined ? valB : '(未設定)',
      });
    }
  }

  return diffs;
}

