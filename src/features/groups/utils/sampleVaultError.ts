export class SampleVaultStageError extends Error {
  readonly stage: string;
  readonly code: string;

  constructor(stage: string, code: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : "Unknown error";
    super(`${stage} failed (${code}): ${detail}`, { cause });
    this.name = "SampleVaultStageError";
    this.stage = stage;
    this.code = code;
  }
}

export async function sampleVaultStage<T>(stage: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof SampleVaultStageError) throw error;
    throwSampleVaultError(stage, error);
  }
}

export function throwSampleVaultError(stage: string, error: unknown): never {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code : "unknown";
  const diagnostic = new SampleVaultStageError(stage, code, error);
  console.error("[FriendVault] Sample vault operation failed", { stage, code, message: diagnostic.message });
  throw diagnostic;
}
