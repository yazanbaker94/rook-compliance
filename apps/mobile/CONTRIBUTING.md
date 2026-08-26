# Mobile contribution notes

Rook Field targets Expo SDK 57. Mobile changes should be checked against the [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) and validated with:

```powershell
npm run typecheck
npx expo-doctor
```

The application is offline-first. Assignment and submission changes must preserve SQLite persistence, stable local submission identifiers, retry-safe synchronization, and useful behavior when the office API is unavailable.
