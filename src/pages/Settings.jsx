import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Card, SectionTitle } from '../components/ui';

const toNumber = (value) => Number(value || 0);

export function Settings({ dashboard, isAdmin, onSaveSettings, onCreateBot }) {
  const bot = dashboard?.bot || {};
  const settings = dashboard?.settings || {};
  const encomendas = settings?.encomendas?.tipos || {};

  const [form, setForm] = useState(() => ({
    name: bot.name || '',
    description: bot.description || '',
    color: bot.color || '#c9a227',
    metaSujo: settings?.farm?.metas?.dinheiroSujo || 0,
    metaComp: settings?.farm?.metas?.componentes || 0,
    convLimpo: settings?.farm?.convLimpo || 0,
    taxaDroga: settings?.farm?.taxas?.droga?.pct || 0,
    taxaAcao: settings?.farm?.taxas?.acao?.pct || 0,
    taxaLivre: settings?.farm?.taxas?.livre?.pct || 0,
  }));

  const [prices, setPrices] = useState(() => Object.fromEntries(Object.entries(encomendas).map(([key, item]) => [key, item.preco || 0])));
  const [newBot, setNewBot] = useState({ id: '', name: '', botKey: '', description: '' });

  const disabled = !isAdmin;

  const priceInputs = useMemo(() => Object.entries(encomendas), [encomendas]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save() {
    const nextTipos = Object.fromEntries(Object.entries(encomendas).map(([key, item]) => [key, { ...item, preco: toNumber(prices[key]) }]));
    onSaveSettings({
      name: form.name,
      description: form.description,
      color: form.color,
      settings: {
        ...settings,
        farm: {
          ...settings.farm,
          convLimpo: toNumber(form.convLimpo),
          metas: {
            ...(settings.farm?.metas || {}),
            dinheiroSujo: toNumber(form.metaSujo),
            componentes: toNumber(form.metaComp),
          },
          taxas: {
            ...(settings.farm?.taxas || {}),
            droga: { ...(settings.farm?.taxas?.droga || {}), pct: toNumber(form.taxaDroga) },
            acao: { ...(settings.farm?.taxas?.acao || {}), pct: toNumber(form.taxaAcao) },
            livre: { ...(settings.farm?.taxas?.livre || {}), pct: toNumber(form.taxaLivre) },
          },
        },
        encomendas: {
          ...(settings.encomendas || {}),
          tipos: nextTipos,
        },
      },
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title="Identidade do bot" subtitle="Configurações principais do painel" />
        <div className="grid gap-4 lg:grid-cols-3">
          <input className="input" disabled={disabled} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Nome do bot" />
          <input className="input" disabled={disabled} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Descrição" />
          <input className="input" disabled={disabled} value={form.color} onChange={(event) => update('color', event.target.value)} placeholder="#c9a227" />
        </div>
      </Card>

      <Card>
        <SectionTitle title="Regras de farm" subtitle="Metas, conversões e taxas" />
        <div className="grid gap-4 lg:grid-cols-3">
          <input className="input" disabled={disabled} type="number" value={form.metaSujo} onChange={(event) => update('metaSujo', event.target.value)} placeholder="Meta sujo" />
          <input className="input" disabled={disabled} type="number" value={form.metaComp} onChange={(event) => update('metaComp', event.target.value)} placeholder="Meta comp" />
          <input className="input" disabled={disabled} type="number" step="0.01" value={form.convLimpo} onChange={(event) => update('convLimpo', event.target.value)} placeholder="Conversão limpo" />
          <input className="input" disabled={disabled} type="number" step="0.01" value={form.taxaDroga} onChange={(event) => update('taxaDroga', event.target.value)} placeholder="Taxa droga" />
          <input className="input" disabled={disabled} type="number" step="0.01" value={form.taxaAcao} onChange={(event) => update('taxaAcao', event.target.value)} placeholder="Taxa ação" />
          <input className="input" disabled={disabled} type="number" step="0.01" value={form.taxaLivre} onChange={(event) => update('taxaLivre', event.target.value)} placeholder="Taxa livre" />
        </div>
        {priceInputs.length > 0 && (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {priceInputs.map(([key, item]) => (
              <input key={key} className="input" disabled={disabled} type="number" value={prices[key]} onChange={(event) => setPrices((current) => ({ ...current, [key]: event.target.value }))} placeholder={`Preço ${item.label || key}`} />
            ))}
          </div>
        )}
        {isAdmin && <button className="btn btn-primary mt-5" onClick={save}><Save size={17} /> Salvar configurações</button>}
      </Card>

      <Card>
        <SectionTitle title="Cadastrar novo bot" subtitle="Expansão para múltiplos bots/servidores" />
        <div className="grid gap-4 lg:grid-cols-3">
          <input className="input" disabled={disabled} value={newBot.id} onChange={(event) => setNewBot((current) => ({ ...current, id: event.target.value }))} placeholder="ID: atlas" />
          <input className="input" disabled={disabled} value={newBot.name} onChange={(event) => setNewBot((current) => ({ ...current, name: event.target.value }))} placeholder="Nome" />
          <input className="input" disabled={disabled} value={newBot.botKey} onChange={(event) => setNewBot((current) => ({ ...current, botKey: event.target.value }))} placeholder="Bot key" />
        </div>
        <input className="input mt-4" disabled={disabled} value={newBot.description} onChange={(event) => setNewBot((current) => ({ ...current, description: event.target.value }))} placeholder="Descrição" />
        {isAdmin && <button className="btn btn-secondary mt-5" onClick={() => onCreateBot(newBot)}>Cadastrar bot</button>}
      </Card>
    </div>
  );
}
