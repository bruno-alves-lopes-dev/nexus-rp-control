import { motion } from 'framer-motion';
import { cx } from '../lib/format';

export function Card({ children, className = '' }) {
  return <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cx('glass rounded-3xl p-5 shadow-glow', className)}>{children}</motion.section>;
}

export function StatCard({ title, value, hint, icon: Icon }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-slate-400">{title}</p>
          <strong className="mt-3 block text-2xl font-black text-white md:text-3xl">{value}</strong>
          {hint && <span className="mt-2 block text-sm text-slate-400">{hint}</span>}
        </div>
        {Icon && <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-300"><Icon size={22} /></div>}
      </div>
    </Card>
  );
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    warn: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    danger: 'border-red-400/30 bg-red-400/10 text-red-200',
    info: 'border-indigo-400/30 bg-indigo-400/10 text-indigo-200',
    neutral: 'border-slate-400/20 bg-slate-400/10 text-slate-200',
  };
  return <span className={cx('badge', tones[tone] || tones.neutral)}>{children}</span>;
}

export function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-xl font-black text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function DataTable({ columns, rows, empty = 'Sem dados para exibir.' }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : <tr><td colSpan={columns.length} className="text-center text-slate-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
