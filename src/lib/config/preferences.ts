import { z } from 'zod';
import { languageCodeSchema, languageConfigSchema } from '../schemas/language';

const themeSchema = z.enum(['neo', 'original']);

export const preferenceUpdateSchema = z
  .object({
    languageConfig: languageConfigSchema.optional(),
    theme: themeSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Choose a preference to save.');

const settingsResponseSchema = z.object({
  success: z.literal(true),
  userId: z.string().nullable(),
  guestMessageLimit: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  preferences: z
    .object({
      nativeLanguage: languageCodeSchema.nullable(),
      targetLanguage: languageCodeSchema.nullable(),
      theme: themeSchema,
    })
    .nullable(),
});

export type PreferenceUpdate = z.infer<typeof preferenceUpdateSchema>;
export type AppSettings = z.infer<typeof settingsResponseSchema>;

const saveResponseSchema = settingsResponseSchema.pick({
  success: true,
  userId: true,
});
type SavedPreferences = z.infer<typeof saveResponseSchema>;
type PreferenceRequest = { userId: string; preferences: PreferenceUpdate };

export function requestSettings(signal: AbortSignal): Promise<AppSettings>;
export function requestSettings(
  signal: AbortSignal,
  update: PreferenceRequest,
): Promise<SavedPreferences>;

export async function requestSettings(
  signal: AbortSignal,
  update?: PreferenceRequest,
): Promise<AppSettings | SavedPreferences> {
  const response = await fetch('/api/settings', {
    method: update ? 'PATCH' : 'GET',
    headers: update
      ? {
          'Content-Type': 'application/json',
          'X-Profile-User-ID': update.userId,
        }
      : undefined,
    body: update ? JSON.stringify(update.preferences) : undefined,
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string().max(300) }).safeParse(body);
    throw new Error(error.success ? error.data.error : 'Could not load your settings.');
  }
  const result = (update ? saveResponseSchema : settingsResponseSchema).safeParse(body);
  if (!result.success) {
    throw new Error('The service returned invalid settings. Please retry.');
  }
  return result.data;
}
