const MODEL = "openai/gpt-oss-120b";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo non consentito." });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "Manca GROQ_API_KEY nelle variabili d'ambiente di Vercel."
    });
  }

  const query = typeof req.body?.query === "string"
    ? req.body.query.trim().slice(0, 2000)
    : "";

  if (!query) {
    return res.status(400).json({
      error: "Scrivi cosa vuoi cercare."
    });
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: [
                "Sei Veyra AI, un assistente che effettua ricerche sul web.",
                "Cerca informazioni pertinenti e aggiornate alla domanda.",
                "Rispondi nella lingua dell'utente.",
                "Distingui i fatti verificabili dalle ipotesi.",
                "Cita le fonti utilizzate quando sono disponibili.",
                "Non inventare fonti, URL, date o informazioni.",
                "Se le fonti sono insufficienti o discordanti, dichiaralo.",
                "Organizza la risposta in modo chiaro e naturale."
              ].join(" ")
            },
            {
              role: "user",
              content: query
            }
          ],
          tools: [{ type: "browser_search" }],
          tool_choice: "required",
          citation_options: "enabled",
          reasoning_effort: "low",
          max_completion_tokens: 2500,
          temperature: 1,
          stream: false
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Groq browser search error:", {
        status: response.status,
        error: data?.error?.message
      });

      return res.status(502).json({
        error: "La ricerca web non è riuscita. Controlla il modello e riprova."
      });
    }

    const message = data?.choices?.[0]?.message;
    const reply = message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "La ricerca non ha restituito una risposta valida."
      });
    }

    // Estrae le citazioni solo se Groq le restituisce davvero.
    const citations = Array.isArray(message?.citations)
      ? message.citations
      : [];

    const results = citations
      .map((citation) => {
        if (typeof citation === "string") {
          return {
            title: citation,
            url: citation,
            domain: "",
            snippet: ""
          };
        }

        const url = citation?.url || citation?.uri || "";

        if (typeof url !== "string" ||
            !/^https?:\/\//i.test(url)) {
          return null;
        }

        return {
          title: citation.title || citation.name || url,
          url,
          domain: citation.domain || "",
          snippet: citation.snippet || citation.description || ""
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      reply: reply.trim(),
      results
    });

  } catch (error) {
    console.error("Veyra search error:", error?.message || error);

    return res.status(500).json({
      error: "Errore durante la ricerca web."
    });
  }
}
