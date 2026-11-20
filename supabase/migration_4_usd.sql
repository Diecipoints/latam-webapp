-- Add USD to the currency_code enum (bonus and salary currency fields).
-- Run this in the Supabase SQL Editor AFTER migration_3_country_scope.sql
-- has already been applied.

alter type currency_code add value 'USD';
