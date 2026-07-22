# LATAM Manager — Contesto di Sessione

## Cos'è questo progetto

Web app HR & OKR per la gestione dei collaboratori nella regione LATAM. Permette di: gestire il registro collaboratori con gerarchia regione/paese, assegnare obiettivi per periodo con tracking dei documenti, registrare risultati con percentuale di raggiungimento ed evidenze.

UI in italiano. Utenti target: manager regionali LATAM.

---

## Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| Framework UI | React 19 + TypeScript + Vite 8 |
| Routing | React Router DOM v7 |
| Backend / DB | Supabase (PostgreSQL hosted) |
| Auth | Supabase Auth (`supabase.auth.signInWithPassword`) |
| State / Form | React Hook Form + Zod |
| UI Components | shadcn/ui (Radix UI primitives) + Tailwind CSS v3 |
| Notifiche | Sonner (toast) |
| Icone | Lucide React |

> **Nota:** L'openspec originale proponeva Next.js + Prisma, ma l'implementazione reale usa React SPA + Supabase direttamente. Non introdurre Next.js, Prisma o Express.

---

## Struttura file chiave

```
src/
  App.tsx                          # Router principale, layout Impostazioni
  lib/
    supabase.ts                    # Client Supabase
    api.ts                         # Tutte le chiamate DB (regionApi, collaboratorApi, …)
    database.types.ts              # Tipi TypeScript generati dallo schema Supabase
    schemas.ts                     # Schemi Zod per validazione form/API
    auth-context.tsx               # AuthProvider + useAuth()
  components/
    auth/
      RequireAuth.tsx              # Guard route protette
      ParticleCanvas.tsx           # Canvas particelle ritratto (login)
    layout/
      AppLayout.tsx                # Sidebar navigazione app
    ui/                            # Componenti shadcn/ui
  pages/
    auth/LoginPage.tsx             # Login split-panel (sx: particelle, dx: form)
    collaboratori/
      CollaboratoriPage.tsx        # Lista + CRUD collaboratori + trigger n8n
      CollaboratoreDetailPage.tsx  # Dettaglio collaboratore + suoi obiettivi
    obiettivi/
      ObiettiviPage.tsx            # Lista + CRUD obiettivi
      ObiettivoDetailPage.tsx      # Dettaglio obiettivo + risultati
    risultati/
      RisultatiPage.tsx            # Vista risultati globale
    impostazioni/
      RegionPage.tsx               # CRUD Regioni
      PaesiPage.tsx                # CRUD Paesi
      TipiCollaboratorePage.tsx    # CRUD Tipi Collaboratore
      PeriodPage.tsx               # CRUD Periodi
      TemplateObiettiviPage.tsx    # CRUD Template Obiettivi
```

---

## Schema database (8 tabelle Supabase)

```
Region          RegionId PK, RegionName
Country         CountryId PK, CountryName, RegionId FK→Region
CollaboratorType  CollaboratorTypeId PK, CollaboratorTypeName
Collaborator    CollaboratorId PK, CollaboratorName, CollaboratorEmail,
                CollaboratorActive bool, CollaboratorTypeId FK, CountryId FK,
                CuatrimestreIngresso string|null,   ← campo extra vs spec
                OnboardingDone bool                  ← campo extra vs spec
Period          PeriodId PK, PeriodDescription, PeriodYear int
ObjectiveTemplate  ObjectiveTemplateId PK, ObjectiveTemplateTitle, ObjectiveTemplateBody
ObjectivePlan   ObjectivePlanId PK, CollaboratorId FK, PeriodId FK,
                ObjectivePlanName string, ObjectiveStatus enum(DRAFT|ASSIGNED|SIGNED|CLOSED)
                ← rinominata da "Objective"; niente più URL documento Word/PDF
ObjectivePlanCountry  ObjectivePlanCountryId PK, ObjectivePlanId FK, CountryId FK
                ← paesi coperti dal piano (multi-select), ON DELETE CASCADE
ObjectiveThreshold  ObjectiveThresholdId PK, ObjectivePlanId FK,
                ObjectiveThresholdRevenueValue decimal, ObjectiveThresholdRevenueCurrency enum(currency_code),
                ObjectiveThresholdBonusValue decimal, ObjectiveThresholdBonusCurrency enum(currency_code),
                ObjectiveThresholdType enum(si_alcanza|adicionalmente)
                ← soglie ripetibili del piano, ON DELETE CASCADE
Result          ResultId PK, ObjectivePlanId FK,
                ResultActualValue decimal, ResultDelta decimal,
                ResultAchievementPct decimal (≥0),
                ResultQlikImageUrl string|null, ResultPdfUrl string|null
```

