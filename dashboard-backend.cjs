const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HISTORY_LIMIT = Number(process.env.DASHBOARD_HISTORY_LIMIT || 120);
const COMMAND_LOCK_MS = Number(process.env.DASHBOARD_COMMAND_LOCK_MS || 30000);

const BUILTIN_COMMANDS = [
  {
    type: 'farm.reset',
    label: 'Resetar farm',
    group: 'Farm',
    description: 'Zera o farm semanal e inicia um novo ciclo.',
    payloadExample: { confirmar: true },
    adminOnly: true,
  },
  {
    type: 'settings.apply',
    label: 'Aplicar configuracoes',
    group: 'Sistema',
    description: 'Sincroniza as configuracoes editadas no painel com o bot.',
    payloadExample: {},
    adminOnly: true,
  },
];

const SESSIONS = new Map();

function now() {
  return Date.now();
}

function deepClone(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function asObject(value, fallback = {}) {
  return isObject(value) ? value : fallback;
}

function asArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseJsonEnv(name, fallback) {
  if (!process.env[name]) return fallback;
  try {
    return JSON.parse(process.env[name]);
  } catch (error) {
    console.warn(`[ENV] ${name} invalido:`, error.message);
    return fallback;
  }
}

function slugify(value, fallback = 'item') {
  const base = String(value || fallback)
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || fallback;
}

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function maskSecret(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= 8) return `${text.slice(0, 2)}••••`;
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

function mergeDeep(base, extra) {
  if (Array.isArray(base) || Array.isArray(extra)) {
    return deepClone(extra !== undefined ? extra : base);
  }

  const left = asObject(base);
  const right = asObject(extra);
  const result = { ...left };

  for (const [key, value] of Object.entries(right)) {
    if (isObject(value) && isObject(left[key])) {
      result[key] = mergeDeep(left[key], value);
      continue;
    }
    result[key] = deepClone(value);
  }

  return result;
}

function ensureDirForFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function defaultUsersSeed() {
  return [
    {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      name: 'Administrador',
    },
    {
      username: process.env.VIEWER_USERNAME || 'viewer',
      password: process.env.VIEWER_PASSWORD || 'viewer123',
      role: 'viewer',
      name: 'Visualizacao',
    },
  ];
}

function defaultBotSettings(name, color) {
  return {
    ui: {
      displayName: name || 'Nexus',
      accent: color || '#c9a227',
    },
    farm: {
      metas: {
        dinheiroSujo: 100000,
        componentes: 5000,
      },
      taxas: {
        droga: { label: 'Droga', pct: 0.65, color: '#e05c5c' },
        acao: { label: 'Acao', pct: 0.75, color: '#5b9cf6' },
        livre: { label: 'Livre', pct: 1, color: '#4caf6e' },
      },
      convLimpo: 0.5,
    },
    encomendas: {
      tipos: {
        comum: { label: 'Comum', preco: 45 },
        incomum: { label: 'Incomum', preco: 50 },
        rara: { label: 'Rara', preco: 55 },
        mitica: { label: 'Mitica', preco: 60 },
        lendaria: { label: 'Lendaria', preco: 65 },
      },
    },
  };
}

function emptyBotData() {
  return {
    farm: {},
    caixa: { sujo: 0, limpo: 0, auditoria: [] },
    bau: { itens: {}, auditoria: [] },
    compras: [],
    encomendas: [],
    acoes: [],
    registros: {},
    recrutamentos: [],
    farmLogs: [],
    metrics: {},
    notes: [],
    lastSync: null,
    lastSyncBySection: {},
  };
}

function defaultBotsSeed() {
  return [
    {
      id: process.env.DEFAULT_BOT_ID || 'nexus',
      name: process.env.DEFAULT_BOT_NAME || 'Nexus',
      description: 'Bot principal da Nexus.',
      color: process.env.DEFAULT_BOT_COLOR || '#c9a227',
      botKey: process.env.BOT_KEY || process.env.PAINEL_KEY || process.env.API_KEY || 'nexus-bot-key',
    },
  ];
}

function normalizeUser(raw, index = 0) {
  const username = String(raw?.username || `user${index + 1}`).trim();
  return {
    id: String(raw?.id || slugify(username, `user-${index + 1}`)),
    username,
    password: String(raw?.password || ''),
    role: raw?.role === 'viewer' ? 'viewer' : 'admin',
    name: String(raw?.name || username),
    active: raw?.active !== false,
  };
}

function normalizeSettings(input, botName, botColor) {
  const merged = mergeDeep(defaultBotSettings(botName, botColor), asObject(input));

  merged.ui.displayName = String(merged.ui.displayName || botName || 'Dashboard');
  merged.ui.accent = String(merged.ui.accent || botColor || '#c9a227');
  merged.farm.metas.dinheiroSujo = Math.max(0, asNumber(merged.farm.metas.dinheiroSujo, 100000));
  merged.farm.metas.componentes = Math.max(0, asNumber(merged.farm.metas.componentes, 5000));
  merged.farm.convLimpo = clamp(asNumber(merged.farm.convLimpo, 0.5), 0, 1);

  for (const [key, taxa] of Object.entries(merged.farm.taxas || {})) {
    merged.farm.taxas[key] = {
      label: String(taxa?.label || key),
      pct: clamp(asNumber(taxa?.pct, 1), 0, 1),
      color: String(taxa?.color || '#cccccc'),
    };
  }

  for (const [key, tipo] of Object.entries(merged.encomendas.tipos || {})) {
    merged.encomendas.tipos[key] = {
      label: String(tipo?.label || key),
      preco: Math.max(0, asNumber(tipo?.preco, 0)),
    };
  }

  return merged;
}

function normalizeCatalogEntry(entry) {
  const type = String(entry?.type || '').trim();
  if (!type) return null;
  return {
    type,
    label: String(entry?.label || type),
    group: String(entry?.group || 'Geral'),
    description: String(entry?.description || ''),
    payloadExample: isObject(entry?.payloadExample) ? deepClone(entry.payloadExample) : {},
    adminOnly: entry?.adminOnly !== false,
  };
}

function mergeCatalog(customCatalog) {
  const entries = [...BUILTIN_COMMANDS, ...asArray(customCatalog)]
    .map(normalizeCatalogEntry)
    .filter(Boolean);

  const byType = new Map();
  for (const entry of entries) byType.set(entry.type, entry);
  return [...byType.values()];
}

function normalizeBot(seed) {
  const id = String(seed?.id || slugify(seed?.name || 'bot'));
  const name = String(seed?.name || id);
  const color = String(seed?.color || '#c9a227');
  const createdAt = asNumber(seed?.createdAt, now());

  return {
    id,
    name,
    description: String(seed?.description || ''),
    color,
    botKey: String(seed?.botKey || `${id}-bot-key`),
    enabled: seed?.enabled !== false,
    settings: normalizeSettings(seed?.settings, name, color),
    data: mergeDeep(emptyBotData(), seed?.data),
    history: mergeDeep(
      {
        farm: [],
        caixa: [],
        encomendas: [],
        acoes: [],
        settings: [],
      },
      seed?.history
    ),
    commandCatalog: mergeCatalog(seed?.commandCatalog),
    commands: asArray(seed?.commands).map((command) => ({
      ...deepClone(command),
      status: String(command?.status || 'queued'),
    })),
    meta: mergeDeep({ tags: [] }, seed?.meta),
    createdAt,
    updatedAt: asNumber(seed?.updatedAt, createdAt),
  };
}

function normalizeStore(raw) {
  const source = asObject(raw);
  const store = {
    version: 2,
    users: [],
    bots: {},
  };

  const seededUsers = parseJsonEnv('DASHBOARD_USERS', defaultUsersSeed()).map(normalizeUser);
  const seededBots = parseJsonEnv('DASHBOARD_BOTS', defaultBotsSeed()).map(normalizeBot);

  const existingUsers = asArray(source.users).map(normalizeUser);
  const usersByUsername = new Map();
  for (const user of [...seededUsers, ...existingUsers]) usersByUsername.set(user.username, user);
  store.users = [...usersByUsername.values()];

  const existingBots = asObject(source.bots);
  const botSeeds = {};

  for (const bot of seededBots) botSeeds[bot.id] = bot;
  for (const [botId, rawBot] of Object.entries(existingBots)) {
    botSeeds[botId] = normalizeBot(mergeDeep(botSeeds[botId], { id: botId, ...asObject(rawBot) }));
  }

  store.bots = botSeeds;
  return store;
}

function createStoreManager(rootDir) {
  const storeFile = process.env.DASHBOARD_STORE_FILE || path.join(rootDir, 'dashboard-store.json');

  function loadStore() {
    try {
      if (fs.existsSync(storeFile)) {
        const parsed = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
        return normalizeStore(parsed);
      }
    } catch (error) {
      console.error('[STORE] Falha ao carregar store:', error.message);
    }
    return normalizeStore({});
  }

  let store = loadStore();

  function saveStore() {
    ensureDirForFile(storeFile);
    fs.writeFileSync(storeFile, JSON.stringify(store, null, 2), 'utf8');
  }

  saveStore();

  return {
    get file() {
      return storeFile;
    },
    get store() {
      return store;
    },
    saveStore,
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
  };
}

function matchesPassword(input, stored) {
  if (!stored) return false;
  if (stored.startsWith('sha256:')) return sha256(input) === stored.slice(7);
  return input === stored;
}

function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  SESSIONS.set(token, {
    token,
    userId: user.id,
    expiresAt: now() + (7 * 24 * 60 * 60 * 1000),
  });
  return token;
}

