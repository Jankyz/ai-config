import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import type { HttpClient } from "../../src/sources/github.js";

const fixtureRoot = join(
  process.cwd(),
  "tests",
  "fixtures",
  "phase91-external",
);

type FixtureSource = {
  readonly repository: string;
  readonly commit: string;
  readonly license: string;
  readonly resources: readonly {
    readonly path: string;
    readonly directory: string;
  }[];
};

const sources: readonly FixtureSource[] = [
  {
    repository: "mattpocock/skills",
    commit: "3cca18b368ae95cdbdebbff572ccafa662551015",
    license: join(process.cwd(), "third_party", "matt", "LICENSE"),
    resources: [
      {
        path: "skills/engineering/codebase-design",
        directory: join(
          fixtureRoot,
          "matt",
          "skills",
          "engineering",
          "codebase-design",
        ),
      },
      {
        path: "skills/productivity/writing-for-agents",
        directory: join(
          fixtureRoot,
          "matt",
          "skills",
          "productivity",
          "writing-for-agents",
        ),
      },
    ],
  },
  {
    repository: "nextlevelbuilder/ui-ux-pro-max-skill",
    commit: "4aad0584d92131626b16d4ff4d77f0455385013c",
    license: join(process.cwd(), "third_party", "ui-ux-pro-max", "LICENSE"),
    resources: [
      {
        path: "src/ui-ux-pro-max",
        directory: join(fixtureRoot, "ui-ux-pro-max", "src", "ui-ux-pro-max"),
      },
    ],
  },
];

async function files(
  directory: string,
  prefix = "",
): Promise<readonly { path: string; bytes: Uint8Array; mode: number }[]> {
  const output: { path: string; bytes: Uint8Array; mode: number }[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) output.push(...(await files(target, path)));
    else if (entry.isFile())
      output.push({
        path,
        bytes: await readFile(target),
        mode: (await stat(target)).mode & 0o777,
      });
  }
  return output;
}

function header(path: string, mode: number, size: number): Buffer {
  const result = Buffer.alloc(512);
  if (Buffer.byteLength(path) <= 100) result.write(path);
  else {
    const pivot = path.lastIndexOf("/", 100);
    result.write(path.slice(pivot + 1));
    result.write(path.slice(0, pivot), 345);
  }
  result.write(mode.toString(8).padStart(7, "0"), 100);
  result.write(size.toString(8).padStart(11, "0"), 124);
  result[156] = "0".charCodeAt(0);
  return result;
}

function tar(
  entries: readonly { path: string; bytes: Uint8Array; mode: number }[],
): Uint8Array {
  const blocks: Buffer[] = [];
  for (const entry of entries) {
    const body = Buffer.from(entry.bytes);
    blocks.push(
      header(entry.path, entry.mode, body.byteLength),
      body,
      Buffer.alloc((512 - (body.byteLength % 512)) % 512),
    );
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}

/** Explicit test-only codeload fixture. Production never reads this directory. */
export async function phase91DependencyClient(): Promise<HttpClient> {
  const responses = new Map<string, Uint8Array>();
  for (const source of sources) {
    const prefix = `${source.repository.split("/")[1]}-${source.commit}/`;
    const entries: { path: string; bytes: Uint8Array; mode: number }[] = [
      {
        path: `${prefix}LICENSE`,
        bytes: await readFile(source.license),
        mode: 0o644,
      },
    ];
    for (const resource of source.resources)
      for (const file of await files(resource.directory))
        entries.push({
          path: `${prefix}${resource.path}/${file.path}`,
          bytes: file.bytes,
          mode: file.mode,
        });
    responses.set(
      `https://codeload.github.com/${source.repository}/tar.gz/${source.commit}`,
      tar(entries),
    );
  }
  return {
    async get(url: string) {
      const body = responses.get(url);
      return body
        ? { status: 200, body }
        : { status: 404, body: new Uint8Array() };
    },
  };
}
