import type { GameState, Decisions, BotRecommendation } from '@/lib/types';

type Strategy = 'cfo' | 'growth' | 'quality';

/** CFO Bot: protect cash, slow hiring, mid-high price */
function cfoStrategy(state: GameState): Decisions {
  const lowCash = state.cash < 3000;
  return {
    price: lowCash ? 140 : 120,
    engineers_to_hire: lowCash ? 0 : state.engineers < 4 ? 1 : 0,
    sales_to_hire: lowCash ? 0 : state.sales < 3 ? 1 : 0,
    salary_pct: lowCash ? 80 : 90,
  };
}

/** Growth Bot: aggressive hiring, low price to capture market */
function growthStrategy(state: GameState): Decisions {
  const canAffordHiring = state.cash > 5000;
  const highCash = state.cash > 12000;
  return {
    price: highCash ? 50 : 60,
    engineers_to_hire: canAffordHiring ? 3 : 1,
    sales_to_hire: canAffordHiring ? 3 : 1,
    salary_pct: highCash ? 110 : 100,
  };
}

/** Quality Bot: high salary, engineer-heavy, premium pricing */
function qualityStrategy(state: GameState): Decisions {
  const highQuality = Number(state.quality) > 70;
  return {
    price: highQuality ? 180 : 150,
    engineers_to_hire: highQuality ? 1 : 2,
    sales_to_hire: state.sales < 2 ? 1 : 0,
    salary_pct: 140,
  };
}

const strategies: Record<Strategy, (state: GameState) => Decisions> = {
  cfo: cfoStrategy,
  growth: growthStrategy,
  quality: qualityStrategy,
};

/** Generate context-aware reasoning based on current game state */
function generateReasoning(strategy: Strategy, state: GameState): string {
  const cash = Number(state.cash);
  const quality = Number(state.quality);
  const profit = Number(state.cumulative_profit);
  const engineers = state.engineers;
  const sales = state.sales;

  // Situation assessment
  const cashLevel = cash < 2000 ? 'critical' : cash < 5000 ? 'low' : cash > 15000 ? 'strong' : 'moderate';
  const qualityLevel = quality < 40 ? 'poor' : quality > 70 ? 'excellent' : 'moderate';
  const profitTrend = profit > 20000 ? 'winning' : profit > 0 ? 'positive' : 'negative';
  const teamSize = engineers + sales;

  switch (strategy) {
    case 'cfo':
      if (cashLevel === 'critical')
        return `URGENT: Cash at $${cash.toLocaleString()} is dangerously low. Freeze hiring, raise prices to $140, and cut salary costs to survive. Every dollar counts right now.`;
      if (cashLevel === 'low')
        return `Cash reserves at $${cash.toLocaleString()} need protection. Conservative pricing at $120 with minimal hiring. Build runway before scaling.`;
      if (profitTrend === 'winning')
        return `Strong position at $${profit.toLocaleString()} cumulative profit. Maintain steady pricing and lean operations to close out the win.`;
      return `With $${cash.toLocaleString()} in reserves, keep a balanced approach. Price at $120, hire conservatively (team: ${teamSize}), and protect margins at 90% salary.`;

    case 'growth':
      if (cashLevel === 'critical')
        return `Cash too low for aggressive growth right now. Consider CFO strategy until reserves recover, then switch back to growth mode.`;
      if (cashLevel === 'strong')
        return `$${cash.toLocaleString()} war chest enables maximum aggression! Price low at $50, hire 3+3, pay above market. Flood the market before competitors react.`;
      if (teamSize < 5)
        return `Team of ${teamSize} is too small to scale. Invest in hiring (3 eng + 3 sales) at $60 pricing to build the engine, even if margins are thin short-term.`;
      return `Scale aggressively with $${cash.toLocaleString()} available. Low pricing at $60 captures volume, hire fast (currently ${teamSize} staff). Speed beats perfection.`;

    case 'quality':
      if (qualityLevel === 'poor')
        return `Quality at ${quality.toFixed(1)}% is hurting sales badly. Invest in ${2} more engineers with 140% salary to attract top talent. Premium pricing follows quality.`;
      if (qualityLevel === 'excellent')
        return `Quality at ${quality.toFixed(1)}% justifies premium pricing at $180! With ${engineers} engineers maintaining excellence, shift focus to sales to monetize quality.`;
      return `Build product excellence from ${quality.toFixed(1)}% with 2 new engineers at competitive 140% salary. Price at $150 — customers pay more for quality. Currently ${engineers} eng on the team.`;
  }
}

/** Assess the overall situation for a post-turn briefing */
export function assessSituation(state: GameState): string {
  const cash = Number(state.cash);
  const quality = Number(state.quality);
  const profit = Number(state.cumulative_profit);
  const engineers = state.engineers;
  const sales = state.sales;
  const parts: string[] = [];

  // Cash status
  if (cash < 2000) parts.push('⚠️ CASH CRITICAL — bankruptcy risk is high');
  else if (cash < 5000) parts.push('💰 Cash reserves are running low');
  else if (cash > 15000) parts.push('💰 Strong cash position for expansion');

  // Quality status
  if (quality < 30) parts.push('📉 Product quality is severely impacting sales');
  else if (quality > 70) parts.push('⭐ Excellent product quality driving premium demand');

  // Team
  if (engineers === 0) parts.push('🔧 No engineers — quality will deteriorate');
  if (sales === 0) parts.push('📞 No sales team — revenue pipeline is empty');
  if (engineers + sales > 20) parts.push('🏢 Large team — payroll is a significant cost');

  // Win proximity
  if (profit > 40000) parts.push('🏆 Very close to the $50K profit goal!');
  else if (profit > 25000) parts.push('📈 Solid progress toward the $50K profit target');
  else if (profit < -5000) parts.push('📉 Deep in the red — need to reverse losses fast');

  return parts.length > 0
    ? parts.join('. ') + '.'
    : `Steady state at Y${state.current_year} Q${state.current_quarter}. Evaluate advisor strategies to optimize your next move.`;
}

export function getRecommendation(
  strategy: Strategy,
  state: GameState,
  reasoning?: string
): BotRecommendation {
  const decisions = strategies[strategy](state);
  return {
    strategy,
    decisions,
    reasoning: reasoning || generateReasoning(strategy, state),
  };
}

export function getAllRecommendations(state: GameState): BotRecommendation[] {
  return (['cfo', 'growth', 'quality'] as Strategy[]).map((s) =>
    getRecommendation(s, state)
  );
}
