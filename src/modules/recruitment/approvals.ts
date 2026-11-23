import "server-only";
import { defineApprovalKind } from "@/core/approvals/registry";
import { audit } from "@/core/audit";
import { sendSms } from "@/core/connectors/sms";
import { env } from "@/core/env";
import { emit } from "@/core/outbox";
import { ensureEmployeeLogin, issueEmployeeId } from "@/modules/employees/service";

/** RO-01: an Admin approves a vacancy before it is advertised. */
defineApprovalKind<{ vacancyId: string }>({
  kind: "vacancy.approve",
  requiredPermission: "APPROVER",
  async onApprove({ tx, payload, actor }) {
    await tx.vacancy.update({ where: { id: payload.vacancyId }, data: { status: "APPROVED", approvedById: actor.userId, approvedAt: new Date() } });
  },
  async onReject({ tx, payload }) {
    await tx.vacancy.update({ where: { id: payload.vacancyId }, data: { status: "REJECTED" } });
  },
  async onReturn({ tx, payload }) {
    await tx.vacancy.update({ where: { id: payload.vacancyId }, data: { status: "CANCELLED" } });
  },
});

/** RO-04: an Admin approves the selection list; after that applicants are frozen and letters can be issued. */
defineApprovalKind<{ vacancyId: string }>({
  kind: "selection.approve",
  requiredPermission: "APPROVER",
  async onApprove({ tx, payload }) {
    await tx.vacancy.update({ where: { id: payload.vacancyId }, data: { selectionStatus: "APPROVED" } });
  },
  async onReject({ tx, payload }) {
    await tx.vacancy.update({ where: { id: payload.vacancyId }, data: { selectionStatus: "OPEN" } });
  },
});

/**
 * RO-06 + flow steps 4–5: the Checker verifies documents and initial pay; approval issues the Employee ID,
 * records the appointment in the service book, puts the person on the next payroll (pro-rata from the date of
 * joining) and sends a login by SMS.
 */
defineApprovalKind<{ joiningId: string; employeeId: string }>({
  kind: "joining.complete",
  requiredPermission: "CHECKER",
  sensitive: true,
  async onApprove({ tx, payload, actor, afterCommit }) {
    const e = await issueEmployeeId(tx, actor, payload.employeeId);
    const joining = await tx.joining.update({ where: { id: payload.joiningId }, data: { status: "COMPLETED", completedAt: new Date() }, include: { applicant: true } });
    const post = await tx.post.findUniqueOrThrow({ where: { id: e.postId } });
    const section = await tx.section.findUniqueOrThrow({ where: { id: e.sectionId } });
    await tx.serviceBookEntry.create({
      data: {
        employeeId: e.id,
        event: "APPOINTMENT",
        eventDate: e.dateOfJoining,
        orderNumber: joining.applicant?.appointmentLetterNo ?? null,
        orderDate: joining.applicant?.appointmentLetterDate ?? null,
        details: `Joined as ${post.name} in ${section.name}${e.payLevel ? ` at Level ${e.payLevel}, Cell ${e.payCell}` : ""}.`,
        detailsHi: `${section.nameHi} में ${post.nameHi} के पद पर कार्यग्रहण।`,
        status: "APPROVED",
        createdById: joining.createdById,
        approvedById: actor.userId,
      },
    });
    // Login by SMS (flow step 5): the Employee login is made with the ID; the welcome SMS goes once it is saved.
    await ensureEmployeeLogin(tx, actor, e);
    if (e.mobile && e.employeeCode) {
      const mobile = e.mobile;
      afterCommit(async () => {
        await sendSms(actor.db, mobile, "welcome", { url: env().APP_URL });
      });
    }
    await audit(tx, actor, { action: "JOINED", entityType: "Employee", entityId: e.id, summary: `${e.employeeCode} joined as ${post.name}` });
    await emit(tx, "employee.joined", { type: "Employee", id: e.id }, { employeeCode: e.employeeCode, dateOfJoining: e.dateOfJoining });
  },
  async onReject({ tx, payload }) {
    await tx.joining.update({ where: { id: payload.joiningId }, data: { status: "IN_PROGRESS" } });
  },
  async onCancel({ tx, payload }) {
    await tx.joining.update({ where: { id: payload.joiningId }, data: { status: "IN_PROGRESS" } });
  },
});
