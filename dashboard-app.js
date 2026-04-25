'use strict';

const STORAGE = {
  token: 'dashboard_hub_token',
  botId: 'dashboard_hub_bot_id',
};

const POLL_MS = 7000;

const STATE = {
  token: localStorage.getItem(STORAGE.token) || '',
  currentBotId: localStorage.getItem(STORAGE.botId) || '',
  user: null,
  bots: [],
  dashboard: null,
  page: 'overview',
  banner: null,
  poller: null,
  filters: {
    farmSearch: '',
    from: '',
    to: '',
  },
};

const PAGES = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'farm', label: 'Farm' },
  { id: 'operacoes', label: 'Operações' },
  { id: 'acoes', label: 'Ações' },
  { id: 'registros', label: 'Registros' },
  { id: 'commands', label: 'Comandos' },
  { id: 'settings', label: 'Configurações' },
];

const API = {
  async request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (STATE.token && options.auth !== false) {
      headers.Authorization = `Bearer ${STATE.token}`;
    }

    const response = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401 && options.auth !== false) {
      APP.logout(true);
      throw new Error('Sessao expirada.');
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.erro || `Erro ${response.status}`);
    }

    return payload;
  },

  login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { username, password },
    });
  },

  session() {
    return this.request('/api/auth/session');
  },

  logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  },

  fetchDashboard(botId) {
    return this.request(`/api/bots/${encodeURIComponent(botId)}/dashboard`);
  },

  runCommand(botId, body) {
    return this.request(`/api/bots/${encodeURIComponent(botId)}/commands`, {
      method: 'POST',
      body,
    });
  },

  resetFarm(botId) {
    return this.request(`/api/bots/${encodeURIComponent(botId)}/farm/reset`, {
      method: 'POST',
      body: {},
    });
  },

  saveSettings(botId, body) {
    return this.request(`/api/bots/${encodeURIComponent(botId)}/settings`, {
      method: 'PUT',
      body,
    });
  },

  upsertBot(body) {
    return this.request('/api/bots', {
      method: 'POST',
      body,
    });
  },
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function number(value) {
  return Math.round(Number(value || 0)).toLocaleString('pt-BR');
}

function currency(value) {
  return `R$ ${Math.round(Number(value || 0)).toLocaleString('pt-BR')}`;
}

function date(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  return withTime
    ? d.toLocaleString('pt-BR')
    : d.toLocaleDateString('pt-BR');
}

function statusClass(status) {
  if (status === 'online') return 'online';
  if (status === 'instavel') return 'instavel';
  return 'offline';
}

function badge(text, variant = 'warn') {
  return `<span class="chip ${variant}">${escapeHtml(text)}</span>`;
}

