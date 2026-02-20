import type { GameState, Decisions, BotRecommendation } from '@/lib/types';

type Strategy = 'cfo' | 'growth' | 'quality';

/** CFO Bot: protect cash, slow hiring, mid-high price */
function cfoStrategy(state: GameState): Decisions {
  const lowCash = state.cash < 300000;
  const quartersLeft = (10 - state.current_year) * 4 + (4 - state.current_quarter);
  // Late-game: freeze hiring, maximize revenue to survive
  if (quartersLeft <= 4) {
    return { price: 400, engineers_to_hire: 0, sales_to_hire: 0, salary_pct: 80 };
  }
  return {
    price: lowCash ? 400 : 300,
    engineers_to_hire: lowCash ? 0 : state.engineers < 6 ? 1 : 0,
    sales_to_hire: lowCash ? 0 : state.sales < 4 ? 1 : 0,
    salary_pct: lowCash ? 80 : 90,
  };
}

/** Growth Bot: aggressive hiring, low price to capture market */
function growthStrategy(state: GameState): Decisions {
  const canAffordHiring = state.cash > 500000;
  const highCash = state.cash > 1200000;
  const quartersLeft = (10 - state.current_year) * 4 + (4 - state.current_quarter);
  // Late-game: stop hiring, coast to the finish
  if (quartersLeft <= 6) {
    return { price: 250, engineers_to_hire: 0, sales_to_hire: 0, salary_pct: 100 };
  }
  return {
    price: highCash ? 150 : 200,
    engineers_to_hire: canAffordHiring ? 3 : 1,
    sales_to_hire: canAffordHiring ? 3 : 1,
    salary_pct: highCash ? 120 : 100,
  };
}

/** Quality Bot: high salary, engineer-heavy, premium pricing */
function qualityStrategy(state: GameState): Decisions {
  const highQuality = Number(state.quality) > 70;
  const quartersLeft = (10 - state.current_year) * 4 + (4 - state.current_quarter);
  // Late-game: no more hiring, ride the premium pricing
  if (quartersLeft <= 6) {
    return { price: highQuality ? 500 : 400, engineers_to_hire: 0, sales_to_hire: 0, salary_pct: 100 };
  }
  return {
    price: highQuality ? 500 : 400,
    engineers_to_hire: highQuality ? 1 : 2,
    sales_to_hire: state.sales < 3 ? 1 : 0,
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
  const engineers = state.engineers;
  const sales = state.sales;
  const year = state.current_year;
  const quartersLeft = (10 - year) * 4 + (4 - state.current_quarter);

  // Situation assessment
  const cashLevel = cash < 200000 ? 'critical' : cash < 500000 ? 'low' : cash > 1500000 ? 'strong' : 'moderate';
  const qualityLevel = quality < 40 ? 'poor' : quality > 70 ? 'excellent' : 'moderate';
  const teamSize = engineers + sales;

  switch (strategy) {
    case 'cfo':
      if (cashLevel === 'critical')
        return `URGENT: Cash at $${cash.toLocaleString()} is dangerously low. Freeze hiring, raise prices, and cut salary costs to survive. Every dollar counts right now.`;
      if (cashLevel === 'low')
        return `Cash reserves at $${cash.toLocaleString()} need protection. Conservative pricing at $300 with minimal hiring. Build runway before scaling.`;
      if (quartersLeft <= 8)
        return `${quartersLeft} quarters to Year 10 finish. Maintain steady pricing and lean operations to close out the win.`;
      return `With $${cash.toLocaleString()} in reserves, keep a balanced approach. Price at $300, hire conservatively (team: ${teamSize}), and protect margins at 90% salary.`;

    case 'growth':
      if (quartersLeft <= 6)
        return `${quartersLeft} quarters left — switching to survival mode. Stop hiring, price at $250 for steady revenue. The goal is to cross the Year 10 finish line with cash in the bank.`;
      if (cashLevel === 'critical')
        return `Cash too low for aggressive growth right now. Consider CFO strategy until reserves recover, then switch back to growth mode.`;
      if (cashLevel === 'strong')
        return `$${cash.toLocaleString()} war chest enables maximum aggression! Price low at $150, hire 3+3, pay above market. Scale fast while we have runway.`;
      if (teamSize < 8)
        return `Team of ${teamSize} is too small to scale. Invest in hiring (3 eng + 3 sales) at $200 pricing to build the engine, even if margins are thin short-term.`;
      return `Scale aggressively with $${cash.toLocaleString()} available. Low pricing captures volume, hire fast (currently ${teamSize} staff). Speed beats perfection.`;

    case 'quality':
      if (quartersLeft <= 6)
        return `${quartersLeft} quarters to the finish. Freeze hiring and ride premium pricing at $${Number(quality) > 70 ? 500 : 400}. Quality at ${quality.toFixed(1)}% should carry us. Just survive.`;
      if (qualityLevel === 'poor')
        return `Quality at ${quality.toFixed(1)}% is hurting sales badly. Invest in 2 more engineers with 140% salary to attract top talent. Premium pricing follows quality.`;
      if (qualityLevel === 'excellent')
        return `Quality at ${quality.toFixed(1)}% justifies premium pricing at $500! With ${engineers} engineers maintaining excellence, shift focus to sales to monetize quality.`;
      return `Build product excellence from ${quality.toFixed(1)}% with 2 new engineers at competitive 140% salary. Price at $400 — customers pay more for quality. Currently ${engineers} eng on the team.`;
  }
}

/** Assess the overall situation for a post-turn briefing */
export function assessSituation(state: GameState): string {
  const cash = Number(state.cash);
  const quality = Number(state.quality);
  const engineers = state.engineers;
  const sales = state.sales;
  const year = state.current_year;
  const quartersLeft = (10 - year) * 4 + (4 - state.current_quarter);
  const parts: string[] = [];

  // Cash status
  if (cash < 200000) parts.push('⚠️ CASH CRITICAL — bankruptcy risk is high');
  else if (cash < 500000) parts.push('💰 Cash reserves are running low');
  else if (cash > 1500000) parts.push('💰 Strong cash position for expansion');

  // Quality status
  if (quality < 30) parts.push('📉 Product quality is severely impacting sales');
  else if (quality > 70) parts.push('⭐ Excellent product quality driving premium demand');

  // Team
  if (engineers === 0) parts.push('🔧 No engineers — quality will stagnate');
  if (sales === 0) parts.push('📞 No sales team — revenue pipeline is empty');
  if (engineers + sales > 20) parts.push('🏢 Large team — payroll is a significant cost');

  // Win proximity
  if (quartersLeft <= 4) parts.push('🏆 Final year! Just survive to win!');
  else if (quartersLeft <= 12) parts.push('📈 Less than 3 years to the finish line');

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
