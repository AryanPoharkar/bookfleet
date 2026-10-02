CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
ADD CONSTRAINT "booking_no_overlap"
EXCLUDE USING gist (
  "staffId" WITH =,
  tstzrange("startsAt", "endsAt") WITH &&
)
WHERE ("status" = 'CONFIRMED');
