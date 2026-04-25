import { Badge, Card, DataTable, SectionTitle, StatCard } from '../components/ui';
import { date, number } from '../lib/format';

export function Registros({ dashboard, search }) {
  const registros = Object.entries(dashboard?.data?.registros || {}).map(([id, value]) => ({ id, ...value }));
  const recrutamentos = (dashboard?.data?.recrutamentos || []).slice().reverse();
  const query = search.trim().toLowerCase();
  const members = registros.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
  const recruits = recrutamentos.filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Membros" value={number(registros.length)} />
        <StatCard title="Recrutamentos" value={number(recrutamentos.length)} />
        <StatCard title="Pendentes" value={number(recrutamentos.filter((item) => item.aprovado == null).length)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Membros aprovados" subtitle="Base atual do servidor" />
          <DataTable columns={['Nome', 'ID', 'Telefone', 'Recrutador']} rows={members.map((item) => [<strong>{item.nome || '—'}</strong>, <span className="font-mono">{item.id}</span>, item.tel || '—', item.rec || '—'])} />
        </Card>
        <Card>
          <SectionTitle title="Recrutamentos" subtitle="Avaliações registradas" />
          <DataTable columns={['Recrutador', 'Candidato', 'Passaporte', 'Status', 'Data']} rows={recruits.map((item) => [
            item.recrutador || '—',
            <strong>{item.nome || '—'}</strong>,
            <span className="font-mono">{item.passaporte || item.id || '—'}</span>,
            <Badge tone={item.aprovado === false ? 'danger' : item.aprovado === true ? 'success' : 'warn'}>{item.aprovado === false ? 'Reprovado' : item.aprovado === true ? 'Aprovado' : 'Pendente'}</Badge>,
            date(item.ts, true),
          ])} />
        </Card>
      </div>
    </div>
  );
}
