/**
 * Outbox (PRD §12 rule 5): every approved change writes an event in the same transaction, for other systems to
 * pick up later. Rows belong to the acting organisation.
 */
import type { Prisma } from "@/generated/prisma/client";
import { toJson } from "./audit";
import type { DbLike } from "./tenancy/scoped";

export async function emit(tx: DbLike, type: string, entity: { type: string; id?: string | null }, payload: unknown = {}) {
  await tx.outboxEvent.create({
    data: { type, entityType: entity.type, entityId: entity.id ?? null, payload: toJson(payload) ?? {} } as Prisma.OutboxEventUncheckedCreateInput,
  });
}
