import type { Period } from "@/lib/dashboard";

export type MetricDelta = { current: number; previous: number; deltaPct: number | null };
export type ExecutiveWindow = "day" | "week" | "month";
export type ExecutiveWindowSummary = {
  key: ExecutiveWindow;
  label: string;
  range: Period;
  previous: Period;
  metrics: {
    revenue: MetricDelta;
    orders: MetricDelta;
    aov: MetricDelta;
    adSpend: MetricDelta;
    blendedRoas: MetricDelta;
    sessions: MetricDelta;
    checkoutRate: MetricDelta;
    purchaseRate: MetricDelta;
    emailRevenue: MetricDelta;
    emailConversions: MetricDelta;
  };
};

export type FunnelSnapshot = { sessions:number; activeUsers:number; productViews:number; addToCarts:number; checkouts:number; purchases:number; purchaseRevenue:number; engagementRate:number; firstTimePurchasers:number };
export type KlaviyoCampaign = { campaign:string; sentAt?:string; recipients:number; openRate:number; clickRate:number; conversions:number; conversionValue:number; averageOrderValue:number; revenuePerRecipient:number; unsubscribeRate:number; spamComplaints:number };
export type KlaviyoFlow = { flow:string; message?:string; recipients:number; openRate:number; clickRate:number; conversions:number; conversionValue:number; revenuePerRecipient:number; status?:string };
export type ShopifyEmailCampaign = { campaign:string; orders:number; revenue:number };
export type DistrictRow = { district:string; shopifyRevenue:number; shopifyOrders:number; cogs:number; grossContribution:number; metaSpend:number; googleSpend:number; totalSpend:number; sessions:number; checkouts:number; analyticsPurchases:number; analyticsRevenue:number; roas:number|null; marketingEfficiency:number|null; conversionRate:number|null; opportunityScore:number; opportunityBand:"Alta"|"Média"|"Baixa" };
export type DataQualityCheck = { id:string; label:string; status:"pass"|"warn"|"fail"; detail:string; variancePct?:number|null };
export type Recommendation = { priority:"P0"|"P1"|"P2"; area:string; title:string; rationale:string; action:string; estimatedImpact:string };
type AbandonmentSnapshot = { klaviyoAddedToCart:number; klaviyoCheckoutStarted:number; klaviyoPlacedOrders:number; klaviyoRevenue:number };
type SeoSnapshot = { clicks:number; impressions:number; positionWeighted:number };
type MerchantSnapshot = { active:number; disapproved:number; pending:number; context:string };
export type IntelligenceSnapshot = {
  range:Period;
  ga4:FunnelSnapshot;
  klaviyoCampaigns:KlaviyoCampaign[];
  klaviyoFlows:KlaviyoFlow[];
  shopifyEmailCampaigns:ShopifyEmailCampaign[];
  shopifyEmailSummary:{orders:number;revenue:number};
  districtRows:DistrictRow[];
  dataQuality:DataQualityCheck[];
  recommendations:Recommendation[];
  abandonment:AbandonmentSnapshot;
  seo:{clicks:number;impressions:number;ctr:number;position:number};
  merchant:MerchantSnapshot;
};

