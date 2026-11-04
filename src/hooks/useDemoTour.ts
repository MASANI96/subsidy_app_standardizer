import { useCallback, useEffect, useRef, useState } from 'react';
import { driver, Driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  createInitialAppState,
  SAMPLE_MEETING_MINUTES,
} from '../data/initialData';
import { EditorExternalTarget } from '../components/SubsidyEditor';
import {
  AdminTabId,
  DocumentStatus,
  PhaseGate,
  Role,
  ScreenId,
  SubsidyAppState,
  SubsidyType,
  WorkspaceTabId,
} from '../types';
import { TOUR_SNAPSHOT_SESSION_KEY } from './useSubsidyStore';

interface UseDemoTourParams {
  state: SubsidyAppState;
  guideOpen: boolean;
  setGuideOpen: (open: boolean) => void;
  replaceState: (nextState: SubsidyAppState) => void;
  setRole: (role: Role) => void;
  setActiveScreen: (screen: ScreenId) => void;
  setWorkspaceTab: (tab: WorkspaceTabId) => void;
  setAdminTab: (tab: AdminTabId) => void;
  setEditorExternalTarget: (target: EditorExternalTarget | null) => void;
  selectProject: (
    projectId: string,
    openScreen?: ScreenId,
    tab?: WorkspaceTabId
  ) => void;
  updateRawHearingText: (
    projectId: string,
    rawText: string,
    sourceNote?: string
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
    status: DocumentStatus
  ) => void;
  runAICrossCheck: (projectId: string, subsidyType: SubsidyType) => void;
  setGatePassed: (
    projectId: string,
    gateId: PhaseGate['id'],
    isPassed: boolean
  ) => void;
  onNotify: (message: string) => void;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForSelector(
  selector: string,
  maxWaitMs = 1500
): Promise<Element | null> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const el = document.querySelector(selector);
    if (el) return el;
    await waitMs(45);
  }
  return document.querySelector(selector);
}

const DEMO_PROJECT_ID = 'proj-tech-precision';

