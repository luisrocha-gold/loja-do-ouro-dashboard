export type Channel = "Newsletter" | "Google" | "Facebook" | "Instagram" | "Outros / Direto";
export type Period = { from: string; to: string };
export type CampaignRow = {
  platform: "Meta" | "Google";
  group: string;
  campaign: string;
  spend: number;
  conversions: number;
  conversionValue: number;
  roas: number | null;
  cpa: number | null;
  ctr: number | null;
  cpc: number | null;
};
export type Snapshot = {
  range: Period;
  generatedAt: string;
  revenue: number;
  orders: number;
  aov: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number | null;
  discounts: number;
  refunds: number;
  newCustomerOrders: number;
  returningCustomerOrders: number;
  paymentMethods: { name: string; orders: number; revenue: number }[];
  fulfillment: { status: string; orders: number; revenue: number }[];
  metaSpend: number;
  googleSpend: number;
  totalSpend: number;
  blendedRoas: number | null;
  marketingCostRatio: number | null;
  sources: Record<Channel, { orders: number; revenue: number }>;
  unpaidOrders: number;
  unpaidValue: number;
  abandonedCheckouts: number;
  abandonedValue: number;
  recoveredCheckouts: number;
  daily: { date: string; revenue: number; orders: number; metaSpend: number; googleSpend: number }[];
  campaigns: CampaignRow[];
  warnings: string[];
};

type ShopifyOrderRow = {
  order_created_at?: string;
  order_id?: string;
  order_name?: string;
  order_cancelled_at?: string | null;
  order_financial_status?: string | null;
  order_count?: number | string | null;
  order_fully_paid?: boolean | string | number | null;
  order_unpaid?: boolean | string | number | null;
  order_total_price?: number | string | null;
  order_current_total_price?: number | string | null;
  order_total_outstanding_amount?: number | string | null;
  order_cost_of_goods_sold?: number | string | null;
  order_total_discounts?: number | string | null;
  order_refunds_subtotal?: number | string | null;
  order_new_or_returning_customer?: string | null;
  order_payment_gateways?: string | null;
  order_fulfillment_status?: string | null;
  order_customer_last_visit_source?: string | null;
  order_customer_last_visit_referrer_url?: string | null;
  order_customer_last_visit_utm_source?: string | null;
  order_customer_last_visit_utm_medium?: string | null;
  order_customer_last_visit_utm_campaign?: string | null;
  order_customer_last_visit_utm_content?: string | null;
  order_registered_source_url?: string | null;
  order_source_name?: string | null;
};

type ShopifyCheckoutRow = {
  abandoned_checkout_created_at?: string;
  abandoned_checkout_id?: string;
  abandoned_checkout_name?: string;
  abandoned_checkout_total_price?: number | string | null;
  abandoned_checkout_completed_at?: string | null;
};

type MetaRow = {
  date?: string;
  campaign?: string;
  spend?: number | string;
  impressions?: number | string;
  clicks?: number | string;
  actions_offsite_conversion_fb_pixel_purchase?: number | string;
  action_values_offsite_conversion_fb_pixel_purchase?: number | string;
};

type GoogleRow = {
  date?: string;
  campaign?: string;
  campaign_type?: string;
  advertising_channel_type?: string;
  spend?: number | string;
  impressions?: number | string;
  clicks?: number | string;
  conversions?: number | string;
  conversion_value?: number | string;
};

const CHANNELS: Channel[] = ["Newsletter", "Google", "Facebook", "Instagram", "Outros / Direto"];
const SHOPIFY_ACCOUNT = "lojadoouro-online.myshopify.com";
const META_ACCOUNT = "189245068300417";
const GOOGLE_ACCOUNT = "266-236-4039";

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};

const bool = (v: unknown) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return ["true", "1", "yes"].includes(String(v ?? "").trim().toLowerCase());
};

const env = (...keys: string[]) => keys.map((k) => process.env[k]).find(Boolean);

function normalize(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
    if (Array.isArray(o.result)) return o.result as Record<string, unknown>[];
  }
  return [];
}

