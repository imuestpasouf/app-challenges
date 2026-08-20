import { dayIndex, totalDays, trajectoryNodes } from '../../domain/resurrection';
import { zone } from '../../domain/calories';
import type { ResurrectionMilestone, ResurrectionMode, WeightEntry } from '../../domain/types';
import { toDateKey } from '../../lib/date';

const W = 320;
const H = 175;
const PL = 30;
const PR = 30;
const PT = 8;
const PB = 20;
const HB = 44;
const CH = H - PT - PB - HB - 6;
const BASE = PT + CH + 6 + HB / 2;
const KMAXB = 2000;

const THEME = {
  light: { grid: 'rgba(20,40,52,.10)', text3: 'rgba(20,40,52,.44)', brand: '#4C5BD4', amber: '#D9930B' },
  dark: { grid: 'rgba(255,255,255,.09)', text3: 'rgba(235,238,248,.40)', brand: '#7D8CFF', amber: '#FFD60A' },
};

const ZONE_HEX_BY_THEME = {
  light: { green: '#1DA65A', amber: '#D9930B', red: '#E03127', black: '#2B3440' },
  dark: { green: '#30D158', amber: '#FFD60A', red: '#FF453A', black: '#2B3440' },
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(d);
}

interface CombinedChartProps {
  mode: ResurrectionMode;
  milestones: ResurrectionMilestone[];
  weightEntries: WeightEntry[];
  dailyBalances: Map<string, number>;
  isDark: boolean;
}

export function CombinedChart({ mode, milestones, weightEntries, dailyBalances, isDark }: CombinedChartProps) {
  const t = isDark ? THEME.dark : THEME.light;
  const zoneHex = isDark ? ZONE_HEX_BY_THEME.dark : ZONE_HEX_BY_THEME.light;
  const start = new Date(mode.startDate);
  const total = totalDays(mode);
  const nodes = trajectoryNodes(mode, milestones);

  const weights = weightEntries.map((e) => ({ day: dayIndex(new Date(e.entryDate), start), weight: e.weight }));

  const allWeights = [mode.startWeight, mode.targetWeight, ...weights.map((w) => w.weight)];
  const wMax = Math.ceil(Math.max(...allWeights) + 1);
  const wMin = Math.floor(Math.min(...allWeights) - 1);

  const X = (d: number) => PL + (d / total) * (W - PL - PR);
  const Y = (w: number) => PT + ((wMax - w) / (wMax - wMin)) * CH;
  const YB = (b: number) => BASE - (Math.max(-KMAXB, Math.min(KMAXB, b)) / KMAXB) * (HB / 2);

  const step = Math.max(2, Math.round((wMax - wMin) / 4));
  const gridLevels: number[] = [];
  for (let w = wMin; w <= wMax; w += step) gridLevels.push(w);

  const bw = Math.max(1.6, Math.min(6, ((W - PL - PR) / Math.max(1, total)) * 0.72));

  const balanceDays: { day: number; balance: number }[] = [];
  for (let d = 0; d <= total; d++) {
    const dk = toDateKey(new Date(start.getTime() + d * 86_400_000));
    const bal = dailyBalances.get(dk);
    if (bal !== undefined) balanceDays.push({ day: d, balance: bal });
  }

  const lastWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const dateTicks = [0, Math.round(total / 2), total];

  return (
    <div className="glass chart">
      <div className="hd">
        <b>Poids &amp; calories</b>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{weights.length} pesées</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {gridLevels.map((w) => (
          <g key={w}>
            <line x1={PL} y1={Y(w)} x2={W - PR} y2={Y(w)} stroke={t.grid} strokeWidth={1} />
            <text x={PL - 5} y={Y(w) + 3.5} textAnchor="end" fontSize={8} fill={t.text3} fontWeight={600}>
              {w}
            </text>
          </g>
        ))}

        <polyline points={nodes.map((n) => `${X(n.day)},${Y(n.weight)}`).join(' ')} fill="none" stroke={t.text3} strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
        {weights.length > 0 && (
          <polyline points={weights.map((p) => `${X(p.day)},${Y(p.weight)}`).join(' ')} fill="none" stroke={t.brand} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {nodes.slice(1).map((n, i) => (
          <circle key={i} cx={X(n.day)} cy={Y(n.weight)} r={4} fill={t.amber} stroke="rgba(0,0,0,.3)" strokeWidth={1.2} />
        ))}
        {lastWeight && <circle cx={X(lastWeight.day)} cy={Y(lastWeight.weight)} r={5.4} fill={t.brand} stroke="#fff" strokeWidth={2} />}
        <text x={PL - 5} y={PT + 8} textAnchor="end" fontSize={7.5} fill={t.text3} fontWeight={700}>
          kg
        </text>

        {balanceDays.map(({ day, balance }) => {
          const y = YB(balance);
          const h = Math.max(1.2, Math.abs(BASE - y));
          const color = zoneHex[zone(balance).zone];
          return <rect key={day} x={X(day) - bw / 2} y={balance <= 0 ? y : BASE} width={bw} height={h} rx={Math.min(1.6, bw / 2)} fill={color} opacity={0.85} />;
        })}
        <line x1={PL} y1={BASE} x2={W - PR} y2={BASE} stroke={t.grid} strokeWidth={1.2} />
        <text x={W - PR + 4} y={YB(KMAXB) + 3} fontSize={7.5} fill={t.text3} fontWeight={600}>
          +2k
        </text>
        <text x={W - PR + 4} y={BASE + 3} fontSize={7.5} fill={t.text3} fontWeight={600}>
          0
        </text>
        <text x={W - PR + 4} y={YB(-KMAXB) + 3} fontSize={7.5} fill={t.text3} fontWeight={600}>
          −2k
        </text>
        <text x={PL - 5} y={BASE - HB / 2 - 2} textAnchor="end" fontSize={7.5} fill={t.text3} fontWeight={700}>
          kcal
        </text>

        {dateTicks.map((d) => (
          <text key={d} x={X(d)} y={H - 4} textAnchor="middle" fontSize={8} fill={t.text3} fontWeight={600}>
            {fmtDate(new Date(start.getTime() + d * 86_400_000))}
          </text>
        ))}
      </svg>
      <div className="lg">
        <i>
          <s style={{ background: t.text3 }} />
          Cible
        </i>
        <i>
          <s style={{ background: t.brand }} />
          Poids réel
        </i>
        <i>
          <s style={{ background: t.amber, height: 8, width: 8, borderRadius: '50%' }} />
          Jalon
        </i>
        <i>
          <s style={{ background: zoneHex.green, height: 9, width: 5, borderRadius: 2 }} />
          Balance kcal/jour
        </i>
      </div>
    </div>
  );
}
