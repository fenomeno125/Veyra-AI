import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sparkles, Plus, Settings2, ArrowUp } from 'lucide-react';
import './style.css';

function App() {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function send(v = text) {
    v = v.trim();
    if (!v || busy) return;

    const next = [...msgs, { role: 'user', content: v }];
    setMsgs(next);
    setText('');
    setBusy(true);

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(-30) })
      });

      const d = await r.json();

      if (!r.ok) throw new Error(d.error || 'Errore del server');

      setMsgs(m => [...m, {
        role: 'assistant',
        content: d.reply || 'Non ho ricevuto una risposta.'
      }]);
    } catch (e) {
      setMsgs(m => [...m, {
        role: 'assistant',
        content: 'Veyra non riesce a rispondere: ' + e.message
      }]);
    } finally {
      setBusy(false);
    }
  }

  const prompts = [
    ['📚', 'Studiare', 'Spiegami un argomento difficile con esempi semplici.'],
    ['✍️', 'Scrivere', 'Aiutami a scrivere un testo chiaro e coinvolgente.'],
    ['⌨️', 'Programmare', 'Aiutami a risolvere un problema di programmazione.'],
    ['💡', 'Idee', 'Dammi 10 idee originali per un progetto digitale.']
  ];

  return (
    <div className="app">
      <aside>
        <h2><Sparkles /> Veyra <span>AI</span></h2>
        <button className="new" onClick={() => setMsgs([])}>
          <Plus /> Nuova chat
        </button>
        <p className="muted">IL TUO ASSISTENTE</p>
        <div className="note">
          Chat semplice, cronologia per questa sessione e risposte IA tramite server sicuro.
        </div>
        <button className="settings" onClick={() => setShow(true)}>
          <Settings2 /> Impostazioni
        </button>
      </aside>

      <main>
        <header>
          <i />
          <b>Veyra AI</b>
          <span>Assistente</span>
          <button onClick={() => setShow(true)} aria-label="Impostazioni">
            <Settings2 />
          </button>
        </header>

        <section className="conversation">
          {!msgs.length ? (
            <div className="welcome">
              <div className="hero"><Sparkles size={30} /></div>
              <small>IL TUO SPAZIO PER LE IDEE</small>
              <h1>Ciao, sono Veyra<span>.</span></h1>
              <p>Su cosa vuoi lavorare oggi?</p>
              <div className="cards">
                {prompts.map(([ico, t, p]) => (
                  <button key={t} onClick={() => send(p)}>
                    <strong>{ico}　{t}</strong>
                    <small>{p}</small>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages">
              {msgs.map((m, i) => (
                <article key={i}>
                  <b>{m.role === 'assistant' ? '✦ Veyra' : 'Tu'}</b>
                  <p>{m.content}</p>
                </article>
              ))}
              {busy && <p>Veyra sta pensando…</p>}
            </div>
          )}
        </section>

        <form onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea
            rows="1"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Scrivi un messaggio a Veyra..."
          />
          <button disabled={!text.trim() || busy} aria-label="Invia">
            <ArrowUp />
          </button>
        </form>

        <footer>
          Veyra può commettere errori. Verifica le informazioni importanti.
        </footer>
      </main>

      {show && (
        <div className="overlay">
          <div className="modal">
            <button className="close" onClick={() => setShow(false)}>✕</button>
            <h2>Impostazioni Veyra</h2>
            <p>
              Veyra usa Groq per le risposte IA. La chiave API va configurata
              solo sul server Vercel, mai nel browser.
            </p>
            <ol>
              <li>Apri Vercel e seleziona il progetto Veyra.</li>
              <li>Vai in Settings → Environment Variables.</li>
              <li>Aggiungi <code>GROQ_API_KEY</code> con la tua chiave segreta Groq.</li>
              <li>Se necessario, imposta <code>GROQ_MODEL</code> su <code>llama-3.3-70b-versatile</code>.</li>
              <li>Pubblica le modifiche e attendi che il deployment sia Ready.</li>
            </ol>
            <p>
              Le API possono avere limiti di utilizzo. Chiedi a un genitore
              o tutore prima di attivare eventuali pagamenti.
            </p>
            <button className="primary" onClick={() => setShow(false)}>
              Ho capito
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

