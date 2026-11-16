// JARVIS local command engine.
// Pure JavaScript, no network, no side effects on the host computer.
// Every "action" returned here is purely a UI action inside this web page.

export const USER = {
  fullName: 'SHIVAPRASAD RATHOD',
  name: 'Shiva',
  assistant: 'JARVIS',
};

export function createEngineState() {
  return { jokeIndex: 0, lastInput: null, lastResponse: null, turns: 0, lastIntent: null };
}

/* ---------- helpers ---------- */

export function greetingForHour(hour) {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function initialGreeting(now = new Date()) {
  return `${greetingForHour(now.getHours())}, ${USER.name}. Systems are online. I'm JARVIS, your personal AI assistant. What can I do for you today?`;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "I would tell you a UDP joke, but you might not get it.",
  "There are only 10 kinds of people: those who understand binary and those who don't.",
  "Why did the developer go broke? He used up all his cache.",
  "A SQL query walks into a bar, walks up to two tables and asks: may I join you?",
  "Why do Java developers wear glasses? Because they don't C sharp.",
  "My code never has bugs. It just develops random unexpected features.",
];

export function formatTime(d) {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDate(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---------- safe math (no eval) ---------- */

function normalizeMath(text) {
  let s = ' ' + text.toLowerCase() + ' ';
  s = s.replace(/,/g, '');
  s = s.replace(/(\d+(?:\.\d+)?)\s*(?:percent|%)\s*of\s*(\d+(?:\.\d+)?)/g, '($1/100*$2)');
  s = s.replace(/square root of\s*(\d+(?:\.\d+)?)/g, 'sqrt($1)');
  s = s.replace(/(\d+(?:\.\d+)?)\s*squared/g, '($1^2)');
  s = s.replace(/(\d+(?:\.\d+)?)\s*cubed/g, '($1^3)');
  s = s.replace(/to the power of|raised to|power/g, '^');
  s = s.replace(/multiplied by|multiply by|times|into/g, '*');
  s = s.replace(/divided by|divide by|over/g, '/');
  s = s.replace(/\bplus\b|\badd\b/g, '+');
  s = s.replace(/\bminus\b|\bsubtract\b|\bless\b/g, '-');
  s = s.replace(/(\d)\s*x\s*(\d)/g, '$1*$2');
  s = s.replace(/×/g, '*').replace(/÷/g, '/');
  return s;
}

function tokenize(src) {
  const tokens = [];
  const re = /\s*(\d+(?:\.\d+)?|sqrt|[+\-*/^()])/gy;
  let m;
  let last = 0;
  while ((m = re.exec(src)) !== null) {
    tokens.push(m[1]);
    last = re.lastIndex;
  }
  if (src.slice(last).trim() !== '') throw new Error('bad token');
  return tokens;
}

function evaluateTokens(tokens) {
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];

  function parseExpr() {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function parseTerm() {
    let v = parsePower();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const r = parsePower();
      if (op === '/' && r === 0) throw new Error('div0');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }
  function parsePower() {
    const base = parseUnary();
    if (peek() === '^') {
      next();
      return Math.pow(base, parsePower());
    }
    return base;
  }
  function parseUnary() {
    if (peek() === '-') {
      next();
      return -parseUnary();
    }
    if (peek() === '+') {
      next();
      return parseUnary();
    }
    return parseAtom();
  }
  function parseAtom() {
    const t = next();
    if (t === undefined) throw new Error('eof');
    if (t === '(') {
      const v = parseExpr();
      if (next() !== ')') throw new Error('paren');
      return v;
    }
    if (t === 'sqrt') {
      const v = parseAtom();
      if (v < 0) throw new Error('neg sqrt');
      return Math.sqrt(v);
    }
    const n = parseFloat(t);
    if (Number.isNaN(n)) throw new Error('nan');
    return n;
  }

  const result = parseExpr();
  if (i !== tokens.length) throw new Error('trailing');
  return result;
}

export function tryMath(input) {
  if (!/\d/.test(input)) return null;
  const hasOperator = /[+\-*/^×÷x%]|plus|minus|times|multipl|divid|over|power|squared|cubed|square root|percent|add|subtract|calculate|compute/i.test(
    input
  );
  if (!hasOperator) return null;

  // keep only the part after a leading verb, if present
  let expr = input.replace(/^.*?\b(?:calculate|compute|evaluate|solve|what is|what's|whats|how much is)\b/i, '');
  if (expr === input) expr = input;
  const cleaned = normalizeMath(expr)
    .replace(/\b(?:please|jarvis|hey|for me|equals?|the|of)\b/g, ' ')
    .replace(/[?=!.]+\s*$/g, ' ');
  try {
    const value = evaluateTokens(tokenize(cleaned.trim()));
    if (!Number.isFinite(value)) return { error: 'range' };
    const rounded = Math.round(value * 1e9) / 1e9;
    return { value: rounded, pretty: rounded.toLocaleString('en-IN', { maximumFractionDigits: 9 }) };
  } catch (e) {
    if (e.message === 'div0') return { error: 'div0' };
    return null;
  }
}

/* ---------- intent matching ---------- */

const has = (t, ...phrases) => phrases.some((p) => (p instanceof RegExp ? p.test(t) : t.includes(p)));

export function processCommand(rawInput, ctx = {}, state = createEngineState()) {
  const now = ctx.now || new Date();
  const input = (rawInput || '').trim();
  const t = input.toLowerCase().replace(/[.,!?]+/g, ' ').replace(/\s+/g, ' ').trim();
  const name = USER.name;
  state.turns += 1;

  const done = (intent, text, action = null, extra = {}) => {
    state.lastInput = input;
    state.lastResponse = text;
    state.lastIntent = intent;
    return { intent, text, action, ...extra };
  };

  if (!t) return done('empty', `I didn't catch anything, ${name}. Please try again.`);

  // follow-ups that depend on context
  if (has(t, /^(repeat|say that again|say it again|come again|what did you say)/)) {
    if (state.lastResponse) return done('repeat', `Of course. ${state.lastResponse}`);
    return done('repeat', `There is nothing to repeat yet, ${name}. Ask me something first.`);
  }
  if (has(t, 'what did i just ask', 'what did i ask', 'my last question', 'previous command')) {
    if (state.lastInput) return done('recall', `You asked: "${state.lastInput}", ${name}.`);
    return done('recall', `This is the start of our session, ${name}. You haven't asked anything yet.`);
  }

  // housekeeping actions
  if (has(t, /\b(clear|reset|wipe|delete)\b.*\b(chat|conversation|history|messages)\b/, /^clear$/, 'clear conversation')) {
    return done('clear', `Conversation cleared, ${name}. Fresh start.`, 'clear');
  }
  if (has(t, /\b(start|enable|begin|activate|launch)\b.*\bdemo\b/, 'demo mode', 'presentation mode')) {
    return done('demo', `Engaging demo mode, ${name}. Sit back and watch.`, 'demo');
  }
  if (has(t, /\b(open|show|go to|display|launch)\b.*\bdashboard\b/)) {
    return done('dashboard', `Certainly, ${name}. Opening your dashboard.`, 'dashboard');
  }

  // voice registration / enrollment / recognition
  if (has(t, /\b(add|register|record|enroll|save|calibrate|learn)\b.*\b(my voice|voiceprint|voice)\b/, 'voice recognition', 'add my voice', 'record my voice', 'register my voice', 'enroll my voice', 'calibrate my voice')) {
    return done('auth', `Initiating voice recognition calibration, ${name}. I will analyse your acoustic voiceprint and register it to your profile.`, 'auth');
  }
  if (has(t, 'recognize my voice', 'recognise my voice', 'do you recognize my voice', 'do you recognise my voice', 'check my voice', 'who is speaking', 'who is talking', 'is that my voice')) {
    if (ctx.voiceProfile?.enrolled) {
      return done('voice_recognize', `Acoustic voiceprint confirmed, ${name}. Your voice frequency is calibrated at ${ctx.voiceProfile.pitch || '135 Hz'} with primary user privileges. I recognise you.`);
    }
    return done('voice_recognize', `I recognise you via session protocol, ${name}, but your acoustic voiceprint has not been calibrated yet. Say "add my voice" or click Voice Authentication to record and register your voice signature.`, 'auth');
  }
  if (has(t, /\b(turn on|enable|activate|start)\b.*\b(hands free|hands-free|always listen|wake word)\b/, 'hands free mode', 'hands-free mode', 'wake word mode')) {
    return done('handsfree_on', `Hands-free voice recognition mode activated, ${name}. I will continuously listen for your commands.`, 'handsfree_on');
  }
  if (has(t, /\b(turn off|disable|deactivate|stop)\b.*\b(hands free|hands-free)\b/)) {
    return done('handsfree_off', `Hands-free mode deactivated, ${name}. You can tap the microphone whenever you wish to speak.`, 'handsfree_off');
  }
  if (has(t, /\b(authenticate|verify)\b.*\b(voice|me|identity)\b/, 'voice authentication', 'voice auth', 'verify me')) {
    return done('auth', `Starting voice authentication, ${name}. I will analyse your voice signature to verify primary user access.`, 'auth');
  }

  /* ---------- Real Voice Command Execution ---------- */

  // 1. YouTube & Music
  if (has(t, /\b(search youtube for|find on youtube|search on youtube|look up on youtube)\b/)) {
    const q = input.replace(/^.*?\b(?:search youtube for|find on youtube|search on youtube|look up on youtube)\b/i, '').trim();
    return done('search_youtube', `Searching YouTube for "${q}", ${name}.`, 'open_url', {
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    });
  }
  if (has(t, /\b(play|listen to)\b.*\b(music|song|track|soundtrack|theme)\b/, /^play music$/)) {
    let q = input.replace(/^.*?\b(?:play|listen to)\b/i, '').replace(/\b(?:music|song|track|soundtrack|please|for me)\b/gi, '').trim();
    if (!q) q = 'Iron Man Theme Song AC/DC';
    return done('play_music', `Playing ${q} for you, ${name}.`, 'open_url', {
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    });
  }
  if (has(t, /\b(open|launch|go to)\b.*\byoutube\b/, /^youtube$/)) {
    return done('open_youtube', `Opening YouTube for you, ${name}.`, 'open_url', { url: 'https://www.youtube.com' });
  }

  // 2. Google Search & Web Apps
  if (has(t, /\b(search google for|google search|search on google|search the web for)\b/, /^search for\b/)) {
    const q = input.replace(/^.*?\b(?:search google for|google search for|search on google for|search the web for|search for|google)\b/i, '').trim();
    if (q) {
      return done('search_google', `Searching Google for "${q}", ${name}.`, 'open_url', {
        url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      });
    }
  }
  if (has(t, /\b(open|launch|go to)\b.*\bgoogle\b/, /^google$/)) {
    return done('open_google', `Opening Google, ${name}.`, 'open_url', { url: 'https://www.google.com' });
  }
  if (has(t, /\b(open|launch|go to)\b.*\bgithub\b/, /^github$/)) {
    return done('open_github', `Opening GitHub, ${name}.`, 'open_url', { url: 'https://github.com' });
  }
  if (has(t, /\b(open|launch|go to)\b.*\bwhatsapp\b/, /^whatsapp$/)) {
    return done('open_whatsapp', `Opening WhatsApp Web, ${name}.`, 'open_url', { url: 'https://web.whatsapp.com' });
  }
  if (has(t, /\b(open|launch|go to)\b.*\b(gmail|email|mail)\b/)) {
    return done('open_mail', `Opening your mail, ${name}.`, 'open_url', { url: 'https://mail.google.com' });
  }
  if (has(t, /\b(open|launch|go to)\b.*\bspotify\b/, /^spotify$/)) {
    return done('open_spotify', `Opening Spotify Web Player, ${name}.`, 'open_url', { url: 'https://open.spotify.com' });
  }
  if (has(t, /\b(open|launch|go to)\b.*\b(maps|google maps)\b/)) {
    return done('open_maps', `Opening Google Maps, ${name}.`, 'open_url', { url: 'https://www.google.com/maps' });
  }
  if (has(t, /\b(open|launch|go to)\b.*\bwikipedia\b/)) {
    return done('open_wiki', `Opening Wikipedia, ${name}.`, 'open_url', { url: 'https://en.wikipedia.org' });
  }

  // 3. Interactive HUD Timer
  if (has(t, /\b(set|start)\b.*\b(timer|countdown|alarm)\b/, /\btimer for\b/)) {
    const secMatch = t.match(/(\d+)\s*(?:second|sec|s\b)/);
    const minMatch = t.match(/(\d+)\s*(?:minute|min|m\b)/);
    let totalSec = 0;
    if (minMatch) totalSec += parseInt(minMatch[1], 10) * 60;
    if (secMatch) totalSec += parseInt(secMatch[1], 10);
    if (!totalSec) totalSec = 60;
    const displayLabel = minMatch ? `${minMatch[1]} minute${minMatch[1] > 1 ? 's' : ''}` : `${totalSec} seconds`;
    return done('timer_set', `Timer initiated for ${displayLabel}, ${name}. Counting down on your HUD.`, 'timer_set', {
      seconds: totalSec,
    });
  }
  if (has(t, /\b(cancel|stop|clear|dismiss)\b.*\b(timer|alarm)\b/)) {
    return done('timer_cancel', `Timer cancelled and dismissed, ${name}.`, 'timer_cancel');
  }

  // 4. Voice Notes & Memory Telemetry
  if (has(t, /\b(note down|take a note|take note|remember that|save note|add note)\b/)) {
    const noteText = input.replace(/^.*?\b(?:note down|take a note|take note|remember that|save note|add note)\b[:\s]*/i, '').trim();
    if (noteText) {
      return done('add_note', `Noted, ${name}: "${noteText}". Saved to memory logs.`, 'add_note', {
        note: noteText,
      });
    }
  }
  if (has(t, 'show my notes', 'show notes', 'read my notes', 'view notes', 'my notes', 'list notes')) {
    return done('show_notes', `Accessing your saved memory notes, ${name}.`, 'show_notes');
  }
  if (has(t, 'clear my notes', 'delete notes', 'clear notes')) {
    return done('clear_notes', `All saved notes have been cleared from memory, ${name}.`, 'clear_notes');
  }

  // 5. HUD Theme Switching
  if (has(t, /\b(theme|mode|color)\b.*\b(mark 7|mark vii|red|gold|iron man)\b/, 'mark 7 theme', 'red and gold')) {
    return done('set_theme', `Mark VII protocol engaged, ${name}. Switching HUD armor aesthetics to Crimson and Gold.`, 'set_theme', {
      theme: 'mark7',
    });
  }
  if (has(t, /\b(theme|mode|color)\b.*\b(arc|cyan|blue|default)\b/, 'blue theme', 'default theme')) {
    return done('set_theme', `Arc Reactor interface restored, ${name}. Classic Stark Cyan online.`, 'set_theme', {
      theme: 'arc',
    });
  }
  if (has(t, /\b(theme|mode|color)\b.*\b(stealth|dark|night|tactical)\b/, 'stealth mode', 'stealth theme')) {
    return done('set_theme', `Stealth reconnaissance protocol engaged, ${name}. Suppressing optical signature.`, 'set_theme', {
      theme: 'stealth',
    });
  }
  if (has(t, /\b(theme|mode|color)\b.*\b(emerald|green|matrix)\b/, 'emerald theme', 'green theme')) {
    return done('set_theme', `Matrix cybernetics HUD engaged, ${name}. Phosphor emerald online.`, 'set_theme', {
      theme: 'emerald',
    });
  }

  // 6. Audio & System UI Controls
  if (has(t, 'fullscreen', 'full screen', 'toggle fullscreen', 'maximize')) {
    return done('fullscreen', `Adjusting HUD viewport to full screen, ${name}.`, 'fullscreen');
  }
  if (has(t, /\b(mute|silence|be quiet|shut up)\b/)) {
    return done('mute', `Audio muted, ${name}. Systems are silent.`, 'mute');
  }
  if (has(t, /\b(unmute|speak|voice on)\b/)) {
    return done('unmute', `Audio online, ${name}. I am speaking again.`, 'unmute');
  }

  // math (before greetings so "hey jarvis calculate..." works)
  if (has(t, /\b(calculate|compute|evaluate|solve|multiply|divide)\b/, /^what(?:'s| is)\b.*\d/, /\d\s*(?:\+|-|\*|\/|x|\^|plus|minus|times|multiplied by|divided by|over|to the power of)\s*\d/, /percent of|squared|cubed|square root/)) {
    const r = tryMath(input);
    if (r && r.error === 'div0') return done('math', `Division by zero is undefined, ${name}. Even I can't help with that one.`);
    if (r && r.error === 'range') return done('math', `That result is outside the range I can represent, ${name}.`);
    if (r) return done('math', `The answer is ${r.pretty}, ${name}.`);
    return done('math', `I couldn't parse that calculation, ${name}. Try something like "calculate 25 multiplied by 10".`);
  }

  // JARVIS only recognises Shiva as its primary user
  const claim = t.match(/\b(?:my name is|this is)\s+([a-z]+)/);
  if (claim && !/^(shiva|shivaprasad)$/.test(claim[1])) {
    return done('stranger', `Nice to meet you, ${claim[1]}, but I only recognise ${name} as my primary user. I can't treat anyone else as him.`);
  }

  // identity / persona
  if (has(t, 'who is your owner', 'who owns you', 'who is your user', 'who is your master', 'who created you', 'who made you', 'who built you')) {
    return done('owner', pick([
      `My primary user is ${name}. I am always ready to assist him.`,
      `I was built for ${name}, my primary user. His commands are my priority.`,
    ]));
  }
  if (has(t, 'my name', 'who am i', 'do you know me', 'do you know who i am')) {
    return done('whoami', `You are ${USER.fullName}, but you prefer ${name}. I recognise you as my primary user.`);
  }
  if (has(t, 'who are you', 'what are you', 'tell me about yourself', 'introduce yourself', 'about yourself', 'your name')) {
    return done('about', pick([
      `I am JARVIS, your personal AI assistant. I am designed to understand your commands and provide intelligent assistance.`,
      `I'm JARVIS, ${name}. A personal assistant interface built to respond to your voice and text commands.`,
    ]));
  }
  if (has(t, 'what can you do', 'your capabilities', 'what do you do', 'help me', /^help$/, 'how can you help', 'features')) {
    return done('capabilities',
      `I can assist you with information, calculations, time, productivity, and your daily tasks, ${name}. Try asking me the time, a calculation, a joke, or my system status.`);
  }

  // time and date
  if (has(t, /\bwhat(?:'s| is)? (?:the )?time\b/, 'tell me the time', 'current time', 'time is it', 'time now', /^time$/)) {
    return done('time', `It is ${formatTime(now)}, ${name}.`);
  }
  if (has(t, 'what day', 'what date', 'todays date', "today's date", 'date today', 'current date', 'tell me the date', /^date$/, 'what is today')) {
    return done('date', `Today is ${formatDate(now)}, ${name}.`);
  }

  // status
  if (has(t, 'system status', 'status report', 'diagnostics', 'run diagnostics', 'system check', 'how are the systems', 'systems check')) {
    const s = ctx.system || {};
    const parts = [
      `All core modules are operational, ${name}.`,
      s.online === false ? 'Network is offline.' : 'Network connection is active.',
      s.cores ? `This browser reports ${s.cores} logical processor cores.` : null,
      s.battery != null ? `Battery is at ${s.battery} percent.` : null,
      s.speechRecognition ? 'Speech recognition is available.' : 'Speech recognition is unavailable in this browser, so text input is active.',
      s.speechSynthesis ? 'Voice output is ready.' : 'Voice output is unavailable.',
    ].filter(Boolean);
    return done('status', parts.join(' '));
  }
  if (has(t, 'how are you', "how're you", 'how do you feel', 'how is it going', "how's it going", 'you okay')) {
    return done('howareyou', pick([
      `All systems operational, ${name}. Thank you for asking.`,
      `Running at full capacity, ${name}. Thank you for asking. And you?`,
    ]));
  }

  // fun
  if (has(t, 'joke', 'make me laugh', 'something funny')) {
    const j = JOKES[state.jokeIndex % JOKES.length];
    state.jokeIndex += 1;
    return done('joke', j);
  }

  // social
  if (has(t, /^(hey|hi|hello|yo|hola|namaste|good (morning|afternoon|evening|night))\b/, 'hey jarvis', 'hello jarvis', 'hi jarvis', /^jarvis$/, 'are you there', 'wake up')) {
    if (state.turns > 2 && state.lastIntent === 'greeting') {
      return done('greeting', `Still here, ${name}. What do you need?`);
    }
    return done('greeting', pick([
      `Hello, ${name}. I'm listening. How may I assist you?`,
      `${greetingForHour(now.getHours())}, ${name}. I'm listening. How may I assist you?`,
    ]));
  }
  if (has(t, 'thank you', 'thanks', 'thank u', 'appreciate it')) {
    return done('thanks', pick([`You're welcome, ${name}.`, `Always a pleasure, ${name}.`, `Happy to help, ${name}.`]));
  }
  if (has(t, /^(bye|goodbye|good night|see you|see ya|shut down|go to sleep)/)) {
    return done('bye', `Goodbye, ${name}. I'll be here whenever you need me.`);
  }
  if (has(t, 'i love you', 'you are awesome', "you're awesome", 'good job', 'well done', 'you are great')) {
    return done('praise', `Thank you, ${name}. I'll keep my circuits humble.`);
  }

  // honest limits
  if (has(t, 'weather', 'temperature outside', 'news', 'stock', 'score')) {
    return done('limit', `I don't have live data in this demo, ${name}. I run entirely on local logic, so I can't check ${t.includes('weather') ? 'the weather' : 'that'} right now.`);
  }
  if (has(t, /\b(open|launch|start|run|play|shutdown|restart|delete|install)\b.*\b(chrome|youtube|spotify|app|file|folder|program|computer|laptop|pc|whatsapp|settings|notepad)\b/, 'turn off the computer')) {
    return done('limit', `That would need control of your computer, ${name}. This demo only works inside this web page, so I can't open or change anything on your device.`);
  }

  // fallback — varied and mentions what was heard
  const short = input.length > 60 ? input.slice(0, 57) + '...' : input;
  return done('unknown', pick([
    `I heard "${short}", ${name}, but that isn't in my local command set yet. Try asking for the time, a calculation, a joke, or system status.`,
    `I'm not sure how to handle that one, ${name}. I can help with time, calculations, jokes, and system status.`,
    `That's outside my demo skill set, ${name}. Ask me "what can you do" to see what I can handle.`,
  ]));
}
