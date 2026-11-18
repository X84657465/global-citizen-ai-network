export function isValidIdempotencyKey(value: string | null | undefined): value is string {
  return typeof value === "string" &&
    value.length >= 8 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(value);
}