function table(headers, rows) {
  if (!Array.isArray(rows) || !rows.length) return '<div class="card empty">Nenhum registro encontrado.</div>';
  return `<div class="table-wrap"><table><thead><tr>${headers.map((item) => `<th>${escapeHtml(item)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

function statCard(label, value, sub = '') {
  return `<div class="stat-card"><div class="mini-label">${escapeHtml(label)}</div><div class="big">${value}</div>${sub ? `<div class="muted">${sub}</div>` : ''}</div>`;
}

function sectionHead(kicker, title, extra = '') {
  return `<div class="section-head"><div><div class="section-kicker">${escapeHtml(kicker)}</div><h3>${escapeHtml(title)}</h3></div>${extra}</div>`;
}

function parseJsonInput(value) {
  const source = String(value || '').trim();
  if (!source) return {};

  try {
    const parsed = JSON.parse(source);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error();
    }
    return parsed;
  } catch (_error) {
    throw new Error('Payload inválido. Use um JSON em formato de objeto, exemplo: {"canal":"123"}.');
  }
}

function jsString(value) {
  return JSON.stringify(String(value ?? ''));
}

function inDateRange(timestamp, from, to) {
  if (!timestamp) return false;
  const target = new Date(timestamp).getTime();
  if (from) {
    const start = new Date(`${from}T00:00:00`).getTime();
    if (target < start) return false;
  }
  if (to) {
    const end = new Date(`${to}T23:59:59`).getTime();
    if (target > end) return false;
  }
  return true;
}

function getFarmSettings() {
  return STATE.dashboard?.settings?.farm || {
    metas: { dinheiroSujo: 0, componentes: 0 },
    taxas: {},
    convLimpo: 0,
  };
}

function calcMember(member) {
  const cfg = getFarmSettings();
  const sujo = Number(member?.sujo || 0);
  const comp = Number(member?.comp || 0);
  const pctMoney = cfg.metas.dinheiroSujo > 0 ? Math.min(1, sujo / cfg.metas.dinheiroSujo) : 1;
  const pctComp = cfg.metas.componentes > 0 ? Math.min(1, comp / cfg.metas.componentes) : 1;
  const hitAny = sujo >= cfg.metas.dinheiroSujo || comp >= cfg.metas.componentes;

  let cleanProjected = 0;
  const extra = Math.max(0, sujo - cfg.metas.dinheiroSujo);
  if (extra > 0) {
    const totalTipos = Number(member?.droga || 0) + Number(member?.acao || 0) + Number(member?.livre || 0) || 1;
    Object.entries(cfg.taxas || {}).forEach(([tipo, taxa]) => {
      const valor = Number(member?.[tipo] || 0);
      if (!valor) return;
      cleanProjected += extra * (valor / totalTipos) * Number(taxa?.pct || 0) * Number(cfg.convLimpo || 0);
    });
  }

  return { pctMoney, pctComp, hitAny, cleanProjected };
}

function currentFarmRows() {
  const farm = STATE.dashboard?.data?.farm || {};
  const search = STATE.filters.farmSearch.trim().toLowerCase();
  return Object.entries(farm)
    .map(([id, member]) => ({ id, ...member }))
    .sort((left, right) => Number(right.sujo || 0) - Number(left.sujo || 0))
    .filter((member) => {
      if (!search) return true;
      return String(member.nome || member.id).toLowerCase().includes(search);
    });
}

function actionStats() {
  return STATE.dashboard?.analytics?.acoes || {
    total: 0,
    wins: 0,
    losses: 0,
    pending: 0,
    streak: 0,
    winRate: 0,
    mvp: null,
  };
}

const RENDER = {
  overview() {
    const dashboard = STATE.dashboard;
    const farm = dashboard?.analytics?.farm || { totalSujo: 0, totalComp: 0, activeMembers: 0, membersWithGoal: 0, ranking: [] };
    const actions = actionStats();
    const caixa = dashboard?.data?.caixa || { sujo: 0, limpo: 0 };
    const registros = dashboard?.data?.registros || {};
    const encomendas = dashboard?.analytics?.encomendas || { total: 0, quantidade: 0 };
    const pendingCommands = dashboard?.commands?.pending?.length || 0;

    const topFarm = farm.ranking.slice(0, 5).map((member, index) => [
      `<strong>${index + 1}. ${escapeHtml(member.nome)}</strong>`,
      `<span class="mono">${currency(member.sujo)}</span>`,
      member.hitAny ? badge('Meta batida', 'success') : badge('Pendente', 'warn'),
    ]);

    return `
      <div class="grid cards">
        ${statCard('Membros aprovados', number(Object.keys(registros).length), 'Base atual')}
        ${statCard('Farm total', currency(farm.totalSujo), `${number(farm.activeMembers)} ativos`)}
        ${statCard('Caixa total', currency(Number(caixa.sujo || 0) + Number(caixa.limpo || 0)), 'Sujo + limpo')}
        ${statCard('Comandos pendentes', number(pendingCommands), 'Fila de execução')}
      </div>

      <div class="grid two">
        <div class="card">
          ${sectionHead('Operacao', 'Resumo rapido')}
          <div class="inline-stats">
            ${badge(`Componentes: ${number(farm.totalComp)}`, 'warn')}
            ${badge(`Metas batidas: ${number(farm.membersWithGoal)}`, 'success')}
            ${badge(`Win rate: ${Math.round((actions.winRate || 0) * 100)}%`, 'warn')}
            ${badge(`Encomendas: ${currency(encomendas.total)}`, 'warn')}
          </div>
        </div>
        <div class="card">
          ${sectionHead('Conexao', 'Saude do bot')}
          <div class="inline-stats">
            ${badge(`Status: ${dashboard?.bot?.status || 'offline'}`, dashboard?.bot?.status === 'online' ? 'success' : 'danger')}
            ${badge(`Ultimo sync: ${date(dashboard?.bot?.lastSync, true)}`, 'warn')}
            ${actions.mvp ? badge(`MVP: ${actions.mvp.nome} (${actions.mvp.vezes})`, 'success') : badge('MVP: sem dados', 'warn')}
          </div>
        </div>
      </div>

      <div class="card">
        ${sectionHead('Ranking', 'Top farm atual')}
        ${table(['Membro', 'Total sujo', 'Status'], topFarm)}
      </div>
    `;
  },

  farm() {
    const farm = STATE.dashboard?.analytics?.farm || { totalSujo: 0, totalComp: 0, totalCleanProjected: 0, activeMembers: 0, membersWithGoal: 0 };
    const cfg = getFarmSettings();
    const history = (STATE.dashboard?.history?.farm || []).filter((item) => inDateRange(item.ts, STATE.filters.from, STATE.filters.to));
    const rows = currentFarmRows().map((member) => {
      const calc = calcMember(member);
      const status = calc.hitAny ? badge('Meta batida', 'success') : (member.sujo || member.comp) ? badge('Em andamento', 'warn') : badge('Sem entrega', 'danger');
      return [
        `<strong>${escapeHtml(member.nome || member.id)}</strong>`,
        `<span class="mono">${currency(member.sujo || 0)}</span>`,
        `<span class="mono">${number(member.comp || 0)}</span>`,
        `<span class="mono">${Math.round(calc.pctMoney * 100)}% / ${Math.round(calc.pctComp * 100)}%</span>`,
        `<span class="mono">${currency(calc.cleanProjected)}</span>`,
        status,
      ];
    });

    const historyRows = history
      .slice()
      .reverse()
      .map((item) => [
        `<span class="mono">${date(item.ts, true)}</span>`,
        `<span class="mono">${currency(item.data?.totalSujo || 0)}</span>`,
        `<span class="mono">${number(item.data?.totalComp || 0)}</span>`,
        `<span class="mono">${number(item.data?.activeMembers || 0)}</span>`,
        `<span class="mono">${number(item.data?.membersWithGoal || 0)}</span>`,
      ]);

    const adminButtons = STATE.user?.role === 'admin'
      ? `<div class="button-row"><button class="btn btn-danger" type="button" onclick="APP.resetFarm()">Resetar semana</button></div>`
      : '';

    return `
      <div class="grid cards">
        ${statCard('Total sujo', currency(farm.totalSujo), 'Semana atual')}
        ${statCard('Componentes', number(farm.totalComp), 'Semana atual')}
        ${statCard('Limpo projetado', currency(farm.totalCleanProjected), 'Excedente')}
        ${statCard('Metas batidas', `${number(farm.membersWithGoal)}/${number(farm.activeMembers)}`, 'Membros ativos')}
      </div>

      <div class="card">
        ${sectionHead('Regras', 'Configuração do farm', adminButtons)}
        <div class="inline-stats">
          ${badge(`Meta sujo: ${currency(cfg.metas?.dinheiroSujo || 0)}`, 'warn')}
          ${badge(`Meta comp: ${number(cfg.metas?.componentes || 0)}`, 'warn')}
          ${badge(`Conversao: ${Math.round(Number(cfg.convLimpo || 0) * 100)}%`, 'success')}
        </div>
      </div>

      <div class="card">
        ${sectionHead('Filtros', 'Pesquisa e recorte de historico')}
        <div class="grid three">
          <div class="field"><label for="farm-search">Buscar membro</label><input id="farm-search" type="text" value="${escapeHtml(STATE.filters.farmSearch)}" oninput="APP.setFilter('farmSearch', this.value)"></div>
          <div class="field"><label for="farm-from">De</label><input id="farm-from" type="date" value="${escapeHtml(STATE.filters.from)}" onchange="APP.setFilter('from', this.value)"></div>
          <div class="field"><label for="farm-to">Ate</label><input id="farm-to" type="date" value="${escapeHtml(STATE.filters.to)}" onchange="APP.setFilter('to', this.value)"></div>
        </div>
      </div>

      <div class="card">
        ${sectionHead('Atual', 'Ranking do farm')}
        ${table(['Membro', 'Sujo', 'Comp', 'Progresso', 'Limpo proj.', 'Status'], rows)}
      </div>

      <div class="card">
        ${sectionHead('Histórico', 'Snapshots do farm')}
        ${table(['Momento', 'Total sujo', 'Comp', 'Ativos', 'Metas'], historyRows)}
      </div>
    `;
  },

  operacoes() {
    const caixa = STATE.dashboard?.data?.caixa || { sujo: 0, limpo: 0, auditoria: [] };
    const bau = STATE.dashboard?.data?.bau || { itens: {}, auditoria: [] };
    const compras = (STATE.dashboard?.data?.compras || []).slice().reverse().slice(0, 25);
    const encomendas = (STATE.dashboard?.data?.encomendas || []).slice().reverse().slice(0, 25);

    const itens = Object.entries(bau.itens || {}).map(([item, qtd]) => [escapeHtml(item), `<span class="mono">${number(qtd)}</span>`]);
    const comprasRows = compras.map((item) => [
      escapeHtml(item.item || '—'),
      `<span class="mono">${number(item.qtd || 0)}</span>`,
      `<span class="mono">${currency(item.valor || 0)}</span>`,
      escapeHtml(item.operador || '—'),
      `<span class="mono">${date(item.ts, true)}</span>`,
    ]);

    const encomendasRows = encomendas.map((item) => [
      escapeHtml(item.familia || '—'),
      `<span class="mono">${currency(item.total || 0)}</span>`,
      escapeHtml(Object.entries(item.itens || {}).map(([key, qtd]) => `${key}: ${qtd}`).join(' · ') || '—'),
      `<span class="mono">${date(item.ts, true)}</span>`,
    ]);

    return `
      <div class="grid cards">
        ${statCard('Caixa sujo', currency(caixa.sujo || 0))}
        ${statCard('Caixa limpo', currency(caixa.limpo || 0))}
        ${statCard('Itens no bau', number(Object.keys(bau.itens || {}).length))}
        ${statCard('Encomendas', number(encomendas.length), 'Registros recentes')}
      </div>

      <div class="grid two">
        <div class="card">
          ${sectionHead('Bau', 'Inventario')}
          ${table(['Item', 'Quantidade'], itens)}
        </div>
        <div class="card">
          ${sectionHead('Compras', 'Ultimas operacoes')}
          ${table(['Item', 'Qtd', 'Valor', 'Operador', 'Data'], comprasRows)}
        </div>
      </div>

      <div class="card">
        ${sectionHead('Encomendas', 'Pedidos registrados')}
        ${table(['Familia', 'Total', 'Itens', 'Data'], encomendasRows)}
      </div>
    `;
  },

  acoes() {
    const acoes = (STATE.dashboard?.data?.acoes || []).slice().reverse();
    const stats = actionStats();
    const rows = acoes.map((acao) => [
      escapeHtml(acao.nome || '—'),
      escapeHtml(acao.resultado || 'Em andamento'),
      `<span class="mono">${number(acao.confirmados || 0)}</span>`,
      `<span class="mono">${number(acao.reservas || 0)}</span>`,
      escapeHtml(acao.mvp || acao.mvpName || acao.destaque || '—'),
      `<span class="mono">${date(acao.ts, true)}</span>`,
    ]);

    return `
      <div class="grid cards">
        ${statCard('Acoes', number(stats.total))}
        ${statCard('Vitorias', number(stats.wins))}
        ${statCard('Derrotas', number(stats.losses))}
        ${statCard('Sequencia', number(stats.streak), stats.mvp ? `MVP: ${escapeHtml(stats.mvp.nome)}` : 'Sem MVP')}
      </div>

      <div class="card">
        ${sectionHead('Combate', 'Histórico de acoes')}
        ${table(['Acao', 'Resultado', 'Confirmados', 'Reservas', 'MVP', 'Data'], rows)}
      </div>
    `;
  },

  registros() {
    const registros = Object.entries(STATE.dashboard?.data?.registros || {});
    const recrutamentos = (STATE.dashboard?.data?.recrutamentos || []).slice().reverse();

    const memberRows = registros.map(([, registro]) => [
      escapeHtml(registro.nome || '—'),
      `<span class="mono">${escapeHtml(registro.id || '—')}</span>`,
      escapeHtml(registro.tel || '—'),
      escapeHtml(registro.rec || '—'),
    ]);

    const recruitRows = recrutamentos.map((item) => [
      escapeHtml(item.recrutador || '—'),
      escapeHtml(item.nome || '—'),
      `<span class="mono">${escapeHtml(item.passaporte || item.id || '—')}</span>`,
      item.aprovado === false ? badge('Reprovado', 'danger') : item.aprovado === true ? badge('Aprovado', 'success') : badge('Pendente', 'warn'),
      `<span class="mono">${date(item.ts, true)}</span>`,
    ]);

    return `
      <div class="grid two">
        <div class="card">
          ${sectionHead('Membros', 'Registros aprovados')}
          ${table(['Nome', 'ID', 'Telefone', 'Recrutador'], memberRows)}
        </div>
        <div class="card">
          ${sectionHead('Recrutamento', 'Avaliacoes')}
          ${table(['Recrutador', 'Candidato', 'Passaporte', 'Status', 'Data'], recruitRows)}
        </div>
      </div>
    `;
  },

  commands() {
    const catalog = STATE.dashboard?.commandCatalog || [];
    const pending = STATE.dashboard?.commands?.pending || [];
    const recent = STATE.dashboard?.commands?.recent || [];
    const isAdmin = STATE.user?.role === 'admin';

    const catalogCards = catalog.map((command) => `
      <div class="command-card">
        <div class="mini-label">${escapeHtml(command.group || 'Geral')}</div>
        <h3>${escapeHtml(command.label || command.type)}</h3>
        <p class="muted">${escapeHtml(command.description || 'Sem descrição.')}</p>
        <div class="inline-stats">
          ${badge(command.type, 'warn')}
          ${command.adminOnly ? badge('Admin', 'danger') : badge('Livre', 'success')}
        </div>
        ${isAdmin ? `<div class="button-row" style="margin-top:12px"><button class="btn btn-secondary" type="button" onclick="APP.quickCommand(${jsString(command.type)})">Executar</button></div>` : ''}
      </div>
    `).join('');

    const pendingRows = pending.map((command) => [
      `<span class="mono">${escapeHtml(command.type)}</span>`,
      escapeHtml(command.label || '—'),
      badge(command.status, command.status === 'done' ? 'success' : command.status === 'failed' ? 'danger' : 'warn'),
      `<span class="mono">${date(command.createdAt, true)}</span>`,
      escapeHtml(command.result?.message || 'Aguardando retorno'),
    ]);

    const recentRows = recent.map((command) => [
      `<span class="mono">${escapeHtml(command.type)}</span>`,
      badge(command.status, command.status === 'done' ? 'success' : command.status === 'failed' ? 'danger' : 'warn'),
      `<span class="mono">${date(command.createdAt, true)}</span>`,
      `<span class="mono">${date(command.executedAt, true)}</span>`,
      escapeHtml(command.result?.message || '—'),
    ]);

    const composer = isAdmin ? `
      <div class="card">
        ${sectionHead('Execução', 'Comando customizado')}
        <div class="grid three">
          <div class="field"><label for="cmd-type">Tipo</label><input id="cmd-type" type="text" placeholder="ex: escala.publicar"></div>
          <div class="field"><label for="cmd-label">Label</label><input id="cmd-label" type="text" placeholder="Nome visível"></div>
          <div class="field"><label for="cmd-payload">Payload JSON</label><textarea id="cmd-payload" placeholder='{"canal":"123"}'></textarea></div>
        </div>
        <div class="button-row"><button class="btn btn-primary" type="button" onclick="APP.sendCustomCommand()">Enviar comando</button></div>
      </div>
    ` : `<div class="card"><p class="muted">Seu acesso é somente leitura. Histórico visível, execução bloqueada.</p></div>`;

    return `
      <div class="command-grid">${catalogCards || '<div class="card empty">Nenhum comando catalogado pelo bot ainda.</div>'}</div>
      ${composer}
      <div class="card">
        ${sectionHead('Fila', 'Comandos pendentes')}
        ${table(['Tipo', 'Label', 'Status', 'Criado em', 'Retorno'], pendingRows)}
      </div>
      <div class="card">
        ${sectionHead('Histórico', 'Últimos comandos')}
        ${table(['Tipo', 'Status', 'Criado em', 'Executado em', 'Retorno'], recentRows)}
      </div>
    `;
  },

  settings() {
    const bot = STATE.dashboard?.bot || {};
    const settings = STATE.dashboard?.settings || {};
    const farm = settings.farm || { metas: {}, taxas: {}, convLimpo: 0 };
    const encomendas = settings.encomendas?.tipos || {};
    const readOnly = STATE.user?.role !== 'admin' ? 'disabled' : '';

    return `
      <div class="card">
        ${sectionHead('Bot', 'Identidade e regras')}
        <div class="grid three">
          <div class="field"><label for="cfg-name">Nome do bot</label><input id="cfg-name" type="text" value="${escapeHtml(bot.name || '')}" ${readOnly}></div>
          <div class="field"><label for="cfg-description">Descrição</label><input id="cfg-description" type="text" value="${escapeHtml(bot.description || '')}" ${readOnly}></div>
          <div class="field"><label for="cfg-color">Cor</label><input id="cfg-color" type="text" value="${escapeHtml(bot.color || '#c9a227')}" ${readOnly}></div>
          <div class="field"><label for="cfg-meta-sujo">Meta sujo</label><input id="cfg-meta-sujo" type="number" value="${Number(farm.metas?.dinheiroSujo || 0)}" ${readOnly}></div>
          <div class="field"><label for="cfg-meta-comp">Meta comp</label><input id="cfg-meta-comp" type="number" value="${Number(farm.metas?.componentes || 0)}" ${readOnly}></div>
          <div class="field"><label for="cfg-conv">Conversao limpo</label><input id="cfg-conv" type="number" step="0.01" value="${Number(farm.convLimpo || 0)}" ${readOnly}></div>
          <div class="field"><label for="cfg-taxa-droga">Taxa droga</label><input id="cfg-taxa-droga" type="number" step="0.01" value="${Number(farm.taxas?.droga?.pct || 0)}" ${readOnly}></div>
          <div class="field"><label for="cfg-taxa-acao">Taxa acao</label><input id="cfg-taxa-acao" type="number" step="0.01" value="${Number(farm.taxas?.acao?.pct || 0)}" ${readOnly}></div>
          <div class="field"><label for="cfg-taxa-livre">Taxa livre</label><input id="cfg-taxa-livre" type="number" step="0.01" value="${Number(farm.taxas?.livre?.pct || 0)}" ${readOnly}></div>
        </div>
        <div class="grid three">
          ${Object.entries(encomendas).map(([key, item]) => `<div class="field"><label for="price-${key}">Preco ${escapeHtml(item.label || key)}</label><input id="price-${key}" type="number" value="${Number(item.preco || 0)}" ${readOnly}></div>`).join('')}
        </div>
        ${STATE.user?.role === 'admin' ? '<div class="button-row"><button class="btn btn-primary" type="button" onclick="APP.saveSettings()">Salvar configuracoes</button></div>' : '<p class="muted">Seu acesso permite visualizar, mas nao editar configuracoes.</p>'}
      </div>

      <div class="card">
        ${sectionHead('Expansao', 'Cadastro de outro bot')}
        <div class="grid three">
          <div class="field"><label for="new-bot-id">ID</label><input id="new-bot-id" type="text" placeholder="ex: atlas" ${readOnly}></div>
          <div class="field"><label for="new-bot-name">Nome</label><input id="new-bot-name" type="text" placeholder="Atlas" ${readOnly}></div>
          <div class="field"><label for="new-bot-key">Bot key</label><input id="new-bot-key" type="text" placeholder="segredo-do-bot" ${readOnly}></div>
        </div>
        <div class="field"><label for="new-bot-description">Descrição</label><input id="new-bot-description" type="text" placeholder="Descrição do bot" ${readOnly}></div>
        ${STATE.user?.role === 'admin' ? '<div class="button-row"><button class="btn btn-secondary" type="button" onclick="APP.createBot()">Cadastrar bot</button></div>' : ''}
      </div>
    `;
  },
};

const APP = {
  async boot() {
    this.bindStaticEvents();

    if (!STATE.token) {
      this.showLogin();
      return;
    }

    try {
      const session = await API.session();
      this.consumeBootstrap(session);
      await this.refresh();
    } catch (_error) {
      this.logout(true);
    }
  },

  bindStaticEvents() {
    $('login-btn').addEventListener('click', () => this.login());
    $('refresh-btn').addEventListener('click', () => this.refresh(true));
    $('logout-btn').addEventListener('click', () => this.logout());
    $('bot-select').addEventListener('change', (event) => this.changeBot(event.target.value));
    $('login-pass').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') this.login();
    });
  },

  showLogin() {
    $('login-screen').classList.remove('hidden');
    $('app').classList.add('hidden');
  },

  showApp() {
    $('login-screen').classList.add('hidden');
    $('app').classList.remove('hidden');
  },

  consumeBootstrap(payload) {
    STATE.user = payload.user;
    STATE.bots = payload.bots || [];
    STATE.currentBotId = STATE.currentBotId && STATE.bots.some((bot) => bot.id === STATE.currentBotId)
      ? STATE.currentBotId
      : payload.defaultBotId || STATE.bots[0]?.id || '';
    localStorage.setItem(STORAGE.botId, STATE.currentBotId);
    this.renderShell();
    this.showApp();
  },

  async login() {
    $('login-error').textContent = '';
    try {
      const username = $('login-user').value.trim();
      const password = $('login-pass').value;
      const response = await API.login(username, password);
      STATE.token = response.token;
      localStorage.setItem(STORAGE.token, STATE.token);
      this.consumeBootstrap(response);
      await this.refresh();
    } catch (error) {
      $('login-error').textContent = error.message;
    }
  },

  async logout(silent = false) {
    if (!silent && STATE.token) {
      try { await API.logout(); } catch (_error) { }
    }
    STATE.token = '';
    STATE.user = null;
    STATE.bots = [];
    STATE.dashboard = null;
    localStorage.removeItem(STORAGE.token);
    clearInterval(STATE.poller);
    this.showLogin();
  },

  async refresh(showBanner = false) {
    if (!STATE.currentBotId) return;
    const dashboard = await API.fetchDashboard(STATE.currentBotId);
    STATE.dashboard = dashboard;
    this.renderShell();
    this.renderPage();
    if (showBanner) this.notify('Dados atualizados.', 'success');
    clearInterval(STATE.poller);
    STATE.poller = setInterval(() => this.refresh().catch(() => this.notify('Falha ao atualizar automaticamente.', 'error')), POLL_MS);
  },

  renderShell() {
    $('session-name').textContent = STATE.user?.name || '—';
    $('session-role').textContent = STATE.user?.role || 'viewer';
    $('bot-select').innerHTML = STATE.bots.map((bot) => `<option value="${escapeHtml(bot.id)}"${bot.id === STATE.currentBotId ? ' selected' : ''}>${escapeHtml(bot.name)}</option>`).join('');

    $('bot-mini-list').innerHTML = STATE.bots.map((bot) => `
      <div class="mini-item">
        <strong>${escapeHtml(bot.name)}</strong>
        <div class="muted">${escapeHtml(bot.id)} · ${escapeHtml(bot.status)}</div>
        <div class="muted">Pendentes: ${number(bot.pendingCommands || 0)}</div>
      </div>
    `).join('');

    $('page-nav').innerHTML = PAGES.map((page) => `
      <button class="tab-btn${STATE.page === page.id ? ' active' : ''}" type="button" onclick="APP.goTo('${page.id}')">${escapeHtml(page.label)}</button>
    `).join('');

    const bot = STATE.dashboard?.bot || STATE.bots.find((item) => item.id === STATE.currentBotId) || {};
    $('bot-title').textContent = bot.name || 'Selecione um bot';
    $('bot-description').textContent = bot.description || 'Sem descrição.';
    $('bot-status').textContent = bot.status || 'offline';
    $('status-dot').className = `status-dot ${statusClass(bot.status)}`;
  },

  renderPage() {
    if (!STATE.dashboard) {
      $('page-content').innerHTML = '<div class="card empty">Aguardando dados do bot.</div>';
      return;
    }

    const render = RENDER[STATE.page] || RENDER.overview;
    $('page-content').innerHTML = render();
    this.renderBanner();
  },

  renderBanner() {
    $('banner').innerHTML = STATE.banner ? `<div class="banner ${STATE.banner.type}">${escapeHtml(STATE.banner.message)}</div>` : '';
  },

  notify(message, type = 'info') {
    STATE.banner = { message, type };
    this.renderBanner();
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => {
      STATE.banner = null;
      this.renderBanner();
    }, 3500);
  },

  goTo(page) {
    STATE.page = RENDER[page] ? page : 'overview';
    this.renderShell();
    this.renderPage();
  },

  changeBot(botId) {
    STATE.currentBotId = botId;
    localStorage.setItem(STORAGE.botId, botId);
    this.refresh(true).catch((error) => this.notify(error.message, 'error'));
  },

  setFilter(key, value) {
    STATE.filters[key] = value;
    if (STATE.page === 'farm') this.renderPage();
  },

  async resetFarm() {
    if (STATE.user?.role !== 'admin') return;
    if (!window.confirm('Tem certeza que deseja resetar o farm semanal?')) return;
    try {
      await API.resetFarm(STATE.currentBotId);
      await this.refresh();
      this.notify('Reset solicitado e fila atualizada.', 'success');
    } catch (error) {
      this.notify(error.message, 'error');
    }
  },

  async quickCommand(type) {
    const item = (STATE.dashboard?.commandCatalog || []).find((command) => command.type === type);
    if (!item) {
      this.notify('Comando não encontrado no catálogo do bot.', 'error');
      return;
    }

    try {
      await API.runCommand(STATE.currentBotId, {
        type,
        label: item.label || type,
        payload: item.payloadExample && typeof item.payloadExample === 'object' && !Array.isArray(item.payloadExample) ? item.payloadExample : {},
      });
      await this.refresh();
      this.notify(`Comando ${type} enviado.`, 'success');
    } catch (error) {
      this.notify(error.message, 'error');
    }
  },

  async sendCustomCommand() {
    try {
      const type = $('cmd-type').value.trim();
      const label = $('cmd-label').value.trim() || type;
      const payload = parseJsonInput($('cmd-payload').value);

      if (!type) throw new Error('Informe o tipo do comando.');
      if (!/^[a-z0-9_.:-]+$/i.test(type)) throw new Error('Tipo de comando inválido. Use letras, números, ponto, hífen, underline ou dois pontos.');

      await API.runCommand(STATE.currentBotId, { type, label, payload });
      await this.refresh();
      this.notify('Comando customizado enviado.', 'success');
    } catch (error) {
      this.notify(error.message, 'error');
    }
  },

  async saveSettings() {
    try {
      const settings = {
        farm: {
          metas: {
            dinheiroSujo: Number($('cfg-meta-sujo').value || 0),
            componentes: Number($('cfg-meta-comp').value || 0),
          },
          convLimpo: Number($('cfg-conv').value || 0),
          taxas: {
            droga: { pct: Number($('cfg-taxa-droga').value || 0) },
            acao: { pct: Number($('cfg-taxa-acao').value || 0) },
            livre: { pct: Number($('cfg-taxa-livre').value || 0) },
          },
        },
        encomendas: {
          tipos: Object.fromEntries(Object.keys(STATE.dashboard?.settings?.encomendas?.tipos || {}).map((key) => [
            key,
            {
              ...STATE.dashboard.settings.encomendas.tipos[key],
              preco: Number($(`price-${key}`).value || 0),
            },
          ])),
        },
      };

      await API.saveSettings(STATE.currentBotId, {
        name: $('cfg-name').value.trim(),
        description: $('cfg-description').value.trim(),
        color: $('cfg-color').value.trim(),
        settings,
      });

      await this.refresh();
      this.notify('Configurações salvas e comando de sync enfileirado.', 'success');
    } catch (error) {
      this.notify(error.message, 'error');
    }
  },

  async createBot() {
    try {
      await API.upsertBot({
        id: $('new-bot-id').value.trim(),
        name: $('new-bot-name').value.trim(),
        botKey: $('new-bot-key').value.trim(),
        description: $('new-bot-description').value.trim(),
      });

      const session = await API.session();
      this.consumeBootstrap(session);
      await this.refresh();
      this.notify('Novo bot cadastrado.', 'success');
    } catch (error) {
      this.notify(error.message, 'error');
    }
  },
};

window.APP = APP;
APP.boot();
