import type { CategoryIcon } from '../lib/category';

export function CategoryIconGlyph({ icon }: { icon: CategoryIcon }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const;

  if (icon === 'book') {
    return (
      <svg {...common} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  }
  if (icon === 'language') {
    return (
      <svg {...common} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
        <path d="m5 8 6 6" />
        <path d="m4 14 6-6 2-3" />
        <path d="M2 5h12" />
        <path d="M7 2h1" />
        <path d="m22 22-5-10-5 10" />
        <path d="M14 18h6" />
      </svg>
    );
  }
  return (
    <svg {...common} strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
