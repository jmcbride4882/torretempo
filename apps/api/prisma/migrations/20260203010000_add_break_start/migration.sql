-- AlterTable time_entries: Add break_start for manual break tracking
ALTER TABLE "time_entries" 
ADD COLUMN "break_start" TIMESTAMP(3);

-- Add comment to explain purpose
COMMENT ON COLUMN "time_entries"."break_start" IS 'Timestamp when employee started current break (null if not on break)';
