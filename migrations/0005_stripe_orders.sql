-- Stripe Checkout: keep unpaid orders out of the pack queue and record the session.
alter table orders add column if not exists stripe_checkout_session_id text;
alter table orders add column if not exists stripe_payment_intent_id text;
alter table orders add column if not exists paid_at timestamptz;

create unique index if not exists orders_stripe_checkout_session_uidx
  on orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
