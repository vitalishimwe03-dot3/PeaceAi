# PeaceAI

Secure AI platform (React + Vite + TypeScript + Supabase) for AI chat, development workflows, storage/collaboration, service requests, and admin operations.

## What’s in this repo

- **Frontend:** `src/` (Vite React app). Uses Supabase when configured; falls back to **local preview/demo mode** when `VITE_SUPABASE_*` are missing.
- **Supabase:** `supabase/config.toml`, migrations in `supabase/migrations/`, Edge Functions in `supabase/functions/`.

## Local setup

1. Install deps:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Configure frontend vars in `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL` (optional)
4. Run the app:
   ```bash
   npm run dev
   ```

> Without Supabase vars, the app runs in **preview mode** (browser-local demo data). No real auth, AI, payments, or server-side enforcement.

## Supabase setup (required for real functionality)

1. Create/link a Supabase project and set `project_id` in `supabase/config.toml`.
2. Apply migrations:
   ```bash
   supabase db push
   ```
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy ai-chat
   supabase functions deploy process-dataset
   supabase functions deploy ingest-knowledge
   supabase functions deploy create-payment
   supabase functions deploy payment-webhook
   supabase functions deploy contact-message
   supabase functions deploy delete-account
   ```
4. Set Edge Function secrets (never in `VITE_*`):
   - **AI:** `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` (+ optional premium/embedding vars)
       - **Payments (Flutterwave):** `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_SECRET_HASH`, `FLUTTERWAVE_BASE_URL`. In Flutterwave enable Rwanda mobile money collections (MTN and Airtel) and set the webhook URL to `https://<project-ref>.supabase.co/functions/v1/payment-webhook`. Test in sandbox first.
   - **Email (Resend):** `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_ALERT_EMAIL`
   - **Site/jobs:** `SITE_URL`, `INTERNAL_JOB_SECRET`

## Edge Functions

| Function | Auth | Purpose |
|---|---:|---|
| `ai-chat` | JWT | AI responses with quota enforcement and knowledge retrieval. |
| `process-dataset` | JWT/admin (service-internal allowed) | Chunks/indexes uploaded knowledge files into `knowledge_chunks`. |
| `ingest-knowledge` | JWT | **Self-serve knowledge ingestion**: saves text as a ready knowledge dataset for retrieval. |
| `create-payment` | JWT | Creates pending payment; supports hosted checkout and Rwanda mobile-money prompts (MTN/Airtel) with server-verified amounts. |
| `payment-webhook` | no JWT (signature verified) | Verifies `verif-hash`, re-verifies the transaction with Flutterwave, then activates entitlements via `activate_paid_subscription` (idempotent). |
| `contact-message` | public | Stores contact messages with basic rate limiting; optional Resend notification. |
| `delete-account` | JWT | Authenticated account deletion (admin workflow excluded). |

## Self-dataset ingestion (AI can take dataset)

- **Endpoint:** `ingest-knowledge` (authenticated). Accepts `{ name, description?, content }`, chunks and stores into `knowledge_datasets`/`knowledge_chunks` as `ready`.
- **UI:** Assistant supports `/learn <name>: <content>` to save approved text to knowledge (requires configured Supabase + deployed function). Retrieval in `ai-chat` uses `match_knowledge_chunks` for ready datasets.
- **Safety:** Only ingest content you’re authorized to use. Treat ingested content as untrusted reference data. Do not store secrets.

## Security notes

- Keep provider/payment/service keys in **server-side** Edge Function secrets only.
- `payment-webhook` must verify `FLUTTERWAVE_SECRET_HASH` (`verif-hash`) and re-verify the transaction with `FLUTTERWAVE_SECRET_KEY` before activation. Never unlock paid features from client-only callbacks. Mobile-money prompts are sent to the user's phone; PeaceAI never asks for or stores wallet PINs.
- Review CORS, RLS policies, and auth email-confirmation settings before production.

## Scripts

```bash
npm run dev        # local dev
npm run build      # typecheck + build
npm run typecheck
npm run lint
npm run test
```

## Known external dependencies / still requires configuration

Real deployments still need: a linked Supabase project, applied migrations, deployed functions, AI provider credentials, Flutterwave dashboard/webhook + secrets, Resend verified sender, production `SITE_URL`/CORS/origin allowlists, and legal/data-retention review for `delete-account`. The Edge Functions added here are production-minded scaffolds and should be tested against your exact schema/RPC names and provider payloads.