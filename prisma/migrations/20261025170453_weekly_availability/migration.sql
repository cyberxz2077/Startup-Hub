-- Availability is a daily window; each booking stores its own exact interval.
-- Existing rows and booking foreign keys are retained unchanged.
ALTER TABLE public.availability_slots
  DROP CONSTRAINT availability_slots_valid_interval,
  ADD CONSTRAINT availability_slots_valid_interval
    CHECK (ends_at > starts_at AND ends_at - starts_at <= interval '24 hours');
