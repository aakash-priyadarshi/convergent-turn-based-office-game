import type { GameState, Decisions, Outcomes } from '@/lib/types';

// Win/lose thresholds
const WIN_PROFIT = 50000;
const BANKRUPTCY_CASH = 0;

// Cost constants
const HIRING_COST_PER_PERSON = 500;
const BASE_SALARY_PER_PERSON = 400; // per quarter at 100% market rate
const MAX_UNITS_BASE = 200;

/**
 * Pure simulation function — runs ONLY on the server.
 * Given current state + player decisions + market factor, returns outcomes.
 */
export function advanceQuarter(
  state: GameState,
  decisions: Decisions,
  marketFactor: number = 1.0
): { newState: Partial<GameState>; outcomes: Outcomes } {
  const { price, engineers_to_hire, sales_to_hire, salary_pct } = decisions;
  const salaryMultiplier = salary_pct / 100;

  // Hiring
  const newEngineers = state.engineers + engineers_to_hire;
  const newSales = state.sales + sales_to_hire;
  const totalHeadcount = newEngineers + newSales;
  const hiringCost = (engineers_to_hire + sales_to_hire) * HIRING_COST_PER_PERSON;

  // Salary costs for the quarter
  const salaryCost = totalHeadcount * BASE_SALARY_PER_PERSON * salaryMultiplier;
  const totalCosts = hiringCost + salaryCost;

  // Quality update: drifts toward engineer ratio × salary competitiveness
  const engineerRatio = totalHeadcount > 0 ? newEngineers / totalHeadcount : 0;
  const qualityTarget = engineerRatio * salaryMultiplier * 100;
  // Quality moves 20% toward target each quarter
  const newQuality = Math.max(0, Math.min(100,
    state.quality + (qualityTarget - state.quality) * 0.2
  ));

  // Units sold: driven by sales force, quality, price competitiveness, market
  // Higher price = fewer units; more sales people + higher quality = more units
  const priceCompetitiveness = Math.max(0.1, 1 - (price - 50) / 200);
  const qualityBonus = newQuality / 100;
  const salesEffectiveness = Math.sqrt(newSales) * 20;
  const unitsSold = Math.max(0, Math.round(
    salesEffectiveness * qualityBonus * priceCompetitiveness * marketFactor * (MAX_UNITS_BASE / 10)
  ));

  // Revenue
  const revenue = unitsSold * price;
  const profit = revenue - totalCosts;
  const newCash = state.cash + profit;
  const newCumulativeProfit = state.cumulative_profit + profit;

  // Quarter/year progression
  let nextQuarter = state.current_quarter + 1;
  let nextYear = state.current_year;
  if (nextQuarter > 4) {
    nextQuarter = 1;
    nextYear += 1;
  }

  // Status check
  let status: 'active' | 'won' | 'lost' = 'active';
  if (newCash <= BANKRUPTCY_CASH) status = 'lost';
  else if (newCumulativeProfit >= WIN_PROFIT) status = 'won';

  const outcomes: Outcomes = {
    revenue,
    units_sold: unitsSold,
    costs: totalCosts,
    profit,
    new_cash: Math.round(newCash * 100) / 100,
    new_quality: Math.round(newQuality * 100) / 100,
    new_engineers: newEngineers,
    new_sales: newSales,
    new_cumulative_profit: Math.round(newCumulativeProfit * 100) / 100,
    status,
  };

  const newState: Partial<GameState> = {
    cash: outcomes.new_cash,
    quality: outcomes.new_quality,
    engineers: outcomes.new_engineers,
    sales: outcomes.new_sales,
    cumulative_profit: outcomes.new_cumulative_profit,
    current_quarter: nextQuarter,
    current_year: nextYear,
    status,
  };

  return { newState, outcomes };
}
