# Android artifact

`rook-field-arm64-debug.apk` is an installable Android debug build for modern arm64 phones.

- SHA-256: `C164DC32D15BE9BC5F258E84DBACDD5863C3C91E8C0CDAAEB64D704A0BCCD7DD`
- Package: `ca.rookcompliance.field`
- Size: approximately 47.4 MiB

Because it is a debug build, start Metro with `npm run dev:mobile` while demonstrating it. The JavaScript production bundle and native arm64 debug build were both verified independently.

For a shareable standalone APK, run `eas build --platform android --profile preview`. The included `eas.json` requests an internal APK. Set `EXPO_PUBLIC_API_URL` to the HTTPS VPS endpoint before that build.