function getUserFromToken(store, token) {
  const session = SESSIONS.get(token);
  if (!session) return null;
  if (session.expiresAt <= now()) {
    SESSIONS.delete(token);
    return null;
  }
  return store.users.find((user) => user.id === session.userId) || null;
}

function authUser(store) {
  return (req, res, next) => {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const user = token ? getUserFromToken(store, token) : null;
    if (!user) return res.status(401).json({ erro: 'Sessao invalida.' });
    req.user = user;
    req.token = token;
    next();
  };
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
  }
  next();
}

function getBotFromCredentials(store, req) {
  const authHeader = String(req.headers.authorization || '');
  const headerBotId = String(req.headers['x-bot-id'] || req.params.botId || '').trim();
  const headerBotKey = String(req.headers['x-bot-key'] || '').trim();

  let suppliedKey = headerBotKey;
  if (!suppliedKey && authHeader && !authHeader.startsWith('Bearer ')) {
    suppliedKey = authHeader.startsWith('Bot ')
      ? authHeader.slice(4).trim()
      : authHeader.trim();
  }

  if (!suppliedKey) return null;

  if (headerBotId) {
    const bot = store.bots[headerBotId];
    if (bot && bot.botKey === suppliedKey) return bot;
  }

  const matches = Object.values(store.bots).filter((bot) => bot.botKey === suppliedKey);
  if (matches.length === 1) return matches[0];

  const defaultBotId = Object.keys(store.bots)[0];
  if (matches.length === 0 && defaultBotId && store.bots[defaultBotId]?.botKey === suppliedKey) {
    return store.bots[defaultBotId];
  }

  return null;
}

