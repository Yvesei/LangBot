import { languageConfigSchema } from '@/lib/schemas';
import { ApiError } from '@/lib/server/errors';
import { guardedRoute, methodNotAllowed, readBytes } from '@/lib/server/http';
import { transcribeRecording } from '@/lib/server/transcription';

export const runtime = 'nodejs';
export const maxDuration = 40;
const formats = ['audio/ogg', 'audio/webm', 'audio/mp4'];

export const POST = guardedRoute(async (request) => {
  const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!type || !formats.includes(type)) {
    throw new ApiError(415, 'Unsupported audio format.');
  }

  const config = languageConfigSchema.safeParse({
    nativeLanguage: request.headers.get('x-native-language'),
    targetLanguage: request.headers.get('x-target-language'),
  });
  if (!config.success) {
    throw new ApiError(400, 'Choose two different supported languages.');
  }

  const audio = await readBytes(request, 2 * 1024 * 1024);
  if (!audio.length) {
    throw new ApiError(400, 'No audio was recorded. Please try again.');
  }

  const text = await transcribeRecording(audio, config.data, request.signal);
  return { text };
});

export const GET = methodNotAllowed;
