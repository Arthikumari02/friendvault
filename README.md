# FriendVault

FriendVault is a private digital archive for friend groups. It preserves trips, birthdays, inside jokes, comments, reactions, and timelines in one place.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Google Sign-In Setup

The `Continue with Google` button uses Firebase Authentication. It cannot directly read Chrome's signed-in accounts by itself; Google only shows the real account chooser through OAuth.

To enable the Google account picker:

1. Create a Firebase project.
2. In Firebase Authentication, enable `Google` as a sign-in provider.
3. In Firebase Authentication settings, add `localhost` to authorized domains for local development.
4. Create a Firebase Web App and copy its config values.
5. Copy `.env.local.example` to `.env.local` and fill in every value.
6. Restart `npm run dev`.

After that, clicking `Continue with Google` opens Google's account chooser so the user can select their own Gmail/Chrome account.

## Verification

```bash
npm run lint
npm run build
```
# friendvault
# friendvault
