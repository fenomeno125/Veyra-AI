
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Metodo non consentito."
    });
  }

  const key = process.env.GROQ_API_KEY;
  const model =
    process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

  if (!key) {
    return res.status(503).json({
      error: "Configura GROQ_API_KEY su Vercel."
    });
  }

  try {
    const input = req.body?.messages;

    if (
      !Array.isArray(input) ||
      input.length === 0 ||
      input.length > 30
    ) {
      return res.status(400).json({
        error: "Conversazione non valida."
      });
    }

    let imageCount = 0;

    const messages = [
      {
        role: "system",
        content:
          "Sei Veyra AI, un assistente utile, chiaro e onesto. " +
          "Rispondi nella lingua dell'utente. Puoi analizzare " +
          "le immagini quando sono incluse nel messaggio. " +
          "Descrivi soltanto ciò che puoi osservare e dichiara " +
          "l'incertezza quando un dettaglio non è chiaro. " +
          "Non dichiarare di avere funzioni che non sono state integrate."
      }
    ];

    for (const m of input) {
      if (
        !m ||
        !["user", "assistant"].includes(m.role)
      ) {
        continue;
      }

      if (typeof m.content === "string") {
        messages.push({
          role: m.role,
          content: m.content.slice(0, 12000)
        });
        continue;
      }

      // I messaggi con immagini devono essere dell'utente.
      if (m.role !== "user" || !Array.isArray(m.content)) {
        continue;
      }

      const parts = [];

      for (const part of m.content) {
        if (
          part?.type === "text" &&
          typeof part.text === "string"
        ) {
          parts.push({
            type: "text",
            text: part.text.slice(0, 12000)
          });
        } else if (
          part?.type === "image_url" &&
          typeof part.image_url?.url === "string"
        ) {
          const url = part.image_url.url;

          // Accettiamo immagini Base64 nei formati comuni.
          const validImage =
            /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i.test(url);

          if (!validImage) {
            return res.status(400).json({
              error: "Formato immagine non valido."
            });
          }

          imageCount++;

          if (imageCount > 3) {
            return res.status(400).json({
              error: "Puoi inviare al massimo 3 immagini per richiesta."
            });
          }

          // Limite prudenziale per ogni immagine codificata.
          if (url.length > 5_000_000) {
            return res.status(413).json({
              error: "Immagine troppo grande. Riduci le dimensioni e riprova."
            });
          }

          parts.push({
            type: "image_url",
            image_url: { url }
          });
        }
      }

      if (parts.length > 0) {
        messages.push({
          role: "user",
          content: parts
        });
      }
    }

    if (messages.length === 1) {
      return res.status(400).json({
        error: "Non ci sono messaggi validi da inviare."
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          max_completion_tokens: 1200,
          temperature: 0.7
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Errore Groq:", response.status, data);

      return res.status(
        response.status === 429 ? 429 : 502
      ).json({
        error:
          response.status === 429
            ? "Limite di richieste raggiunto. Riprova più tardi."
            : "Il modello non ha risposto. Controlla il modello configurato su Groq."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    return res.status(200).json({
      reply:
        typeof reply === "string" && reply.length
          ? reply
          : "Nessuna risposta testuale dal modello."
    });
  } catch (error) {
    console.error("Errore server Veyra:", error);

    return res.status(500).json({
      error: "Errore temporaneo del server."
    });
  }
}