`currency_code` enum: EUR | COP | MXN | ARS | CLP | DOP.

Migration: `supabase/migration_2_objective_plan.sql` (da applicare manualmente via Supabase SQL Editor dopo `migration.sql`) rinomina `Objective`→`ObjectivePlan` in place e `Result.ObjectiveId`→`Result.ObjectivePlanId`, preservando gli ID esistenti.

---

## API layer (`src/lib/api.ts`)

Tutte le query usano il client Supabase direttamente, senza REST layer intermedio.
Ogni entità espone: `list()`, `get(id)`, `create(data)`, `update(id, data)`, `delete(id)`.

Guards implementati lato client:
- `regionApi.delete` → blocca se esistono Country associate
- `collaboratorTypeApi.delete` → blocca se tipo usato da Collaborator
- `collaboratorApi.delete` → blocca se esistono ObjectivePlan associati
- `objectivePlanApi.delete` → blocca se esistono Result associati (ObjectivePlanCountry/ObjectiveThreshold vengono eliminati automaticamente via ON DELETE CASCADE)

---

## Routing

```
/login                         → LoginPage (pubblica)
/                              → redirect /collaboratori
/collaboratori                 → CollaboratoriPage
/collaboratori/:id             → CollaboratoreDetailPage
/obiettivi                     → ObiettiviPage
/obiettivi/:id                 → ObiettivoDetailPage
/risultati                     → RisultatiPage
/impostazioni                  → redirect /impostazioni/regioni
/impostazioni/regioni          → RegionPage
/impostazioni/paesi            → PaesiPage
/impostazioni/tipi-collaboratore → TipiCollaboratorePage
/impostazioni/periodi          → PeriodPage
/impostazioni/template-obiettivi → TemplateObiettiviPage
```

Tutte le route tranne `/login` sono protette da `<RequireAuth>` che usa `useAuth()`.

---

## Auth

- Provider: Supabase Auth
- `AuthProvider` in `App.tsx` wrappa tutto
- `useAuth()` restituisce `{ user, session, loading }`
- Login: `supabase.auth.signInWithPassword({ email, password })`
- Logout: disponibile tramite Supabase client

---

## Design system

- Font: Inter
- Colore primario: variabile CSS `--primary` (blue scuro)
- Card standard: `bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.14)]`
- Card leggera: `shadow-[0_2px_12px_rgba(0,0,0,0.07)]`
- Badge status obiettivo: DRAFT=gray, ASSIGNED=blue, SIGNED=green, CLOSED=slate
- Tabelle: componente `<DataTable>` in `src/components/ui/data-table.tsx`

---

## Integrazioni esterne

### n8n Webhook (automazione onboarding)
Usato in `CollaboratoriPage.tsx` per triggerare workflow n8n alla creazione/modifica collaboratori.

```ts
const N8N_WEBHOOK = 'https://drinks-describes-wine-gdp.trycloudflare.com/webhook/fafdd9af-c7ad-40e7-8e4f-8c36869e1d4b'
```

Il dominio Cloudflare Tunnel cambia periodicamente — aggiornare questa costante quando il tunnel viene ricreato.

### Supabase
Credenziali in variabili d'ambiente (`.env` locale). Client in `src/lib/supabase.ts`.

---

## Login page — effetto particelle

