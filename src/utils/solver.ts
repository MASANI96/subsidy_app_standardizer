/**
 * 逆算（自動調整）ソルバーユーティリティ (solver.ts)
 * 【STEP C準拠】
 * 目的の付加価値額CAGR・一人当たり給与CAGR目標値に向けて、
 * 指定された前提値変数を決定論的二分探索（40回・Math.random禁止）で自動調整する。
 */

import {
  ForecastPeriodKey,
  PlanSimulation,
  ProjectFinancialMaster,
  SolverCandidate,
  SubsidyRequirements,
  SubsidyTrack,
} from '../types';
import { evaluateRequirements } from './financialCalculations';
import { applySimulation } from './planSimulation';

export interface SolveResult {
  simulation: PlanSimulation;
  changes: { key: string; label: string; before: number; after: number }[];
  reached: { valueAdded: boolean; wage: boolean };
  messages: string[];
}

/**
 * ソルバーが値を書き込む期間。
 * currentFY・baseFY はユーザー入力を尊重するため対象外（CAGRの起点を動かさない）
 */
function getVisibleForecastKeys(fm: ProjectFinancialMaster): ForecastPeriodKey[] {
  const keys: ForecastPeriodKey[] = ['p1', 'p2', 'p3'];
  if (fm.planningYears >= 4) {
    keys.push('p4');
  }
  if (fm.planningYears >= 5) {
    keys.push('p5');
  }
  return keys;
}

/**
 * シミュレーションオブジェクト内の対象変数に値を設定する
 */
function setVariableValue(
  sim: PlanSimulation,
  key: string,
  val: number,
  visibleKeys: ForecastPeriodKey[]
): void {
  const currentVal = (sim as any)[key];
  if (currentVal !== null && typeof currentVal === 'object') {
    const updated = { ...currentVal };
    for (const k of visibleKeys) {
      updated[k] = val;
    }
    (sim as any)[key] = updated;
  } else {
    (sim as any)[key] = val;
  }
}

/**
 * 対象変数の代表値（設定前の値）を取得する
 */
function getVariableValue(
  sim: PlanSimulation,
  key: string,
  visibleKeys: ForecastPeriodKey[]
): number {
  const currentVal = (sim as any)[key];
  if (currentVal !== null && typeof currentVal === 'object') {
    // 代表値は調整対象の最初の年度（p1）
    return currentVal[visibleKeys[0]] ?? currentVal.baseFY ?? 0;
  }
  return typeof currentVal === 'number' ? currentVal : 0;
}

/**
 * 目標値に合わせてシミュレーション前提値を逆算調整する
 * 手順（厳守）：
 * 1) 目標値の決定
 * 2) 対象変数の抽出と並び替え（wage系 → valueAdded系）
 * 3) 変数ごとに全表示予測期に同値を入れ、applySimulation → evaluateRequirements で二分探索（40回）
 * 4) 目標到達時はその指標終了。未達時は目標に近い方の端点で固定して次へ
 * 5) 未達メッセージの追加
 * 6) 決定論的処理（Math.random不使用）
 */
