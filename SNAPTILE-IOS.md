# SnapTile iOS

This is the complete iOS version of the web game. It is the same app, not a rewrite.

The screens, 3D tiles, puzzles, colors, parent gate, badges, and saves stay in the React code that already runs in the browser. Capacitor puts that exact build inside an iPhone app. The only new code is the native shell and Apple payments. A Swift rebuild of the builder would drift away from the web version, so this plan does not do that.

This file is the source you take to a Mac. An iPhone app cannot be compiled on the machine that built the website. You need Xcode, and an Apple Developer account ($99 a year) before TestFlight or the App Store.

## What the iPhone app must match

| Web behavior | iOS behavior |
|---|---|
| Onboarding, Home, Free Build, Puzzles, Play, Celebration, Badges, Account, Plans | Same screens, same order |
| Squares and triangles, flat / wall / roof, one tap places one tile | Same 3D canvas |
| 100 puzzles, easy through expert, guide spots fade on harder puzzles | Same puzzle list |
| Free: 10 tiles, puzzles 1–10 | Same caps |
| Builder $7.99: 50 tiles, puzzles 1–50 | Same caps, charged by Apple |
| Master Builder $10.99: 80 tiles, all 100 puzzles | Same caps, charged by Apple |
| Unlimited Yearly $49.99: same as Master for a year | Auto-renewing subscription |
| Parent math gate before Account and Plans | Same gate, still in the web UI |
| Saves in `snaptile-v1` on the device | Same key, kept in the app sandbox |
| No ads, no chat, no account server | Still none. Do not add any |

The line on the Plans screen that says "Not a real charge" is removed in the iOS build. On the phone, the buttons buy through StoreKit.

## Product ids

Create these in App Store Connect and in the StoreKit file below. The ids must match character for character.

| Plan | Product id | Type | Price |
|---|---|---|---|
| Builder | `com.snaptile.builder` | Non-consumable | $7.99 |
| Master Builder | `com.snaptile.master` | Non-consumable | $10.99 |
| Unlimited Yearly | `com.snaptile.yearly` | Auto-renewable, 1 year | $49.99 |

Free is not a product. If both a lifetime plan and the yearly plan are owned, the app keeps the higher one. Yearly and Master both unlock 80 tiles and all 100 puzzles. When the year ends and nothing else was bought, the app returns to Free.

Bundle id used below: `com.snaptile.play`. Change it in every file if you register a different one.

---

## 1. Install the shell

From the web project, on a Mac:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/status-bar @capacitor/haptics @capacitor/preferences
npx cap add ios
```

`package.json` scripts to add:

```json
{
  "scripts": {
    "build:ios": "vite build --base ./ && npx cap sync ios",
    "open:ios": "npx cap open ios"
  }
}
```

The site today is a TanStack Start server app. The iPhone build must be a static client of the same screens. Point the iOS build at the existing route that renders `SnapApp` (`src/routes/index.tsx`) and do not ship the Postgres, Better Auth, or admin pages. If `vite build` still emits a server, add a small static entry that only mounts `SnapApp` and build that entry with `base: './'`. Capacitor loads files from disk, so asset URLs have to be relative.

---

## 2. `capacitor.config.ts`

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.snaptile.play",
  appName: "SnapTile",
  webDir: "dist",
  backgroundColor: "#e7e4fb",
  ios: {
    contentInset: "never",
    backgroundColor: "#e7e4fb",
    allowsLinkPreview: false,
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#e7e4fb",
    },
  },
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
  },
};

export default config;
```

`scrollEnabled: false` stops the page from bouncing under the 3D camera. The lavender matches `--color-bg` in `src/styles.css`.

---

## 3. `src/snaptile/native.ts`

This is the only new game file. On the website every function no-ops and the current "this device only" plans keep working. Inside the iPhone app, the same buttons call StoreKit.

