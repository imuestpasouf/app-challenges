import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const TABS = [
  { key: 'home', to: '/', end: true, label: 'Accueil' },
  { key: 'sport', to: '/sport', end: false, label: 'Sport' },
  { key: 'hist', to: '/history', end: false, label: 'Historique' },
  { key: 'chat', to: '/chat', end: false, label: 'Chat' },
] as const;

function activeKeyFor(pathname: string) {
  if (pathname.startsWith('/sport')) return 'sport';
  if (pathname.startsWith('/history')) return 'hist';
  if (pathname.startsWith('/chat')) return 'chat';
  return 'home';
}

export function TabBar() {
  const location = useLocation();
  const activeKey = activeKeyFor(location.pathname);
  const barRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<string, HTMLAnchorElement>>>({});

  function movePill() {
    const bar = barRef.current;
    const tab = tabRefs.current[activeKey];
    const pill = pillRef.current;
    if (!bar || !tab || !pill) return;
    const t = tab.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    pill.style.left = `${t.left - b.left}px`;
    pill.style.width = `${t.width}px`;
  }

  useEffect(() => {
    movePill();
    const timeout = setTimeout(movePill, 60);
    window.addEventListener('resize', movePill);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', movePill);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  return (
    <nav ref={barRef} className="tabbar">
      <div ref={pillRef} className="pill" />
      {TABS.map(({ key, to, end, label }) => (
        <NavLink
          key={key}
          to={to}
          end={end}
          ref={(el) => {
            tabRefs.current[key] = el ?? undefined;
          }}
          className={key === activeKey ? 'tab on' : 'tab'}
        >
          <TabIcon tab={key} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function TabIcon({ tab }: { tab: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (tab === 'home') {
    return (
      <svg {...common}>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    );
  }
  if (tab === 'sport') {
    return (
      <svg {...common}>
        <path d="m6.5 6.5 11 11" />
        <path d="m21 21-1-1" />
        <path d="m3 3 1 1" />
        <path d="m18 22 4-4" />
        <path d="m2 6 4-4" />
        <path d="m3 10 7-7" />
        <path d="m14 21 7-7" />
      </svg>
    );
  }
  if (tab === 'hist') {
    return (
      <svg {...common}>
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <rect x="7" y="10" width="3" height="7" rx="1" />
        <rect x="13" y="6" width="3" height="11" rx="1" />
        <rect x="18" y="13" width="1" height="4" rx=".5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}
