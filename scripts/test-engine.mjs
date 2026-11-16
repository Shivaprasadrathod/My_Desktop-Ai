import { processCommand, createEngineState, initialGreeting, tryMath } from '../src/lib/engine.js';

let failed = 0;
const state = createEngineState();
const fixed = new Date('2026-11-08T22:58:00+05:30');

function check(name, cond, extra = '') {
  if (!cond) { failed++; console.log('FAIL', name, extra); } else console.log('ok  ', name);
}
const run = (s) => processCommand(s, { now: fixed, system: { online: true, cores: 8, battery: 80, speechRecognition: true, speechSynthesis: true } }, state);

check('greeting', run('Hey JARVIS').intent === 'greeting');
check('capabilities', run('What can you do?').intent === 'capabilities');
check('about', run('Tell me about yourself').intent === 'about');
check('who are you', run('Who are you?').intent === 'about');
check('owner', /primary user is Shiva/.test(run('Who is your owner?').text) || /Shiva/.test(run('Who is your owner?').text));
check('time', run('What time is it?').intent === 'time');
check('time text', /10:58/.test(run('Tell me the time.').text), run('Tell me the time.').text);
check('dashboard', run('Open dashboard').action === 'dashboard');
check('how are you', run('How are you?').intent === 'howareyou');
check('joke', run('Tell me a joke').intent === 'joke');
check('math 25*10', /250/.test(run('Calculate 25 multiplied by 10').text), run('Calculate 25 multiplied by 10').text);
check('math plus', /17/.test(run('what is 12 plus 5').text), run('what is 12 plus 5').text);
check('math symbols', /14/.test(run('calculate 2 + 3 * 4').text), run('calculate 2 + 3 * 4').text);
check('math div', /25/.test(run('100 divided by 4').text), run('100 divided by 4').text);
check('math div0', /undefined/.test(run('calculate 5 divided by 0').text));
check('math percent', /10/.test(run('what is 20 percent of 50').text), run('what is 20 percent of 50').text);
check('math sqrt', /12/.test(run('square root of 144').text), run('square root of 144').text);
check('math power', /256/.test(run('calculate 2 to the power of 8').text), run('calculate 2 to the power of 8').text);
check('math paren', /20/.test(run('calculate (2+3)*4').text), run('calculate (2+3)*4').text);
check('math no eval', !/pwned/.test(run('calculate process.exit()').text));
check('status', run('System status').intent === 'status');
check('clear', run('Clear conversation').action === 'clear');
check('demo', run('start demo mode').action === 'demo');
check('repeat', /Of course/.test(run('repeat that').text));
check('limit computer', run('open chrome').intent === 'limit');
check('weather honest', run("what's the weather").intent === 'limit');
check('unknown varied', run('purple monkey dishwasher').intent === 'unknown');
check('empty', run('   ').intent === 'empty');
check('initial greeting', /Good evening, Shiva\. Systems are online/.test(initialGreeting(fixed)));
check('tryMath null', tryMath('hello there') === null);
check('add voice', run('add my voice').action === 'auth');
check('recognize voice uncalibrated', run('do you recognize my voice').intent === 'voice_recognize');
check('recognize voice calibrated', processCommand('do you recognize my voice', { now: fixed, voiceProfile: { enrolled: true, pitch: '130 Hz' } }, state).text.includes('130 Hz'));
check('handsfree on', run('turn on hands free mode').action === 'handsfree_on');
check('handsfree off', run('turn off hands-free').action === 'handsfree_off');
check('open youtube', run('open youtube').action === 'open_url');
check('search youtube', run('search youtube for Iron Man').action === 'open_url');
check('play music', run('play music').action === 'open_url');
check('search google', run('search google for AI').action === 'open_url');
check('timer set', run('set timer for 5 minutes').action === 'timer_set');
check('note add', run('take note: buy milk').action === 'add_note');
check('theme mark7', run('switch theme to mark 7').action === 'set_theme');
check('mute command', run('mute audio').action === 'mute');

console.log(failed ? `\n${failed} FAILED` : '\nAll engine tests passed');
process.exit(failed ? 1 : 0);
