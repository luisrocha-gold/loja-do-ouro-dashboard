import Link from "next/link";
import {
  selection,
  periodLabel,
  previous,
  dates,
  localDate,
  BUSINESS_TIMELINE,
  overlapsPeriod,
  type Period,
} from "@/lib/bi/periods";
import { loadPeriods } from "@/lib/bi/store";
import { liveCommerce } from "@/lib/bi/live-model";
import {
  overview,
  detail,
  financialEvents,
  calculatedChecks,
  canonicalOrders,
  number,
  sum,
  delta,
  latestQuality,
  trackingCheck,
  unpaidAmount,
  type Store,
  type Metric,
  type Detail,
  type Row,
} from "@/lib/bi/model";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const currency = (v: number | null) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }).format(v);
const integer = (v: number | null) =>
  v === null
    ? "—"
    : new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(v);
const percent = (v: number | null) =>
  v === null
    ? "—"
    : `${new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(v)}%`;
const timestamp = (s: string | null) =>
  s
    ? new Intl.DateTimeFormat("pt-PT", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Lisbon",
      }).format(new Date(s))
    : "Sem recolha";
const text = (v: unknown) => (typeof v === "string" ? v : "—");
function Icon({ name = "grid" }: { name?: string }) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    sales: "M3 20h18 M6 16v-5 M12 16V5 M18 16V8",
    bag: "M5 7h14l1 14H4L5 7 M9 8V6a3 3 0 0 1 6 0v2",
    ads: "M3 10v4h4l10 5V5L7 10H3 M7 14l2 6h3",
    people:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M17 11h6",
    check: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3 M8 12l3 3 5-6",
    arrow: "M5 12h14 M14 7l5 5-5 5",
    calendar: "M5 5h14v16H5z M8 2v6 M16 2v6 M5 10h14",
    exit: "M10 3H4v18h6 M10 12h11 M17 8l4 4-4 4",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {<path d={paths[name] || paths.grid} />}
    </svg>
  );
}
function Change({ a, b }: { a: number | null; b: number | null }) {
  const d = delta(a, b);
  return (
    <span className={`change ${d === null ? "muted" : d >= 0 ? "up" : "down"}`}>
      {d === null
        ? "Sem comparação"
        : `${d >= 0 ? "↗" : "↘"} ${percent(Math.abs(d))}`}
    </span>
  );
}
function Kpi({
  label,
  m,
  prev,
  format = currency,
  note,
}: {
  label: string;
  m: Metric;
  prev?: Metric;
  format?: (n: number | null) => string;
  note?: string;
}) {
  return (
    <article className="kpi">
      <div className="eyebrow">{label}</div>
      <div className="kpi-value">{format(m.value)}</div>
      {prev && <Change a={m.value} b={prev.value} />}
      <p>{note || m.note}</p>
      <details className="metric-source">
        <summary>
          {m.source
            .replace("shopify_sales", "Shopify")
            .replace("shopify_sessions", "Shopify")}{" "}
          · {m.value === null ? "Indisponível" : "Provisório"}
        </summary>
        <span>
          {m.coverage} · {timestamp(m.fetchedAt)}
          <br />
          {m.field}
          <br />
          {m.note}
        </span>
      </details>
    </article>
  );
}
function Empty({ children }: { children?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <Icon name="check" />
      <p>{children || "Sem dados para todo o período selecionado."}</p>
    </div>
  );
}
function Panel({
  title,
  eyebrow,
  children,
  note,
  id,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  note?: string;
  id?: string;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`} id={id}>
      <div className="panel-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
      </div>
      {children}
      {note && <p className="panel-note">{note}</p>}
    </section>
  );
}
function Table({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  empty?: string;
}) {
  return rows.length ? (
    <div
      className="table-scroll"
      tabIndex={0}
      aria-label="Tabela com deslocamento horizontal"
    >
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>{empty}</Empty>
  );
}
function DetailNote({ d, totalAt }: { d: Detail; totalAt?: string | null }) {
  return (
    <p className="data-note">
      {d.note} · {timestamp(d.fetchedAt)}
      {totalAt &&
      d.fetchedAt &&
      Date.parse(totalAt) > Date.parse(d.fetchedAt) + 60000
        ? " · Detalhe anterior à versão do total; reconciliação pendente."
        : ""}
    </p>
  );
}
function BusinessTimelineContext({
  range,
  previousRange,
}: {
  range: Period;
  previousRange: Period;
}) {
  const summerSale = BUSINESS_TIMELINE[0];
  const postSale = BUSINESS_TIMELINE[1];
  const selectedTouchesSale = overlapsPeriod(
    range,
    summerSale.from,
    summerSale.to,
  );
  const previousTouchesSale = overlapsPeriod(
    previousRange,
    summerSale.from,
    summerSale.to,
  );
  const crossesBoundary = selectedTouchesSale && range.to >= postSale.from;
  const postSalePeriod = range.from >= postSale.from;

  if (!selectedTouchesSale && !postSalePeriod && !previousTouchesSale) return null;

  return (
    <div className="notice timeline-notice">
      <Icon name="calendar" />
      <span>
        {crossesBoundary ? (
          <>
            <strong>Saldos Verão · 10 jul–15 set.</strong> Este intervalo atravessa
            o fim dos saldos em 15/09 e o início do período pós-saldos em 16/09.
            A comparação deve separar os dois regimes comerciais.
          </>
        ) : selectedTouchesSale ? (
          <>
            <strong>Saldos Verão · 10 jul–15 set.</strong> Promoção apenas em prata
            e aço. Este período não deve ser usado como baseline normal para o
            pós-saldos.
          </>
        ) : (
          <>
            <strong>Pós-saldos · desde 16 set.</strong> Catálogo sem aço e sem
            produtos inferiores a 50 €.{" "}
            {previousTouchesSale
              ? "O período anterior inclui dias de saldos; a variação não representa uma comparação normalizada."
              : "Comparar preferencialmente com outros períodos pós-saldos."}
          </>
        )}
      </span>
    </div>
  );
}
function Trend({ store, range }: { store: Store; range: Period }) {
  const cohort = liveCommerce(store, range);
  const points = dates(range).map((date) => {
    const s = overview(store, { from: date, to: date });
    const observed = cohort.paid.filter(r => r.date === date);
    return { date, sales: store.mode === "live" ? (cohort.safe && observed.length ? sum(observed,"current_total") : null) : s.sales.value, spend: s.spend };
  });
  const values = points
    .flatMap((p) => [p.sales, p.spend])
    .filter((n): n is number => n !== null);
  if (!values.length) return <Empty />;
  const max = Math.max(1, ...values),
    min = Math.min(0, ...values),
    span = max - min;
  const height = (v: number) => ((max - v) / span) * 155 + 12;
  const step = 800 / points.length,
    bar = Math.min(24, step * 0.32),
    zero = height(0);
  const summerSale = BUSINESS_TIMELINE[0],
    postSale = BUSINESS_TIMELINE[1],
    saleIndexes = points
      .map((p, i) =>
        p.date >= summerSale.from && p.date <= summerSale.to ? i : -1,
      )
      .filter((i) => i >= 0),
    saleStart = saleIndexes.length ? saleIndexes[0] : null,
    saleEnd = saleIndexes.length ? saleIndexes[saleIndexes.length - 1] : null,
    saleBandWidth =
      saleStart !== null && saleEnd !== null
        ? (saleEnd - saleStart + 1) * step
        : 0,
    postSaleIndex = points.findIndex((p) => p.date === postSale.from);
  return (
    <>
      <div className="legend">
        <span>
          <i className="gold-dot" />
          {store.mode === "live" ? "Valor das encomendas pagas recolhidas" : "Vendas totais"}
        </span>
        <span>
          <i className="dark-dot" />
          Investimento em anúncios
        </span>
        {saleStart !== null && (
          <span>
            <i className="sale-dot" />
            Saldos Verão
          </span>
        )}
        <small>Mesma escala em euros</small>
      </div>
      <div className="chart-scroll">
        <svg
          role="img"
          aria-label="Valores Shopify e investimento Meta mais Google, numa única escala em euros"
          viewBox="0 0 900 210"
          className="trend-chart"
        >
          {saleStart !== null && saleEnd !== null && (
            <g>
              <rect
                x={90 + saleStart * step}
                y="6"
                width={saleBandWidth}
                height="180"
                rx="4"
                fill="#f7f0e4"
              />
              {saleBandWidth > 110 && (
                <text
                  x={90 + saleStart * step + 8}
                  y="20"
                  className="timeline-label"
                >
                  SALDOS VERÃO
                </text>
              )}
            </g>
          )}
          {postSaleIndex >= 0 && (
            <g>
              <line
                x1={90 + postSaleIndex * step + step / 2}
                x2={90 + postSaleIndex * step + step / 2}
                y1="6"
                y2="186"
                className="timeline-boundary"
              />
              <text
                x={90 + postSaleIndex * step + step / 2 + 5}
                y="32"
                className="timeline-label"
              >
                16/09 · PÓS-SALDOS
              </text>
            </g>
          )}
          {[max, (max + min) / 2, min].map((v, i) => (
            <g key={i}>
              <line
                x1="85"
                x2="890"
                y1={height(v)}
                y2={height(v)}
                stroke="#e8e5df"
                strokeDasharray="3 4"
              />
              <text x="75" y={height(v) + 4} textAnchor="end">
                {integer(v)} €
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const x = 90 + i * step + step / 2;
            return (
              <g key={p.date}>
                {[
                  { v: p.sales, dx: -bar, color: "#b68d4a" },
                  { v: p.spend, dx: 2, color: "#263f3b" },
                ].map((a, j) =>
                  a.v === null ? (
                    <text key={j} x={x + a.dx} y={zero - 5}>
                      ·
                    </text>
                  ) : (
                    <rect
                      key={j}
                      x={x + a.dx}
                      y={Math.min(height(a.v), zero)}
                      width={Math.max(2, bar - 2)}
                      height={Math.abs(zero - height(a.v))}
                      rx="2"
                      fill={a.color}
                    >
                      <title>
                        {p.date} ·{" "}
                        {j === 0
                          ? (store.mode === "live" ? "Shopify · encomendas pagas recolhidas" : "Shopify total_sales")
                          : "Meta + Google spend"}
                        : {currency(a.v)}
                      </title>
                    </rect>
                  ),
                )}
                {(points.length < 10 ||
                  i % Math.ceil(points.length / 8) === 0) && (
                  <text x={x} y="196" textAnchor="middle">
                    {p.date.slice(8)}/{p.date.slice(5, 7)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <details className="chart-data">
        <summary>Ver os valores do gráfico</summary>
        <Table
          headers={["Data", store.mode === "live" ? "Encomendas pagas · valor" : "Vendas Shopify", "Meta + Google"]}
          rows={points.map((p) => [
            p.date,
            currency(p.sales),
            currency(p.spend),
          ])}
        />
      </details>
    </>
  );
}
const paid = (r: Row) =>
  !r.cancelled_at &&
  ["PAID", "PARTIALLY_REFUNDED"].includes(String(r.financial_status));
const pending = (r: Row) =>
  !r.cancelled_at &&
  ["PENDING", "AUTHORIZED", "PARTIALLY_PAID"].includes(
    String(r.financial_status),
  );
const statusLabel = (s: unknown) =>
  ({
    PAID: "Paga",
    PARTIALLY_REFUNDED: "Reembolso parcial",
    PENDING: "Pendente",
    AUTHORIZED: "Autorizada",
    PARTIALLY_PAID: "Pagamento parcial",
    VOIDED: "Anulada",
    REFUNDED: "Reembolsada",
    UNFULFILLED: "Por preparar",
    FULFILLED: "Preparada",
    PARTIALLY_FULFILLED: "Preparação parcial",
    UNSHIPPED: "Por expedir",
  })[String(s)] || text(s);
function GaActivity({store,range}:{store:Store;range:Period}) {
  const s=overview(store,range);
  const totals=store.datasets.find(d=>d.source==="ga4" && d.dataset==="period_totals" && d.period_start===range.from && d.period_end===range.to)?.rows[0];
  return <div className="pulse-list">{[
    ["Sessões",s.gaSessions.value],
    ["Eventos de adição ao carrinho",number(totals?.add_to_carts)],
    ["Eventos de início de checkout",number(totals?.checkouts)],
    ["Eventos de compra",s.gaPurchases.value],
  ].map(([label,value])=><div key={String(label)}><span>{label}</span><strong>{integer(value as number|null)}</strong></div>)}</div>;
}
function LiveSales({store,range}:{store:Store;range:Period}) {
  const c=liveCommerce(store,range);
  return <>
    <div className="three-col">{[
      ["Encomendas pagas recolhidas",integer(c.paidCount),currency(c.paidValue)],
      ["Pendentes de pagamento",integer(c.pendingCount),"Estado observado das encomendas recolhidas"],
      ["Pagas por preparar",integer(c.readyCount),"Não representa todo o backlog"],
    ].map(([label,value,note])=><article className="kpi" key={label}><div className="eyebrow">{label}</div><div className="kpi-value">{value}</div><p>{note}</p></article>)}</div>
    <Panel title="Encomendas do período" eyebrow="Shopify · consulta operacional" note={c.note}>
      <p className="data-note">Consulta: {timestamp(c.fetchedAt)} · {c.rows.length} encomendas distintas recolhidas. Até 100 apresentadas.</p>
      <Table headers={["Encomenda","Criada em","Pagamento","Preparação","Valor observado","Pagamento líquido observado"]}
        rows={c.rows.slice(0,100).map(r=>[text(r.name),text(r.created_date),statusLabel(r.financial_status),statusLabel(r.fulfillment_status),r.currency==="EUR"?currency(number(r.current_total)):"Moeda por confirmar",r.currency==="EUR"?currency(number(r.net_payment)):"—"])} />
    </Panel>
    <div className="two-col"><Panel title="Atividade da loja" eyebrow="GA4"><GaActivity store={store} range={range}/><p className="panel-note">Eventos de compra podem repetir a mesma encomenda. Requerem reconciliação antes de calcular conversão.</p></Panel>
      <Panel title="Indicadores a completar" eyebrow="Relatório oficial Shopify"><div className="quiet-callout">Vendas totais, composição, ticket médio oficial, produtos e sessões Shopify exigem a ligação aos fechos guardados. Os estados acima não substituem movimentos financeiros por data de pagamento.</div><p className="panel-note">Lucro e margem exigem custos confirmados de produtos, taxas e logística.</p></Panel></div>
  </>;
}
function Sales({ store, range }: { store: Store; range: Period }) {
  if (store.mode === "live") return <LiveSales store={store} range={range} />;
  const s = overview(store, range),
    o = canonicalOrders(detail(store, range, "shopify", "orders", true)),
    ab = detail(store, range, "shopify", "abandoned", true),
    products = detail(store, range, "shopify", "products");
  const paidRows = o.rows.filter(paid),
    pendingRows = o.rows.filter(pending),
    unfulfilled = paidRows.filter((r) =>
      ["UNFULFILLED", "PARTIALLY_FULFILLED", "UNSHIPPED"].includes(
        String(r.fulfillment_status),
      ),
    );
  const events = financialEvents(store, range);
  const names = [
    "Vendas brutas",
    "Descontos",
    "Reversões / devoluções",
    "Vendas líquidas",
    "Impostos",
    "Portes",
  ];
  const pendingTotal = sum(
    pendingRows.map((r) => ({ value: unpaidAmount(r) })),
    "value",
  );
  return (
    <>
      <div className="two-col">
        <Panel
          title="Como se compõem as vendas"
          eyebrow="Contabilidade comercial"
          note="Shopify Analytics. As reversões pertencem à data reconhecida em vendas; os pagamentos exigem eventos financeiros."
        >
          <div className="statement">
            {s.composition.map((m, i) => (
              <div key={m.field} className={i === 3 ? "subtotal" : ""}>
                <span>{names[i]}</span>
                <strong>{currency(m.value)}</strong>
              </div>
            ))}
            <div className="statement-total">
              <span>Vendas totais</span>
              <strong>{currency(s.sales.value)}</strong>
            </div>
          </div>
        </Panel>
        <Panel
          title="Pagamento e preparação"
          eyebrow="Encomendas criadas no período"
          note="Estado observado à hora da recolha. Esta coorte não é todo o backlog nem representa pagamentos ocorridos no período."
        >
          <DetailNote d={o} />
          <div className="ops-list">
            {[
              [
                "Pagas",
                o.complete ? integer(paidRows.length) : "—",
                currency(
                  o.complete
                    ? paidRows.length
                      ? sum(paidRows, "current_total")
                      : 0
                    : null,
                ),
              ],
              [
                "Pagamento pendente",
                o.complete ? integer(pendingRows.length) : "—",
                currency(
                  o.complete ? (pendingRows.length ? pendingTotal : 0) : null,
                ),
              ],
              [
                "Pagas por preparar",
                o.complete ? integer(unfulfilled.length) : "—",
                currency(
                  o.complete
                    ? unfulfilled.length
                      ? sum(unfulfilled, "current_total")
                      : 0
                    : null,
                ),
              ],
            ].map(([label, count, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{count}</strong>
                <small>{value}</small>
              </div>
            ))}
          </div>
          <div className="quiet-callout">
            Lucro e margem indisponíveis: falta uma base confirmada de custos
            dos produtos, taxas e logística.
          </div>
        </Panel>
      </div>
      <div className="two-col">
        <Panel title="Produtos com maior venda líquida" eyebrow="Catálogo">
          <DetailNote d={products} totalAt={s.sales.fetchedAt} />
          <Table
            headers={["Produto", "Encomendas¹", "Venda líquida"]}
            rows={[...products.rows]
              .sort(
                (a, b) =>
                  (number(b.net_sales) || 0) - (number(a.net_sales) || 0),
              )
              .slice(0, 50)
              .map((r) => [
                text(r.product_title),
                integer(number(r.orders)),
                currency(number(r.net_sales)),
              ])}
          />
          <p className="panel-note">
            Até 50 produtos. ¹ Uma encomenda pode incluir vários produtos; estas
            contagens não se somam como encomendas únicas.
          </p>
        </Panel>
        <Panel title="Conversão da loja online" eyebrow="Shopify · sessões">
          <Funnel s={s} />
          <div className="mini-stats">
            <div>
              <span>Checkouts abandonados</span>
              <strong>
                {ab.complete
                  ? integer(ab.rows.filter((r) => !r.completed_at).length)
                  : "—"}
              </strong>
            </div>
            <div>
              <span>Valor observado</span>
              <strong>
                {ab.complete
                  ? currency(
                      ab.rows.filter((r) => !r.completed_at).length
                        ? sum(
                            ab.rows.filter((r) => !r.completed_at),
                            "total",
                          )
                        : 0,
                    )
                  : "—"}
              </strong>
            </div>
          </div>
          <DetailNote d={ab} />
          <p className="panel-note">
            Não equivale a receita perdida. Recolha e recuperação podem ocorrer
            mais tarde.
          </p>
        </Panel>
      </div>
      <Panel
        title="Movimentos financeiros observados"
        eyebrow="Shopify · data de processamento"
      >
        <p className="data-note">
          {events.note} Recolha: {timestamp(events.fetchedAt)}.{" "}
          {events.excluded > 0
            ? `${events.excluded} registos sem data de processamento ou moeda confirmada foram excluídos.`
            : ""}
        </p>
        <Table
          headers={[
            "Processado em",
            "Encomenda",
            "Tipo",
            "Estado",
            "Método",
            "Montante",
          ]}
          rows={events.rows
            .slice(0, 100)
            .map((r) => [
              timestamp(text(r.processed_at)),
              text(r.order_name),
              text(r.kind),
              text(r.status),
              text(r.gateway),
              currency(number(r.amount)),
            ])}
        />
        <p className="panel-note">
          Até 100 eventos. Apenas SALE/CAPTURE com estado SUCCESS são
          recebimentos confirmados; PENDING e AUTHORIZATION não são pagamentos
          concluídos.
        </p>
      </Panel>
      <Panel title="Encomendas do período" eyebrow="Consulta operacional">
        <DetailNote d={o} />
        <Table
          headers={[
            "Encomenda",
            "Criada em",
            "Pagamento",
            "Preparação",
            "Total observado",
            "Recebido observado",
          ]}
          rows={o.rows
            .slice(0, 100)
            .map((r) => [
              text(r.name),
              text(r.created_date),
              statusLabel(r.financial_status),
              statusLabel(r.fulfillment_status),
              currency(number(r.current_total)),
              currency(number(r.received)),
            ])}
        />
        {o.rows.length > 100 && (
          <p className="panel-note">
            Primeiras 100 de {o.rows.length} encomendas. Os indicadores usam a
            coorte completa apenas quando a paginação foi confirmada.
          </p>
        )}
      </Panel>
    </>
  );
}
function Funnel({ s }: { s: ReturnType<typeof overview> }) {
  const stages = [
    ["Sessões", s.sessions.value],
    ["Adição ao carrinho", s.cart.value],
    ["Chegaram ao checkout", s.checkouts.value],
    ["Concluíram o checkout", s.completed.value],
  ] as const;
  return (
    <div className="funnel">
      {stages.map(([label, value], i) => (
        <div key={label}>
          <div className="funnel-label">
            <span>
              <b>0{i + 1}</b>
              {label}
            </span>
            <strong>{integer(value)}</strong>
          </div>
          <div className="funnel-track">
            <i
              style={{
                width:
                  value !== null && s.sessions.value
                    ? `${Math.min(100, Math.max(0, (value / s.sessions.value) * 100))}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      ))}
      <div className="funnel-result">
        <span>Taxa de conversão</span>
        <strong>
          {percent(s.conversion === null ? null : s.conversion * 100)}
        </strong>
      </div>
    </div>
  );
}
function Marketing({ store, range }: { store: Store; range: Period }) {
  const s = overview(store, range),
    meta = detail(store, range, "meta", "ads", true),
    google = detail(store, range, "google_ads", "campaigns", true),
    actions = detail(store, range, "google_ads", "conversion_actions", true),
    channels = detail(store, range, "ga4", "channels"),
    newsletters = detail(store,range,"klaviyo","campaigns"),
    flows = detail(store,range,"klaviyo","flows"),
    seo = detail(store,range,"searchconsole","period_totals"),
    merchant = detail(store,range,"google_merchant","status");
  const rows = (d: Detail, platform: string) =>
    d.rows.map((r) => [
      <span>
        {text(r.campaign)}
        {r.ad_name ? (
          <small className="table-subtitle">{text(r.ad_name)}</small>
        ) : null}
        {r.date ? (
          <small className="table-subtitle">{text(r.date)}</small>
        ) : null}
      </span>,
      platform,
      currency(number(r.spend)),
      integer(
        number(
          platform === "Meta"
            ? r.actions_offsite_conversion_fb_pixel_purchase
            : r.conversions,
        ),
      ),
      currency(
        number(
          platform === "Meta"
            ? r.action_values_offsite_conversion_fb_pixel_purchase
            : r.conversions_value,
        ),
      ),
    ]);
  return (
    <>
      <div className="three-col">
        <Kpi label="Investimento Meta" m={s.meta} />
        <Kpi label="Investimento Google" m={s.google} />
        <article className="kpi dark-kpi">
          <span className="eyebrow">Eficiência global · MER</span>
          <strong className="kpi-value">
            {s.mer === null ? "—" : `${integer(s.mer)}×`}
          </strong>
          <p>
            Vendas totais Shopify ÷ investimento Meta + Google. Não mede lucro
            nem ROAS atribuído.
          </p>
        </article>
      </div>
      <div className="notice">
        <Icon name="check" />
        <span>
          As conversões atribuídas às plataformas podem sobrepor-se. Não se
          somam Meta, Google e GA4 como compras únicas. Aumentos de investimento
          exigem primeiro um diagnóstico de tracking.
        </span>
      </div>
      <Panel title="Campanhas e anúncios" eyebrow="Atribuição das plataformas">
        <DetailNote d={meta} totalAt={s.meta.fetchedAt} />
        <DetailNote d={google} totalAt={s.google.fetchedAt} />
        <Table
          headers={[
            "Campanha / anúncio",
            "Fonte",
            "Investimento",
            "Conversões¹",
            "Valor atribuído",
          ]}
          rows={[...rows(meta, "Meta"), ...rows(google, "Google")].slice(
            0,
            100,
          )}
        />
        <p className="panel-note">
          Até 100 linhas de detalhe; o investimento principal vem exclusivamente
          dos totais. ¹ Meta: compras website, atribuição predefinida de 7 dias
          clique / 1 dia visualização. Google: ações configuradas para a métrica
          conversions, de várias categorias.
        </p>
      </Panel>
      <div className="two-col">
        <Panel title="Ações de conversão Google">
          <DetailNote d={actions} />
          <Table
            headers={["Ação", "Categoria", "Conversões", "Valor atribuído"]}
            rows={actions.rows
              .slice(0, 100)
              .map((r) => [
                text(r.conversion_action_name),
                text(r.conversion_action_category),
                integer(number(r.conversions)),
                currency(number(r.conversions_value)),
              ])}
          />
          <p className="panel-note">
            Duas ações PURCHASE podem referir a mesma compra. Custos nunca são
            somados por ação de conversão.
          </p>
        </Panel>
        <Panel title="Origem das sessões" eyebrow="GA4 · fonte / meio">
          <DetailNote d={channels} totalAt={s.gaSessions.fetchedAt} />
          <Table
            headers={["Origem", "Sessões", "Eventos de compra", "Receita GA4"]}
            rows={[...channels.rows]
              .sort(
                (a, b) => (number(b.sessions) || 0) - (number(a.sessions) || 0),
              )
              .slice(0, 30)
              .map((r) => [
                text(r.session_source_medium),
                integer(number(r.sessions)),
                integer(number(r.ecommerce_purchases)),
                currency(number(r.purchase_revenue)),
              ])}
          />
          <p className="panel-note">
            30 principais origens. Referências de pagamento podem indicar
            problemas de atribuição; a causa requer diagnóstico.
          </p>
        </Panel>
      </div>
      <div className="two-col">
        <Panel title="Newsletters e automações" eyebrow="CRM">
          {store.mode === "live" ? <>
            <h3>Campanhas · Klaviyo</h3>
            <Table headers={["Campanha","Destinatários","Conversões atribuídas"]} rows={newsletters.rows.filter(r=>r.campaign).slice(0,30).map(r=>[text(r.campaign),integer(number(r.campaign_report_recipients)),integer(number(r.campaign_report_conversions))])} />
            <h3>Automações · Klaviyo</h3>
            <Table headers={["Automação","Destinatários","Conversões atribuídas"]} rows={flows.rows.filter(r=>r.flow_name).slice(0,30).map(r=>[text(r.flow_name),integer(number(r.flow_recipients)),integer(number(r.flow_conversions))])}/>
            <p className="panel-note">Até 30 linhas por conjunto. Atribuição Klaviyo, sem reconciliação financeira Shopify. O período pode depender do envio e da janela de atribuição; não certifica compras únicas nem pagas nas datas selecionadas.</p>
          </> : <Empty>
            Sem relatório Klaviyo reconciliado com Shopify guardado para este
            período. Não se atribuem vendas a newsletters por simples
            correspondência de nomes ou URLs.
          </Empty>}
          <p className="panel-note">
            Campanhas e emails automáticos devem ser analisados separadamente,
            com as encomendas e o estado de pagamento observado.
          </p>
        </Panel>
        <Panel
          title="Pesquisa, Shopping e Stories"
          eyebrow="Crescimento orgânico"
        >
          {store.mode === "live" ? <>
            <h3>Pesquisa orgânica · período selecionado</h3>
            <Table headers={["Cliques","Impressões","Posição média"]} rows={seo.rows.length===1?[[integer(number(seo.rows[0].clicks)),integer(number(seo.rows[0].impressions)),integer(number(seo.rows[0].position))]]:[]} />
            <h3>Shopping · estado observado na consulta</h3>
            <Table headers={["País","Ativos","Reprovados","Pendentes"]} rows={merchant.rows.filter(r=>String(r.product_status_country)==="PT" && String(r.product_status_reporting_context)==="SHOPPING_ADS").map(r=>["Portugal",integer(number(r.product_status_active_count)),integer(number(r.product_status_disapproved_count)),integer(number(r.product_status_pending_count))])} />
            <p className="panel-note">Merchant Center: fotografia do estado na consulta, sem histórico certificado do período selecionado. Stories: sem cobertura confirmada.</p>
          </> : <Empty>
            Os fechos disponíveis não incluem cobertura confirmada de Search
            Console, Merchant Center e Stories neste período.
          </Empty>}
          <p className="panel-note">
            Sem cobertura, não se apresentam zeros nem recomendações para
            alterar a frequência de publicação.
          </p>
        </Panel>
      </div>
    </>
  );
}
function Audience({ store, range }: { store: Store; range: Period }) {
  const s = overview(store, range),
    geo = detail(store, range, "ga4", "geography"),
    demo = detail(store, range, "ga4", "demographics"),
    mg = detail(store, range, "meta", "geography"),
    md = detail(store, range, "meta", "demographics");
  return (
    <>
      <div className="three-col">
        <Kpi label="Utilizadores GA4" m={s.users} format={integer} />
        <Kpi label="Utilizadores ativos" m={s.activeUsers} format={integer} />
        <Kpi label="Sessões GA4" m={s.gaSessions} format={integer} />
      </div>
      <div className="two-col">
        <Panel title="Procura por região" eyebrow="GA4 · 30 principais cidades">
          <DetailNote d={geo} totalAt={s.gaSessions.fetchedAt} />
          <Table
            headers={[
              "País / cidade",
              "Utilizadores¹",
              "Sessões",
              "Eventos de compra",
            ]}
            rows={[...geo.rows]
              .sort(
                (a, b) => (number(b.sessions) || 0) - (number(a.sessions) || 0),
              )
              .slice(0, 30)
              .map((r) => [
                `${text(r.country)} · ${text(r.city)}`,
                integer(number(r.totalusers)),
                integer(number(r.sessions)),
                integer(number(r.ecommerce_purchases)),
              ])}
          />
        </Panel>
        <Panel title="Perfil de audiência" eyebrow="GA4 · escalões declarados">
          <DetailNote d={demo} totalAt={s.activeUsers.fetchedAt} />
          <Table
            headers={["Idade", "Género", "Utilizadores ativos¹"]}
            rows={demo.rows.map((r) => [
              text(r.age),
              text(r.gender),
              integer(number(r.active_users)),
            ])}
          />
          <p className="panel-note">
            ¹ Utilizadores distintos não se somam entre dias nem entre
            segmentos. “unknown” é informação indisponível; os limiares de
            privacidade podem afetar a cobertura.
          </p>
        </Panel>
      </div>
      <div className="two-col">
        <Panel title="Distribuição do investimento" eyebrow="Meta · países">
          <DetailNote d={mg} totalAt={s.meta.fetchedAt} />
          <Table
            headers={[
              "País",
              "Investimento",
              "Impressões",
              "Compras atribuídas",
            ]}
            rows={mg.rows.map((r) => [
              text(r.country),
              currency(number(r.spend)),
              integer(number(r.impressions)),
              integer(number(r.actions_offsite_conversion_fb_pixel_purchase)),
            ])}
          />
        </Panel>
        <Panel title="Públicos dos anúncios" eyebrow="Meta · idade e género">
          <DetailNote d={md} totalAt={s.meta.fetchedAt} />
          <Table
            headers={[
              "Público",
              "Investimento",
              "Impressões",
              "Compras atribuídas",
            ]}
            rows={md.rows.map((r) => [
              `${text(r.age)} · ${text(r.gender)}`,
              currency(number(r.spend)),
              integer(number(r.impressions)),
              integer(number(r.actions_offsite_conversion_fb_pixel_purchase)),
            ])}
          />
        </Panel>
      </div>
      <div className="quiet-callout">
        A localização dos utilizadores GA4 e a localização atribuída aos
        anúncios têm bases distintas. Não calculamos rentabilidade por região
        cruzando estas populações.
      </div>
    </>
  );
}
function QualityView({ store, range }: { store: Store; range: Period }) {
  const s = overview(store, range),
    checks = latestQuality(store, range),
    o = canonicalOrders(detail(store, range, store.mode === "live" ? "shopify_live" : "shopify", "orders", true)),
    ga = detail(store, range, "ga4", "transactions"),
    recon = trackingCheck(o, ga);
  const reports = store.reports
    .filter((r) => r.period_start === range.from && r.period_end === range.to)
    .sort((a, b) => b.version - a.version);
  return (
    <>
      <Panel
        title="Reconciliação de compras"
        eyebrow="GA4 × Shopify"
        note="Correspondências exatas entre nome da encomenda e último componente do GID. Referências ambíguas ficam por resolver. A divergência não demonstra a causa."
      >
        <div className="mini-stats four">
          {[
            ["Eventos GA4 no detalhe", integer(recon.events)],
            [
              "Encomendas correspondidas",
              ga.rows.length ? integer(recon.matched) : "—",
            ],
            [
              "Com referências alternativas",
              ga.rows.length ? integer(recon.alternate) : "—",
            ],
            [
              "IDs com vários eventos",
              ga.rows.length ? integer(recon.repeatedIds) : "—",
            ],
          ].map(([l, v]) => (
            <div key={l}>
              <span>{l}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        <DetailNote d={ga} totalAt={s.gaPurchases.fetchedAt} />
        <DetailNote d={o} />
        <p className="panel-note">
          {recon.complete
            ? "Cobertura recolhida para o período; tracking não certificado."
            : "Reconciliação incompleta."}{" "}
          {recon.unknown} referências não correspondidas/ambíguas;{" "}
          {recon.duplicateRows} linhas com ID repetido.
        </p>
      </Panel>
      <Panel
        title="Verificação dos valores apresentados"
        eyebrow="Controlos sobre esta consulta"
      >
        <Table
          headers={["Controlo", "Resultado", "Estado"]}
          rows={calculatedChecks(store, range).map((c) => [
            c.label,
            c.detail,
            c.warning ? "Requer atenção" : "Dentro da tolerância",
          ])}
        />
        <p className="panel-note">
          A concordância aritmética não certifica o tracking nem demonstra
          ausência de duplicação.
        </p>
      </Panel>
      <Panel
        title="Cobertura dos indicadores"
        eyebrow="Fonte e momento de recolha"
      >
        <Table
          headers={[
            "Indicador",
            "Fonte",
            "Cobertura",
            "Recolhido em",
            "Estado",
          ]}
          rows={[
            s.sales,
            s.aov,
            s.meta,
            s.google,
            s.sessions,
            s.users,
            s.fulfilled,
          ].map((m) => [
            m.field,
            m.source,
            m.coverage,
            timestamp(m.fetchedAt),
            m.value === null ? "Indisponível" : m.note,
          ])}
        />
      </Panel>
      <Panel
        title="Alertas e controlos guardados"
        eyebrow="Histórico de qualidade"
      >
        <p className="panel-note">
          É mostrado o controlo mais recente por data e código. Controlos
          anteriores à última revisão de dados exigem nova verificação.
        </p>
        {checks.length ? (
          checks.map((q, i) => (
            <details
              className={`quality-item ${q.severity}`}
              key={`${q.code}-${i}`}
            >
              <summary>
                <span className="severity">
                  {q.severity === "critical"
                    ? "Crítico"
                    : q.severity === "warning"
                      ? "Atenção"
                      : "Informação"}
                </span>
                <span>{q.message}</span>
                <small>{q.metric_date}</small>
              </summary>
              <div>
                <p>
                  {q.code} · {timestamp(q.created_at)}
                </p>
                <pre>{JSON.stringify(q.evidence, null, 2)}</pre>
              </div>
            </details>
          ))
        ) : (
          <Empty>
            Sem controlos guardados para este período. Isto não significa que os
            dados estejam validados.
          </Empty>
        )}
      </Panel>
      <Panel title="Relatórios e revisões" eyebrow="Histórico preservado">
        {reports.length ? (
          reports.map((r, i) => (
            <details className="report" key={r.id} open={i === 0}>
              <summary>
                <span>{r.title}</span>
                <small>
                  v{r.version} ·{" "}
                  {r.status === "partial" ? "Parcial" : "Provisório"} ·{" "}
                  {timestamp(r.created_at)}
                </small>
              </summary>
              <p>{r.summary}</p>
              {r.recommendations?.map((a, j) => (
                <div className="report-recommendation" key={j}>
                  <strong>{a.title}</strong>
                  <p>{a.detail}</p>
                  {a.evidence?.length > 0 && (
                    <small>{a.evidence.join(" · ")}</small>
                  )}
                </div>
              ))}
            </details>
          ))
        ) : (
          <Empty>Não existe relatório guardado para estas datas exatas.</Empty>
        )}
      </Panel>
    </>
  );
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams,
    sel = selection(q),
    section =
      typeof q.section === "string" &&
      ["overview", "sales", "marketing", "audience", "quality"].includes(
        q.section,
      )
        ? q.section
        : "overview";
  const store = await loadPeriods([
    ...sel.windows.flatMap((w) => [w.range, previous(w.range, w.key)]),
    sel.range,
    sel.previous,
  ], sel.range, section);
  const s = overview(store, sel.range),
    p = overview(store, sel.previous),
    quality = latestQuality(store, sel.range),
    critical = quality.filter((x) => x.severity === "critical");
  const live = store.mode === "live", cohort = liveCommerce(store,sel.range);
  const report = store.reports
    .filter(
      (r) => r.period_start === sel.range.from && r.period_end === sel.range.to,
    )
    .sort((a, b) => b.version - a.version)[0];
  const nav = [
    ["overview", "Visão geral", "grid"],
    ["sales", "Vendas e operação", "bag"],
    ["marketing", "Marketing e canais", "ads"],
    ["audience", "Públicos e regiões", "people"],
    ["quality", "Relatórios e qualidade", "check"],
  ];
  const href = (part: string, key = sel.key, range = sel.range) =>
    `/?${new URLSearchParams({ period: key, section: part, ...(key === "custom" ? { from: range.from, to: range.to } : {}) })}`;
  const updated = [
    s.sales.fetchedAt,
    s.meta.fetchedAt,
    s.google.fetchedAt,
    s.sessions.fetchedAt,
  ]
    .filter((x): x is string => !!x)
    .sort();
  const title = nav.find((n) => n[0] === section)![1];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Loja do Ouro · início">
          <img
            className="official-logo"
            src="https://res.cloudinary.com/vbnyvvyq/image/upload/e_trim:10,q_100,f_png/v1788866860/Logo_LojaOuro_Vector1_1.png"
            alt="Loja do Ouro"
            width="160"
            height="60"
          />
          <span className="brand-caption">ADMINISTRAÇÃO</span>
        </Link>
        <div className="nav-label">ESPAÇO DE GESTÃO</div>
        <nav aria-label="Navegação principal">
          {nav.map(([id, label, icon]) => (
            <Link
              key={id}
              href={href(id)}
              aria-label={label}
              className={section === id ? "active" : ""}
              aria-current={section === id ? "page" : undefined}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {id === "quality" && critical.length > 0 && (
                <b>{critical.length}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-label">
            <Icon name="check" />
            <span>
              Área privada<small>Dados reservados à administração</small>
            </span>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="logout">
              <Icon name="exit" />
              Terminar sessão
            </button>
          </form>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            Loja do Ouro <i>/</i> <strong>{title}</strong>
          </span>
          <div>
            <span className="status-dot" />
            Consulta de gestão <span className="avatar">LO</span>
          </div>
        </header>
        <main id="conteudo">
          <div className="page-heading">
            <div>
              <span className="eyebrow">ADMINISTRAÇÃO</span>
              <h1>{title === "Visão geral" ? "Visão geral" : title}</h1>
              <p>
                {section === "overview"
                  ? "Vendas, operação e marketing nos últimos períodos fechados."
                  : "Informação do período selecionado, com fontes e limitações visíveis."}
              </p>
            </div>
            <a className="outline-button" href="#calendario">
              <Icon name="calendar" />
              Consultar calendário
            </a>
          </div>
          <div className="period-cards" aria-label="Períodos em destaque">
            {sel.windows.map((w, i) => {
              const v = overview(store, w.range),
                before = overview(store, previous(w.range, w.key));
              const c = liveCommerce(store,w.range);
              return (
                <Link
                  href={href(section, w.key, w.range)}
                  className={`period-card ${sel.key === w.key ? "selected" : ""}`}
                  key={w.key}
                  aria-current={sel.key === w.key ? "date" : undefined}
                >
                  <div>
                    <span className="period-index">0{i + 1}</span>
                    <span className="period-title">{w.label}</span>
                    <Icon name="arrow" />
                  </div>
                  <span className="period-date">{periodLabel(w.range)}</span>
                  <strong>{currency(live ? c.paidValue : v.sales.value)}</strong>
                  <div className="period-footer">
                    <span>{live ? "Encomendas pagas · valor observado" : "Vendas Shopify"}</span>
                    {!live && <Change a={v.sales.value} b={before.sales.value} />}
                  </div>
                </Link>
              );
            })}
          </div>
          <details
            className="calendar-panel"
            key={`${sel.key}-${sel.range.from}-${sel.range.to}`}
            id="calendario"
            open={sel.key === "custom" || !!sel.error}
          >
            <summary>
              <Icon name="calendar" />
              Navegar no histórico<span>Escolher outras datas</span>
            </summary>
            <form method="get">
              <input type="hidden" name="period" value="custom" />
              <input type="hidden" name="section" value={section} />
              <label>
                Desde
                <input
                  type="date"
                  name="from"
                  required
                  defaultValue={sel.range.from}
                  max={sel.windows[0].range.to}
                />
              </label>
              <label>
                Até
                <input
                  type="date"
                  name="to"
                  required
                  defaultValue={sel.range.to}
                  max={sel.windows[0].range.to}
                />
              </label>
              <button type="submit">
                Consultar período <span>→</span>
              </button>
              <p>Datas de Portugal · apenas dias completos.</p>
            </form>
            {sel.error && (
              <p role="alert" className="form-error">
                {sel.error}
              </p>
            )}
          </details>
          <div className="period-context">
            <div>
              <span className="pill">
                {store.mode === "unavailable"
                  ? "Dados indisponíveis"
                  : report?.status === "partial"
                    ? "Fecho parcial"
                    : "Provisório"}
              </span>
              <strong>{periodLabel(sel.range)}</strong>
              <span>vs. {periodLabel(sel.previous)}</span>
            </div>
            <small>
              Recolha mais recente: {timestamp(updated.at(-1) || null)} ·
              Portugal
            </small>
          </div>
          <BusinessTimelineContext
            range={sel.range}
            previousRange={sel.previous}
          />
          {store.errors.map((e, i) => (
            <div role="status" className="notice error-notice" key={i}>
              <Icon name="check" />
              <span>{e}</span>
            </div>
          ))}
          {live && <div className="notice"><Icon name="check" /><span><strong>Consulta direta · provisória.</strong> {cohort.note} Ticket médio oficial, composição de vendas e MER aguardam a ligação aos fechos. O conector pode servir dados em cache.</span></div>}
          {section !== "quality" && critical.length > 0 && (
            <Link className="notice" href={href("quality")}>
              <Icon name="check" />
              <span>
                <strong>{critical.length} alertas críticos no período.</strong>{" "}
                Tracking de compras requer verificação antes de decisões de
                investimento.
              </span>
              <Icon name="arrow" />
            </Link>
          )}
          {section === "overview" ? (
            <>
              <div className="four-col">
                {live ? <article className="kpi"><div className="eyebrow">Encomendas pagas · valor</div><div className="kpi-value">{currency(cohort.paidValue)}</div><p>Valor observado das encomendas pagas recolhidas. Não é o total de vendas Shopify.</p><small>Shopify via Windsor · {timestamp(cohort.fetchedAt)}</small></article> : <Kpi label="Vendas totais" m={s.sales} prev={p.sales} />}
                {live ? <article className="kpi"><div className="eyebrow">Encomendas recolhidas</div><div className="kpi-value">{integer(cohort.count)}</div><p>{integer(cohort.paidCount)} pagas · {integer(cohort.pendingCount)} pendentes de pagamento</p><small>Coorte pela data de criação · cobertura não certificada</small></article> :
                <Kpi
                  label="Encomendas"
                  m={s.orders}
                  prev={p.orders}
                  format={integer}
                />}
                {live ? <Kpi label="Utilizadores GA4" m={s.users} prev={p.users} format={integer} /> :
                <Kpi
                  label="Ticket médio"
                  m={s.aov}
                  prev={p.aov}
                  note="Valor oficial Shopify para este período."
                />}
                <article className="kpi dark-kpi">
                  <span className="eyebrow">Investimento em anúncios</span>
                  <strong className="kpi-value">{currency(s.spend)}</strong>
                  <Change a={s.spend} b={p.spend} />
                  <p>
                    Meta {currency(s.meta.value)} · Google{" "}
                    {currency(s.google.value)}
                  </p>
                  <div className="mer-line">
                    <span>Eficiência global · MER</span>
                    <b>{s.mer === null ? "—" : `${integer(s.mer)}×`}</b>
                  </div>
                </article>
              </div>
              <div className="overview-grid">
                <Panel
                  title={live ? "Encomendas e investimento" : "Vendas e investimento"}
                  eyebrow="EVOLUÇÃO DO PERÍODO"
                  note={live ? "Valor observado das encomendas pagas, agrupado pela data de criação, e custos Meta + Google. Não representa recebimentos por dia. Dias sem encomendas recolhidas ficam sem valor." : "Vendas totais Shopify e custos Meta + Google. Valores em falta não são zero. Totais do período podem ter revisões posteriores às séries diárias."}
                >
                  <Trend store={store} range={sel.range} />
                </Panel>
                <Panel title="Da visita à compra" eyebrow="LOJA ONLINE">
                  {live ? <GaActivity store={store} range={sel.range} /> : <Funnel s={s} />}
                  <p className="panel-note">
                    {live ? "GA4 · sessões e eventos, com unidades distintas. Eventos de compra não equivalem a compras únicas; não se calcula uma taxa de conversão com tracking por reconciliar." : "Sessões Shopify. A taxa resulta de sessões com checkout concluído ÷ sessões."}
                  </p>
                </Panel>
              </div>
              <div className="overview-grid">
                <Panel
                  title="Prioridades para a gestão"
                  eyebrow="O QUE MERECE ATENÇÃO"
                >
                  <div className="priorities">
                    {critical.length > 0 && (
                      <Link href={href("quality")}>
                        <b className="priority-number">01</b>
                        <div>
                          <span className="severity">MEDIÇÃO</span>
                          <h3>Resolver as divergências de compras</h3>
                          <p>{critical[0].message}</p>
                        </div>
                        <Icon name="arrow" />
                      </Link>
                    )}
                    <Link href={href("sales")}>
                      <b className="priority-number">
                        {critical.length ? "02" : "01"}
                      </b>
                      <div>
                        <span className="severity">OPERAÇÃO</span>
                        <h3>Rever pagamentos e preparação</h3>
                        <p>
                          Consultar a coorte de encomendas, os valores pendentes
                          e os produtos com maior venda líquida.
                        </p>
                      </div>
                      <Icon name="arrow" />
                    </Link>
                    <Link href={href("quality")}>
                      <b className="priority-number">
                        {critical.length ? "03" : "02"}
                      </b>
                      <div>
                        <span className="severity">FIABILIDADE</span>
                        <h3>Ler o fecho e as suas limitações</h3>
                        <p>
                          {report
                            ? `Relatório v${report.version} · ${report.status === "partial" ? "parcial" : "provisório"}. Ver recomendações e histórico de revisões.`
                            : "Ainda não existe relatório guardado para estas datas exatas."}
                        </p>
                      </div>
                      <Icon name="arrow" />
                    </Link>
                  </div>
                </Panel>
                <Panel title="Pulso da operação" eyebrow="PREPARAÇÃO E TRÁFEGO">
                  <div className="pulse-list">
                    {[
                      [
                        live ? "Pagas por preparar · recolhidas" : "Encomendas preparadas",
                        live ? integer(cohort.readyCount) : integer(s.fulfilled.value),
                        live ? "Estado observado da coorte" : "Shopify · fulfillments",
                      ],
                      [
                        live ? "Pendentes de pagamento · recolhidas" : "Encomendas expedidas",
                        live ? integer(cohort.pendingCount) : integer(s.shipped.value),
                        live ? "Não inclui todo o backlog" : "Estado reportado pela integração",
                      ],
                      [
                        "Utilizadores GA4",
                        integer(s.users.value),
                        "Total distinto do período",
                      ],
                      [
                        "Eventos de compra GA4",
                        integer(s.gaPurchases.value),
                        "Não equivale a compras únicas",
                      ],
                    ].map(([l, v, n]) => (
                      <div key={l}>
                        <div>
                          <span>{l}</span>
                          <small>{n}</small>
                        </div>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="panel-note">
                    Expedições a zero na integração não provam ausência de
                    envios físicos. MER não mede lucro.
                  </p>
                </Panel>
              </div>
            </>
          ) : section === "sales" ? (
            <Sales store={store} range={sel.range} />
          ) : section === "marketing" ? (
            <Marketing store={store} range={sel.range} />
          ) : section === "audience" ? (
            <Audience store={store} range={sel.range} />
          ) : (
            <QualityView store={store} range={sel.range} />
          )}
          <footer>
            <span>
              LOJA DO OURO <i>·</i> Administração
            </span>
            <span>
              EUR · Europe/Lisbon · Dados provisórios, sujeitos a revisão
            </span>
            <small>
              Consulta em {localDate()} · {live ? "Leitura das fontes via Windsor; cache upstream possível." : "Abrir a página não atualiza as fontes."}
            </small>
          </footer>
        </main>
      </div>
    </div>
  );
}
