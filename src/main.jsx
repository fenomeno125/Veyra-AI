async function send() {
  const text = input.trim();
  if (!text || loading) return;

  const next = [
    ...messages,
    { role: "user", content: text }
  ];

  setMessages(next);
  setInput("");
  setLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: next.slice(-30)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Errore nella risposta AI.");
    }

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: data.reply || "Non ho ricevuto una risposta."
      }
    ]);
  } catch (error) {
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: `Errore: ${error.message}`
      }
    ]);
  } finally {
    setLoading(false);
  }
}
