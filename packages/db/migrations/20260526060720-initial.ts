import type { MigrationFn } from 'umzug'
import type { QueryInterface } from 'sequelize'

export const up: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    CREATE TYPE "UserRole" AS ENUM ('INVESTOR','TC_MEMBER','TC_CHAIR','GM_URHC','EXCO_MEMBER','INVESTMENT_COMMITTEE_MEMBER','BOARD_MEMBER','ADMIN');

    CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT','DRAFT_PAYMENT_PENDING','SUBMITTED','UNDER_TC_REVIEW','TC_CLARIFICATION_REQUESTED','TC_RECOMMENDED','GM_REVIEW','EXCO_REVIEW','INVESTMENT_COMMITTEE_REVIEW','BOARD_APPROVED','SHORTLISTED','NOT_SHORTLISTED','RFP_INVITED','WITHDRAWN');

    CREATE TYPE "EoiSection" AS ENUM ('PRELIMINARY_INFO','LAND_BUSINESS_PROFILE','UTILITIES_INFRASTRUCTURE','H3SE','NATIONAL_CONTENT','DECLARATION');

    CREATE TYPE "DocumentKind" AS ENUM ('CERTIFICATE_OF_INCORPORATION','POWER_OF_ATTORNEY','SHAREHOLDER_ID','ORGANOGRAM','LETTER_OF_INTEREST','BUSINESS_EVIDENCE','SIMILAR_PROJECT_EVIDENCE','H3SE_RECORD','H3SE_POLICY','NATIONAL_CONTENT_EVIDENCE','PAYMENT_PROOF','OTHER');

    CREATE TYPE "PaymentMethod" AS ENUM ('CARD','STANBIC_TRANSFER');

    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','PROOF_UPLOADED','CONFIRMED','FAILED','REFUNDED');

    CREATE TYPE "Currency" AS ENUM ('USD','UGX');

    CREATE TYPE "ReviewActionType" AS ENUM ('ASSIGNED','COMMENTED','REQUESTED_CLARIFICATION','CLARIFICATION_PROVIDED','RECOMMENDED','REJECTED','APPROVED','RETURNED_TO_TC','ESCALATED');

    CREATE TYPE "ApplicationWindowStatus" AS ENUM ('DRAFT','OPEN','CLOSED','ARCHIVED');

    CREATE TABLE "InvestorOrg" (
      "id"                    TEXT         NOT NULL,
      "legalName"             TEXT         NOT NULL,
      "countryOfIncorporation" TEXT,
      "address"               TEXT,
      "phone"                 TEXT,
      "email"                 TEXT,
      "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"             TIMESTAMP(3) NOT NULL,
      CONSTRAINT "InvestorOrg_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "User" (
      "id"            TEXT         NOT NULL,
      "email"         TEXT         NOT NULL,
      "emailVerified" TIMESTAMP(3),
      "passwordHash"  TEXT,
      "name"          TEXT,
      "role"          "UserRole"   NOT NULL DEFAULT 'INVESTOR',
      "investorOrgId" TEXT,
      "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     TIMESTAMP(3) NOT NULL,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "Account" (
      "id"                TEXT NOT NULL,
      "userId"            TEXT NOT NULL,
      "type"              TEXT NOT NULL,
      "provider"          TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      "refresh_token"     TEXT,
      "access_token"      TEXT,
      "expires_at"        INTEGER,
      "token_type"        TEXT,
      "scope"             TEXT,
      "id_token"          TEXT,
      "session_state"     TEXT,
      CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "Session" (
      "id"           TEXT         NOT NULL,
      "sessionToken" TEXT         NOT NULL,
      "userId"       TEXT         NOT NULL,
      "expires"      TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "VerificationToken" (
      "identifier" TEXT         NOT NULL,
      "token"      TEXT         NOT NULL,
      "expires"    TIMESTAMP(3) NOT NULL
    );

    CREATE TABLE "ApplicationWindow" (
      "id"        TEXT                     NOT NULL,
      "name"      TEXT                     NOT NULL,
      "openAt"    TIMESTAMP(3)             NOT NULL,
      "closeAt"   TIMESTAMP(3)             NOT NULL,
      "status"    "ApplicationWindowStatus" NOT NULL DEFAULT 'DRAFT',
      "createdAt" TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3)             NOT NULL,
      CONSTRAINT "ApplicationWindow_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "Application" (
      "id"             TEXT                NOT NULL,
      "reference"      TEXT                NOT NULL,
      "lotReference"   TEXT                NOT NULL,
      "status"         "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
      "ownerUserId"    TEXT                NOT NULL,
      "investorOrgId"  TEXT                NOT NULL,
      "submittedAt"    TIMESTAMP(3),
      "decisionAt"     TIMESTAMP(3),
      "decisionLetter" TEXT,
      "createdAt"      TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"      TIMESTAMP(3)        NOT NULL,
      CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "ApplicationSection" (
      "id"            TEXT         NOT NULL,
      "applicationId" TEXT         NOT NULL,
      "section"       "EoiSection" NOT NULL,
      "payload"       JSONB        NOT NULL,
      "completedAt"   TIMESTAMP(3),
      "updatedAt"     TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ApplicationSection_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "Document" (
      "id"            TEXT         NOT NULL,
      "applicationId" TEXT         NOT NULL,
      "kind"          "DocumentKind" NOT NULL,
      "filename"      TEXT         NOT NULL,
      "storageKey"    TEXT         NOT NULL,
      "mimeType"      TEXT         NOT NULL,
      "sizeBytes"     INTEGER      NOT NULL,
      "uploadedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "Payment" (
      "id"              TEXT             NOT NULL,
      "applicationId"   TEXT             NOT NULL,
      "method"          "PaymentMethod"  NOT NULL,
      "status"          "PaymentStatus"  NOT NULL DEFAULT 'PENDING',
      "currency"        "Currency"       NOT NULL,
      "amount"          DECIMAL(14,2)    NOT NULL,
      "gatewayRef"      TEXT,
      "transferRef"     TEXT,
      "proofDocumentId" TEXT,
      "paidAt"          TIMESTAMP(3),
      "confirmedAt"     TIMESTAMP(3),
      "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"       TIMESTAMP(3)     NOT NULL,
      CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "ReviewAction" (
      "id"            TEXT                NOT NULL,
      "applicationId" TEXT                NOT NULL,
      "actorUserId"   TEXT                NOT NULL,
      "type"          "ReviewActionType"  NOT NULL,
      "fromStatus"    "ApplicationStatus",
      "toStatus"      "ApplicationStatus",
      "notes"         TEXT,
      "createdAt"     TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ReviewAction_pkey" PRIMARY KEY ("id")
    );

    CREATE TABLE "Notification" (
      "id"        TEXT         NOT NULL,
      "userId"    TEXT         NOT NULL,
      "channel"   TEXT         NOT NULL,
      "subject"   TEXT         NOT NULL,
      "body"      TEXT         NOT NULL,
      "meta"      JSONB,
      "readAt"    TIMESTAMP(3),
      "sentAt"    TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX "User_email_key"                            ON "User"("email");
    CREATE INDEX        "User_investorOrgId_idx"                    ON "User"("investorOrgId");
    CREATE INDEX        "User_role_idx"                             ON "User"("role");
    CREATE UNIQUE INDEX "Account_provider_providerAccountId_key"    ON "Account"("provider","providerAccountId");
    CREATE UNIQUE INDEX "Session_sessionToken_key"                  ON "Session"("sessionToken");
    CREATE UNIQUE INDEX "VerificationToken_token_key"               ON "VerificationToken"("token");
    CREATE UNIQUE INDEX "VerificationToken_identifier_token_key"    ON "VerificationToken"("identifier","token");
    CREATE UNIQUE INDEX "Application_reference_key"                 ON "Application"("reference");
    CREATE INDEX        "Application_status_idx"                    ON "Application"("status");
    CREATE INDEX        "Application_ownerUserId_idx"               ON "Application"("ownerUserId");
    CREATE INDEX        "Application_lotReference_idx"              ON "Application"("lotReference");
    CREATE UNIQUE INDEX "ApplicationSection_applicationId_section_key" ON "ApplicationSection"("applicationId","section");
    CREATE INDEX        "Document_applicationId_kind_idx"           ON "Document"("applicationId","kind");
    CREATE INDEX        "Payment_applicationId_idx"                 ON "Payment"("applicationId");
    CREATE INDEX        "Payment_status_idx"                        ON "Payment"("status");
    CREATE INDEX        "ReviewAction_applicationId_idx"            ON "ReviewAction"("applicationId");
    CREATE INDEX        "ReviewAction_actorUserId_idx"              ON "ReviewAction"("actorUserId");
    CREATE INDEX        "Notification_userId_readAt_idx"            ON "Notification"("userId","readAt");

    ALTER TABLE "User"               ADD CONSTRAINT "User_investorOrgId_fkey"               FOREIGN KEY ("investorOrgId") REFERENCES "InvestorOrg"("id") ON DELETE SET NULL  ON UPDATE CASCADE;
    ALTER TABLE "Account"            ADD CONSTRAINT "Account_userId_fkey"                   FOREIGN KEY ("userId")        REFERENCES "User"("id")         ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Session"            ADD CONSTRAINT "Session_userId_fkey"                   FOREIGN KEY ("userId")        REFERENCES "User"("id")         ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Application"        ADD CONSTRAINT "Application_ownerUserId_fkey"          FOREIGN KEY ("ownerUserId")   REFERENCES "User"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "Application"        ADD CONSTRAINT "Application_investorOrgId_fkey"        FOREIGN KEY ("investorOrgId") REFERENCES "InvestorOrg"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "ApplicationSection" ADD CONSTRAINT "ApplicationSection_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Document"           ADD CONSTRAINT "Document_applicationId_fkey"           FOREIGN KEY ("applicationId") REFERENCES "Application"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "Payment"            ADD CONSTRAINT "Payment_applicationId_fkey"            FOREIGN KEY ("applicationId") REFERENCES "Application"("id")  ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "ReviewAction"       ADD CONSTRAINT "ReviewAction_applicationId_fkey"       FOREIGN KEY ("applicationId") REFERENCES "Application"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "ReviewAction"       ADD CONSTRAINT "ReviewAction_actorUserId_fkey"         FOREIGN KEY ("actorUserId")   REFERENCES "User"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "Notification"       ADD CONSTRAINT "Notification_userId_fkey"              FOREIGN KEY ("userId")        REFERENCES "User"("id")         ON DELETE CASCADE ON UPDATE CASCADE;
  `)
}

export const down: MigrationFn<QueryInterface> = async ({ context: qi }) => {
  await qi.sequelize.query(`
    DROP TABLE IF EXISTS "Notification"           CASCADE;
    DROP TABLE IF EXISTS "ReviewAction"           CASCADE;
    DROP TABLE IF EXISTS "Payment"               CASCADE;
    DROP TABLE IF EXISTS "Document"              CASCADE;
    DROP TABLE IF EXISTS "ApplicationSection"    CASCADE;
    DROP TABLE IF EXISTS "Application"           CASCADE;
    DROP TABLE IF EXISTS "ApplicationWindow"     CASCADE;
    DROP TABLE IF EXISTS "VerificationToken"     CASCADE;
    DROP TABLE IF EXISTS "Session"               CASCADE;
    DROP TABLE IF EXISTS "Account"               CASCADE;
    DROP TABLE IF EXISTS "User"                  CASCADE;
    DROP TABLE IF EXISTS "InvestorOrg"           CASCADE;
    DROP TYPE  IF EXISTS "ApplicationWindowStatus";
    DROP TYPE  IF EXISTS "ReviewActionType";
    DROP TYPE  IF EXISTS "Currency";
    DROP TYPE  IF EXISTS "PaymentStatus";
    DROP TYPE  IF EXISTS "PaymentMethod";
    DROP TYPE  IF EXISTS "DocumentKind";
    DROP TYPE  IF EXISTS "EoiSection";
    DROP TYPE  IF EXISTS "ApplicationStatus";
    DROP TYPE  IF EXISTS "UserRole";
  `)
}
