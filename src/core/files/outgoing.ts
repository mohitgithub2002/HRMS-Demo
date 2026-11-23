import "server-only";
/**
 * Outgoing files (PRD §12 rule 2, ST-09): every file the system builds for a bank or a portal is first PREVIEWED,
 * then APPROVED, and only then downloaded — each step logged with its checksum. The person who built the file cannot
 * approve it (maker-checker). The bytes are a StoredFile of the organisation; FileRecord is the register.
 */
import { submitForApproval } from "@/core/approvals/engine";
import type { ApprovalDetails } from "@/core/approvals/details";
import { audit } from "@/core/audit";
import type { Actor } from "@/core/auth/session";
import { badRequest, forbidden, notFound } from "@/core/errors";
import type { Tx } from "@/core/tenancy/scoped";
import { loadFile, mimeOf, saveFile, type FileKind } from "@/core/storage";

export interface OutgoingFileInput {
  kind: string;
  /** "2026-10", "2026-27 Q2" … */
  period?: string | null;
  fileName: string;
  ext: FileKind;
  mimeType?: string;
  buffer: Buffer;
  /** First rows shown on the preview screen, plus counts and totals. */
  preview: { columns: string[]; rows: (string | number)[][]; totalRows: number; totals?: Record<string, string | number> };
  title: string;
  titleHi?: string;
  /** Where the file came from, e.g. /recruitment?tab=files */
  link?: string;
}

export async function createOutgoingFile(actor: Actor, input: OutgoingFileInput, tx?: Tx) {
  const work = async (t: Tx) => {
    const stored = await saveFile(t, { name: input.fileName, buffer: input.buffer, contentType: input.mimeType ?? mimeOf(input.ext), createdById: actor.userId });
    const file = await t.fileRecord.create({
      data: {
        direction: "OUTGOING",
        kind: input.kind,
        period: input.period ?? null,
        fileName: input.fileName,
        mimeType: input.mimeType ?? mimeOf(input.ext),
        size: stored.size,
        sha256: stored.sha256,
        storageKey: stored.id,
        status: "PREVIEW",
        meta: JSON.parse(JSON.stringify({ preview: input.preview, link: input.link ?? null })),
        createdById: actor.userId,
        createdByName: actor.name,
      } as never,
    });
    await submitForApproval(t, actor, {
      kind: "file.release",
      title: input.title,
      titleHi: input.titleHi,
      details: {
        summary: "Look at the preview, then approve so the file can be downloaded and uploaded to the portal or bank.",
        summaryHi: "पूर्वावलोकन देखें, फिर स्वीकृत करें ताकि फ़ाइल डाउनलोड होकर पोर्टल या बैंक पर अपलोड हो सके।",
        link: `/files/${file.id}`,
        rows: [
          { label: "File", labelHi: "फ़ाइल", new: input.fileName },
          { label: "Rows", labelHi: "पंक्तियाँ", new: String(input.preview.totalRows) },
          ...Object.entries(input.preview.totals ?? {}).map(([k, v]) => ({ label: k, new: String(v) })),
          { label: "Checksum (SHA-256)", labelHi: "चेकसम (SHA-256)", new: stored.sha256 },
        ],
      } satisfies ApprovalDetails,
      payload: { fileId: file.id },
      entityType: "FileRecord",
      entityId: file.id,
    });
    await audit(t, actor, {
      action: "GENERATE",
      entityType: "FileRecord",
      entityId: file.id,
      summary: `Built ${input.fileName} (${input.preview.totalRows} rows), waiting for approval`,
      newValue: { kind: input.kind, period: input.period, sha256: stored.sha256, size: stored.size },
    });
    return file;
  };
  return tx ? work(tx) : actor.db.$transaction(work);
}

/** Who may see generated files at all: the people who build or approve them. */
export function canSeeFiles(actor: Pick<Actor, "permissions">) {
  return actor.permissions.some((p) => ["HR", "PAYROLL", "PENSION", "CHECKER", "APPROVER", "PAY_BILL_SIGNER"].includes(p));
}

export async function getFile(actor: Actor, id: string) {
  if (!canSeeFiles(actor)) throw forbidden();
  const file = await actor.db.fileRecord.findFirst({ where: { id } });
  if (!file) throw notFound();
  return file;
}

export async function listFiles(actor: Actor, kinds?: string[]) {
  if (!canSeeFiles(actor)) throw forbidden();
  return actor.db.fileRecord.findMany({ where: { direction: "OUTGOING", ...(kinds ? { kind: { in: kinds } } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
}

/** Download — only after the file was approved. Every download is logged with the checksum. */
export async function downloadFile(actor: Actor, id: string) {
  const file = await getFile(actor, id);
  if (file.status !== "APPROVED" && file.status !== "DOWNLOADED") throw badRequest("files.notApproved");
  const { buffer } = await loadFile(actor.db, file.storageKey);
  await actor.db.$transaction(async (tx) => {
    await tx.fileRecord.update({ where: { id }, data: { status: "DOWNLOADED", downloadCount: { increment: 1 }, lastDownloadAt: new Date() } });
    await audit(tx, actor, { action: "DOWNLOAD", entityType: "FileRecord", entityId: id, summary: `Downloaded ${file.fileName}`, newValue: { sha256: file.sha256, size: file.size } });
  });
  return { buffer, file };
}