`ParticleCanvas.tsx` carica `/FotoGabri.jpg` (in `public/`), campiona la luminosità dei pixel (threshold: 72), crea fino a 20.000 particelle bianche/azzurre che formano il ritratto. Le particelle reagiscono alla prossimità del mouse (raggio 110px, repulsione + spring return). Background `#060610`.

---

## Convenzioni di codice

- Nessun commento se non per logica non ovvia
- Modifiche file: usare il tool `Edit`, non `sed` via bash
- Validazione: schemi Zod in `schemas.ts`, riusati sia per form che per tipizzazione
- Errori API: toast via `sonner` (`toast.error(...)`, `toast.success(...)`)
- Tipi DB: sempre da `database.types.ts`, non ridefinire inline
- Non usare `any`; preferire `unknown` o tipi specifici

---

## Stato implementazione (da openspec/tasks.md)

**Completate:** setup progetto, tutti gli endpoint API (reference data, collaboratori, obiettivi, risultati), tutte le pagine UI incluse impostazioni, collaboratori, obiettivi, risultati, login con particelle.

**Da completare o migliorare:** deployment (Docker Compose, Dockerfile), `.env.example`, eventuali refinement UI su risultati e obiettivi.

---

## Sessione 2026-05-13 — cosa è stato fatto

### Effetto particelle login (`feature/login-particles` → mergiato su `main`)

