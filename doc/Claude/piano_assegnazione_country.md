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

**Punto aperto emerso dal test manuale — RISOLTO (decisione 2026-07-22):**
Nulla in `CountryPage.tsx` / `ObjectivePlanDialog` / lato DB impedisce di creare più piani `filiale` per lo stesso `CountryId` nello stesso `PeriodId` — non c'è un vincolo `UNIQUE` su Supabase né una validazione pre-submit nel dialog. Delle tre strade elencate in origine (UNIQUE constraint secco / somma in n8n / blocco solo UI), si è scelta una variante più ricca della prima: non un vincolo "per periodo" ma un **vincolo assoluto "un solo piano filiale attivo per country alla volta"**, con storico dei piani disattivati riattivabile. Dettagli completi nella nuova sezione **Step 2.5** più sotto.

**Prossimi step:**
- Step 2.5 — Vincolo "un solo piano filiale attivo per Country" (schema + RPC + UI): **COMPLETATO**, vedi sezione dedicata sotto
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

## Step 2.5 — Vincolo: un solo piano filiale attivo per Country

Decisione presa il 2026-07-22, a valle del punto aperto emerso testando `CountryPage.tsx` (vedi sopra).

### Regola di dominio

Un `Country` può avere **al massimo un `ObjectivePlan` con `scope='filiale'` attivo alla volta**. Non è un vincolo "per periodo/cuatrimestre" — è assoluto, finché non viene esplicitamente cambiato.

### Schema

- Aggiungere flag `active: boolean` (default `true`) su `ObjectivePlanCountry` (verificare in implementazione se il campo semanticamente sta meglio qui o su `ObjectivePlan` — da confermare con lo schema attuale prima di scrivere la migrazione).
- **Constraint DB**: unique index parziale su `Country` filtrato a `WHERE active = true AND scope = 'filiale'`. Impedisce a livello di database l'esistenza di due piani filiale attivi sullo stesso country, indipendentemente dal client che scrive (webapp, n8n, script diretto).
- Nessun vincolo sui record `active = false`: si accumulano liberamente come storico/libreria di piani riutilizzabili.

### Comportamento

| Azione manager | Effetto |
|---|---|
| Modifica soglie di un piano attivo | Update in place, stesso record/id |
| Cambia piano (nuovo) | Swap: disattiva il piano attualmente attivo per quel country, crea/attiva il nuovo |
| Torna al piano precedente | Riattivazione di un record storico esistente — **nessuna duplicazione**, soglie identiche a quando era stato disattivato |

### Swap atomico: funzione RPC, non query dal client

Lo swap (disattiva vecchio + attiva nuovo) va implementato come **funzione Postgres/RPC transazionale** (`supabase.rpc(...)`), non come due query separate dal client.

Motivo: due operazioni sequenziali dal client lasciano una finestra in cui, se la seconda fallisce, il country resta senza piano attivo (stato inconsistente silenzioso — stessa classe di bug già vista nel progetto, es. `pairedItem`, `valore_totale_filiale`).

La funzione RPC garantisce che l'operazione sia atomica (tutto o niente). Il constraint unique parziale resta comunque attivo come rete di sicurezza aggiuntiva, indipendente da eventuali bug futuri nella funzione o chiamate dirette da altrove.

### UI (`CountryPage.tsx`)

- Piano attivo mostrato in evidenza per ciascun country
- Elenco piani storici (disattivati) associati al country, riattivabili con un click
- Azione "cambia piano" = seleziona un piano storico esistente OPPURE crea uno nuovo → il sistema esegue lo swap via RPC

### Implementazione (2026-07-22)

