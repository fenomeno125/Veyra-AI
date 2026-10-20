import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Sparkles, Plus, Settings2, ArrowUp, X, ImagePlus,
  Images, FileText, Globe, Code2, GraduationCap,
  Search, Paperclip, WandSparkles, LoaderCircle
} from 'lucide-react';
import './style.css';

const tools = [
  { id: 'image', label: 'Crea un’immagine', desc: 'Genera immagini da una descrizione', icon: ImagePlus },
  { id: 'vision', label: 'Analizza un’immagine', desc: 'Carica una foto da esaminare', icon: Images },
  { id: 'files', label: 'Allega documenti', desc: 'Seleziona immagini e documenti', icon: Paperclip },
  { id: 'web', label: 'Cerca sul web', desc: 'Ricerca online con fonti', icon: Globe },
  { id: 'study', label: 'Studia e impara', desc: 'Spiegazioni ed esercizi', icon: GraduationCap },
  { id: 'code', label: 'Aiuto con il codice', desc: 'Scrivi e correggi programmi', icon: Code2 }
];

function App() {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  const imageRef = useRef(null);

  function addFiles(fileList) {
    const selected = Array.from(fileList || []);
    const allowed = selected.filter(file =>
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.type.startsWith('text/')
    );
    const rejected = selected.length - allowed.length;

    const available = Math.max(0, 5 - attachments.length);
    const accepted = allowed.slice(0, available).map(file => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    setAttachments(old => [...old, ...accepted]);

    if (rejected || allowed.length > available) {
      setNotice('Puoi allegare fino a 5 file. Sono supportate immagini, PDF e file di testo.');
    } else if (accepted.length) {
      setNotice('File selezionati. In questa versione gli allegati non vengono ancora analizzati dall’IA.');
    }

    if (fileRef.current) fileRef.current.value = '';
    if (imageRef.current) imageRef.current.value = '';
  }

  function removeAttachment(id) {
    setAttachments(old => {
      const item = old.find(file => file.id === id);
      if (item?.url) URL.revokeObjectURL(item.url);
      return old.filter(file => file.id !== id);
    });
  }

  function clearAttachments() {
    attachments.forEach(item => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setAttachments([]);
  }

  async function send(value = text) {
    const prompt = value.trim();
    if ((!prompt && !attachments.length) || busy) return;

    if (attachments.length) {
      setNotice('Gli allegati sono selezionati, ma il backend attuale invia soltanto testo. Rimuovi gli allegati oppure invia un messaggio testuale.');
      if (!prompt) return;
    }

    const next = [...msgs, { role: 'user', content: prompt }];
    setMsgs(next);
    setText('');
    setBusy(true);
    setShowTools(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-30) })
      });

      const raw = await response.text();
      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error('Il server ha restituito una risposta non valida. Controlla i log di Vercel.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Errore del server.');
      }

      setMsgs(current => [...current, {
        role: 'assistant',
        content: data.reply || 'Non ho ricevuto una risposta.'
      }]);
    } catch (error) {
      setMsgs(current => [...current, {
        role: 'assistant',
        content: 'Veyra non riesce a rispondere: ' + error.message
      }]);
    } finally {
      setBusy(false);
    }
  }

  function chooseTool(id) {
    setShowTools(false);

    if (id === 'files') {
      fileRef.current?.click();
      return;
    }

    if (id === 'vision') {
      imageRef.current?.click();
      return;
    }

    const messages = {
      image: 'La generazione di immagini non è ancora collegata. Serve integrare un servizio di generazione immagini.',
      web: 'La ricerca web non è ancora collegata. Serve integrare un servizio di ricerca online.',
      study: 'Aiutami a studiare e a capire un argomento con esempi semplici.',
      code: 'Aiutami a scrivere o correggere del codice.'
    };

    if (id === 'study' || id === 'code') {
      setText(messages[id]);
      return;
    }

    setNotice(messages[id] || 'Questo strumento non è ancora disponibile.');
  }

  const prompts = [
    ['📚', 'Studiare', 'Spiegami un argomento difficile con esempi semplici.'],
    ['✍️', 'Scrivere', 'Aiutami a scrivere un testo chiaro e coinvolgente.'],
    ['⌨️', 'Programmare', 'Aiutami a risolvere un problema di programmazione.'],
    ['💡', 'Idee', 'Dammi 10 idee originali per un progetto digitale.']
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="brand"><Sparkles /> Veyra <span>AI</span></h2>

        <button className="new-chat" onClick={() => {
          setMsgs([]);
          setText('');
          clearAttachments();
          setNotice('');
        }}>
          <Plus size={18} /> Nuova chat
        </button>

        <p className="eyebrow">IL TUO ASSISTENTE</p>
        <div className="sidebar-note">
          Un unico spazio per idee, studio, scrittura e programmazione.
        </div>

        <div className="sidebar-bottom">
          <button className="settings-button" onClick={() => setShowSettings(true)}>
            <Settings2 size={18} /> Impostazioni
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="status-dot" />
          <b>Veyra AI</b>
          <span className="topbar-label">Assistente</span>
          <button className="icon-button top-settings" onClick={() => setShowSettings(true)} aria-label="Impostazioni">
            <Settings2 size={19} />
          </button>
        </header>

        <section className="conversation">
          {!msgs.length ? (
            <div className="welcome">
              <div className="hero"><Sparkles size={30} /></div>
              <small className="eyebrow">IL TUO SPAZIO PER LE IDEE</small>
              <h1>Ciao, sono Veyra<span>.</span></h1>
              <p>Su cosa vuoi lavorare oggi?</p>

              <div className="cards">
                {prompts.map(([icon, title, prompt]) => (
                  <button key={title} onClick={() => send(prompt)}>
                    <strong>{icon} {title}</strong>
                    <small>{prompt}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {msgs.map((message, index) => (
                <article className={`message ${message.role}`} key={index}>
                  <b>{message.role === 'assistant' ? '✦ Veyra' : 'Tu'}</b>
                  <p>{message.content}</p>
                </article>
              ))}
              {busy && (
                <div className="thinking"><LoaderCircle className="spin" size={17} /> Veyra sta pensando…</div>
              )}
            </div>
          )}
        </section>

        <div className="composer-area">
          {notice && (
            <div className="notice">
              <span>{notice}</span>
              <button className="icon-button" onClick={() => setNotice('')} aria-label="Chiudi avviso"><X size={16} /></button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="attachments">
              {attachments.map(item => (
                <div className="attachment" key={item.id}>
                  {item.url
                    ? <img src={item.url} alt={item.file.name} />
                    : <FileText size={24} />}
                  <span title={item.file.name}>{item.file.name}</span>
                  <button className="remove-file" onClick={() => removeAttachment(item.id)} aria-label={`Rimuovi ${item.file.name}`}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form className="composer" onSubmit={event => {
            event.preventDefault();
            send();
          }}>
            <div className="plus-wrap">
              <button type="button" className="plus-button" onClick={() => setShowTools(value => !value)} aria-label="Apri strumenti">
                <Plus size={22} />
              </button>

              {showTools && (
                <div className="tools-menu">
                  <h3>Strumenti Veyra</h3>
                  {tools.map(tool => {
                    const Icon = tool.icon;
                    return (
                      <button type="button" className="tool-option" key={tool.id} onClick={() => chooseTool(tool.id)}>
                        <span className="tool-icon"><Icon size={19} /></span>
                        <span className="tool-copy">
                          <b>{tool.label}</b>
                          <small>{tool.desc}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <textarea
              rows="1"
              value={text}
              onChange={event => setText(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Scrivi un messaggio a Veyra..."
            />

            <button className="send-button" disabled={(!text.trim() && !attachments.length) || busy} aria-label="Invia">
              {busy ? <LoaderCircle className="spin" size={20} /> : <ArrowUp size={21} />}
            </button>
          </form>

          <input ref={fileRef} type="file" hidden multiple accept="image/*,.pdf,.txt,.md,.csv" onChange={event => addFiles(event.target.files)} />
          <input ref={imageRef} type="file" hidden accept="image/*" multiple onChange={event => addFiles(event.target.files)} />

          <footer>Veyra può commettere errori. Verifica le informazioni importanti.</footer>
        </div>
      </main>

      {showSettings && (
        <div className="overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <button className="close" onClick={() => setShowSettings(false)} aria-label="Chiudi">✕</button>
            <div className="modal-icon"><Settings2 size={23} /></div>
            <h2>Impostazioni Veyra</h2>
            <p>Le risposte testuali usano Groq tramite una funzione server.</p>
            <div className="info-box">
              <b>Configurazione server</b>
              <p>La variabile <code>GROQ_API_KEY</code> deve essere impostata su Vercel. Non inserirla mai in questo file.</p>
            </div>
            <div className="info-box">
              <b>Strumenti in sviluppo</b>
              <p>La generazione di immagini, la ricerca web e l'analisi dei file richiedono integrazioni aggiuntive.</p>
            </div>
            <button className="primary-button" onClick={() => setShowSettings(false)}>Ho capito</button>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
