
export default async function handler(req, res) {
  if (req.method !== "POST") {
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

    if (!Array.isArray(messages) || images.length > 4) {
      return res.status(400).json({
        error: "Messaggi o immagini non validi"
      });
    }

    const content = [];

    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!lastUserMessage) {
      return res.status(400).json({
        error: "Scrivi un messaggio prima di inviare"
      });
    }

    content.push({
      type: "text",
      text: String(lastUserMessage.content ?? "Descrivi questa immagine.")
    });

    for (const image of images) {
      if (
        typeof image !== "string" ||
        !/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(image)
      ) {
        return res.status(400).json({
          error: "Formato immagine non supportato"
        });
      }

      content.push({
        type: "image_url",
        image_url: { url: image }
      });
    }

    const previousMessages = messages
      .slice(0, -1)
      .filter((message) =>
        ["user", "assistant"].includes(message.role)
      )
      .map((message) => ({
        role: message.role,
        content: String(message.content ?? "")
      }));

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
          messages: [
            ...previousMessages,
            { role: "user", content }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore Groq:", data);
      return res.status(response.status).json({
        error: data?.error?.message || "Errore durante l'analisi"
      });
    }

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || ""
    });
  } catch (error) {
    console.error("Errore chat:", error);
    return res.status(500).json({
      error: "Errore interno del server"
    });
  }
}
