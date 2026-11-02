/** Les 4 jauges de la maquette : Calcul IA, Énergie, Terres rares, Confiance (E2-1). */
import type { ReactNode } from 'react';
import { trustDelta } from '../engine';
import { useGame } from '../store/gameStore';
import type { GaugeKey } from './dataSources';
import { InfoTip } from './InfoTip';
import { fmt, pct, STATUS_ICONS, STATUS_LABELS, type Status } from './format';

interface CardProps {
  gauge: GaugeKey;
  index: string;
  title: string;
  value: string;
  unit: string;
  ratio: number;
  ratioLabel: string;
  status: Status;
  explain: string;
  children?: ReactNode;
}

function GaugeCard({ gauge, index, title, value, unit, ratio, ratioLabel, status, explain, children }: CardProps) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <section className={`gauge-card ${status}`} aria-label={title}>
      <div className="gauge-head">
        <span className="gauge-title">
          <span className="gauge-index">{index}</span> {title}
        </span>
        <InfoTip gauge={gauge} label={title} explain={explain} />
      </div>
      <div className="gauge-value">
        <strong>{value}</strong> <span className="unit">{unit}</span>
        <span className={`status-chip ${status}`}>
          <span aria-hidden="true">{STATUS_ICONS[status]}</span> {STATUS_LABELS[status]}
        </span>
      </div>
      <div
        className="bar"
        role="meter"
        aria-label={ratioLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped * 100)}
      >
        <span style={{ width: `${clamped * 100}%` }} />
      </div>
      <div className="gauge-sub">{children}</div>
    </section>
  );
}

export function Gauges() {
  const { game, ctx } = useGame();
  const m = game.metrics;
  const { config } = ctx;

  const netMw = m.productionMw * (1 - m.lossRate);
  const needMw = m.cityNeedMw + m.datacenterNeedMw;
  const energyRatio = needMw > 0 ? netMw / needMw : 1;
  const cityRatio = m.cityNeedMw > 0 ? m.cityGotMw / m.cityNeedMw : 1;
  const dcRatio = m.datacenterNeedMw > 0 ? m.datacenterGotMw / m.datacenterNeedMw : 1;
  const dcCost = config.datacenter.costRareEarthT;
  const trend = trustDelta(ctx, m);

  const computeStatus: Status = m.availability < 0.5 ? 'crit' : m.availability < 0.95 ? 'warn' : 'ok';
  const energyStatus: Status = cityRatio < config.end.blackoutCityRatio ? 'crit' : energyRatio < 1 ? 'warn' : 'ok';
  const rareStatus: Status = game.rareEarthT < dcCost ? 'crit' : game.rareEarthT < dcCost * 4 ? 'warn' : 'ok';
  const trustStatus: Status = game.trust < 20 ? 'crit' : game.trust < 40 ? 'warn' : 'ok';

  return (
    <div className="gauges">
      <GaugeCard
        gauge="compute"
        index="01"
        title="Calcul IA"
        value={fmt(m.servedPflops)}
        unit={`/ ${fmt(m.demandPflops)} PFLOP/s`}
        ratio={m.availability}
        ratioLabel="IA disponible"
        status={computeStatus}
        explain="Le calcul fourni par tes datacenters, comparé à la demande des habitants. Si la demande dépasse ta capacité, l'IA n'est plus disponible pour tout le monde."
      >
        <span>IA disponible : <strong>{pct(m.availability)}</strong></span>
        <span>Capacité : {fmt(m.capacityPflops)} PFLOP/s</span>
      </GaugeCard>

      <GaugeCard
        gauge="energy"
        index="02"
        title="Énergie"
        value={fmt(netMw, 0)}
        unit={`/ ${fmt(needMw, 0)} MW`}
        ratio={Math.min(1, energyRatio)}
        ratioLabel="Énergie disponible par rapport aux besoins"
        status={energyStatus}
        explain="L'énergie produite par les réacteurs, après les pertes du réseau, comparée aux besoins de la ville et des datacenters."
      >
        <span>Ville : <strong>{pct(cityRatio)}</strong></span>
        <span>Datacenters : <strong>{pct(dcRatio)}</strong></span>
        <span>Pertes réseau : {pct(m.lossRate, 1)}</span>
      </GaugeCard>

      <GaugeCard
        gauge="rareEarth"
        index="03"
        title="Terres rares"
        value={fmt(game.rareEarthT, 0)}
        unit="t"
        ratio={game.rareEarthT / config.rareEarth.initialStockT}
        ratioLabel="Stock de terres rares restant"
        status={rareStatus}
        explain="Le stock de métaux de ta planète. Chaque construction en consomme, et la ville en prélève un peu chaque année. Il ne se renouvelle pas."
      >
        <span>Ville : −{fmt(config.city.rareEarthTPerYear)} t/an</span>
        <span>≈ {fmt(Math.floor(game.rareEarthT / dcCost), 0)} datacenters possibles</span>
      </GaugeCard>

      <GaugeCard
        gauge="trust"
        index="04"
        title="Confiance"
        value={fmt(game.trust, 0)}
        unit="%"
        ratio={game.trust / 100}
        ratioLabel="Confiance des habitants"
        status={trustStatus}
        explain="Ce que les habitants pensent de ta gestion. Elle baisse quand la ville manque d'électricité ou quand l'IA n'est pas disponible. À 0 %, la partie est perdue."
      >
        <span>
          Tendance :{' '}
          <strong className={trend < 0 ? 'neg' : 'pos'}>
            {trend >= 0 ? '▲ +' : '▼ '}
            {fmt(trend, 1)} / mois
          </strong>
        </span>
      </GaugeCard>
    </div>
  );
}
