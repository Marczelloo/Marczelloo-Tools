import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { randomBytes } from "crypto";

export interface ShortLink {
  original: string;
  created: number;
  clicks: number;
}

const STORE_DIR = "./tmp/url-shortener";
const STORE_PATH = `${STORE_DIR}/links.json`;
let operationQueue = Promise.resolve();

async function readStore(): Promise<Record<string, ShortLink>> {
  try {
    return JSON.parse(await readFile(STORE_PATH, "utf8")) as Record<string, ShortLink>;
  } catch {
    return {};
  }
}

async function writeStore(store: Record<string, ShortLink>): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  const tempPath = `${STORE_PATH}.${process.pid}.tmp`;
  await writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
  await rename(tempPath, STORE_PATH);
}

async function withStoreLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = operationQueue;
  let release!: () => void;
  operationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

export async function createShortLink(
  original: string
): Promise<{ code: string; link: ShortLink }> {
  return withStoreLock(async () => {
    const store = await readStore();
    let code = "";
    do {
      code = randomBytes(5).toString("base64url").slice(0, 7);
    } while (store[code]);
    const link = { original, created: Date.now(), clicks: 0 };
    store[code] = link;
    await writeStore(store);
    return { code, link };
  });
}

export async function getShortLink(
  code: string,
  incrementClicks = false
): Promise<ShortLink | null> {
  return withStoreLock(async () => {
    const store = await readStore();
    const link = store[code];
    if (!link) return null;
    if (incrementClicks) {
      link.clicks += 1;
      await writeStore(store);
    }
    return link;
  });
}
