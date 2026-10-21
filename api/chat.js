
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Chiave API non configurata su Vercel"
    });
  }

  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Messaggi non validi"
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: messages.map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: String(message.content ?? "")
          })),
          temperature: 0.7,
          max_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore Groq:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Errore durante la risposta AI"
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || ""
    });
  } catch (error) {
    console.error("Errore API:", error);

    return res.status(500).json({
      error: "Errore interno del server"
    });
  }
}
