CREATE TABLE IF NOT EXISTS "CompanySettings" (
  "id"                 INTEGER NOT NULL DEFAULT 1,
  "bank1Label"         TEXT,
  "bank1Details"       TEXT,
  "bank2Label"         TEXT,
  "bank2Details"       TEXT,
  "bank3Label"         TEXT,
  "bank3Details"       TEXT,
  "termsAndConditions" TEXT,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CompanySettings" ("id", "updatedAt")
VALUES (1, NOW())
ON CONFLICT ("id") DO NOTHING;
