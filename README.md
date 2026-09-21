# Pisconauta — mobile app (iOS + Android)

The iOS and Android apps for PISCONAUTA (Expo). They are clients of the REST API in [nijemeis/pisconauta-web](https://github.com/nijemeis/pisconauta-web); `src/api/types.ts` is a copy of that repo's `src/lib/types.ts` — change both together. The UI follows the design handoff kept in the web repo under `design/`.


Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript · expo-router (tabs) · zustand.
The app talks to the Next.js backend in `../web` (default `http://localhost:3100`). No mock data.

## Run

```bash
cd app
npm install

# 1. start the backend first (see ../web), it must answer on :3100
# 2. point the app at it (optional — this is the default)
export EXPO_PUBLIC_API_URL=http://localhost:3100

npx expo run:ios        # iOS simulator (dev build; expo-camera/secure-store are native modules)
npx expo run:android    # Android emulator
```

`EXPO_PUBLIC_API_URL` is inlined at bundle time — restart Metro after changing it.

| Target | Value |
| --- | --- |
| iOS simulator | `http://localhost:3100` |
| **Android emulator** | **`http://10.0.2.2:3100`** (the emulator's alias for the host machine) |
| Physical device | `http://<your-LAN-ip>:3100` |

Plain-HTTP localhost is allowed on iOS via `NSAllowsLocalNetworking`. Android release builds block
cleartext traffic: use an HTTPS API URL for anything other than local development.

On this machine CocoaPods needs a UTF-8 locale: `export LANG=en_US.UTF-8` before `expo run:ios`.

Demo logins (password `pisco-demo-2026`): `catador@pisconauta.pe` (aficionado with a cellar),
`bodega@pisconauta.pe` (producer, owns the verified "Bodega Cerro Lúcumo").

### Checks

```bash
npm run typecheck                 # tsc --noEmit
npx expo export --platform ios    # proves every import/route bundles
```

`npm run web` also works for a quick layout check, but the API sends no CORS headers, so the browser
needs a CORS-enabling proxy in front of :3100. Camera, secure token storage and uploads are native-only.

## Build with EAS (later)

```bash
npm i -g eas-cli && eas login
eas build:configure                       # writes eas.json
# set the production API per profile in eas.json:  "env": { "EXPO_PUBLIC_API_URL": "https://api.pisconauta.pe" }
eas build --platform ios --profile preview
eas build --platform android --profile preview
eas submit --platform ios                 # / android
```

Bundle id / Android package: `pe.pisconauta.app`. Scheme: `pisconauta://` (e.g. `pisconauta://pisco/<slug>`).
Before a store build replace the template icons in `assets/` and the splash photo (`assets/splash-bg.jpg`
is the client's placeholder vineyard crop).

## Layout

```
src/
  app/                      expo-router routes
    _layout.tsx             fonts, prefs + session bootstrap, age gate, splash, root Stack
    onboarding.tsx          01 role cards → email signup / login (Apple/Google → "Próximamente")
    (tabs)/_layout.tsx      custom tab bar (BODEGA only for role=producer)
    (tabs)/index.tsx        02 Discover
    (tabs)/search.tsx       03 Search: 250 ms debounce, filter sheet + live facets, chips, sort, cursor paging
    (tabs)/scan.tsx         04 Scan: camera, bracket frame, scan line, result / no-match sheets
    (tabs)/cellar.tsx       07 Mi Cava
    (tabs)/bodega.tsx       producer: bodega claim form or dashboard
    pisco/[ref].tsx         1a/1b Ficha (+ rate sheet, reviews)
    producer/[slug].tsx     05 Bodega profile
    bottle/[id].tsx         06 "Nueva botella" 3-step wizard (id = "new" or a pisco id)
  api/types.ts              verbatim copy of web/src/lib/types.ts — change both together
  api/client.ts             fetch client, bearer token, XHR multipart with upload progress, mediaUrl()
  state/                    zustand: session (token, me, optimistic cellar sets), prefs (theme/locale/currency/age + cached /api/rates), ui (toast…)
  theme/                    tokens (Casa de Oro / Valle Claro), useTheme(), ThemeScope, font map
  i18n/                     es (default) + en dictionaries, useT()
  components/motifs/        Chakana, SteppedBand, TextileBand, CornerBrackets, Stripes (react-native-svg)
  components/ui/            Text (Display/Body/Mono), buttons, Chip, PhotoBox, SectionHeader, RatingText,
                            Toast, Sheet, Field/Select/Segmented, Slider, tabs, empty/error states, rows
  components/               AgeGate, Splash, ProfileSheet, RateSheet, SuggestSheet, Avatar, Crest
  features/bottle/form.ts   wizard form model ↔ PiscoInput mapping
  lib/                      number/date formatting (decimal comma in es), useFetch, useRequireAuth
```

## Behaviour notes

- **Theme**: dark by default; first run follows the system scheme; stored locally and synced with
  `PATCH /api/me` when signed in (the account's theme/locale win on sign-in). The scanner and splash are always dark.
- **Guests** can browse everything; rating, ♡ and Mi Cava route to onboarding.
- **Scan**: `/api/scan` is limited to 10 requests/min, so streaming sends 3 frames 2 s apart and then one
  every 7 s; the shutter (or GALERÍA) sends immediately.
- **Wizard autosave**: first save `POST /api/piscos`, then `PATCH`, debounced 5 s and serialised.
  `photos` is only sent when a slot changed in this session (the detail payload does not expose `phash`,
  and the API replaces the photo set wholesale).