- ✅ Migrazione SQL applicata manualmente su Supabase (`step2.5_migrazione.sql`, non versionato nel repo): colonna `active` boolean (default `true`) e colonna `scope` denormalizzata (sincronizzata via trigger `trg_sync_objective_plan_country_scope` da `ObjectivePlan.ObjectivePlanScope`) su `ObjectivePlanCountry`; unique index parziale `ObjectivePlanCountry_active_filiale_per_country` su `CountryId` filtrato `active=true AND scope='filiale'`; funzione RPC `swap_active_filiale_plan(p_country_id, p_new_objective_plan_id)`. Verificato pre-migrazione: 0 piani filiale esistenti, nessun dato storico da sistemare.
- ✅ `database.types.ts` aggiornato con `active`/`scope` su `ObjectivePlanCountry` e la funzione `swap_active_filiale_plan` in `Functions` (commit `8c6ee7c`). Nessuna modifica a `schemas.ts`: quei campi sono gestiti lato DB/RPC, non passano da validazione form.
- ✅ `api.ts`:
  - `objectivePlanApi.list` include `active` nella select `ObjectivePlanCountry`
  - nuovo `objectivePlanApi.reactivateFiliale(countryId, objectivePlanId)` → wrapper su `supabase.rpc('swap_active_filiale_plan', ...)`
  - `objectivePlanApi.create`: per `scope='filiale'` con un solo `CountryId`, se esiste già un piano attivo per quel country la nuova riga `ObjectivePlanCountry` viene inserita con `active:false` esplicito e poi promossa via RPC (swap atomico); se il country non ha ancora un piano attivo, insert normale con `active:true` di default, nessuna RPC. Flusso `individual` non toccato.
  - `objectivePlanApi.update`: bug scoperto durante l'implementazione e corretto — il delete+reinsert delle righe `ObjectivePlanCountry` ad ogni modifica resettava `active` al default `true`, rischiando di riattivare silenziosamente un piano storico in edit. Ora legge gli `active` esistenti per `CountryId` prima del delete e li ripropaga sulle righe reinserite.
- ✅ `ObjectivePlanDialog.tsx`: tipo `ObjectivePlan` esteso con `active?: boolean` su `ObjectivePlanCountry`.
- ✅ `CountryPage.tsx`: raggruppamento piani per country ora distingue `active` da `historical` (`Map<CountryId, { active, historical[] }>` invece di lista piatta); colonna "Piani Filiale" mostra il piano attivo in evidenza, con storico espandibile ("Mostra/Nascondi storico (n)") e bottone "Riattiva" (icona `RotateCcw`) su ogni piano storico; dialog di conferma eliminazione mostra un avviso ambrato aggiuntivo quando il piano da eliminare è quello attivo del country.
- ✅ `tsc --noEmit` pulito dopo ogni modifica.
- ✅ **Verifica manuale in dev completata (2026-07-22)** — tutti i controlli superati:
  1. Creazione primo piano filiale per un country → appare attivo
  2. Creazione secondo piano filiale stesso country/periodo → swap via RPC: il nuovo diventa attivo, il primo va in storico
  3. Riattivazione del piano storico via bottone "Riattiva" → torna attivo, l'altro va in storico
  4. Modifica (Pencil) del piano attivo (soglia) → `active` preservato correttamente dopo il salvataggio (fix di `update()` verificato)
  5. Eliminazione del piano attivo → warning ambrato mostrato nel dialog di conferma prima dell'eliminazione

**Nota:** le modifiche a `api.ts`, `CountryPage.tsx` e `ObjectivePlanDialog.tsx` di questa fase sono al momento **non committate** (solo verificate in dev) — commit lasciato a te.

**Step 2.5: COMPLETATO** (implementazione + validazione manuale in dev). Resta aperto solo il punto 4 sotto.

**Prossimo step tecnico:**
4. Tornare al nodo n8n "Somma Premio Filiale" (oggi forzato a 0) per implementare il calcolo reale delle soglie, ora che l'assegnazione Piano→Country è garantita univoca e lo swap è validato end-to-end

---

## Step 3 — Bottone "Duplica" su ObjectivePlan

In `ObiettiviPage.tsx` / `ObjectivoDetailPage.tsx`, aggiungere azione "Duplica" che:
- copia `ObjectivePlan` + tutte le sue `ObjectiveThreshold` associate
- chiede all'utente il nuovo target (collaboratore o country) e il nuovo `ObjectivePlanScope`
- crea un nuovo record indipendente — non tocca né modifica l'assegnazione originale

### Correzione (2026-07-22): DRAFT non deve mai far scattare lo swap

