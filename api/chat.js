
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Metodo non consentito"
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Chiave API Groq non configurata su Vercel"
    });
  }

  try {
    const { messages, images = [] } = req.body ?? {};

    if (
      !Array.isArray(messages) ||
      !Array.isArray(images) ||
      images.length > 3
    ) {
      return res.status(400).json({
        error: "Messaggi o immagini non validi. Massimo 3 immagini."
      });
    }

    const lastUserIndex = messages.findLastIndex
      ? messages.findLastIndex(message => message?.role === "user")
      : messages.map(message => message?.role).lastIndexOf("user");

    if (lastUserIndex < 0) {
      return res.status(400).json({
        error: "Scrivi un messaggio prima di inviare"
      });
    }

    const lastUserMessage = messages[lastUserIndex];

    const conversation = messages
      .slice(0, lastUserIndex)
      .filter(message =>
        message &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string"
      )
      .slice(-28)
      .map(message => ({
        role: message.role,
        content: message.content
      }));

    const content = [
      {
        type: "text",
        text: String(
          lastUserMessage.content ||
          (images.length ? "Descrivi e analizza le immagini allegate." : "")
        )
      }
    ];

    for (const image of images) {
      if (typeof image !== "string") {
        return res.status(400).json({
          error: "Formato immagine non valido"
        });
      }

      const match = image.match(
        /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i
      );

      if (!match) {
        return res.status(400).json({
          error: "Formato immagine non supportato. Usa PNG, JPG o WebP."
        });
      }

      const base64 = match[2].replace(/\s/g, "");
      const sizeInBytes = Math.floor(base64.length * 3 / 4);

      if (sizeInBytes > 5 * 1024 * 1024) {
        return res.status(413).json({
          error: "Un'immagine supera il limite di 5 MB."
        });
      }

      content.push({
        type: "image_url",
        image_url: {
          url: image
        }
      });
    }

    conversation.push({
      role: "user",
      content
    });

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: conversation,
          temperature: 0.7,
          max_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore Groq:", data);

      return res.status(response.status).json({
        error: data?.error?.message ||
          "Groq non è riuscito a elaborare la richiesta."
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "Il modello non ha restituito una risposta."
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Errore API Veyra:", error);

    return res.status(500).json({
      error: "Errore interno del server durante la richiesta."
    });
  }
}
