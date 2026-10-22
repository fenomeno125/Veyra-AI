
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Sparkles, Plus, Settings2, ArrowUp, X, ImagePlus, Images,
  FileText, Globe, Code2, GraduationCap, Search, Paperclip,
  LoaderCircle, PanelLeftClose, PanelLeft, Compass, FolderKanban,
  CalendarClock, Library, Blocks, Terminal, MoreHorizontal,
  Pencil, Trash2, MessageSquare
} from 'lucide-react';
import './style.css';

const STORAGE_KEY = 'veyra-conversations-v1';
const MAX_FILES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const tools = [
  { id: 'image', label: 'Crea un’immagine', desc: 'Descrivi ciò che vuoi creare', icon: ImagePlus },
  { id: 'vision', label: 'Analizza un’immagine', desc: 'Allega una foto da analizzare', icon: Images },
  { id: 'files', label: 'Allega file', desc: 'Immagini, PDF e testi', icon: Paperclip },
  { id: 'web', label: 'Cerca sul web', desc: 'Ricerca online', icon: Globe },
  { id: 'study', label: 'Studia e impara', desc: 'Spiegazioni ed esercizi', icon: GraduationCap },
  { id: 'code', label: 'Aiuto con il codice', desc: 'Scrivi e correggi programmi', icon: Code2 }
];

function newConversation() {
  return {
    id: crypto.randomUUID(),
    title: 'Nuova chat',
    messages: [],
    updatedAt: Date.now()
  };
}

function readConversations() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getTitle(messages) {
  const first = messages.find(m => m.role === 'user')?.content || '';
  return first.length > 38 ? first.slice(0, 38) + '…' : first || 'Nuova chat';
}

