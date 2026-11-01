
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Metodo non consentito. Usa POST."
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

  if (prompt.length > 2000) {
    return res.status(400).json({
      error: "Descrizione troppo lunga."
    });
  }

  try {
    const response = await fetch(
      "https://stable-diffusion-xl.endpoints.kepler.ai.cloud.ovh.net/api/text2image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/octet-stream"
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: "blurry, low quality, distorted"
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("OVH image error:", response.status, error);

      return res.status(502).json({
        error: "Il servizio immagini non è disponibile. Riprova tra poco."
      });
    }

    const imageBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    const image = imageBuffer.toString("base64");

    return res.status(200).json({
      image: `data:image/jpeg;base64,${image}`,
      reply: "Ecco l'immagine generata da Veyra!"
    });

  } catch (error) {
    console.error("Errore generazione immagini:", error);

    return res.status(500).json({
      error: "Errore durante la generazione dell'immagine."
    });
  }
}
