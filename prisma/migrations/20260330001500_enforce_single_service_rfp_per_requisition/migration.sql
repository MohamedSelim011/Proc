-- Enforce one Service RFP per service requisition by consolidating duplicates first.
CREATE TEMP TABLE "_service_rfp_dedup" AS
SELECT ranked.id AS loser_id, ranked.keeper_id
FROM (
  SELECT
    id,
    "prId",
    ROW_NUMBER() OVER (PARTITION BY "prId" ORDER BY "createdAt" DESC, id DESC) AS row_num,
    FIRST_VALUE(id) OVER (PARTITION BY "prId" ORDER BY "createdAt" DESC, id DESC) AS keeper_id
  FROM "ServiceRFP"
) AS ranked
WHERE ranked.row_num > 1;

UPDATE "ServiceRFPVendor" AS vendor
SET "rfpId" = dedup.keeper_id
FROM "_service_rfp_dedup" AS dedup
WHERE vendor."rfpId" = dedup.loser_id
  AND NOT EXISTS (
    SELECT 1
    FROM "ServiceRFPVendor" AS existing
    WHERE existing."rfpId" = dedup.keeper_id
      AND existing."vendorId" = vendor."vendorId"
  );

DELETE FROM "ServiceRFPVendor" AS vendor
USING "_service_rfp_dedup" AS dedup
WHERE vendor."rfpId" = dedup.loser_id;

UPDATE "ServiceRFPResponse" AS response
SET "rfpId" = dedup.keeper_id
FROM "_service_rfp_dedup" AS dedup
WHERE response."rfpId" = dedup.loser_id
  AND NOT EXISTS (
    SELECT 1
    FROM "ServiceRFPResponse" AS existing
    WHERE existing."rfpId" = dedup.keeper_id
      AND existing."vendorId" = response."vendorId"
  );

DELETE FROM "ServiceRFPResponse" AS response
USING "_service_rfp_dedup" AS dedup
WHERE response."rfpId" = dedup.loser_id;

UPDATE "ServiceRFPDocument" AS document
SET "rfpId" = dedup.keeper_id
FROM "_service_rfp_dedup" AS dedup
WHERE document."rfpId" = dedup.loser_id;

UPDATE "Approval" AS approval
SET "serviceRFPId" = dedup.keeper_id
FROM "_service_rfp_dedup" AS dedup
WHERE approval."serviceRFPId" = dedup.loser_id;

DELETE FROM "ServiceRFP" AS rfp
USING "_service_rfp_dedup" AS dedup
WHERE rfp.id = dedup.loser_id;

DROP TABLE "_service_rfp_dedup";

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceRFP_prId_key" ON "ServiceRFP"("prId");
