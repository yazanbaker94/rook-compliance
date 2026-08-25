CREATE TYPE "Risk" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ObligationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'AWAITING_REVIEW', 'COMPLETE');
CREATE TYPE "ReviewStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED');

CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "readiness" INTEGER NOT NULL DEFAULT 0,
    "risk" "Risk" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "sourcePage" INTEGER NOT NULL,
    "sourceText" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Obligation" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "frequency" TEXT NOT NULL,
    "status" "ObligationStatus" NOT NULL DEFAULT 'OPEN',
    "risk" "Risk" NOT NULL DEFAULT 'LOW',
    "assignedTo" TEXT,
    "evidenceRequired" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Obligation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FieldSubmission" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "inspector" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Facility_clientId_idx" ON "Facility"("clientId");
CREATE INDEX "Obligation_facilityId_dueDate_idx" ON "Obligation"("facilityId", "dueDate");
CREATE INDEX "FieldSubmission_obligationId_idx" ON "FieldSubmission"("obligationId");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

ALTER TABLE "Facility" ADD CONSTRAINT "Facility_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldSubmission" ADD CONSTRAINT "FieldSubmission_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
