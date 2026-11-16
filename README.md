# JARVIS — Personal AI Voice Assistant (frontend demo)

A futuristic JARVIS-style assistant interface built with React, Vite, Lucide icons and the browser Web Speech API.
It runs entirely in the browser with local demo logic: no backend, no API keys, no paid services.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build`, `npm run preview`, `npm run test:engine`, `npx vitest run`.

## What it does

- Boot screen, then JARVIS greets Shiva by voice and text (a click is needed first, because browsers block audio until you interact).
- Mic button: speak a command, see live recognised text, get a spoken reply. Text input and quick-command buttons work everywhere.
- Local command engine (`src/lib/engine.js`): greetings, identity, capabilities, real current time/date, jokes, a safe calculator (no `eval`), system status, repeat / "what did I ask", dashboard, voice-auth demo, demo mode.
- Orb states: idle (slow pulse), listening (ripples), thinking (fast spin), speaking (sound bars).
- SHIVA ACCESS indicator and a simulated voice-authentication dialog, clearly labelled as a demo.
- DEMO MODE: clean layout for screen recording that plays scripted sample interactions.
- Responsive for desktop and mobile; respects `prefers-reduced-motion`.

## Honest limits (worth saying in an interview)

- Voice authentication is a **simulation**. No audio is analysed and it is not biometric security.
- JARVIS does **not** control your computer. Commands like "open Chrome" are declined by design.
- Speech recognition works in Chrome and Edge (Chrome sends audio to a speech service, so it needs internet). Other browsers fall back to text input.
- System status shows only what the browser exposes (cores, memory, battery, network); unavailable values are labelled as such.

## Structure

```
src/
  App.jsx                 state machine (idle/listening/thinking/speaking), demo mode
  lib/engine.js           command logic (pure JS, unit-tested)
  hooks/useSpeech.js      SpeechRecognition + SpeechSynthesis wrappers
  hooks/useSystemInfo.js  clock, network, battery, cores
  components/             Orb, Waveform, Particles, Panels (chat, system, auth, dashboard, boot)
  styles.css              theme and animations
```
