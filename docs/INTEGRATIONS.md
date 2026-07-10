# Real OAuth integrations — what YOU must do

GrowEasy now has **real** OAuth for:

| Feature | Provider | Env vars |
|---------|----------|----------|
| Google Drive CSV import | Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OneDrive CSV import | Microsoft | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| Facebook Lead Ads | Meta | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| Google Ads connect | Google | same Google client + optional `GOOGLE_ADS_DEVELOPER_TOKEN` |

Also set:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
INTEGRATION_SECRET=any-long-random-string
```

On Vercel use `https://your-domain.vercel.app` for `NEXT_PUBLIC_APP_URL`.

After editing `.env.local`, **restart** `npm run dev`.

In-app checklist: [/settings/integrations](/settings/integrations)

---

## 1. Google Cloud (Drive + Ads)

### Public access (required for all visitors)

While Publishing status is **Testing**, Google returns `403: access_denied` for anyone not listed as a Test user. For a public demo:

1. Deploy privacy + terms (shipped at `/privacy` and `/terms`)
2. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent):
   - App home: `https://growease.vercel.app`
   - Privacy: `https://growease.vercel.app/privacy`
   - Terms: `https://growease.vercel.app/terms`
   - Authorized domains: `growease.vercel.app`
3. Click **Publish app** (Testing → In production)
4. Submit **OAuth verification** for sensitive scopes (`drive.readonly`, Ads). Until Google approves, non-testers may still be blocked for Drive/Ads — keep using **Test users** for reviewers in the meantime.
5. Add production redirect URIs on the OAuth client + set Vercel env `NEXT_PUBLIC_APP_URL=https://growease.vercel.app`

### Client setup

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create / select a project
3. Enable APIs: **Google Drive API**, **Google Ads API**
4. Configure **OAuth consent screen** (External) — see public access above
5. Create credentials → **OAuth client ID** → **Web application**
6. Authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://growease.vercel.app`
7. Authorized redirect URIs (exact match):
   - `http://localhost:3000/api/oauth/google-drive/callback`
   - `http://localhost:3000/api/oauth/google-ads/callback`
   - `https://growease.vercel.app/api/oauth/google-drive/callback`
   - `https://growease.vercel.app/api/oauth/google-ads/callback`
8. Copy Client ID + Client Secret into `.env.local` and Vercel

### Optional: list Google Ads customers

1. In Google Ads → Tools → **API Center** → apply for a **Developer token**
2. Add `GOOGLE_ADS_DEVELOPER_TOKEN=...` to `.env.local`
3. If using a manager account: `GOOGLE_ADS_LOGIN_CUSTOMER_ID=1234567890`

Without the developer token, Connect still works (real Google OAuth); customer listing stays empty until the token is added.

---

## 2. Microsoft Entra (OneDrive)

1. Go to [App registrations](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. **New registration**
   - Supported accounts: **Any org + personal Microsoft accounts**
3. **Authentication** → Add a platform → **Web**
   - Redirect URI: `http://localhost:3000/api/oauth/onedrive/callback`
4. **Certificates & secrets** → New client secret → copy the **Value**
5. **API permissions** → Microsoft Graph → Delegated:
   - `User.Read`
   - `Files.Read`
   - `offline_access`
6. Overview → copy **Application (client) ID**
7. Put into `.env.local`:
   - `MICROSOFT_CLIENT_ID=...`
   - `MICROSOFT_CLIENT_SECRET=...`

---

## 3. Meta (Facebook Lead Ads)

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Create an app (Business / Marketing use case with Lead Ads)
3. Add **Facebook Login** product
4. Facebook Login → Settings → **Valid OAuth Redirect URIs**:
   - `http://localhost:3000/api/oauth/facebook/callback`
5. Settings → Basic → copy **App ID** and **App Secret**
6. `.env.local`:
   - `FACEBOOK_APP_ID=...`
   - `FACEBOOK_APP_SECRET=...`
7. While app is in **Development**, add yourself under **Roles** (Admin / Developer / Tester)
8. In Business Manager → **Integrations → Leads Access**, grant this app access to your Page
9. For other people to connect: submit **App Review** for
   `leads_retrieval`, `pages_show_list`, `pages_manage_ads`, `pages_read_engagement`

---

## 4. `.env.local` template

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
INTEGRATION_SECRET=replace-with-long-random-string

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

---

## 5. Verify

1. Restart server
2. Open http://localhost:3000/settings/integrations — each row should say **Configured**
3. Lead Sources → Google Drive / OneDrive → **Continue with Google/Microsoft** → pick a real CSV
4. Ad Accounts → **Connect account** → authorize Facebook / Google → see real pages/forms

Common failure: `redirect_uri_mismatch` — the URI in the console must match **exactly** (including `http` vs `https`, port, and path).
