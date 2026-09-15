"use client";

import { useEffect } from "react";

function parseEuro(value: string) {
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function applySharedEuroScale() {
  const days = Array.from(document.querySelectorAll<HTMLElement>(".chart .day"));
  if (!days.length) return;

  const values = days.map((day) => {
    const title = day.getAttribute("title") || "";
    const [revenuePart = "", adsPart = ""] = title.split(" receita · ");
    return {
      day,
      revenue: parseEuro(revenuePart),
      ads: parseEuro(adsPart.replace(/\s*Ads\s*$/i, "")),
    };
  });

  const max = Math.max(1, ...values.flatMap((item) => [item.revenue, item.ads]));

  values.forEach(({ day, revenue, ads }) => {
    const bars = day.querySelector<HTMLElement>(":scope > div");
    const revenueBar = bars?.querySelector<HTMLElement>("i");
    const adsBar = bars?.querySelector<HTMLElement>("b");
    if (revenueBar) revenueBar.style.height = `${(revenue / max) * 100}%`;
    if (adsBar) adsBar.style.height = `${(ads / max) * 100}%`;
    day.dataset.sharedScale = "eur";
  });
}

export default function TruthfulTrendScale() {
  useEffect(() => {
    applySharedEuroScale();

    const chart = document.querySelector(".chart");
    if (!chart) return;

    const observer = new MutationObserver(() => applySharedEuroScale());
    observer.observe(chart, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
