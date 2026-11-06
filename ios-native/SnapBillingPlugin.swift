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

    public override func load() {
        bridge?.webView?.customUserAgent = "SnapTile-iOS"
        let js = """
        window.SnapTileBilling = {
          purchase: (id) => window.Capacitor.Plugins.SnapBilling.purchase({ id: id }),
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
                call.resolve(["tier": try await Self.bestTier().rawValue])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func current(_ call: CAPPluginCall) {
        Task {
            do {
                call.resolve(["tier": try await Self.bestTier().rawValue])
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
