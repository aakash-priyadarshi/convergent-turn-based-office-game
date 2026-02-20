// Core domain types for the startup simulation

export interface GameState {
  id: string;
  owner_id: string;
  status: 'active' | 'won' | 'lost';
  current_year: number;
  current_quarter: number;
  cash: number;
  quality: number;
  engineers: number;
  sales: number;
  cumulative_profit: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Decisions {
  price: number;
  engineers_to_hire: number;
  sales_to_hire: number;
  salary_pct: number; // percentage of market rate (e.g., 100 = market rate)
}

export interface Outcomes {
  revenue: number;
  units_sold: number;
  costs: number;
  profit: number;
  new_cash: number;
  new_quality: number;
  new_engineers: number;
  new_sales: number;
  new_cumulative_profit: number;
  status: 'active' | 'won' | 'lost';
}

export interface Turn {
  id: string;
  game_id: string;
  year: number;
  quarter: number;
  decisions: Decisions;
  outcomes: Outcomes;
  created_at: string;
}

export interface Participant {
  id: string;
  game_id: string;
  type: 'human' | 'bot';
  display_name: string;
  strategy: 'cfo' | 'growth' | 'quality' | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  founder_bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface BotRecommendation {
  strategy: 'cfo' | 'growth' | 'quality';
  decisions: Decisions;
  reasoning: string;
}

export interface ActivityEvent {
  type: 'quarter_advanced' | 'bot_applied' | 'player_joined' | 'spectator_joined';
  message: string;
  timestamp: string;
}
