import { useState } from 'react';
import { Bot, Lock, User } from 'lucide-react';

export function Login({ onLogin, loading, error }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  function submit(event) {
    event.preventDefault();
    onLogin(username.trim(), password);
  }

  return (
    <main className="relative grid min-h-screen place-items-center p-5">
      <section className="glass w-full max-w-5xl overflow-hidden rounded-[2.4rem] shadow-glow md:grid md:grid-cols-[1.05fr_.95fr]">
        <div className="relative min-h-[420px] p-8 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(245,158,11,.28),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(99,102,241,.28),transparent_30%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-amber-100">
              <Bot size={22} /> <strong>Nexus RP Control</strong>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-[.28em] text-amber-200">GTA RP Automation</p>
              <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight md:text-6xl">Painel tático para staff, farm e bots.</h1>
              <p className="mt-5 max-w-lg text-slate-300">Central de comando para automatizar, gerenciar e escalar seu servidor RP com eficiência total.</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-8 md:p-10">
          <h2 className="text-2xl font-black">Acesso administrativo</h2>
          <p className="mt-2 text-sm text-slate-400">Entre com as credenciais locais do dashboard.</p>

          <label className="mt-8 block">
            <span className="mb-2 block text-sm font-bold text-slate-300">Usuário</span>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input className="input !pl-14 py-3" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Digite seu usuário" />
            </div>
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold text-slate-300">Senha</span>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input className="input !pl-14 py-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Digite sua senha" />
            </div>
          </label>

          {error && <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm font-bold text-red-200">{error}</div>}

          <button className="btn btn-primary mt-6 w-full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar no painel'}</button>
          <p className="mt-5 text-center text-xs text-slate-500">Padrão local: admin / admin123</p>
        </form>
      </section>
    </main>
  );
}
