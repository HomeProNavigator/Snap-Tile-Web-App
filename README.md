# Buildlings

Magnetic-tile builder for kids. The website and the iPhone app are the same game.

## Website

```bash
npm install
npm run dev
```

Open http://localhost:8080

The family test site on Netlify unlocks every puzzle and a 150-tile free build. That switch is `VITE_TEST_UNLOCK` in `netlify.toml`. The iPhone build does not set it, so the plan limits stay on.

## iPhone and TestFlight, Mac only

```bash
npm install
npm run ios:setup
npm run ios:open
```

In Xcode choose Product, then Archive, then upload to App Store Connect. Leave `CAP_SERVER_URL` unset for that archive. TestFlight installs the uploaded build. It does not run the dev server.

Apple purchases use these product ids:

- `com.snaptile.builder`
- `com.snaptile.master`
- `com.snaptile.yearly`

Create them in App Store Connect before a purchase can succeed. The rest of the game runs without them.
