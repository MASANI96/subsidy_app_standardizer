/**
 * 計画シミュレーション計算ユーティリティ (planSimulation.ts)
 * 【STEP B準拠】
 * 予測期（currentFY〜p5）のPLを前提値から確定的に自動計算し、periods に反映する。
 */

import {
  FORECAST_PERIOD_KEYS,
  ForecastPeriodKey,
  PeriodKey,
  ProjectFinancialMaster,
  SimAsset,
} from '../types';
import { recalculatePL } from './financialCalculations';

export interface SimulationResult {
  fm: ProjectFinancialMaster;
  errors: string[];
}

/** 前年キーのマッピング */
const PREVIOUS_PERIOD_MAP: Record<ForecastPeriodKey, PeriodKey> = {
  currentFY: 'y0',
  baseFY: 'currentFY',
  p1: 'baseFY',
  p2: 'p1',
  p3: 'p2',
  p4: 'p3',
  p5: 'p4',
};

/**
 * 特定の事業年度（決算年月と月数）において、対象資産が償却対象となる月数を算出する（定額法・月割）
 * @param asset 減価償却資産
 * @param fiscalYear 決算年度（西暦）
 * @param fiscalMonth 決算月 (1〜12)
 * @param periodMonths 事業年度の月数（通常12）
 */
export function calculateAssetDepreciationMonths(
  asset: SimAsset,
  fiscalYear: number,
  fiscalMonth: number,
  periodMonths: number = 12
): number {
  if (!asset.acquisitionYm || asset.usefulLifeYears <= 0 || asset.acquisitionCostYen <= 0) {
    return 0;
  }

  // 取得年月のパース (YYYY-MM)
  const parts = asset.acquisitionYm.split('-');
  if (parts.length < 2) return 0;
  const acqY = parseInt(parts[0], 10);
  const acqM = parseInt(parts[1], 10);
  if (Number.isNaN(acqY) || Number.isNaN(acqM) || acqM < 1 || acqM > 12) {
    return 0;
  }

  const startMonthIndex = acqY * 12 + (acqM - 1);
  const totalMonths = asset.usefulLifeYears * 12;
  const endMonthIndex = startMonthIndex + totalMonths; // 終了月（含まない）

  // 事業年度の期末月インデックスから遡る periodMonths ヶ月
  const fyEndIndex = fiscalYear * 12 + (fiscalMonth - 1);
  const fyStartIndex = fyEndIndex - periodMonths + 1;

  let activeCount = 0;
  for (let m = fyStartIndex; m <= fyEndIndex; m++) {
    if (m >= startMonthIndex && m < endMonthIndex) {
      activeCount++;
    }
  }

  return activeCount;
}

/**
 * 前提値から予測期（currentFY〜p5）のPLを計算し、periods に書き込んだ新しい financialMaster を返す（元の fm は変更しない）
 * @param fm 収支計画マスター
 * @returns 計算結果の financialMaster と エラーメッセージ配列
 */
