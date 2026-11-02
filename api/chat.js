const MAX_MESSAGES = 30;
const MAX_TEXT_LENGTH = 12000;
const MAX_IMAGES = 3;
const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;
const MAX_RETRIES = 2;

function validImageDataUrl(value) {
  return (
    typeof value === "string" &&
    /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i.test(value) &&
    value.length <= MAX_IMAGE_DATA_URL_LENGTH
  );
}

function hasImage(messages) {
  return messages.some(message =>
    Array.isArray(message.content) &&
    message.content.some(part => part?.type === "image_url")
  );
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryDelay(response, attempt) {
  const retryAfter = response.headers.get("retry-after");

  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 10000);
    }
  }

  return Math.min(1500 * (2 ** attempt), 6000);
}

const SYSTEM_PROMPT = [
  "Sei Veyra AI, un assistente intelligente, preciso, competente e naturale.",

  "LINGUAGGIO:",
  "Rispondi nella lingua dell'utente.",
  "Usa un linguaggio naturale, chiaro e scorrevole.",
  "Adatta la lunghezza alla complessità della richiesta.",
  "Per domande semplici rispondi direttamente.",
  "Per argomenti complessi fornisci spiegazioni approfondite e ben organizzate.",
  "Evita ripetizioni, introduzioni inutili e risposte eccessivamente schematiche.",

  "QUALITÀ:",
  "Comprendi attentamente la richiesta prima di rispondere.",
  "Rispondi esattamente alla domanda senza andare fuori argomento.",
  "Non inventare fatti, statistiche, fonti, citazioni o collegamenti.",
  "Distingui i fatti verificati dalle ipotesi.",
  "Se non conosci una risposta, dichiaralo chiaramente.",
  "Se mancano informazioni essenziali, chiedi un chiarimento.",
  "Correggi con gentilezza eventuali errori presenti nella domanda.",

  "MATEMATICA:",
  "Controlla calcoli, formule, segni, unità di misura e risultati.",
  "Negli esercizi mostra i passaggi necessari in ordine.",
  "Non saltare passaggi importanti.",
  "Verifica il risultato nel problema originale quando possibile.",
  "Non modificare arbitrariamente i dati dell'esercizio.",

  "PROGRAMMAZIONE:",
  "Fornisci codice completo e coerente quando viene richiesto.",
  "Controlla sintassi, variabili, dipendenze e possibili errori.",
  "Quando correggi codice esistente, preservane struttura e compatibilità.",
  "Spiega dove inserire il codice e quali modifiche sono necessarie.",
  "Non dichiarare di aver eseguito o testato codice se non lo hai fatto.",

  "STUDIO:",
  "Spiega gli argomenti in modo progressivo e comprensibile.",
  "Usa esempi concreti quando sono utili.",
  "Adatta le spiegazioni al livello dell'utente.",
  "Rispetta le richieste di risposte brevi o approfondite.",

  "CONTESTO:",
  "Usa i messaggi precedenti quando sono pertinenti.",
  "Non chiedere informazioni già presenti nella conversazione disponibile.",
  "Non fingere di ricordare informazioni a cui non hai accesso.",

  "IMMAGINI:",
  "Quando ricevi immagini, analizza solo ciò che è effettivamente visibile.",
  "Descrivi con attenzione testi, oggetti e dettagli.",
  "Se un testo è illeggibile, dichiaralo.",
  "Non inventare dettagli mancanti.",
  "Se non sei sicuro di un elemento, segnala l'incertezza.",

  "TRASPARENZA:",
  "Non mostrare ragionamenti interni privati.",
  "Fornisci invece passaggi utili e spiegazioni verificabili.",
  "Non dichiarare di aver usato strumenti o cercato sul web se non è realmente avvenuto.",
  "Non promettere risultati che non puoi garantire.",
  "La precisione e l'onestà vengono prima della velocità."
].join(" ");

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Metodo non consentito."
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "Manca GROQ_API_KEY nelle variabili d'ambiente di Vercel."
    });
  }

  try {
    const input = req.body?.messages;
    const requestedMode = ["fast", "smart", "web"].includes(req.body?.mode)
      ? req.body.mode
      : "smart";

    if (
      !Array.isArray(input) ||
      input.length === 0 ||
      input.length > MAX_MESSAGES
    ) {
      return res.status(400).json({
        error: "Conversazione non valida. Riprova con meno messaggi."
      });
    }

    let imageCount = 0;

    const messages = [{
      role: "system",
      content: SYSTEM_PROMPT
    }];

    for (const item of input) {
      if (!item || !["user", "assistant"].includes(item.role)) {
        continue;
      }

      if (typeof item.content === "string") {
        messages.push({
          role: item.role,
          content: item.content.slice(0, MAX_TEXT_LENGTH)
        });

        continue;
      }

      if (item.role !== "user" || !Array.isArray(item.content)) {
        continue;
      }

      const content = [];

      for (const part of item.content) {
        if (
          part?.type === "text" &&
          typeof part.text === "string"
        ) {
          content.push({
            type: "text",
            text: part.text.slice(0, MAX_TEXT_LENGTH)
          });
        } else if (part?.type === "image_url") {
          const url = part.image_url?.url;

          if (!validImageDataUrl(url)) {
            return res.status(400).json({
              error: "Un'immagine non è valida o supera il limite consentito."
            });
          }

          imageCount++;

          if (imageCount > MAX_IMAGES) {
            return res.status(400).json({
              error: `Puoi inviare al massimo ${MAX_IMAGES} immagini per richiesta.`
            });
          }

          content.push({
            type: "image_url",
            image_url: { url }
          });
        }
      }

      if (content.length > 0) {
        messages.push({
          role: item.role,
          content
        });
      }
    }

    if (messages.length < 2) {
      return res.status(400).json({
        error: "Aggiungi un messaggio prima di inviare."
      });
    }

    const containsImages = hasImage(messages);
    const mode = containsImages && requestedMode === "web"
      ? "smart"
      : requestedMode;

    const model = containsImages
  ? "qwen/qwen3.8-27b"
  : mode === "web"
    ? (process.env.GROQ_WEB_MODEL || "openai/gpt-oss-120b")
    : (process.env.GROQ_MODEL || "qwen/qwen3.8-27b");

    const payload = {
      model,
      messages,
      max_completion_tokens: 2500,
      stream: false,
      reasoning_format: "hidden"
    };

    if (mode === "fast") {
      payload.reasoning_effort = "none";
      payload.temperature = 0.7;
    } else {
      payload.reasoning_effort = mode === "web"
        ? "medium"
        : "high";
    }

    if (mode === "web") {
      payload.tools = [{
        type: "browser_search"
      }];

      payload.tool_choice = "required";
      payload.citation_options = "enabled";
    }

    let upstream;
    let result;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      upstream = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      result = await upstream.json().catch(() => ({}));

      if (upstream.ok) {
        break;
      }

      if (upstream.status === 429 && attempt < MAX_RETRIES) {
        await wait(retryDelay(upstream, attempt));
        continue;
      }

      console.error("Groq API error:", {
        status: upstream.status,
        error: result?.error?.message
      });

      if (upstream.status === 429) {
        res.setHeader("Retry-After", "3");

        return res.status(429).json({
          error: "Groq è temporaneamente occupato. Riprova tra poco.",
          retryable: true
        });
      }

      return res.status(502).json({
        error: upstream.status === 400
          ? "Il modello ha rifiutato la richiesta. Controlla la configurazione."
          : "Il servizio AI non ha risposto. Controlla le impostazioni di Vercel."
      });
    }

    const reply = result?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "Il modello non ha restituito una risposta valida."
      });
    }

    return res.status(200).json({
      reply: reply.trim(),
      mode,
      truncated: result?.choices?.[0]?.finish_reason === "length"
    });

  } catch (error) {
    console.error("Veyra API error:", error?.message || error);

    return res.status(500).json({
      error: "Errore temporaneo del server. Riprova."
    });
  }
}
