/** Commit only after every read and validation needed for deletion has succeeded. */
export async function commitVaultDeletionAfterPreflight<T>(
  prepare: () => Promise<T>,
  commit: (prepared: T) => Promise<void>,
): Promise<T> {
  const prepared = await prepare();
  await commit(prepared);
  return prepared;
}
