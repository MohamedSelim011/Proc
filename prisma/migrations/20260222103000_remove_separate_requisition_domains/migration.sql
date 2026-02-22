-- Remove duplicate requisition domain tables and enums.
DROP TABLE IF EXISTS "MixedRequisitionBundle" CASCADE;
DROP TABLE IF EXISTS "ServiceRequisitionLine" CASCADE;
DROP TABLE IF EXISTS "ServiceRequisition" CASCADE;
DROP TABLE IF EXISTS "MaterialRequisitionLine" CASCADE;
DROP TABLE IF EXISTS "MaterialRequisition" CASCADE;

DROP TYPE IF EXISTS "MixedRequisitionStatus";
DROP TYPE IF EXISTS "ServiceRequisitionStatus";
DROP TYPE IF EXISTS "MaterialRequisitionStatus";
