import { useEffect, useState } from 'react';

// Reads real values the browser is willing to share. Nothing here is faked,
// and anything the browser does not expose is reported as unavailable.
export function useSystemInfo() {
  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [battery, setBattery] = useState(null); // { level, charging } | null

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!navigator.getBattery) return undefined;
    let cancelled = false;
    let bat;
    const update = () => {
      if (!cancelled && bat) setBattery({ level: Math.round(bat.level * 100), charging: bat.charging });
    };
    navigator
      .getBattery()
      .then((b) => {
        bat = b;
        update();
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (bat) {
        bat.removeEventListener('levelchange', update);
        bat.removeEventListener('chargingchange', update);
      }
    };
  }, []);

  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || null : null;
  const memory = typeof navigator !== 'undefined' ? navigator.deviceMemory || null : null;

  return { now, online, battery, cores, memory };
}
