# React + TypeScript + Vite

## Local Firebase setup

Copy `.env.example` to `.env.local` in the project root and fill in the Firebase web app configuration from the Firebase console. The existing `.env.local`, if present, already contains your local configuration and is ignored by Git.

Run `npm install`, then `npm run dev`. Restart the dev server after changing environment variables. Vite exposes variables prefixed with `VITE_` to the browser, so use only Firebase's public web app configuration here; never add service account credentials.

Run `npm run build` to build the app for Firebase Hosting. The default Firebase project is `tiny-thanks-a0fd0`.

Users can edit message text from **see your written letters!** using **edit**, then **save** or **cancel**. Saving updates the original letter and its admin copy together while preserving the recipient, anonymity, and original timestamp. Older named letters without a sender account ID can be edited by the member with the matching nickname.

The edit feature requires the updated Firestore rules. Deploy them along with the app using `npx firebase deploy --only firestore:rules,hosting` after building. The local build does not publish these changes.

Admin mode lists `adminMessages` in real time, newest first, with a recipient filter. Access requires a verified member account and an `admin/<lowercase email>` document with the boolean field `enabled: true`. Create that document through the Firebase console; the app cannot grant admin access. Admin copies include the recipient, message, displayed sender, and timestamp, without the sender account ID.

New submissions create the original and admin copy atomically, and edits update both. Older letters created before admin copies were introduced need a trusted console/Admin SDK backfill into `adminMessages`, using the same document ID and only `to`, `message`, `from`, and `createdAt`. Preserve `from: 'Anonymous'`; do not copy `senderId`. Until backfilled or edited by their author, those older letters will not appear in admin mode.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
