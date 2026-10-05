import { ApiError } from '../errors';
import { MAX_REQUEST_BYTES } from '../../config/limits';

const REQUEST_BODY_TIMEOUT_MS = 5000;

function combineChunks(chunks: Uint8Array[], bytes: number) {
  const combined = new Uint8Array(bytes);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return combined;
}

async function collectChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
) {
  const chunks: Uint8Array[] = [];
  let bytes = 0;

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      return combineChunks(chunks, bytes);
    }

    bytes += value.byteLength;

    if (bytes > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, 'Request is too large.');
    }

    chunks.push(value);
  }
}

export async function readBytes(request: Request, maxBytes: number) {
  if (Number(request.headers.get('content-length')) > maxBytes) {
    throw new ApiError(413, 'Request is too large.');
  }

  const reader = request.body?.getReader();

  if (!reader) {
    throw new ApiError(400, 'A request body is required.');
  }

  let didTimeOut = false;

  const cancelReader = () => void reader.cancel().catch(() => undefined);
  const timeout = setTimeout(() => {
    didTimeOut = true;
    cancelReader();
  }, REQUEST_BODY_TIMEOUT_MS);

  try {
    const body = await collectChunks(reader, maxBytes);

    if (didTimeOut) {
      throw new ApiError(408, 'Request body timed out.');
    }

    return body;
  } catch (error) {
    if (didTimeOut) {
      throw new ApiError(408, 'Request body timed out.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers
    .get('content-type')
    ?.split(';')[0]
    .trim()
    .toLowerCase();

  if (contentType !== 'application/json') {
    throw new ApiError(415, 'Send application/json.');
  }

  const body = await readBytes(request, MAX_REQUEST_BYTES);

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch {
    throw new ApiError(400, 'Invalid JSON.');
  }
}
