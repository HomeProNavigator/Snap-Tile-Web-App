import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Tier } from "./tiles";

type SnapBilling = {
  purchase(options: { id: string }): Promise<{ tier: Tier }>;
  restore(): Promise<{ tier: Tier }>;
  current(): Promise<{ tier: Tier }>;
};

const SnapBilling = registerPlugin<SnapBilling>("SnapBilling");

const IDS: Record<Exclude<Tier, "free">, string> = {
  builder: "com.snaptile.builder",
  master: "com.snaptile.master",
  yearly: "com.snaptile.yearly",
};

/** True only inside the iPhone app. The Windows and Mac dev server stays false. */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.getPlatform() === "ios";
}

export async function purchaseNative(tier: Exclude<Tier, "free">): Promise<Tier> {
  if (!isNativeApp()) return tier;
  const result = await SnapBilling.purchase({ id: IDS[tier] });
  if (!result?.tier || result.tier === "free") throw new Error("Purchase did not unlock a plan");
  return result.tier;
}

export async function restoreNative(): Promise<Tier | null> {
  if (!isNativeApp()) return null;
  const result = await SnapBilling.restore();
  return result?.tier ?? null;
}

export async function currentNative(): Promise<Tier | null> {
  if (!isNativeApp()) return null;
  try {
    const result = await SnapBilling.current();
    return result?.tier ?? null;
  } catch {
    return null;
  }
}
