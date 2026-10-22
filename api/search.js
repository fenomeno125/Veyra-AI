
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Metodo non consentito. Usa POST.",
    });
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "TAVILY_API_KEY non configurata sul server.",
    });
  }

  const query =
    typeof req.body?.query === "string"
      ? req.body.query.trim()
      : "";

  if (!query) {
    return res.status(400).json({
      error: "Inserisci una ricerca.",
    });
  }

  if (query.length > 400) {
    return res.status(400).json({
      error: "La ricerca è troppo lunga.",
    });
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        topic: "general",
        max_results: 5,
        include_answer: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Errore Tavily:", response.status);

      return res.status(502).json({
        error: "Il servizio di ricerca web non è riuscito a rispondere.",
      });
    }

    const results = Array.isArray(data.results)
      ? data.results.map((item) => ({
          title: item.title || "Risultato senza titolo",
          url: item.url || "",
          content: item.content || "",
          score:
            typeof item.score === "number" ? item.score : null,
        }))
      : [];

    return res.status(200).json({
      query,
      answer:
        typeof data.answer === "string" ? data.answer : "",
      results,
    });
  } catch (error) {
    console.error("Errore nella ricerca web:", error);

    return res.status(500).json({
      error: "Errore interno durante la ricerca web.",
    });
  }
}