async function windsor<T>(connector: "shopify" | "facebook" | "google_ads", range: Period, fields: string[], account?: string): Promise<T[]> {
  const key = env("WINDSOR_API_KEY", "WINDSORAI_API_KEY");
  if (!key) throw new Error("Windsor.ai não configurado no ambiente.");
  const p = new URLSearchParams({ api_key: key, date_from: range.from, date_to: range.to, fields: fields.join(","), _renderer: "json" });
  if (account) p.set("select_accounts", account);
  const r = await fetch(`https://connectors.windsor.ai/${connector}?${p}`, { cache: "no-store", headers: { "User-Agent": "LojaDoOuroDashboard/3.1" } });
  if (!r.ok) throw new Error(`Windsor ${connector} respondeu ${r.status}.`);
  return normalize(await r.json()) as T[];
}

async function shopifyOrders(range: Period) {
  return windsor<ShopifyOrderRow>("shopify", range, [
    "order_created_at","order_id","order_name","order_cancelled_at","order_financial_status","order_count","order_fully_paid","order_unpaid","order_total_price","order_current_total_price","order_total_outstanding_amount","order_cost_of_goods_sold","order_total_discounts","order_refunds_subtotal","order_new_or_returning_customer","order_payment_gateways","order_fulfillment_status","order_customer_last_visit_source","order_customer_last_visit_referrer_url","order_customer_last_visit_utm_source","order_customer_last_visit_utm_medium","order_customer_last_visit_utm_campaign","order_customer_last_visit_utm_content","order_registered_source_url","order_source_name"
  ], env("WINDSOR_SHOPIFY_ACCOUNT_ID") || SHOPIFY_ACCOUNT);
}

async function abandonedCheckouts(range: Period) {
  return windsor<ShopifyCheckoutRow>("shopify", range, ["abandoned_checkout_created_at","abandoned_checkout_id","abandoned_checkout_name","abandoned_checkout_total_price","abandoned_checkout_completed_at"], env("WINDSOR_SHOPIFY_ACCOUNT_ID") || SHOPIFY_ACCOUNT);
}

function orderCount(o: ShopifyOrderRow) {
  return Math.max(0, num(o.order_count));
}

function orderValue(o: ShopifyOrderRow) {
  return num(o.order_current_total_price ?? o.order_total_price);
}

function isCanonicalOrderRow(o: ShopifyOrderRow) {
  return orderCount(o) > 0;
}

function attributionText(o: ShopifyOrderRow) {
  return [o.order_customer_last_visit_utm_source,o.order_customer_last_visit_utm_medium,o.order_customer_last_visit_utm_campaign,o.order_customer_last_visit_utm_content,o.order_customer_last_visit_source,o.order_customer_last_visit_referrer_url,o.order_registered_source_url,o.order_source_name].filter(Boolean).join(" ").toLowerCase();
}

export function attributeOrder(o: ShopifyOrderRow): Channel {
  const t = attributionText(o);
  if (/klaviyo|newsletter/.test(t)) return "Newsletter";
  if (/instagram|(^|\W)ig(\W|$)/.test(t)) return "Instagram";
  if (/facebook|fb\.com|fbclid|(^|\W)fb(\W|$)/.test(t)) return "Facebook";
  if (/google|gclid/.test(t)) return "Google";
  return "Outros / Direto";
}

function isPaid(o: ShopifyOrderRow) {
  if (!isCanonicalOrderRow(o) || o.order_cancelled_at) return false;
  const status = String(o.order_financial_status ?? "").toUpperCase();
  if (["PAID", "PARTIALLY_REFUNDED"].includes(status)) return true;
  if (["VOIDED", "REFUNDED", "EXPIRED", "PENDING", "AUTHORIZED", "PARTIALLY_PAID"].includes(status)) return false;
  return bool(o.order_fully_paid) && num(o.order_total_outstanding_amount) <= 0;
}

function isUnpaid(o: ShopifyOrderRow) {
  if (!isCanonicalOrderRow(o) || o.order_cancelled_at || isPaid(o)) return false;
  const status = String(o.order_financial_status ?? "").toUpperCase();
  if (["VOIDED", "REFUNDED", "EXPIRED"].includes(status)) return false;
  return bool(o.order_unpaid) || num(o.order_total_outstanding_amount) > 0;
}

function googleGroup(r: GoogleRow) {
  const c = (r.campaign || "").toLowerCase();
  const t = `${r.campaign_type || ""} ${r.advertising_channel_type || ""}`.toLowerCase();
  if (/performance.?max|pmax/.test(t) || /pmax|performance.?max/.test(c)) return "Performance Max";
  if (/local/.test(t) || /benfica|loures|fátima|fatima|leiria|santar[eé]m|cartaxo|tomar|coimbra|abrantes|torres novas|figueira|entroncamento/.test(c)) return "Locais";
  if (/brand|branded|loja do ouro|lojadoouro/.test(c)) return "Brand";
  return "Non-Brand";
}

