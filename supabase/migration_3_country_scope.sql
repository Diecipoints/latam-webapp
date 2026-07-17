-- ObjectivePlan scope: distinguish individual (per-collaborator) plans from
-- filiale (per-country) plans. Run this in the Supabase SQL Editor AFTER
-- migration_2_objective_plan.sql has already been applied.

create type objective_plan_scope as enum ('individual', 'filiale');

alter table "ObjectivePlan"
  add column "ObjectivePlanScope" objective_plan_scope not null default 'individual';