```ts
import type { Tier } from "./tiles";

export type NativePlan = {
  tier: Exclude<Tier, "free">;
  owned: boolean;
  expiration?: number | null;
};

type BillingBridge = {
  purchase: (productId: string) => Promise<{ tier: Tier }>;
  restore: () => Promise<{ tier: Tier }>;
  current: () => Promise<{ tier: Tier }>;
};

const IDS: Record<Exclude<Tier, "free">, string> = {
  builder: "com.snaptile.builder",
  master: "com.snaptile.master",
  yearly: "com.snaptile.yearly",
};

function bridge(): BillingBridge | null {
  const native = (globalThis as { SnapTileBilling?: BillingBridge }).SnapTileBilling;
  return native ?? null;
}

export function isNativeApp(): boolean {
  return bridge() !== null || /SnapTile-iOS/.test(navigator.userAgent);
}

export function productId(tier: Exclude<Tier, "free">): string {
  return IDS[tier];
}

export async function purchaseNative(tier: Exclude<Tier, "free">): Promise<Tier> {
  const native = bridge();
  if (!native) return tier;
  const result = await native.purchase(IDS[tier]);
  return result.tier;
}

export async function restoreNative(): Promise<Tier | null> {
  const native = bridge();
  if (!native) return null;
  const result = await native.restore();
  return result.tier;
}

export async function currentNative(): Promise<Tier | null> {
  const native = bridge();
  if (!native) return null;
  const result = await native.current();
  return result.tier;
}
```

### Store change

In `choosePlan`, when `isNativeApp()` is true, call `purchaseNative(tier)` first and only then save the returned tier. Never call `choosePlan("builder" | "master" | "yearly")` from a tap on iOS without a successful StoreKit result.

```ts
choosePlan: async (tier) => {
  let next = tier;
  if (tier !== "free" && isNativeApp()) {
    try {
      next = await purchaseNative(tier);
    } catch {
      set({ notice: "The App Store did not finish that purchase." });
      return;
    }
  }
  set({
    tier: next,
    purchased: next,
    view: "account",
    notice: `${tierName(next)} is on for this device.`,
  });
  persist({ ...pick(get()), tier: next, purchased: next });
  playTone("win");
},
```

`restorePlan` on iOS:

```ts
restorePlan: async () => {
  if (isNativeApp()) {
    const restored = await restoreNative();
    if (!restored || restored === "free") {
      set({ notice: "No SnapTile purchase was found on this Apple ID." });
      return;
    }
    set({ tier: restored, purchased: restored, notice: "Plan restored on this device." });
    persist({ ...pick(get()), tier: restored, purchased: restored });
    return;
  }
  // existing website restore stays here
},
```

On launch, after `hydrate()`, if `isNativeApp()` then call `currentNative()` and write that tier into the store. Apple is the source of truth on the phone. The website keeps using local storage only.

### Plans screen

Delete the subtitle `This device only. Not a real charge.` from `Paywall` when `isNativeApp()` is true. Replace it with `Ask a grown-up. Apple handles the payment.`

The parent gate already wraps the Plans button (`openGuarded("paywall")`). Do not add a second gate, and do not let a purchase start from anywhere else.

---

## 4. `ios/App/App/SnapBillingPlugin.swift`

Add this file to the App target in Xcode. It talks to StoreKit 2 and posts the result to the page as `window.SnapTileBilling`.

