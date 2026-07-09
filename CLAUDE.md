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

## Prossimi step

- [ ] **Deployment:** creare `docker-compose.yml` (app + eventuali servizi), `Dockerfile` multi-stage per Vite SPA, `.env.example` documentato
- [ ] **n8n webhook:** spostare la costante `N8N_WEBHOOK` in variabile d'ambiente (`.env`) invece di hardcodarla nel sorgente — evita commit ogni volta che il tunnel cambia
- [ ] **Refinement UI obiettivi:** valutare miglioramenti alla pagina `/obiettivi` (filtri, stato badge, link documenti)
- [ ] **Refinement UI risultati:** `ResultAchievementPct` mostrato come progress bar colorata nella tabella (verde ≥100%, giallo 70–99%, rosso <70%)
- [ ] **Ruoli utente:** post-MVP — differenziare manager (crea obiettivi) da admin (gestisce reference data)
