import { PrismaClient } from '@prisma/client';
import { facilities, obligations, proposals, submissions } from './seed.js';
import type { MobileChange, Obligation, Proposal } from './types.js';

const prisma = new PrismaClient();

const clients = [
  { id: 'client-summit', name: 'Summit Energy' },
  { id: 'client-prairie', name: 'Prairie Midstream' },
];

function facilityClientId(client: string) {
  return client === 'Summit Energy' ? 'client-summit' : 'client-prairie';
}

function mapObligation(item: {
  id: string; facilityId: string; title: string; dueDate: Date; frequency: string;
  status: string; risk: string; assignedTo: string | null; evidenceRequired: string;
}): Obligation {
  return {
    ...item,
    dueDate: item.dueDate.toISOString().slice(0, 10),
    assignedTo: item.assignedTo ?? 'Unassigned',
    status: item.status as Obligation['status'],
    risk: item.risk as Obligation['risk'],
  };
}

export class PrismaRookStore {
  async initialize() {
    for (const client of clients) {
      await prisma.client.upsert({ where: { id: client.id }, update: client, create: client });
    }
    for (const facility of facilities) {
      await prisma.facility.upsert({
        where: { id: facility.id },
        update: { name: facility.name, location: facility.location, readiness: facility.readiness, risk: facility.risk },
        create: { id: facility.id, clientId: facilityClientId(facility.client), name: facility.name, location: facility.location, readiness: facility.readiness, risk: facility.risk },
      });
    }
    await prisma.document.upsert({
      where: { id: 'doc-demo-approval' },
      update: { name: 'North_Ridge_Approval.pdf' },
      create: { id: 'doc-demo-approval', facilityId: 'fac-north-ridge', name: 'North_Ridge_Approval.pdf', storageKey: 'synthetic/doc-demo-approval.pdf' },
    });
    for (const proposal of proposals) {
      await prisma.proposal.upsert({
        where: { id: proposal.id },
        update: { title: proposal.title, requirement: proposal.requirement, frequency: proposal.frequency, sourcePage: proposal.sourcePage, sourceText: proposal.sourceText, confidence: proposal.confidence },
        create: proposal,
      });
    }
    for (const obligation of obligations) {
      await prisma.obligation.upsert({
        where: { id: obligation.id },
        update: { title: obligation.title, dueDate: new Date(obligation.dueDate), frequency: obligation.frequency, risk: obligation.risk, assignedTo: obligation.assignedTo, evidenceRequired: obligation.evidenceRequired },
        create: { ...obligation, dueDate: new Date(obligation.dueDate) },
      });
    }
    for (const submission of submissions) {
      await prisma.fieldSubmission.upsert({
        where: { id: submission.id },
        update: {},
        create: {
          id: submission.id,
          obligationId: submission.obligationId,
          inspector: submission.inspector,
          completedAt: new Date(submission.completedAt),
          notes: submission.notes,
          reading: submission.reading,
          photoCount: submission.photoCount,
          deviceId: 'seed',
        },
      });
    }
  }

  async dashboard() {
    const [allObligations, allFacilities, pendingReviews, fieldSubmissions] = await Promise.all([
      prisma.obligation.findMany({ select: { status: true, risk: true } }),
      prisma.facility.findMany({ select: { readiness: true } }),
      prisma.proposal.count({ where: { status: 'PROPOSED' } }),
      prisma.fieldSubmission.count(),
    ]);
    const open = allObligations.filter(item => item.status !== 'COMPLETE');
    return {
      openObligations: open.length,
      attentionRequired: open.filter(item => item.risk === 'HIGH').length,
      averageReadiness: Math.round(allFacilities.reduce((sum, item) => sum + item.readiness, 0) / Math.max(allFacilities.length, 1)),
      pendingReviews,
      fieldSubmissions,
    };
  }

  async listFacilities() {
    const rows = await prisma.facility.findMany({ include: { client: true }, orderBy: { name: 'asc' } });
    return rows.map(item => ({ id: item.id, name: item.name, client: item.client.name, location: item.location, readiness: item.readiness, risk: item.risk }));
  }

  async listObligations(facilityId?: string) {
    const rows = await prisma.obligation.findMany({ where: facilityId ? { facilityId } : undefined, orderBy: { dueDate: 'asc' } });
    return rows.map(mapObligation);
  }

  async listProposals(documentId?: string) {
    const rows = await prisma.proposal.findMany({ where: documentId ? { documentId } : undefined, orderBy: { sourcePage: 'asc' } });
    return rows.map(item => ({ ...item, status: item.status as Proposal['status'] }));
  }

  async listSubmissions() {
    const rows = await prisma.fieldSubmission.findMany({ orderBy: { completedAt: 'desc' } });
    return rows.map(item => ({
      id: item.id,
      obligationId: item.obligationId,
      inspector: item.inspector,
      completedAt: item.completedAt.toISOString(),
      notes: item.notes,
      reading: item.reading,
      photoCount: item.photoCount,
      syncState: 'SYNCED' as const,
    }));
  }

  async reviewProposal(id: string, status: 'ACCEPTED' | 'REJECTED') {
    return prisma.$transaction(async tx => {
      const proposal = await tx.proposal.findUnique({ where: { id } });
      if (!proposal) throw new Error(`Proposal ${id} was not found`);
      const reviewed = await tx.proposal.update({ where: { id }, data: { status, reviewedAt: new Date() } });
      if (status === 'ACCEPTED') {
        await tx.obligation.upsert({
          where: { id: `obl-${proposal.id}` },
          update: {},
          create: {
            id: `obl-${proposal.id}`,
            facilityId: 'fac-north-ridge',
            title: proposal.title,
            dueDate: new Date('2026-09-30'),
            frequency: proposal.frequency,
            status: 'OPEN',
            risk: 'MEDIUM',
            assignedTo: 'Unassigned',
            evidenceRequired: proposal.requirement,
          },
        });
      }
      await tx.auditEvent.create({ data: { actorId: 'demo-consultant', action: `PROPOSAL_${status}`, entityType: 'Proposal', entityId: id, metadata: { sourcePage: proposal.sourcePage } } });
      return { ...reviewed, status: reviewed.status as Proposal['status'] };
    });
  }

  async syncMobile(changes: MobileChange[]) {
    const acceptedIds: string[] = [];
    await prisma.$transaction(async tx => {
      for (const change of changes) {
        const duplicate = await tx.fieldSubmission.findUnique({ where: { id: change.localId } });
        if (!duplicate) {
          const obligation = await tx.obligation.findUnique({ where: { id: change.obligationId } });
          if (!obligation) throw new Error(`Unknown obligation ${change.obligationId}`);
          await tx.fieldSubmission.create({
            data: {
              id: change.localId,
              obligationId: change.obligationId,
              inspector: change.inspector,
              completedAt: new Date(change.completedAt),
              notes: change.notes,
              reading: change.reading,
              photoCount: change.photoCount,
              deviceId: 'rook-field',
            },
          });
          await tx.obligation.update({ where: { id: change.obligationId }, data: { status: 'AWAITING_REVIEW' } });
          await tx.auditEvent.create({ data: { actorId: change.inspector, action: 'FIELD_SUBMISSION_SYNCED', entityType: 'FieldSubmission', entityId: change.localId, metadata: { photoCount: change.photoCount } } });
        }
        acceptedIds.push(change.localId);
      }
    });
    return { acceptedIds, serverTime: new Date().toISOString() };
  }
}
