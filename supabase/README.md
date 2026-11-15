# Shared product reviews (Supabase)

The storefront can show community-wide average star ratings and recent review comments using Supabase's free tier. The project must be created and configured by the repository owner; this repository cannot create a Supabase account/project on your behalf.

## Setup

1. Create a Supabase project at <https://supabase.com/>.
2. In the Supabase SQL Editor, run the contents of `supabase/reviews.sql`.
3. In Project Settings → API, copy the **Project URL** and the **anon/public key**. Do not use or publish the `service_role` key.
4. Open `ratings.js` and replace `https://YOUR_PROJECT_ID.supabase.co` and `YOUR_SUPABASE_ANON_KEY` with those two values.
5. Commit and push to `main`, wait for the Pages deployment, then reload the site.

The client fetches the shared reviews, computes each product's average and count, and displays the three most recent comments. Anonymous visitors may submit a 1–5 star rating, a display name, and a 10–500 character review.

## Important moderation/security note

The included Row Level Security policies allow anyone to read and insert reviews. The anon key is designed to be public; the `service_role` key must never be placed in browser code. Because anonymous inserts are public, this starter setup is vulnerable to spam and does not verify purchases or identities. Before relying on reviews commercially, add authentication and/or a CAPTCHA plus a server-side/Edge Function rate limit and moderation workflow. Do not describe reviews as verified purchases.
