import { z } from 'zod';

const serverEnvSchema = z.object({
  /** Where the Next server reaches the API. Browsers never see it: they call /api/v1 on this origin. */
  API_ORIGIN: z.url({ protocol: /^https?$/ }).default('http://localhost:4100'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(raw: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment:\n  ${problems.join('\n  ')}`);
  }
  return result.data;
}

export const serverEnv = parseServerEnv({ API_ORIGIN: process.env.API_ORIGIN });