function authBot(store) {
  return (req, res, next) => {
    const bot = getBotFromCredentials(store, req);
    if (!bot) return res.status(401).json({ erro: 'Bot nao autorizado.' });
    req.bot = bot;
    next();
  };
}

function getBotStatus(bot) {
  const lastSync = asNumber(bot?.data?.lastSync, 0);
  if (!lastSync) return 'offline';
  const diff = now() - lastSync;
  if (diff <= 60_000) return 'online';
  if (diff <= 5 * 60_000) return 'instavel';
  return 'offline';
}

function calcFarmSummary(farmData, settings) {
  const farm = asObject(farmData);
  const cfg = normalizeSettings(settings, 'Bot', '#c9a227').farm;
  const members = Object.entries(farm)
    .map(([id, member]) => ({ id, ...asObject(member) }))
    .sort((left, right) => asNumber(right.sujo) - asNumber(left.sujo));

  const summary = {
    totalSujo: 0,
    totalComp: 0,
    totalCleanProjected: 0,
    members: members.length,
    activeMembers: 0,
    membersWithGoal: 0,
    ranking: [],
  };

  for (const member of members) {
    const sujo = asNumber(member.sujo);
    const comp = asNumber(member.comp);
    const ativo = sujo > 0 || comp > 0;
    const pctMoney = cfg.metas.dinheiroSujo > 0 ? Math.min(1, sujo / cfg.metas.dinheiroSujo) : 1;
    const pctComp = cfg.metas.componentes > 0 ? Math.min(1, comp / cfg.metas.componentes) : 1;
    const hitAny = sujo >= cfg.metas.dinheiroSujo || comp >= cfg.metas.componentes;

    let cleanProjected = 0;
    const excedente = Math.max(0, sujo - cfg.metas.dinheiroSujo);
    if (excedente > 0) {
      const totalTipos = asNumber(member.droga) + asNumber(member.acao) + asNumber(member.livre) || 1;
      for (const [tipo, taxa] of Object.entries(cfg.taxas)) {
        const valorTipo = asNumber(member[tipo]);
        if (!valorTipo) continue;
        const extra = excedente * (valorTipo / totalTipos);
        cleanProjected += extra * asNumber(taxa?.pct, 1) * cfg.convLimpo;
      }
    }

    summary.totalSujo += sujo;
    summary.totalComp += comp;
    summary.totalCleanProjected += cleanProjected;
    if (ativo) summary.activeMembers += 1;
    if (hitAny) summary.membersWithGoal += 1;

    summary.ranking.push({
      id: member.id,
      nome: member.nome || member.id,
      sujo,
      comp,
      pctMoney,
      pctComp,
      hitAny,
      cleanProjected,
    });
  }

  return summary;
}

