export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo non consentito. Usa POST."
    });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Chiave API non configurata su Vercel."
      });
    }

    const { messages = [] } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Il formato dei messaggi non è valido."
      });
    }

    const conversation = messages
      .filter(
        (message) =>
          message &&
          ["user", "assistant"].includes(message.role) &&
          typeof message.content === "string"
      )
      .slice(-30)
      .map((message) => ({
        role: message.role,
        content: message.content
      }));

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "Sei Veyra AI, un assistente intelligente, utile e amichevole. Rispondi in italiano quando l'utente scrive in italiano. Spiega le cose chiaramente e aiuta con studio, scrittura, programmazione, ragionamento e domande generali."
            },
            ...conversation
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data.error?.message ||
          "Si è verificato un errore durante la richiesta al modello AI."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    return res.status(200).json({
      reply: reply || "Non ho ricevuto una risposta."
    });
  } catch (error) {
    console.error("Errore Veyra AI:", error);

    return res.status(500).json({
      error: "Errore interno del server."
    });
  }
}
