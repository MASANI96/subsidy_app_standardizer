import { useCallback, useEffect, useRef, useState } from 'react';
import { driver, Driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  createInitialAppState,
  DEMO_PROJECT_MARUMARU,
  SAMPLE_MEETING_MINUTES,
} from '../data/initialData';
import {
  Role,
  ScreenId,
  WorkspaceTabId,
  AdminTabId,
  DocumentStatus,
  PhaseGate,
  SubsidyAppState,
  SubsidyType,
} from '../types';
import { EditorExternalTarget } from '../components/SubsidyEditor';

const TOUR_SNAPSHOT_SESSION_KEY = 'subsidy_tour_pre_snapshot_v1';

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForSelector(selector: string, timeoutMs = 2500): Promise<Element | null> {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const el = document.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve(null);
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

export interface UseDemoTourParams {
  state: SubsidyAppState;
  guideOpen: boolean;
  setGuideOpen: (open: boolean) => void;
  replaceState: (newState: SubsidyAppState) => void;
  setRole: (role: Role) => void;
  setActiveScreen: (screen: ScreenId) => void;
  setWorkspaceTab: (tab: WorkspaceTabId) => void;
  setAdminTab: (tab: AdminTabId) => void;
  setEditorExternalTarget: (target: EditorExternalTarget | null) => void;
  selectProject: (
    projectId: string,
    initialScreen?: ScreenId,
    initialWorkspaceTab?: WorkspaceTabId
  ) => void;
  updateRawHearingText: (
    projectId: string,
    text: string,
    historyLabel?: string
  ) => void;
  importSampleHearingSheetExcel: (projectId: string) => void;
  generateMasterFromHearing: (projectId: string) => void;
  syncMasterToSubsidies: (projectId: string) => void;
  applyHearingDriversToForecast: (projectId: string) => void;
  lockFinancialPlan: (projectId: string) => void;
  unlockFinancialPlan: (projectId: string) => void;
  appendTourModuleAndSave: (
    projectId: string,
    subsidyType: SubsidyType,
    status?: DocumentStatus
  ) => void;
  runAICrossCheck: (projectId: string, subsidyType: SubsidyType) => void;
  setGatePassed: (
    projectId: string,
    gateId: PhaseGate['id'],
    passed: boolean
  ) => void;
  onNotify: (message: string) => void;
}

export function useDemoTour({
  state,
  guideOpen,
  setGuideOpen,
  replaceState,
  setRole,
  setActiveScreen,
  setWorkspaceTab,
  selectProject,
  updateRawHearingText,
  importSampleHearingSheetExcel,
  generateMasterFromHearing,
  syncMasterToSubsidies,
  lockFinancialPlan,
  unlockFinancialPlan,
  setEditorExternalTarget,
  appendTourModuleAndSave,
  runAICrossCheck,
  setGatePassed,
  onNotify,
}: UseDemoTourParams) {
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

  const driverRef = useRef<Driver | null>(null);
  const snapshotRef = useRef<SubsidyAppState | null>(null);
  const wasGuideOpenRef = useRef<boolean>(true);
  const enteringCompletionRef = useRef<boolean>(false);
  const programmaticDestroyRef = useRef<boolean>(false);
  const tourRunIdRef = useRef<number>(0);

  // 最新stateの参照（startDemoTour時点で確実に最新を取得するため）
  const latestStateRef = useRef<SubsidyAppState>(state);
  latestStateRef.current = state;
  const latestGuideOpenRef = useRef<boolean>(guideOpen);
  latestGuideOpenRef.current = guideOpen;

  const restorePreTourState = useCallback(
    (notifyMessage?: string) => {
      const snap = snapshotRef.current;
      if (snap) {
        replaceState(snap);
        snapshotRef.current = null;
      }
      try {
        window.sessionStorage.removeItem(TOUR_SNAPSHOT_SESSION_KEY);
      } catch {
        // Ignore sessionStorage error
      }
      setGuideOpen(wasGuideOpenRef.current);
      setEditorExternalTarget(null);
      setIsTourRunning(false);
      setIsCompletionModalOpen(false);
      if (notifyMessage) {
        onNotify(notifyMessage);
      }
    },
    [onNotify, replaceState, setEditorExternalTarget, setGuideOpen]
  );

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        programmaticDestroyRef.current = true;
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, []);

  const prepareStep = useCallback(
    async (stepIndex: number, runId: number): Promise<boolean> => {
      if (tourRunIdRef.current !== runId) return false;

      switch (stepIndex) {
        case 0: {
          // Step 1: マッピング親マスター構造
          setRole('営業担当');
          selectProject(DEMO_PROJECT_MARUMARU.id);
          setActiveScreen('mapping');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-mapping-hierarchy"]');
          break;
        }
        case 1: {
          // Step 2: 全体スケジュール工程表・フェーズゲート
          setRole('営業担当');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'schedule');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-gantt-gates"]');
          break;
        }
        case 2: {
          // Step 3: 共有URL発行ボタン
          setRole('営業担当');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'schedule');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-gantt-share"]');
          break;
        }
        case 3: {
          // Step 4: 議事録・Excelヒアリングシート取込 → 定性4項目生成
          setRole('営業担当');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'hearing');
          updateRawHearingText(
            DEMO_PROJECT_MARUMARU.id,
            SAMPLE_MEETING_MINUTES,
            '初回ヒアリング議事録（デモツアー自動取込）'
          );
          importSampleHearingSheetExcel(DEMO_PROJECT_MARUMARU.id);
          generateMasterFromHearing(DEMO_PROJECT_MARUMARU.id);
          syncMasterToSubsidies(DEMO_PROJECT_MARUMARU.id);
          await waitMs(180);
          await waitForSelector('[data-guide-id="guide-hearing-master"]');
          break;
        }
        case 4: {
          // Step 5: 数値計画の算定変数
          setRole('営業担当');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'hearing');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-hearing-variables"]');
          break;
        }
        case 5: {
          // Step 6: 決算書取込タブの見比べ画面
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'financial');
          await waitMs(150);
          const importBtn = document.querySelector<HTMLButtonElement>(
            'button[title*="決算書PDF取込"]'
          );
          importBtn?.click();
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-fin-import"]');
          break;
        }
        case 6: {
          // Step 7: 計画シミュレーションタブ
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'financial');
          await waitMs(150);
          const simTabBtn = document.querySelector<HTMLButtonElement>(
            '[data-guide-id="guide-fin-simulation"]'
          );
          simTabBtn?.click();
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-fin-simulation"]');
          break;
        }
        case 7: {
          // Step 8: 自動調整パネル（ソルバー）
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'financial');
          await waitMs(150);
          const simTabBtn = document.querySelector<HTMLButtonElement>(
            '[data-guide-id="guide-fin-simulation"]'
          );
          simTabBtn?.click();
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-fin-solver"]');
          break;
        }
        case 8: {
          // Step 9: 版管理ボタン
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'financial');
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-fin-versions"]');
          break;
        }
        case 9: {
          // Step 10: Excel出力ボタン
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'financial');
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-fin-export"]');
          break;
        }
        case 10: {
          // Step 11: Gate 2 未確定時の申請書エディタ全面ロック
          unlockFinancialPlan(DEMO_PROJECT_MARUMARU.id);
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'editor');
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-editor-blocker"]');
          break;
        }
        case 11: {
          // Step 12: 文章モジュール挿入＆保存による修正差異（Diff）自動記録
          lockFinancialPlan(DEMO_PROJECT_MARUMARU.id);
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'editor');
          setEditorExternalTarget({
            subsidyType: '新事業進出・ものづくり商業サービス補助金',
            sectionId: 'shin-3',
            nonce: Date.now(),
          });
          appendTourModuleAndSave(
            DEMO_PROJECT_MARUMARU.id,
            '新事業進出・ものづくり商業サービス補助金',
            '完成'
          );
          await waitMs(180);
          await waitForSelector('[data-guide-id="guide-editor-save"]');
          break;
        }
        case 12: {
          // Step 13: 定性・定量 自動数値突合＆AIクロスチェック実行
          lockFinancialPlan(DEMO_PROJECT_MARUMARU.id);
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_MARUMARU.id, 'workspace', 'consistency');
          runAICrossCheck(
            DEMO_PROJECT_MARUMARU.id,
            '新事業進出・ものづくり商業サービス補助金'
          );
          setGatePassed(DEMO_PROJECT_MARUMARU.id, 'gate-3', true);
          await waitMs(180);
          await waitForSelector('[data-guide-id="guide-consistency-ai"]');
          break;
        }
        case 13: {
          // Step 14: マッピング対照表
          setActiveScreen('mapping');
          await waitMs(140);
          await waitForSelector('[data-guide-id="guide-mapping-table"]');
          break;
        }
        case 14: {
          // Step 15: 生成AI用プロンプト集
          setActiveScreen('prompts');
          await waitMs(140);
          await waitForSelector('[data-guide-id="guide-prompts-generation"]');
          break;
        }
        default:
          break;
      }

      return tourRunIdRef.current === runId;
    },
    [
      appendTourModuleAndSave,
      generateMasterFromHearing,
      importSampleHearingSheetExcel,
      lockFinancialPlan,
      runAICrossCheck,
      selectProject,
      setActiveScreen,
      setEditorExternalTarget,
      setGatePassed,
      setRole,
      syncMasterToSubsidies,
      unlockFinancialPlan,
      updateRawHearingText,
    ]
  );

  const startDemoTour = useCallback(async () => {
    const runId = ++tourRunIdRef.current;

    if (driverRef.current) {
      programmaticDestroyRef.current = true;
      driverRef.current.destroy();
      driverRef.current = null;
      programmaticDestroyRef.current = false;
    }

    // 1. ツアー開始前のユーザー状態をディープコピー退避（sessionStorageにも保存してリロード保護）
    const snapshot: SubsidyAppState = JSON.parse(
      JSON.stringify(latestStateRef.current)
    );
    snapshotRef.current = snapshot;
    wasGuideOpenRef.current = latestGuideOpenRef.current;
    enteringCompletionRef.current = false;

    try {
      window.sessionStorage.setItem(
        TOUR_SNAPSHOT_SESSION_KEY,
        JSON.stringify(snapshot)
      );
    } catch {
      // Ignore sessionStorage quota error
    }

    // 2. ガイドパネルを折りたたみ、ツアー用にクリーンな初期状態から開始
    setGuideOpen(false);
    setIsCompletionModalOpen(false);
    setIsTourRunning(true);
    replaceState(createInitialAppState());

    const steps: DriveStep[] = [
      {
        element: '[data-guide-id="guide-mapping-hierarchy"]',
        popover: {
          title: 'Step 1/15｜マッピング親マスター構造',
          description:
            '新事業進出・ものづくり商業サービス補助金を親マスターとし、各様式・項目へ展開する全体設計です。',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-guide-id="guide-gantt-gates"]',
        popover: {
          title: 'Step 2/15｜全体スケジュール工程表とフェーズゲート',
          description:
            '実案件「株式会社○○」を開きました。顧客タスクと支援側タスクを全体スケジュールで管理し、フェーズゲートで手戻りを防止します。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-gantt-share"]',
        popover: {
          title: 'Step 3/15｜共有URL発行（工程表の共有）',
          description:
            '顧客や社内関係者へ工程表を共有するための閲覧専用URLを発行・クリップボードにコピーできます。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-hearing-master"]',
        popover: {
          title: 'Step 4/15｜議事録・Excel取込と定性4項目自動生成',
          description:
            'ヒアリング議事録とExcelシートを取り込み、共通マスター定性4項目を自動生成してベース文案へ一括同期しました（Gate 1 通過）。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-hearing-variables"]',
        popover: {
          title: 'Step 5/15｜数値計画の算定変数と根拠メモ',
          description:
            '新事業客単価・想定受注件数・削減作業時間・新規雇用人数とヒアリング根拠メモを一元管理します。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-fin-import"]',
        popover: {
          title: 'Step 6/15｜決算書PDF取込と見比べ画面',
          description:
            '決算書PDFのOCRテキストとシステム科目を左右で見比べ、確実な科目紐付けと確定ロックを行います。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-fin-simulation"]',
        popover: {
          title: 'Step 7/15｜計画シミュレーション',
          description:
            '売上・原価・人件費などの前提値を設定し、将来予測PLをリアルタイムに自動計算します。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-fin-solver"]',
        popover: {
          title: 'Step 8/15｜前提値の自動調整（ソルバー）',
          description:
            '公募要件の目標値（中央値）に向け、選択した前提変数を自動探索（逆算）で調整します。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-fin-versions"]',
        popover: {
          title: 'Step 9/15｜収支計画の版管理',
          description:
            '検討段階ごとの収支計画を版（バージョン）として保存し、差分比較や過去版への復元を行えます。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-fin-export"]',
        popover: {
          title: 'Step 10/15｜Excel出力',
          description:
            '公式インポート用フォーマットや顧客説明用サマリーをExcel形式で出力します。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-editor-blocker"]',
        popover: {
          title: 'Step 11/15｜Gate 2 未確定時の申請書エディタロック',
          description:
            '収支計画マスター（Gate 2）が未確定の段階では、申請書エディタが全面ロックされます。「数字が変わって本文を全部書き直す」手戻りをシステム構造で防ぎます。',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-guide-id="guide-editor-save"]',
        popover: {
          title: 'Step 12/15｜変数タグ置換モジュール挿入と修正差異（Diff）記録',
          description:
            '投資回収モジュールを確定数値で自動置換して挿入・保存しました。人手修正は自動的に差異ログ（Diff）へ蓄積されます。',
          side: 'top',
          align: 'end',
        },
      },
      {
        element: '[data-guide-id="guide-consistency-ai"]',
        popover: {
          title: 'Step 13/15｜定性・定量 自動数値突合＆AIクロスチェック',
          description:
            '投資総額・申請額・売上・賃上げ要件等を財務マスターと自動突合し、AIクロスチェック監査を実行して数値矛盾ゼロを確認しました（Gate 3 通過）。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-mapping-table"]',
        popover: {
          title: 'Step 14/15｜マッピング対照表',
          description:
            '共通マスター項目が新事業進出・ものづくり商業サービス補助金のどの申請項目へ展開されるかを一覧表示します。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-prompts-generation"]',
        popover: {
          title: 'Step 15/15｜生成AI用プロンプト集',
          description:
            '文章生成プロンプトと整合性チェック用プロンプトです。「マスター外の数値捏造禁止」ルールが標準内蔵されています。',
          side: 'top',
          align: 'start',
          nextBtnText: '完了サマリーへ →',
        },
      },
    ];

    const ready = await prepareStep(0, runId);
    if (!ready) return;

    const drv = driver({
      showProgress: false,
      animate: true,
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 0,
      nextBtnText: '次へ →',
      prevBtnText: '← 戻る',
      doneBtnText: '完了サマリーへ →',
      steps,
      onNextClick: async () => {
        const currentIdx = drv.getActiveIndex() ?? 0;
        if (currentIdx >= steps.length - 1) {
          enteringCompletionRef.current = true;
          programmaticDestroyRef.current = true;
          drv.destroy();
          programmaticDestroyRef.current = false;
          driverRef.current = null;
          setIsCompletionModalOpen(true);
          return;
        }
        const nextIdx = currentIdx + 1;
        const ok = await prepareStep(nextIdx, runId);
        if (ok && driverRef.current === drv) {
          drv.moveTo(nextIdx);
        }
      },
      onPrevClick: async () => {
        const currentIdx = drv.getActiveIndex() ?? 0;
        if (currentIdx <= 0) return;
        const prevIdx = currentIdx - 1;
        const ok = await prepareStep(prevIdx, runId);
        if (ok && driverRef.current === drv) {
          drv.moveTo(prevIdx);
        }
      },
      onDestroyStarted: () => {
        if (programmaticDestroyRef.current) {
          drv.destroy();
          return;
        }
        // ×ボタンまたはEscによる途中終了 → 即座にスナップショット復元
        tourRunIdRef.current++;
        drv.destroy();
        driverRef.current = null;
        if (!enteringCompletionRef.current) {
          restorePreTourState('デモデータをツアー開始前の状態に戻しました');
        }
      },
    });

    driverRef.current = drv;
    drv.drive(0);
  }, [prepareStep, replaceState, restorePreTourState, setGuideOpen]);

  const finishTourFromCompletionModal = useCallback(() => {
    enteringCompletionRef.current = false;
    restorePreTourState('デモデータをツアー開始前の状態に戻しました');
  }, [restorePreTourState]);

  return {
    isTourRunning,
    isCompletionModalOpen,
    startDemoTour,
    finishTourFromCompletionModal,
  };
}