export function applySimulation(fm: ProjectFinancialMaster): SimulationResult {
  const errors: string[] = [];
  const sim = fm.simulation;

  // ディープコピーして新しい fm を作成
  const nextFM: ProjectFinancialMaster = JSON.parse(JSON.stringify(fm));

  // 人件費に占める給与の割合の未入力チェック
  const salaryShare = sim.salaryShareOfLaborCostPercent;
  const hasSalaryShareError = salaryShare === null || salaryShare === undefined || salaryShare <= 0;
  if (hasSalaryShareError) {
    errors.push('人件費に占める給与の割合が未入力です');
  }

  // ループ前の基準値（y0 直近実績値）
  const y0Period = nextFM.periods.y0;
  let prevHeadcountEnd = y0Period?.pl.numberOfEmployees || 0;
  let prevPerCapitaWage = y0Period?.pl.perCapitaWage || 0;
  let prevExistingSales = y0Period?.pl.existingBusiness.sales || 0;

  // FORECAST_PERIOD_KEYS の順に計算
  for (const k of FORECAST_PERIOD_KEYS) {
    const period = nextFM.periods[k];
    if (!period) continue;

    const fiscalInfo = period.fiscalInfo;
    const periodMonths = fiscalInfo?.periodMonths || 12;

    // 1) 既存売上 = 前年の existingBusiness.sales × (1 + existingGrowthRate[k]/100)
    const growthRate = sim.existingGrowthRate?.[k] || 0;
    const existingSales = Math.round(prevExistingSales * (1 + growthRate / 100));

    // 2) 補助売上 = subsidyUnitPriceYen × subsidyMonthlyQty[k] × subsidyOperatingMonths[k]
    const unitPrice = sim.subsidyUnitPriceYen || 0;
    const monthlyQty = sim.subsidyMonthlyQty?.[k] || 0;
    const opMonths = sim.subsidyOperatingMonths?.[k] ?? 12;
    const subsidySales = Math.round(unitPrice * monthlyQty * opMonths);

    // 3) 既存原価 = 既存売上 × existingCostRate/100、補助原価 = 補助売上 × subsidyCostRate/100
    const existingCostRate = sim.existingCostRate || 0;
    const subsidyCostRate = sim.subsidyCostRate || 0;
    const existingCostOfSales = Math.round(existingSales * (existingCostRate / 100));
    const subsidyCostOfSales = Math.round(subsidySales * (subsidyCostRate / 100));

    // 4) 期末人数 headcountEnd = 前年の期末人数 + headcountIncrease[k]（y0 の期末人数 = y0.pl.numberOfEmployees）
    const headcountIncrease = sim.headcountIncrease?.[k] || 0;
    const headcountEnd = prevHeadcountEnd + headcountIncrease;

    // 5) 一人当たり給与 = 前年の一人当たり給与 × (1 + perCapitaWageGrowthRate[k]/100)
    const wageGrowthRate = sim.perCapitaWageGrowthRate?.[k] || 0;
    const perCapitaWage = Math.round(prevPerCapitaWage * (1 + wageGrowthRate / 100));

    // 6) 全従業員の給与総額 = 一人当たり給与 × headcountEnd
    const totalEmployeeWages = Math.round(perCapitaWage * headcountEnd);

    // 7) 人件費 laborCost = 全従業員の給与総額 ÷ (salaryShareOfLaborCostPercent/100)
    let laborCost = 0;
    if (!hasSalaryShareError && salaryShare && salaryShare > 0) {
      laborCost = Math.round(totalEmployeeWages / (salaryShare / 100));
    }

    // 8) 役員報酬 = mode が 'ratio' なら laborCost × directorRemunerationRatioPercent/100、そうでなければ directorRemunerationAmountYen[k]
    let directorRemuneration = 0;
    if (sim.directorRemunerationMode === 'ratio') {
      const ratio = sim.directorRemunerationRatioPercent || 0;
      directorRemuneration = Math.round(laborCost * (ratio / 100));
    } else {
      directorRemuneration = Math.round(sim.directorRemunerationAmountYen?.[k] || 0);
    }

    // 9) 減価償却費 = existingDepreciationYen[k] + Σ（各資産の当年度償却額）
    // 月額 = 取得価額 ÷ (耐用年数×12)。当年度の償却月数 = その事業年度（fiscalInfo の決算年月から遡る12か月）のうち、取得月から耐用年数×12か月以内に入る月の数
    const existingDeprec = Math.round(sim.existingDepreciationYen?.[k] || 0);
    let subsidyOnlyAssetDeprec = 0;
    let existingOnlyAssetDeprec = 0;
    let salesRatioAssetDeprec = 0;

    if (Array.isArray(sim.assets)) {
      for (const asset of sim.assets) {
        const activeMonths = calculateAssetDepreciationMonths(
          asset,
          fiscalInfo.fiscalYear,
          fiscalInfo.fiscalMonth,
          periodMonths
        );
        if (activeMonths > 0 && asset.usefulLifeYears > 0) {
          const annualAssetDeprec = Math.round(
            (asset.acquisitionCostYen / (asset.usefulLifeYears * 12)) * activeMonths
          );
          if (asset.allocation === 'subsidyOnly') {
            subsidyOnlyAssetDeprec += annualAssetDeprec;
          } else if (asset.allocation === 'existingOnly') {
            existingOnlyAssetDeprec += annualAssetDeprec;
          } else {
            salesRatioAssetDeprec += annualAssetDeprec;
          }
        }
      }
    }

    const totalAssetDeprec = subsidyOnlyAssetDeprec + existingOnlyAssetDeprec + salesRatioAssetDeprec;
    const depreciation = existingDeprec + totalAssetDeprec;

    // 10) 人件費＋減価償却費の配分：既存売上と補助売上の比率で按分（売上合計0なら全額既存）。
    // allocation='subsidyOnly' の資産の償却費は補助事業へ全額、'existingOnly' は既存へ全額
    const poolAmount = laborCost + existingDeprec + salesRatioAssetDeprec;
    const totalSales = existingSales + subsidySales;
    const existingRatio = totalSales > 0 ? existingSales / totalSales : 1;
    const subsidyRatio = totalSales > 0 ? subsidySales / totalSales : 0;

    const existingAlloc = Math.round(poolAmount * existingRatio) + existingOnlyAssetDeprec;
    const subsidyAlloc = Math.round(poolAmount * subsidyRatio) + subsidyOnlyAssetDeprec;

    // 11) 既存販管費 = 既存売上 × existingOtherSgaRate/100 + 既存への配分額
    // 補助販管費 = 補助売上 × subsidyOtherSgaRate/100 + 補助への配分額
    const existingOtherSgaRate = sim.existingOtherSgaRate || 0;
    const subsidyOtherSgaRate = sim.subsidyOtherSgaRate || 0;
    const existingSga = Math.round(existingSales * (existingOtherSgaRate / 100)) + existingAlloc;
    const subsidySga = Math.round(subsidySales * (subsidyOtherSgaRate / 100)) + subsidyAlloc;

    // 12) 営業外収益・費用 = nonOperatingIncomeYen[k] / nonOperatingExpensesYen[k]
    const nonOperatingIncome = Math.round(sim.nonOperatingIncomeYen?.[k] || 0);
    const nonOperatingExpenses = Math.round(sim.nonOperatingExpensesYen?.[k] || 0);

    // 13) incomeTaxes = max(0, 税引前利益) × incomeTaxRatePercent/100（特別損益は0）
    const existingOp = existingSales - existingCostOfSales - existingSga;
    const subsidyOp = subsidySales - subsidyCostOfSales - subsidySga;
    const totalOperatingProfit = existingOp + subsidyOp;
    const ordinaryProfit = totalOperatingProfit + nonOperatingIncome - nonOperatingExpenses;
    const incomeBeforeTaxes = ordinaryProfit;
    const taxRate = sim.incomeTaxRatePercent || 0;
    const incomeTaxes = Math.round(Math.max(0, incomeBeforeTaxes) * (taxRate / 100));

    // 14) 従業員数 numberOfEmployees：employeeCountMethod が 'periodEnd' なら headcountEnd、'koboOfficial' なら headcountEnd − headcountIncrease[k]
    const numberOfEmployees =
      fm.employeeCountMethod === 'koboOfficial'
        ? Math.max(0, headcountEnd - headcountIncrease)
        : headcountEnd;

    // 15) 給与支給総額 totalWages = 一人当たり給与 × numberOfEmployees
    const totalWages = Math.round(perCapitaWage * numberOfEmployees);

    // 16) workplaceMinWage / regionalMinWage = simulation の値
    const workplaceMinWage = Math.round(sim.workplaceMinWage?.[k] || 0);
    const regionalMinWage = Math.round(sim.regionalMinWage?.[k] || 0);

    // 17) 上記を pl に入れ、既存の recalculatePL(pl) を通す
    const targetPL = {
      ...period.pl,
      existingBusiness: {
        ...period.pl.existingBusiness,
        sales: existingSales,
        costOfSales: existingCostOfSales,
        sga: existingSga,
      },
      subsidyBusiness: {
        ...period.pl.subsidyBusiness,
        sales: subsidySales,
        costOfSales: subsidyCostOfSales,
        sga: subsidySga,
      },
      laborCost,
      depreciation,
      directorRemuneration,
      nonOperatingIncome,
      nonOperatingExpenses,
      extraordinaryIncome: 0,
      extraordinaryLosses: 0,
      incomeTaxes,
      numberOfEmployees,
      totalWages,
      workplaceMinWage,
      regionalMinWage,
    };

    const calculatedPL = recalculatePL(targetPL);

    nextFM.periods[k] = {
      ...period,
      pl: calculatedPL,
    };

    // 次期ループ用の前年値を更新
    prevHeadcountEnd = headcountEnd;
    prevPerCapitaWage = perCapitaWage;
    prevExistingSales = existingSales;
  }

  return { fm: nextFM, errors };
}