function calcActionStats(actions) {
  const list = asArray(actions)
    .map((action) => asObject(action))
    .sort((left, right) => asNumber(left.ts) - asNumber(right.ts));

  const mvpMap = new Map();
  let wins = 0;
  let losses = 0;
  let streak = 0;

  for (const action of list) {
    const result = String(action.resultado || '').toLowerCase();
    const win = /vitor|win|sucesso/.test(result);
    const loss = /derrot|lose|fracasso|perd/.test(result);
    if (win) wins += 1;
    if (loss) losses += 1;

    const mvp = String(action.mvp || action.mvpName || action.destaque || '').trim();
    if (mvp) mvpMap.set(mvp, (mvpMap.get(mvp) || 0) + 1);
  }

  for (let index = list.length - 1; index >= 0; index -= 1) {
    const result = String(list[index].resultado || '').toLowerCase();
    if (/vitor|win|sucesso/.test(result)) streak += 1;
    else break;
  }

  const topMvp = [...mvpMap.entries()].sort((left, right) => right[1] - left[1])[0];

  return {
    total: list.length,
    wins,
    losses,
    pending: list.length - wins - losses,
    streak,
    winRate: list.length ? wins / list.length : 0,
    mvp: topMvp ? { nome: topMvp[0], vezes: topMvp[1] } : null,
  };
}

function appendHistory(bot, section, payload, timestamp) {
  const tracked = new Set(['farm', 'caixa', 'encomendas', 'acoes', 'settings']);
  if (!tracked.has(section)) return;

  const entry = {
    id: uid('hst'),
    ts: timestamp,
    data:
      section === 'farm'
        ? calcFarmSummary(payload, bot.settings)
        : section === 'acoes'
          ? { stats: calcActionStats(payload), items: asArray(payload).slice(-20) }
          : section === 'encomendas'
            ? {
                count: asArray(payload).length,
                total: asArray(payload).reduce((sum, item) => sum + asNumber(item?.total), 0),
              }
            : deepClone(payload),
  };

  bot.history[section] = [...asArray(bot.history[section]), entry].slice(-HISTORY_LIMIT);
}

function applySync(saveStore, bot, body) {
  const payload = asObject(body);
  const timestamp = asNumber(payload.timestamp, now());
  const section = String(payload.section || payload.tipo || '').trim();
  const data = payload.data !== undefined ? payload.data : payload.dados;

  if (!section || data === undefined) {
    throw new Error('Envie { section, data } ou { tipo, dados }.');
  }

  if (section === 'full') {
    const fullData = asObject(data);
    for (const [key, value] of Object.entries(fullData)) {
      if (key === 'settings') {
        bot.settings = normalizeSettings(value, bot.name, bot.color);
        appendHistory(bot, 'settings', bot.settings, timestamp);
        continue;
      }
      if (key === 'commandCatalog' || key === 'catalog') {
        bot.commandCatalog = mergeCatalog(value);
        continue;
      }
      bot.data[key] = deepClone(value);
      bot.data.lastSyncBySection[key] = timestamp;
      appendHistory(bot, key, value, timestamp);
    }
  } else if (section === 'settings') {
    bot.settings = normalizeSettings(data, bot.name, bot.color);
    appendHistory(bot, 'settings', bot.settings, timestamp);
  } else if (section === 'commandCatalog' || section === 'catalog') {
    bot.commandCatalog = mergeCatalog(data);
  } else {
    bot.data[section] = deepClone(data);
    bot.data.lastSyncBySection[section] = timestamp;
    appendHistory(bot, section, data, timestamp);
  }

  bot.data.lastSync = timestamp;
  bot.updatedAt = now();
  saveStore();
}

