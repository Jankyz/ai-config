/** Provider-neutral contracts for the regular-file installer core. */
export type ArtifactOwnership = "managed" | "adopted";
export type FileClassification =
  | "ABSENT"
  | "MANAGED_UNCHANGED"
  | "MANAGED_DRIFTED"
  | "MANAGED_MISSING"
  | "UNMANAGED_EXISTING"
  | "SYMLINK_CONFLICT"
  | "INVALID_TARGET";

export interface InstallerContext {
  readonly homeDir: string;
  readonly stateDir: string;
  readonly allowedTargetRoots: readonly string[];
}

export interface DesiredArtifact {
  readonly id: string;
  readonly targetPath: string;
  readonly content: Uint8Array | string;
  readonly ownership: "managed";
  readonly mode?: number;
}

export interface InstalledArtifactState {
  readonly id: string;
  readonly targetPath: string;
  readonly ownership: ArtifactOwnership;
  readonly contentHash: string;
  readonly mode?: number;
  readonly lastTransactionId: string;
}

export interface InstallerState {
  readonly schemaVersion: 1;
  readonly artifacts: Record<string, InstalledArtifactState>;
}

export type ConflictKind =
  | "INVALID_TARGET"
  | "UNMANAGED_EXISTS"
  | "MANAGED_DRIFT"
  | "SYMLINK_TARGET"
  | "UNSUPPORTED_ADOPTED_WRITE"
  | "STATE_INVALID"
  | "STATE_INCONSISTENCY"
  | "DUPLICATE_ARTIFACT_ID"
  | "DUPLICATE_TARGET"
  | "TRANSACTION_LOCKED"
  | "RECOVERY_REQUIRED"
  | "STALE_PLAN";

export interface InstallConflict {
  readonly kind: ConflictKind;
  readonly artifactId?: string;
  readonly targetPath?: string;
  readonly detail: string;
}

export type InstallActionKind =
  | "CREATE"
  | "ADOPT"
  | "REPLACE_UNMANAGED_APPROVED"
  | "REPLACE_MANAGED"
  | "RECREATE_MISSING_MANAGED"
  | "NOOP";

export interface PlanInstallOptions {
  readonly replaceConflictArtifactIds?: readonly string[] | undefined;
}

export interface InstallAction {
  readonly kind: InstallActionKind;
  readonly artifact: DesiredArtifact;
  readonly classification: FileClassification;
  readonly desiredHash: string;
  readonly expectedHash?: string;
  readonly expectedAbsent: boolean;
  readonly expectedRecord: InstalledArtifactState | null;
  readonly expectedMode?: number;
  readonly intendedMode: number;
  readonly managedMode?: number;
}

export interface InstallPlan {
  readonly transactionId: string;
  readonly actions: readonly InstallAction[];
  readonly conflicts: readonly InstallConflict[];
  readonly replaceConflictArtifactIds?: readonly string[];
  readonly hasChanges: boolean;
  readonly canApply: boolean;
}

export interface ArtifactReceipt {
  readonly artifactId: string;
  readonly targetPath: string;
  readonly action: InstallActionKind;
  readonly beforeHash?: string;
  readonly afterHash?: string;
  readonly backupFile?: string;
  readonly beforeMode?: number;
  readonly afterMode?: number;
}

export interface TransactionReceipt {
  readonly schemaVersion: 1;
  readonly transactionId: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly status:
    "prepared" | "applying" | "committed" | "rolled_back" | "failed";
  readonly actions: readonly ArtifactReceipt[];
  readonly previousState?: {
    readonly contentHash: string;
    readonly mode: number;
    readonly backupFile: "state-before.bin";
  } | null;
}

export class InstallerError extends Error {
  public constructor(
    readonly kind: ConflictKind,
    message: string,
  ) {
    super(message);
    this.name = "InstallerError";
  }
}
