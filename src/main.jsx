import React, { useEffect, useRef, useState } from "react";
import {
  Menu,
  Plus,
  Send,
  MessageSquare,
  Trash2,
  Paperclip,
  Image,
  Globe,
  GraduationCap,
  Code2,
  Eye,
  X,
  Sparkles,
  PanelLeftClose,
  Bot,
  User,
  LoaderCircle,
  FileText,
  SquarePen,
  AlertCircle,
} from "lucide-react";
import "./style.css";

const STORAGE_KEY = "veyra_conversations_v1";

const tools = [
  { name: "Cerca sul web", description: "Ricerca informazioni online", icon: Globe },
  { name: "Crea un'immagine", description: "Generazione di immagini", icon: Image },
  { name: "Analizza un'immagine", description: "Comprensione delle immagini", icon: Eye },
  { name: "Allega documenti", description: "Aggiungi file alla conversazione", icon: Paperclip },
  { name: "Studia e impara", description: "Spiegazioni e aiuto nello studio", icon: GraduationCap },
  { name: "Aiuto con il codice", description: "Scrittura e spiegazione del codice", icon: Code2 },
];

function createConversation() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "Nuova chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

function readSavedConversations() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [conversations, setConversations] = useState(readSavedConversations);
  const [activeId, setActiveId] = useState(
    () => readSavedConversations()[0]?.id || null
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [selectedTool, setSelectedTool] = useState("");
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) || null;

  const messages = activeConversation?.messages || [];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      setNotice("Impossibile salvare tutta la cronologia nel browser.");
    }
  }, [conversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function updateConversation(id, updater) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id
          ? { ...updater(conversation), updatedAt: Date.now() }
          : conversation
      )
    );
  }

  function newChat() {
    const conversation = createConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
    setAttachments([]);
    setSelectedTool("");
    setNotice("");
    setToolsOpen(false);
  }

  function selectChat(id) {
    setActiveId(id);
    setInput("");
    setAttachments([]);
    setNotice("");
    setSelectedTool("");
  }

  function deleteChat(id) {
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    setConversations(remaining);

    if (activeId === id) {
      if (remaining.length) {
        setActiveId(remaining[0].id);
      } else {
        const fresh = createConversation();
        setConversations([fresh]);
        setActiveId(fresh.id);
      }
    }
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const accepted = files.filter((file) => {
      const valid =
        file.type.startsWith("image/") ||
        file.type === "application/pdf" ||
        file.type.startsWith("text/") ||
        /\.(txt|md|csv|json)$/i.test(file.name);

      if (!valid) {
        setNotice(`Il formato di "${file.name}" non è supportato in questa anteprima.`);
      }
      return valid;
    });

    const tooLarge = accepted.filter((file) => file.size > 10 * 1024 * 1024);
    const ready = accepted.filter((file) => file.size <= 10 * 1024 * 1024);

    if (tooLarge.length) {
      setNotice("Alcuni file superano il limite di 10 MB e non sono stati aggiunti.");
    }

    setAttachments((current) => [
      ...current,
      ...ready.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random()}`,
        file,
        name: file.name,
        type: file.type,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);

    if (ready.length) setNotice("");
  }

  function removeAttachment(id) {
    setAttachments((current) => {
      const item = current.find((attachment) => attachment.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return current.filter((attachment) => attachment.id !== id);
    });
  }

  function chooseTool(toolName) {
    setToolsOpen(false);
    setSelectedTool(toolName);

    if (toolName === "Allega documenti" || toolName === "Analizza un'immagine") {
      fileInputRef.current?.click();
      return;
    }

    const prompts = {
      "Cerca sul web": "Cerca sul web: ",
      "Crea un'immagine": "Aiutami a creare un'immagine: ",
      "Studia e impara": "Aiutami a studiare questo argomento: ",
      "Aiuto con il codice": "Aiutami con questo codice: ",
    };

    setInput((current) => current || prompts[toolName] || "");
    setNotice(
      toolName === "Cerca sul web"
        ? "La ricerca web richiede un servizio di ricerca collegato al backend."
        : toolName === "Crea un'immagine"
          ? "La generazione di immagini richiede un servizio dedicato."
          : ""
    );

    textareaRef.current?.focus();
  }

  async function send(event) {
    event?.preventDefault();

    const text = input.trim();
    if ((!text && !attachments.length) || loading) return;

    if (!activeId) {
      const fresh = createConversation();
      setConversations((current) => [fresh, ...current]);
      setActiveId(fresh.id);
      return;
    }

    let attachmentText = "";
    if (attachments.length) {
      attachmentText =
        "\n\nFile allegati (solo nomi, contenuti non trasmessi): " +
        attachments.map((item) => item.name).join(", ");
    }

    const userMessage = {
      role: "user",
      content: (text || "Ho allegato dei file.") + attachmentText,
    };

    const nextMessages = [...messages, userMessage];

    updateConversation(activeId, (conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0
          ? (text || attachments[0]?.name || "Nuova chat").slice(0, 45)
          : conversation.title,
      messages: nextMessages,
    }));

    const conversationId = activeId;
    setInput("");
    setAttachments([]);
    setNotice("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-30).map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Il server ha restituito una risposta non valida.");
      }

      if (!response.ok) {
        throw new Error(data.error || `Errore del server (${response.status}).`);
      }

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("Il server non ha restituito una risposta testuale.");
      }

      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          { role: "assistant", content: data.reply },
        ],
      }));
    } catch (error) {
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          {
            role: "assistant",
            content: `Non sono riuscito a rispondere. ${error.message}\n\nControlla che il backend /api/chat sia configurato e che il progetto sia pubblicato su Vercel.`,
            isError: true,
          },
        ],
      }));
    } finally {
      setLoading(false);
      setSelectedTool("");
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="veyra-app">
      {sidebarOpen && (
        <aside className="veyra-sidebar">
          <div className="veyra-brand">
            <div className="veyra-logo"><Sparkles size={21} /></div>
            <span>Veyra AI</span>
            <button
              className="icon-button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Chiudi barra laterale"
            >
              <PanelLeftClose size={19} />
            </button>
          </div>

          <button className="new-chat-button" onClick={newChat}>
            <SquarePen size={18} />
            <span>Nuova chat</span>
            <Plus size={17} />
          </button>

          <div className="sidebar-section-label">Le tue conversazioni</div>
          <div className="conversation-list">
            {conversations
              .slice()
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((conversation) => (
                <div
                  key={conversation.id}
                  className={`conversation-item ${
                    conversation.id === activeId ? "active" : ""
                  }`}
                >
                  <button
                    className="conversation-select"
                    onClick={() => selectChat(conversation.id)}
                    title={conversation.title}
                  >
                    <MessageSquare size={16} />
                    <span>{conversation.title || "Nuova chat"}</span>
                  </button>
                  <button
                    className="delete-chat-button"
                    onClick={() => deleteChat(conversation.id)}
                    aria-label="Elimina conversazione"
                    title="Elimina"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
          </div>

          <div className="sidebar-footer">
            <div className="veyra-avatar"><Sparkles size={17} /></div>
            <div>
              <strong>Veyra AI</strong>
              <span>Il tuo assistente AI</span>
            </div>
          </div>
        </aside>
      )}

      <main className="veyra-main">
        <header className="veyra-header">
          <div className="header-left">
            {!sidebarOpen && (
              <button
                className="icon-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Apri barra laterale"
              >
                <Menu size={21} />
              </button>
            )}
            <div className="header-title">
              <Sparkles size={18} />
              <strong>Veyra AI</strong>
            </div>
          </div>
          <span className="header-status">
            <span className="status-dot" />
            Assistente AI
          </span>
        </header>

        <section className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon"><Sparkles size={30} /></div>
              <h1>Come posso aiutarti?</h1>
              <p>Fai una domanda, impara qualcosa o sviluppa una nuova idea.</p>

              <div className="suggestion-grid">
                <button onClick={() => setInput("Spiegami un argomento difficile in modo semplice.")}>
                  <GraduationCap size={19} />
                  <strong>Studia qualcosa</strong>
                  <span>Spiegazioni chiare e guidate</span>
                </button>
                <button onClick={() => setInput("Aiutami a scrivere un programma e spiegami il codice.")}>
                  <Code2 size={19} />
                  <strong>Scrivi del codice</strong>
                  <span>Programmazione e debug</span>
                </button>
                <button onClick={() => setInput("Aiutami a sviluppare un'idea creativa.")}>
                  <Sparkles size={19} />
                  <strong>Esplora un'idea</strong>
                  <span>Creatività e brainstorming</span>
                </button>
                <button onClick={() => setInput("Riassumi e organizza queste informazioni: ")}>
                  <FileText size={19} />
                  <strong>Riassumi un testo</strong>
                  <span>Organizza le informazioni</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message, index) => (
                <article
                  className={`message-row ${message.role === "user" ? "user-message" : "assistant-message"}`}
                  key={`${activeId}-${index}`}
                >
                  <div className="message-avatar">
                    {message.role === "user" ? <User size={18} /> : <Bot size={19} />}
                  </div>
                  <div className="message-body">
                    <div className="message-author">
                      {message.role === "user" ? "Tu" : "Veyra AI"}
                    </div>
                    <div className={`message-content ${message.isError ? "message-error" : ""}`}>
                      {message.isError && <AlertCircle size={17} />}
                      <span>{message.content}</span>
                    </div>
                  </div>
                </article>
              ))}
              {loading && (
                <div className="message-row assistant-message">
                  <div className="message-avatar"><Bot size={19} /></div>
                  <div className="message-body">
                    <div className="message-author">Veyra AI</div>
                    <div className="typing-indicator">
                      <LoaderCircle size={17} className="spin" />
                      Sto preparando una risposta...
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <footer className="composer-area">
          {notice && (
            <div className="notice-message">
              <AlertCircle size={16} />
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Chiudi avviso">
                <X size={15} />
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="attachment-list">
              {attachments.map((attachment) => (
                <div className="attachment-chip" key={attachment.id}>
                  {attachment.preview ? (
                    <img src={attachment.preview} alt="" />
                  ) : (
                    <FileText size={19} />
                  )}
                  <span>{attachment.name}</span>
                  <button
                    onClick={() => removeAttachment(attachment.id)}
                    aria-label={`Rimuovi ${attachment.name}`}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form className="composer" onSubmit={send}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio a Veyra..."
              rows={1}
              aria-label="Scrivi un messaggio"
            />

            <div className="composer-controls">
              <div className="composer-left">
                <div className="tools-wrapper">
                  <button
                    type="button"
                    className={`tool-plus-button ${toolsOpen ? "selected" : ""}`}
                    onClick={() => setToolsOpen((open) => !open)}
                    aria-label="Apri strumenti"
                    title="Strumenti"
                  >
                    <Plus size={20} />
                  </button>

                  {toolsOpen && (
                    <div className="tools-menu">
                      <div className="tools-menu-title">Strumenti</div>
                      {tools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                          <button
                            type="button"
                            className="tool-menu-item"
                            key={tool.name}
                            onClick={() => chooseTool(tool.name)}
                          >
                            <Icon size={18} />
                            <span>
                              <strong>{tool.name}</strong>
                              <small>{tool.description}</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="attach-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={16} />
                  <span>Allega</span>
                </button>
                {selectedTool && (
                  <span className="selected-tool-label">{selectedTool}</span>
                )}
              </div>

              <button
                type="submit"
                className="send-button"
                disabled={loading || (!input.trim() && attachments.length === 0)}
                aria-label="Invia messaggio"
                title="Invia"
              >
                {loading ? <LoaderCircle size={18} className="spin" /> : <Send size={18} />}
              </button>
            </div>
          </form>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.md,.csv,.json"
            hidden
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />

          <p className="composer-disclaimer">
            Veyra AI può commettere errori. Verifica le informazioni importanti.
          </p>
        </footer>
      </main>
    </div>
  );
}
