const TOKEN_KEY = 'nexus_rp_token';
const BOT_KEY = 'nexus_rp_bot_id';

export const storage = {
  get token() { return localStorage.getItem(TOKEN_KEY) || ''; },
  set token(value) { value ? localStorage.setItem(TOKEN_KEY, value) : localStorage.removeItem(TOKEN_KEY); },
  get botId() { return localStorage.getItem(BOT_KEY) || ''; },
  set botId(value) { value ? localStorage.setItem(BOT_KEY, value) : localStorage.removeItem(BOT_KEY); },
};

export async function api(path, { method = 'GET', body, token, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) throw new Error(data?.erro || `Erro ${response.status}`);
  return data;
}

export const endpoints = {
  login: (username, password) => api('/api/auth/login', { method: 'POST', auth: false, body: { username, password } }),
  session: (token) => api('/api/auth/session', { token }),
  logout: (token) => api('/api/auth/logout', { method: 'POST', token }),
  dashboard: (token, botId) => api(`/api/bots/${encodeURIComponent(botId)}/dashboard`, { token }),
  resetFarm: (token, botId) => api(`/api/bots/${encodeURIComponent(botId)}/farm/reset`, { method: 'POST', token, body: {} }),
  command: (token, botId, body) => api(`/api/bots/${encodeURIComponent(botId)}/commands`, { method: 'POST', token, body }),
  settings: (token, botId, body) => api(`/api/bots/${encodeURIComponent(botId)}/settings`, { method: 'PUT', token, body }),
  upsertBot: (token, body) => api('/api/bots', { method: 'POST', token, body }),
};
