/**
 * ストレージ管理モジュール (Storage Service)
 * 厳守事項5: 案件データ・設定は localStorage、PDF・xlsx等のファイルは IndexedDB に保存する。
 * ストレージ処理をこのモジュールに集約。
 */

const DB_NAME = 'SubsidyAppletDB';
const DB_VERSION = 1;
const STORE_FILES = 'attached_files';

/** IndexedDB の初期化 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredFileRecord {
  id: string; // ファイルの一意識別子
  projectId: string; // 案件ID
  fileName: string; // ファイル名
  fileType: string; // MIMEタイプ
  fileSize: number; // バイト数
  data: ArrayBuffer | Blob; // 実バイナリ
  uploadedAt: string; // アップロード日時
  memo?: string; // 備考
}

/** IndexedDB にファイルを保存 */
export async function saveFileToIndexedDB(record: StoredFileRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB からファイルを取得 */
export async function getFileFromIndexedDB(id: string): Promise<StoredFileRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readonly');
    const store = tx.objectStore(STORE_FILES);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB から特定案件のファイル一覧を取得 */
export async function listFilesForProject(projectId: string): Promise<StoredFileRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readonly');
    const store = tx.objectStore(STORE_FILES);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result as StoredFileRecord[]) || [];
      resolve(all.filter((f) => f.projectId === projectId));
    };
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB からファイルを削除 */
export async function deleteFileFromIndexedDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    const store = tx.objectStore(STORE_FILES);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * LocalStorage ヘルパー
 */
export function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`LocalStorage read error for key "${key}":`, err);
    return fallback;
  }
}

export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`LocalStorage write error for key "${key}":`, err);
  }
}

/**
 * 設定・案件データのJSONエクスポート
 */
export function exportDataAsJsonFile(data: unknown, fileName = 'subsidy_settings_backup.json'): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 設定・案件データのJSONファイル読み込み
 */
export function readJsonFromFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        resolve(parsed);
      } catch (err) {
        reject(new Error('JSONパースに失敗しました。ファイル形式を確認してください。'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