const WINDSOR_BASE="https://connectors.windsor.ai";
const SHOPIFY_ACCOUNT="lojadoouro-online.myshopify.com", META_ACCOUNT="189245068300417", GOOGLE_ACCOUNT="266-236-4039", GA4_ACCOUNT="292767515", KLAVIYO_ACCOUNT="SneNCt", SEARCH_CONSOLE_ACCOUNT="https://www.lojadoouro.pt/", MERCHANT_ACCOUNT="5678283203";
const n=(v:unknown)=>{const x=Number(v??0);return Number.isFinite(x)?x:0;};
const pct=(a:number,b:number)=>b===0?(a===0?0:null):((a-b)/b)*100;
function normalize(json:unknown):Record<string,unknown>[] { if(Array.isArray(json))return json as Record<string,unknown>[]; if(json&&typeof json==="object"){const o=json as Record<string,unknown>;if(Array.isArray(o.data))return o.data as Record<string,unknown>[];if(Array.isArray(o.result))return o.result as Record<string,unknown>[];}return[]; }
async function read(connector:string,range:Period,fields:string[],account?:string){const key=process.env.WINDSOR_API_KEY||process.env.WINDSORAI_API_KEY;if(!key)throw new Error("WINDSOR_API_KEY em falta");const p=new URLSearchParams({api_key:key,date_from:range.from,date_to:range.to,fields:fields.join(","),_renderer:"json"});if(account)p.set("select_accounts",account);const r=await fetch(`${WINDSOR_BASE}/${connector}?${p}`,{cache:"no-store",headers:{"User-Agent":"LojaDoOuroDashboard/3.1"}});if(!r.ok)throw new Error(`${connector} HTTP ${r.status}`);return normalize(await r.json());}
function districtName(v:unknown){return String(v||"Sem distrito").replace(/ District$/i,"").replace(/^Lisbon$/i,"Lisboa").replace(/^Setubal$/i,"Setúbal").replace(/^Santarem$/i,"Santarém").replace(/^Evora$/i,"Évora").replace(/^Azores$/i,"Açores").replace(/^Braganca$/i,"Bragança");}
function opportunity(row:Omit<DistrictRow,"opportunityScore"|"opportunityBand">){const funnelLoss=row.checkouts>0?Math.max(0,1-row.analyticsPurchases/row.checkouts):0,demand=Math.log10(Math.max(1,row.sessions+1)),spendPressure=row.totalSpend>0&&row.shopifyRevenue>0?Math.min(2,row.totalSpend/row.shopifyRevenue):row.totalSpend>0?2:0,conversion=row.sessions>0?row.analyticsPurchases/row.sessions:0,score=Math.max(0,Math.min(100,28*funnelLoss+18*demand+22*spendPressure+32*Math.max(0,0.02-conversion)/0.02));return{score:Math.round(score),band:score>=65?"Alta":score>=40?"Média":"Baixa"} as const;}
function iso(d:Date){return d.toISOString().slice(0,10);}
function addDays(s:string,delta:number){const d=new Date(`${s}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+delta);return iso(d);}
function previousMonthRanges(reference=new Date()){const y=reference.getUTCFullYear(),m=reference.getUTCMonth();const currentMonthStart=new Date(Date.UTC(y,m,1));const prevEnd=new Date(currentMonthStart.getTime()-86400000);const prevStart=new Date(Date.UTC(prevEnd.getUTCFullYear(),prevEnd.getUTCMonth(),1));const beforeEnd=new Date(prevStart.getTime()-86400000);const beforeStart=new Date(Date.UTC(beforeEnd.getUTCFullYear(),beforeEnd.getUTCMonth(),1));return{month:{from:iso(prevStart),to:iso(prevEnd)},previousMonth:{from:iso(beforeStart),to:iso(beforeEnd)}};}
function inRange(date:string,r:Period){return date>=r.from&&date<=r.to;}
function sumRows(rows:Record<string,unknown>[],field:string,range:Period,dateField="date"){return rows.reduce<number>((s,r)=>{const d=String(r[dateField]||"").slice(0,10);return inRange(d,range)?s+n(r[field]):s;},0);}
function delta(current:number,previous:number):MetricDelta{return{current,previous,deltaPct:pct(current,previous)};}
function isPaidShopifyRow(r:Record<string,unknown>){return n(r.order_count)>0&&["PAID","PARTIALLY_REFUNDED"].includes(String(r.order_financial_status||"").toUpperCase());}
function shopifyAttributionText(r:Record<string,unknown>){return [r.order_customer_last_visit_utm_source,r.order_customer_last_visit_utm_medium,r.order_customer_last_visit_utm_campaign,r.order_customer_last_visit_utm_content,r.order_customer_last_visit_source,r.order_customer_last_visit_referrer_url,r.order_registered_source_url,r.order_source_name].filter(Boolean).join(" ").toLowerCase();}
function isNewsletterAttribution(r:Record<string,unknown>){return /klaviyo|newsletter/.test(shopifyAttributionText(r));}
const SHOPIFY_ATTRIBUTION_FIELDS=["order_customer_last_visit_source","order_customer_last_visit_referrer_url","order_customer_last_visit_utm_source","order_customer_last_visit_utm_medium","order_customer_last_visit_utm_campaign","order_customer_last_visit_utm_content","order_registered_source_url","order_source_name"];

export async function getExecutivePulse(reference=new Date()):Promise<ExecutiveWindowSummary[]>{
  const yesterday=iso(new Date(Date.UTC(reference.getUTCFullYear(),reference.getUTCMonth(),reference.getUTCDate()-1)));
  const day={from:yesterday,to:yesterday},prevDay={from:addDays(yesterday,-1),to:addDays(yesterday,-1)};
  const week={from:addDays(yesterday,-6),to:yesterday},prevWeek={from:addDays(yesterday,-13),to:addDays(yesterday,-7)};
  const {month,previousMonth}=previousMonthRanges(reference);
  const broad:{from:string;to:string}={from:[prevDay.from,prevWeek.from,previousMonth.from].sort()[0],to:yesterday};
  const [shopify,meta,google,ga4]=await Promise.all([
    read("shopify",broad,["order_created_at","order_financial_status","order_count","order_current_total_price",...SHOPIFY_ATTRIBUTION_FIELDS],SHOPIFY_ACCOUNT),
    read("facebook",broad,["date","spend"],META_ACCOUNT),
    read("google_ads",broad,["date","spend"],GOOGLE_ACCOUNT),
    read("googleanalytics4",broad,["date","sessions","checkouts","ecommerce_purchases"],GA4_ACCOUNT),
  ]);
  const paid=shopify.filter(isPaidShopifyRow);
  const newsletterPaid=paid.filter(isNewsletterAttribution);
  const build=(key:ExecutiveWindow,label:string,range:Period,previous:Period):ExecutiveWindowSummary=>{
    const revenue=sumRows(paid,"order_current_total_price",range,"order_created_at"),prevRevenue=sumRows(paid,"order_current_total_price",previous,"order_created_at"),orders=sumRows(paid,"order_count",range,"order_created_at"),prevOrders=sumRows(paid,"order_count",previous,"order_created_at");
    const spend=sumRows(meta,"spend",range)+sumRows(google,"spend",range),prevSpend=sumRows(meta,"spend",previous)+sumRows(google,"spend",previous);
    const sessions=sumRows(ga4,"sessions",range),prevSessions=sumRows(ga4,"sessions",previous),checkouts=sumRows(ga4,"checkouts",range),prevCheckouts=sumRows(ga4,"checkouts",previous),purchases=sumRows(ga4,"ecommerce_purchases",range),prevPurchases=sumRows(ga4,"ecommerce_purchases",previous);
    const emailRev=sumRows(newsletterPaid,"order_current_total_price",range,"order_created_at"),prevEmailRev=sumRows(newsletterPaid,"order_current_total_price",previous,"order_created_at"),emailConv=sumRows(newsletterPaid,"order_count",range,"order_created_at"),prevEmailConv=sumRows(newsletterPaid,"order_count",previous,"order_created_at");
    return{key,label,range,previous,metrics:{revenue:delta(revenue,prevRevenue),orders:delta(orders,prevOrders),aov:delta(orders?revenue/orders:0,prevOrders?prevRevenue/prevOrders:0),adSpend:delta(spend,prevSpend),blendedRoas:delta(spend?revenue/spend:0,prevSpend?prevRevenue/prevSpend:0),sessions:delta(sessions,prevSessions),checkoutRate:delta(sessions?checkouts/sessions:0,prevSessions?prevCheckouts/prevSessions:0),purchaseRate:delta(sessions?purchases/sessions:0,prevSessions?prevPurchases/prevSessions:0),emailRevenue:delta(emailRev,prevEmailRev),emailConversions:delta(emailConv,prevEmailConv)}};
  };
  return[build("day","Ontem",day,prevDay),build("week","Últimos 7 dias",week,prevWeek),build("month","Mês anterior",month,previousMonth)];
}

export async function getIntelligence(range:Period):Promise<IntelligenceSnapshot>{
  const [ga4Rows,shopifyRows,metaRows,googleRows,klaviyoCampaignRows,klaviyoFlowRows,klaviyoFunnelRows,searchRows,merchantRows]=await Promise.all([
    read("googleanalytics4",range,["sessions","active_users","engaged_sessions","engagement_rate","item_view_events","add_to_carts","checkouts","ecommerce_purchases","transactions","purchase_revenue","first_time_purchasers"],GA4_ACCOUNT),
    read("shopify",range,["order_created_at","order_shipping_address_country","order_shipping_address_province","order_financial_status","order_count","order_current_total_price","order_cost_of_goods_sold",...SHOPIFY_ATTRIBUTION_FIELDS],SHOPIFY_ACCOUNT),
    read("facebook",range,["country","region","spend","impressions","reach","clicks"],META_ACCOUNT),
    read("google_ads",range,["country","region","spend","impressions","clicks","conversions","conversion_value"],GOOGLE_ACCOUNT),
    read("klaviyo",range,["campaign","campaign_id","sent_at","campaign_channel","campaign_report_recipients","campaign_report_open_rate","campaign_report_click_rate","campaign_report_conversions","campaign_report_conversion_value","campaign_report_average_order_value","campaign_report_revenue_per_recipient","campaign_report_unsubscribe_rate","campaign_report_spam_complaints"],KLAVIYO_ACCOUNT),
    read("klaviyo",range,["flow_id","flow_name","flow_status","flow_message_name","flow_recipients","flow_open_rate","flow_click_rate","flow_conversions","flow_conversion_value","flow_revenue_per_recipient"],KLAVIYO_ACCOUNT),
    read("klaviyo",range,["date","shopify_added_to_cart","shopify_checkout_started","shopify_placed_order","shopify_revenue"],KLAVIYO_ACCOUNT),
    read("searchconsole",range,["clicks","impressions","ctr","position"],SEARCH_CONSOLE_ACCOUNT),
    read("google_merchant",range,["product_status_country","product_status_reporting_context","product_status_active_count","product_status_disapproved_count","product_status_pending_count"],MERCHANT_ACCOUNT),
  ]);
  const ga4=ga4Rows.reduce<FunnelSnapshot>((a,r)=>({sessions:a.sessions+n(r.sessions),activeUsers:a.activeUsers+n(r.active_users),productViews:a.productViews+n(r.item_view_events),addToCarts:a.addToCarts+n(r.add_to_carts),checkouts:a.checkouts+n(r.checkouts),purchases:a.purchases+n(r.ecommerce_purchases),purchaseRevenue:a.purchaseRevenue+n(r.purchase_revenue),engagementRate:a.engagementRate+n(r.engagement_rate),firstTimePurchasers:a.firstTimePurchasers+n(r.first_time_purchasers)}),{sessions:0,activeUsers:0,productViews:0,addToCarts:0,checkouts:0,purchases:0,purchaseRevenue:0,engagementRate:0,firstTimePurchasers:0});ga4.engagementRate=ga4Rows.length?ga4.engagementRate/ga4Rows.length:0;
  const abandonment=klaviyoFunnelRows.reduce<AbandonmentSnapshot>((a,r)=>({klaviyoAddedToCart:a.klaviyoAddedToCart+n(r.shopify_added_to_cart),klaviyoCheckoutStarted:a.klaviyoCheckoutStarted+n(r.shopify_checkout_started),klaviyoPlacedOrders:a.klaviyoPlacedOrders+n(r.shopify_placed_order),klaviyoRevenue:a.klaviyoRevenue+n(r.shopify_revenue)}),{klaviyoAddedToCart:0,klaviyoCheckoutStarted:0,klaviyoPlacedOrders:0,klaviyoRevenue:0});
  const districts=new Map<string,Omit<DistrictRow,"opportunityScore"|"opportunityBand">>();const getDistrict=(name:string)=>{const key=districtName(name),found=districts.get(key);if(found)return found;const x:Omit<DistrictRow,"opportunityScore"|"opportunityBand">={district:key,shopifyRevenue:0,shopifyOrders:0,cogs:0,grossContribution:0,metaSpend:0,googleSpend:0,totalSpend:0,sessions:0,checkouts:0,analyticsPurchases:0,analyticsRevenue:0,roas:null,marketingEfficiency:null,conversionRate:null};districts.set(key,x);return x;};
  shopifyRows.forEach(r=>{if(String(r.order_shipping_address_country||"").toLowerCase()!=="portugal")return;if(!isPaidShopifyRow(r))return;const d=getDistrict(String(r.order_shipping_address_province||"Sem distrito"));d.shopifyRevenue+=n(r.order_current_total_price);d.shopifyOrders+=n(r.order_count);d.cogs+=n(r.order_cost_of_goods_sold);});
  metaRows.forEach(r=>{if(String(r.country||"").toLowerCase()!=="portugal")return;getDistrict(String(r.region||"Sem distrito")).metaSpend+=n(r.spend);});
  googleRows.forEach(r=>{if(String(r.country||"").toLowerCase()!=="portugal")return;getDistrict(String(r.region||"Sem distrito")).googleSpend+=n(r.spend);});
  const geoGa4=await read("googleanalytics4",range,["country","region","sessions","checkouts","ecommerce_purchases","purchase_revenue"],GA4_ACCOUNT);geoGa4.forEach(r=>{if(String(r.country||"").toLowerCase()!=="portugal")return;const d=getDistrict(String(r.region||"Sem distrito"));d.sessions+=n(r.sessions);d.checkouts+=n(r.checkouts);d.analyticsPurchases+=n(r.ecommerce_purchases);d.analyticsRevenue+=n(r.purchase_revenue);});
  const districtRows=[...districts.values()].map(d=>{d.totalSpend=d.metaSpend+d.googleSpend;d.grossContribution=d.shopifyRevenue-d.cogs;d.roas=d.totalSpend>0?d.shopifyRevenue/d.totalSpend:null;d.marketingEfficiency=d.shopifyRevenue>0?d.totalSpend/d.shopifyRevenue:null;d.conversionRate=d.sessions>0?d.analyticsPurchases/d.sessions:null;const o=opportunity(d);return{...d,opportunityScore:o.score,opportunityBand:o.band} as DistrictRow;}).sort((a,b)=>b.shopifyRevenue-a.shopifyRevenue);

  const emailMap=new Map<string,ShopifyEmailCampaign>();
  shopifyRows.forEach(r=>{
    if(!isPaidShopifyRow(r)||!isNewsletterAttribution(r))return;
    const campaign=String(r.order_customer_last_visit_utm_campaign||"Newsletter sem campanha").trim()||"Newsletter sem campanha";
    const row=emailMap.get(campaign)||{campaign,orders:0,revenue:0};
    row.orders+=n(r.order_count);
    row.revenue+=n(r.order_current_total_price);
    emailMap.set(campaign,row);
  });
  const shopifyEmailCampaigns=[...emailMap.values()].sort((a,b)=>b.revenue-a.revenue);
  const shopifyEmailSummary=shopifyEmailCampaigns.reduce((a,r)=>({orders:a.orders+r.orders,revenue:a.revenue+r.revenue}),{orders:0,revenue:0});

  const klaviyoCampaigns:KlaviyoCampaign[]=klaviyoCampaignRows.filter(r=>r.campaign).map(r=>({campaign:String(r.campaign),sentAt:r.sent_at?String(r.sent_at):undefined,recipients:n(r.campaign_report_recipients),openRate:n(r.campaign_report_open_rate),clickRate:n(r.campaign_report_click_rate),conversions:n(r.campaign_report_conversions),conversionValue:n(r.campaign_report_conversion_value),averageOrderValue:n(r.campaign_report_average_order_value),revenuePerRecipient:n(r.campaign_report_revenue_per_recipient),unsubscribeRate:n(r.campaign_report_unsubscribe_rate),spamComplaints:n(r.campaign_report_spam_complaints)})).sort((a,b)=>b.conversionValue-a.conversionValue);
  const klaviyoFlows:KlaviyoFlow[]=klaviyoFlowRows.filter(r=>r.flow_name).map(r=>({flow:String(r.flow_name),message:r.flow_message_name?String(r.flow_message_name):undefined,recipients:n(r.flow_recipients),openRate:n(r.flow_open_rate),clickRate:n(r.flow_click_rate),conversions:n(r.flow_conversions),conversionValue:n(r.flow_conversion_value),revenuePerRecipient:n(r.flow_revenue_per_recipient),status:r.flow_status?String(r.flow_status):undefined})).sort((a,b)=>b.conversionValue-a.conversionValue);
  const paidRevenue=districtRows.reduce((s,r)=>s+r.shopifyRevenue,0),shopifyPaidOrders=districtRows.reduce((s,r)=>s+r.shopifyOrders,0),adSpend=districtRows.reduce((s,r)=>s+r.totalSpend,0),klaviyoRevenue=klaviyoCampaigns.reduce((s,r)=>s+r.conversionValue,0)+klaviyoFlows.reduce((s,r)=>s+r.conversionValue,0),analyticsVariance=paidRevenue?Math.abs(ga4.purchaseRevenue-paidRevenue)/paidRevenue*100:null,purchaseVariance=shopifyPaidOrders?Math.abs(ga4.purchases-shopifyPaidOrders)/shopifyPaidOrders*100:null,checkoutVariance=ga4.checkouts?Math.abs(abandonment.klaviyoCheckoutStarted-ga4.checkouts)/ga4.checkouts*100:null;
  const dataQuality:DataQualityCheck[]=[
    {id:"shopify-ga4-revenue",label:"Shopify vs GA4 · receita",status:analyticsVariance===null?"warn":analyticsVariance<=10?"pass":analyticsVariance<=25?"warn":"fail",variancePct:analyticsVariance,detail:analyticsVariance===null?"Sem base para comparação.":`Diferença de ${analyticsVariance.toFixed(1)}% entre receita paga Shopify e purchase_revenue GA4.`},
    {id:"shopify-ga4-orders",label:"Shopify vs GA4 · compras",status:purchaseVariance===null?"warn":purchaseVariance<=10?"pass":purchaseVariance<=25?"warn":"fail",variancePct:purchaseVariance,detail:purchaseVariance===null?"Sem base para comparação.":`Diferença de ${purchaseVariance.toFixed(1)}% entre encomendas pagas Shopify e ecommerce_purchases GA4.`},
    {id:"ga4-klaviyo-checkout",label:"GA4 vs Klaviyo · início de checkout",status:checkoutVariance===null?"warn":checkoutVariance<=15?"pass":checkoutVariance<=35?"warn":"fail",variancePct:checkoutVariance,detail:checkoutVariance===null?"Sem base para comparação.":`GA4 registou ${ga4.checkouts.toFixed(0)} begin_checkout e Klaviyo ${abandonment.klaviyoCheckoutStarted.toFixed(0)} Checkout Started (${checkoutVariance.toFixed(1)}% de diferença).`},
    {id:"ad-spend",label:"Cobertura de investimento",status:adSpend>0?"pass":"fail",detail:adSpend>0?`Meta + Google com ${adSpend.toFixed(2)} € de investimento no período.`:"Sem investimento devolvido pelas plataformas."},
    {id:"email-truth",label:"Newsletter · fonte financeira",status:"pass",detail:`Shopify atribui ${shopifyEmailSummary.orders.toFixed(0)} encomendas pagas e ${shopifyEmailSummary.revenue.toFixed(2)} € à Newsletter por última visita, sem duplicação. Este é o valor usado para contas.`},
    {id:"klaviyo",label:"Klaviyo · atribuição auxiliar",status:"warn",detail:`Klaviyo atribui ${klaviyoRevenue.toFixed(2)} €. É uma leitura de influência/atribuição e pode sobrepor Google, Meta ou Direto; não entra na receita principal nem nos totais por canal.`}
  ];
  const recommendations:Recommendation[]=[];
  const weakDistrict=districtRows.filter(r=>r.totalSpend>=75&&(r.roas??0)<1.5).sort((a,b)=>b.totalSpend-a.totalSpend)[0];if(weakDistrict)recommendations.push({priority:"P0",area:"Geografia",title:`Rever investimento em ${weakDistrict.district}`,rationale:`Investimento ${weakDistrict.totalSpend.toFixed(0)} € com ROAS comercial de ${(weakDistrict.roas??0).toFixed(2)}x e ${weakDistrict.shopifyOrders.toFixed(0)} encomendas pagas.`,action:"Separar campanhas por distrito, reduzir orçamento onde a eficiência comercial é fraca e testar criativos/ofertas locais antes de voltar a escalar.",estimatedImpact:"Redução de desperdício e realocação para zonas com maior retorno."});
  const highOpp=districtRows.filter(r=>r.opportunityBand==="Alta"&&r.sessions>=200).sort((a,b)=>b.opportunityScore-a.opportunityScore)[0];if(highOpp)recommendations.push({priority:"P1",area:"CRO",title:`Atacar fuga de funil em ${highOpp.district}`,rationale:`${highOpp.sessions.toFixed(0)} sessões, ${highOpp.checkouts.toFixed(0)} checkouts e ${highOpp.analyticsPurchases.toFixed(0)} compras GA4.`,action:"Auditar mobile checkout, confiança, portes, métodos de pagamento e mensagens de recuperação segmentadas por distrito.",estimatedImpact:"Aumento da taxa de checkout→compra sem exigir mais tráfego."});
  const bestEmail=shopifyEmailCampaigns[0];if(bestEmail&&bestEmail.revenue>0)recommendations.push({priority:"P1",area:"CRM",title:`Replicar aprendizagem de “${bestEmail.campaign}”`,rationale:`Campanha com ${bestEmail.revenue.toFixed(0)} € de receita paga Shopify e ${bestEmail.orders.toFixed(0)} encomendas por última visita, sem duplicação.`,action:"Usar o Klaviyo para analisar tema, segmentação, horário, open rate e click rate desta campanha; manter Shopify como fonte financeira para validar vendas.",estimatedImpact:"Escalar receita real atribuída a email sem inflacionar resultados por sobreposição de canais."});
  if(ga4.checkouts>0&&ga4.purchases/ga4.checkouts<0.25)recommendations.push({priority:"P0",area:"Checkout",title:"Priorizar recuperação e fricção no checkout",rationale:`Apenas ${(ga4.purchases/ga4.checkouts*100).toFixed(1)}% dos checkouts GA4 terminaram em compra. Klaviyo registou ${abandonment.klaviyoCheckoutStarted.toFixed(0)} inícios de checkout e ${abandonment.klaviyoPlacedOrders.toFixed(0)} Placed Order no mesmo período.`,action:"Cruzar diariamente Shopify abandoned checkouts + Klaviyo Checkout Started + GA4 begin_checkout; investigar divergências antes de atribuir perda a UX ou media.",estimatedImpact:"Recuperação de receita já gerada pelo tráfego existente e melhoria da medição."});
  const seoBase=searchRows.reduce<SeoSnapshot>((a,r)=>({clicks:a.clicks+n(r.clicks),impressions:a.impressions+n(r.impressions),positionWeighted:a.positionWeighted+n(r.position)*n(r.impressions)}),{clicks:0,impressions:0,positionWeighted:0});const seo={clicks:seoBase.clicks,impressions:seoBase.impressions,ctr:seoBase.impressions?seoBase.clicks/seoBase.impressions:0,position:seoBase.impressions?seoBase.positionWeighted/seoBase.impressions:0};
  const ptShopping=merchantRows.filter(r=>String(r.product_status_country||"").toUpperCase()==="PT"&&String(r.product_status_reporting_context||"").toUpperCase()==="SHOPPING_ADS");const merchant=ptShopping.reduce<MerchantSnapshot>((a,r)=>({active:a.active+n(r.product_status_active_count),disapproved:a.disapproved+n(r.product_status_disapproved_count),pending:a.pending+Math.max(0,n(r.product_status_pending_count)),context:"PT · Shopping Ads"}),{active:0,disapproved:0,pending:0,context:"PT · Shopping Ads"});
  return{range,ga4,klaviyoCampaigns,klaviyoFlows,shopifyEmailCampaigns,shopifyEmailSummary,districtRows,dataQuality,recommendations,abandonment,seo,merchant};
}

export function compareMetric(current:number,previous:number):MetricDelta{return{current,previous,deltaPct:pct(current,previous)};}
