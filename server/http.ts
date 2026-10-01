/** Small HTTP helpers shared by every TrustShield function. */

export const MAX_BODY_BYTES = 16 * 1024;

export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'INPUT_TOO_LONG'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'METHOD_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'OFFICIAL_ENTITY'
  | 'NOTHING_TO_REPORT'
  | 'CONFLICT'
  | 'INTERNAL';

const BASE_HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
  headers: Record<string, string> = {},
): Response {
  return json(status, { error: { code, message, ...(details === undefined ? {} : { details }) } }, headers);
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Reads a JSON body with a hard size limit, checked twice: against the
 * declared Content-Length and against the bytes actually received.
 */
export async function readJson(req: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const type = req.headers.get('content-type') ?? '';
  if (!type.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send JSON with Content-Type: application/json.');
  }
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `Request body must be at most ${maxBytes} bytes.`);
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `Request body must be at most ${maxBytes} bytes.`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, 'INVALID_REQUEST', 'Request body is not valid JSON.');
  }
}

export function methodNotAllowed(allowed: string[]): Response {
  return errorResponse(405, 'METHOD_NOT_ALLOWED', `Use ${allowed.join(' or ')}.`, undefined, { allow: allowed.join(', ') });
}

/** Converts thrown errors into structured responses without leaking internals. */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof HttpError) return errorResponse(err.status, err.code, err.message, err.details);
  return errorResponse(500, 'INTERNAL', 'Something went wrong. Please try again.');
}
