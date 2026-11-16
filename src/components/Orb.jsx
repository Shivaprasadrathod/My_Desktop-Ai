import { useMemo } from 'react';

const BAR_COUNT = 48;
const TICK_COUNT = 72;

// The central AI orb. All motion is CSS; the `data-state` attribute switches the behaviour:
// idle = slow pulse, listening = glowing ripples, thinking = fast spin, speaking = sound bars.
export default function Orb({ status }) {
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => ({
        angle: (360 / BAR_COUNT) * i,
        delay: -((i * 37) % 11) * 0.09,
        dur: 0.55 + ((i * 53) % 7) * 0.07,
      })),
    []
  );

  const ticks = useMemo(
    () =>
      Array.from({ length: TICK_COUNT }, (_, i) => {
        const a = (Math.PI * 2 * i) / TICK_COUNT;
        const major = i % 6 === 0;
        const r1 = 190;
        const r2 = major ? 178 : 184;
        return {
          x1: 200 + Math.cos(a) * r1,
          y1: 200 + Math.sin(a) * r1,
          x2: 200 + Math.cos(a) * r2,
          y2: 200 + Math.sin(a) * r2,
          major,
        };
      }),
    []
  );

  return (
    <div className="orb" data-state={status} role="img" aria-label={`JARVIS core, ${status}`}>
      <div className="orb-halo" />

      <span className="ripple ripple-1" />
      <span className="ripple ripple-2" />
      <span className="ripple ripple-3" />

      <svg className="orb-svg ring-ticks" viewBox="0 0 400 400" aria-hidden="true">
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            className={t.major ? 'tick major' : 'tick'}
          />
        ))}
      </svg>

      <svg className="orb-svg ring-arcs" viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r="164" className="arc arc-a" />
        <circle cx="200" cy="200" r="146" className="arc arc-b" />
      </svg>

      <svg className="orb-svg ring-dots" viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r="128" className="arc arc-c" />
      </svg>

      <div className="bars" aria-hidden="true">
        {bars.map((b, i) => (
          <span
            key={i}
            className="bar"
            style={{
              transform: `rotate(${b.angle}deg)`,
              '--delay': `${b.delay}s`,
              '--dur': `${b.dur}s`,
            }}
          >
            <i />
          </span>
        ))}
      </div>

      <div className="core">
        <div className="core-inner">
          <span className="core-label">J.A.R.V.I.S</span>
          <span className="core-state">{status}</span>
        </div>
      </div>
    </div>
  );
}
