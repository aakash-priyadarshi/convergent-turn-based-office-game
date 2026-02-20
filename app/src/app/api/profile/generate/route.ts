import { requireAuth, json, errorResponse } from '@/lib/api-helpers';

/**
 * Optional AI founder profile generator.
 * Uses Hugging Face Inference API (free) if token is present; falls back to template.
 */
export async function POST() {
  const { user, supabase, error } = await requireAuth();
  if (!user) return errorResponse(error!, 401);

  let bio: string;
  const avatarUrl: string | null = null;

  const hfToken = process.env.HF_API_TOKEN;
  if (hfToken) {
    try {
      const prompt = `Write a short 2-3 sentence professional bio for a fictional startup founder named ${user.email?.split('@')[0]}. Be creative:`;
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
            parameters: { max_new_tokens: 120, temperature: 0.7, return_full_text: false },
          }),
        }
      );
      const data = await response.json();
      const generated = Array.isArray(data) ? data[0]?.generated_text : null;
      bio = generated?.trim() || fallbackBio(user.email!);
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
