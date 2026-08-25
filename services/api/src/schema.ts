import { createSchema } from 'graphql-yoga';
import { z } from 'zod';
import { dataStore } from './data-store.js';

const mobileChangeSchema = z.object({
  localId: z.string().min(1), obligationId: z.string().min(1), inspector: z.string().min(1),
  completedAt: z.string().datetime(), notes: z.string(), reading: z.string(), photoCount: z.number().int().min(0).max(12),
});

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    enum Risk { LOW MEDIUM HIGH }
    enum ObligationStatus { OPEN IN_PROGRESS AWAITING_REVIEW COMPLETE }
    enum ReviewStatus { PROPOSED ACCEPTED REJECTED }
    type Facility { id: ID!, name: String!, client: String!, location: String!, readiness: Int!, risk: Risk! }
    type Obligation { id: ID!, facilityId: ID!, facility: Facility!, title: String!, dueDate: String!, frequency: String!, status: ObligationStatus!, risk: Risk!, assignedTo: String!, evidenceRequired: String! }
    type Proposal { id: ID!, documentId: ID!, title: String!, requirement: String!, frequency: String!, sourcePage: Int!, sourceText: String!, confidence: Float!, status: ReviewStatus! }
    type FieldSubmission { id: ID!, obligationId: ID!, obligation: Obligation!, inspector: String!, completedAt: String!, notes: String!, reading: String!, photoCount: Int!, syncState: String! }
    type Dashboard { openObligations: Int!, attentionRequired: Int!, averageReadiness: Int!, pendingReviews: Int!, fieldSubmissions: Int! }
    type SyncResult { acceptedIds: [ID!]!, serverTime: String! }
    input MobileChangeInput { localId: ID!, obligationId: ID!, inspector: String!, completedAt: String!, notes: String!, reading: String!, photoCount: Int! }
    type Query { dashboard: Dashboard!, facilities: [Facility!]!, obligations(facilityId: ID): [Obligation!]!, proposals(documentId: ID): [Proposal!]!, submissions: [FieldSubmission!]! }
    type Mutation { acceptProposal(id: ID!): Proposal!, rejectProposal(id: ID!): Proposal!, syncMobile(changes: [MobileChangeInput!]!): SyncResult! }
  `,
  resolvers: {
    Query: {
      dashboard: () => dataStore.dashboard(),
      facilities: () => dataStore.listFacilities(),
      obligations: (_root, args: { facilityId?: string }) => dataStore.listObligations(args.facilityId),
      proposals: (_root, args: { documentId?: string }) => dataStore.listProposals(args.documentId),
      submissions: () => dataStore.listSubmissions(),
    },
    Mutation: {
      acceptProposal: (_root, args: { id: string }) => dataStore.reviewProposal(args.id, 'ACCEPTED'),
      rejectProposal: (_root, args: { id: string }) => dataStore.reviewProposal(args.id, 'REJECTED'),
      syncMobile: (_root, args: { changes: unknown[] }) => dataStore.syncMobile(z.array(mobileChangeSchema).parse(args.changes)),
    },
    Obligation: { facility: async (obligation: { facilityId: string }) => (await dataStore.listFacilities()).find(item => item.id === obligation.facilityId) },
    FieldSubmission: { obligation: async (submission: { obligationId: string }) => (await dataStore.listObligations()).find(item => item.id === submission.obligationId) },
  },
});
