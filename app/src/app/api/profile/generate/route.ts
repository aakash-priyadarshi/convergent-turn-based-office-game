import { requireAuth, json, errorResponse } from '@/lib/api-helpers';
import { NextRequest } from 'next/server';

/**
 * AI founder profile generator.
 * Accepts optional { name, personality } in body for richer bios.
 * Uses Hugging Face Inference API (free) if token is present; falls back to template.
 */
export async function POST(request: NextRequest) {
  const { user, supabase, error } = await requireAuth();
  if (!user) return errorResponse(error!, 401);

  // Parse optional body
  let body: { name?: string; personality?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const name = body.name?.trim() || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Founder';
  const personalityAnswers = body.personality || [];

  let bio: string;
  const avatarUrl: string | null = null;

  // Build personality description for prompt
  const personalityMap: Record<string, string> = {
    conservative: 'risk-averse and methodical',
    balanced: 'strategically balanced',
    aggressive: 'bold and aggressive',
    engineering: 'passionate about engineering excellence',
    market: 'focused on market domination',
    finance: 'driven by financial discipline',
    visionary: 'a visionary leader',
    analytical: 'an analytical decision-maker',
    'hands-on': 'a hands-on operator',
  };
  const traits = personalityAnswers
    .map((a) => personalityMap[a] || a)
    .filter(Boolean);
  const personalityDesc =
    traits.length > 0
      ? ` They are known for being ${traits.join(', ')}.`
      : '';

  const hfToken = process.env.HF_API_TOKEN;
  if (hfToken) {
    try {
      const prompt = `Write a short 2-3 sentence professional bio for a startup founder named ${name}.${personalityDesc} Be creative and inspiring:`;
      const response = await fetch(
        'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hfToken}`,
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: { max_new_tokens: 150, temperature: 0.7, return_full_text: false },
          }),
        }
      );
      const data = await response.json();
      const generated = Array.isArray(data) ? data[0]?.generated_text : null;
      bio = generated?.trim() || fallbackBio(name, personalityDesc);
    } catch {
      bio = fallbackBio(name, personalityDesc);
    }
  } else {
    bio = fallbackBio(name, personalityDesc);
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ founder_bio: bio, avatar_url: avatarUrl })
    .eq('id', user.id);

  if (updateError) return errorResponse(updateError.message, 500);

  return json({ bio, avatar_url: avatarUrl });
}

function fallbackBio(name: string, personality: string): string {
  return `${name} is a visionary entrepreneur with a passion for building products that change how people work.${personality} After years in the tech trenches, they founded their startup to tackle the biggest challenges in the industry.`;
}
