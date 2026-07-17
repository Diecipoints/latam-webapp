# Ripresa lavoro: Premio Filiale in Calcolo Premio

## Quando usare questo file
Quando il blocco "Assegnazione ObjectivePlan → Country" è stato completato lato webapp/Supabase (tabella `ObjectivePlanCountry` popolata, UI funzionante), tornare su questo per completare il calcolo del premio filiale in n8n.

## Stato attuale (al 17/07/2026)
Nel workflow **Calcolo Premio**, nodo **"Somma Premio Filiale"**, il calcolo è volutamente forzato così:

```javascript
const binaryData = $input.first().binary.data;
const jsonStr = Buffer.from(binaryData.data, 'base64').toString('utf8').replace(/^=/, '');
const bufferFiliale = JSON.parse(jsonStr);
const premioBase = $('Calcola Premio').first().json;
const buffQlik = $('Leggi Buffer Qlik').first().json;

const premioTotale = Number(premioBase.premioTotale) || 0;

return [{ json: {
  ...premioBase,
  imagenFileId: buffQlik.imagenFileId || null,
  valoreTotaleFiliale: 0,
  premioFiliale: 0,
  premioTotaleConFiliale: premioTotale
}}];
```

Il buffer filiale (es. `qlik_MEXICO_filiale_1er_Cuatrimestre_2026.json`) contiene già il campo `valore_totale_filiale` — che è **fatturato aggregato del country**, non un premio. Il nodo lo ignora di proposito finché non esiste una logica a soglie.

## Cosa serve fare
1. **Recuperare il piano assegnato al country**: query Supabase simile a quella già usata per l'individuale, ma partendo da `Country` invece che da `Collaborator`:
   ```
   https://koznfslwdudaydutujdl.supabase.co/rest/v1/ObjectivePlanCountry?select=ObjectivePlan(ObjectivePlanId,ObjectivePlanName,ObjectiveThreshold(*))&CountryId=eq.{countryId}
   ```
   Il `countryId` va ricavato dal nome paese del buffer filiale (es. "MEXICO" → `CountryId` su tabella `Country`).

2. **Gestire il caso "nessun piano assegnato"**: se la query non restituisce nulla (country non assegnato per quel periodo), il premio filiale resta 0 — comportamento già presente, va solo mantenuto come fallback esplicito.

3. **Calcolare a soglie**: stessa logica già usata per il premio individuale nel nodo "Calcola Premio" (confrontare `valore_totale_filiale` con `ObjectiveThresholdRevenueValue` di ogni soglia, sommare `ObjectiveThresholdBonusValue` per ogni soglia superata — pattern `si_alcanza` / `adicionalmente` / `adicionalmente_mayor`).

4. **Aggiornare l'output del nodo** per restituire `valoreTotaleFiliale` (il vero premio calcolato, non più forzato a 0) e mantenere `premioTotaleConFiliale = premioTotale + valoreTotaleFiliale`.

5. **Verificare "Genera HTML Risultato"**: la sezione "Premio Filial" nel PDF è già condizionata a `premioFiliale > 0` — comparirà automaticamente una volta che il calcolo produce un valore reale, nessuna modifica necessaria lì.

## Contesto tecnico di riferimento
- Stack: n8n self-hosted (localhost:5678, Docker), Google Drive, Supabase, Gotenberg (localhost:3001).
- Workflow: **Calcolo Premio**, webhook `b7190b76-ae97-4573-bbd5-e8701165a700`.
- Tabelle Supabase coinvolte: `Country`, `ObjectivePlan`, `ObjectivePlanCountry`, `ObjectiveThreshold`.
- Nodo da modificare: **"Somma Premio Filiale"** (Code node, tra "Scarica Buffer Filiale" e "Cerca Profile Collaboratore").
- Test collaboratore di riferimento: J.Carpio (CollaboratorId 8, Mexico), buffer filiale esistente: `qlik_MEXICO_filiale_1er_Cuatrimestre_2026.json` con `valore_totale_filiale` di esempio ~1.918.093 (fatturato, non premio).
