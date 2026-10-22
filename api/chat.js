
const MODEL = "qwen/qwen3.8-27b";
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_HISTORY_MESSAGES = 8;
const MAX_RETRIES = 2;

const SYSTEM_PROMPT = [
  "Sei Veyra, un assistente preciso, utile e naturale.",
  "Rispondi nella lingua usata dall'utente.",
  "Rispondi direttamente alla domanda, con informazioni corrette.",
  "Cerca di concludere ogni risposta con frasi complete.",
  "Non inventare informazioni e dichiara quando non sei sicuro.",
  "Se analizzi immagini, descrivi solo ciò che è effettivamente visibile.",
  "Se un testo nell'immagine è illeggibile, dichiaralo.",
  "Se spieghi un esercizio, procedi passo dopo passo.",
  "Adatta la lunghezza della risposta alla richiesta."
].join(" ");

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

    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) {
      return Math.min(Math.max(date - Date.now(), 0), 10000);
    }
  }

  return Math.min(1500 * (2 ** attempt), 6000);
}

function validateImage(image) {
  if (typeof image !== "string") {
    return { error: "Una delle immagini non è valida." };
  }

  const match = image.match(
    /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i
  );

  if (!match) {
    return { error: "Formato supportato: PNG, JPG o WebP." };
  }

  const base64 = match[2].replace(/\s/g, "");
  const bytes = Math.floor(base64.length * 3 / 4);

  if (bytes > MAX_IMAGE_BYTES) {
    return { error: "Ogni immagine deve essere inferiore a 5 MB." };
  }

  return { value: image };
}

function makeHistory(messages, lastUserIndex) {
  return messages
    .slice(0, lastUserIndex)
    .filter(message =>
      message &&
      ["user", "assistant"].includes(message.role) &&
      typeof message.content === "string" &&
      message.content.trim()
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map(message => ({
      role: message.role,
      content: message.content.slice(-6000)
    }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Metodo non consentito."
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Chiave API Groq non configurata su Vercel."
    });
  }

  try {
    const { messages, images = [] } = req.body ?? {};

    if (!Array.isArray(messages) || !Array.isArray(images)) {
      return res.status(400).json({
        error: "Richiesta non valida."
      });
    }

    if (images.length > MAX_IMAGES) {
      return res.status(400).json({
        error: "Puoi allegare massimo 3 immagini per richiesta."
      });
    }

    const lastUserIndex = messages
      .map(message => message?.role)
      .lastIndexOf("user");

    if (lastUserIndex < 0) {
      return res.status(400).json({
        error: "Scrivi un messaggio prima di inviare."
      });
    }

    const lastUser = messages[lastUserIndex];

    if (typeof lastUser.content !== "string") {
      return res.status(400).json({
        error: "Il messaggio non è valido."
      });
    }

    const cleanImages = [];

    for (const image of images) {
      const result = validateImage(image);

      if (result.error) {
        return res.status(400).json({
          error: result.error
        });
      }

      cleanImages.push(result.value);
    }

    const userText = lastUser.content.trim() ||
      (cleanImages.length
        ? "Analizza le immagini allegate e descrivi ciò che è rilevante."
        : "");

    if (!userText) {
      return res.status(400).json({
        error: "Scrivi un messaggio o allega un'immagine."
      });
    }

    const conversation = [
      { role: "system", content: SYSTEM_PROMPT },
      ...makeHistory(messages, lastUserIndex)
    ];

    const content = [{
      type: "text",
      text: userText
    }];

    for (const image of cleanImages) {
      content.push({
        type: "image_url",
        image_url: { url: image }
      });
    }

    conversation.push({
      role: "user",
      content: cleanImages.length ? content : userText
    });

    let response;
    let data;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: MODEL,
            messages: conversation,
            temperature: 0.3,
            max_tokens: 1600
          })
        }
      );

      data = await response.json().catch(() => ({}));

      if (response.ok) break;

      const isRateLimit = response.status === 429;

      if (isRateLimit && attempt < MAX_RETRIES) {
        await wait(retryDelay(response, attempt));
        continue;
      }

      if (isRateLimit) {
        res.setHeader("Retry-After", "3");

        return res.status(429).json({
          error: "Groq è temporaneamente occupato. Aspetta qualche secondo e riprova.",
          retryable: true
        });
      }

      console.error("Errore Groq:", {
        status: response.status,
        error: data?.error?.message
      });

      return res.status(response.status).json({
        error: data?.error?.message ||
          "Errore durante la richiesta a Groq."
      });
    }

    const choice = data?.choices?.[0];
    const reply = choice?.message?.content;
    const finishReason = choice?.finish_reason;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "Il modello non ha restituito una risposta valida."
      });
    }

    return res.status(200).json({
      reply: reply.trim(),
      truncated: finishReason === "length"
    });
  } catch (error) {
    console.error("Errore API Veyra:", error);

    return res.status(500).json({
      error: "Errore interno del server durante la richiesta."
    });
  }
}
