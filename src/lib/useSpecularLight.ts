import { useEffect } from 'react';

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export function useSpecularLight() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    function setLight(nx: number, ny: number) {
      root.style.setProperty('--sx', `${(nx * 90).toFixed(1)}px`);
      root.style.setProperty('--sy', `${(ny * 90).toFixed(1)}px`);
    }

    function handleMouseMove(e: MouseEvent) {
      setLight((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener('mousemove', handleMouseMove);

    function handleOrientation(e: DeviceOrientationEvent) {
      const g = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 45));
      const b = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 45) / 45));
      setLight(g, b);
    }

    const DOE = (typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : undefined) as
      | DeviceOrientationEventWithPermission
      | undefined;

    let cleanupClick: (() => void) | undefined;
    if (DOE) {
      if (typeof DOE.requestPermission === 'function') {
        const onFirstClick = () => {
          DOE.requestPermission!()
            .then((state) => {
              if (state === 'granted') window.addEventListener('deviceorientation', handleOrientation);
            })
            .catch(() => {});
        };
        document.body.addEventListener('click', onFirstClick, { once: true });
        cleanupClick = () => document.body.removeEventListener('click', onFirstClick);
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
      cleanupClick?.();
    };
  }, []);
}
