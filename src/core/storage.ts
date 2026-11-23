/**
 * Uploaded documents and generated files. Every file is a StoredFile row of its organisation (RLS), so a file id
 * from another organisation is simply "not found". With STORAGE_DRIVER=disk the bytes live at
 * STORAGE_DIR/<tenantId>/<fileId> (path built from ids only, never from a name); with "database" they live in the row.
 * STORAGE_DIR is a run-time setting, so the bundler is told not to trace these paths (turbopackIgnore).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import { sha256 } from "./crypto";
import { AppError } from "./errors";
import type { DbLike } from "./tenancy/scoped";

export type FileKind = "pdf" | "png" | "jpg" | "xlsx" | "csv" | "txt" | "zip" | "bin";

const MIME: Record<FileKind, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  txt: "text/plain",
  zip: "application/zip",
  bin: "application/octet-stream",
};

export const mimeOf = (kind: FileKind) => MIME[kind];

/** Recognises a file by its first bytes, not by its name (a renamed .exe is not a PDF). */
export function sniff(buffer: Buffer): FileKind | null {
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return "xlsx";
  return null;
}

const driver = () => (process.env.STORAGE_DRIVER === "database" || (!process.env.STORAGE_DRIVER && process.env.VERCEL) ? "database" : "disk");
const root = () => path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR ?? "./storage");
const SAFE = /^[A-Za-z0-9_-]+$/;

function diskPath(tenantId: string, fileId: string) {
  if (!SAFE.test(tenantId) || !SAFE.test(fileId)) throw new Error("Bad storage id");
  return path.join(/*turbopackIgnore: true*/ root(), tenantId, fileId);
}

/** Saves a file for the organisation of `db`; returns its row (id, sha256, size). */
export async function saveFile(db: DbLike, input: { name: string; buffer: Buffer; contentType: string; createdById?: string | null }) {
  const d = driver();
  const row = await db.storedFile.create({
    data: {
      name: input.name.slice(0, 200),
      contentType: input.contentType,
      size: input.buffer.length,
      sha256: sha256(input.buffer),
      driver: d,
      data: d === "database" ? new Uint8Array(input.buffer) : null,
      createdById: input.createdById ?? null,
    } as Prisma.StoredFileUncheckedCreateInput,
  });
  if (d === "disk") {
    const full = diskPath(row.tenantId, row.id);
    await mkdir(/*turbopackIgnore: true*/ path.dirname(full), { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ full, input.buffer, { mode: 0o640 });
  }
  return { id: row.id, sha256: row.sha256, size: row.size };
}

/** A file of the organisation of `db`. Another organisation's id is "not found". */
export async function loadFile(db: DbLike, fileId: string): Promise<{ buffer: Buffer; name: string; contentType: string; sha256: string }> {
  const row = await db.storedFile.findUnique({ where: { id: fileId } });
  if (!row) throw new AppError(404, "not_found", "errors.notFound");
  let buffer: Buffer | null = row.data ? Buffer.from(row.data) : null;
  if (!buffer) buffer = await readFile(/*turbopackIgnore: true*/ diskPath(row.tenantId, row.id)).catch(() => null);
  if (!buffer) throw new AppError(410, "file_gone", "errors.fileGone");
  return { buffer, name: row.name, contentType: row.contentType, sha256: row.sha256 };
}

/**
 * The ported modules' shape: save bytes of a known kind and keep the returned key (the StoredFile id) on their own
 * row; read them back by that key. Same organisation wall as saveFile / loadFile.
 */
export async function storeBytes(db: DbLike, buffer: Buffer, kind: FileKind, name = `file.${kind}`, createdById?: string | null) {
  const row = await saveFile(db, { name, buffer, contentType: mimeOf(kind), createdById });
  return { key: row.id, sha256: row.sha256, size: row.size };
}

export async function readBytes(db: DbLike, key: string): Promise<Buffer> {
  return (await loadFile(db, key)).buffer;
}
