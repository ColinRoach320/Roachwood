import Stripe from "stripe";

/**
 * Server-side Stripe client. Pinned to a recent API version so the
 * payload shape stays stable across Stripe-side changes.
 *
 * Never import this from a client component — `STRIPE_SECRET_KEY` must
 * stay server-side. Pair it with the `runtime = "nodejs"` directive in
 * any route handler that uses it (Stripe SDK relies on Node APIs).
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-04-22.dahlia",
  appInfo: { name: "Roachwood", url: "https://roachwood.co" },
});
