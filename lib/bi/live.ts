import "server-only";
import { normalizeOrders } from "./live-model";
import { dates, shift, type Period } from "./periods";
import { number, type Store, type Row, type Dataset } from "./model";

// Accounts, fields and options rediscovered with Windsor on 17 September 2026.
const accounts: Record<string, string> = {
  facebook: "189245068300417", google_ads: "266-236-4039",
  googleanalytics4: "292767515", shopify: "lojadoouro-online.myshopify.com",
  klaviyo:"SneNCt", searchconsole:"https://www.lojadoouro.pt/", google_merchant:"5678283203",
};
const meta = ["spend", "impressions", "clicks", "actions_offsite_conversion_fb_pixel_purchase", "action_values_offsite_conversion_fb_pixel_purchase"];
const google = ["spend", "impressions", "clicks", "conversions", "conversions_value"];
const ga = ["totalusers", "active_users", "sessions", "ecommerce_purchases", "purchase_revenue", "item_view_events", "add_to_carts", "checkouts"];
const orderFields = ["order_id", "order_name", "order_count", "order_created_at", "order_updated_at", "order_cancelled_at", "order_financial_status", "order_fulfillment_status", "order_current_total_price", "order_net_payment", "order_currency", "order_shipping_address_city", "order_shipping_address_country", "order_source_name", "order_customer_last_visit_utm_campaign", "order_customer_last_visit_utm_source", "order_customer_last_visit_utm_medium"];
const accountFields: Record<string, string[]> = {
  facebook: ["account_currency", "account_timezone"],
  google_ads: ["account_currency_code", "account_time_zone"],
  googleanalytics4: ["property_currency", "property_timezone"],
  shopify: [],
  klaviyo:[], searchconsole:[], google_merchant:[],
};
export function liveConfigured() {
  return Boolean(process.env.WINDSOR_API_KEY || process.env.WINDSORAI_API_KEY);
}
async function read(connector: string, p: Period, requested: string[]) {
  const key = process.env.WINDSOR_API_KEY || process.env.WINDSORAI_API_KEY;
  if (!key) throw new Error("Ligação às fontes indisponível.");
  const fields = [...new Set([...requested, ...accountFields[connector]])];
  const params = new URLSearchParams({api_key:key, select_accounts:accounts[connector], date_from:p.from, date_to:p.to, fields:fields.join(","), _renderer:"json"});
  if (connector === "facebook") params.set("attribution_window", "default");
  if (connector === "shopify") params.set("report_timezone", "Europe/Lisbon");
  // Never log the request URL, which contains the existing private API key.
  let response: Response;
  try {
    response = await fetch(`https://connectors.windsor.ai/${connector}?${params}`, {
      cache:"no-store", signal:AbortSignal.timeout(25000),
      headers:{"User-Agent":"LojaDoOuroDashboard/4.1"},
    });
  } catch { throw new Error("Consulta interrompida ou excedeu o tempo disponível."); }
  if (!response.ok) throw new Error(`Fonte indisponível (HTTP ${response.status}).`);
  let json: unknown;
  try { json = await response.json(); } catch { throw new Error("Resposta inválida da fonte."); }
  const obj = json as Record<string, unknown>;
  const rows = Array.isArray(json) ? json : Array.isArray(obj?.data) ? obj.data : Array.isArray(obj?.result) ? obj.result : null;
  if (!rows || rows.some(r => !r || typeof r !== "object" || Array.isArray(r))) throw new Error("Resposta inválida da fonte.");
  const currencyField = accountFields[connector][0], timezoneField = accountFields[connector][1];
  if (currencyField && rows.some(r => r[currencyField] !== "EUR" || r[timezoneField] !== "Europe/Lisbon"))
    throw new Error("Moeda ou fuso da conta sem confirmação EUR / Europe/Lisbon.");
  const fetched_at = new Date().toISOString();
  return {rows:rows as Row[], fields, fetched_at};
}

