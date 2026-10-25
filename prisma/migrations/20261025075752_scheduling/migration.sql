-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN     "booking_event" JSONB,
ADD COLUMN     "booking_id" TEXT,
ADD COLUMN     "email_sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "subject" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "schedule_preferences" (
    "user_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT NOT NULL DEFAULT '',
    "meeting_url" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "meeting_url" TEXT NOT NULL DEFAULT '',
    "change_reason" TEXT NOT NULL DEFAULT '',
    "proposed_slot_id" TEXT,
    "proposed_starts_at" TIMESTAMP(3),
    "proposed_ends_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "availability_slots_user_id_active_starts_at_idx" ON "availability_slots"("user_id", "active", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_user_id_starts_at_ends_at_key" ON "availability_slots"("user_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "bookings_requester_id_status_starts_at_idx" ON "bookings"("requester_id", "status", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_host_id_status_starts_at_idx" ON "bookings"("host_id", "status", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_conversation_id_created_at_idx" ON "bookings"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_slot_id_idx" ON "bookings"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_requester_id_request_id_key" ON "bookings"("requester_id", "request_id");

-- CreateIndex
CREATE INDEX "direct_messages_booking_id_idx" ON "direct_messages"("booking_id");

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_preferences" ADD CONSTRAINT "schedule_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "availability_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep the same server-only data boundary as existing application tables.
ALTER TABLE public.schedule_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ADD CONSTRAINT availability_slots_valid_interval
  CHECK (ends_at > starts_at AND ends_at - starts_at <= interval '2 hours');
ALTER TABLE public.bookings ADD CONSTRAINT bookings_valid_interval CHECK (ends_at > starts_at);
ALTER TABLE public.bookings ADD CONSTRAINT bookings_distinct_participants CHECK (requester_id <> host_id);
ALTER TABLE public.bookings ADD CONSTRAINT bookings_valid_status CHECK (status IN ('confirmed', 'change_requested', 'cancelled'));
ALTER TABLE public.bookings ADD CONSTRAINT bookings_positive_version CHECK (version > 0);
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_valid_kind CHECK (kind IN ('text', 'booking'));
DO $$
DECLARE api_role TEXT; table_name TEXT;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      FOREACH table_name IN ARRAY ARRAY['schedule_preferences', 'availability_slots', 'bookings'] LOOP
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, api_role);
      END LOOP;
    END IF;
  END LOOP;
END $$;
