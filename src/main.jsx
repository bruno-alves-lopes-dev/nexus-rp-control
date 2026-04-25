import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { endpoints, storage } from './lib/api';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Farm } from './pages/Farm';
import { Operacoes } from './pages/Operacoes';
import { Acoes } from './pages/Acoes';
import { Registros } from './pages/Registros';
import { Commands } from './pages/Commands';
import { Settings } from './pages/Settings';

const POLL_MS = 8000;

function App() {
  const [token, setToken] = useState(storage.token);
  const [user, setUser] = useState(null);
  const [bots, setBots] = useState([]);
  const [botId, setBotIdState] = useState(storage.botId);
  const [dashboard, setDashboard] = useState(null);
  const [page, setPage] = useState('overview');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const isAdmin = user?.role === 'admin';

  const setBotId = useCallback((value) => {
    storage.botId = value;
    setBotIdState(value);
  }, []);

  const consumeBootstrap = useCallback((payload) => {
    setUser(payload.user);
    setBots(payload.bots || []);
    const nextBotId = botId && (payload.bots || []).some((bot) => bot.id === botId) ? botId : payload.defaultBotId || payload.bots?.[0]?.id || '';
    setBotId(nextBotId);
    return nextBotId;
  }, [botId, setBotId]);

  const logout = useCallback(async () => {
    try { if (token) await endpoints.logout(token); } catch {}
    storage.token = '';
    storage.botId = '';
    setToken('');
    setUser(null);
    setBots([]);
    setDashboard(null);
  }, [token]);

  const refresh = useCallback(async (targetBotId = botId) => {
    if (!token || !targetBotId) return;
    setLoading(true);
    try {
      const data = await endpoints.dashboard(token, targetBotId);
      setDashboard(data);
      setError('');
    } catch (err) {
      if (String(err.message).includes('401')) logout();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [botId, token, logout]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    endpoints.session(token)
      .then((payload) => {
        if (!active) return;
        const nextBotId = consumeBootstrap(payload);
        return refresh(nextBotId);
      })
      .catch(() => logout());
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token || !botId) return;
    refresh(botId);
    const timer = window.setInterval(() => refresh(botId), POLL_MS);
    return () => window.clearInterval(timer);
  }, [botId, token]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function login(username, password) {
    setLoading(true);
    setError('');
    try {
      const payload = await endpoints.login(username, password);
      storage.token = payload.token;
      setToken(payload.token);
      const nextBotId = consumeBootstrap(payload);
      await refresh(nextBotId);
      setToast('Login realizado com sucesso.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetFarm() {
    if (!window.confirm('Confirmar reset do farm semanal?')) return;
    const payload = await endpoints.resetFarm(token, botId);
    setDashboard(payload.dashboard || dashboard);
    setToast('Reset enviado para o bot.');
  }

  async function runCommand(body) {
    await endpoints.command(token, botId, body);
    await refresh(botId);
    setToast('Comando enviado para a fila.');
  }

  async function saveSettings(body) {
    const payload = await endpoints.settings(token, botId, body);
    setDashboard(payload.dashboard || dashboard);
    setToast('Configurações salvas.');
  }

  async function createBot(body) {
    if (!body.id?.trim() || !body.name?.trim()) {
      setToast('Informe ID e nome do bot.');
      return;
    }
    await endpoints.upsertBot(token, body);
    const session = await endpoints.session(token);
    consumeBootstrap(session);
    setToast('Bot cadastrado.');
  }

  const currentPage = useMemo(() => {
    const props = { dashboard, search, isAdmin };
    const map = {
      overview: <Overview {...props} />,
      farm: <Farm {...props} onReset={resetFarm} />,
      operacoes: <Operacoes {...props} />,
      acoes: <Acoes {...props} />,
      registros: <Registros {...props} />,
      commands: <Commands {...props} onCommand={runCommand} />,
      settings: <Settings {...props} onSaveSettings={saveSettings} onCreateBot={createBot} />,
    };
    return map[page] || map.overview;
  }, [page, dashboard, search, isAdmin]);

  if (!token || !user) return <Login onLogin={login} loading={loading} error={error} />;

  return (
    <>
      <Layout
        page={page}
        setPage={setPage}
        bots={bots}
        botId={botId}
        setBotId={setBotId}
        user={user}
        dashboard={dashboard}
        onRefresh={() => refresh(botId)}
        onLogout={logout}
        search={search}
        setSearch={setSearch}
        loading={loading}
      >
        {error && <div className="mb-5 rounded-3xl border border-red-400/30 bg-red-400/10 p-4 font-bold text-red-100">{error}</div>}
        {dashboard ? currentPage : <div className="glass rounded-3xl p-8 text-slate-300">Carregando dashboard...</div>}
      </Layout>
      {toast && <div className="fixed right-5 top-5 z-50 rounded-2xl border border-amber-300/30 bg-slate-950/90 px-5 py-4 font-bold text-amber-100 shadow-gold backdrop-blur">{toast}</div>}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
