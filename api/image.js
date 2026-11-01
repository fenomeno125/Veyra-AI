export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Metodo non consentito. Usa POST."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "OPENAI_API_KEY non configurata su Vercel."
    });
  }

  const prompt =
    typeof req.body?.prompt === "string"
      ? req.body.prompt.trim()
      : "";

  if (!prompt) {
    return res.status(400).json({
      error: "Scrivi una descrizione dell'immagine."
    });
  }

  if (prompt.length > 4000) {
    return res.status(400).json({
      error: "Descrizione troppo lunga."
    });
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          size: "1024x1024",
          quality: "medium",
          n: 1
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore immagini:", data?.error);

      return res.status(502).json({
        error: data?.error?.message ||
          "Non è stato possibile generare l'immagine."
      });
    }

    const image = data?.data?.[0]?.b64_json;

    if (!image) {
      return res.status(502).json({
        error: "Il servizio non ha restituito un'immagine."
      });
    }

    return res.status(200).json({
      image: `data:image/png;base64,${image}`,
      reply: "Ecco l'immagine generata."
    });

  } catch (error) {
    console.error("Errore generazione immagini:", error);

    return res.status(500).json({
      error: "Errore interno durante la generazione."
    });
  }
}