function enqueueCommand(saveStore, bot, input) {
  const command = {
    id: uid('cmd'),
    type: String(input?.type || '').trim(),
    label: String(input?.label || input?.type || '').trim(),
    payload: isObject(input?.payload) ? deepClone(input.payload) : {},
    status: 'queued',
    source: String(input?.source || 'dashboard'),
    createdAt: now(),
    createdBy: input?.createdBy ? deepClone(input.createdBy) : null,
    sentAt: null,
    executedAt: null,
    deliveryCount: 0,
    lockedUntil: null,
    result: null,
  };

  if (!command.type) throw new Error('Comando sem tipo.');
  if (command.type === 'settings.apply' && Object.keys(command.payload).length === 0) {
    command.payload = { settings: deepClone(bot.settings) };
  }

  bot.commands = [...asArray(bot.commands), command].slice(-500);
  bot.updatedAt = now();
  saveStore();
  return command;
}

function getDeliverableCommands(saveStore, bot) {
  const timestamp = now();
  const deliverable = asArray(bot.commands).filter((command) => {
    if (command.status === 'queued') return true;
    return command.status === 'sent' && asNumber(command.lockedUntil, 0) <= timestamp;
  });

  for (const command of deliverable) {
    command.status = 'sent';
    command.sentAt = timestamp;
    command.deliveryCount = asNumber(command.deliveryCount, 0) + 1;
    command.lockedUntil = timestamp + COMMAND_LOCK_MS;
  }

  if (deliverable.length) {
    bot.updatedAt = timestamp;
    saveStore();
  }

  return deepClone(deliverable);
}

function resolveCommand(saveStore, bot, commandId, result) {
  const command = asArray(bot.commands).find((item) => item.id === commandId);
  if (!command) return null;

  const payload = asObject(result);
  command.status = payload.ok === false ? 'failed' : 'done';
  command.executedAt = now();
  command.lockedUntil = null;
  command.result = {
    ok: payload.ok !== false,
    message: String(payload.message || ''),
    data: deepClone(payload.data),
  };
  bot.updatedAt = now();
  saveStore();
  return command;
}

function getBotSummary(bot, user) {
  const pendingCommands = asArray(bot.commands).filter((command) => command.status === 'queued' || command.status === 'sent').length;
  return {
    id: bot.id,
    name: bot.name,
    description: bot.description,
    color: bot.color,
    enabled: bot.enabled,
    status: getBotStatus(bot),
    lastSync: bot.data.lastSync,
    pendingCommands,
    settings: deepClone(bot.settings),
    botKeyPreview: user?.role === 'admin' ? maskSecret(bot.botKey) : undefined,
  };
}

function getBotDashboard(bot, user) {
  const farmSummary = calcFarmSummary(bot.data.farm, bot.settings);
  const actionStats = calcActionStats(bot.data.acoes);

  return {
    bot: getBotSummary(bot, user),
    permissions: {
      canManage: user.role === 'admin',
      canRunCommands: user.role === 'admin',
      canEditSettings: user.role === 'admin',
    },
    settings: deepClone(bot.settings),
    data: deepClone(bot.data),
    history: deepClone(bot.history),
    commandCatalog: mergeCatalog(bot.commandCatalog),
    commands: {
      pending: asArray(bot.commands)
        .filter((command) => command.status === 'queued' || command.status === 'sent')
        .slice()
        .sort((left, right) => asNumber(right.createdAt) - asNumber(left.createdAt))
        .slice(0, 40),
      recent: asArray(bot.commands)
        .slice()
        .sort((left, right) => asNumber(right.createdAt) - asNumber(left.createdAt))
        .slice(0, 80),
    },
    analytics: {
      farm: farmSummary,
      acoes: actionStats,
      encomendas: {
        total: asArray(bot.data.encomendas).reduce((sum, item) => sum + asNumber(item?.total), 0),
        quantidade: asArray(bot.data.encomendas).length,
      },
    },
    meta: {
      serverTime: now(),
      botId: bot.id,
      botKeyPreview: user.role === 'admin' ? maskSecret(bot.botKey) : undefined,
    },
  };
}

