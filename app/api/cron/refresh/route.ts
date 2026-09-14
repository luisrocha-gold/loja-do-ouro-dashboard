import { getSnapshot } from "@/lib/dashboard";
import { getExecutivePulse, getIntelligence } from "@/lib/business-intelligence";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function yesterdayRange() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const day = d.toISOString().slice(0, 10);
  return { from: day, to: day };
}

function lastCompleteDays(days: number) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const startedAt = new Date().toISOString();
  const [yesterday, week, pulse] = await Promise.allSettled([
    Promise.all([getSnapshot(yesterdayRange()), getIntelligence(yesterdayRange())]),
    Promise.all([getSnapshot(lastCompleteDays(7)), getIntelligence(lastCompleteDays(7))]),
    getExecutivePulse(),
  ]);

  const failures = [
    yesterday.status === "rejected" ? `yesterday: ${String(yesterday.reason)}` : null,
    week.status === "rejected" ? `week: ${String(week.reason)}` : null,
    pulse.status === "rejected" ? `pulse: ${String(pulse.reason)}` : null,
  ].filter(Boolean);

  const quality = week.status === "fulfilled" ? week.value[1].dataQuality.map((x) => ({ id: x.id, status: x.status, variancePct: x.variancePct ?? null })) : [];
  const summary = {
    ok: failures.length === 0,
    startedAt,
    completedAt: new Date().toISOString(),
    windows: {
      yesterday: yesterday.status === "fulfilled" ? { revenue: yesterday.value[0].revenue, orders: yesterday.value[0].orders, spend: yesterday.value[0].totalSpend } : null,
      last7d: week.status === "fulfilled" ? { revenue: week.value[0].revenue, orders: week.value[0].orders, spend: week.value[0].totalSpend } : null,
    },
    quality,
    failures,
  };

  console.log("[nightly-refresh]", JSON.stringify(summary));
  return Response.json(summary, { status: failures.length ? 207 : 200, headers: { "Cache-Control": "no-store" } });
}
