-- Sample seed data for LATAM Collaborator Management
-- Run after migration.sql

insert into "Region" ("RegionName") values
  ('LATAM Norte'),
  ('LATAM Sur'),
  ('LATAM Centro');

insert into "Country" ("CountryName", "RegionId") values
  ('Messico', 1),
  ('Colombia', 1),
  ('Venezuela', 1),
  ('Argentina', 2),
  ('Cile', 2),
  ('Uruguay', 2),
  ('Brasile', 2),
  ('Guatemala', 3),
  ('Costa Rica', 3),
  ('Panama', 3);

insert into "CollaboratorType" ("CollaboratorTypeName") values
  ('Agente'),
  ('Broker'),
  ('Distributore'),
  ('Rappresentante');

insert into "Period" ("PeriodDescription", "PeriodYear") values
  ('Anno 2025', 2025),
  ('Anno 2024', 2024),
  ('Anno 2023', 2023);

insert into "ObjectiveTemplate" ("ObjectiveTemplateTitle", "ObjectiveTemplateBody") values
  ('Obiettivo Vendite', 'Raggiungere il target di vendite assegnato per il periodo di riferimento.'),
  ('Obiettivo Sviluppo Portfolio', 'Ampliare il portafoglio clienti attivi nella regione assegnata.'),
  ('Obiettivo Retention', 'Mantenere il tasso di retention clienti al di sopra del livello concordato.');