Emerso durante il test manuale dello Step 3: creare un nuovo `ObjectivePlan` `filiale` per un country che ha già un piano attivo faceva scattare **sempre** lo swap via `swap_active_filiale_plan`, indipendentemente da `ObjectiveStatus`. Un piano ancora in bozza (soglie non finalizzate) sarebbe quindi potuto diventare il piano "ufficiale" usato da n8n per calcolare i premi reali — rischio concreto su un calcolo che tocca soldi.

**Fix in `objectivePlanApi.create` (`src/lib/api.ts`):** creare un piano filiale in stato `DRAFT` quando esiste già un piano attivo per lo stesso country **non sostituisce** il piano attivo esistente — il nuovo piano nasce con `active:false` e resta nello storico (riattivabile a mano in seguito), senza chiamare la RPC di swap. Lo swap avviene solo se il nuovo piano ha uno stato diverso da `DRAFT` (comportamento originale invariato in quel caso). Se il country non ha ancora nessun piano attivo, il comportamento resta invariato in entrambi i casi (insert normale `active:true`, nessuna RPC).

Lato UI (`ObjectivePlanDialog.tsx`), il toast di conferma dopo il salvataggio distingue i due esiti: se il piano creato resta inattivo per questo motivo, mostra un messaggio dedicato ("Piano creato come bozza — resta INATTIVO: il piano già attivo per questo country non è stato sostituito") invece del generico "Obiettivo creato".

Verificato manualmente in dev (2026-07-22): piano DRAFT creato con un piano ASSIGNED già attivo → l'ASSIGNED resta attivo, il DRAFT va in storico, toast dedicato mostrato; piano non-DRAFT creato nelle stesse condizioni → swap regolare come da comportamento originale.

---

## Step 4 — Filtri/liste esistenti

- `ObiettiviPage.tsx` (lista piani) va aggiornata per mostrare/filtrare per `ObjectivePlanScope`, così i piani individuali e quelli filiale non si mescolano in un'unica vista indistinta.
- Valutare un badge o tab (Individuale / Filiale) coerente col resto del design system (badge status già usato per `ObjectiveStatus`).

**Step 4: COMPLETATO (2026-07-22).**

Soluzione scelta tra tre opzioni valutate (Select come terzo filtro / toggle segmented control / vista unica con badge): **toggle segmented control "Individuale | Filiale"** in cima a `ObiettiviPage.tsx`, sopra la card filtri esistente. Implementato con due `<button>` stilizzati a mano (nessun componente `Tabs` di shadcn/Radix nel progetto, nessuna nuova dipendenza aggiunta) — `scopeFilter` pilota direttamente il parametro `scope` passato a `objectivePlanApi.list()`.

Punti di attenzione emersi durante la progettazione e risolti nell'implementazione:
- **"Nuovo Obiettivo" nascosto sulla tab Filiale**: creare un piano filiale richiede un country di contesto che questa pagina non ha (a differenza di `CountryPage.tsx`, che parte sempre da una riga country). Sulla tab Filiale il bottone scompare, sostituito da un testo con link a `/country`.
- **`lockedCountryId` propagato su Modifica/Duplica per righe filiale**: senza questo accorgimento, aprire il dialog di modifica/duplica su un piano filiale da questa pagina avrebbe mostrato la checklist paesi sbloccata, permettendo di aggiungere un secondo `CountryId` a un piano filiale — rompendo l'assunzione "un piano filiale = un solo country" su cui si basa tutto il raggruppamento in `CountryPage.tsx` (`ObjectivePlanCountry?.[0]`) e il vincolo unique-per-country lato DB. Ora Modifica/Duplica calcolano `lockedCountryId` dalla riga stessa quando `ObjectivePlanScope === 'filiale'`, bloccando il country esattamente come già avviene in `CountryPage.tsx`.

Verificato manualmente in dev (2026-07-22): tab Individuale di default con "Nuovo Obiettivo" visibile; switch a Filiale aggiorna la lista, nasconde il bottone, mostra il link a Country; Modifica e Duplica su un piano filiale da questa pagina mostrano il country bloccato (non la checklist).

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
