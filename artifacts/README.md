# Android artifact

`rook-field-v0.1.0-arm64.apk` is a standalone Android release build for modern arm64 phones. It embeds the production JavaScript bundle and uses `https://swoop.video/corvus` as its API, so Metro and Expo Go are not required.

- Download: [GitHub release v0.1.0](https://github.com/yazanbaker94/rook-compliance/releases/tag/v0.1.0)
- SHA-256: `9221160F23735175730A01376CCC0941FC8304B84B4C635D85130FDDA9BB3D8C`
- Package: `ca.rookcompliance.field`
- Version: `1.0.0` (`versionCode` 1)
- Architecture: `arm64-v8a`
- Size: 27.7 MiB
- Minimum Android: API 24 (Android 7.0)

The APK signature was verified with Android Build Tools. The packaged manifest requests camera and location access for field evidence and contains no microphone permission.

The checked-in `eas.json` also provides an internal APK profile for managed Expo builds.
