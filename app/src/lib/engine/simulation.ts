import type { GameState, Decisions, Outcomes } from '@/lib/types';

// ─── Spec-defined constants (see assignment SIMULATION MODEL section) ────────
// "Constants may be adjusted if the resulting game balance appears unreasonable,
//  provided any modifications are documented with a clear rationale in the README."
const INDUSTRY_AVG_SALARY = 30_000; // $ per quarter per person
const HIRING_COST_PER_PERSON = 5_000; // one-time cost per new hire
const MAX_YEAR = 10; // Game spans 10 years (40 quarters)

/**
 * Pure simulation function — runs ONLY on the server.
 * Implements the spec model as-provided:
 *   quality  += engineers * 0.5            (cap 100)
 *   demand    = quality * 10 - price * 0.0001 (floor 0)
 *   units     = demand * sales_staff * 0.5   (integer)
 *   revenue   = price * units
 *   salary    = salary_pct / 100 * 30,000   per person
 *   payroll   = salary * (engineers + sales)
 *   net_income = revenue - payroll
 *   cash      = cash + net_income - hiring_cost
 *   Win: complete Year 10 with positive cash  |  Lose: cash ≤ 0
 *
 * marketFactor is an optional enhancement (daily sine wave cached via SWR).
 */
export function advanceQuarter(
  state: GameState,
  decisions: Decisions,
  marketFactor: number = 1.0
): { newState: Partial<GameState>; outcomes: Outcomes } {
  const { price, engineers_to_hire, sales_to_hire, salary_pct } = decisions;

  // ── Hiring ────────────────────────────────────────────────────────────────
  const newEngineers = state.engineers + engineers_to_hire;
  const newSales = state.sales + sales_to_hire;
  const totalHires = engineers_to_hire + sales_to_hire;
  const hiringCost = totalHires * HIRING_COST_PER_PERSON;

  // ── Product quality: quality += engineers * 0.5 (cap 100) ────────────────
  const newQuality = Math.min(100, state.quality + newEngineers * 0.5);

  // ── Market demand: demand = quality * 10 - price * 0.0001 (floor 0) ──────
  const demand = Math.max(0, newQuality * 10 - price * 0.0001);

  // ── Units sold: demand * sales_staff * 0.5 (integer) ─────────────────────
  // marketFactor is our enhancement (documented); spec model has no external factor
  const unitsSold = Math.max(0, Math.round(demand * newSales * 0.5 * marketFactor));

  // ── Revenue ───────────────────────────────────────────────────────────────
  const revenue = price * unitsSold;

  // ── Salary & payroll ─────────────────────────────────────────────────────
  const salaryCostPerPerson = (salary_pct / 100) * INDUSTRY_AVG_SALARY;
  const totalPayroll = salaryCostPerPerson * (newEngineers + newSales);

  // ── Net income & cash ────────────────────────────────────────────────────
  const netIncome = revenue - totalPayroll;
  const newCash = state.cash + netIncome - hiringCost;
  const newCumulativeProfit = state.cumulative_profit + netIncome;

  // ── Quarter / year progression ───────────────────────────────────────────
  let nextQuarter = state.current_quarter + 1;
  let nextYear = state.current_year;
  if (nextQuarter > 4) {
    nextQuarter = 1;
    nextYear += 1;
  }

  // ── Win / Lose ───────────────────────────────────────────────────────────
  // Lose: cash ≤ 0 at any point
  // Win:  survived through Year 10 (nextYear > MAX_YEAR) with positive cash
  let status: 'active' | 'won' | 'lost' = 'active';
  if (newCash <= 0) {
    status = 'lost';
  } else if (nextYear > MAX_YEAR) {
    status = 'won';
  }

  const totalCosts = totalPayroll + hiringCost;

  const outcomes: Outcomes = {
    revenue,
    units_sold: unitsSold,
    costs: totalCosts,
    profit: netIncome,
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
