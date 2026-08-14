import { NavLink } from 'react-router-dom';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center gap-1 text-[10px] font-semibold ${isActive ? 'text-brand' : 'text-muted-2'}`;

export function TabBar() {
  return (
    <nav className="sticky bottom-0 left-0 right-0 flex justify-around border-t border-line bg-white/90 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg">
      <NavLink to="/" end className={linkClass}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[23px] w-[23px]">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
        Accueil
      </NavLink>
      <NavLink to="/sport" className={linkClass}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[23px] w-[23px]">
          <path d="m6.5 6.5 11 11" />
          <path d="m21 21-1-1" />
          <path d="m3 3 1 1" />
          <path d="m18 22 4-4" />
          <path d="m2 6 4-4" />
          <path d="m3 10 7-7" />
          <path d="m14 21 7-7" />
        </svg>
        Sport
      </NavLink>
      <NavLink to="/history" className={linkClass}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[23px] w-[23px]">
          <path d="M3 3v16a2 2 0 0 0 2 2h16" />
          <rect x="7" y="10" width="3" height="7" rx="1" />
          <rect x="13" y="6" width="3" height="11" rx="1" />
          <rect x="18" y="13" width="1" height="4" rx=".5" />
        </svg>
        Historique
      </NavLink>
      <button type="button" disabled className="flex cursor-not-allowed flex-col items-center gap-1 text-[10px] font-semibold text-muted-2 opacity-50" title="Bientôt disponible">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[23px] w-[23px]">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
        Chat
      </button>
    </nav>
  );
}
