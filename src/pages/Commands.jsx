import { useState } from 'react';
import { Play, Send } from 'lucide-react';
import { Badge, Card, DataTable, SectionTitle } from '../components/ui';
import { date } from '../lib/format';

function parsePayload(value) {
  const source = value.trim();
  if (!source) return {};
  try {
    const parsed = JSON.parse(source);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
    return parsed;
  } catch {
    throw new Error('Payload inválido. Use JSON válido, exemplo: {"canal":"123"}.');
  }
}

export function Commands({ dashboard, isAdmin, onCommand, search }) {
  const [type, setType] = useState('');
  const [label, setLabel] = useState('');
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');
  const query = search.trim().toLowerCase();
  const catalog = (dashboard?.commandCatalog || []).filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
  const pending = dashboard?.commands?.pending || [];
  const recent = dashboard?.commands?.recent || [];

  async function sendCustom() {
    setError('');
    try {
      if (!type.trim()) throw new Error('Informe o tipo do comando.');
      await onCommand({ type: type.trim(), label: label.trim() || type.trim(), payload: parsePayload(payload) });
      setType('');
      setLabel('');
      setPayload('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {catalog.map((command) => (
          <Card key={command.type}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-amber-200">{command.group || 'Geral'}</p>
                <h3 className="mt-2 text-lg font-black">{command.label || command.type}</h3>
              </div>
              <Badge tone={command.adminOnly ? 'danger' : 'success'}>{command.adminOnly ? 'Admin' : 'Livre'}</Badge>
            </div>
            <p className="min-h-12 text-sm text-slate-400">{command.description || 'Sem descrição.'}</p>
            <div className="mt-4 flex flex-wrap gap-2"><Badge tone="info">{command.type}</Badge></div>
            {isAdmin && <button className="btn btn-secondary mt-5 w-full" onClick={() => onCommand({ type: command.type, label: command.label || command.type, payload: command.payloadExample || {} })}><Play size={17} /> Executar</button>}
          </Card>
        ))}
      </div>

      {isAdmin && (
        <Card>
          <SectionTitle title="Comando customizado" subtitle="Envie uma instrução direta para a fila do bot" />
          <div className="grid gap-4 lg:grid-cols-3">
            <input className="input" value={type} onChange={(event) => setType(event.target.value)} placeholder="Tipo: escala.publicar" />
            <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label visível" />
            <textarea className="input min-h-28" value={payload} onChange={(event) => setPayload(event.target.value)} placeholder='{"canal":"123"}' />
          </div>
          {error && <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm font-bold text-red-200">{error}</p>}
          <button className="btn btn-primary mt-5" onClick={sendCustom}><Send size={17} /> Enviar comando</button>
        </Card>
      )}

      <Card>
        <SectionTitle title="Fila" subtitle="Comandos aguardando execução" />
        <DataTable columns={['Tipo', 'Label', 'Status', 'Criado em', 'Retorno']} rows={pending.map((command) => [
          <span className="font-mono">{command.type}</span>,
          command.label || '—',
          <Badge tone={command.status === 'done' ? 'success' : command.status === 'failed' ? 'danger' : 'warn'}>{command.status}</Badge>,
          date(command.createdAt, true),
          command.result?.message || 'Aguardando retorno',
        ])} />
      </Card>

      <Card>
        <SectionTitle title="Histórico" subtitle="Últimos comandos processados" />
        <DataTable columns={['Tipo', 'Status', 'Criado', 'Executado', 'Retorno']} rows={recent.map((command) => [
          <span className="font-mono">{command.type}</span>,
          <Badge tone={command.status === 'done' ? 'success' : command.status === 'failed' ? 'danger' : 'warn'}>{command.status}</Badge>,
          date(command.createdAt, true),
          date(command.executedAt, true),
          command.result?.message || '—',
        ])} />
      </Card>
    </div>
  );
}