- **Creato** `src/components/auth/ParticleCanvas.tsx`: canvas con particle system che campiona luminosità da `/FotoGabri.jpg`, posiziona le particelle formando il ritratto, reagisce al mouse (repulsione + spring return).
- **Modificato** `src/pages/auth/LoginPage.tsx`: layout split-panel — pannello sinistro scuro con `<ParticleCanvas>` (nascosto su mobile), pannello destro con il form invariato.
- **Aggiunto** `public/FotoGabri.jpg` al repo (necessario per l'effetto; senza questo file il canvas è nero).
- **Fix TypeScript TS18047** su `ctx`: prima tentativo con guard `if (!ctx) return` dentro `animate` (workaround), poi refactoring corretto con `canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D` alla dichiarazione — elimina il problema alla radice perché TypeScript non propaga il narrowing di `const` nelle closure in tutte le configurazioni.
- **Alzato** `BRIGHTNESS_THRESHOLD` da 28 → 72 per eliminare i pixel grigi di sfondo e tenere solo i pixel chiari di viso/capelli/occhiali.

**Parametri chiave `ParticleCanvas.tsx`:**
```ts
BRIGHTNESS_THRESHOLD = 72   // alzare se troppo rumore, abbassare se perde dettaglio
MOUSE_RADIUS = 110          // raggio repulsione mouse (px canvas)
REPULSION = 9               // forza di allontanamento
SPRING = 0.055              // velocità di ritorno all'origine
FRICTION = 0.80             // smorzamento velocità
MAX_PARTICLES = 20000       // cap performance
BG_COLOR = '#060610'        // background pannello sinistro
```

### Aggiornamento webhook n8n

`N8N_WEBHOOK` in `CollaboratoriPage.tsx` aggiornato al nuovo tunnel Cloudflare:
```
https://drinks-describes-wine-gdp.trycloudflare.com/webhook/fafdd9af-c7ad-40e7-8e4f-8c36869e1d4b
```

### Creato `CLAUDE.md`

Questo file — contesto completo per sessioni future.

### Commit history di sessione
```
187225d Add portrait image to public folder
132af32 Fix ctx type in ParticleCanvas — non-null cast
cdbefd1 Fix ctx null check in ParticleCanvas
7507b71 Add particle portrait effect on login page
```

---

## Sessione 2026-07-20 — Assegnazione ObjectivePlan → Country (premio filiale)

Riferimento: piano dettagliato in `doc/Claude/piano_assegnazione_country.md`. Continua il lavoro dei giorni precedenti (migrazione `ObjectivePlanScope`, estrazione `ObjectivePlanDialog`) completando lo **Step 2** del piano.

### `CountryPage.tsx` e wiring (Step 2 — completato)

- **Creato** `src/pages/country/CountryPage.tsx`: elenca tutti i Country con la relativa Regione, i piani `ObjectivePlan` di scope `filiale` assegnati a ciascuno (Badge nome + `StatusPill`), azioni inline Pencil/Trash2 per modificare/eliminare i piani esistenti, e un bottone "Assegna Obiettivo" (icona `Target`) per crearne uno nuovo bloccato su quel country.
- Riusa `ObjectivePlanDialog` passando `scope="filiale"` e `lockedCountryId`: nel dialog questo sostituisce la checklist multi-paese con un'etichetta statica e forza `CountryIds` a `[lockedCountryId]`.
- Raggruppamento piani→country calcolato al volo via `reduce` su `plan.ObjectivePlanCountry?.[0]?.CountryId`, nessuno state separato.
- **Modificato** `src/App.tsx`: aggiunta route `/country` → `CountryPage`.
- **Modificato** `src/components/layout/AppLayout.tsx`: aggiunta voce sidebar "Country" (icona `Globe` di lucide-react) tra "Obiettivi" e "Risultati".
- Verificato manualmente in dev (`npm run dev`): lista country, apertura dialog con country bloccato (etichetta statica, non checklist), creazione/modifica/eliminazione piano filiale, comparsa/scomparsa badge in tabella, voce menu — tutto funzionante.

### Punto aperto emerso dal test manuale

Nessun vincolo, né lato DB né lato UI, impedisce oggi di creare più piani `filiale` per lo stesso country nello stesso periodo. Da decidere (opzioni dettagliate in `doc/Claude/piano_assegnazione_country.md`) prima di implementare il nodo n8n "Somma Premio Filiale", che oggi resta forzato a restituire 0.

### Stato piano generale (`piano_assegnazione_country.md`)

- Step 0 (checkpoint), Step 1 (migrazione `ObjectivePlanScope`), Step 2 (`CountryPage` + wiring): **completati**
- Step 3 (bottone "Duplica" su ObjectivePlan) e Step 4 (badge/tab Individuale/Filiale in `ObiettiviPage.tsx`): **da fare**

### Commit history di sessione

Commit del 2026-07-20 (oggi):
```
2be532e Add CountryPage with inline plan management
446f3a3 Wire /country route and sidebar entry
```

Commit del 2026-07-17 (fase precedente dello stesso Step 2, propedeutici):
```
c1a853e Add scope and lockedCountryId props to ObjectivePlanDialog
d63d49b Extract ObjectivePlanDialog into shared component
```

---

## Sessione 2026-07-22 — Step 2.5, 3, 4: assegnazione Piano→Country resa affidabile

Continua e chiude il lavoro di `doc/Claude/piano_assegnazione_country.md` iniziato il 2026-07-20 (Step 2, `CountryPage.tsx`). Tutto testato manualmente in dev e pushato su `main`.

### Step 2.5 — Vincolo: un solo piano filiale attivo per Country (`ebbbb0d`, oltre a `8c6ee7c`)

- Migrazione SQL applicata manualmente su Supabase: colonna `active` boolean su `ObjectivePlanCountry` (default `true`), colonna `scope` denormalizzata sincronizzata via trigger da `ObjectivePlan.ObjectivePlanScope`, unique index parziale (`active=true AND scope='filiale'` per `CountryId`), funzione RPC `swap_active_filiale_plan(p_country_id, p_new_objective_plan_id)` per lo swap atomico disattiva-vecchio/attiva-nuovo.
- `database.types.ts` e `api.ts` aggiornati: `objectivePlanApi.reactivateFiliale()`, `create()` gestisce l'inserimento di un nuovo piano filiale quando il country ha già un piano attivo (insert `active:false` + swap via RPC), `update()` corretto per preservare `active` invece di resettarlo ad ogni modifica (bug scoperto durante l'implementazione).
- `CountryPage.tsx`: piano attivo in evidenza per country, storico espandibile con bottone "Riattiva", warning ambrato nel dialog di eliminazione quando si elimina il piano attivo.

