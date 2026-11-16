// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

let recognitionInstance = null;

function installBrowserStubs() {
  window.matchMedia = window.matchMedia || ((q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
  HTMLCanvasElement.prototype.getContext = () =>
    new Proxy({}, { get: () => () => {}, set: () => true });
  Element.prototype.scrollIntoView = () => {};

  // speech synthesis: speak -> started -> ended
  window.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
  window.speechSynthesis = {
    getVoices: () => [{ name: 'Google UK English Male', lang: 'en-GB' }],
    addEventListener() {},
    removeEventListener() {},
    cancel() {},
    speak(u) {
      setTimeout(() => u.onstart?.(), 0);
      setTimeout(() => u.onend?.(), 40);
    },
  };

  // speech recognition: fires a fixed transcript when started
  window.SpeechRecognition = class {
    constructor() { recognitionInstance = this; }
    start() {
      setTimeout(() => this.onstart?.(), 0);
    }
    stop() { this.onend?.(); }
    abort() {}
    say(text) {
      this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
      this.onend?.();
    }
  };
}

async function bootApp() {
  const { default: App } = await import('./App.jsx');
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /initialize jarvis/i }));
}

const log = () => screen.getByRole('log');

describe('JARVIS UI', () => {
  beforeEach(() => {
    installBrowserStubs();
  });
  afterEach(() => cleanup());

  it('shows the boot screen, then greets Shiva', async () => {
    await bootApp();
    await waitFor(() => expect(within(log()).getByText(/Systems are online\. I'm JARVIS/)).toBeTruthy(), { timeout: 5000 });
    expect(screen.getByText(/Welcome Back, Shiva/)).toBeTruthy();
    expect(screen.getAllByText(/SHIVA ACCESS/).length).toBeGreaterThan(0);
  });

  it('answers a typed command with the real time', async () => {
    await bootApp();
    const input = screen.getByLabelText(/text command/i);
    fireEvent.change(input, { target: { value: 'what time is it' } });
    fireEvent.click(screen.getByRole('button', { name: /send command/i }));
    await waitFor(() => expect(within(log()).getByText('what time is it')).toBeTruthy());
    await waitFor(() => expect(within(log()).getByText(/^It is \d{1,2}:\d{2}\s?(am|pm), Shiva\.$/i)).toBeTruthy(), { timeout: 5000 });
  });

  it('runs a quick command and calculates 25 x 10', async () => {
    await bootApp();
    fireEvent.click(screen.getByRole('button', { name: /calculate 25 multiplied by 10/i }));
    await waitFor(() => expect(within(log()).getByText(/The answer is 250, Shiva\./)).toBeTruthy(), { timeout: 5000 });
  });

  it('clear conversation resets the log to a single reply', async () => {
    await bootApp();
    fireEvent.click(screen.getByRole('button', { name: /^tell me a joke/i }));
    await waitFor(() => expect(log().querySelectorAll('.msg.jarvis:not(.thinking)').length).toBeGreaterThan(1), { timeout: 5000 });
    await waitFor(() => expect(screen.getByRole('button', { name: /^clear conversation/i }).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: /^clear conversation/i }));
    await waitFor(() => expect(within(log()).getByText(/Conversation cleared, Shiva/)).toBeTruthy(), { timeout: 5000 });
    expect(log().querySelectorAll('.msg').length).toBe(1);
  }, 20000);

  it('voice flow: mic -> listening -> recognised text -> response', async () => {
    await bootApp();
    fireEvent.click(screen.getByRole('button', { name: /start voice command/i }));
    await waitFor(() => expect(recognitionInstance).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('button', { name: /stop listening/i })).toBeTruthy());
    recognitionInstance.say('who is your owner');
    await waitFor(() => expect(within(log()).getByText('who is your owner')).toBeTruthy());
    await waitFor(() => expect(within(log()).getByText(/primary user|built for Shiva/i)).toBeTruthy(), { timeout: 5000 });
  });

  it('"open dashboard" opens the dashboard dialog', async () => {
    await bootApp();
    fireEvent.change(screen.getByLabelText(/text command/i), { target: { value: 'open dashboard' } });
    fireEvent.click(screen.getByRole('button', { name: /send command/i }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: /dashboard/i })).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('voice authentication demo states it is not real security and completes', async () => {
    await bootApp();
    fireEvent.click(screen.getByRole('button', { name: /voice authentication \(demo\)/i }));
    const dlg = screen.getByRole('dialog', { name: /voice authentication demo/i });
    expect(within(dlg).getByText(/DEMO ONLY/)).toBeTruthy();
    fireEvent.click(within(dlg).getByRole('button', { name: /begin scan/i }));
    await waitFor(() => expect(within(dlg).getByText(/Access granted/)).toBeTruthy(), { timeout: 6000 });
    expect(screen.getByText(/SHIVA ACCESS · VERIFIED/)).toBeTruthy();
  });

  it('demo mode starts, plays sample interactions and can be exited', async () => {
    await bootApp();
    fireEvent.click(screen.getByRole('button', { name: /demo mode/i }));
    await waitFor(() => expect(screen.getByText('DEMO MODE')).toBeTruthy());
    expect(screen.queryByLabelText(/text command/i)).toBeNull(); // clean UI for recording
    await waitFor(() => expect(within(log()).getByText('Hey JARVIS')).toBeTruthy(), { timeout: 8000 });
    fireEvent.click(screen.getByRole('button', { name: /exit demo/i }));
    await waitFor(() => expect(screen.getByLabelText(/text command/i)).toBeTruthy());
  });

  it('shows a helpful message when speech recognition is unsupported', async () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    vi.resetModules();
    await bootApp();
    fireEvent.click(screen.getByRole('button', { name: /start voice command/i }));
    await waitFor(() => expect(within(log()).getByText(/not supported in this browser/i)).toBeTruthy());
    // text input still works
    fireEvent.change(screen.getByLabelText(/text command/i), { target: { value: 'how are you' } });
    fireEvent.click(screen.getByRole('button', { name: /send command/i }));
    await waitFor(() => expect(within(log()).getByText(/All systems operational|Running at full capacity/)).toBeTruthy(), { timeout: 5000 });
  });
});
