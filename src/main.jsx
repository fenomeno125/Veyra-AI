import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Plus,
  MessageSquare,
  Send,
  Menu,
  Sparkles,
  Trash2,
  Bot,
  User,
} from "lucide-react";
import "./style.css";

function App() {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeChat = chats.find((chat) => chat.id === activeId);
  const messages = activeChat ? activeChat.messages : [];

  function newChat() {
    setActiveId(null);
    setMessage("");
  }

  function deleteChat(id) {
    setChats((previous) => previous.filter((chat) => chat.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function sendMessage(text = message) {
    const content = text.trim();
    if (!content || loading) return;

    const id = activeId || crypto.randomUUID();
    const oldChat = chats.find((chat) => chat.id === id);

    const userMessage = { role: "user", content };
    const updatedChat = oldChat
      ? {
          ...oldChat,
          messages: [...oldChat.messages, userMessage],
        }
      : {
          id,
          title: content.slice(0, 35),
          messages: [userMessage],
        };

    setChats((previous) =>
      oldChat
        ? previous.map((chat) => (chat.id === id ? updatedChat : chat))
        : [updatedChat, ...previous]
    );

    setActiveId(id);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedChat.messages }),
      });

      if (!response.ok) {
        throw new Error("Server non disponibile");
      }

      const data = await response.json();
      const answer =
        data.reply ||
        data.message ||
        data.content ||
        "Non ho ricevuto una risposta valida.";

      setChats((previous) =>
        previous.map((chat) =>
          chat.id === id
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  { role: "assistant", content: answer },
                ],
              }
            : chat
        )
      );
    } catch (error) {
      setChats((previous) =>
        previous.map((chat) =>
          chat.id === id
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    role: "assistant",
                    content:
                      "Non riesco a collegarmi al server AI. Controlla la configurazione di /api/chat.",
                  },
                ],
              }
            : chat
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="veyra-app">
      {sidebarOpen && (
        <aside className="veyra-sidebar">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <Sparkles size={20} />
            </div>
            <span>Veyra</span>
          </div>

          <button className="new-chat-button" onClick={newChat}>
            <Plus size={18} />
            Nuova chat
          </button>

          <div className="sidebar-section-title">LE TUE CHAT</div>

          <div className="chat-history">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`history-item ${
                  activeId === chat.id ? "active" : ""
                }`}
              >
                <button
                  className="history-select"
                  onClick={() => setActiveId(chat.id)}
                >
                  <MessageSquare size={16} />
                  <span>{chat.title}</span>
                </button>
                <button
                  className="history-delete"
                  onClick={() => deleteChat(chat.id)}
                  aria-label="Elimina chat"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="avatar-small">
              <Sparkles size={16} />
            </div>
            <div>
              <strong>Veyra AI</strong>
              <span>Il tuo assistente</span>
            </div>
          </div>
        </aside>
      )}

      <main className="veyra-main">
        <header className="veyra-header">
          <button
            className="icon-button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Apri o chiudi menu"
          >
            <Menu size={20} />
          </button>
          <div className="header-title">Veyra AI</div>
          <div className="status-label">
            <span className="status-dot" />
            AI Assistant
          </div>
        </header>

        <section className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon">
                <Sparkles size={30} />
              </div>
              <h1>Come posso aiutarti?</h1>
              <p>
                Sono Veyra, il tuo assistente AI. Da dove vuoi iniziare?
              </p>

              <div className="suggestion-grid">
                <button
                  className="suggestion-card"
                  onClick={() => sendMessage("Aiutami a studiare")}
                >
                  <span className="suggestion-icon">✦</span>
                  <strong>Studiare</strong>
                  <span>Spiegazioni semplici e chiare</span>
                </button>

                <button
                  className="suggestion-card"
                  onClick={() => sendMessage("Dammi idee creative")}
                >
                  <span className="suggestion-icon">✧</span>
                  <strong>Creare</strong>
                  <span>Nuove idee e ispirazione</span>
                </button>

                <button
                  className="suggestion-card"
                  onClick={() => sendMessage("Aiutami a scrivere un testo")}
                >
                  <span className="suggestion-icon">✎</span>
                  <strong>Scrivere</strong>
                  <span>Testi e contenuti</span>
                </button>

                <button
                  className="suggestion-card"
                  onClick={() =>
                    sendMessage("Spiegami l'intelligenza artificiale")
                  }
                >
                  <span className="suggestion-icon">⌘</span>
                  <strong>Scoprire</strong>
                  <span>Impara qualcosa di nuovo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((item, index) => (
                <div className="message-row" key={index}>
                  <div
                    className={`message-avatar ${
                      item.role === "user" ? "user-avatar" : "ai-avatar"
                    }`}
                  >
                    {item.role === "user" ? (
                      <User size={18} />
                    ) : (
                      <Bot size={18} />
                    )}
                  </div>
                  <div className="message-body">
                    <div className="message-author">
                      {item.role === "user" ? "Tu" : "Veyra"}
                    </div>
                    <div className="message-content">{item.content}</div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message-row">
                  <div className="message-avatar ai-avatar">
                    <Bot size={18} />
                  </div>
                  <div className="message-body">
                    <div className="message-author">Veyra</div>
                    <div className="message-content">Sto pensando...</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="composer-area">
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Scrivi un messaggio a Veyra..."
              rows={2}
              aria-label="Scrivi un messaggio"
            />

            <div className="composer-controls">
              <span className="composer-hint">
                Invio per inviare · Maiusc + Invio per andare a capo
              </span>
              <button
                type="submit"
                className="send-button"
                disabled={!message.trim() || loading}
                aria-label="Invia messaggio"
              >
                <Send size={17} />
              </button>
            </div>
          </form>
          <p className="composer-disclaimer">
            Veyra AI può commettere errori. Verifica le informazioni importanti.
          </p>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
