/**
 * ガントスケジュール閲覧用 共有URL生成・解析ユーティリティ
 * 【STEP F要件準拠】
 * URLハッシュフラグメントに圧縮JSONを含めることで、バックエンド不要で共有を実現する。
 * 将来のサーバー方式移行時もこのファイルの実装を差し替えるだけで対応可能。
 */

import LZString from 'lz-string';
import { ScheduleItem } from '../types';

/** 共有用ペイロード定義 */
export interface SharePayload {
  v: 1;
  companyName: string;
  issuedAt: string;
  items: ScheduleItem[];
}

/**
 * 共有ペイロードから閲覧専用URL（ハッシュフラグメント付き）を生成する
 * @param p 共有ペイロード
 * @returns 閲覧専用フルURL
 */
export function buildShareUrl(p: SharePayload): string {
  const jsonStr = JSON.stringify(p);
  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  return `${window.location.origin}${window.location.pathname}#share=${compressed}`;
}

/**
 * 現在のURLの location.hash から共有ペイロードを復号・パースする
 * 失敗時や該当ハッシュが無い場合は null を返す
 * @returns 復号された SharePayload または null
 */
export function readSharePayload(): SharePayload | null {
  try {
    const hash = window.location.hash || '';
    if (!hash.includes('share=')) {
      return null;
    }
    // #share=... のクエリまたはハッシュ値を抽出
    const match = hash.match(/[#&]share=([^&]+)/);
    if (!match || !match[1]) {
      return null;
    }

    const compressed = match[1];
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (!decompressed) {
      return null;
    }

    const parsed = JSON.parse(decompressed) as SharePayload;
    if (
      parsed &&
      parsed.v === 1 &&
      typeof parsed.companyName === 'string' &&
      Array.isArray(parsed.items)
    ) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Failed to read share payload:', error);
    return null;
  }
}

