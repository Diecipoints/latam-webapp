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

**IMPORTANTE — correzione post-ricognizione (vedi sezione "Nota su ObjectivePlanCountry" più sotto):**
`ObjectivePlanCountry` è già in uso oggi per i piani `individual` con un significato legittimo e diverso ("paesi il cui fatturato aggregato copre il collaboratore" — utile perché Qlik stesso aggrega paesi piccoli, es. centro America). Non va toccato quel comportamento. La nuova pagina Country riusa la stessa tabella ma con significato diverso per i piani `filiale` (vedi sotto).

**Stato avanzamento (aggiornato durante l'implementazione):**
- ✅ Migrazione `ObjectivePlanScope` applicata su Supabase, tipi/schemas aggiornati (commit `d8b354d`)
- ✅ `objectivePlanApi.create`/`update`/`list` aggiornate per `ObjectivePlanScope` (commit `8b5bdb0`)
- ✅ `ObiettiviPage.tsx` filtra di default `scope: 'individual'` (commit `4ad3381`)
- ✅ `ObjectivePlanDialog` estratto in componente condiviso (`src/pages/obiettivi/ObjectivePlanDialog.tsx`, commit `d63d49b`)
- ✅ Prop `scope`/`lockedCountryId` aggiunte a `ObjectivePlanDialog` (commit `c1a853e`) — quando `lockedCountryId` è presente, "Paesi coperti" mostra etichetta statica invece della checklist, e `CountryIds` viene forzato a `[lockedCountryId]`
- ✅ `CountryPage.tsx` creata secondo la struttura concordata sotto, isolata (commit `2be532e`)
- ✅ Route `/country` in `App.tsx` + voce sidebar "Country" (icona `Globe`) in `AppLayout.tsx` (commit `446f3a3`)
- ✅ Verifica manuale in dev completata (lista country, creazione/modifica/eliminazione piano filiale, dialog con country bloccato, badge in tabella, voce menu) — tutto funzionante

**Step 2: COMPLETATO.** Commit della fase di implementazione: `d63d49b`, `c1a853e` (2026-07-17), `2be532e`, `446f3a3` (2026-07-20).

**Punto aperto emerso dal test manuale (da decidere prima di proseguire con lo Step n8n):**
Nulla in `CountryPage.tsx` / `ObjectivePlanDialog` / lato DB impedisce di creare più piani `filiale` per lo stesso `CountryId` nello stesso `PeriodId` — non c'è un vincolo `UNIQUE` su Supabase né una validazione pre-submit nel dialog. Da decidere quale delle seguenti strade seguire:
1. Vietarlo con un `UNIQUE` constraint (parziale, solo per `ObjectivePlanScope = 'filiale'`) su `(CountryId, PeriodId)` via `ObjectivePlanCountry` + `Period` — richiede una migrazione aggiuntiva.
2. Permetterlo ma sommare i piani nel calcolo n8n "Somma Premio Filiale".
3. Bloccarlo lato UI in `CountryPage.tsx`/`ObjectivePlanDialog` (validazione client-side prima del submit).

Non blocca l'uso attuale della pagina, ma va risolto prima di implementare il nodo "Somma Premio Filiale" in n8n (vedi sezione "Non incluso in questo giro" più sotto).

**Prossimi step (non ancora iniziati):**
- Step 3 — Bottone "Duplica" su ObjectivePlan: **da fare**
- Step 4 — Filtri/liste esistenti (badge/tab Individuale/Filiale in `ObiettiviPage.tsx`): **da fare**

### Struttura concordata per `CountryPage.tsx`

**Scope ampliato rispetto all'idea iniziale**: non solo "lista + bottone Assegna" ma anche **modifica ed eliminazione inline** dei piani filiale esistenti — altrimenti un piano creato con errore (soglia/paese sbagliati) sarebbe impossibile da correggere da UI, dato che `ObiettiviPage.tsx` ora filtra solo `individual` e i piani `filiale` non compaiono più da nessun'altra parte.

**Data fetching:**
- `useEffect` al mount: `Promise.all([countryApi.list(), periodApi.list()])` → `countries`, `periods`
- `load()`: `objectivePlanApi.list({ scope: 'filiale' })` → `plans` (tipo `ObjectivePlan` già esportato da `ObjectivePlanDialog.tsx`)
- Raggruppamento per country calcolato al volo (nessuno state separato): `plans.reduce` → `Map<CountryId, ObjectivePlan[]>` (ogni piano filiale ha tipicamente una sola riga in `ObjectivePlanCountry`, si prende `plan.ObjectivePlanCountry?.[0]?.CountryId`)

**Colonne `DataTable<Country>`:**
1. Paese — `CountryName`
2. Regione — `Region?.RegionName` (già incluso da `countryApi.list()`, nessuna modifica alla query)
3. Piani Filiale — per ogni piano di quel country: Badge col nome + `StatusPill` (riusati da `ObjectivePlanDialog.tsx`) + due icon-button piccoli (Pencil/Trash2) per modifica/eliminazione inline; fallback "Nessun piano filiale" in grigio se l'array è vuoto
4. Azioni — un solo bottone "Assegna Obiettivo" (icona Target, stesso stile di `CollaboratoriPage`) che apre il dialog in modalità creazione per quel country

Nessun filtro (regione/stato) in questa prima versione — pochi country, lista corta, aggiungibile dopo se serve.

**Wiring del dialog** — un solo stato condiviso tra creazione e modifica:
```ts
const [dialogState, setDialogState] = useState<{ item: ObjectivePlan | null; countryId: number } | null>(null)
```
- Crea (bottone riga country): `setDialogState({ item: null, countryId: row.CountryId })`
- Modifica (icona Pencil su un piano): `setDialogState({ item: plan, countryId: plan.ObjectivePlanCountry?.[0]?.CountryId ?? row.CountryId })`

Render:
```tsx
<ObjectivePlanDialog
  open={!!dialogState}
  item={dialogState?.item ?? null}
  periods={periods}
  countries={countries}
  scope="filiale"
  lockedCountryId={dialogState?.countryId}
  onClose={() => setDialogState(null)}
  onSuccess={load}
/>
```

**Eliminazione**: stesso pattern di `ObiettiviPage.tsx` — `deleteItem: ObjectivePlan | null` + `AlertDialog` di conferma + `objectivePlanApi.delete(id)` (già bloccato lato API se esistono `Result` associati).

**Non incluso in questo file (deferred)**:
- Nessuna route/voce sidebar (passo successivo separato)
- Nessuna pagina di dettaglio `/country/:id`
- Nessun filtro/ricerca
- Nessun bottone "Duplica" (Step 3 del piano generale)

Dopo la creazione del file: verifica `tsc --noEmit`, controllo visivo in dev, poi commit isolato. Solo dopo si procede con route (`App.tsx`) e voce sidebar (`AppLayout.tsx`) come passo separato successivo.

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

## Regola di dominio (corretta dopo ricognizione codice — vedi commit successivi allo Step 1)

~~Un `ObjectivePlan` è o individuale o filiale, mai entrambi — collegato in via esclusiva a `CollaboratorObjectivePlan` oppure `ObjectivePlanCountry`, mai a entrambe.~~ ← **versione originale, errata**

**Versione corretta:**
- `ObjectivePlanCountry` si usa per **entrambi** gli scope, ma con significato diverso:
  - se `ObjectivePlanScope = 'individual'`: rappresenta i paesi il cui fatturato aggregato conta per il collaboratore assegnato (multi-select organizzativo, riflette come Qlik aggrega i paesi piccoli — es. centro America). Comportamento invariato, nessuna modifica.
  - se `ObjectivePlanScope = 'filiale'`: rappresenta il country a cui il premio collettivo è assegnato (tipicamente una sola riga).
- L'esclusività reale è su `CollaboratorObjectivePlan`:
  - un piano `filiale` **non ha mai** righe in `CollaboratorObjectivePlan`
  - un piano `individual` **ha sempre** almeno una riga in `CollaboratorObjectivePlan`
- Non ricategorizzare piani individuali esistenti che coprono più country (es. piani "Guatemala + República Dominicana", "México" già in Supabase) — sono piani individuali legittimi con più paesi, non piani filiale mascherati.
