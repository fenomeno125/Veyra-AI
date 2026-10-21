
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo non consentito"
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Chiave API non configurata su Vercel"
    });
  }

  try {
    const { messages } = req.body ?? {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Formato dei messaggi non valido"
      });
    }

    const groqMessages = messages
      .filter(
        (message) =>
          message &&
          ["user", "assistant", "system"].includes(message.role) &&
          typeof message.content === "string"
      )
      .map((message) => ({
        role: message.role,
        content: message.content
      }));

    if (groqMessages.length === 0) {
      return res.status(400).json({
        error: "Scrivi un messaggio prima di inviare"
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
          model: "openai/gpt-oss-120b",
          messages: groqMessages,
          temperature: 0.7,
          max_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore Groq:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Groq non è riuscito a generare una risposta"
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "Il modello non ha restituito una risposta"
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Errore API Veyra:", error);

    return res.status(500).json({
      error: "Errore interno del server"
    });
  }
}
