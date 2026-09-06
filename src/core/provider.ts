/** A stable, provider-neutral identity for a supported coding-agent platform. */
export type ProviderId = "codex" | "claude";

/** Identifies an initial provider without prescribing adapter behavior or policy. */
export interface ProviderDescriptor {
  readonly id: ProviderId;
  readonly displayName: string;
}
