import { Activity, Bot, Gauge, LogOut, RefreshCw, RadioTower, Search, Shield, Swords, Settings, Users, WalletCards } from 'lucide-react';
import { cx, date } from '../lib/format';
import { Badge } from './ui';

const pages = [
  { id: 'overview', label: 'Visão geral', icon: Gauge },
  { id: 'farm', label: 'Farm', icon: WalletCards },
  { id: 'operacoes', label: 'Operações', icon: RadioTower },
  { id: 'acoes', label: 'Ações', icon: Swords },
  { id: 'registros', label: 'Registros', icon: Users },
  { id: 'commands', label: 'Comandos', icon: Activity },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export function Layout({ children, page, setPage, bots, botId, setBotId, user, dashboard, onRefresh, onLogout, search, setSearch, loading }) {
  const bot = dashboard?.bot || bots.find((item) => item.id === botId) || {};

  return (
    <div className="relative flex min-h-screen p-3 lg:p-5">
      <aside className="glass fixed inset-x-3 bottom-3 z-20 rounded-3xl p-3 lg:sticky lg:top-5 lg:mr-5 lg:flex lg:h-[calc(100vh-40px)] lg:w-80 lg:flex-col lg:rounded-[2rem] lg:p-5">
        <div className="hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-amber-300 to-indigo-500 p-3 text-slate-950 shadow-gold"><Bot size={26} /></div>
            <div>
              <h1 className="text-xl font-black leading-tight">Nexus RP</h1>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-amber-200">Control Center</p>
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[.18em] text-slate-500">Sessão</p>
                <strong>{user?.name || user?.username}</strong>
              </div>
              <Badge tone={user?.role === 'admin' ? 'warn' : 'info'}>{user?.role}</Badge>
            </div>
          </div>
          <select className="input mt-4" value={botId} onChange={(event) => setBotId(event.target.value)}>
            {bots.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[.18em] text-slate-500">Bot ativo</p>
                <strong className="mt-2 block">{bot?.name || 'Nexus'}</strong>
                <p className="mt-1 text-sm text-slate-400">{bot?.status || 'offline'} · Pendentes: {dashboard?.commands?.pending?.length || 0}</p>
              </div>
              <Badge tone={bot?.status === 'online' ? 'success' : 'danger'}>{bot?.status || 'offline'}</Badge>
            </div>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:mt-6 lg:flex-col lg:overflow-visible">
          {pages.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPage(id)} className={cx('flex min-w-fit items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-400 transition hover:bg-white/5 hover:text-white', page === id && 'bg-amber-400/12 text-amber-100 ring-1 ring-amber-300/20')}>
              <Icon size={18} /> <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="w-full pb-28 lg:pb-0">
        <header className="glass mb-5 rounded-[2rem] p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={bot?.status === 'online' ? 'success' : 'danger'}>{bot?.status || 'offline'}</Badge>
                <Badge tone="neutral">Sync: {date(bot?.lastSync, true)}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-black md:text-4xl">{bot?.name || 'Dashboard RP'}</h2>
              <p className="mt-1 max-w-3xl text-slate-400">{bot?.description || 'Painel operacional para automações, farm, registros e comandos do servidor.'}</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="relative block min-w-[260px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input className="input !pl-12" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no painel..." />
              </label>
              <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Atualizar</button>
              <button className="btn btn-danger" onClick={onLogout}><LogOut size={18} /> Sair</button>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