### Step 3 — Duplica piano + fix sicurezza DRAFT (`bd5b4fe`)

- Bottone "Duplica" (icona `Copy`) su `ObiettiviPage.tsx` e `CountryPage.tsx`: copia periodo/paesi/nome/soglie di un piano esistente in un nuovo dialog di creazione (`ObjectivePlanDialog` esteso con prop `duplicateFrom`, distinto da `item` così il submit chiama sempre `create()`, mai `update()` — il piano originale non viene mai toccato). Stato forzato a `DRAFT` sul duplicato, non ereditato dall'originale.
- **Fix di sicurezza emerso in test manuale**: creare un piano filiale in stato `DRAFT` per un country con già un piano attivo non deve promuoverlo automaticamente (rischio di far calcolare a n8n dei premi reali su soglie non finalizzate). Ora lo swap via RPC scatta solo se il nuovo piano ha uno stato diverso da `DRAFT`; un piano `DRAFT` nasce `active:false` e resta in storico finché non viene promosso. Toast dedicato in UI quando questo succede.

### Step 4 — Toggle Individuale/Filiale in ObiettiviPage (`8df4d44`)

- Segmented control "Individuale | Filiale" in cima a `ObiettiviPage.tsx` (due `<button>` stilizzati a mano, nessuna nuova dipendenza — niente `Tabs` di Radix nel progetto) che pilota il filtro `scope` passato a `objectivePlanApi.list()`.
- "Nuovo Obiettivo" nascosto sulla tab Filiale (creare un piano filiale richiede un country di contesto che questa pagina non ha; resta un link a `/country`).
- `lockedCountryId` propagato su Modifica/Duplica per le righe filiale mostrate qui, altrimenti si potrebbe aggiungere un secondo `CountryId` a un piano filiale rompendo l'assunzione "un piano filiale = un solo country" su cui si basa il raggruppamento in `CountryPage.tsx`.

### Stato piano generale (`piano_assegnazione_country.md`)

Step 0, 1, 2, 2.5, 3, 4: **tutti completati**. Riferimento dettagliato con diff, decisioni e verifiche manuali in `doc/Claude/piano_assegnazione_country.md`.

### Prossimo lavoro

Il nodo **"Somma Premio Filiale"** nel workflow n8n "Calcolo Premio" resta forzato a restituire 0. È ora sbloccabile: l'assegnazione Piano→Country è finalmente univoca e affidabile (un solo piano attivo per country, garantito sia da constraint DB che da RPC transazionale), quindi si può implementare il calcolo reale a soglie (`si_alcanza`/`adicionalmente`/`adicionalmente_mayor`) confrontando `valore_totale_filiale` con le soglie del piano `filiale` attivo assegnato al country per quel periodo.

---

## Prossimi step

- [ ] **n8n — nodo "Somma Premio Filiale":** implementare il calcolo reale a soglie ora che l'assegnazione Piano→Country è affidabile (vedi sessione 2026-07-22 sopra)
- [ ] **Deployment:** creare `docker-compose.yml` (app + eventuali servizi), `Dockerfile` multi-stage per Vite SPA, `.env.example` documentato
- [ ] **n8n webhook:** spostare la costante `N8N_WEBHOOK` in variabile d'ambiente (`.env`) invece di hardcodarla nel sorgente — evita commit ogni volta che il tunnel cambia
- [ ] **Refinement UI obiettivi:** valutare miglioramenti alla pagina `/obiettivi` (filtri, stato badge, link documenti)
- [ ] **Refinement UI risultati:** `ResultAchievementPct` mostrato come progress bar colorata nella tabella (verde ≥100%, giallo 70–99%, rosso <70%)
- [ ] **Ruoli utente:** post-MVP — differenziare manager (crea obiettivi) da admin (gestisce reference data)
