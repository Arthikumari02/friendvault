# FriendVault

FriendVault is a private digital archive for friend groups. It preserves trips, birthdays, inside jokes, comments, reactions, and timelines in one place.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Authentication Setup

The login options use Firebase Authentication. They need a Firebase project and the matching providers enabled before sign-in can succeed.

To enable the Google account picker:

1. Create a Firebase project.
2. In Firebase Authentication, enable the providers you want to offer: Google, Phone, Apple, and Email/Password plus Email link.
3. In Firebase Authentication settings, add the app's domain to authorized domains. Add `localhost` for local development if Firebase has not already added it.
4. Create a Firebase Web App and copy its config values.
5. Copy `.env.local.example` to `.env.local` in the project root and fill in every value.
6. Restart `npm run dev`.

Google and Apple use OAuth popups. Apple also requires its provider credentials and return URL to be configured in the Apple developer console. Phone sign-in uses Firebase reCAPTCHA and SMS; provide the number in international format. Email link sign-in sends a link that returns to `/login`. To test without sending real SMS, configure a Firebase test phone number.

## Group storage

Enable the Cloud Firestore API and create a Cloud Firestore database in the same Firebase project. In **Firestore Database → Rules**, publish the owner-only rules in `firestore.rules`. New groups are stored in the `groups` collection with the signed-in user's Firebase UID as `createdBy`; the dashboard queries that user's groups. If Firestore is unavailable or the rules deny access, the form shows an error and keeps the entered values. The separate `/demo` page uses sample data and does not require Firestore.

## Verification

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Frontend structure

FriendVault is a single Next.js app. Files in `src/app` define routes and API handlers; page files render feature controllers or views. Feature code lives in `src/features/<feature>`:

- `controllers/` connects routes, authentication, data loading, and navigation.
- `components/` renders feature UI from props or local presentation state.
- `hooks/` owns reusable stateful behavior, such as authenticated photo loading.
- `apis/` contains Firebase and photo service adapters.
- `utils/` contains feature validation and pure transformations.
- `contexts/` and `runtime/` hold feature context and transient runtime state where needed.

Shared UI primitives remain in `src/components`, cross-feature types in `src/types`, Firebase setup in `src/firebase`, and server-only photo authorization in `src/server`. The CrimeOS guide's Nx, React Router, Apollo, and MobX commands do not apply to this Next.js workspace.
# friendvault
# friendvault
# friendvault
# friendvault
