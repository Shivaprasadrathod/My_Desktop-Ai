import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  FileText,
  Fingerprint,
  Mic,
  MicOff,
  Palette,
  Presentation,
  Radio,
  Repeat,
  RotateCcw,
  Send,
  Sliders,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import Orb from './components/Orb.jsx';
import Waveform from './components/Waveform.jsx';
import Particles from './components/Particles.jsx';
import {
  AccessCard,
  AuthModal,
  BootScreen,
  ChatPanel,
  DashboardModal,
  HUDTimerWidget,
  NotesModal,
  QuickCommands,
  SystemPanel,
  VoiceSettingsModal,
} from './components/Panels.jsx';
import { useSpeechRecognition, useSpeechSynthesis } from './hooks/useSpeech.js';
import { useSystemInfo } from './hooks/useSystemInfo.js';
import { createEngineState, formatTime, initialGreeting, processCommand, USER } from './lib/engine.js';

const DEMO_SCRIPT = ['Hey JARVIS', 'What can you do?', 'What time is it?', 'Calculate 25 multiplied by 10', 'Tell me a joke', 'System status'];
const DEMO_OUTRO = `That concludes the demonstration, ${USER.name}. I'm ready for your commands.`;

const STATUS_LABEL = { idle: 'IDLE', listening: 'LISTENING', thinking: 'THINKING', speaking: 'SPEAKING' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function formatUptime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const [booted, setBooted] = useState(false);
  const [status, setStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [voiceProfile, setVoiceProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_voice_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [verified, setVerified] = useState(() => Boolean(voiceProfile?.enrolled));
  const [handsFree, setHandsFree] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showDash, setShowDash] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('jarvis_theme') || 'arc';
    } catch {
      return 'arc';
    }
  });
  const [timerData, setTimerData] = useState(null);
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [demo, setDemo] = useState(false);
  const [demoDone, setDemoDone] = useState(false);
  const [stats, setStats] = useState({ total: 0, voice: 0, text: 0, lastIntent: '' });
  const [seconds, setSeconds] = useState(0);

  const info = useSystemInfo();
  const engine = useRef(createEngineState());
  const idRef = useRef(0);
  const runId = useRef(0);
  const demoId = useRef(0);
  const fallbackTimer = useRef(null);
  const infoRef = useRef(info);
  const statusRef = useRef(status);
  const handsFreeRef = useRef(false);
  const voiceProfileRef = useRef(voiceProfile);
  const recogRef = useRef(null);

  useEffect(() => {
    infoRef.current = info;
  }, [info]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);
  useEffect(() => {
    voiceProfileRef.current = voiceProfile;
  }, [voiceProfile]);

  const tts = useSpeechSynthesis();

  const addMessage = useCallback((role, text, extra = {}) => {
    idRef.current += 1;
    const msg = { id: idRef.current, role, text, time: formatTime(new Date()), fresh: true, ...extra };
    setMessages((m) => [...m, msg]);
    return msg;
  }, []);

  const caps = useMemo(
    () => ({ recognition: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), synthesis: tts.supported }),
    [tts.supported]
  );

  /* Speak a reply and resolve when finished. Falls back to a timed animation if audio is unavailable. */
  const speakReply = useCallback(
    (text, id) =>
      new Promise((resolve) => {
        clearTimeout(fallbackTimer.current);
        setStatus('speaking');
        let settled = false;
        const end = () => {
          if (settled) return;
          settled = true;
          clearTimeout(fallbackTimer.current);
          if (id === runId.current) setStatus('idle');
          if (handsFreeRef.current) {
            setTimeout(() => {
              if (handsFreeRef.current && statusRef.current === 'idle') {
                recogRef.current?.start();
              }
            }, 450);
          }
          resolve();
        };
        tts.speak(text, {
          onEnd: (spoken) => {
            if (spoken) end();
            else {
              // no audio (muted / unsupported / blocked): keep the animation for a natural duration
              fallbackTimer.current = setTimeout(end, Math.min(4500, 700 + text.length * 40));
            }
          },
        });
      }),
    [tts]
  );

  /* Countdown timer loop */
  useEffect(() => {
    if (!timerData || !timerData.active || timerData.secondsLeft <= 0) return undefined;
    const interval = setInterval(() => {
      setTimerData((t) => {
        if (!t || !t.active) return t;
        if (t.secondsLeft <= 1) {
          addMessage('jarvis', `Attention ${USER.name}: Your ${t.totalSeconds}s countdown timer has reached zero!`);
          speakReply(`Attention ${USER.name}, your countdown timer is complete.`, runId.current);
          return { ...t, secondsLeft: 0, active: false };
        }
        return { ...t, secondsLeft: t.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerData, speakReply, addMessage]);

  const cycleTheme = () => {
    const list = ['arc', 'mark7', 'stealth', 'emerald'];
    const next = list[(list.indexOf(theme) + 1) % list.length];
    setTheme(next);
    try {
      localStorage.setItem('jarvis_theme', next);
    } catch {}
    addMessage('jarvis', `HUD theme shifted to ${next.toUpperCase()} mode, ${USER.name}.`);
  };

  /* One code path for every command: typed, spoken, quick button, or demo. */
  const converse = useCallback(
    async (raw, source = 'text') => {
      const text = (raw || '').trim();
      if (!text) return;
      tts.cancel();
      clearTimeout(fallbackTimer.current);
      runId.current += 1;
      const id = runId.current;

      addMessage('user', text, { source });
      setStatus('thinking');
      await sleep(550 + Math.random() * 500);
      if (id !== runId.current) return;

      const i = infoRef.current;
      const res = processCommand(
        text,
        {
          now: new Date(),
          voiceProfile: voiceProfileRef.current,
          system: {
            online: i.online,
            cores: i.cores,
            battery: i.battery ? i.battery.level : null,
            speechRecognition: caps.recognition,
            speechSynthesis: caps.synthesis,
          },
        },
        engine.current
      );

      setStats((s) => ({
        total: s.total + 1,
        voice: s.voice + (source === 'voice' ? 1 : 0),
        text: s.text + (source === 'voice' ? 0 : 1),
        lastIntent: res.intent,
      }));

      if (res.action === 'clear') {
        idRef.current += 1;
        setMessages([{ id: idRef.current, role: 'jarvis', text: res.text, time: formatTime(new Date()), fresh: true }]);
      } else {
        addMessage('jarvis', res.text);
      }
      if (res.action === 'dashboard') setShowDash(true);
      if (res.action === 'auth') setShowAuth(true);
      if (res.action === 'demo') setTimeout(() => startDemoRef.current?.(), 300);
      if (res.action === 'handsfree_on') {
        setHandsFree(true);
        handsFreeRef.current = true;
      }
      if (res.action === 'handsfree_off') {
        setHandsFree(false);
        handsFreeRef.current = false;
        recogRef.current?.stop();
      }
      if (res.action === 'open_url' && res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
      }
      if (res.action === 'timer_set' && res.seconds) {
        setTimerData({
          secondsLeft: res.seconds,
          totalSeconds: res.seconds,
          active: true,
          label: `${res.seconds}s Timer`,
        });
      }
      if (res.action === 'timer_cancel') {
        setTimerData(null);
      }
      if (res.action === 'add_note' && res.note) {
        setNotes((prev) => {
          const updated = [...prev, { id: Date.now(), text: res.note, time: formatTime(new Date()) }];
          try {
            localStorage.setItem('jarvis_notes', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
      if (res.action === 'clear_notes') {
        setNotes([]);
        try {
          localStorage.removeItem('jarvis_notes');
        } catch {}
      }
      if (res.action === 'show_notes') {
        setShowNotes(true);
      }
      if (res.action === 'set_theme' && res.theme) {
        setTheme(res.theme);
        try {
          localStorage.setItem('jarvis_theme', res.theme);
        } catch {}
      }
      if (res.action === 'fullscreen') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
      }
      if (res.action === 'mute') {
        tts.setMuted(true);
      }
      if (res.action === 'unmute') {
        tts.setMuted(false);
      }

      await speakReply(res.text, id);
    },
    [addMessage, caps, speakReply, tts]
  );

  /* ---------- microphone ---------- */
  const recog = useSpeechRecognition({
    onFinal: (text) => converse(text, 'voice'),
    onEnd: ({ errored } = {}) => {
      if (statusRef.current === 'listening') setStatus('idle');
      if (handsFreeRef.current && !errored && statusRef.current === 'idle') {
        setTimeout(() => {
          if (handsFreeRef.current && statusRef.current === 'idle') {
            recogRef.current?.start();
          }
        }, 350);
      }
    },
    onError: (err) => {
      setStatus('idle');
      if (err === 'no-speech' && handsFreeRef.current) {
        setTimeout(() => {
          if (handsFreeRef.current && statusRef.current === 'idle') {
            recogRef.current?.start();
          }
        }, 350);
        return;
      }
      if (err === 'not-allowed') {
        setHandsFree(false);
        handsFreeRef.current = false;
      }
      const msgs = {
        'not-allowed': 'Microphone permission was denied. You can still type commands below.',
        'service-not-allowed': 'Microphone access is blocked for this page. You can still type commands below.',
        'no-speech': `I didn't hear anything, ${USER.name}. Press the microphone and try again.`,
        'audio-capture': 'No microphone was found. You can still type commands below.',
        network: 'Speech recognition needs an internet connection in this browser. Typing still works.',
      };
      addMessage('system', msgs[err] || `Speech recognition error (${err}). Typing still works.`);
    },
  });
  recogRef.current = recog;

  const toggleMic = () => {
    if (!recog.supported) {
      addMessage('system', 'Speech recognition is not supported in this browser. Use Chrome or Edge for voice input, or type your command below.');
      return;
    }
    if (recog.listening) {
      recog.stop();
      return;
    }
    tts.cancel();
    runId.current += 1;
    clearTimeout(fallbackTimer.current);
    if (recog.start()) setStatus('listening');
    else addMessage('system', 'The microphone could not start. Please try again.');
  };

  const toggleHandsFree = () => {
    if (!caps.recognition) {
      addMessage('system', 'Speech recognition is not supported in this browser. Use Chrome or Edge for hands-free voice input.');
      return;
    }
    const next = !handsFree;
    setHandsFree(next);
    handsFreeRef.current = next;
    if (next) {
      const txt = `Hands-free voice recognition mode activated, ${USER.name}. I am now listening continuously.`;
      addMessage('jarvis', txt);
      speakReply(txt, runId.current);
      if (statusRef.current === 'idle') recog.start();
    } else {
      recog.stop();
      addMessage('jarvis', `Hands-free mode deactivated, ${USER.name}.`);
    }
  };

  /* ---------- text input ---------- */
  const submit = (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const v = input;
    setInput('');
    converse(v, 'text');
  };

  const stopAll = () => {
    demoId.current += 1;
    runId.current += 1;
    tts.cancel();
    recog.abort();
    clearTimeout(fallbackTimer.current);
    setStatus('idle');
  };

  const clearChat = () => {
    stopAll();
    setMessages([]);
    engine.current = createEngineState();
    setStats({ total: 0, voice: 0, text: 0, lastIntent: '' });
  };

  /* ---------- boot + greeting ---------- */
  const boot = () => {
    setBooted(true);
    const text = initialGreeting(new Date());
    runId.current += 1;
    const id = runId.current;
    addMessage('jarvis', text);
    speakReply(text, id);
  };

  /* ---------- demo mode ---------- */
  const startDemoRef = useRef(null);
  const startDemo = useCallback(async () => {
    stopAll();
    const token = demoId.current;
    setDemo(true);
    setDemoDone(false);
    setShowAuth(false);
    setShowDash(false);
    setMessages([]);
    engine.current = createEngineState();
    setStats({ total: 0, voice: 0, text: 0, lastIntent: '' });
    await sleep(500);
    if (token !== demoId.current) return;

    runId.current += 1;
    const greet = initialGreeting(new Date());
    addMessage('jarvis', greet);
    await speakReply(greet, runId.current);
    for (const line of DEMO_SCRIPT) {
      if (token !== demoId.current) return;
      await sleep(900);
      if (token !== demoId.current) return;
      await converse(line, 'demo');
    }
    if (token !== demoId.current) return;
    await sleep(800);
    if (token !== demoId.current) return;
    runId.current += 1;
    addMessage('jarvis', DEMO_OUTRO);
    await speakReply(DEMO_OUTRO, runId.current);
    if (token === demoId.current) setDemoDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [converse, speakReply, addMessage]);

  useEffect(() => {
    startDemoRef.current = startDemo;
  }, [startDemo]);

  const exitDemo = () => {
    stopAll();
    setDemo(false);
    setDemoDone(false);
  };

  /* ---------- misc ---------- */
  useEffect(() => {
    if (!booted) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [booted]);

  useEffect(() => () => stopAll(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const uptime = formatUptime(seconds);
  const busy = status === 'thinking';
  const particleSpeed = status === 'thinking' ? 3 : status === 'speaking' ? 2 : status === 'listening' ? 1.6 : 1;

  if (!booted) {
    return (
      <>
        <Particles intensity={1} />
        <BootScreen onStart={boot} />
      </>
    );
  }

  return (
    <div className={`app ${demo ? 'demo' : ''}`} data-state={status} data-theme={theme}>
      <Particles intensity={particleSpeed} />
      <div className="vignette" aria-hidden="true" />

      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true" />
          <div>
            <b>J.A.R.V.I.S</b>
            <small>Personal AI Assistant</small>
          </div>
        </div>

        <div className="top-actions">
          {demo ? (
            <>
              <span className="demo-badge">DEMO MODE</span>
              {demoDone && (
                <button type="button" className="btn ghost" onClick={startDemo}>
                  <RotateCcw size={15} /> Replay
                </button>
              )}
              <button type="button" className="btn ghost" onClick={exitDemo}>
                <X size={15} /> Exit demo
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="icon-btn"
                onClick={cycleTheme}
                title={`Switch theme: ${theme.toUpperCase()} mode (Mark VII / Arc / Stealth / Emerald)`}
                aria-label="Switch theme"
              >
                <Palette size={18} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowVoiceSettings(true)}
                title="Configure JARVIS synthetic voice output"
                aria-label="Voice settings"
              >
                <Sliders size={18} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowNotes(true)}
                title={`Voice notes and memory (${notes.length})`}
                aria-label="Voice notes"
              >
                <FileText size={18} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  if (!tts.muted) tts.cancel();
                  tts.setMuted(!tts.muted);
                }}
                aria-label={tts.muted ? 'Unmute JARVIS voice' : 'Mute JARVIS voice'}
                title={tts.muted ? 'Unmute voice' : 'Mute voice'}
              >
                {tts.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button type="button" className="btn demo-btn" onClick={startDemo}>
                <Presentation size={16} /> DEMO MODE
              </button>
            </>
          )}
        </div>
      </header>

      <main className="layout">
        <aside className="col left">
          <SystemPanel info={info} caps={caps} uptime={uptime} commandCount={stats.total} flash={showDash} />
          <AccessCard verified={verified} voiceProfile={voiceProfile} onVerify={() => setShowAuth(true)} />
        </aside>

        <section className="col center">
          <div className="welcome">
            <h1>Welcome Back, {USER.name}</h1>
            <p>
              <span className={`access-pill ${voiceProfile?.enrolled ? 'verified' : ''}`}>
                <i /> {voiceProfile?.enrolled ? 'VOICE RECOGNIZED' : 'SHIVA ACCESS'}
              </span>
              <span className={`status-pill s-${status}`}>
                <i /> {STATUS_LABEL[status]}
              </span>
              <button
                type="button"
                className={`handsfree-pill ${handsFree ? 'active' : ''}`}
                onClick={toggleHandsFree}
                title={handsFree ? 'Hands-Free continuous listening is active. Click to turn off.' : 'Turn on Hands-Free continuous voice recognition'}
              >
                <Radio size={12} /> {handsFree ? 'HANDS-FREE: ON' : 'HANDS-FREE: OFF'}
              </button>
            </p>
          </div>

          <HUDTimerWidget timerData={timerData} onCancel={() => setTimerData(null)} />

          <Orb status={status} />
          <Waveform status={status} />

          {!demo && (
            <>
              <form className="command-bar glass" onSubmit={submit}>
                <button
                  type="button"
                  className={`mic ${status === 'listening' ? 'on' : ''} ${recog.supported ? '' : 'off'}`}
                  onClick={toggleMic}
                  aria-label={status === 'listening' ? 'Stop listening' : 'Start voice command'}
                  aria-pressed={status === 'listening'}
                >
                  {recog.supported ? status === 'listening' ? <Square size={18} /> : <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <input
                  value={recog.listening && recog.interim ? recog.interim : input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={recog.listening ? 'Listening…' : `Type a command, ${USER.name}…`}
                  aria-label="Text command"
                  readOnly={recog.listening}
                  autoComplete="off"
                />
                <button type="submit" className="send" disabled={!input.trim() || busy} aria-label="Send command">
                  <Send size={18} />
                </button>
              </form>

              <QuickCommands onRun={(c) => (/^clear conversation/i.test(c) ? converse(c, 'text') : converse(c, 'text'))} disabled={busy} />

              <div className="utility">
                <button type="button" className="btn ghost sm" onClick={() => setShowAuth(true)}>
                  <Fingerprint size={14} /> {voiceProfile?.enrolled ? 'Voice Profile' : 'Add My Voice'}
                </button>
                <button type="button" className="btn ghost sm" onClick={() => setShowNotes(true)}>
                  <FileText size={14} /> Notes ({notes.length})
                </button>
                <button type="button" className="btn ghost sm" onClick={cycleTheme}>
                  <Palette size={14} /> Theme: {theme.toUpperCase()}
                </button>
                <button type="button" className="btn ghost sm" onClick={() => converse('repeat that', 'text')} disabled={busy}>
                  <Repeat size={14} /> Repeat
                </button>
                <button type="button" className="btn ghost sm" onClick={clearChat}>
                  <Trash2 size={14} /> Clear chat
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    clearChat();
                    setVerified(false);
                    boot();
                  }}
                >
                  <RotateCcw size={14} /> Reset JARVIS
                </button>
              </div>
            </>
          )}
        </section>

        <aside className="col right">
          <ChatPanel messages={messages} status={status} interim={recog.listening ? recog.interim : ''} />
        </aside>
      </main>

      {showAuth && (
        <AuthModal
          voiceProfile={voiceProfile}
          onClose={() => setShowAuth(false)}
          onVerified={(profile) => {
            setVoiceProfile(profile);
            setVerified(true);
            const msg = `Voice signature calibrated & active for ${USER.name} (${profile.pitch}, ${profile.voiceBand}).`;
            addMessage('jarvis', msg);
            speakReply(`Voice signature registered, ${USER.name}. I recognise your voice.`, runId.current);
          }}
          onClearProfile={() => {
            setVoiceProfile(null);
            setVerified(false);
          }}
        />
      )}
      {showDash && <DashboardModal onClose={() => setShowDash(false)} stats={{ ...stats, uptime }} info={info} verified={verified} voiceProfile={voiceProfile} />}
      {showNotes && (
        <NotesModal
          onClose={() => setShowNotes(false)}
          notes={notes}
          onClearNotes={() => {
            setNotes([]);
            try {
              localStorage.removeItem('jarvis_notes');
            } catch {}
          }}
        />
      )}
      {showVoiceSettings && <VoiceSettingsModal onClose={() => setShowVoiceSettings(false)} tts={tts} />}
    </div>
  );
}