export function useDemoTour({
  state,
  guideOpen,
  setGuideOpen,
  replaceState,
  setRole,
  setActiveScreen,
  setWorkspaceTab,
  setAdminTab,
  setEditorExternalTarget,
  selectProject,
  updateRawHearingText,
  importSampleHearingSheetExcel,
  generateMasterFromHearing,
  syncMasterToSubsidies,
  applyHearingDriversToForecast,
  lockFinancialPlan,
  unlockFinancialPlan,
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
          // Step 1: 3補助金親子構造（マッピング表）
          setRole('営業担当');
          selectProject(DEMO_PROJECT_ID);
          setActiveScreen('mapping');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-mapping-hierarchy"]');
          break;
        }
        case 1: {
          // Step 2: 案件ダッシュボードKPI・導入効果試算
          setRole('営業担当');
          setActiveScreen('projects');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-dashboard-kpi"]');
          break;
        }
        case 2: {
          // Step 3: 標準工程表・フェーズゲート
          setRole('営業担当');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'schedule');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-gantt-gates"]');
          break;
        }
        case 3: {
          // Step 4: 議事録・Excelヒアリングシート取込 → 定性4項目生成＆3補助金同期（Gate 1通過）
          setRole('営業担当');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'hearing');
          updateRawHearingText(
            DEMO_PROJECT_ID,
            SAMPLE_MEETING_MINUTES,
            '初回ヒアリング議事録（デモツアー自動取込）'
          );
          importSampleHearingSheetExcel(DEMO_PROJECT_ID);
          generateMasterFromHearing(DEMO_PROJECT_ID);
          syncMasterToSubsidies(DEMO_PROJECT_ID);
          await waitMs(180);
          await waitForSelector('[data-guide-id="guide-hearing-master"]');
          break;
        }
        case 4: {
          // Step 5: 数値計画の算定変数（単価・客数・削減工数・新規雇用）
          setRole('営業担当');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'hearing');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-hearing-variables"]');
          break;
        }
        case 5: {
          // Step 6: 【重要】Gate 2 未確定時の申請書エディタ全面ロックを体験
          unlockFinancialPlan(DEMO_PROJECT_ID);
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'editor');
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-editor-blocker"]');
          break;
        }
        case 6: {
          // Step 7: 収支計画マスター 売上・コスト算定根拠の反映
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'financial');
          applyHearingDriversToForecast(DEMO_PROJECT_ID);
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-fin-drivers"]');
          break;
        }
        case 7: {
          // Step 8: 公募要件（付加価値・賃上げ・規模別上限）自動判定
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'financial');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-fin-requirements"]');
          break;
        }
        case 8: {
          // Step 9: 補助金別 様式換算イメージ
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'financial');
          await waitMs(120);
          await waitForSelector('[data-guide-id="guide-fin-formats"]');
          break;
        }
        case 9: {
          // Step 10: 収支計画マスター確定ロック（Gate 2通過）
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'financial');
          lockFinancialPlan(DEMO_PROJECT_ID);
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-fin-lock"]');
          break;
        }
        case 10: {
          // Step 11: ロック解除後の申請書エディタ（文字数ゲージ・審査項目チェック）
          lockFinancialPlan(DEMO_PROJECT_ID);
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'editor');
          setEditorExternalTarget({
            subsidyType: '新事業進出補助金',
            sectionId: 'shin-3',
            nonce: Date.now(),
          });
          await waitMs(180);
          await waitForSelector('[data-guide-id="guide-editor-charlimit"]');
          break;
        }
        case 11: {
          // Step 12: 文章モジュール挿入＆保存による修正差異（Diff）自動記録
          lockFinancialPlan(DEMO_PROJECT_ID);
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'editor');
          setEditorExternalTarget({
            subsidyType: '新事業進出補助金',
            sectionId: 'shin-3',
            nonce: Date.now(),
          });
          appendTourModuleAndSave(
            DEMO_PROJECT_ID,
            '新事業進出補助金',
            '完成'
          );
          await waitMs(180);
          await waitForSelector('[data-guide-id="guide-editor-save"]');
          break;
        }
        case 12: {
          // Step 13: 定性・定量 自動数値突合＆AIクロスチェック実行（Gate 3通過）
          lockFinancialPlan(DEMO_PROJECT_ID);
          setRole('書類作成者');
          selectProject(DEMO_PROJECT_ID, 'workspace', 'consistency');
          runAICrossCheck(DEMO_PROJECT_ID, '新事業進出補助金');
          setGatePassed(DEMO_PROJECT_ID, 'gate-3', true);
          await waitMs(180);
          await waitForSelector('[data-guide-id="guide-consistency-ai"]');
          break;
        }
        case 13: {
          // Step 14: 3補助金マッピング対照表
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
        case 15: {
          // Step 16: 管理者設定（公募回バージョン管理・要件しきい値・差異分析）
          setRole('システム管理者');
          setAdminTab('thresholds');
          setActiveScreen('admin');
          await waitMs(150);
          await waitForSelector('[data-guide-id="guide-admin-rounds"]');
          break;
        }
        default:
          break;
      }

      return tourRunIdRef.current === runId;
    },
    [
      appendTourModuleAndSave,
      applyHearingDriversToForecast,
      generateMasterFromHearing,
      importSampleHearingSheetExcel,
      lockFinancialPlan,
      runAICrossCheck,
      selectProject,
      setActiveScreen,
      setAdminTab,
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
          title: 'Step 1/17｜3補助金の親子マスター構造【指示書 2】',
          description:
            '新事業進出補助金を「親マスター」とし、持続化補助金は【引き算・要約】、東京都事業は【要件追加】として1回の入力から3制度へ展開する全体設計です。',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-guide-id="guide-dashboard-kpi"]',
        popover: {
          title: 'Step 2/17｜案件ダッシュボードKPI・導入効果試算',
          description:
            '進行中案件数、申請締切14日以内アラート、フェーズゲート通過状況、ロール別の対応待ち件数を集約表示します。上部には手作業比の工数削減試算も提示します。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-gantt-gates"]',
        popover: {
          title: 'Step 3/17｜標準8週間工程表とフェーズゲート【指示書 4-⑥】',
          description:
            '実案件「株式会社テックプレシジョン」を開きました。顧客タスクと支援側タスクをW1〜W8で管理し、4つのフェーズゲートで手戻りを防止します。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-hearing-master"]',
        popover: {
          title:
            'Step 4/17｜議事録・Excel取込と定性4項目自動生成【指示書 4-①】',
          description:
            'ヒアリング議事録とExcelシートを取り込み、共通マスター定性4項目を自動生成して3補助金のベース文案へ一括同期しました（Gate 1 通過）。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-hearing-variables"]',
        popover: {
          title: 'Step 5/17｜数値計画の算定変数と根拠メモ【指示書 4-①】',
          description:
            '新事業客単価（50万円）・想定受注件数（160→280件）・削減作業時間（1,680時間/年）・新規雇用人数（計6名）とヒアリング根拠メモを一元管理します。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-editor-blocker"]',
        popover: {
          title: 'Step 6/17｜【重要体験】Gate 2 未確定時の申請書エディタロック',
          description:
            '収支計画マスター（Gate 2）が未確定の段階では、申請書エディタが全面ロックされます。「数字が変わって本文を全部書き直す」手戻りをシステム構造で防ぎます。',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '[data-guide-id="guide-fin-drivers"]',
        popover: {
          title: 'Step 7/17｜売上・コスト算定根拠の計画反映【指示書 4-②】',
          description:
            'ヒアリング変数の「客単価×受注件数」「削減時間×時間単価＋外注費削減」の計算式を明示し、ワンクリックで将来3ヶ年の売上計画へ反映しました。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-fin-requirements"]',
        popover: {
          title: 'Step 8/17｜公募要件・上下限の自動判定【指示書 4-②】',
          description:
            '付加価値額年率（+4.0%以上）・一人当たり給与年率・従業員規模別上限・下限750万円・賃上げ特例を自動判定し、要件未達時は即座に警告を表示します。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-fin-formats"]',
        popover: {
          title: 'Step 9/17｜3補助金 様式換算イメージへの自動変換【指示書 4-②】',
          description:
            '共通の財務データと投資内訳から、新事業進出・持続化・東京都それぞれの様式・勘定科目・経費区分へ重複入力なしで自動並べ替えを行います。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-fin-lock"]',
        popover: {
          title: 'Step 10/17｜収支計画マスター確定・Gate 2 通過',
          description:
            '収支計画マスターを確定ロックしました。これでGate 2が通過となり、申請書エディタの編集ロックが解除されます。',
          side: 'bottom',
          align: 'end',
        },
      },
      {
        element: '[data-guide-id="guide-editor-charlimit"]',
        popover: {
          title:
            'Step 11/17｜エディタ解禁・文字数ゲージ＆審査項目チェック【指示書 ゴール / 5】',
          description:
            'ロック解除された申請書エディタです。公募回ごとの指定文字数ゲージ（80%未満／適正／超過）と、審査項目キーワードの記載有無（記載あり✓）を自動判定します。',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-editor-save"]',
        popover: {
          title:
            'Step 12/17｜変数タグ置換モジュール挿入と修正差異（Diff）記録【指示書 4-③】',
          description:
            '投資回収モジュールを確定数値で自動置換して挿入・保存しました。AI初期文案からの人手修正は自動的に差異ログ（Diff）へ蓄積されます。',
          side: 'top',
          align: 'end',
        },
      },
      {
        element: '[data-guide-id="guide-consistency-ai"]',
        popover: {
          title:
            'Step 13/17｜定性・定量 自動数値突合＆AIクロスチェック【指示書 4-⑤】',
          description:
            '投資総額・申請額・売上・単価×客数・新規雇用人数を財務マスターと自動突合し、AIクロスチェック監査を実行して数値矛盾ゼロを確認しました（Gate 3 通過）。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-mapping-table"]',
        popover: {
          title: 'Step 14/17｜3補助金マッピング対照表【指示書 4-④】',
          description:
            '共通マスター項目が3補助金のどの申請項目へ「全文／要約／補強」および指定文字数で展開されるかを一覧表示します。セルクリックで該当エディタへ移動できます。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-prompts-generation"]',
        popover: {
          title: 'Step 15/17｜生成AI用プロンプト集【指示書 4-⑦】',
          description:
            '3補助金×各3セクションの文章生成プロンプト（計9本）と整合性チェック用プロンプトです。「マスター外の数値捏造禁止」ルールが標準内蔵されています。',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '[data-guide-id="guide-admin-rounds"]',
        popover: {
          title:
            'Step 16/17｜公募回バージョン管理・要件しきい値・差異分析【指示書 5】',
          description:
            '公募要領の改定時は公募回を複製し、要件しきい値（出典URL付）・審査項目・文字数上限・プロンプトをシステム改修なしでメンテナンスできます。',
          side: 'bottom',
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
          // Step 16 → Step 17（完了サマリーモーダル表示）
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
