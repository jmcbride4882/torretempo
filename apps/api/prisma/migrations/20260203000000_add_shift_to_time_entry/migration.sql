-- AlterTable time_entries: Add shift linkage
ALTER TABLE "time_entries" 
ADD COLUMN "shift_id" UUID,
ADD COLUMN "entry_type" VARCHAR(20) NOT NULL DEFAULT 'scheduled';

-- Add foreign key constraint
ALTER TABLE "time_entries" 
ADD CONSTRAINT "time_entries_shift_id_fkey" 
FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for shift_id lookups
CREATE INDEX "time_entries_shift_id_idx" ON "time_entries"("shift_id");

-- Add check constraint for entry_type
ALTER TABLE "time_entries"
ADD CONSTRAINT "time_entries_entry_type_check" 
CHECK ("entry_type" IN ('scheduled', 'unscheduled'));
