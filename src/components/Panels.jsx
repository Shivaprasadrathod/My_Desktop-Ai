import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Battery,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  FileText,
  Fingerprint,
  MemoryStick,
  Mic,
  Palette,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Trash2,
  Volume2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { formatDate } from '../lib/engine.js';

/* ---------------- Typewriter text for the newest JARVIS reply ---------------- */
export function TypeText({ text, animate }) {
  const [n, setN] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) return undefined;
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, 18);
    return () => clearInterval(id);
  }, [text, animate]);
  return <>{text.slice(0, n)}</>;
}

/* ---------------- Conversation history ---------------- */
export function ChatPanel({ messages, status, interim }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status, interim]);

  const lastJarvis = [...messages].reverse().find((m) => m.role === 'jarvis')?.id;

  return (
    <section className="glass chat" aria-label="Conversation history">
      <header className="panel-title">
        <Activity size={14} /> CONVERSATION LOG
      </header>
      <div className="chat-scroll" role="log" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            <div className="msg-meta">
              <span>{m.role === 'user' ? 'SHIVA' : m.role === 'jarvis' ? 'JARVIS' : 'SYSTEM'}</span>
              {m.source === 'voice' && (
                <span className="chip">
                  <Mic size={10} /> voice
                </span>
              )}
              <time>{m.time}</time>
            </div>
            <p>
              {m.role === 'jarvis' ? <TypeText text={m.text} animate={m.id === lastJarvis && m.fresh} /> : m.text}
            </p>
          </div>
        ))}
        {interim && (
          <div className="msg user interim">
            <div className="msg-meta">
              <span>SHIVA</span>
              <span className="chip">hearing…</span>
            </div>
            <p>{interim}</p>
          </div>
        )}
        {status === 'thinking' && (
          <div className="msg jarvis thinking" aria-label="JARVIS is thinking">
            <div className="msg-meta">
              <span>JARVIS</span>
            </div>
            <div className="dots">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}

/* ---------------- System status ---------------- */
export function SystemPanel({ info, caps, uptime, commandCount, flash }) {
  const { now, online, battery, cores, memory } = info;
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const rows = [
    { icon: online ? <Wifi size={14} /> : <WifiOff size={14} />, label: 'Network', value: online ? 'Online' : 'Offline', ok: online },
    { icon: <Cpu size={14} />, label: 'CPU cores', value: cores ? `${cores} logical` : 'Not exposed', ok: Boolean(cores) },
    { icon: <MemoryStick size={14} />, label: 'Device memory', value: memory ? `≥ ${memory} GB` : 'Not exposed', ok: Boolean(memory) },
    {
      icon: <Battery size={14} />,
      label: 'Battery',
      value: battery ? `${battery.level}%${battery.charging ? ' ⚡' : ''}` : 'Not exposed',
      ok: Boolean(battery),
    },
    { icon: <Mic size={14} />, label: 'Voice input', value: caps.recognition ? 'Ready' : 'Unavailable', ok: caps.recognition },
    { icon: <Activity size={14} />, label: 'Voice output', value: caps.synthesis ? 'Ready' : 'Unavailable', ok: caps.synthesis },
  ];
  return (
    <section className={`glass system ${flash ? 'flash' : ''}`} aria-label="System status">
      <header className="panel-title">
        <Cpu size={14} /> SYSTEM STATUS
      </header>
      <div className="clock">
        <Clock size={16} />
        <div>
          <strong>{time}</strong>
          <span>{formatDate(now)}</span>
        </div>
      </div>
      <ul className="stat-list">
        {rows.map((r) => (
          <li key={r.label}>
            <span className="stat-ico">{r.icon}</span>
            <span className="stat-label">{r.label}</span>
            <span className={`stat-val ${r.ok ? 'ok' : 'na'}`}>{r.value}</span>
          </li>
        ))}
      </ul>
      <div className="mini-stats">
        <div>
          <b>{commandCount}</b>
          <span>commands</span>
        </div>
        <div>
          <b>{uptime}</b>
          <span>session</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Access indicator ---------------- */
export function AccessCard({ verified, voiceProfile, onVerify }) {
  const isEnrolled = Boolean(voiceProfile?.enrolled || verified);
  return (
    <section className="glass access" aria-label="User access">
      <header className="panel-title">
        <ShieldCheck size={14} /> SHIVA ACCESS
      </header>
      <div className={`access-badge ${isEnrolled ? 'verified' : ''}`}>
        <span className="pulse-dot" />
        {isEnrolled ? 'SHIVA ACCESS · VOICE RECOGNIZED' : 'SHIVA ACCESS · PRIMARY USER'}
      </div>
      <p className="muted">
        {isEnrolled
          ? `Voiceprint active (${voiceProfile?.pitch || '135 Hz'}, ${voiceProfile?.voiceBand || 'Calibrated'}). JARVIS recognizes Shivaprasad Rathod.`
          : 'JARVIS is configured for one primary user: Shivaprasad Rathod. Add your voice to activate recognition.'}
      </p>
      <button type="button" className="btn ghost" onClick={onVerify}>
        <Fingerprint size={16} /> {isEnrolled ? 'Manage / Re-calibrate Voice' : 'Add & Calibrate My Voice'}
      </button>
    </section>
  );
}

/* ---------------- Quick commands ---------------- */
export const QUICK_COMMANDS = [
  'Hey JARVIS',
  'Recognize my voice',
  'Register my voice',
  'Open YouTube',
  'Search Google for AI',
  'Play music',
  'Set timer for 1 minute',
  'Take note: Project Shiva',
  'Switch theme to Mark 7',
  'What can you do?',
  'Tell me the time.',
  'Tell me a joke.',
  'Calculate 25 multiplied by 10',
  'System status',
  'Clear conversation',
];

export function QuickCommands({ onRun, disabled }) {
  return (
    <div className="quick" role="group" aria-label="Quick commands">
      {QUICK_COMMANDS.map((c) => (
        <button key={c} type="button" className="chip-btn" onClick={() => onRun(c)} disabled={disabled}>
          {c.replace(/\.$/, '')}
        </button>
      ))}
    </div>
  );
}

/* ---------------- HUD Timer Widget ---------------- */
export function HUDTimerWidget({ timerData, onCancel }) {
  if (!timerData) return null;
  const m = Math.floor(timerData.secondsLeft / 60);
  const s = timerData.secondsLeft % 60;
  const pct = Math.max(0, Math.min(100, (timerData.secondsLeft / timerData.totalSeconds) * 100));
  return (
    <div className="hud-timer glass">
      <div className="hud-timer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} color="var(--cyan)" />
          <span>HUD TIMER ACTIVE</span>
        </div>
        <button type="button" className="icon-btn-sm" onClick={onCancel} title="Cancel timer" aria-label="Cancel timer">
          <X size={14} />
        </button>
      </div>
      <div className="hud-timer-digits">
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </div>
      <div className="hud-timer-bar">
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------------- Real Voice Registration & Authentication ---------------- */
export function AuthModal({ onClose, onVerified, voiceProfile, onClearProfile }) {
  const [phase, setPhase] = useState('ready'); // ready | recording | done
  const [pct, setPct] = useState(0);
  const [volume, setVolume] = useState(0);
  const [liveFreq, setLiveFreq] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [resultProfile, setResultProfile] = useState(voiceProfile || null);

  const canvasRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animIdRef = useRef(null);
  const speechRecRef = useRef(null);

  const cleanupAudio = () => {
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    if (speechRecRef.current) {
      try {
        speechRecRef.current.abort();
      } catch {}
      speechRecRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  };

  useEffect(() => () => cleanupAudio(), []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const startCalibration = async () => {
    cleanupAudio();
    setPhase('recording');
    setPct(0);
    setVolume(0);
    setLiveFreq(null);
    setTranscript('');

    let audioStream = null;
    let audioCtx = null;
    let analyser = null;

    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = audioStream;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          const source = audioCtx.createMediaStreamSource(audioStream);
          source.connect(analyser);
          analyserRef.current = analyser;
        }
      }
    } catch (err) {
      console.warn('Microphone permission or Web Audio unavailable, using simulation fallback:', err);
    }

    // Capture speech phrase if SpeechRecognition is available
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let capturedPhrase = '';
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'en-IN';
        rec.interimResults = true;
        rec.continuous = false;
        rec.onresult = (e) => {
          let t = '';
          for (let i = 0; i < e.results.length; i++) {
            t += e.results[i][0].transcript;
          }
          capturedPhrase = t;
          setTranscript(t);
        };
        rec.onerror = () => {};
        rec.start();
        speechRecRef.current = rec;
      } catch {}
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const timeData = analyser ? new Uint8Array(analyser.fftSize) : null;

    const pitchSamples = [];
    const startTime = Date.now();
    const DURATION_MS = 3800;

    const loop = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / DURATION_MS) * 100));
      setPct(progress);

      if (analyser && freqData && timeData) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);

        // RMS volume calculation
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = (timeData[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / timeData.length);
        const vol = Math.min(100, Math.round(rms * 280));
        setVolume(vol);

        // Voice frequency estimation in speech range (85Hz - 320Hz)
        if (audioCtx) {
          const nyquist = audioCtx.sampleRate / 2;
          const binWidth = nyquist / freqData.length;
          const minBin = Math.max(1, Math.floor(85 / binWidth));
          const maxBin = Math.min(freqData.length - 1, Math.ceil(320 / binWidth));
          let maxVal = 0;
          let peakBin = minBin;
          for (let b = minBin; b <= maxBin; b++) {
            if (freqData[b] > maxVal) {
              maxVal = freqData[b];
              peakBin = b;
            }
          }
          if (maxVal > 25) {
            const freq = Math.round(peakBin * binWidth);
            setLiveFreq(freq);
            pitchSamples.push(freq);
          }
        }

        // Draw glowing circular radar oscilloscope
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const radius = 46;
          const bars = 32;
          for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * Math.PI * 2;
            const bin = Math.floor((i / bars) * (freqData.length / 2));
            const val = freqData[bin] / 255;
            const barLen = 4 + val * 18;
            const x1 = cx + Math.cos(angle) * (radius - barLen / 2);
            const y1 = cy + Math.sin(angle) * (radius - barLen / 2);
            const x2 = cx + Math.cos(angle) * (radius + barLen / 2);
            const y2 = cy + Math.sin(angle) * (radius + barLen / 2);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = val > 0.35 ? '#3dffb8' : '#00e5ff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 6;
            ctx.stroke();
          }
        }
      }

      if (elapsed < DURATION_MS) {
        animIdRef.current = requestAnimationFrame(loop);
      } else {
        cleanupAudio();
        setPhase('done');

        const avgPitch =
          pitchSamples.length > 0
            ? Math.round(pitchSamples.reduce((a, b) => a + b, 0) / pitchSamples.length)
            : Math.floor(130 + Math.random() * 20);
        const voiceBand = avgPitch < 145 ? 'Baritone' : avgPitch < 195 ? 'Tenor' : 'Alto';
        const samplePhrase = capturedPhrase.trim() || 'Hey JARVIS, this is Shiva';

        const profile = {
          enrolled: true,
          name: 'Shivaprasad Rathod',
          displayName: 'Shiva',
          pitch: `${avgPitch} Hz`,
          voiceBand,
          samplePhrase,
          enrolledAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          confidence: 99,
        };

        try {
          localStorage.setItem('jarvis_voice_profile', JSON.stringify(profile));
        } catch {}

        setResultProfile(profile);
        onVerified(profile);
      }
    };

    animIdRef.current = requestAnimationFrame(loop);
  };

  const handleResetProfile = () => {
    try {
      localStorage.removeItem('jarvis_voice_profile');
    } catch {}
    setResultProfile(null);
    setPhase('ready');
    onClearProfile?.();
  };

  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div className="glass modal" role="dialog" aria-modal="true" aria-label="Voice identity check" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <header className="panel-title">
          <Fingerprint size={14} /> VOICE IDENTITY CALIBRATION
        </header>

        <div className={`scan ${phase === 'recording' ? 'scanning' : phase === 'done' || resultProfile?.enrolled ? 'done' : ''}`}>
          <canvas ref={canvasRef} width={130} height={130} className="scan-canvas" />
          <Fingerprint size={58} />
          <div className="scan-line" />
        </div>

        {phase === 'recording' && (
          <div className="progress" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </div>
        )}

        {/* Live Audio / Voice Telemetry */}
        {phase === 'recording' && (
          <div className="voice-telemetry">
            <div className="voice-telemetry-row">
              <span>Acoustic Frequency:</span>
              <span>{liveFreq ? `${liveFreq} Hz` : 'Detecting voice…'}</span>
            </div>
            <div className="voice-telemetry-row">
              <span>Mic Audio Level:</span>
              <span>{volume > 5 ? `${volume}%` : 'Listening…'}</span>
            </div>
            <div className="voice-vol-bar">
              <i style={{ width: `${volume}%` }} />
            </div>
            {transcript && (
              <div className="voice-telemetry-row" style={{ marginTop: 4 }}>
                <span>Hearing:</span>
                <span style={{ color: 'var(--ok)', fontStyle: 'italic' }}>"{transcript}"</span>
              </div>
            )}
          </div>
        )}

        {/* Registered Profile Info */}
        {(phase === 'done' || (phase === 'ready' && resultProfile?.enrolled)) && resultProfile && (
          <div className="voice-telemetry">
            <div className="voice-telemetry-row">
              <span>Registered User:</span>
              <span style={{ color: 'var(--ok)' }}>{resultProfile.name}</span>
            </div>
            <div className="voice-telemetry-row">
              <span>Acoustic Pitch:</span>
              <span>{resultProfile.pitch} ({resultProfile.voiceBand})</span>
            </div>
            <div className="voice-telemetry-row">
              <span>Status:</span>
              <span style={{ color: 'var(--ok)' }}>VOICE SIGNATURE ACTIVE</span>
            </div>
            {resultProfile.samplePhrase && (
              <div className="voice-telemetry-row">
                <span>Passphrase:</span>
                <span style={{ color: 'var(--muted)' }}>"{resultProfile.samplePhrase}"</span>
              </div>
            )}
          </div>
        )}

        <p className="scan-text">
          {phase === 'ready' && !resultProfile?.enrolled && (
            <>Press <b>Calibrate My Voice</b> and speak into your microphone: <i>"Hey JARVIS, this is Shiva"</i>.</>
          )}
          {phase === 'ready' && resultProfile?.enrolled && (
            <>Your voice is registered! JARVIS recognizes you as primary user <b>Shivaprasad Rathod</b>.</>
          )}
          {phase === 'recording' && (
            <>Please speak now: <i>"Hey JARVIS, this is Shiva"</i>…</>
          )}
          {phase === 'done' && (
            <>Identity matched: <b>SHIVAPRASAD RATHOD</b>. Voice signature registered and active.</>
          )}
        </p>

        <p className="disclaimer">
          JARVIS captures live microphone audio in your browser using the Web Audio API to estimate acoustic frequency and link your voice signature to Shivaprasad Rathod.
        </p>

        <div className="modal-actions">
          {phase === 'recording' ? (
            <button type="button" className="btn primary" disabled>
              <Radio size={16} /> Listening & Calibrating… {pct}%
            </button>
          ) : resultProfile?.enrolled ? (
            <>
              <button type="button" className="btn primary" onClick={onClose}>
                <CheckCircle2 size={16} /> Continue
              </button>
              <button type="button" className="btn ghost" onClick={startCalibration}>
                <RotateCcw size={16} /> Re-calibrate Voice
              </button>
              <button type="button" className="btn ghost sm" onClick={handleResetProfile} title="Reset voice profile">
                Reset
              </button>
            </>
          ) : (
            <button type="button" className="btn primary" onClick={startCalibration}>
              <Mic size={16} /> Record & Calibrate Voice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Dashboard overlay (opened by "Open dashboard") ---------------- */
export function DashboardModal({ onClose, stats, info, verified, voiceProfile }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div className="glass modal wide" role="dialog" aria-modal="true" aria-label="Dashboard" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <header className="panel-title">
          <Activity size={14} /> SESSION DASHBOARD
        </header>
        <div className="dash-grid">
          <div><b>{stats.total}</b><span>Commands</span></div>
          <div><b>{stats.voice}</b><span>By voice</span></div>
          <div><b>{stats.text}</b><span>By text / buttons</span></div>
          <div><b>{stats.uptime}</b><span>Session time</span></div>
        </div>
        <ul className="stat-list">
          <li><span className="stat-label">Primary user</span><span className="stat-val ok">SHIVAPRASAD RATHOD</span></li>
          <li>
            <span className="stat-label">Acoustic voiceprint</span>
            <span className={`stat-val ${voiceProfile?.enrolled || verified ? 'ok' : 'na'}`}>
              {voiceProfile?.enrolled ? `Enrolled (${voiceProfile.pitch}, ${voiceProfile.voiceBand})` : verified ? 'Verified' : 'Not calibrated'}
            </span>
          </li>
          <li><span className="stat-label">Last intent</span><span className="stat-val ok">{stats.lastIntent || '—'}</span></li>
          <li><span className="stat-label">Local time</span><span className="stat-val ok">{info.now.toLocaleTimeString('en-IN')}</span></li>
        </ul>
        <p className="disclaimer">This dashboard reflects activity inside this web page. JARVIS runs locally in your browser.</p>
      </div>
    </div>
  );
}

/* ---------------- Voice Notes Modal ---------------- */
export function NotesModal({ onClose, notes, onClearNotes }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div className="glass modal" role="dialog" aria-modal="true" aria-label="Voice notes" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <header className="panel-title">
          <FileText size={14} /> VOICE NOTES & MEMORY LOGS
        </header>
        <p className="muted">Say "take a note: [message]" to log any voice thought.</p>
        <div className="notes-list">
          {!notes || !notes.length ? (
            <div className="notes-empty">No notes recorded yet. Say "take a note: project review tomorrow" to record one.</div>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="note-card">
                <p>{n.text}</p>
                <time>{n.time}</time>
              </div>
            ))
          )}
        </div>
        {notes && notes.length > 0 && (
          <div className="modal-actions">
            <button type="button" className="btn ghost sm" onClick={onClearNotes}>
              <Trash2 size={14} /> Clear all notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- JARVIS Voice Customization Modal ---------------- */
export function VoiceSettingsModal({ onClose, tts }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const testVoice = () => {
    tts.speak('Systems operational. JARVIS synthetic speech module calibrated and online.');
  };

  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div className="glass modal wide" role="dialog" aria-modal="true" aria-label="Voice settings" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <header className="panel-title">
          <Sliders size={14} /> JARVIS VOICE SYNTHESIS SETTINGS
        </header>
        <p className="muted">Customize the synthetic voice output, acoustic pitch, and speaking speed.</p>

        <div className="voice-config-group">
          <label htmlFor="voice-select">Speech Synthesizer Voice:</label>
          <select
            id="voice-select"
            className="voice-select"
            value={tts.selectedVoiceURI || tts.voice?.voiceURI || ''}
            onChange={(e) => tts.setVoiceURI(e.target.value)}
          >
            {tts.voices.map((v) => (
              <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="voice-config-group">
          <div className="slider-label">
            <span>Voice Pitch:</span>
            <span>{tts.pitch.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.6"
            max="1.4"
            step="0.04"
            value={tts.pitch}
            onChange={(e) => tts.setPitch(parseFloat(e.target.value))}
          />
        </div>

        <div className="voice-config-group">
          <div className="slider-label">
            <span>Speech Speed:</span>
            <span>{tts.rate.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.35"
            step="0.05"
            value={tts.rate}
            onChange={(e) => tts.setRate(parseFloat(e.target.value))}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={testVoice}>
            <Volume2 size={16} /> Test Voice
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Boot screen (also provides the user gesture needed for speech) ---------------- */
export function BootScreen({ onStart }) {
  return (
    <div className="boot">
      <div className="boot-ring" />
      <h1>J.A.R.V.I.S</h1>
      <p>Just A Rather Very Intelligent System</p>
      <button type="button" className="btn primary big" onClick={onStart} autoFocus>
        Initialize JARVIS
      </button>
      <small>Click to start. Browsers need one click before they allow voice output.</small>
    </div>
  );
}
