# Firebase setup for live groups and memories

The code keeps existing `groups/{groupId}` documents and their IDs. Group owners are determined by `createdBy`; no migration of existing groups is needed.

## Spark free plan

FriendVault can use Firebase Authentication and Cloud Firestore without a Cloud Storage bucket. Set the Auth and Firestore `NEXT_PUBLIC_FIREBASE_*` values in `.env.local`; leave `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` empty or omit it. Sign-in, vaults, invitations, memberships, join codes, and text memories (including dates and locations) continue to use real Firebase data. Sample vault memories are saved as text when Storage is unavailable. No mock persistence is used.

New memory photos use Cloudinary and do not require Firebase Storage or a Firebase plan upgrade. Cloudinary credentials stay on the Next.js server. Existing Firestore `imagePath` values remain readable when the old Storage bucket is available; they are not migrated or overwritten. Deleting a vault with those older paths still requires Storage access for its existing cleanup preflight.

## Data paths

- `groups/{groupId}`: existing group record and owner UID.
- `groups/{groupId}/members/{uid}`: accepted member's UID, group ID, role (`member` or `admin`), display name, and join time. Owners are implicit.
- `groups/{groupId}/invitations/{uid}`: pending invitation for one Firebase Auth UID.
- `groups/{groupId}/memories/{memoryId}`: story, date, author UID and public display name, optional legacy Storage path, and up to 12 Cloudinary photo objects (`photos: [{publicId, url, format}]`). The stored Cloudinary URL points to an authenticated asset and cannot be opened without a server-generated signature.
- `vaultDeletionJobs/{groupId}`: owner-only record of legacy Storage paths and Cloudinary public IDs awaiting cleanup after the group and its child documents are deleted.
- Storage `groups/{groupId}/memories/{memoryId}/image-{uuid}`: optional image versions, readable by accepted members and the owner. Existing `image` paths remain readable.
- Cloudinary `friendvault/groups/{groupId}/memories/{memoryId}/{uploaderUid}/{uuid}`: authenticated images. The app's `/api/memory-photos` route verifies a Firebase ID token and current vault membership before uploading or serving bytes. It checks that a requested photo is listed on that memory.

An inviter needs the friend's Firebase Auth user ID, shown on the friend's vault dashboard. The inviter shares the invitation link after sending it. Only the designated account can accept or reject.

## Manual Firestore setup

1. Review and publish `firestore.rules` and `firestore.indexes.json` for the intended Firebase project. Nothing in this change deploys them. The rules now allow the optional `photos` array while keeping the same owner/member authorization; the collection-group index on `members.userId` is needed for joined groups on the dashboard.
2. Run the Firestore emulator authorization tests before publishing rule changes: `firebase emulators:exec --only firestore --project demo-friendvault-rules "npm test"`. If you later enable Storage, also run the Storage emulator tests.

## Cloudinary photo setup (free plan)

