import {
  access,
  lstat,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
  readCachedResource,
  SourceError,
  treeDigest,
  writeCachedResource,
} from "../../src/sources/index.js";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

async function fixture() {
  const base = await realpath(
    await mkdtemp(join(tmpdir(), "ai-config-cache-safety-")),
  );
  roots.push(base);
  const root = join(base, "cache");
  const files = [{ path: "skill/a.txt", bytes: Buffer.from("safe") }];
  return { base, root, files, digest: treeDigest(files) };
}

describe("source cache filesystem safety", () => {
  it("writes and reads a private normal cache entry", async () => {
    const test = await fixture();
    await writeCachedResource(test.root, "entry", test.files);
    expect(
      await readCachedResource(test.root, "entry", test.digest),
    ).toHaveLength(1);
    expect((await lstat(join(test.root, "entry.json"))).mode & 0o777).toBe(
      0o600,
    );
  });

  it("rejects a symlinked cache entry without changing its target", async () => {
    const test = await fixture();
    await mkdir(test.root, { mode: 0o700 });
    const outside = join(test.base, "outside.json");
    await writeFile(outside, "outside", "utf8");
    await symlink(outside, join(test.root, "entry.json"));
    await expect(
      readCachedResource(test.root, "entry", test.digest),
    ).rejects.toThrow(SourceError);
    await expect(
      writeCachedResource(test.root, "entry", test.files),
    ).rejects.toThrow(SourceError);
    await expect(access(outside)).resolves.toBeUndefined();
    await expect(readFile(outside, "utf8")).resolves.toBe("outside");
  });

  it("rejects a cache root whose ancestor aliases another location", async () => {
    const test = await fixture();
    const outside = join(test.base, "outside");
    await mkdir(outside);
    const alias = join(test.base, "alias");
    await symlink(outside, alias);
    await expect(
      writeCachedResource(join(alias, "cache"), "entry", test.files),
    ).rejects.toThrow(/cache root/i);
  });

  it("removes a corrupt regular entry without escaping the cache root", async () => {
    const test = await fixture();
    await writeCachedResource(test.root, "entry", test.files);
    await writeFile(join(test.root, "entry.json"), "not json", "utf8");
    await expect(
      readCachedResource(test.root, "entry", test.digest),
    ).resolves.toBeUndefined();
    await expect(access(join(test.root, "entry.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("treats complete cache deletion as harmless", async () => {
    const test = await fixture();
    await writeCachedResource(test.root, "entry", test.files);
    await rm(test.root, { recursive: true });
    await expect(
      readCachedResource(test.root, "entry", test.digest),
    ).resolves.toBeUndefined();
  });

  it("rejects an oversized local cache record before reading its JSON", async () => {
    const test = await fixture();
    await mkdir(test.root, { mode: 0o700 });
    await writeFile(join(test.root, "entry.json"), Buffer.alloc(129));
    await expect(
      readCachedResource(test.root, "entry", test.digest, {
        maxFileBytes: 64,
        maxTotalBytes: 64,
        maxFiles: 2,
        maxRecordBytes: 128,
      }),
    ).resolves.toBeUndefined();
    await expect(access(join(test.root, "entry.json"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects direct cache writes that exceed acquisition-compatible limits", async () => {
    const test = await fixture();
    const limits = {
      maxFileBytes: 4,
      maxTotalBytes: 5,
      maxFiles: 1,
      maxRecordBytes: 256,
    };
    await expect(
      writeCachedResource(
        test.root,
        "file-size",
        [{ path: "large", bytes: Buffer.alloc(5) }],
        limits,
      ),
    ).rejects.toThrow(/file.*size limit/i);
    await expect(
      writeCachedResource(
        test.root,
        "file-count",
        [
          { path: "one", bytes: Buffer.alloc(1) },
          { path: "two", bytes: Buffer.alloc(1) },
        ],
        limits,
      ),
    ).rejects.toThrow(/file-count limit/i);
    await expect(
      writeCachedResource(
        test.root,
        "total-size",
        [
          { path: "one", bytes: Buffer.alloc(3) },
          { path: "two", bytes: Buffer.alloc(3) },
        ],
        { ...limits, maxFiles: 2 },
      ),
    ).rejects.toThrow(/total-size limit/i);
  });
});