export function solveToTarget(
  fm: ProjectFinancialMaster,
  track: SubsidyTrack,
  req: SubsidyRequirements,
  candidates: SolverCandidate[]
): SolveResult {
  const visibleKeys = getVisibleForecastKeys(fm);
  const currentSim: PlanSimulation = JSON.parse(JSON.stringify(fm.simulation));
  const pinnedSet = new Set<string>(currentSim.pinnedKeys || []);
  const changes: { key: string; label: string; before: number; after: number }[] = [];
  const messages: string[] = [];

  // 1) 目標値
  // 付加価値 = moderateRanges.valueAddedCAGR の (min+max)/2
  const targetVA =
    (req.moderateRanges.valueAddedCAGR.min + req.moderateRanges.valueAddedCAGR.max) / 2;

  // 給与 = 賃上げ特例なら wageSpecialCAGR、そうでなければ wageCAGR の範囲の (min+max)/2
  const wageRange = fm.isWageSpecialApplied
    ? req.moderateRanges.wageSpecialCAGR
    : req.moderateRanges.wageCAGR;
  const targetWage = (wageRange.min + wageRange.max) / 2;

  // 候補情報のマップ
  const candidateMap = new Map<string, SolverCandidate>();
  for (const c of candidates) {
    candidateMap.set(c.key, c);
  }

  // 2) 対象 = fm.simulation.solverTargets のうち pinnedKeys に含まれないもの
  // 並び順は wage系 → valueAdded系
  const targets = (currentSim.solverTargets || []).filter((t) => !pinnedSet.has(t.key));

  const wageTargets = targets.filter((t) => {
    const c = candidateMap.get(t.key);
    return c ? c.affects === 'wage' : false;
  });

  const vaTargets = targets.filter((t) => {
    const c = candidateMap.get(t.key);
    return c ? c.affects === 'valueAdded' : true; // デフォルトは valueAdded
  });

  // 指標到達フラグ
  let reachedWage = false;
  let reachedVA = false;

  // 評価用ヘルパー関数
  const evaluateSim = (sim: PlanSimulation) => {
    const tempFM: ProjectFinancialMaster = {
      ...fm,
      simulation: sim,
    };
    const simRes = applySimulation(tempFM);
    return evaluateRequirements(simRes.fm, track, req);
  };

  // 初期評価
  const initialEval = evaluateSim(currentSim);
  if (Math.abs(initialEval.wageCAGR - targetWage) <= 0.05) {
    reachedWage = true;
  }
  if (Math.abs(initialEval.vaCAGR - targetVA) <= 0.05) {
    reachedVA = true;
  }

  // --- A. wage系変数の調整 ---
  for (const t of wageTargets) {
    if (reachedWage) break; // 目標に届いたらその指標は終了

    const c = candidateMap.get(t.key);
    const label = c ? c.label : t.key;
    const min = t.min;
    const max = t.max;
    const step = t.step > 0 ? t.step : 0.1;
    const beforeVal = getVariableValue(currentSim, t.key, visibleKeys);

    const calcMetric = (val: number): number => {
      const trialSim = JSON.parse(JSON.stringify(currentSim));
      setVariableValue(trialSim, t.key, val, visibleKeys);
      const evalRes = evaluateSim(trialSim);
      return evalRes.wageCAGR;
    };

    const fMin = calcMetric(min);
    const fMax = calcMetric(max);
    const isIncreasing = fMax >= fMin;
    const lowVal = isIncreasing ? fMin : fMax;
    const highVal = isIncreasing ? fMax : fMin;

    if (targetWage >= lowVal && targetWage <= highVal) {
      // 範囲内に目標値が存在する → 二分探索を40回
      let low = min;
      let high = max;
      for (let iter = 0; iter < 40; iter++) {
        const mid = (low + high) / 2;
        const roundedMid = Math.round(mid / step) * step;
        const fMid = calcMetric(roundedMid);
        if (Math.abs(fMid - targetWage) < 1e-6) {
          low = roundedMid;
          high = roundedMid;
          break;
        }
        if (isIncreasing) {
          if (fMid < targetWage) {
            low = mid;
          } else {
            high = mid;
          }
        } else {
          if (fMid < targetWage) {
            high = mid;
          } else {
            low = mid;
          }
        }
      }
      let bestX = Math.round(((low + high) / 2) / step) * step;
      if (bestX < min) bestX = min;
      if (bestX > max) bestX = max;
      bestX = Number(bestX.toFixed(4));

      setVariableValue(currentSim, t.key, bestX, visibleKeys);
      changes.push({ key: t.key, label, before: beforeVal, after: bestX });
      reachedWage = true;
    } else {
      // 目標値に届かない → 目標に近い方の端点で固定して次の変数へ
      const diffMin = Math.abs(fMin - targetWage);
      const diffMax = Math.abs(fMax - targetWage);
      const bestX = diffMin < diffMax ? min : max;
      const reachedVal = diffMin < diffMax ? fMin : fMax;

      setVariableValue(currentSim, t.key, bestX, visibleKeys);
      changes.push({ key: t.key, label, before: beforeVal, after: bestX });

      messages.push(
        `${label}を${min}〜${max}の範囲で動かしても、一人当たり給与CAGRは${reachedVal.toFixed(
          2
        )}%で目標${targetWage.toFixed(2)}%に届きません`
      );
    }
  }

  // --- B. valueAdded系変数の調整 ---
  for (const t of vaTargets) {
    if (reachedVA) break; // 目標に届いたらその指標は終了

    const c = candidateMap.get(t.key);
    const label = c ? c.label : t.key;
    const min = t.min;
    const max = t.max;
    const step = t.step > 0 ? t.step : 0.1;
    const beforeVal = getVariableValue(currentSim, t.key, visibleKeys);

    const calcMetric = (val: number): number => {
      const trialSim = JSON.parse(JSON.stringify(currentSim));
      setVariableValue(trialSim, t.key, val, visibleKeys);
      const evalRes = evaluateSim(trialSim);
      return evalRes.vaCAGR;
    };

    const fMin = calcMetric(min);
    const fMax = calcMetric(max);
    const isIncreasing = fMax >= fMin;
    const lowVal = isIncreasing ? fMin : fMax;
    const highVal = isIncreasing ? fMax : fMin;

    if (targetVA >= lowVal && targetVA <= highVal) {
      // 範囲内に目標値が存在する → 二分探索を40回
      let low = min;
      let high = max;
      for (let iter = 0; iter < 40; iter++) {
        const mid = (low + high) / 2;
        const roundedMid = Math.round(mid / step) * step;
        const fMid = calcMetric(roundedMid);
        if (Math.abs(fMid - targetVA) < 1e-6) {
          low = roundedMid;
          high = roundedMid;
          break;
        }
        if (isIncreasing) {
          if (fMid < targetVA) {
            low = mid;
          } else {
            high = mid;
          }
        } else {
          if (fMid < targetVA) {
            high = mid;
          } else {
            low = mid;
          }
        }
      }
      let bestX = Math.round(((low + high) / 2) / step) * step;
      if (bestX < min) bestX = min;
      if (bestX > max) bestX = max;
      bestX = Number(bestX.toFixed(4));

      setVariableValue(currentSim, t.key, bestX, visibleKeys);
      changes.push({ key: t.key, label, before: beforeVal, after: bestX });
      reachedVA = true;
    } else {
      // 目標値に届かない → 目標に近い方の端点で固定して次の変数へ
      const diffMin = Math.abs(fMin - targetVA);
      const diffMax = Math.abs(fMax - targetVA);
      const bestX = diffMin < diffMax ? min : max;
      const reachedVal = diffMin < diffMax ? fMin : fMax;

      setVariableValue(currentSim, t.key, bestX, visibleKeys);
      changes.push({ key: t.key, label, before: beforeVal, after: bestX });

      messages.push(
        `${label}を${min}〜${max}の範囲で動かしても、付加価値額CAGRは${reachedVal.toFixed(
          2
        )}%で目標${targetVA.toFixed(2)}%に届きません`
      );
    }
  }

  // 最終確認
  const finalEval = evaluateSim(currentSim);
  const finalReachedWage = reachedWage || Math.abs(finalEval.wageCAGR - targetWage) <= 0.05;
  const finalReachedVA = reachedVA || Math.abs(finalEval.vaCAGR - targetVA) <= 0.05;

  return {
    simulation: currentSim,
    changes,
    reached: {
      valueAdded: finalReachedVA,
      wage: finalReachedWage,
    },
    messages,
  };
}

