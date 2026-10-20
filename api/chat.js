export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  if (!key) {
    return res.status(503).json({
      error: "Configura GROQ_API_KEY nelle variabili d'ambiente di Vercel."
    });
  }

  try {
    const input = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];

    if (!input.length || input.length > 30) {
      return res.status(400).json({
        error: "Conversazione non valida."
      });
    }

    const messages = [
      {
        role: "system",
        content: "Sei Veyra AI, un assistente utile, chiaro e onesto. Rispondi nella lingua dell'utente. Aiuta con studio, scrittura, programmazione, idee e pianificazione."
      },
      ...input
        .filter(m =>
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string"
        )
        .map(m => ({
          role: m.role,
          content: m.content.slice(0, 12000)
        }))
    ];

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1200,
          temperature: 0.7
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Groq API error:", response.status, data);

      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 401
          ? "Chiave Groq non valida: controlla GROQ_API_KEY."
          : response.status === 429
          ? "Limite di richieste Groq raggiunto. Riprova più tardi."
          : "Errore del servizio IA. Controlla la configurazione Groq."
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "Nessuna risposta dal modello."
    });
  } catch (error) {
    console.error("Errore server Veyra:", error);

    return res.status(500).json({
      error: "Errore temporaneo del server."
    });
  }
}
