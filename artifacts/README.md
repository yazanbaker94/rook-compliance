# Android artifact

The [v0.1.0 GitHub release](https://github.com/yazanbaker94/rook-compliance/releases/tag/v0.1.0) contains standalone Android builds that embed the production JavaScript bundle and use `https://swoop.video/corvus` as their API. Metro and Expo Go are not required.

Choose the universal APK for the easiest installation across devices. The smaller arm64 APK is suitable for most modern physical Android phones.

| Artifact | Architecture | Size | SHA-256 |
| --- | --- | ---: | --- |
| `rook-field-v0.1.0-universal.apk` | arm64-v8a, armeabi-v7a, x86, x86_64 | 73.3 MiB | `8F7CD607246B2612A367CD8AF96E8B847CB04EB7999EDC0873829FBAE8CA61B2` |
| `rook-field-v0.1.0-arm64.apk` | arm64-v8a | 27.7 MiB | `9221160F23735175730A01376CCC0941FC8304B84B4C635D85130FDDA9BB3D8C` |

- Package: `ca.rookcompliance.field`
- Version: `1.0.0` (`versionCode` 1)
- Minimum Android: API 24 (Android 7.0)

The APK signature was verified with Android Build Tools. The packaged manifest requests camera and location access for field evidence and contains no microphone permission.

The checked-in `eas.json` also provides an internal APK profile for managed Expo builds.
