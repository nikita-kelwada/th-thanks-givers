# TAMUhack Hacksgiving Notes

A Friendsgiving thank-you note app for TAMUhack directors, built with React, TypeScript, and Firebase.

**Live site:** https://tamuhack-hacksgiving-notes.web.app

**Firebase project:** `tiny-thanks-a0fd0`

Members sign in with their personal Google account to write, edit, or delete notes. Notes can be anonymous. Approved admins can view letters and filter by recipient.

## Run locally

Use Node.js 24.

1. Copy `.env.example` to `.env.local` and fill in your Firebase web app configuration. Skip this if your local file is already configured.
2. Install dependencies and start the app:

```bash
npm install
npm run dev
```

Keep `.env.local` out of Git. `.env.production` contains the public sign-in domain and should be committed. Restart the dev server after changing environment files.

## Deploy

Sign in to Firebase once:

```bash
npx --yes --package firebase-tools firebase login
```

Build and publish the app and its security rules:

```bash
npm run build
npx --yes --package firebase-tools firebase deploy --only hosting,firestore:rules --project tiny-thanks-a0fd0
```

Deployment updates the live site. Committing and pushing saves the source code to GitHub; it does not run this deployment.

## Members and admins

In Firestore:

- `members/<lowercase email>`: approved accounts, with `realName` and `nickname` fields.
- `admin/<lowercase email>`: add the boolean field `enabled: true` to grant an approved member admin access.

Recipient options live in `src/userNames.ts`. Keep nicknames matched to Firestore and recipient values matched to `firestore.rules`. Names display in lowercase.

Admins read `adminMessages`, which keeps anonymous authors hidden. Sending, editing, and deleting update both letter copies together. Older letters without admin copies need a trusted backfill using the same document ID and only `to`, `message`, `from`, and `createdAt`. Never copy `senderId` into `adminMessages`.

## Google sign-in settings

For sign-in on the live site, keep these settings:

- **Firebase Authentication → Settings → Authorized domains:** `tamuhack-hacksgiving-notes.web.app`
- **Google Cloud → APIs & Services → Credentials → OAuth web client → Authorized redirect URIs:**

```text
https://tiny-thanks-a0fd0.firebaseapp.com/__/auth/handler
https://tamuhack-hacksgiving-notes.web.app/__/auth/handler
```

`.env.production` uses the live hostname for sign-in to avoid Safari storage issues. Keep both redirect URLs.

## Checks

```bash
npm run lint
npm run test:auth
npm run build
```
