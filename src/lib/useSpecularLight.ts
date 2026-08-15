import { useEffect } from 'react';

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export function useSpecularLight() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    function setLight(nx: number, ny: number) {
      const cx = Math.max(-1, Math.min(1, nx));
      const cy = Math.max(-1, Math.min(1, ny));
      root.style.setProperty('--sx', `${(cx * 90).toFixed(1)}px`);
      root.style.setProperty('--sy', `${(cy * 90).toFixed(1)}px`);
    }

    function handleMouseMove(e: MouseEvent) {
      setLight((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener('mousemove', handleMouseMove);

    function handleTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      setLight((touch.clientX / window.innerWidth) * 2 - 1, (touch.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });

    function handleOrientation(e: DeviceOrientationEvent) {
      const g = (e.gamma ?? 0) / 45;
      const b = ((e.beta ?? 0) - 45) / 45;
      setLight(g, b);
    }

    const DOE = (typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : undefined) as
      | DeviceOrientationEventWithPermission
      | undefined;

    let cleanupTouch: (() => void) | undefined;
    if (DOE) {
      if (typeof DOE.requestPermission === 'function') {
        const onFirstTouch = () => {
          DOE.requestPermission!()
            .then((state) => {
              if (state === 'granted') window.addEventListener('deviceorientation', handleOrientation);
            })
            .catch(() => {});
        };
        document.body.addEventListener('touchstart', onFirstTouch, { once: true });
        document.body.addEventListener('click', onFirstTouch, { once: true });
        cleanupTouch = () => {
          document.body.removeEventListener('touchstart', onFirstTouch);
          document.body.removeEventListener('click', onFirstTouch);
        };
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }

    let idleFrame: number;
    let idleStart: number | null = null;
    function idleDrift(timestamp: number) {
      if (idleStart === null) idleStart = timestamp;
      const t = (timestamp - idleStart) / 1000;
      setLight(Math.sin(t * 0.25) * 0.35, Math.cos(t * 0.2) * 0.35);
      idleFrame = requestAnimationFrame(idleDrift);
    }
    idleFrame = requestAnimationFrame(idleDrift);

    function stopIdleOnInteraction() {
      cancelAnimationFrame(idleFrame);
      window.removeEventListener('mousemove', stopIdleOnInteraction);
      window.removeEventListener('touchstart', stopIdleOnInteraction);
    }
    window.addEventListener('mousemove', stopIdleOnInteraction, { once: true });
    window.addEventListener('touchstart', stopIdleOnInteraction, { once: true });

    return () => {
      cancelAnimationFrame(idleFrame);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', stopIdleOnInteraction);
      window.removeEventListener('touchstart', stopIdleOnInteraction);
      cleanupTouch?.();
    };
  }, []);
}
