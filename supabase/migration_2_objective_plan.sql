-- ObjectivePlan redesign: rename Objective -> ObjectivePlan, add multi-country
-- coverage and repeatable threshold tiers. Run this in the Supabase SQL Editor
-- AFTER migration.sql has already been applied.

create type currency_code as enum ('EUR', 'COP', 'MXN', 'ARS', 'CLP', 'DOP');
create type threshold_type as enum ('si_alcanza', 'adicionalmente');
alter type threshold_type add value 'adicionalmente_mayor';

-- Rename Objective -> ObjectivePlan
alter table "Objective" rename to "ObjectivePlan";
alter table "ObjectivePlan" rename column "ObjectiveId" to "ObjectivePlanId";

-- Drop the old document-link columns (replaced by the plan/country/threshold model)
alter table "ObjectivePlan" drop column "ObjectiveWordURL";
alter table "ObjectivePlan" drop column "ObjectiveSignedPdfURL";

-- Add ObjectivePlanName, backfill existing rows, then enforce NOT NULL
alter table "ObjectivePlan" add column "ObjectivePlanName" text;
update "ObjectivePlan" set "ObjectivePlanName" = 'Piano ' || "ObjectivePlanId" where "ObjectivePlanName" is null;
alter table "ObjectivePlan" alter column "ObjectivePlanName" set not null;

-- A plan is no longer tied to a single collaborator (see CollaboratorObjectivePlan below)
alter table "ObjectivePlan" drop column "CollaboratorId";

-- Rename Result.ObjectiveId -> Result.ObjectivePlanId (FK stays intact)
alter table "Result" rename column "ObjectiveId" to "ObjectivePlanId";

-- ObjectivePlanCountry: junction table for "Paesi coperti"
create table "ObjectivePlanCountry" (
  "ObjectivePlanCountryId" serial primary key,
  "ObjectivePlanId"        integer not null references "ObjectivePlan"("ObjectivePlanId") on delete cascade,
  "CountryId"              integer not null references "Country"("CountryId"),
  unique ("ObjectivePlanId", "CountryId")
);

-- ObjectiveThreshold: repeatable "Soglie" rows
create table "ObjectiveThreshold" (
  "ObjectiveThresholdId"              serial primary key,
  "ObjectivePlanId"                   integer not null references "ObjectivePlan"("ObjectivePlanId") on delete cascade,
  "ObjectiveThresholdRevenueValue"    numeric not null,
  "ObjectiveThresholdRevenueCurrency" currency_code not null,
  "ObjectiveThresholdBonusValue"      numeric not null,
  "ObjectiveThresholdBonusCurrency"   currency_code not null,
  "ObjectiveThresholdType"            threshold_type not null
);

-- CollaboratorObjectivePlan: which collaborators a plan is assigned to (many-to-many)
create table "CollaboratorObjectivePlan" (
  "CollaboratorObjectivePlanId" serial primary key,
  "CollaboratorId"              integer not null references "Collaborator"("CollaboratorId") on delete cascade,
  "ObjectivePlanId"             integer not null references "ObjectivePlan"("ObjectivePlanId") on delete cascade,
  unique ("CollaboratorId", "ObjectivePlanId")
);

-- Row Level Security (same allow_all convention as the rest of the schema)
alter table "ObjectivePlanCountry"      enable row level security;
alter table "ObjectiveThreshold"        enable row level security;
alter table "CollaboratorObjectivePlan" enable row level security;

create policy "allow_all" on "ObjectivePlanCountry"      for all to authenticated, anon using (true) with check (true);
create policy "allow_all" on "ObjectiveThreshold"        for all to authenticated, anon using (true) with check (true);
create policy "allow_all" on "CollaboratorObjectivePlan" for all to authenticated, anon using (true) with check (true);

-- Indexes for common filter/join patterns
create index on "ObjectivePlanCountry"("CountryId");
create index on "ObjectiveThreshold"("ObjectivePlanId");
create index on "CollaboratorObjectivePlan"("CollaboratorId");
create index on "CollaboratorObjectivePlan"("ObjectivePlanId");
