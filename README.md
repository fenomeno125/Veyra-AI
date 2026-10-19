# Nova AI

Una prima versione web di un assistente IA, con interfaccia in italiano, cronologia locale delle chat e configurazione per endpoint compatibili con l'API Chat Completions.

## Avvio locale

Richiede Node.js 18 o successivo.

```bash
npm install
npm run dev
```

Apri l'indirizzo locale mostrato da Vite.

## Attivare le risposte di un modello

Apri **Impostazioni** nell'interfaccia e configura:
- endpoint API compatibile con `/v1/chat/completions`
- nome modello supportato dal provider
- chiave API del provider

Senza chiave, la chat funziona in modalità anteprima, spiegando che il modello non è collegato.

## Sicurezza: importante prima di pubblicare

Questa è una demo/prototipo client-side. La chiave API viene salvata nel localStorage del browser e le richieste partono direttamente dal browser: **non è sicuro per un prodotto pubblico**. Prima della pubblicazione:
1. crea un backend/serverless endpoint;
2. conserva la chiave API solo in variabili d'ambiente server-side;
3. aggiungi autenticazione, limiti di utilizzo, protezione anti-abuso e logging rispettoso della privacy;
4. aggiungi informativa privacy e controlli di cancellazione dati;
5. verifica i termini del provider e le regole applicabili.

La ricerca web, gli allegati, la voce, gli account e la sincronizzazione tra dispositivi sono elementi da implementare in fasi successive.
