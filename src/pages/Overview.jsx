import { Activity, RadioTower, Shield, Users, WalletCards } from 'lucide-react';
import { Badge, Card, DataTable, SectionTitle, StatCard } from '../components/ui';
import { currency, date, number } from '../lib/format';

export function Overview({ dashboard }) {
  const farm = dashboard?.analytics?.farm || {};
  const caixa = dashboard?.data?.caixa || {};
  const registros = dashboard?.data?.registros || {};
  const pending = dashboard?.commands?.pending || [];
  const ranking = farm.ranking || [];
  const recentCommands = (dashboard?.commands?.recent || []).slice(0, 6);

  const totalCaixa = Number(caixa.sujo || 0) + Number(caixa.limpo || 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Membros" value={number(Object.keys(registros).length)} hint="Registros aprovados" icon={Users} />
        <StatCard title="Farm total" value={currency(farm.totalSujo)} hint={`${number(farm.activeMembers)} membros ativos`} icon={WalletCards} />
        <StatCard title="Caixa" value={currency(totalCaixa)} hint="Sujo + limpo" icon={Shield} />
        <StatCard title="Fila" value={number(pending.length)} hint="Comandos pendentes" icon={Activity} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <SectionTitle title="Ranking de farm" subtitle="Top membros da semana atual" />
          <DataTable
            columns={['#', 'Membro', 'Sujo', 'Componentes', 'Status']}
            rows={ranking.slice(0, 8).map((member, index) => [
              <span className="font-mono text-slate-500">{index + 1}</span>,
              <strong>{member.nome}</strong>,
              <span className="font-mono">{currency(member.sujo)}</span>,
              <span className="font-mono">{number(member.comp)}</span>,
              <Badge tone={member.hitAny ? 'success' : 'warn'}>{member.hitAny ? 'Meta batida' : 'Pendente'}</Badge>,
            ])}
          />
        </Card>

        <Card>
          <SectionTitle title="Saúde operacional" subtitle="Leitura rápida do bot" />
          <div className="space-y-3">
            <div className="rounded-3xl border border-white/10 bg-white/[.03] p-4">
              <p className="text-sm text-slate-400">Último sync</p>
              <strong className="mt-1 block text-lg">{date(dashboard?.bot?.lastSync, true)}</strong>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[.03] p-4">
              <p className="text-sm text-slate-400">Status</p>
              <div className="mt-2"><Badge tone={dashboard?.bot?.status === 'online' ? 'success' : 'danger'}>{dashboard?.bot?.status || 'offline'}</Badge></div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[.03] p-4">
              <p className="text-sm text-slate-400">Comandos recentes</p>
              <strong className="mt-1 flex items-center gap-2"><RadioTower size={18} /> {number(recentCommands.length)}</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
