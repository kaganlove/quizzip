QuizZip Auth and Subscriptions Patch

What this adds
1) Email and password login using Supabase Auth
2) Monthly and yearly Stripe subscriptions
3) Stripe webhook that writes subscription status into Supabase
4) Exports unlock automatically when status is active or trialing
5) Billing portal link for upgrades, cancellations, card updates

Setup checklist
A) Install dependencies
   npm i @supabase/supabase-js stripe

B) Supabase project
1) Create a Supabase project
2) In SQL Editor, run the file supabase.sql
3) In Authentication, enable Email provider
4) Optional: turn off email confirmation for faster testing

C) Stripe project
1) Create a product QuizZip Pro
2) Create two recurring prices
   Monthly 9 USD
   Yearly 90 USD
3) Copy the price ids into env

D) Webhook
1) In Stripe, add a webhook endpoint
   Local dev url: http://localhost:3000/api/stripe/webhook
2) Subscribe to events:
   checkout.session.completed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
3) Copy the webhook signing secret into env as STRIPE_WEBHOOK_SECRET

E) Env vars
Create .env.local using .env.example values

Local dev webhook tip
Use the Stripe CLI:
1) stripe login
2) stripe listen --forward-to http://localhost:3000/api/stripe/webhook
Then put the printed whsec value into STRIPE_WEBHOOK_SECRET

Notes
- Quiz zip files never upload to your server
- The server only handles Stripe actions and webhooks
- Access control uses subscription status stored in Supabase
