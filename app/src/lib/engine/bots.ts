import type { GameState, Decisions, BotRecommendation } from '@/lib/types';

type Strategy = 'cfo' | 'growth' | 'quality';

/** CFO Bot: protect cash, slow hiring, mid-high price */
function cfoStrategy(state: GameState): Decisions {
  return {
    price: 120,
    engineers_to_hire: state.engineers < 4 ? 1 : 0,
    sales_to_hire: state.sales < 3 ? 1 : 0,
    salary_pct: 90,
  };
}

/** Growth Bot: aggressive hiring, low price to capture market */
function growthStrategy(state: GameState): Decisions {
  const canAffordHiring = state.cash > 5000;
  return {
    price: 60,
    engineers_to_hire: canAffordHiring ? 3 : 1,
    sales_to_hire: canAffordHiring ? 3 : 1,
    salary_pct: 100,
  };
}

/** Quality Bot: high salary, engineer-heavy, premium pricing */
function qualityStrategy(state: GameState): Decisions {
  return {
    price: 150,
    engineers_to_hire: 2,
    sales_to_hire: state.sales < 2 ? 1 : 0,
    salary_pct: 140,
  };
}

const strategies: Record<Strategy, (state: GameState) => Decisions> = {
  cfo: cfoStrategy,
  growth: growthStrategy,
  quality: qualityStrategy,
};

const reasoningTemplates: Record<Strategy, string> = {
  cfo: 'Conserve cash and grow steadily. Keep hiring lean and price high enough to maintain margins.',
  growth: 'Scale fast to dominate the market. Hire aggressively and keep prices low to maximize units sold.',
  quality: 'Invest in engineering talent with competitive salaries. Premium pricing justified by high product quality.',
};

export function getRecommendation(
  strategy: Strategy,
  state: GameState,
  reasoning?: string
): BotRecommendation {
  const decisions = strategies[strategy](state);
  return {
    strategy,
    decisions,
    reasoning: reasoning || reasoningTemplates[strategy],
  };
}

export function getAllRecommendations(state: GameState): BotRecommendation[] {
  return (['cfo', 'growth', 'quality'] as Strategy[]).map((s) =>
    getRecommendation(s, state)
  );
}