function campaigns(meta: MetaRow[], google: GoogleRow[]): CampaignRow[] {
  const m = new Map<string, CampaignRow & { clicks: number; impressions: number }>();
  const add = (platform: "Meta" | "Google", group: string, campaign: string, spend: number, conv: number, value: number, clicks: number, impressions: number) => {
    const k = `${platform}:${group}:${campaign}`;
    const e = m.get(k) || { platform, group, campaign, spend:0, conversions:0, conversionValue:0, roas:null, cpa:null, ctr:null, cpc:null, clicks:0, impressions:0 };
    e.spend += spend; e.conversions += conv; e.conversionValue += value; e.clicks += clicks; e.impressions += impressions; m.set(k, e);
  };
  meta.forEach(r => add("Meta","Campanhas",r.campaign || "Sem nome",num(r.spend),num(r.actions_offsite_conversion_fb_pixel_purchase),num(r.action_values_offsite_conversion_fb_pixel_purchase),num(r.clicks),num(r.impressions)));
  google.forEach(r => add("Google",googleGroup(r),r.campaign || "Sem nome",num(r.spend),num(r.conversions),num(r.conversion_value),num(r.clicks),num(r.impressions)));
  return [...m.values()].map(({clicks,impressions,...r}) => ({ ...r, roas:r.spend ? r.conversionValue/r.spend : null, cpa:r.conversions ? r.spend/r.conversions : null, ctr:impressions ? clicks/impressions*100 : null, cpc:clicks ? r.spend/clicks : null })).sort((a,b)=>b.spend-a.spend);
}

function days(range: Period) {
  const a = new Date(`${range.from}T00:00:00Z`); const b = new Date(`${range.to}T00:00:00Z`); const out:string[]=[];
  for (let d=a; d<=b; d=new Date(d.getTime()+86400000)) out.push(d.toISOString().slice(0,10));
  return out;
}

