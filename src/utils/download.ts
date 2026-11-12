/**
 * ブラウザ上で Blob データをファイルとしてダウンロードさせるユーティリティ関数
 *
 * @param blob ダウンロード対象の Blob オブジェクト
 * @param fileName ダウンロード時の保存ファイル名
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();

  // クリーンアップ
  setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, 100);
}

