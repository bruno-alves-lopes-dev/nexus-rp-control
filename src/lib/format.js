export const currency = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const number = (value) => Number(value || 0).toLocaleString('pt-BR');

export function date(value, withTime = false) {
  if (!value) return '—';
  const parsed = new Date(Number(value));
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('pt-BR', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' });
}

export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}
