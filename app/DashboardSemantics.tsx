"use client";

import { useEffect } from "react";

export default function DashboardSemantics() {
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll<HTMLElement>(".kpi").forEach((card) => {
        const label = card.querySelector<HTMLElement>(":scope > span");
        const note = card.querySelector<HTMLElement>(":scope > p");
        if (label?.textContent?.trim() === "ROAS blended") {
          label.textContent = "Eficiência global · MER";
          if (note) note.textContent = "Receita total Shopify ÷ investimento Meta + Google · não é ROAS atribuído";
        }
      });

      document.querySelectorAll<HTMLElement>(".pulse-metrics span").forEach((item) => {
        const text = item.textContent || "";
        if (/ROAS/i.test(text)) {
          const bold = item.querySelector("b")?.outerHTML || "";
          item.innerHTML = `${bold} MER`;
        }
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
