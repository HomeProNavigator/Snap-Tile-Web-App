import type { CapacitorConfig } from "@capacitor/cli";

// Leave CAP_SERVER_URL unset for TestFlight. Set it only on a Mac when you
// want the phone to load the Vite dev server on your computer, for example
// CAP_SERVER_URL=http://192.168.1.20:8080
const live = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.snaptile.play",
  appName: "Buildlings",
  webDir: "dist-ios",
  backgroundColor: "#f4efe6",
  ios: {
    contentInset: "never",
    backgroundColor: "#f4efe6",
    allowsLinkPreview: false,
  },
  server: live
    ? { url: live, cleartext: true }
    : { iosScheme: "capacitor", androidScheme: "https" },
};

export default config;
