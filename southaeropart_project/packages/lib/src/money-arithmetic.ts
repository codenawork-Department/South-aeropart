// The merchant's current payable cap; payment-method minimums are checked separately.
export const MAX_PAYABLE_SATANG = 99_999_999n;
export class InvalidPayableAmountError extends Error {
  constructor() {
    super("Invalid request");
  }
}

/** Sum exact internal components before converting to Number or a database decimal. */
export function checkedPayableSatang(components: readonly bigint[]): bigint {
  if (
    !components.length ||
    components.length > 1024 ||
    components.some((value) => typeof value !== "bigint")
  )
    throw new InvalidPayableAmountError();
  const total = components.reduce((sum, value) => sum + value, 0n);
  if (total < 1n || total > MAX_PAYABLE_SATANG)
    throw new InvalidPayableAmountError();
  return total;
}

export function formatSatang(value: bigint): string {
  if (typeof value !== "bigint" || value < 0n)
    throw new InvalidPayableAmountError();
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}
