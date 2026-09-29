/** Server wall clock. The native harness replaces this module only in its disposable app copy. */
export function orderTokenNowMs(): number {
  return Date.now();
}
