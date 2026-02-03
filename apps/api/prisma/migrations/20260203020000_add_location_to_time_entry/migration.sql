-- AlterTable time_entries: Add location field
ALTER TABLE "time_entries" 
ADD COLUMN "location" VARCHAR(255);

-- Add index for location filtering
CREATE INDEX "time_entries_location_idx" ON "time_entries"("location");

-- Add comment
COMMENT ON COLUMN "time_entries"."location" IS 'Work location from tenant rota locations (e.g., Main Office, Warehouse)';
