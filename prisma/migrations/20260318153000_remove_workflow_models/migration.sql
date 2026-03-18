-- Remove unused workflow models
DROP TABLE IF EXISTS "public"."WorkflowStep" CASCADE;
DROP TABLE IF EXISTS "public"."WorkflowInstance" CASCADE;
DROP TABLE IF EXISTS "public"."WorkflowDefinition" CASCADE;

DROP TYPE IF EXISTS "public"."StepStatus";
DROP TYPE IF EXISTS "public"."WorkflowStatus";
DROP TYPE IF EXISTS "public"."WorkflowType";
