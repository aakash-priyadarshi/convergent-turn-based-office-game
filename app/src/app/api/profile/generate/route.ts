import { requireAuth, json, errorResponse } from '@/lib/api-helpers';

/**
 * Optional AI founder profile generator.
 * Uses OpenAI if key is present; falls back to template.
 */
export async function POST() {
  const { user, supabase, error } = await requireAuth();
  if (!user) return errorResponse(error!, 401);

  let bio: string;
  const avatarUrl: string | null = null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Generate a short (2-3 sentence) fictional startup founder bio. Be creative and professional.',
            },
            { role: 'user', content: `Generate a founder bio for ${user.email}` },
          ],
          max_tokens: 100,
        }),
      });
      const data = await response.json();
      bio = data.choices?.[0]?.message?.content ?? fallbackBio(user.email!);
    } catch {
      bio = fallbackBio(user.email!);
    }
  } else {
    bio = fallbackBio(user.email!);
  }

  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ founder_bio: bio, avatar_url: avatarUrl })
    .eq('id', user.id);

  if (updateError) return errorResponse(updateError.message, 500);

  return json({ bio, avatar_url: avatarUrl });
}

function fallbackBio(email: string): string {
  const name = email.split('@')[0];
  return `${name} is a visionary entrepreneur with a passion for building products that change how people work. After years in tech, they founded their startup to tackle the biggest challenges in the industry.`;
}
