ALTER TABLE "cash_register_sessions"
  ADD COLUMN "reopenedById" TEXT,
  ADD COLUMN "reopenedAt" TIMESTAMP(3),
  ADD COLUMN "reopenCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "cash_register_sessions"
  ADD CONSTRAINT "cash_register_sessions_reopenedById_fkey"
  FOREIGN KEY ("reopenedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
