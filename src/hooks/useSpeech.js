import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SpeechRecognitionImpl =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/* ------------------------------------------------------------------ */
/* Speech recognition (microphone -> text)                             */
/* ------------------------------------------------------------------ */
export function useSpeechRecognition({ onFinal, onEnd, onError } = {}) {
  const recRef = useRef(null);
  const handlers = useRef({ onFinal, onEnd, onError });
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const supported = Boolean(SpeechRecognitionImpl);

  useEffect(() => {
    handlers.current = { onFinal, onEnd, onError };
  });

  const start = useCallback(() => {
    if (!SpeechRecognitionImpl || recRef.current) return false;
    const rec = new SpeechRecognitionImpl();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    let errored = false;

    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim((finalText + interimText).trim());
    };
    rec.onerror = (e) => {
      errored = true;
      if (e.error !== 'aborted') handlers.current.onError?.(e.error);
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setInterim('');
      const text = finalText.trim();
      if (text) handlers.current.onFinal?.(text);
      else handlers.current.onEnd?.({ errored });
    };

    recRef.current = rec;
    try {
      rec.start();
      return true;
    } catch {
      recRef.current = null;
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const abort = useCallback(() => {
    try {
      recRef.current?.abort();
    } catch {
      /* already stopped */
    }
  }, []);

  useEffect(() => () => abort(), [abort]);

  return { supported, listening, interim, start, stop, abort };
}

/* ------------------------------------------------------------------ */
/* Speech synthesis (text -> voice)                                    */
/* ------------------------------------------------------------------ */
const PREFERRED_VOICES = [
  /google uk english male/i,
  /microsoft (ryan|george|thomas|ravi)/i,
  /daniel/i,
  /arthur/i,
  /google uk english female/i,
  /en[-_]gb/i,
  /en[-_]in/i,
];

export function useSpeechSynthesis() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => {
    try {
      return localStorage.getItem('jarvis_custom_voice') || '';
    } catch {
      return '';
    }
  });
  const [pitch, setPitchState] = useState(() => {
    try {
      const p = localStorage.getItem('jarvis_voice_pitch');
      return p ? parseFloat(p) : 0.95;
    } catch {
      return 0.95;
    }
  });
  const [rate, setRateState] = useState(() => {
    try {
      const r = localStorage.getItem('jarvis_voice_rate');
      return r ? parseFloat(r) : 1.0;
    } catch {
      return 1.0;
    }
  });
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const genRef = useRef(0);

  const setVoiceURI = useCallback((uri) => {
    setSelectedVoiceURI(uri);
    try {
      localStorage.setItem('jarvis_custom_voice', uri);
    } catch {}
  }, []);

  const setPitch = useCallback((p) => {
    setPitchState(p);
    try {
      localStorage.setItem('jarvis_voice_pitch', String(p));
    } catch {}
  }, []);

  const setRate = useCallback((r) => {
    setRateState(r);
    try {
      localStorage.setItem('jarvis_voice_rate', String(r));
    } catch {}
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    if (!supported) return undefined;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, [supported]);

  const voice = useMemo(() => {
    if (!voices.length) return null;
    if (selectedVoiceURI) {
      const userMatch = voices.find((v) => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI);
      if (userMatch) return userMatch;
    }
    const english = voices.filter((v) => /^en/i.test(v.lang));
    for (const re of PREFERRED_VOICES) {
      const hit = english.find((v) => re.test(v.name) || re.test(v.lang));
      if (hit) return hit;
    }
    return english[0] || voices[0];
  }, [voices, selectedVoiceURI]);

  const cancel = useCallback(() => {
    genRef.current += 1;
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  /**
   * Speak text. `onEnd(spoken)` is always called exactly once.
   * `spoken` is false if audio never started (muted, unsupported, or blocked by the browser).
   * Returns true if it attempted real speech.
   */
  const speak = useCallback(
    (text, { onStart, onEnd } = {}) => {
      if (!supported || mutedRef.current || !text) {
        onEnd?.(false);
        return false;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      const gen = (genRef.current += 1);
      const u = new SpeechSynthesisUtterance(text);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = 'en-GB';
      }
      u.rate = rate;
      u.pitch = pitch;
      u.volume = 1;

      let started = false;
      let finished = false;
      const finish = (spoken) => {
        if (finished) return;
        finished = true;
        clearTimeout(guard);
        if (gen === genRef.current) onEnd?.(spoken);
      };
      // Browsers can silently block speech without a user gesture; do not hang forever.
      const guard = setTimeout(() => {
        if (!started) {
          synth.cancel();
          finish(false);
        }
      }, 2500);

      u.onstart = () => {
        started = true;
        onStart?.();
      };
      u.onend = () => finish(started);
      u.onerror = () => finish(started);
      synth.speak(u);
      return true;
    },
    [supported, voice, pitch, rate]
  );

  return {
    supported,
    voices,
    voice,
    selectedVoiceURI,
    setVoiceURI,
    pitch,
    setPitch,
    rate,
    setRate,
    muted,
    setMuted,
    speak,
    cancel,
  };
}
