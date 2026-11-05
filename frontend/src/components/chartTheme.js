// Shared Recharts styling: one ink, muted axes, quiet grid.
export const INK = '#38450f';
export const MUTED = '#5d683a';
export const SOFT = '#a7ae8a';
export const SURFACE = '#d6d3cb';

export const AXIS = { stroke: MUTED, tick: { fill: MUTED, fontSize: 13 }, tickLine: false, axisLine: false };
export const GRID = { stroke: SURFACE, vertical: false };
export const TOOLTIP = {
  contentStyle: { background: '#f6f5f2', border: 'none', borderRadius: 0, boxShadow: '0 6px 24px rgba(30,30,20,.15)', fontSize: 14 },
  labelStyle: { color: INK, fontWeight: 600 },
  itemStyle: { color: INK },
  cursor: { fill: 'rgba(56,69,15,0.06)' },
};
