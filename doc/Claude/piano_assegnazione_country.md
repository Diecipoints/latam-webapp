# Piano di lavoro — Assegnazione ObjectivePlan → Country (premio filiale)

## Step 0 — Checkpoint prima di iniziare (OBBLIGATORIO)

Prima di qualsiasi modifica:

```bash
git status                     # verificare che non ci sia lavoro non committato in giro
git add -A
git commit -m "checkpoint pre-country-assignment"
git branch backup/pre-country-assignment
```

Se qualcosa va storto durante la sessione, rollback con:
```bash
git reset --hard backup/pre-country-assignment
```

Anche lato Supabase: prima di applicare la migrazione (Step 1), fare uno **snapshot/backup del database** dal pannello Supabase (Database → Backups), o quantomeno esportare lo schema corrente, così anche lì c'è un punto di ritorno.

Non procedere allo Step 1 finché questo checkpoint non è confermato.

---

## Step 1 — Migrazione Supabase (piccola, additiva)

```sql
CREATE TYPE objective_plan_scope AS ENUM ('individual', 'filiale');
ALTER TABLE "ObjectivePlan" ADD COLUMN "ObjectivePlanScope" objective_plan_scope NOT NULL DEFAULT 'individual';
```

Applicare manualmente via Supabase SQL Editor, stesso pattern già usato per `migration_2_objective_plan.sql`.

- Tutti i piani esistenti diventano `individual` di default — corretto, oggi il filiale non esiste ancora.
- Dopo l'esecuzione, rigenerare `database.types.ts` (tipi TypeScript dallo schema Supabase) e aggiornare `schemas.ts` (Zod) per includere il nuovo campo/enum.

---

## Step 2 — Nuova pagina "Country" (mirror di CollaboratoriPage)

- Nuova pagina, es. `src/pages/country/CountryPage.tsx`, con lista dei `Country` e bottone **"Assegna Obiettivo"** per riga — stesso pattern UI di `CollaboratoriPage.tsx`.
- Click su "Assegna Obiettivo" → stesso form/flow già esistente per i piani individuali, ma:
  - crea (o seleziona) un `ObjectivePlan` con `ObjectivePlanScope = 'filiale'`
  - lo collega al country scelto via `ObjectivePlanCountry` (tabella già esistente, nessuna modifica necessaria)
  - le soglie (`ObjectiveThreshold`) si inseriscono con lo stesso form usato oggi per i piani individuali
- Route: `/country` (lista) + eventuale `/country/:id` (dettaglio), simmetrica a `/collaboratori` e `/collaboratori/:id`.
- Aggiungere voce di navigazione in `AppLayout.tsx`.
- Valutare se questa pagina va distinta da `/impostazioni/paesi` (quella resta CRUD anagrafica Country; questa nuova è vista operativa per l'assegnazione piani, come `CollaboratoriPage` non è in Impostazioni).

---

## Step 3 — Bottone "Duplica" su ObjectivePlan

In `ObiettiviPage.tsx` / `ObjectivoDetailPage.tsx`, aggiungere azione "Duplica" che:
- copia `ObjectivePlan` + tutte le sue `ObjectiveThreshold` associate
- chiede all'utente il nuovo target (collaboratore o country) e il nuovo `ObjectivePlanScope`
- crea un nuovo record indipendente — non tocca né modifica l'assegnazione originale

---

## Step 4 — Filtri/liste esistenti

- `ObiettiviPage.tsx` (lista piani) va aggiornata per mostrare/filtrare per `ObjectivePlanScope`, così i piani individuali e quelli filiale non si mescolano in un'unica vista indistinta.
- Valutare un badge o tab (Individuale / Filiale) coerente col resto del design system (badge status già usato per `ObjectiveStatus`).

---

## Non incluso in questo giro (resta per dopo, lato n8n)

- Il nodo "Somma Premio Filiale" nel workflow n8n "Calcolo Premio" resta **volutamente forzato a restituire 0** finché l'assegnazione Piano→Country non è pienamente funzionante e testata in webapp.
- Solo dopo, tornare su quel nodo per implementare il calcolo reale a soglie (`si_alcanza`/`adicionalmente`/`adicionalmente_mayor`) confrontando `valore_totale_filiale` con le soglie del piano `filiale` assegnato al country per quel periodo.

---

## Riferimento — Schema coinvolto (nessuna altra tabella da toccare)

```
ObjectivePlan            + nuovo campo ObjectivePlanScope enum(individual|filiale)
ObjectivePlanCountry     ObjectivePlanId FK, CountryId FK          ← già esistente, ON DELETE CASCADE
CollaboratorObjectivePlan CollaboratorId FK, ObjectivePlanId FK    ← già esistente, ON DELETE CASCADE
ObjectiveThreshold       ObjectivePlanId FK, soglie ripetibili     ← già esistente, ON DELETE CASCADE
Country / Period         invariati
```

Regola di dominio: un `ObjectivePlan` è **o** individuale **o** filiale, mai entrambi — collegato in via esclusiva a `CollaboratorObjectivePlan` oppure `ObjectivePlanCountry`, mai a entrambe.