function gatewayName(raw?: string | null) {
  const s = String(raw || "Outro").replace(/[\[\]'\"]/g, "").trim();
  if (/mb way/i.test(s)) return "MB Way";
  if (/multibanco/i.test(s)) return "Multibanco";
  if (/klarna/i.test(s)) return "Klarna";
  if (/sequra/i.test(s)) return "SeQura";
  if (/shopify payments|visa|mastercard|card/i.test(s)) return "Cartão";
  return s || "Outro";
}

export async function getSnapshot(range: Period): Promise<Snapshot> {
  const warnings:string[]=[]; let os:ShopifyOrderRow[]=[]; let cs:ShopifyCheckoutRow[]=[]; let mr:MetaRow[]=[]; let gr:GoogleRow[]=[];
  const rs = await Promise.allSettled([
    shopifyOrders(range), abandonedCheckouts(range),
    windsor<MetaRow>("facebook",range,["date","campaign","spend","impressions","clicks","actions_offsite_conversion_fb_pixel_purchase","action_values_offsite_conversion_fb_pixel_purchase"],env("WINDSOR_META_ACCOUNT_ID") || META_ACCOUNT),
    windsor<GoogleRow>("google_ads",range,["date","campaign","campaign_type","advertising_channel_type","spend","impressions","clicks","conversions","conversion_value"],env("WINDSOR_GOOGLE_ACCOUNT_ID") || GOOGLE_ACCOUNT),
  ]);
  if(rs[0].status==="fulfilled") os=rs[0].value; else warnings.push(`Shopify via Windsor: ${String(rs[0].reason?.message || rs[0].reason)}`);
  if(rs[1].status==="fulfilled") cs=rs[1].value; else warnings.push(`Abandonos Shopify via Windsor: ${String(rs[1].reason?.message || rs[1].reason)}`);
  if(rs[2].status==="fulfilled") mr=rs[2].value; else warnings.push(`Meta via Windsor: ${String(rs[2].reason?.message || rs[2].reason)}`);
  if(rs[3].status==="fulfilled") gr=rs[3].value; else warnings.push(`Google via Windsor: ${String(rs[3].reason?.message || rs[3].reason)}`);

  const po=os.filter(isPaid);
  const paidOrders=po.reduce((s,o)=>s+orderCount(o),0);
  const revenue=po.reduce((s,o)=>s+orderValue(o),0);
  const cogs=po.reduce((s,o)=>s+Math.max(0,num(o.order_cost_of_goods_sold)),0);
  const grossProfit=revenue-cogs;
  const discounts=po.reduce((s,o)=>s+Math.max(0,num(o.order_total_discounts)),0);
  const refunds=os.filter(isCanonicalOrderRow).reduce((s,o)=>s+Math.max(0,num(o.order_refunds_subtotal)),0);
  const sources=Object.fromEntries(CHANNELS.map(c=>[c,{orders:0,revenue:0}])) as Snapshot["sources"];
  const pm=new Map<string,{name:string;orders:number;revenue:number}>(); const fm=new Map<string,{status:string;orders:number;revenue:number}>();
  let newCustomerOrders=0, returningCustomerOrders=0;
  po.forEach(o=>{
    const count=orderCount(o), value=orderValue(o), c=attributeOrder(o);
    sources[c].orders+=count; sources[c].revenue+=value;
    const customer=String(o.order_new_or_returning_customer || "").toLowerCase(); if(customer==="new") newCustomerOrders+=count; else if(customer==="returning") returningCustomerOrders+=count;
    const method=gatewayName(o.order_payment_gateways); const pe=pm.get(method)||{name:method,orders:0,revenue:0}; pe.orders+=count; pe.revenue+=value; pm.set(method,pe);
    const status=String(o.order_fulfillment_status || "Não preparado").replaceAll("_"," "); const fe=fm.get(status)||{status,orders:0,revenue:0}; fe.orders+=count; fe.revenue+=value; fm.set(status,fe);
  });
  const unpaid=os.filter(isUnpaid), open=cs.filter(c=>!c.abandoned_checkout_completed_at), recovered=cs.filter(c=>!!c.abandoned_checkout_completed_at);
  const unpaidOrders=unpaid.reduce((s,o)=>s+orderCount(o),0);
  const metaSpend=mr.reduce((s,r)=>s+num(r.spend),0), googleSpend=gr.reduce((s,r)=>s+num(r.spend),0), totalSpend=metaSpend+googleSpend;
  const dm=new Map(days(range).map(date=>[date,{date,revenue:0,orders:0,metaSpend:0,googleSpend:0}]));
  po.forEach(o=>{const date=o.order_created_at?.slice(0,10),d=date?dm.get(date):undefined;if(d){d.orders+=orderCount(o);d.revenue+=orderValue(o);}});
  mr.forEach(r=>{const d=r.date?dm.get(r.date.slice(0,10)):undefined;if(d)d.metaSpend+=num(r.spend);});
  gr.forEach(r=>{const d=r.date?dm.get(r.date.slice(0,10)):undefined;if(d)d.googleSpend+=num(r.spend);});

  return { range, generatedAt:new Date().toISOString(), revenue, orders:paidOrders, aov:paidOrders?revenue/paidOrders:0, cogs, grossProfit, grossMarginPct:revenue?grossProfit/revenue*100:null, discounts, refunds, newCustomerOrders, returningCustomerOrders, paymentMethods:[...pm.values()].sort((a,b)=>b.revenue-a.revenue), fulfillment:[...fm.values()].sort((a,b)=>b.orders-a.orders), metaSpend, googleSpend, totalSpend, blendedRoas:totalSpend?revenue/totalSpend:null, marketingCostRatio:revenue?totalSpend/revenue*100:null, sources, unpaidOrders, unpaidValue:unpaid.reduce((s,o)=>s+Math.max(num(o.order_total_outstanding_amount),orderValue(o)),0), abandonedCheckouts:open.length, abandonedValue:open.reduce((s,c)=>s+num(c.abandoned_checkout_total_price),0), recoveredCheckouts:recovered.length, daily:[...dm.values()], campaigns:campaigns(mr,gr), warnings };
}

export function previousPeriod(r:Period):Period { const a=new Date(`${r.from}T00:00:00Z`), b=new Date(`${r.to}T00:00:00Z`), n=Math.round((b.getTime()-a.getTime())/86400000)+1, e=new Date(a.getTime()-86400000), s=new Date(e.getTime()-(n-1)*86400000); return {from:s.toISOString().slice(0,10),to:e.toISOString().slice(0,10)}; }
export function defaultRange(n=7):Period { const x=new Date(), e=new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),x.getUTCDate()-1)), s=new Date(e.getTime()-(n-1)*86400000); return {from:s.toISOString().slice(0,10),to:e.toISOString().slice(0,10)}; }
