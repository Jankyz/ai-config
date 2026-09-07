import { treeDigest, type SourceFile } from "./integrity.js";
export interface ResourceDiff {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changed: readonly string[];
  readonly unchanged: readonly string[];
  readonly oldDigest: string;
  readonly newDigest: string;
  readonly oldRevision: string;
  readonly newRevision: string;
  readonly licenseChanged: boolean;
}
export function diffResources(
  oldFiles: readonly SourceFile[],
  newFiles: readonly SourceFile[],
  oldRevision: string,
  newRevision: string,
  oldLicense: string,
  newLicense: string,
): ResourceDiff {
  const oldMap = new Map(oldFiles.map((file) => [file.path, file]));
  const newMap = new Map(newFiles.map((file) => [file.path, file]));
  const added = [...newMap.keys()].filter((path) => !oldMap.has(path)).sort();
  const removed = [...oldMap.keys()].filter((path) => !newMap.has(path)).sort();
  const shared = [...newMap.keys()].filter((path) => oldMap.has(path)).sort();
  const changed = shared.filter(
    (path) =>
      Buffer.compare(
        Buffer.from(oldMap.get(path)!.bytes),
        Buffer.from(newMap.get(path)!.bytes),
      ) !== 0 || oldMap.get(path)!.mode !== newMap.get(path)!.mode,
  );
  return {
    added,
    removed,
    changed,
    unchanged: shared.filter((path) => !changed.includes(path)),
    oldDigest: treeDigest(oldFiles),
    newDigest: treeDigest(newFiles),
    oldRevision,
    newRevision,
    licenseChanged: oldLicense !== newLicense,
  };
}
