
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo non consentito"
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Aggiungi OPENAI_API_KEY nelle variabili di Vercel"
    });
  }

  try {
    const { prompt } = req.body ?? {};

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Scrivi una descrizione dell'immagine"
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-image-2.5-flare",
          prompt: prompt.trim(),
          size: "1024x1024",
          quality: "medium",
          n: 1
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore generazione:", data);
      return res.status(response.status).json({
        error: data?.error?.message || "Impossibile creare l'immagine"
      });
    }

    const image = data?.data?.[0]?.b64_json;

    if (!image) {
      return res.status(502).json({
        error: "Il servizio non ha restituito un'immagine"
      });
    }

    return res.status(200).json({
      image: `data:image/png;base64,${image}`
    });
  } catch (error) {
    console.error("Errore generazione immagini:", error);
    return res.status(500).json({
      error: "Errore interno durante la generazione"
    });
  }
}
