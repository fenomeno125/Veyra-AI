
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Chiave API Groq non configurata su Vercel"
    });
  }

  try {
    const { messages, images = [] } = req.body ?? {};

    if (!Array.isArray(messages) || !Array.isArray(images)) {
      return res.status(400).json({ error: "Richiesta non valida" });
    }

    if (images.length > 3) {
      return res.status(400).json({
        error: "Puoi allegare massimo 3 immagini per richiesta"
      });
    }

    const lastUserIndex = messages
      .map(m => m?.role)
      .lastIndexOf("user");

    if (lastUserIndex < 0) {
      return res.status(400).json({ error: "Scrivi un messaggio" });
    }

    const lastUser = messages[lastUserIndex];

    if (typeof lastUser.content !== "string") {
      return res.status(400).json({ error: "Messaggio non valido" });
    }

    const conversation = messages
      .slice(0, lastUserIndex)
      .filter(m =>
        m &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    const content = [{
      type: "text",
      text: [
        "Sei Veyra, un assistente preciso e utile.",
        "Rispondi direttamente alla domanda dell'utente.",
        "Analizza tutte le immagini allegate.",
        "Non inventare dettagli che non sono visibili.",
        "Se il testo è illeggibile, dillo chiaramente.",
        "Se sono presenti esercizi, leggili e spiegali passo dopo passo.",
        "Se l'utente chiede esempi, forniscili.",
        "",
        "Richiesta: " + (
          lastUser.content ||
          (images.length
            ? "Analizza le immagini allegate."
            : "Come posso aiutarti?")
        )
      ].join("\n")
    }];

    for (const image of images) {
      if (typeof image !== "string") {
        return res.status(400).json({ error: "Immagine non valida" });
      }

      const match = image.match(
        /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i
      );

      if (!match) {
        return res.status(400).json({
          error: "Formato supportato: PNG, JPG o WebP"
        });
      }

      const base64 = match[2].replace(/\s/g, "");
      const bytes = Math.floor(base64.length * 3 / 4);

      if (bytes > 5 * 1024 * 1024) {
        return res.status(413).json({
          error: "Ogni immagine deve essere inferiore a 5 MB"
        });
      }

      content.push({
        type: "image_url",
        image_url: { url: image }
      });
    }

    conversation.push({ role: "user", content });

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
          temperature: 0.3,
          max_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore Groq:", data);
      return res.status(response.status).json({
        error: data?.error?.message || "Errore durante la richiesta a Groq"
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "Il modello non ha restituito una risposta"
      });
    }

    return res.status(200).json({ reply: reply.trim() });
  } catch (error) {
    console.error("Errore API Veyra:", error);
    return res.status(500).json({
      error: "Errore interno del server"
    });
  }
}
