-- Add sentiment classification and explicit platform roles.
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'WORKSPACE');
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'WORKSPACE';
ALTER TABLE "ChatSession" ADD COLUMN "sentiment" "Sentiment";
ALTER TABLE "ChatSession" ADD COLUMN "sentimentScore" DOUBLE PRECISION;
ALTER TABLE "ChatSession" ADD COLUMN "sentimentReason" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "needsFollowUp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatSession" ADD COLUMN "sentimentUpdatedAt" TIMESTAMP(3);
