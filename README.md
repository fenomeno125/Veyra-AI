# Veyra AI

Applicazione web React + Vite con API server-side per Vercel.

## Funzioni presenti
- Chat AI tramite endpoint `/api/chat` e provider Groq.
- Ricerca web tramite `/api/search` e browser search del provider.
- Generazione immagini tramite `/api/image` (servizio esterno).
- Analisi di immagini nella chat, se il modello configurato supporta la visione.
- Cronologia chat salvata localmente nel browser.
- Area Progetti: creazione, apertura ed eliminazione di progetti salvati localmente.
- Esplora: modelli rapidi per studio, scrittura, programmazione e ricerca.

## Limiti attuali
- PDF e documenti non vengono ancora letti dal backend: l'interfaccia non deve considerarli supportati.
- I progetti e la cronologia sono locali al browser e non si sincronizzano tra dispositivi.
- Le attività programmate richiedono un servizio scheduler lato server.
- I plugin richiedono OAuth, credenziali e consenso esplicito dell'utente per ciascun servizio.
- Codex non dispone ancora di un ambiente isolato per eseguire repository o comandi.
- La generazione immagini dipende dalla disponibilità e dalle condizioni del provider esterno.
- Le API esterne possono avere limiti, quote e costi: non attivare fatturazione senza averne discusso prima.

## Configurazione
Le chiavi API devono essere impostate solo nelle variabili d'ambiente server di Vercel. Non inserirle nel frontend né nel repository. Le variabili usate dal codice attuale includono `GROQ_API_KEY`; eventuali modelli alternativi possono essere configurati con `GROQ_MODEL` e `GROQ_WEB_MODEL`.

## Sviluppo
```bash
npm install
npm run dev
npm run build
```

Le nuove funzionalità vengono sviluppate sul branch `veyra-upgrade`. Non vengono pubblicate su `main` senza revisione e approvazione.
