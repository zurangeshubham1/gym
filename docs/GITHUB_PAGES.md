# GitHub Pages

Built files live in `dist/` after `npm run build`.

## Project site (`username.github.io/gym/`)

Create `.env.local`:

```
VITE_GYM_API_URL=https://script.google.com/macros/s/XXXXX/exec
VITE_BASE_PATH=/gym/
```

Then:

```
npm run build
```

Upload the **contents** of `dist/` (including `404.html`) as the Pages artifact.

## User/org site (`yourgym.github.io`)

Leave `VITE_BASE_PATH` unset (base `/`).