1. Create a Cloudinary Image and Video account. The [Free plan](https://cloudinary.com/pricing) has usage limits; watch the account's monthly credits. Find its **Cloud name**, **API Key**, and **API Secret** in Cloudinary Console → Settings → API Keys. Do not create an unsigned upload preset. The server uploads each photo with Cloudinary delivery type `authenticated`, so original and transformed images require signed access.
2. In Firebase Console, select **friendvault-a8a6d** and open **Project settings → Service accounts → Generate new private key**. Save the downloaded service-account JSON outside this repository (for example, `/home/dev254/.config/friendvault/firebase-admin.json`) and restrict its file permissions to your account (`chmod 600 /home/dev254/.config/friendvault/firebase-admin.json`). Do not paste the JSON into source files or commit it. Keep your existing `.env.local`; add the following server-only variables to it:

   ```text
   FIREBASE_ADMIN_PROJECT_ID=friendvault-a8a6d
   GOOGLE_APPLICATION_CREDENTIALS=/home/dev254/.config/friendvault/firebase-admin.json
   ```

   The path must be absolute and point to the downloaded JSON for **friendvault-a8a6d**. `FIREBASE_ADMIN_PROJECT_ID` must match `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. The server also accepts the following alternative when it cannot use a JSON file. Set **both** values from the same service account and omit `GOOGLE_APPLICATION_CREDENTIALS`:

   ```text
   FIREBASE_ADMIN_PROJECT_ID=friendvault-a8a6d
   FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account-email
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

3. Separately add the Cloudinary values from your Cloudinary account to `.env.local` (and to your deployment host's server environment):

   ```text
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

   All Firebase Admin and Cloudinary variables in this section are server-only. Never give a private key or API secret a `NEXT_PUBLIC_` prefix. The browser's existing `NEXT_PUBLIC_FIREBASE_*` values identify the Firebase client app; they do not provide Admin credentials.
4. Review and deploy the updated Firestore rules to the intended project, for example `firebase deploy --only firestore:rules --project friendvault-a8a6d`. Restart the Next.js server after setting environment variables. Deploy FriendVault on a host that runs Next.js Node.js route handlers; a static export cannot upload or serve private photos.
5. Sign in as a vault owner or accepted member, add two photos to a memory, reload it, and open it from another authorized account. An outsider should still be denied. On a failed upload, retry it or explicitly choose **Save without failed photos**. Photos uploaded before an abandoned form or failed Firestore save may remain in Cloudinary until manually removed; review the `friendvault/` folder for orphans. Cloudinary photo deletion is attempted after a memory or vault is edited or deleted, and a cleanup warning appears if it fails. Pending vault cleanup is retried when the owner returns to My vaults.

Photo requests pass a Firebase ID token to the server; the server checks current vault access and streams authenticated Cloudinary bytes with `no-store`. Raw Cloudinary URLs in Firestore are intentionally unsigned and cannot be used to bypass membership. The service account and Cloudinary API secret grant broad privileges: keep them only in trusted server environments.

### Troubleshoot photo upload authentication

The browser sends a freshly refreshed Firebase ID token in the `Authorization: Bearer <token>` header for each upload. The server verifies it with Firebase Admin, then checks the vault owner or accepted member record and, for an existing memory, the author or vault owner. A missing or invalid token returns `401`, and a disabled account or unauthorized member returns `403`. Missing or unusable Firebase Admin credentials return `503` with a setup message, not an expired-session message.

If uploads return `503` locally, confirm that `GOOGLE_APPLICATION_CREDENTIALS` points to an existing service-account JSON file **outside** this repository, or set both `FIREBASE_ADMIN_CLIENT_EMAIL` and `FIREBASE_ADMIN_PRIVATE_KEY`. `FIREBASE_ADMIN_PROJECT_ID` must match `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Restart `next dev` after changing `.env.local`. A Cloudinary configuration error is also reported as `503` after Firebase authentication succeeds. The server logs the failure stage and error category without logging the ID token.

## Legacy Firebase Storage photos

The old Storage integration remains for existing `imagePath` images and sample-vault behavior. It is optional for new memories. Keep `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` unset if you do not already have a bucket. There is no need to enable Firebase Storage or upgrade Firebase billing for Cloudinary photos.

Until the new rules and index are published, existing owner group creation, dashboard listing, and owner name/description editing still work. Invitation, membership, and memory reads or writes remain blocked by the old rules. Group deletion is intentionally blocked by the client if it cannot first inspect child records safely.

Group deletion first reads the group's memories, members, invitations, join code, and photo metadata. No Firestore deletion starts if any preflight read fails. It then removes known child documents, the join code, and the group in one batch. For groups with photos, that same batch creates an owner-scoped cleanup job. Photo deletion follows; failed paths stay in the job and are retried when the owner returns to My vaults. The browser workflow stops before deletion when there are more than 400 child records; a server-side administrative deletion is needed for larger groups. The preflight refuses older photos lacking the ownership metadata required for safe cleanup after the parent group is gone.
