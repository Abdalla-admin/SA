ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "materialId" INTEGER;
ALTER TABLE "InvoiceItem"   ADD COLUMN IF NOT EXISTS "materialId" INTEGER;

DO $$ BEGIN
  ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
