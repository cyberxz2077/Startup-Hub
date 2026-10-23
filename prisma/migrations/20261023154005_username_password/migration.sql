-- Add username/password membership without changing legacy account ownership.
ALTER TABLE "users"
  ADD COLUMN "username" TEXT,
  ADD COLUMN "password_hash" TEXT,
  ADD COLUMN "joined_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