function getBootstrapPayload(store, user) {
  const bots = Object.values(store.bots)
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((bot) => getBotSummary(bot, user));

  return {
    user: sanitizeUser(user),
    bots,
    defaultBotId: bots[0]?.id || null,
    generatedAt: now(),
  };
}

function requireBotByParam(store) {
  return (req, res, next) => {
    const bot = store.bots[String(req.params.botId || '')];
    if (!bot) return res.status(404).json({ erro: 'Bot nao encontrado.' });
    req.targetBot = bot;
    next();
  };
}

function createDashboardServer(app, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const panelFile = options.panelFile || path.join(rootDir, 'painel-farm.html');
  const manager = createStoreManager(rootDir);
  const getStore = () => manager.store;

  app.use(require('express').json({ limit: '2mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Bot-Id, X-Bot-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/health', (_req, res) => {
    const store = getStore();
    res.json({
      ok: true,
      bots: Object.keys(store.bots).length,
      users: store.users.length,
      timestamp: now(),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const store = getStore();
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const user = store.users.find((candidate) => candidate.active && candidate.username === username);

    if (!user || !matchesPassword(password, user.password)) {
      return res.status(401).json({ erro: 'Credenciais invalidas.' });
    }

    const token = createSession(user);
    res.json({
      ok: true,
      token,
      ...getBootstrapPayload(store, user),
    });
  });

  app.get('/api/auth/session', authUser(getStore()), (req, res) => {
    res.json({
      ok: true,
      ...getBootstrapPayload(getStore(), req.user),
    });
  });

  app.post('/api/auth/logout', authUser(getStore()), (req, res) => {
    SESSIONS.delete(req.token);
    res.json({ ok: true });
  });

  app.get('/api/bots', authUser(getStore()), (req, res) => {
    res.json({
      bots: Object.values(getStore().bots).map((bot) => getBotSummary(bot, req.user)),
    });
  });

  app.get('/api/bots/:botId/dashboard', authUser(getStore()), requireBotByParam(getStore()), (req, res) => {
    res.json(getBotDashboard(req.targetBot, req.user));
  });

  app.post('/api/bots', authUser(getStore()), requireAdmin, (req, res) => {
    const store = getStore();
    const body = asObject(req.body);
    const botId = String(body.id || slugify(body.name || 'bot')).trim();
    if (!botId) return res.status(400).json({ erro: 'Informe um id para o bot.' });

    const base = store.bots[botId];
    const merged = normalizeBot(
      mergeDeep(base, {
        id: botId,
        name: body.name || base?.name || botId,
        description: body.description || base?.description || '',
        color: body.color || base?.color || '#c9a227',
        botKey: body.botKey || base?.botKey || `${botId}-bot-key`,
        settings: body.settings || base?.settings,
      })
    );

    store.bots[botId] = merged;
    manager.saveStore();

    res.json({
      ok: true,
      bot: getBotSummary(merged, req.user),
    });
  });

  app.put('/api/bots/:botId/settings', authUser(getStore()), requireAdmin, requireBotByParam(getStore()), (req, res) => {
    const bot = req.targetBot;
    const body = asObject(req.body);

    bot.name = String(body.name || bot.name);
    bot.description = String(body.description || bot.description || '');
    bot.color = String(body.color || bot.color || '#c9a227');
    bot.settings = normalizeSettings(body.settings || bot.settings, bot.name, bot.color);
    bot.updatedAt = now();

    appendHistory(bot, 'settings', bot.settings, now());
    enqueueCommand(manager.saveStore, bot, {
      type: 'settings.apply',
      label: 'Aplicar configuracoes',
      payload: { settings: bot.settings },
      source: 'dashboard',
      createdBy: sanitizeUser(req.user),
    });

    manager.saveStore();

    res.json({
      ok: true,
      dashboard: getBotDashboard(bot, req.user),
    });
  });

  app.post('/api/bots/:botId/commands', authUser(getStore()), requireAdmin, requireBotByParam(getStore()), (req, res) => {
    try {
      const command = enqueueCommand(manager.saveStore, req.targetBot, {
        type: req.body?.type,
        label: req.body?.label,
        payload: req.body?.payload,
        source: 'dashboard',
        createdBy: sanitizeUser(req.user),
      });

      res.json({
        ok: true,
        command,
      });
    } catch (error) {
      res.status(400).json({ erro: error.message });
    }
  });

  app.post('/api/bots/:botId/farm/reset', authUser(getStore()), requireAdmin, requireBotByParam(getStore()), (req, res) => {
    const bot = req.targetBot;
    bot.data.farm = {};
    bot.data.lastSync = now();
    bot.data.lastSyncBySection.farm = bot.data.lastSync;
    appendHistory(bot, 'farm', bot.data.farm, bot.data.lastSync);

    const command = enqueueCommand(manager.saveStore, bot, {
      type: 'farm.reset',
      label: 'Resetar farm',
      payload: { confirmar: true },
      source: 'dashboard',
      createdBy: sanitizeUser(req.user),
    });

    res.json({
      ok: true,
      command,
      dashboard: getBotDashboard(bot, req.user),
    });
  });

  app.post('/api/bots/:botId/sync', authBot(getStore()), (req, res) => {
    try {
      applySync(manager.saveStore, req.bot, req.body);
      res.json({
        ok: true,
        botId: req.bot.id,
        timestamp: req.bot.data.lastSync,
      });
    } catch (error) {
      res.status(400).json({ erro: error.message });
    }
  });

  app.post('/api/bots/:botId/catalog', authBot(getStore()), (req, res) => {
    req.bot.commandCatalog = mergeCatalog(req.body?.catalog);
    req.bot.updatedAt = now();
    manager.saveStore();
    res.json({
      ok: true,
      count: req.bot.commandCatalog.length,
    });
  });

  app.get('/api/bots/:botId/commands/pull', authBot(getStore()), (req, res) => {
    const commands = getDeliverableCommands(manager.saveStore, req.bot);
    res.json({
      ok: true,
      botId: req.bot.id,
      settings: req.bot.settings,
      commands,
      serverTime: now(),
    });
  });

  app.post('/api/bots/:botId/commands/:commandId/result', authBot(getStore()), (req, res) => {
    const command = resolveCommand(manager.saveStore, req.bot, req.params.commandId, req.body);
    if (!command) return res.status(404).json({ erro: 'Comando nao encontrado.' });
    res.json({
      ok: true,
      command,
    });
  });

  app.get('/api/farm', authBot(getStore()), (req, res) => {
    const dashboard = getBotDashboard(req.bot, { role: 'admin' });
    res.json({
      ...dashboard.data,
      meta: dashboard.settings.farm,
      timestamp: dashboard.data.lastSync,
    });
  });

  app.post('/api/sync', authBot(getStore()), (req, res) => {
    try {
      applySync(manager.saveStore, req.bot, req.body);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ erro: error.message });
    }
  });

  app.post('/api/reset', authBot(getStore()), (req, res) => {
    if (req.body?.confirmar !== true) {
      return res.status(400).json({ erro: 'Envie { "confirmar": true }' });
    }

    req.bot.data.farm = {};
    req.bot.data.lastSync = now();
    req.bot.data.lastSyncBySection.farm = req.bot.data.lastSync;
    appendHistory(req.bot, 'farm', req.bot.data.farm, req.bot.data.lastSync);
    manager.saveStore();

    res.json({ ok: true });
  });

  app.get('/', (_req, res) => {
    res.sendFile(panelFile);
  });

  app.get('/dashboard.css', (_req, res) => {
    res.sendFile(path.join(rootDir, 'dashboard.css'));
  });

  app.get('/dashboard-app.js', (_req, res) => {
    res.sendFile(path.join(rootDir, 'dashboard-app.js'));
  });

  console.log(`[DASHBOARD] Store: ${manager.file}`);
  for (const bot of Object.values(getStore().bots)) {
    console.log(`[DASHBOARD] Bot ${bot.id} -> ${maskSecret(bot.botKey)}`);
  }
}

module.exports = {
  createDashboardServer,
};
