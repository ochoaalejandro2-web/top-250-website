export type Carrier = "USPS" | "UPS";

export function zoneFromZip(zip: string) {
  const n = parseInt(String(zip).replace(/\D/g, "").slice(0, 3), 10);
  if (!n) return 4;
  if (n >= 850 && n <= 865) return 1;
  if (n >= 800 && n <= 899) return 2;
  if (n >= 900 && n <= 999) return 2;
  if (n >= 700 && n <= 799) return 3;
  if (n >= 600 && n <= 699) return 4;
  if (n >= 400 && n <= 599) return 5;
  if (n >= 200 && n <= 399) return 6;
  return 7;
}

export function estimateShippingCents(zip: string, weightLb: number) {
  const zone = zoneFromZip(zip);
  const w = Math.max(weightLb || 0.5, 0.2);
  const usps = Math.round((6.25 + w * 1.35 + zone * 1.15) * 100);
  const ups = Math.round((8.4 + w * 1.7 + zone * 1.55) * 100);
  return { USPS: usps, UPS: ups };
}