```swift
import Capacitor
import StoreKit

enum SnapTier: String {
    case free, builder, master, yearly
}

@objc(SnapBillingPlugin)
public class SnapBillingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SnapBillingPlugin"
    public let jsName = "SnapBilling"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "current", returnType: CAPPluginReturnPromise),
    ]

    private let ids = [
        "com.snaptile.builder",
        "com.snaptile.master",
        "com.snaptile.yearly",
    ]

    public override func load() {
        let js = """
        window.SnapTileBilling = {
          purchase: (id) => window.Capacitor.Plugins.SnapBilling.purchase({ id }),
          restore: () => window.Capacitor.Plugins.SnapBilling.restore(),
          current: () => window.Capacitor.Plugins.SnapBilling.current()
        };
        """
        bridge?.eval(js: js)
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Missing product")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: [id])
                guard let product = products.first else {
                    call.reject("Unknown product")
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    let transaction = try Self.check(verification)
                    let tier = try await Self.bestTier()
                    await transaction.finish()
                    call.resolve(["tier": tier.rawValue])
                case .userCancelled:
                    call.reject("cancelled")
                default:
                    call.reject("Purchase pending")
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                let tier = try await Self.bestTier()
                call.resolve(["tier": tier.rawValue])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func current(_ call: CAPPluginCall) {
        Task {
            do {
                let tier = try await Self.bestTier()
                call.resolve(["tier": tier.rawValue])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    private static func check<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value):
            return value
        case .unverified:
            throw NSError(domain: "SnapTile", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Purchase could not be verified",
            ])
        }
    }

    static func bestTier() async throws -> SnapTier {
        var owned: Set<String> = []
        for await result in Transaction.currentEntitlements {
            let transaction = try check(result)
            if transaction.revocationDate == nil {
                owned.insert(transaction.productID)
            }
        }
        if owned.contains("com.snaptile.yearly") { return .yearly }
        if owned.contains("com.snaptile.master") { return .master }
        if owned.contains("com.snaptile.builder") { return .builder }
        return .free
    }
}
```

Register the plugin. In `ios/App/App/AppDelegate.swift`, Capacitor 6+ picks up `@objc` plugins in the app target automatically when they are compiled into the app. Confirm `SnapBillingPlugin.swift` has Target Membership: App.

---

## 5. Stop the page from scrolling

In `ios/App/App/AppDelegate.swift`, after Capacitor loads the web view:

```swift
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        DispatchQueue.main.async {
            if let webView = (self.window?.rootViewController as? CAPBridgeViewController)?.webView {
                webView.scrollView.isScrollEnabled = false
                webView.scrollView.bounces = false
                webView.allowsLinkPreview = false
                webView.isOpaque = false
                webView.backgroundColor = UIColor(red: 0.906, green: 0.894, blue: 0.984, alpha: 1)
            }
        }
        return true
    }
}
```

Add this to the page CSS so the game fills the phone and does not rubber-band:

```css
html, body, #root {
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  background: #e7e4fb;
}
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

The header buttons must stay below the notch. The bottom tile tray must stay above the home indicator. The existing phone layout already does this in the browser preview. Do not restyle the game for iOS.

---

## 6. `ios/App/App/Info.plist`

Set these keys. Leave out camera, microphone, location, contacts, tracking, and photo library. The game uses none of them.

```xml
<key>CFBundleDisplayName</key>
<string>SnapTile</string>
<key>CFBundleIdentifier</key>
<string>com.snaptile.play</string>
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>
<key>LSRequiresIPhoneOS</key>
<true/>
<key>UIRequiresFullScreen</key>
<true/>
<key>UIStatusBarHidden</key>
<false/>
<key>UIStatusBarStyle</key>
<string>UIStatusBarStyleDarkContent</string>
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
</array>
<key>UILaunchStoryboardName</key>
<string>LaunchScreen</string>
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
<key>NSUserTrackingUsageDescription</key>
<string></string>
```

Do not include `NSUserTrackingUsageDescription` if the string is empty. Omit the key entirely. Do not call App Tracking Transparency. Do not link AdSupport or Analytics.

Portrait only. The web layout was built for a tall phone.

Launch screen background: `#e7e4fb`. No logo animation.

---

