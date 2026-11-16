import { useMemo } from 'react';

const COUNT = 41;

// Sound-wave visualisation. Bars animate while JARVIS is speaking or listening
// and settle to a thin line otherwise.
export default function Waveform({ status }) {
  const bars = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const centre = 1 - Math.abs(i - (COUNT - 1) / 2) / ((COUNT - 1) / 2);
        return {
          peak: 0.25 + centre * 0.75,
          delay: -((i * 29) % 13) * 0.08,
          dur: 0.5 + ((i * 17) % 9) * 0.06,
        };
      }),
    []
  );

  const active = status === 'speaking' || status === 'listening';

  return (
    <div className="wave" data-active={active} data-state={status} aria-hidden="true">
      {bars.map((b, i) => (
        <span
          key={i}
          style={{
            '--peak': b.peak,
            '--delay': `${b.delay}s`,
            '--dur': `${b.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
