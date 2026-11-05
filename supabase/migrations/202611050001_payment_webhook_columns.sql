-- Persist provider transaction ids and webhook payloads for audit and
-- idempotent payment reconciliation. These columns are written only by the
-- payment-webhook edge function (service role).

alter table public.payments
  add column if not exists provider_transaction_id text,
  add column if not exists raw_payload jsonb;

create index if not exists payments_provider_transaction_idx
  on public.payments (provider_transaction_id);