## 7. `ios/App/App/PrivacyInfo.xcprivacy`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
```

`CA92.1` is the reason code for storing the child's progress on the device. No data leaves the phone. The first name is stored only in `snaptile-v1`.

---

## 8. `ios/App/SnapTile.storekit`

Use this in Xcode (Editor, StoreKit, Create Configuration File, then replace the contents) so purchases work in the simulator before App Store Connect is finished.

```json
{
  "identifier": "SnapTile",
  "nonRenewingSubscriptions": [],
  "products": [
    {
      "displayPrice": "7.99",
      "familyShareable": false,
      "internalID": "1",
      "localizations": [
        {
          "description": "50 tiles and 50 puzzles.",
          "displayName": "Builder",
          "locale": "en_US"
        }
      ],
      "productID": "com.snaptile.builder",
      "referenceName": "Builder",
      "type": "NonConsumable"
    },
    {
      "displayPrice": "10.99",
      "familyShareable": false,
      "internalID": "2",
      "localizations": [
        {
          "description": "Big castles and all 100 puzzles.",
          "displayName": "Master Builder",
          "locale": "en_US"
        }
      ],
      "productID": "com.snaptile.master",
      "referenceName": "Master Builder",
      "type": "NonConsumable"
    }
  ],
  "settings": {
    "_failTransactionsEnabled": false,
    "_storeKitErrors": []
  },
  "subscriptionGroups": [
    {
      "id": "3",
      "localizations": [],
      "name": "SnapTile Unlimited",
      "subscriptions": [
        {
          "adHocOffers": [],
          "codeOffers": [],
          "displayPrice": "49.99",
          "familyShareable": false,
          "groupNumber": 1,
          "internalID": "4",
          "introductoryOffer": null,
          "localizations": [
            {
              "description": "The same big set for a year on this device.",
              "displayName": "Unlimited Yearly",
              "locale": "en_US"
            }
          ],
          "productID": "com.snaptile.yearly",
          "recurringSubscriptionPeriod": "P1Y",
          "referenceName": "Unlimited Yearly",
          "subscriptionGroupID": "3",
          "type": "RecurringSubscription"
        }
      ]
    }
  ],
  "version": { "major": 3, "minor": 0 }
}
```

Scheme, Run, Options, StoreKit Configuration: select `SnapTile.storekit`.

---

## 9. Build on a Mac

```bash
npm run build:ios
npx cap open ios
```

In Xcode:

1. Set the signing team and bundle id `com.snaptile.play`.
2. Set the deployment target to iOS 16 so StoreKit 2 is available.
3. Add a 1024×1024 app icon. No transparency, no rounded corners. Xcode generates the other sizes.
4. Run on an iPhone, not only the simulator. The 3D camera and the tile tray need a real thumb.

Each time the web game changes:

```bash
npm run build:ios
```

Then run again from Xcode. `cap sync` copies `dist` into the app. Do not edit files under `ios/App/App/public`. The next sync overwrites them.

---

## 10. App Store Connect

Create the app as **SnapTile**, primary category **Games**, secondary **Education**. Then turn on **Made for Kids** and set the age band to **5 and under** or **6–8**, matching ages 4–10. Kids Category is not optional for this game.

Answer the questionnaire like this:

- Age rating 4+. No violence, no contests, no unrestricted web.
- Contains no ads.
- Uses no third-party analytics and no tracking.
- Data collection: Data Not Collected.
- Privacy policy URL: a page that says the first name and the builds stay on the device, and that Apple processes payments.
- In-app purchases: the three products above. Paid apps and outside card forms are not allowed for these unlocks.
- Review notes: "Parent gate is a multiplication question before Plans and Account. There is no account login. Purchases use StoreKit. The game is playable offline after install."
- Sign-in information: leave blank. There is no login.
- Export compliance: the app does not use non-exempt encryption. `ITSAppUsesNonExemptEncryption` is false.

Screenshots: iPhone 6.7-inch and 6.1-inch, portrait. Use Home, a puzzle in progress with the reference model, and Free Build. Do not show the parent gate answer.

A rejected kids build is usually one of these: a link that leaves the app, a purchase that skips the parent gate, the words "not a real charge", or an analytics script that shipped inside `dist`.

---

## 11. Check the replica before you submit

On a phone, next to the website:

- Onboarding asks for a first name and lands on Home.
- Free Build places one tile per tap, in the orientation that was picked, up to 10 tiles.
- The camera button hides the ghost tiles. Undo removes the last tile.
- Puzzle 1 shows every spot. A late expert puzzle shows about one spot in ten.
- The small model in the corner matches the puzzle name.
- Finishing a puzzle plays the win sound and offers the next puzzle.
- Plans are behind the multiplication question.
- Buying Builder in the sandbox unlocks puzzles 11–50 and 50 tiles, and Restore brings it back after reinstall.
- Airplane mode still opens a saved build.
- Nothing in the app opens Safari.

When those match, the iOS app is the web game. The native code in this file is the whole difference.
