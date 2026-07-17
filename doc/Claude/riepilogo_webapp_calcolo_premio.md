# Riepilogo per la chat webapp — LATAM Manager

## 1. Endpoint "Avvia Calcolo" (bottone già esistente in pagina Collaboratori)

**Webhook n8n (Calcolo Premio)**:
```
POST http://[host]:5678/webhook/b7190b76-ae97-4573-bbd5-e8701165a700
```

**Body richiesto**:
```json
{
  "collaboratorId": 8,
  "periodo": 3,
  "anno": 2026,
  "cuatrimestre": "1er Cuatrimestre 2026",
  "collaboratoreName": "J.Carpio"
}
```
Tutti e cinque i campi sono obbligatori (validati lato n8n, altrimenti errore 500).

**Risposta di successo**:
```json
{
  "success": true,
  "message": "Premio calcolato correttamente",
  "pdfUrl": "https://drive.google.com/file/d/.../view?usp=drivesdk"
}
```

Verificare se il frontend esistente per "Avvia Calcolo" già invia/attende questa struttura esatta, o va allineato.

---

## 2. Nuovo blocco UI da costruire: Assegnazione ObjectivePlan → Country

**Contesto**: oggi esiste solo l'assegnazione Piano→Collaboratore ("Assegna Obiettivo" per riga). Manca l'equivalente per Country, necessario per calcolare il "premio filiale" (bonus legato al fatturato aggregato di un intero paese, distinto dal premio individuale).

**Tabella Supabase già esistente ma vuota**: `ObjectivePlanCountry` (campi: `ObjectivePlanCountryId`, `ObjectivePlanId`, `CountryId`).

**Requisiti funzionali**:
- Il manager deve poter assegnare un `ObjectivePlan` a un `Country` per un dato periodo/quadrimestre.
- Deve poter **scollegare** l'assegnazione (es. "questo quadrimestre, Mexico non ha premio filiale").
- Finché non c'è assegnazione per un country, il premio filiale per quel paese resta 0 (comportamento già implementato lato n8n, di sicuro fallback).

**Nota per n8n**: una volta che l'assegnazione esiste su Supabase, il nodo "Somma Premio Filiale" in Calcolo Premio andrà aggiornato per leggere le soglie (`ObjectiveThreshold`) del piano assegnato al country e calcolare il premio a soglie (stessa logica già usata per il premio individuale: `si_alcanza`/`adicionalmente`/`adicionalmente_mayor`), confrontandole con `valore_totale_filiale` (il fatturato aggregato del country, non un premio). Oggi quel nodo è volutamente forzato a restituire sempre 0.

---

## Contesto tecnico generale del progetto (per riferimento)

- **Stack**: n8n (self-hosted, Docker, localhost:5678), Google Drive, Supabase, Claude Vision API, Gotenberg (HTML→PDF), React/TypeScript webapp su Vercel (latam-webapp.vercel.app).
- **Tre workflow n8n**:
  1. **Onboarding Collaboratore** — a chiamata, crea struttura cartelle Drive + profile JSON.
  2. **Inbox Processor** — autonomo, monitora Drive, classifica/valida/crea buffer JSON dagli screenshot Qlik.
  3. **Calcolo Premio** — a chiamata (webhook sopra), calcola premio individuale + filiale, genera PDF, lo salva su Drive.
- **Tabelle Supabase rilevanti**: `Collaborator`, `Country`, `CollaboratorType`, `ObjectivePlan`, `ObjectiveThreshold`, `CollaboratorObjectivePlan`, `ObjectivePlanCountry` (vuota, da popolare via nuova UI).
