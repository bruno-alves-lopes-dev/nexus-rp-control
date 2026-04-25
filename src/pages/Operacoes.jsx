import { Badge, Card, DataTable, SectionTitle, StatCard } from '../components/ui';
import { currency, date, number } from '../lib/format';

export function Operacoes({ dashboard, search }) {
  const caixa = dashboard?.data?.caixa || {};
  const bau = dashboard?.data?.bau || { itens: {} };
  const compras = (dashboard?.data?.compras || []).slice().reverse();
  const encomendas = (dashboard?.data?.encomendas || []).slice().reverse();
  const query = search.trim().toLowerCase();

  const comprasFiltradas = compras.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
  const encomendasFiltradas = encomendas.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Caixa sujo" value={currency(caixa.sujo)} />
        <StatCard title="Caixa limpo" value={currency(caixa.limpo)} />
        <StatCard title="Itens no baú" value={number(Object.keys(bau.itens || {}).length)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Baú" subtitle="Quantidade por item" />
          <DataTable columns={['Item', 'Quantidade']} rows={Object.entries(bau.itens || {}).map(([item, qtd]) => [<strong>{item}</strong>, <span className="font-mono">{number(qtd)}</span>])} />
        </Card>
        <Card>
          <SectionTitle title="Compras" subtitle="Últimas movimentações" />
          <DataTable columns={['Item', 'Qtd', 'Valor', 'Operador', 'Data']} rows={comprasFiltradas.slice(0, 20).map((item) => [item.item || '—', number(item.qtd), currency(item.valor), item.operador || '—', date(item.ts, true)])} />
        </Card>
      </div>

      <Card>
        <SectionTitle title="Encomendas" subtitle="Histórico de vendas e entregas" />
        <DataTable columns={['Família', 'Total', 'Itens', 'Data', 'Status']} rows={encomendasFiltradas.slice(0, 25).map((item) => [
          item.familia || '—',
          <span className="font-mono">{currency(item.total)}</span>,
          Object.entries(item.itens || {}).map(([key, qtd]) => `${key}: ${qtd}`).join(' · ') || '—',
          date(item.ts, true),
          <Badge tone="success">Registrado</Badge>,
        ])} />
      </Card>
    </div>
  );
}
