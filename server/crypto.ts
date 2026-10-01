import { createHash, randomBytes } from 'node:crypto';

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** 256 bits from the OS CSPRNG, base64url → 43 characters. Unguessable, opaque, not signed. */
export function randomProofId(): string {
  return randomBytes(32).toString('base64url');
}
