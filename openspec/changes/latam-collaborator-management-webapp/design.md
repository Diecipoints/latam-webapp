## Context

This is a greenfield web application for LATAM regional management. There is no existing codebase to migrate. The data model is fully defined: 8 relational tables covering region/country hierarchy, collaborator registry, period-based objective assignment, and result tracking with evidence URLs.

Key stakeholders: LATAM regional managers (assign objectives), collaborators (view their objectives/results), administrators (manage reference data).

## Goals / Non-Goals

**Goals:**
- Full-stack web application with authenticated multi-page UI
- REST API covering all 8 entities
- CRUD for reference data (Region, Country, CollaboratorType, Period, ObjectiveTemplate)
- Collaborator registry management
- Objective assignment per collaborator per period
- Result registration with achievement percentage and evidence links
- Relational database with the exact schema specified

**Non-Goals:**
- Authentication/SSO integration (basic auth or session-based login is sufficient for MVP)
- Qlik or document storage integrations (URLs are stored as plain strings; no upload/fetch logic)
- Email notifications or workflow approvals
- Mobile-native application
- Multi-language i18n (Italian UI is acceptable for MVP)

## Decisions

### 1. Full-stack framework: Next.js (App Router) with TypeScript

**Rationale**: Next.js unifies frontend and backend in a single deployable unit. API Routes / Route Handlers serve the REST endpoints. TypeScript enforces type safety across the shared data model. Eliminates the need to manage two separate projects.

**Alternatives considered**:
- Separate React SPA + Express/FastAPI backend: more deployment complexity with no benefit at this scale.
- Django + Jinja templates: simpler for CRUD but less flexible UI; Python adds a second language.

### 2. ORM: Prisma

**Rationale**: Prisma provides a type-safe query client generated from the schema definition, migrations via `prisma migrate`, and excellent TypeScript integration. The exact 8-table schema maps directly to a Prisma schema file.

**Alternatives considered**:
- Drizzle ORM: lighter but less mature tooling.
- Raw SQL / Knex: more control but no type safety.

### 3. Database: PostgreSQL

**Rationale**: The schema uses foreign keys and relational integrity; PostgreSQL is the standard choice. Runs locally via Docker for development and can be hosted on any managed PaaS (Supabase, Neon, Railway, Render).

**Alternatives considered**:
- SQLite: acceptable for dev but not for production with concurrent users.
- MySQL: equivalent, but PostgreSQL has better JSON support if needed later.

### 4. UI component library: shadcn/ui (Tailwind CSS)

**Rationale**: Provides accessible, composable components (tables, forms, dialogs) without locking into a paid component library. Tailwind CSS handles layout and styling consistently.

**Alternatives considered**:
- MUI / Ant Design: heavier bundle, more opinionated styling.
- Plain CSS: too much manual work for a CRUD-heavy app.

### 5. API design: RESTful Route Handlers under `/api/`

Each entity gets standard CRUD endpoints:
- `GET /api/<entity>` — list (with filters where applicable)
- `POST /api/<entity>` — create
- `GET /api/<entity>/[id]` — get one
- `PUT /api/<entity>/[id]` — update
- `DELETE /api/<entity>/[id]` — delete

Objective and Result endpoints include nested lookups (e.g., results by objective).

### 6. Data validation: Zod

**Rationale**: Zod schemas validate request bodies on API routes and can be reused in React Hook Form for client-side validation. Single source of truth for shape and constraints.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Prisma schema drift from specified DB model | Define Prisma schema first; treat it as the single source of truth for migrations |
| Large result/objective lists without pagination | Implement server-side pagination from the start on list endpoints |
| ObjectiveWordURL / ObjectiveSignedPdfURL are free-text URLs with no validation | Store as nullable strings; add basic URL format validation via Zod |
| ResultAchievementPct computation: manual or derived? | Store as explicit value entered by user (not auto-computed); allows for rounding/business logic flexibility |
| No auth specified | Implement NextAuth.js with credentials provider as minimal auth; can be upgraded to SSO later |

## Migration Plan

1. Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
2. Define Prisma schema matching all 8 tables; run initial migration to create DB
3. Seed reference data (sample Regions, Countries, CollaboratorTypes, Periods)
4. Implement API routes entity by entity (reference data first, then Collaborator, Objective, Result)
5. Build UI pages in the same order
6. Deploy: containerize with Docker Compose (app + PostgreSQL) or push to Vercel + managed Postgres

Rollback: the app is stateless; rolling back means redeploying the previous container image. DB rollback via `prisma migrate resolve --rolled-back`.

## Open Questions

- Should `ResultDelta` be auto-computed as `ResultActualValue - some baseline`, or is it user-entered? (Assumed user-entered for now.)
- Is `ObjectiveStatus` a free-text field or an enum? (Recommended enum: `DRAFT`, `ASSIGNED`, `SIGNED`, `CLOSED`.)
- Are there role-based access requirements (e.g., only managers can create objectives)? (Deferred to post-MVP.)
