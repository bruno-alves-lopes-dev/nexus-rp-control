import { Badge, Card, DataTable, SectionTitle, StatCard } from '../components/ui';
import { date, number } from '../lib/format';

export function Acoes({ dashboard, search }) {
  const acoes = (dashboard?.data?.acoes || []).slice().reverse();
  const query = search.trim().toLowerCase();
  const filtered = acoes.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
  const wins = acoes.filter((item) => String(item.resultado || '').toLowerCase().includes('vit')).length;
  const losses = acoes.filter((item) => String(item.resultado || '').toLowerCase().includes('der')).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Ações" value={number(acoes.length)} />
        <StatCard title="Vitórias" value={number(wins)} />
        <StatCard title="Derrotas" value={number(losses)} />
        <StatCard title="Win rate" value={`${acoes.length ? Math.round((wins / acoes.length) * 100) : 0}%`} />
      </div>
      <Card>
        <SectionTitle title="Combate" subtitle="Histórico de ações registradas" />
        <DataTable columns={['Ação', 'Resultado', 'Confirmados', 'Reservas', 'MVP', 'Data']} rows={filtered.map((acao) => [
          <strong>{acao.nome || '—'}</strong>,
          <Badge tone={String(acao.resultado || '').toLowerCase().includes('vit') ? 'success' : String(acao.resultado || '').toLowerCase().includes('der') ? 'danger' : 'warn'}>{acao.resultado || 'Em andamento'}</Badge>,
          number(acao.confirmados),
          number(acao.reservas),
          acao.mvp || acao.mvpName || acao.destaque || '—',
          date(acao.ts, true),
        ])} />
      </Card>
    </div>
  );
}
