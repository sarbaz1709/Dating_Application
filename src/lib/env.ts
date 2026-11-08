import { z } from 'zod';

/**
 * Public, bundled configuration. Expo inlines `process.env.EXPO_PUBLIC_*` at build time, so each
 * variable must be referenced by its full literal name (no dynamic lookups).
 */
const publicEnvSchema = z.object({
  supabaseUrl: z.url({ error: 'EXPO_PUBLIC_SUPABASE_URL is missing or not a URL' }),
  supabasePublishableKey: z
    .string({ error: 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing' })
    .min(20, { error: 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY looks too short' })
    .refine((key) => !key.startsWith('sb_secret_'), {
      error: 'A secret key was put in a public variable. Use the publishable key instead.',
    }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type EnvResult = { ok: true; env: PublicEnv } | { ok: false; problems: string[] };

export function parsePublicEnv(raw: {
  supabaseUrl: string | undefined;
  supabasePublishableKey: string | undefined;
}): EnvResult {
  const result = publicEnvSchema.safeParse(raw);
  if (result.success) return { ok: true, env: result.data };
  return { ok: false, problems: result.error.issues.map((issue) => issue.message) };
}

export const publicEnv = parsePublicEnv({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
