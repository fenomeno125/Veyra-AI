
const MODEL = "openai/gpt-oss-120b";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Metodo non consentito."
    });
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
                "Sei Veyra AI, un assistente specializzato nella ricerca web.",
                "REGOLA FONDAMENTALE: rispondi esclusivamente nella stessa lingua usata dall'utente nella domanda.",
                "Se l'utente scrive in italiano, rispondi in italiano. Se scrive in inglese, rispondi in inglese.",
                "Non cambiare lingua anche se le pagine consultate sono in un'altra lingua.",
                "Cerca informazioni aggiornate e pertinenti alla richiesta.",
                "Privilegia fonti ufficiali, documenti originali e fonti primarie.",
                "Non usare fonti non pertinenti solo per aumentare il numero dei risultati.",
                "Usa al massimo cinque fonti realmente utili.",
                "Quando possibile, inserisci nel testo link Markdown diretti alle pagine specifiche consultate.",
                "Non usare collegamenti generici alla homepage o a una sezione di un sito quando esiste la pagina specifica.",
                "Non inventare URL, titoli, date, citazioni o informazioni.",
                "Se non trovi una fonte affidabile, dichiaralo chiaramente.",
                "Scrivi risposte concise, chiare e ben organizzate.",
                "Riassumi le fonti con parole tue e non copiare interi paragrafi.",
                "Non mostrare estratti grezzi, righe L0/L1, metadati o contenuti tecnici degli strumenti.",
                "Non mostrare codice, JSON o informazioni interne della ricerca.",
                "Evita introduzioni lunghe, ripetizioni e tabelle non necessarie."
              ].join(" ")
            },
            {
              role: "user",
              content: query
            }
          ],
          tools: [{ type: "browser_search" }],
          tool_choice: "required",
          reasoning_effort: "low",
          max_completion_tokens: 1800,
          temperature: 1,
          stream: false
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Groq browser search error:", {
        status: response.status,
        error: data?.error
      });

      return res.status(502).json({
        error: data?.error?.message || "Errore Groq sconosciuto.",
        status: response.status
      });
    }

    const message = data?.choices?.[0]?.message;
    const reply = message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "La ricerca non ha restituito una risposta valida."
      });
    }

    const executedTools = Array.isArray(message?.executed_tools)
      ? message.executed_tools
      : [];

    const results = [];

    for (const tool of executedTools) {
      const browserResults = Array.isArray(tool?.browser_results)
        ? tool.browser_results
        : [];

      const searchResults = Array.isArray(tool?.search_results?.results)
        ? tool.search_results.results
        : [];

      for (const item of [...browserResults, ...searchResults]) {
        const url = item?.url;

        if (
          typeof url !== "string" ||
          !/^https?:\/\//i.test(url)
        ) {
          continue;
        }

        let domain = "";

        try {
          domain = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          continue;
        }

        results.push({
          title: item?.title || domain,
          url,
          domain,
          snippet: ""
        });
      }
    }

    const uniqueResults = [
      ...new Map(
        results.map(item => [item.url, item])
      ).values()
    ].slice(0, 5);

    return res.status(200).json({
      reply: reply.trim(),
      results: uniqueResults
    });

  } catch (error) {
    console.error("Veyra search error:", error?.message || error);

    return res.status(500).json({
      error: "Errore durante la ricerca web."
    });
  }
}
