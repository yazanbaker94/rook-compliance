import { createSchema } from 'graphql-yoga';
import { z } from 'zod';
import { dataStore } from './data-store.js';

const mobileChangeSchema = z.object({
  localId: z.string().min(1), obligationId: z.string().min(1), inspector: z.string().min(1),
  completedAt: z.string().datetime(), notes: z.string(), reading: z.string(), photoCount: z.number().int().min(0).max(12),
});

const createObligationSchema = z.object({
  facilityId: z.string().min(1), title: z.string().min(3).max(180), dueDate: z.iso.date(),
  frequency: z.string().min(2).max(80), risk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  assignedTo: z.string().min(2).max(120), evidenceRequired: z.string().min(3).max(500),
});

const proposalUpdateSchema = z.object({
  title: z.string().min(3).max(180), requirement: z.string().min(3).max(1000), frequency: z.string().min(2).max(80),
});

const importedProposalSchema = z.object({
  title: z.string().min(3).max(180), requirement: z.string().min(3).max(1000), frequency: z.string().min(2).max(80),
  sourcePage: z.number().int().positive(), sourceText: z.string().min(3).max(2000), confidence: z.number().min(0).max(1),
});

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    enum Risk { LOW MEDIUM HIGH }
    enum ObligationStatus { OPEN IN_PROGRESS AWAITING_REVIEW COMPLETE }
    enum ReviewStatus { PROPOSED ACCEPTED REJECTED }
    enum SubmissionReviewStatus { PENDING APPROVED CORRECTION_REQUESTED }
    type Facility { id: ID!, name: String!, client: String!, location: String!, readiness: Int!, risk: Risk! }
    type Obligation { id: ID!, facilityId: ID!, facility: Facility!, title: String!, dueDate: String!, frequency: String!, status: ObligationStatus!, risk: Risk!, assignedTo: String!, evidenceRequired: String! }
    type Proposal { id: ID!, documentId: ID!, title: String!, requirement: String!, frequency: String!, sourcePage: Int!, sourceText: String!, confidence: Float!, status: ReviewStatus! }
    type FieldSubmission { id: ID!, obligationId: ID!, obligation: Obligation!, inspector: String!, completedAt: String!, notes: String!, reading: String!, photoCount: Int!, syncState: String!, reviewStatus: SubmissionReviewStatus!, reviewNote: String!, reviewedAt: String }
    type Document { id: ID!, facilityId: ID!, name: String!, createdAt: String! }
    type AuditEvent { id: ID!, actorId: String!, action: String!, entityType: String!, entityId: String!, detail: String!, createdAt: String! }
    type Dashboard { openObligations: Int!, attentionRequired: Int!, averageReadiness: Int!, pendingReviews: Int!, fieldSubmissions: Int! }
    type SyncResult { acceptedIds: [ID!]!, serverTime: String! }
    input MobileChangeInput { localId: ID!, obligationId: ID!, inspector: String!, completedAt: String!, notes: String!, reading: String!, photoCount: Int! }
    input CreateObligationInput { facilityId: ID!, title: String!, dueDate: String!, frequency: String!, risk: Risk!, assignedTo: String!, evidenceRequired: String! }
    input UpdateProposalInput { title: String!, requirement: String!, frequency: String! }
    input ImportedProposalInput { title: String!, requirement: String!, frequency: String!, sourcePage: Int!, sourceText: String!, confidence: Float! }
    type Query { dashboard: Dashboard!, facilities: [Facility!]!, obligations(facilityId: ID): [Obligation!]!, proposals(documentId: ID): [Proposal!]!, submissions: [FieldSubmission!]!, documents: [Document!]!, auditEvents(entityType: String, entityId: ID): [AuditEvent!]! }
    type Mutation {
      acceptProposal(id: ID!): Proposal!
      rejectProposal(id: ID!): Proposal!
      updateProposal(id: ID!, input: UpdateProposalInput!): Proposal!
      importDocument(facilityId: ID!, name: String!, proposals: [ImportedProposalInput!]!): Document!
      createObligation(input: CreateObligationInput!): Obligation!
      updateObligationStatus(id: ID!, status: ObligationStatus!): Obligation!
      assignObligation(id: ID!, assignedTo: String!): Obligation!
      reviewSubmission(id: ID!, status: SubmissionReviewStatus!, note: String!): FieldSubmission!
      syncMobile(changes: [MobileChangeInput!]!): SyncResult!
    }
  `,
  resolvers: {
    Query: {
      dashboard: () => dataStore.dashboard(),
      facilities: () => dataStore.listFacilities(),
      obligations: (_root, args: { facilityId?: string }) => dataStore.listObligations(args.facilityId),
      proposals: (_root, args: { documentId?: string }) => dataStore.listProposals(args.documentId),
      submissions: () => dataStore.listSubmissions(),
      documents: () => dataStore.listDocuments(),
      auditEvents: (_root, args: { entityType?: string; entityId?: string }) => dataStore.listAuditEvents(args.entityType, args.entityId),
    },
    Mutation: {
      acceptProposal: (_root, args: { id: string }) => dataStore.reviewProposal(args.id, 'ACCEPTED'),
      rejectProposal: (_root, args: { id: string }) => dataStore.reviewProposal(args.id, 'REJECTED'),
      updateProposal: (_root, args: { id: string; input: unknown }) => dataStore.updateProposal(args.id, proposalUpdateSchema.parse(args.input)),
      importDocument: (_root, args: { facilityId: string; name: string; proposals: unknown[] }) => dataStore.importDocument(args.facilityId, z.string().min(3).max(180).parse(args.name), z.array(importedProposalSchema).min(1).max(50).parse(args.proposals)),
      createObligation: (_root, args: { input: unknown }) => dataStore.createObligation(createObligationSchema.parse(args.input)),
      updateObligationStatus: (_root, args: { id: string; status: 'OPEN' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'COMPLETE' }) => dataStore.updateObligationStatus(args.id, args.status),
      assignObligation: (_root, args: { id: string; assignedTo: string }) => dataStore.updateObligationAssignee(args.id, z.string().min(2).max(120).parse(args.assignedTo)),
      reviewSubmission: (_root, args: { id: string; status: 'PENDING' | 'APPROVED' | 'CORRECTION_REQUESTED'; note: string }) => dataStore.reviewSubmission(args.id, args.status, z.string().max(500).parse(args.note)),
      syncMobile: (_root, args: { changes: unknown[] }) => dataStore.syncMobile(z.array(mobileChangeSchema).parse(args.changes)),
    },
    Obligation: { facility: async (obligation: { facilityId: string }) => (await dataStore.listFacilities()).find(item => item.id === obligation.facilityId) },
    FieldSubmission: { obligation: async (submission: { obligationId: string }) => (await dataStore.listObligations()).find(item => item.id === submission.obligationId) },
  },
});
