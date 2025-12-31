# QuizZip MVP

This is a Next.js MVP that:
- Reads a Canvas Classic Quiz export zip (QTI 1.2 style package)
- Shows a health report (items present vs question bank references)
- Previews questions in the browser
- Generates Word and Excel exports (currently gated behind a dev toggle)

## Run locally

1. Install Node 18+ (Node 20 recommended)
2. In this folder:
   - npm install
   - npm run dev
3. Open http://localhost:3000

## Notes

- Parsing happens locally in the browser.
- Some Canvas exports contain only question bank references (sourcebank_ref). This package does not include those bank questions, so preview and export are not possible for that assessment.

## Deploy for full web use

This app can be deployed to Vercel as a standard Next.js site.

### Recommended production shape
- Frontend: Vercel
- Payments: Stripe Checkout
- Backend: Next.js route handlers for
  - POST /api/stripe/webhook
  - POST /api/license/validate

License storage options:
- Firestore
- Supabase Postgres
- Cloudflare KV

In production, replace the local "Paid mode toggle" with:
- Stripe Checkout session
- A license key returned on success
- Validation call to enable exports
