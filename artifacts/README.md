# Android artifact

The [v0.1.0 GitHub release](https://github.com/yazanbaker94/rook-compliance/releases/tag/v0.1.0) contains standalone Android builds that embed the production JavaScript bundle and use `https://swoop.video/corvus` as their API. Metro and Expo Go are not required.

Choose the universal APK for the easiest installation across devices. The smaller arm64 APK is suitable for most modern physical Android phones.

| Artifact | Architecture | Size | SHA-256 |
| --- | --- | ---: | --- |
| `rook-field-v0.1.0-universal.apk` | arm64-v8a, armeabi-v7a, x86, x86_64 | 78.3 MiB | `EE9F6CA2F7D0B6F5CFB3C6227245D852C9F1B0A398C87DC52B759621DFC2CBE3` |
| `rook-field-v0.1.0-arm64.apk` | arm64-v8a | 32.1 MiB | `433ABDDFD154DCF74EB1B71B57FC8704F34A15A697FEAD697128BFEE21664A44` |

- Package: `ca.rookcompliance.field`
- Version: `1.0.0` (`versionCode` 1)
- Minimum Android: API 24 (Android 7.0)

The APK signature was verified with Android Build Tools. The packaged manifest requests camera and location access for field evidence and contains no microphone permission.

The checked-in `eas.json` also provides an internal APK profile for managed Expo builds.