function MessageContent({ content }) {
  const blocks = String(content || '').split(/```/);

  return (
    <div className="message-content">
      {blocks.map((block, index) => {
        if (index % 2 === 1) {
          const lines = block.split('\n');
          const language = lines[0].trim();
          const hasLanguage = language && !language.includes(' ');
          const code = hasLanguage ? lines.slice(1).join('\n') : block;

          return (
            <pre className="code-block" key={index}>
              <div className="code-header">
                <span>{hasLanguage ? language : 'Codice'}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(code)}
                >
                  Copia
                </button>
              </div>
              <code>{code}</code>
            </pre>
          );
        }

        return (
          <div className="text-block" key={index}>
            {block.split('\n').map((line, i) => {
              const value = line.trim();

              if (!value) return <div className="line-space" key={i} />;

              if (/^#{1,3}\s/.test(value)) {
                return <h3 key={i}>{value.replace(/^#{1,3}\s/, '')}</h3>;
              }

              if (/^[-*]\s/.test(value)) {
                return (
                  <div className="formatted-list" key={i}>
                    <span>•</span>
                    <span>{value.slice(2)}</span>
                  </div>
                );
              }

              if (/^\d+[.)]\s/.test(value)) {
                return (
                  <div className="formatted-list" key={i}>
                    <span>{value.match(/^\d+/)[0]}.</span>
                    <span>{value.replace(/^\d+[.)]\s/, '')}</span>
                  </div>
                );
              }

              return <p key={i}>{value}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

/* Mostra le immagini allegate direttamente nel messaggio inviato. */
function MessageImages({ images = [] }) {
  if (!images.length) return null;

  return (
    <div className="sent-images">
      {images.map((src, index) => (
        <a
          className="sent-image-link"
          href={src}
          target="_blank"
          rel="noreferrer"
          key={`${index}-${src.slice(0, 40)}`}
          aria-label={`Apri immagine ${index + 1}`}
        >
          <img
            src={src}
            alt={`Immagine allegata ${index + 1}`}
            loading="lazy"
          />
        </a>
      ))}
    </div>
  );
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error(`Impossibile leggere ${file.name}`));
    };

    reader.onerror = () => reject(new Error(`Errore leggendo ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function App() {
  const [conversations, setConversations] = useState(readConversations);
  const [activeId, setActiveId] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState('Chat');
  const [menuId, setMenuId] = useState(null);

  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  const active = conversations.find(c => c.id === activeId);
  const msgs = active?.messages || [];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      setNotice('Memoria locale piena: elimina alcune conversazioni.');
    }
  }, [conversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, busy]);

  function clearAttachments() {
    setAttachments(old => {
      old.forEach(item => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
      return [];
    });
  }

  function startChat() {
    const chat = newConversation();
    setConversations(old => [chat, ...old]);
    setActiveId(chat.id);
    setText('');
    clearAttachments();
    setNotice('');
    setSection('Chat');
    setShowTools(false);
    setMenuId(null);
  }

  function openChat(id) {
    setActiveId(id);
    setSection('Chat');
    setNotice('');
    setMenuId(null);
    clearAttachments();
    setText('');
  }

  function deleteChat(id) {
    setConversations(old => old.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
    setMenuId(null);
  }

  function renameChat(id) {
    const current = conversations.find(c => c.id === id);
    const name = window.prompt(
      'Nuovo nome della conversazione:',
      current?.title || ''
    );

    if (name?.trim()) {
      setConversations(old => old.map(c =>
        c.id === id ? { ...c, title: name.trim() } : c
      ));
    }

    setMenuId(null);
  }

  function addFiles(fileList) {
    const selected = Array.from(fileList || []);
    const remaining = Math.max(0, MAX_FILES - attachments.length);
    const accepted = [];
    const rejected = [];

    for (const file of selected) {
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') ||
        ['application/pdf'].includes(file.type);

      if (!isImage && !isText) {
        rejected.push(`${file.name}: formato non supportato`);
        continue;
      }

      if (isImage && file.size > MAX_IMAGE_SIZE) {
        rejected.push(`${file.name}: supera 5 MB`);
        continue;
      }

      if (accepted.length >= remaining) {
        rejected.push(`${file.name}: massimo ${MAX_FILES} allegati`);
        continue;
      }

      accepted.push({
        id: crypto.randomUUID(),
        file,
        url: isImage ? URL.createObjectURL(file) : null
      });
    }

    if (accepted.length) {
      setAttachments(old => [...old, ...accepted]);
      setNotice('Allegati aggiunti. Le immagini saranno mostrate nel messaggio.');
    }

    if (rejected.length) setNotice(rejected.join('. '));

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

  async function send(value = text) {
    const prompt = value.trim();
    const selected = [...attachments];

    if ((!prompt && !selected.length) || busy) return;

    const images = selected.filter(item =>
      item.file.type.startsWith('image/')
    );

    const unsupported = selected.filter(item =>
      !item.file.type.startsWith('image/')
    );

    if (unsupported.length) {
      setNotice(
        'Per ora il backend supporta immagini. Rimuovi PDF e altri documenti prima di inviare.'
      );
      return;
    }

    let chatId = activeId;
    let current = conversations.find(c => c.id === chatId);

    if (!chatId) {
      const chat = newConversation();
      chatId = chat.id;
      current = chat;
      setConversations(old => [chat, ...old]);
      setActiveId(chatId);
    }

    const userContent = prompt ||
      'Descrivi e analizza le immagini che ho allegato.';

    /* Convertiamo le immagini in dati persistenti per la cronologia. */
    setBusy(true);
    setShowTools(false);
    setNotice('');
    setText('');

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const imageData = await Promise.all(
        images.map(item => fileToDataURL(item.file))
      );

      const userMessage = {
        role: 'user',
        content: userContent,
        images: imageData
      };

      const next = [...(current?.messages || []), userMessage];

      setConversations(old => {
        const exists = old.some(c => c.id === chatId);

        if (!exists) {
          return [{
            ...current,
            messages: next,
            title: getTitle(next),
            updatedAt: Date.now()
          }, ...old];
        }

        return old.map(c =>
          c.id === chatId
            ? {
                ...c,
                messages: next,
                title: getTitle(next),
                updatedAt: Date.now()
              }
            : c
        );
      });

      /* Liberiamo le anteprime solo dopo aver salvato i dati immagine. */
      clearAttachments();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(-30).map(message => ({
            role: message.role,
            content: message.content
          })),
          images: imageData
        })
      });

      const raw = await response.text();
      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error('Risposta server non valida. Controlla api/chat.js.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Errore del server.');
      }

      const reply = data.reply || 'Non ho ricevuto una risposta.';

      setConversations(old => old.map(c =>
        c.id === chatId
          ? {
              ...c,
              messages: [...c.messages, {
                role: 'assistant',
                content: reply
              }],
              updatedAt: Date.now()
            }
          : c
      ));
    } catch (error) {
      setNotice('Errore: ' + error.message);
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
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

    const prompts = {
      image: 'Vorrei creare un’immagine. Aiutami a preparare una descrizione dettagliata.',
      web: 'Vorrei cercare informazioni aggiornate sul web.',
      study: 'Aiutami a studiare e capire un argomento con esempi semplici.',
      code: 'Aiutami a scrivere o correggere del codice.'
    };

    if (id === 'image' || id === 'web') {
      setNotice(id === 'image'
        ? 'Per generare immagini serve collegare un servizio di generazione.'
        : 'La ricerca web non è ancora collegata al backend.');
    }

    setText(prompts[id] || '');
    textareaRef.current?.focus();
  }

  const visibleChats = conversations
    .filter(c => c.title.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const promptCards = [
    ['📚', 'Studiare', 'Spiegami un argomento difficile con esempi semplici.'],
    ['✍️', 'Scrivere', 'Aiutami a scrivere un testo chiaro e coinvolgente.'],
    ['⌨️', 'Programmare', 'Aiutami a risolvere un problema di programmazione.'],
    ['💡', 'Idee', 'Dammi 10 idee originali per un progetto digitale.']
  ];

  function selectSection(label) {
    setSection(label === 'Recenti' ? 'Chat' : label);
    setNotice(
      label === 'Immagini'
        ? 'Puoi allegare immagini alla chat per farle analizzare.'
        : label === 'Programmate'
        ? 'Le attività programmate non sono ancora disponibili.'
        : label === 'Plugin'
        ? 'I plugin non sono ancora collegati a servizi reali.'
        : label === 'Codex'
        ? 'L’area Codex è in preparazione.'
        : ''
    );
  }

  return (
    <div className={`app ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="sidebar-head">
            <button className="brand" onClick={startChat} aria-label="Veyra, nuova chat">
              <Sparkles size={23} />
              <span>veyra</span>
            </button>
            <button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Nascondi barra laterale">
              <PanelLeftClose size={19} />
            </button>
          </div>

          <button className="side-action" onClick={startChat}>
            <Plus size={19} /> Nuova chat
          </button>
          <button className={`side-action ${section === 'Esplora' ? 'selected' : ''}`} onClick={() => selectSection('Esplora')}>
            <Compass size={18} /> Esplora
          </button>
          <button className={`side-action ${section === 'Progetti' ? 'selected' : ''}`} onClick={() => selectSection('Progetti')}>
            <FolderKanban size={18} /> Progetti
          </button>

          <div className="history-heading">
            <span>Recenti</span>
            <button className="icon-button small" onClick={() => setSearchOpen(v => !v)} aria-label="Cerca cronologia">
              <Search size={17} />
            </button>
          </div>

          {searchOpen && (
            <input
              className="history-search"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Cerca conversazioni..."
              autoFocus
            />
          )}

          <div className="history-list">
            {visibleChats.map(chat => (
              <div className={`history-item ${chat.id === activeId ? 'active' : ''}`} key={chat.id}>
                <button className="history-open" onClick={() => openChat(chat.id)} title={chat.title}>
                  <MessageSquare size={15} />
                  <span>{chat.title}</span>
                </button>
                <button className="icon-button history-menu-button" onClick={() => setMenuId(menuId === chat.id ? null : chat.id)} aria-label="Opzioni conversazione">
                  <MoreHorizontal size={17} />
                </button>
                {menuId === chat.id && (
                  <div className="history-menu">
                    <button onClick={() => renameChat(chat.id)}><Pencil size={14} /> Rinomina</button>
                    <button onClick={() => deleteChat(chat.id)}><Trash2 size={14} /> Elimina</button>
                  </div>
                )}
              </div>
            ))}
            {!visibleChats.length && <p className="empty-history">Nessuna conversazione.</p>}
          </div>

          <div className="sidebar-links">
            <button className="side-action" onClick={() => selectSection('Immagini')}><Images size={18} /> Immagini</button>
            <button className="side-action" onClick={() => selectSection('Programmate')}><CalendarClock size={18} /> Programmate</button>
            <button className="side-action" onClick={() => selectSection('Libreria')}><Library size={18} /> Libreria</button>
            <button className="side-action" onClick={() => selectSection('Plugin')}><Blocks size={18} /> Plugin</button>
            <button className="side-action" onClick={() => selectSection('Codex')}><Terminal size={18} /> Codex</button>
          </div>

          <div className="sidebar-bottom">
            <button className="side-action" onClick={() => setShowSettings(true)}>
              <Settings2 size={18} /> Impostazioni
            </button>
          </div>
        </aside>
      )}

      <main className="main">
        <header className="topbar">
          {!sidebarOpen && (
            <>
              <button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label="Mostra barra laterale">
                <PanelLeft size={20} />
              </button>
              <button className="icon-button" onClick={startChat} aria-label="Nuova chat">
                <Plus size={20} />
              </button>
            </>
          )}

          <div className="topbar-title">
            <span className="status-dot" />
            <b>Veyra</b>
            <span className="topbar-label">AI</span>
          </div>

          <button className="icon-button" onClick={() => setShowSettings(true)} aria-label="Impostazioni">
            <Settings2 size={19} />
          </button>
        </header>

        {section !== 'Chat' ? (
          <section className="section-page">
            <div className="section-symbol"><Sparkles size={27} /></div>
            <h1>{section}</h1>
            <p>Questa sezione è pronta per essere sviluppata.</p>
            {section === 'Immagini' && (
              <button className="primary-button" onClick={() => imageRef.current?.click()}>
                <ImagePlus size={18} /> Seleziona un’immagine
              </button>
            )}
            <button className="secondary-button" onClick={() => setSection('Chat')}>Torna alla chat</button>
          </section>
        ) : (
          <>
            <section className="conversation" key={activeId || 'welcome'}>
              {!msgs.length ? (
                <div className="welcome">
                  <div className="hero"><Sparkles size={27} /></div>
                  <h1>Ciao, sono Veyra<span>.</span></h1>
                  <p>Su cosa vuoi lavorare oggi?</p>
                  <div className="cards">
                    {promptCards.map(([icon, title, prompt]) => (
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
                    <article className={`message ${message.role}`} key={`${activeId}-${index}`}>
                      {message.role === 'assistant' && (
                        <div className="assistant-mark"><Sparkles size={17} /></div>
                      )}
                      <div className="message-body">
                        <b>{message.role === 'assistant' ? 'Veyra' : 'Tu'}</b>

                        {message.role === 'user' && (
                          <MessageImages images={message.images || []} />
                        )}

                        <MessageContent content={message.content} />
                      </div>
                    </article>
                  ))}
                  {busy && <div className="thinking"><LoaderCircle className="spin" size={18} /> Veyra sta pensando…</div>}
                  <div ref={endRef} />
                </div>
              )}
            </section>

            <div className="composer-area">
              {notice && (
                <div className="notice">
                  <span>{notice}</span>
                  <button className="icon-button" onClick={() => setNotice('')} aria-label="Chiudi avviso">
                    <X size={16} />
                  </button>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="attachments">
                  {attachments.map(item => (
                    <div className="attachment" key={item.id}>
                      {item.url
                        ? <img src={item.url} alt={item.file.name} />
                        : <FileText size={23} />}
                      <span title={item.file.name}>{item.file.name}</span>
                      <button type="button" className="remove-file" onClick={() => removeAttachment(item.id)} aria-label={`Rimuovi ${item.file.name}`}>
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form className="composer" onSubmit={e => { e.preventDefault(); send(); }}>
                <div className="plus-wrap">
                  <button type="button" className="plus-button" onClick={() => setShowTools(v => !v)} aria-label="Apri strumenti">
                    <Plus size={22} />
                  </button>

                  {showTools && (
                    <div className="tools-menu">
                      <h3>Strumenti</h3>
                      {tools.map(tool => {
                        const Icon = tool.icon;
                        return (
                          <button type="button" className="tool-option" key={tool.id} onClick={() => chooseTool(tool.id)}>
                            <span className="tool-icon"><Icon size={19} /></span>
                            <span className="tool-copy"><b>{tool.label}</b><small>{tool.desc}</small></span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <textarea
                  ref={textareaRef}
                  rows="1"
                  value={text}
                  onChange={e => {
                    setText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Scrivi un messaggio a Veyra..."
                />

                <button type="submit" className="send-button" disabled={(!text.trim() && !attachments.length) || busy} aria-label="Invia">
                  {busy ? <LoaderCircle className="spin" size={20} /> : <ArrowUp size={21} />}
                </button>
              </form>

              <input ref={fileRef} type="file" hidden multiple accept="image/*,.pdf,.txt,.md,.csv" onChange={e => addFiles(e.target.files)} />
              <input ref={imageRef} type="file" hidden multiple accept="image/*" onChange={e => addFiles(e.target.files)} />
              <footer>Veyra può commettere errori. Verifica le informazioni importanti.</footer>
            </div>
          </>
        )}
      </main>

      {showSettings && (
        <div className="overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setShowSettings(false)} aria-label="Chiudi"><X size={19} /></button>
            <div className="modal-icon"><Settings2 size={23} /></div>
            <h2>Impostazioni Veyra</h2>
            <p>Le risposte testuali e l'analisi delle immagini usano Groq tramite il backend.</p>
            <div className="info-box">
              <b>Configurazione server</b>
              <p>La variabile GROQ_API_KEY deve restare nelle variabili d'ambiente di Vercel. Non inserirla nel frontend.</p>
            </div>
            <div className="info-box">
              <b>Allegati</b>
              <p>Le immagini vengono inviate al backend. Per leggerle, api/chat.js deve usare un modello Groq compatibile con le immagini.</p>
            </div>
            <button className="primary-button" onClick={() => setShowSettings(false)}>Ho capito</button>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
