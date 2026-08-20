import { describe, expect, it } from 'vitest';
import { counters, dayIndex, generateMilestones, milestoneState, targetAt, totalDays, trackStatus, trajectoryNodes } from './resurrection';
import type { ResurrectionMilestone, ResurrectionMode } from './types';

const mode: ResurrectionMode = {
  id: 'm1',
  userId: 'u1',
  startDate: '2026-08-21',
  endDate: '2026-11-21',
  startWeight: 103,
  targetWeight: 78,
  status: 'actif',
  createdAt: '',
  endedAt: null,
};

const milestones: ResurrectionMilestone[] = [
  { id: 'ms1', modeId: 'm1', targetDate: '2026-09-21', targetWeight: 93, position: 0, reached: null, reachedWeight: null },
  { id: 'ms2', modeId: 'm1', targetDate: '2026-10-21', targetWeight: 83, position: 1, reached: null, reachedWeight: null },
];

describe('dayIndex / totalDays', () => {
  it('computes the day offset from start', () => {
    expect(dayIndex(new Date('2026-08-21'), new Date('2026-08-21'))).toBe(0);
    expect(dayIndex(new Date('2026-08-25'), new Date('2026-08-21'))).toBe(4);
  });

  it('computes total days of a mode', () => {
    expect(totalDays(mode)).toBe(92);
  });
});

describe('targetAt — piecewise interpolation, not a single line', () => {
  const nodes = trajectoryNodes(mode, milestones);

  it('returns the start weight at day 0', () => {
    expect(targetAt(0, nodes)).toBe(103);
  });

  it('hits each milestone exactly on its day', () => {
    expect(targetAt(31, nodes)).toBe(93);
    expect(targetAt(61, nodes)).toBe(83);
  });

  it('interpolates linearly between two nodes, not on a single start-to-end line', () => {
    // Straight départ→objectif at day 31 would be 103 - (103-78)*31/92 ≈ 94.6, not 93.
    // Piecewise, the segment [0,93] over [0,31] gives exactly 93 at day 31 (tested above).
    // Mid-segment check: halfway between day 31 (93) and day 61 (83) should be 88.
    expect(targetAt(46, nodes)).toBe(88);
  });

  it('clamps to the final weight past the end', () => {
    expect(targetAt(999, nodes)).toBe(78);
  });
});

describe('counters', () => {
  it('floors kgLeft at 0 once the target is reached or passed', () => {
    const c = counters(mode, 70, new Date('2026-09-01'));
    expect(c.kgLeft).toBe(0);
  });

  it('floors daysLeft at 0 past the end date', () => {
    const c = counters(mode, 90, new Date('2027-01-01'));
    expect(c.daysLeft).toBe(0);
  });

  it('computes live kgLeft and daysLeft mid-course', () => {
    const c = counters(mode, 95, new Date('2026-09-21'));
    expect(c.daysLeft).toBe(61);
    expect(c.kgLeft).toBe(17);
  });
});

describe('trackStatus', () => {
  it('is ahead when at or below the target', () => {
    expect(trackStatus(92, 93, 78, 61).status).toBe('ahead');
  });

  it('is slightly_behind within 1kg over target', () => {
    expect(trackStatus(94, 93, 78, 61).status).toBe('slightly_behind');
  });

  it('is behind beyond 1kg over target', () => {
    expect(trackStatus(96, 93, 78, 61).status).toBe('behind');
  });

  it('computes weekly pace needed on the REMAINING time, not the total duration', () => {
    // 94 -> 78 = 16kg over 61 days remaining = 16/61*7 ≈ 1.836
    const r = trackStatus(94, 93, 78, 61);
    expect(r.weeklyPaceNeeded).toBeCloseTo((16 / 61) * 7, 5);
  });
});

describe('milestoneState', () => {
  it('is done when overdue and the weight at that date beat the target', () => {
    expect(milestoneState(milestones[0], new Date('2026-10-01'), 92, false)).toBe('done');
  });

  it('is missed when overdue and the weight at that date did not beat the target', () => {
    expect(milestoneState(milestones[0], new Date('2026-10-01'), 95, false)).toBe('missed');
  });

  it('is missed when overdue with no weight recorded that day', () => {
    expect(milestoneState(milestones[0], new Date('2026-10-01'), null, false)).toBe('missed');
  });

  it('is current for the first upcoming milestone', () => {
    expect(milestoneState(milestones[1], new Date('2026-09-01'), null, true)).toBe('current');
  });

  it('is upcoming for later milestones', () => {
    expect(milestoneState(milestones[1], new Date('2026-09-01'), null, false)).toBe('upcoming');
  });
});

describe('generateMilestones', () => {
  it('creates M-1 milestones for M months, linearly interpolated', () => {
    const out = generateMilestones(103, 78, 3, new Date('2026-08-21'));
    expect(out).toHaveLength(2);
    expect(out[0].targetWeight).toBeCloseTo(94.7, 1);
    expect(out[1].targetWeight).toBeCloseTo(86.3, 1);
  });

  it('positions milestones one month apart starting the month after start', () => {
    const out = generateMilestones(103, 78, 3, new Date('2026-08-21'));
    expect(out[0].targetDate.getMonth()).toBe(8); // septembre (0-indexed)
    expect(out[1].targetDate.getMonth()).toBe(9); // octobre
  });

  it('creates no milestones for a single-month duration (only the final objective)', () => {
    expect(generateMilestones(103, 78, 1, new Date('2026-08-21'))).toHaveLength(0);
  });
});
