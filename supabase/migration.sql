-- LATAM Collaborator Management - Initial Schema Migration
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Enum for objective status
create type objective_status as enum ('DRAFT', 'ASSIGNED', 'SIGNED', 'CLOSED');

-- Region
create table "Region" (
  "RegionId"   serial primary key,
  "RegionName" text not null
);

-- Country
create table "Country" (
  "CountryId"   serial primary key,
  "CountryName" text not null,
  "RegionId"    integer not null references "Region"("RegionId")
);

-- CollaboratorType
create table "CollaboratorType" (
  "CollaboratorTypeId"   serial primary key,
  "CollaboratorTypeName" text not null
);

-- Collaborator
create table "Collaborator" (
  "CollaboratorId"     serial primary key,
  "CollaboratorTypeId" integer not null references "CollaboratorType"("CollaboratorTypeId"),
  "CountryId"          integer not null references "Country"("CountryId"),
  "CollaboratorName"   text not null,
  "CollaboratorEmail"  text not null unique,
  "CollaboratorActive" boolean not null default true
);

-- Period
create table "Period" (
  "PeriodId"          serial primary key,
  "PeriodDescription" text not null,
  "PeriodYear"        integer not null
);

-- ObjectiveTemplate
create table "ObjectiveTemplate" (
  "ObjectiveTemplateId"    serial primary key,
  "ObjectiveTemplateTitle" text not null,
  "ObjectiveTemplateBody"  text not null
);

-- Objective
create table "Objective" (
  "ObjectiveId"          serial primary key,
  "CollaboratorId"       integer not null references "Collaborator"("CollaboratorId"),
  "PeriodId"             integer not null references "Period"("PeriodId"),
  "ObjectiveStatus"      objective_status not null default 'DRAFT',
  "ObjectiveWordURL"     text,
  "ObjectiveSignedPdfURL" text
);

-- Result
create table "Result" (
  "ResultId"             serial primary key,
  "ObjectiveId"          integer not null references "Objective"("ObjectiveId"),
  "ResultActualValue"    numeric not null,
  "ResultDelta"          numeric not null,
  "ResultAchievementPct" numeric not null check ("ResultAchievementPct" >= 0),
  "ResultQlikImageUrl"   text,
  "ResultPdfUrl"         text
);

-- Row Level Security
alter table "Region"             enable row level security;
alter table "Country"            enable row level security;
alter table "CollaboratorType"   enable row level security;
alter table "Collaborator"       enable row level security;
alter table "Period"             enable row level security;
alter table "ObjectiveTemplate"  enable row level security;
alter table "Objective"          enable row level security;
alter table "Result"             enable row level security;

create policy "allow_all" on "Region"            for all to authenticated, anon using (true) with check (true);
create policy "allow_all" on "Country"           for all to authenticated, anon using (true) with check (true);
create policy "allow_all" on "CollaboratorType"  for all to authenticated, anon using (true) with check (true);
create policy "allow_all" on "Collaborator"      for all to authenticated, anon using (true) with check (true);
create policy "allow_all" on "Period"            for all to authenticated, anon using (true) with check (true);
create policy "allow_all" on "ObjectiveTemplate" for all to authenticated, anon using (true) with check (true);
create policy "allow_all" on "Objective"         for all to authenticated, anon using (true) with check (true);
create policy "allow_all" on "Result"            for all to authenticated, anon using (true) with check (true);

-- Indexes for common filter patterns
create index on "Country"("RegionId");
create index on "Collaborator"("CountryId");
create index on "Collaborator"("CollaboratorTypeId");
create index on "Collaborator"("CollaboratorActive");
create index on "Objective"("CollaboratorId");
create index on "Objective"("PeriodId");
create index on "Objective"("ObjectiveStatus");
create index on "Result"("ObjectiveId");
