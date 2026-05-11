## 1. Project Setup

- [x] 1.1 Initialize Next.js project with TypeScript, App Router, Tailwind CSS, and shadcn/ui
- [x] 1.2 Add dependencies: Prisma, @prisma/client, zod, react-hook-form, @hookform/resolvers
- [x] 1.3 Configure PostgreSQL connection (DATABASE_URL in .env) and initialize Prisma
- [x] 1.4 Define Prisma schema with all 8 models: Region, Country, CollaboratorType, Collaborator, Period, ObjectiveTemplate, Objective, Result
- [x] 1.5 Run initial Prisma migration to create the database schema
- [x] 1.6 Create seed script with sample data for Region, Country, CollaboratorType, Period

## 2. API — Reference Data Endpoints

- [x] 2.1 Implement CRUD API routes for Region (`/api/regions`, `/api/regions/[id]`) with deletion guard for dependent countries
- [x] 2.2 Implement CRUD API routes for Country (`/api/countries`, `/api/countries/[id]`) with RegionId validation and filter by RegionId
- [x] 2.3 Implement CRUD API routes for CollaboratorType (`/api/collaborator-types`, `/api/collaborator-types/[id]`) with deletion guard for assigned collaborators
- [x] 2.4 Implement CRUD API routes for Period (`/api/periods`, `/api/periods/[id]`) ordered by PeriodYear descending
- [x] 2.5 Implement CRUD API routes for ObjectiveTemplate (`/api/objective-templates`, `/api/objective-templates/[id]`) ordered by title

## 3. API — Collaborator Endpoints

- [x] 3.1 Implement POST `/api/collaborators` — create collaborator with unique email validation and FK checks (CollaboratorTypeId, CountryId)
- [x] 3.2 Implement GET `/api/collaborators` — list with optional filters: active, countryId, collaboratorTypeId
- [x] 3.3 Implement GET `/api/collaborators/[id]` — get single collaborator with joined Country and CollaboratorType
- [x] 3.4 Implement PUT `/api/collaborators/[id]` — update collaborator fields including CollaboratorActive
- [x] 3.5 Implement DELETE `/api/collaborators/[id]` — delete collaborator (add guard if objectives exist)

## 4. API — Objective Endpoints

- [x] 4.1 Implement POST `/api/objectives` — create objective with FK validation (CollaboratorId, PeriodId) and ObjectiveStatus enum validation
- [x] 4.2 Implement GET `/api/objectives` — list with filters: collaboratorId, periodId, status
- [x] 4.3 Implement GET `/api/objectives/[id]` — get single objective with joined Collaborator and Period
- [x] 4.4 Implement PUT `/api/objectives/[id]` — update status and document URLs (ObjectiveWordURL, ObjectiveSignedPdfURL)
- [x] 4.5 Implement DELETE `/api/objectives/[id]` — delete with guard: reject if associated results exist

## 5. API — Result Endpoints

- [x] 5.1 Implement POST `/api/results` — create result with FK validation (ObjectiveId) and non-negative ResultAchievementPct validation
- [x] 5.2 Implement GET `/api/results` — list filtered by objectiveId, ordered by ResultId ascending
- [x] 5.3 Implement GET `/api/results/[id]` — get single result
- [x] 5.4 Implement PUT `/api/results/[id]` — update all result fields including nullable evidence URLs
- [x] 5.5 Implement DELETE `/api/results/[id]` — delete result, return 404 if not found

## 6. UI — Layout and Navigation

- [ ] 6.1 Create app layout with sidebar navigation: Collaboratori, Obiettivi, Risultati, Impostazioni (reference data)
- [ ] 6.2 Set up shadcn/ui components: Table, Dialog, Form, Button, Input, Select, Badge
- [ ] 6.3 Create shared data-table component with pagination support for reuse across all list pages

## 7. UI — Reference Data Pages

- [ ] 7.1 Build `/impostazioni/regioni` page: list, create, edit, delete Region with confirmation dialog
- [ ] 7.2 Build `/impostazioni/paesi` page: list, create, edit, delete Country with Region selector
- [ ] 7.3 Build `/impostazioni/tipi-collaboratore` page: list, create, edit, delete CollaboratorType
- [ ] 7.4 Build `/impostazioni/periodi` page: list, create, edit, delete Period
- [ ] 7.5 Build `/impostazioni/template-obiettivi` page: list, create, edit, delete ObjectiveTemplate with textarea for body

## 8. UI — Collaborator Registry Pages

- [ ] 8.1 Build `/collaboratori` list page with filters (active status, country, type) and paginated table
- [ ] 8.2 Build collaborator create/edit dialog with form fields: name, email, type, country, active toggle
- [ ] 8.3 Add inline activation/deactivation toggle on the collaborator list row
- [ ] 8.4 Build `/collaboratori/[id]` detail page showing collaborator info and their associated objectives

## 9. UI — Objective Management Pages

- [ ] 9.1 Build `/obiettivi` list page with filters (collaborator, period, status) and status badge display
- [ ] 9.2 Build objective create/edit dialog with collaborator selector, period selector, status selector, and URL fields
- [ ] 9.3 Add clickable document link icons on the objective row for Word URL and signed PDF URL
- [ ] 9.4 Build `/obiettivi/[id]` detail page showing objective info and its results

## 10. UI — Result Tracking Pages

- [ ] 10.1 Build result list view embedded in the objective detail page (`/obiettivi/[id]`)
- [ ] 10.2 Build result create/edit dialog with fields: actual value, delta, achievement %, Qlik image URL, PDF URL
- [ ] 10.3 Display ResultAchievementPct as a progress indicator (e.g., colored badge or progress bar) on the results table
- [ ] 10.4 Add result delete confirmation dialog

## 11. Validation and Error Handling

- [ ] 11.1 Define Zod schemas for all 8 entities matching API request/response shapes
- [ ] 11.2 Wire Zod schemas to React Hook Form on all create/edit dialogs for client-side validation
- [ ] 11.3 Return consistent JSON error responses from all API routes (`{ error: string }` with appropriate HTTP status codes)
- [ ] 11.4 Show API error messages as toast notifications in the UI using sonner or shadcn/ui toast

## 12. Deployment

- [ ] 12.1 Create `docker-compose.yml` with app and PostgreSQL services
- [ ] 12.2 Write `Dockerfile` for the Next.js application (multi-stage build)
- [ ] 12.3 Add `.env.example` with all required environment variables documented
- [ ] 12.4 Verify production build (`next build`) passes with no TypeScript errors
