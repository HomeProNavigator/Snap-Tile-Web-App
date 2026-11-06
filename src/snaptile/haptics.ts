export function haptic(kind: "light" | "strong") {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: kind === "strong" ? ImpactStyle.Heavy : ImpactStyle.Light });
    } catch {
      /* the website has no vibration motor */
    }
  })();
}