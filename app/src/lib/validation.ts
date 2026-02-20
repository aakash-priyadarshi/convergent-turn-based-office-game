import { z } from 'zod';

export const decisionsSchema = z.object({
  price: z.number().min(1).max(1000),
  engineers_to_hire: z.number().int().min(0).max(20),
  sales_to_hire: z.number().int().min(0).max(20),
  salary_pct: z.number().min(50).max(200), // 50%-200% of market rate
});

export const newGameSchema = z.object({}).optional();

export const botRecommendSchema = z.object({
  strategy: z.enum(['cfo', 'growth', 'quality']).optional(),
});

export const profileGenerateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});
