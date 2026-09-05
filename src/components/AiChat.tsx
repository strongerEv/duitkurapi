import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { ask, greeting, type AnswerBlock, type ChatMessage } from '../lib/assistant';
import { uid } from '../lib/id';
import { IconClose, IconSearch } from './Icons';

/** Ikon kilau untuk tombol asisten. */
function IconSpark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 13.6 8.4 18.5 10 13.6 11.6 12 16.5 10.4 11.6 5.5 10 10.4 8.4Z" fill="currentColor" stroke="none" />
      <path d="M18.5 15.5 19.3 17.7 21.5 18.5 19.3 19.3 18.5 21.5 17.7 19.3 15.5 18.5 17.7 17.7Z" fill="currentColor" stroke="none" opacity=".75" />
    </svg>
  );
}

function IconSend({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12 20 4.5 15.5 20l-3.6-6.2z" />
      <path d="M11.9 13.8 4.5 12" />
    </svg>
  );
}

function IconArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

/** Menggambar satu kartu data di dalam jawaban asisten. */
function Block({ block }: { block: AnswerBlock }) {
  switch (block.kind) {
    case 'stat':
      return (
        <div className="ai-stat">
          <div className="lbl">{block.label}</div>
          <div className={`val mono ${block.tone === 'in' ? 'in' : block.tone === 'out' ? 'out' : ''}`}>{block.value}</div>
          {block.sub && <div className="sub">{block.sub}</div>}
        </div>
      );

    case 'bars':
      return (
        <div className="ai-bars">
          {block.items.map((it, i) => (
            <div className="ai-bar" key={`${it.label}-${i}`}>
              <div className="row">
                {it.icon && <span aria-hidden>{it.icon}</span>}
                <span className="nm">{it.label}</span>
                <span className="amt mono">{it.display}</span>
              </div>
              <div className="track">
                <div className="fill" style={{ width: `${Math.max(3, Math.min(100, it.pct))}%`, background: it.color }} />
              </div>
            </div>
          ))}
        </div>
      );

    case 'delta':
      return (
        <div className="ai-delta">
          <div className="lbl">{block.label}</div>
          <div className="pair">
            <div className="side">
              <div className="t">{block.fromLabel}</div>
              <div className="v mono">{block.fromValue}</div>
            </div>
            <span className="arrow"><IconArrowRight /></span>
            <div className="side">
              <div className="t">{block.toLabel}</div>
              <div className="v mono">{block.toValue}</div>
            </div>
          </div>
          <span className={`verdict ${block.flat ? 'flat' : block.good ? 'good' : 'bad'}`}>
            {block.flat ? '≈' : block.good ? '✓' : '▲'} {block.deltaText}
          </span>
        </div>
      );

    case 'list':
      return (
        <div className="ai-list">
          {block.items.map((it, i) => (
            <div className="item" key={`${it.title}-${i}`}>
              {it.icon && <div className="ic" aria-hidden>{it.icon}</div>}
              <div className="txt">
                <div className="t">{it.title}</div>
                {it.sub && <div className="s">{it.sub}</div>}
              </div>
              {it.right && <div className={`rt mono ${it.tone ?? ''}`}>{it.right}</div>}
            </div>
          ))}
        </div>
      );

    case 'note':
      return (
        <div className={`ai-note ${block.tone}`}>
          <div className="t">{block.title}</div>
          <div className="s">{block.text}</div>
        </div>
      );
  }
}

/**
 * Asisten keuangan yang mengambang di atas seluruh halaman.
 *
 * Seluruh analisis dikerjakan di perangkat oleh `lib/assistant`, sehingga
 * jawabannya cepat, tetap jalan tanpa internet, dan tidak ada data keuangan
 * yang dikirim ke mana pun.
 */
export default function AiChat() {
  const { data } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sapaan pembuka disusun saat panel pertama kali dibuka, memakai data terkini.
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const a = greeting(data);
    setMessages([{ id: uid('m-'), role: 'assistant', text: a.text, blocks: a.blocks, suggestions: a.suggestions, at: Date.now() }]);
  }, [open, messages.length, data]);

  // Kunci gulir halaman di belakang panel.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Selalu tampilkan pesan terbaru.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const kirim = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || thinking) return;

      setMessages((prev) => [...prev, { id: uid('m-'), role: 'user', text, at: Date.now() }]);
      setDraft('');
      setThinking(true);

      // Jeda singkat supaya jawabannya tidak muncul mendadak sebelum pesan
      // pengguna sempat terbaca.
      window.setTimeout(() => {
        const a = ask(text, data);
        setMessages((prev) => [
          ...prev,
          { id: uid('m-'), role: 'assistant', text: a.text, blocks: a.blocks, suggestions: a.suggestions, at: Date.now() },
        ]);
        setThinking(false);
      }, 380);
    },
    [data, thinking],
  );

  const terakhir = messages[messages.length - 1];
  const saran = useMemo(
    () => (!thinking && terakhir?.role === 'assistant' ? (terakhir.suggestions ?? []) : []),
    [terakhir, thinking],
  );

  return (
    <>
      <button
        className={`ai-fab ${open ? 'hidden' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Buka asisten keuangan"
      >
        <IconSpark />
        <span className="spark" />
      </button>

      {open && (
        <div
          className="ai-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Asisten keuangan"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="ai-sheet" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ai-head">
              <div className="ai-avatar"><IconSpark size={21} /></div>
              <div className="f1">
                <div className="ai-title">Asisten Duitku</div>
                <div className="ai-status">
                  <span className="dot-live" /> Menganalisis {data.transactions.length} transaksi di perangkatmu
                </div>
              </div>
              <button className="icon-btn ghost" onClick={() => setOpen(false)} aria-label="Tutup">
                <IconClose size={18} />
              </button>
            </div>

            <div className="ai-body" ref={bodyRef}>
              {messages.map((m) =>
                m.role === 'user' ? (
                  <div className="ai-msg user" key={m.id}>
                    <div className="bubble">{m.text}</div>
                  </div>
                ) : (
                  <div className="ai-msg bot" key={m.id}>
                    <div className="bubble">{m.text}</div>
                    {m.blocks && m.blocks.length > 0 && (
                      <div className="ai-blocks">
                        {m.blocks.map((b, i) => (
                          <Block block={b} key={`${m.id}-${i}`} />
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}

              {thinking && (
                <div className="ai-msg bot">
                  <div className="bubble ai-typing" style={{ padding: '13px 16px' }}>
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </div>

            {saran.length > 0 && (
              <div className="ai-suggest">
                {saran.map((s) => (
                  <button key={s} onClick={() => kirim(s)}>
                    <IconSearch size={12} /> {s}
                  </button>
                ))}
              </div>
            )}

            <div className="ai-input-row">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Tanya apa saja soal keuanganmu…"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(110, el.scrollHeight)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    kirim(draft);
                    if (inputRef.current) inputRef.current.style.height = 'auto';
                  }
                }}
              />
              <button
                className="ai-send"
                onClick={() => {
                  kirim(draft);
                  if (inputRef.current) inputRef.current.style.height = 'auto';
                }}
                disabled={!draft.trim() || thinking}
                aria-label="Kirim pertanyaan"
              >
                <IconSend />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
