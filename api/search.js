export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "TAVILY_API_KEY non configurata su Vercel."
    });
  }

  const query = req.body?.query?.trim();

  if (!query) {
    return res.status(400).json({
      error: "Inserisci cosa vuoi cercare."
    });
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        topic: "general",
        search_depth: "basic",
        include_answer: true,
        max_results: 5
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.detail || data.error || "Errore durante la ricerca web."
      });
    }

    const results = (data.results || []).map(item => ({
      title: item.title || "Risultato senza titolo",
      url: item.url || "",
      domain: item.url ? new URL(item.url).hostname : "",
      snippet: item.content || ""
    }));

    return res.status(200).json({
      reply: data.answer || "Ecco i risultati trovati.",
      answer: data.answer || "",
      results
    });

  } catch (error) {
    console.error("Errore Tavily:", error);

    return res.status(500).json({
      error: "Impossibile completare la ricerca web."
    });
  }
}
