import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Badge, Card, DataTable, SectionTitle, StatCard } from '../components/ui';
import { currency, number } from '../lib/format';

function calcMember(member, settings) {
  const metaSujo = Number(settings?.metas?.dinheiroSujo || 0);
  const metaComp = Number(settings?.metas?.componentes || 0);
  const pctMoney = metaSujo ? Number(member.sujo || 0) / metaSujo : 0;
  const pctComp = metaComp ? Number(member.comp || 0) / metaComp : 0;
  return { pctMoney, pctComp, hitAny: pctMoney >= 1 || pctComp >= 1 };
}

export function Farm({ dashboard, onReset, isAdmin, search }) {
  const [localSearch, setLocalSearch] = useState('');
  const farm = dashboard?.analytics?.farm || {};
  const settings = dashboard?.settings?.farm || {};
  const members = useMemo(() => {
    const query = `${search} ${localSearch}`.trim().toLowerCase();
    return Object.entries(dashboard?.data?.farm || {})
      .map(([id, value]) => ({ id, ...value }))
      .filter((item) => !query || `${item.nome || ''} ${item.id}`.toLowerCase().includes(query));
  }, [dashboard, search, localSearch]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total sujo" value={currency(farm.totalSujo)} hint="Semana atual" />
        <StatCard title="Componentes" value={number(farm.totalComp)} hint="Semana atual" />
        <StatCard title="Limpo projetado" value={currency(farm.totalCleanProjected)} hint="Excedente calculado" />
        <StatCard title="Metas" value={`${number(farm.membersWithGoal)}/${number(farm.activeMembers)}`} hint="Membros ativos" />
      </div>

      <Card>
        <SectionTitle
          title="Configuração do farm"
          subtitle="Regras ativas para a semana"
          action={isAdmin && <button className="btn btn-danger" onClick={onReset}><RotateCcw size={18} /> Resetar semana</button>}
        />
        <div className="flex flex-wrap gap-2">
          <Badge tone="warn">Meta sujo: {currency(settings?.metas?.dinheiroSujo)}</Badge>
          <Badge tone="warn">Meta comp: {number(settings?.metas?.componentes)}</Badge>
          <Badge tone="success">Conversão: {Math.round(Number(settings?.convLimpo || 0) * 100)}%</Badge>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Ranking atual" subtitle="Farm individual dos membros" />
        <input className="input mb-4 max-w-md" value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Filtrar membro..." />
        <DataTable
          columns={['Membro', 'Sujo', 'Componentes', 'Progresso', 'Limpo proj.', 'Status']}
          rows={members.map((member) => {
            const calc = calcMember(member, settings);
            return [
              <strong>{member.nome || member.id}</strong>,
              <span className="font-mono">{currency(member.sujo)}</span>,
              <span className="font-mono">{number(member.comp)}</span>,
              <span className="font-mono">{Math.round(calc.pctMoney * 100)}% / {Math.round(calc.pctComp * 100)}%</span>,
              <span className="font-mono">{currency(member.cleanProjected || 0)}</span>,
              <Badge tone={calc.hitAny ? 'success' : Number(member.sujo || member.comp) ? 'warn' : 'danger'}>{calc.hitAny ? 'Meta batida' : Number(member.sujo || member.comp) ? 'Em andamento' : 'Sem entrega'}</Badge>,
            ];
          })}
        />
      </Card>
    </div>
  );
}
