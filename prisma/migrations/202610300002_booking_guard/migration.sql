CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
EXCLUDE USING gist ("machineId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
WHERE (status IN ('BOOKED', 'RUNNING'));
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_valid_interval" CHECK ("endsAt" > "startsAt" AND "durationMinutes" BETWEEN 15 AND 180 AND "durationMinutes" % 5 = 0);
CREATE INDEX "requests_queue" ON "MaintenanceRequest" (specialty,status,"createdAt");
CREATE INDEX "complaint_author" ON "Complaint" ("authorId","createdAt");
CREATE INDEX "notification_user" ON "Notification" ("userId",read,"createdAt");
CREATE INDEX "session_expiration" ON "Session" ("expiresAt");
CREATE INDEX "attachment_owner" ON "Attachment" ("userId");
CREATE INDEX "request_author" ON "MaintenanceRequest" ("authorId");
