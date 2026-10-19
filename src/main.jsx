import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUp, Plus, MessageSquare, Search, Settings2, Sparkles, PanelLeftClose,
  PanelLeftOpen, Copy, Check, Globe, Code2, Lightbulb, BookOpen, Image,
  Paperclip, Mic, MoreHorizontal, Bot, UserRound, ChevronDown, Menu, X,
  Zap, ShieldCheck, ExternalLink
} from "lucide-react";
import "./styles.css";

const starters = [
  { icon: Lightbulb, title: "Dammi nuove idee", prompt: "Aiutami a trovare idee originali per un progetto interessante." },
  { icon: Code2, title: "Scrivi del codice", prompt: "Spiegami come potrei creare un piccolo sito web moderno." },
  { icon: BookOpen, title: "Aiutami a studiare", prompt: "Aiutami a capire un argomento difficile in modo semplice." },
  { icon: Globe, title: "Cerca e spiega", prompt: "Come si valuta se un'informazione online è affidabile?" }
];

const initialChats = [
  { id: "welcome", title: "Nuova conversazione", messages: [] }
];

function App() {
  const [chats, setChats] = useState(initialChats);
  const [activeId, setActiveId] = useState("welcome");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [model, setModel] = useState("Nova Smart");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1/chat/completions");
  const [apiModel, setApiModel] = useState("gpt-4o-mini");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const activeChat = chats.find(c => c.id === activeId) || chats[0];
  const messages = activeChat.messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    const k = localStorage.getItem("nova_api_key");
    const e = localStorage.getItem("nova_endpoint");
    const m = localStorage.getItem("nova_model");
    if (k) setApiKey(k);
    if (e) setEndpoint(e);
    if (m) setApiModel(m);
  }, []);

  function notify(text) {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  }

  function newChat() {
    const chat = { id: crypto.randomUUID(), title: "Nuova conversazione", messages: [] };
    setChats(prev => [chat, ...prev]);
    setActiveId(chat.id);
    setInput("");
  }

  function updateChat(id, updater) {
    setChats(prev => prev.map(c => c.id === id ? updater(c) : c));
  }

  async function sendMessage(text = input) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    let chatId = activeId;
    let chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    if (chat.messages.length === 0 && chat.id === "welcome") {
      chatId = crypto.randomUUID();
      chat = { id: chatId, title: prompt.slice(0, 38) + (prompt.length > 38 ? "…" : ""), messages: [] };
      setChats(prev => [chat, ...prev.filter(c => c.id !== "welcome")]);
      setActiveId(chatId);
    } else if (chat.messages.length === 0) {
      updateChat(chatId, c => ({ ...c, title: prompt.slice(0, 38) + (prompt.length > 38 ? "…" : "") }));
    }
    const userMessage = { role: "user", content: prompt };
    const nextMessages = [...chat.messages, userMessage];
    updateChat(chatId, c => ({ ...c, messages: nextMessages }));
    setInput("");
    setBusy(true);

    if (!apiKey.trim()) {
      const demo = {
        role: "assistant",
        content: `Questa è la modalità anteprima di Nova. Per darti risposte generate da un vero modello IA, apri **Impostazioni** e collega un endpoint compatibile con le API chat.\n\nPer ora posso mostrarti come funzionerà l'esperienza. La tua richiesta era:\n\n> ${prompt}\n\nQuando collegherai un modello, Nova risponderà qui in questa conversazione.`
      };
      window.setTimeout(() => {
        updateChat(chatId, c => ({ ...c, messages: [...c.messages, demo] }));
        setBusy(false);
      }, 650);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: apiModel,
          messages: [
            { role: "system", content: "Sei Nova, un assistente IA utile, onesto, chiaro e creativo. Rispondi nella lingua dell'utente. Se non sai qualcosa, dillo. Non affermare di aver cercato sul web se non hai uno strumento di ricerca." },
          ...nextMessages.map(m => ({ role: m.role, content: m.content }))
          ],
          temperature: 0.7
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || `Errore API (${response.status})`);
      const answer = data?.choices?.[0]?.message?.content;
      if (!answer) throw new Error("Il modello non ha restituito una risposta.");
      updateChat(chatId, c => ({ ...c, messages: [...c.messages, { role: "assistant", content: answer }] }));
    } catch (err) {
      updateChat(chatId, c => ({ ...c, messages: [...c.messages, {
        role: "assistant",
        content: `Non sono riuscita a completare la richiesta. ${err.message}\n\nControlla endpoint, modello e chiave API nelle impostazioni.`
      }] }));
    } finally {
      setBusy(false);
    }
  }

  function saveSettings() {
    localStorage.setItem("nova_api_key", apiKey);
    localStorage.setItem("nova_endpoint", endpoint);
    localStorage.setItem("nova_model", apiModel);
    setSaved(true);
    setSettingsOpen(false);
    window.setTimeout(() => setSaved(false), 2000);
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text).then(() => notify("Risposta copiata")).catch(() => notify("Copia non disponibile"));
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={19} strokeWidth={2.3}/></div>
          {sidebarOpen && <span className="brand-name">nova<span>ai</span></span>}
          <button className="icon-btn sidebar-toggle" title="Nascondi barra" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={18}/></button>
        </div>
        {sidebarOpen && <>
          <button className="new-chat" onClick={newChat}><Plus size={17}/> Nuova chat <span>⌘ K</span></button>
          <div className="side-search"><Search size={15}/><span>Cerca conversazioni</span></div>
          <div className="side-label">RECENTI</div>
          <nav className="chat-list">
            {chats.map(chat => (
              <button key={chat.id} className={`chat-link ${chat.id === activeId ? "active" : ""}`} onClick={() => setActiveId(chat.id)}>
                <MessageSquare size={15}/><span>{chat.title}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-spacer"/>
          <div className="upgrade-card">
            <div className="upgrade-icon"><Zap size={16}/></div>
            <div><strong>Nova, in evoluzione</strong><p>Un assistente, tante possibilità.</p></div>
          </div>
          <button className="profile-row" onClick={() => setSettingsOpen(true)}>
            <div className="avatar-small">N</div><div className="profile-copy"><strong>Il mio Nova</strong><span>{apiKey ? "Modello collegato" : "Modalità anteprima"}</span></div><MoreHorizontal size={17}/>
          </button>
        </>}
        {!sidebarOpen && <button className="icon-btn reopen" title="Mostra barra" onClick={() => setSidebarOpen(true)}><PanelLeftOpen size={19}/></button>}
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="top-left">
            {!sidebarOpen && <button className="icon-btn" onClick={() => setSidebarOpen(true)}><PanelLeftOpen size={19}/></button>}
            <button className="model-picker" onClick={() => setSettingsOpen(true)}>
              <span className="model-dot"></span>{model}<ChevronDown size={15}/>
            </button>
          </div>
          <div className="top-actions">
            <div className="privacy-note"><ShieldCheck size={14}/> Le tue conversazioni</div>
            <button className="icon-btn settings-btn" title="Impostazioni" onClick={() => setSettingsOpen(true)}><Settings2 size={18}/></button>
          </div>
        </header>

        <section className={`conversation ${messages.length ? "has-messages" : ""}`}>
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-orb"><div className="orb-core"><Sparkles size={29}/></div><span className="orb-ring ring-one"/><span className="orb-ring ring-two"/></div>
              <div className="eyebrow"><span className="eyebrow-line"/> IL TUO NUOVO SPAZIO INTELLIGENTE <span className="eyebrow-line"/></div>
              <h1>Le grandi idee<br/><span>iniziano qui.</span></h1>
              <p className="welcome-subtitle">Ciao, sono Nova. Sono qui per aiutarti a esplorare idee,<br className="desktop-break"/> risolvere problemi e dare forma a quello che immagini.</p>
              <div className="suggestion-grid">
                {starters.map(({icon: Icon, title, prompt}) => (
                  <button className="suggestion" key={title} onClick={() => sendMessage(prompt)}>
                    <span className="suggestion-icon"><Icon size={18}/></span><span>{title}</span><ArrowUp className="suggestion-arrow" size={15}/>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-wrap">
              <div className="messages">
                {messages.map((msg, i) => (
                  <article className={`message ${msg.role}`} key={i}>
                    {msg.role === "assistant" ? <div className="message-avatar"><Sparkles size={16}/></div> : <div className="user-avatar"><UserRound size={16}/></div>}
                    <div className="message-body">
                      <div className="message-name">{msg.role === "assistant" ? "Nova" : "Tu"}</div>
                      <div className="message-text">{renderText(msg.content)}</div>
                      {msg.role === "assistant" && <div className="message-tools"><button onClick={() => copyText(msg.content)}><Copy size={14}/> Copia</button><button onClick={() => notify("Grazie, feedback registrato in questa sessione")}><Sparkles size={14}/> Utile</button></div>}
                    </div>
                  </article>
                ))}
                {busy && <article className="message assistant"><div className="message-avatar"><Sparkles size={16}/></div><div className="message-body"><div className="message-name">Nova</div><div className="typing"><i/><i/><i/></div></div></article>}
                <div ref={bottomRef}/>
              </div>
            </div>
          )}
        </section>

        <footer className="composer-area">
          <div className="composer">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Chiedi a Nova qualsiasi cosa..."
              rows={1}
              aria-label="Scrivi un messaggio"
            />
            <div className="composer-bottom">
              <div className="composer-tools">
                <button className="tool-btn" title="Allegati non disponibili nella demo" onClick={() => notify("Gli allegati arriveranno in una versione successiva")}><Paperclip size={17}/><span>Allega</span></button>
                <span className="tool-divider"/>
                <button className="tool-btn" onClick={() => notify("La ricerca web va collegata a uno strumento esterno")}><Globe size={16}/><span>Ricerca</span><span className="soon-dot"/></button>
              </div>
              <div className="send-side"><span className="enter-hint">Invio ↵</span><button className="send-btn" disabled={!input.trim() || busy} onClick={() => sendMessage()} aria-label="Invia messaggio"><ArrowUp size={19}/></button></div>
            </div>
          </div>
          <p className="disclaimer">Nova può commettere errori. Verifica le informazioni importanti.</p>
        </footer>
      </main>

      {settingsOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
        <section className="settings-modal">
          <div className="modal-header"><div><div className="modal-kicker">PERSONALIZZA</div><h2>Impostazioni Nova</h2></div><button className="icon-btn" onClick={() => setSettingsOpen(false)}><X size={19}/></button></div>
          <p className="modal-intro">Collega un modello compatibile per attivare le risposte reali. La chiave viene salvata solo nel browser di questo dispositivo; per un'app pubblica, spostala su un server sicuro.</p>
          <label>Endpoint API compatibile<input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://.../v1/chat/completions"/></label>
          <label>Nome modello<input value={apiModel} onChange={e => setApiModel(e.target.value)} placeholder="gpt-4o-mini"/></label>
          <label>Chiave API<input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Incolla la tua chiave API"/></label>
          <div className="security-note"><ShieldCheck size={17}/><span>Non inserire chiavi su un dispositivo condiviso. Le chiamate dal browser non sono adatte a un servizio pubblico.</span></div>
          <div className="modal-actions"><button className="cancel-btn" onClick={() => setSettingsOpen(false)}>Annulla</button><button className="save-btn" onClick={saveSettings}>{saved ? <><Check size={16}/> Salvato</> : "Salva impostazioni"}</button></div>
          <div className="modal-foot"><ExternalLink size={13}/> Per renderla pubblica, servirà un backend sicuro e un hosting.</div>
        </section>
      </div>}
      {toast && <div className="toast"><Check size={15}/>{toast}</div>}
    </div>
  );
}

function renderText(text) {
  // Lightweight safe renderer: supports paragraphs, bold and quote lines.
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={j}>{part.slice(2, -2)}</strong>
        : part
    );
    if (line.startsWith("> ")) return <blockquote key={i}>{line.slice(2)}</blockquote>;
    return <React.Fragment key={i}>{i > 0 && <br/>}{parts}</React.Fragment>;
  });
}

createRoot(document.getElementById("root")).render(<App />);
