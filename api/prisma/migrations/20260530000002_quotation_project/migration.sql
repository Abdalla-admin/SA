ALTER TABLE "Quotation" DROP COLUMN IF EXISTS "systemCapacity";
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "projectId" INTEGER;

DO $$ BEGIN
  ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
