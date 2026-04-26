import { timingSafeEqual } from "crypto";

export function verifyRemotePass(value: unknown) {
  const expected = process.env.REMOTE_CONTROL_PASS?.trim();
  if (!expected || typeof value !== "string") return false;

  const received = value.trim();

  // timingSafeEqual requires equal-length buffers — pad the shorter one
  // so we never throw, then do a length check afterwards.
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  // Use a constant-length comparison to avoid timing leaks on length
  const maxLen = Math.max(receivedBuffer.length, expectedBuffer.length);
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  receivedBuffer.copy(a);
  expectedBuffer.copy(b);

  // Both buffers are now the same length; timingSafeEqual is safe to call.
  // The explicit length check ensures we still reject mismatches.
  return timingSafeEqual(a, b) && receivedBuffer.length === expectedBuffer.length;
}
