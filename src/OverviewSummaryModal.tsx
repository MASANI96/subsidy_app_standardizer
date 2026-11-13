import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  FileSpreadsheet,
  GitBranch,
  Layers,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

interface OverviewSummaryModalProps {
  mode: 'overview' | 'summary' | null;
  onClose: () => void;
  onOpenStep?: (stepNumber: number) => void;
}

export const OverviewSummaryModal: React.FC<OverviewSummaryModalProps> = ({
  mode,
  onClose,
  onOpenStep,
}) => {
  if (!mode) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white border border-slate-300 shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-blue-300 uppercase tracking-wider">
              {mode === 'overview'
                ? 'Script 01 / 全体構成と業務課題の解決アプローチ'
                : 'Script 11 / 全体まとめ・本番化に向けた確認事項'}
            </div>
            <h2 className="text-base font-bold mt-0.5">
              {mode === 'overview'
                ? '補助金申請支援標準化システム：全体構成・5ステップ俯瞰図'
                : 'ご説明まとめ：標準化アーキテクチャと本番化の確認事項'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs text-slate-800">
          {mode === 'overview' ? (
            <>
              {/* 4つの課題と解決方針 */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  1. 解決したい4つの現場課題とシステム化アプローチ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <div className="font-bold text-slate-900">
                      ① 属人化・手戻り（工程が見えない）
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      <strong>→ 標準工程表（8週/完了まで）＋ Gate 1〜4ロック制御</strong>により、前工程の合意なしに後続作成へ進めない仕組みを構築。
                    </p>
                  </div>
                  <div className="border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <div className="font-bold text-slate-900">
                      ② 財務数値の計算ミス・公募要件の見落とし
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      <strong>→ 確定的シミュレーション計算エンジン（円単位整数）</strong>により、付加価値額CAGR・給与CAGR・最賃・上限をリアルタイム判定。
                    </p>
                  </div>
                  <div className="border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <div className="font-bold text-slate-900">
                      ③ 決算書PDFからの手入力負担・科目揺れ
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      <strong>→ 決算書PDF読取・見比べ・企業別科目対応表の学習</strong>により、過去3期の正確な実績値を根拠PDF付きで取込。
                    </p>
                  </div>
                  <div className="border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <div className="font-bold text-slate-900">
                      ④ 申請書と収支計画の数値食い違い・転記漏れ
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      <strong>→ 単一マスター（ヒアリング＋収支計画）からのタグ自動差込＆整合性自動監査</strong>で数値の不整合を機械的にゼロ化。
                    </p>
                  </div>
                </div>
              </div>

              {/* 5ステップ業務フロー */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-blue-600" />
                  2. 標準化された申請支援 5ステップ・ワークフロー
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  {[
                    {
                      step: 'STEP 1',
                      title: '工程＆ヒアリング',
                      desc: '標準工程共有・議事録＋算定変数をマスター化（Gate 1）',
                      guideStep: 3,
                    },
                    {
                      step: 'STEP 2',
                      title: '決算書PDF取込',
                      desc: '過去3期PDFを科目対応表で見比べ確定',
                      guideStep: 4,
                    },
                    {
                      step: 'STEP 3',
                      title: '計画シミュレーション',
                      desc: '前提変更→即判定・逆算・版比較・確定ロック（Gate 2）',
                      guideStep: 5,
                    },
                    {
                      step: 'STEP 4',
                      title: '申請書AI生成',
                      desc: '定性＋定量をタグ連動で下書き・人間レビュー',
                      guideStep: 8,
                    },
                    {
                      step: 'STEP 5',
                      title: '整合性監査・出力',
                      desc: '数値突合チェック（Gate 3）＆公式Excel出力',
                      guideStep: 9,
                    },
                  ].map((s, idx) => (
                    <div
                      key={s.step}
                      className="border border-blue-200 bg-blue-50/50 p-3 flex flex-col justify-between relative"
                    >
                      <div>
                        <div className="text-[10px] font-bold font-mono text-blue-700">
                          {s.step}
                        </div>
                        <div className="font-bold text-slate-900 mt-0.5">{s.title}</div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {s.desc}
                        </p>
                      </div>
                      {onOpenStep && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenStep(s.guideStep);
                          }}
                          className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                        >
                          <span>該当章へ移動</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {idx < 4 && (
                        <ArrowRight className="hidden md:block w-3.5 h-3.5 text-blue-400 absolute -right-2.5 top-1/2 -translate-y-1/2 bg-white rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Script 11: まとめ */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                <div className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  本モックでご確認いただいた業務フローの到達点
                </div>
                <p className="text-emerald-900 leading-relaxed">
                  「①工程・顧客共有」→「②ヒアリング整理・変数化」→「③決算書PDF取込・見比べ」→「④リアルタイム要件判定・逆算・複数案比較」→「⑤数値と連動した申請書作成・整合性チェック」までが一本のデータモデルで繋がる設計となっています。
                </p>
              </div>

              {/* 本番開発に向けた2つの実装タスク */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  本番化（実運用システム開発）に向けた2つの技術実装ポイント
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>1. 公式Excelバイナリ出力＆決算書PDF実解析の結合</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      現在は画面プレビューまで実装済みのセルマッピング表（20項目〜）に対し、本番では事務局配布Excelテンプレート（.xlsx）への実セル書込み・ファイル生成およびOCR/PDFパーサーをサーバー側へ接続します。
                    </p>
                  </div>
                  <div className="border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Sparkles className="w-4 h-4 text-blue-700" />
                      <span>2. 生成AI API接続・ユーザー認証＆監査ログ永続化</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      プロンプト集・AI整合性クロスチェックを本番LLM APIへ接続し、ブラウザ保存（localStorage）をクラウドDB＋ロール別認証基盤へ移行します。
                    </p>
                  </div>
                </div>
              </div>

              {/* クライアント確認事項（5項目） */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-amber-600" />
                  社内ご検討・次回定例までにご確認いただきたい5つの事項
                </h3>
                <div className="border border-slate-200 divide-y divide-slate-200">
                  {[
                    {
                      no: '確認 1',
                      title: '「仮」の数値・ほどよく範囲の妥当性確認',
                      detail:
                        '管理画面の「仮の値一覧」にある物価上昇率(2.0%)やほどよく範囲(VA 4〜5%、給与 6〜7%)を実務基準に合わせるか。',
                    },
                    {
                      no: '確認 2',
                      title: 'インポート用(5.96億) vs v36計画(6.30億) の売上見込算出ルール決定',
                      detail:
                        '1年当たり売上見込額を「計画期間平均」「最終年度」のどちらで公式出力に統一するか。',
                    },
                    {
                      no: '確認 3',
                      title: '公式Excelフォーマット（最新公募回版）の受領・確定セル確認',
                      detail:
                        '現在マッピング済みのシート名・セル番地に加え、本番で差し込むべき追加セルの有無。',
                    },
                    {
                      no: '確認 4',
                      title: '事業計画の比較粒度と顧客共有画面の項目',
                      detail:
                        '顧客向け工程共有URL（?share=1）に表示したい進捗情報の範囲や文言の調整。',
                    },
                    {
                      no: '確認 5',
                      title: '実案件を使ったパイロット検証対象（1〜2社分）の選定',
                      detail:
                        '実在の決算書PDF・ヒアリング議事録を用いた試用テストのご協力可否。',
                    },
                  ].map((item) => (
                    <div key={item.no} className="p-3 flex items-start gap-3 bg-white">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] shrink-0">
                        {item.no}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="text-slate-600 mt-0.5 leading-snug">{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            左側の「説明ガイド」パネルから各画面の実演ステップへ進めます
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