export async function loadLivePeriods(periods: Period[], selected: Period, section: string): Promise<Store> {
  const unique = [...new Map(periods.map(p => [`${p.from}:${p.to}`, p])).values()];
  const broad = {from:unique.map(p=>p.from).sort()[0], to:unique.map(p=>p.to).sort().at(-1)!};
  const store: Store = {daily:[], datasets:[], quality:[], reports:[], runs:[], errors:[], mode:"live"};
  const errors: string[] = [];
  const metadata = (connector: string, fields: string[]) => ({
    fields, account_id:accounts[connector], timezone:connector==="shopify" || accountFields[connector].length ? "Europe/Lisbon" : undefined, currency:accountFields[connector].length ? "EUR" : undefined,
    transport:"Windsor", cache:"Cache upstream possível; refresh não comprovado.",
    query:"Consulta direta; dados não certificados nem guardados como fecho.",
  });
  const dataset = (connector:string, source:string, kind:string, p:Period, r:Awaited<ReturnType<typeof read>>, extra:Row = {}): Dataset => ({
    source, dataset:kind, period_start:p.from, period_end:p.to, rows:r.rows,
    metadata:{...metadata(connector,r.fields),...extra}, fetched_at:r.fetched_at, status:"provisional", run_id:"live",
  });
  const job = async (label:string, action:()=>Promise<void>) => {
    try { await action(); } catch(e) { errors.push(`${label}: ${e instanceof Error ? e.message : "Indisponível"}`); }
  };
  const daily = async (connector:string, source:string, fields:string[]) => {
    const r = await read(connector,broad,["date",...fields]);
    store.daily.push(...r.rows.filter(x=>typeof x.date === "string" && x.date >= broad.from && x.date <= broad.to)
      .map(x=>({source,metric_date:String(x.date),metrics:x,fetched_at:r.fetched_at,status:"provisional",run_id:"live"})));
    const found = new Set(r.rows.map(x=>x.date));
    for(const p of unique) if(dates(p).some(d=>!found.has(d))) errors.push(`${source}: cobertura diária incompleta em ${p.from} a ${p.to}.`);
  };
  const jobs: Promise<void>[] = [
    job("Meta",()=>daily("facebook","meta",meta)),
    job("Google Ads",()=>daily("google_ads","google_ads",google)),
    job("GA4",()=>daily("googleanalytics4","ga4",ga)),
    job("Shopify",async()=>{
      // Add boundary days, then filter the actual creation instant in Lisbon.
      // This also protects against connectors filtering on a UTC boundary.
      const r = await read("shopify",{from:shift(broad.from,-1),to:shift(broad.to,1)},orderFields);
      const normalized = normalizeOrders(r.rows);
      for(const p of unique) store.datasets.push(dataset("shopify","shopify_live","orders",p,
        {...r,rows:normalized.rows.filter(x=>String(x.date)>=p.from && String(x.date)<=p.to)},
        {complete:false,conflicts:normalized.conflicts,pagination:"Não exposta pelo conector; sem certificação de cobertura.",excluded_reversal_rows:normalized.excluded}));
    }),
    ...unique.map(p=>job(`GA4 ${p.from} a ${p.to}`,async()=>{
      const r=await read("googleanalytics4",p,ga);
      if(r.rows.length!==1) throw new Error("Total de período ausente ou com granularidade inesperada.");
      store.datasets.push(dataset("googleanalytics4","ga4","period_totals",p,r));
      if((number(r.rows[0].purchase_revenue) ?? 0)<0) store.quality.push({metric_date:p.to,code:"negative_ga4_revenue",severity:"warning",message:"A receita GA4 é negativa neste período; requer diagnóstico. Não é usada como receita Shopify.",evidence:{period:p},created_at:r.fetched_at,run_id:"live"});
    })),
  ];
  const addDetail = (connector:string, source:string, kind:string, fields:string[]) => {
    jobs.push(job(`${source} · ${kind}`,async()=>{const r=await read(connector,selected,fields);store.datasets.push(dataset(connector,source,kind,selected,r,{privacy:source==="ga4"?"Podem existir thresholds e categorias unknown.":undefined}));}));
  };
  if(section==="marketing" || section==="quality") {
    addDetail("facebook","meta","ads",["date","campaign","campaign_id","ad_id","ad_name",...meta]);
    addDetail("google_ads","google_ads","campaigns",["date","campaign","campaign_id","campaign_type",...google]);
    addDetail("google_ads","google_ads","conversion_actions",["date","conversion_action_name","conversion_action_category","conversions","conversions_value"]);
    addDetail("googleanalytics4","ga4","channels",["session_source_medium","sessions","ecommerce_purchases","purchase_revenue"]);
  }
  if(section==="marketing") {
    addDetail("klaviyo","klaviyo","campaigns",["campaign","sent_at","campaign_report_recipients","campaign_report_conversions"]);
    addDetail("klaviyo","klaviyo","flows",["flow_name","flow_recipients","flow_conversions"]);
    addDetail("searchconsole","searchconsole","period_totals",["clicks","impressions","ctr","position"]);
    addDetail("google_merchant","google_merchant","status",["product_status_country","product_status_reporting_context","product_status_active_count","product_status_disapproved_count","product_status_pending_count"]);
  }
  if(section==="audience") {
    addDetail("googleanalytics4","ga4","geography",["country","city","totalusers","sessions","ecommerce_purchases","purchase_revenue"]);
    addDetail("googleanalytics4","ga4","demographics",["age","gender","active_users"]);
    addDetail("facebook","meta","demographics",["age","gender","spend","impressions","actions_offsite_conversion_fb_pixel_purchase"]);
    addDetail("facebook","meta","geography",["country","spend","impressions","actions_offsite_conversion_fb_pixel_purchase"]);
  }
  if(section==="quality") addDetail("googleanalytics4","ga4","transactions",["transactionid","ecommerce_purchases","purchase_revenue"]);
  await Promise.all(jobs);
  store.errors = [...new Set(errors)];
  if(!store.daily.length && !store.datasets.some(d=>d.rows.length)) store.mode="unavailable";
  return store;
}
