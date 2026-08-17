# Database setup

Run these in **Supabase → SQL Editor**, in this order. Each one is safe to
run twice.

| # | File | What it does |
|---|------|--------------|
| 1 | `schema.sql` *(existing)* | Partners, inventory, batches, invoices, payments |
| 2 | `profiles-and-roles.sql` *(existing)* | Logins and the `admin` / `supervisor` roles |
| 3 | `02-orders-and-sales.sql` | Enquiries, orders, B2B customer fields, the `salesperson` role, and the access rules |
| 4 | `03-invoice-on-delivery.sql` | Raises the tax invoice when an order is delivered, and queues it to the customer's mobile |

Then set your own business details, which the invoice needs:

```sql
update app_settings set value = '29XXXXXXXXXXXZX' where key = 'gstin';
update app_settings set value = 'Karnataka'       where key = 'home_state';
```

`home_state` is what decides CGST+SGST versus IGST on every invoice, so
it must be right.

After step 3, create the salesperson's login in **Authentication → Users**, then:

```sql
update profiles set role = 'salesperson' where email = 'their@email.com';
```

---

## What step 3 adds

**Enquiries** — a customer asking about products before any order exists.
A WhatsApp conversation lands here first, and `status` tracks whether it
turned into an order or was lost.

**Orders** — the missing middle. The ERP previously went straight from
nothing to an invoice, so there was no way to record "ordered, not yet
delivered". Every intake route writes to this one table and differs only
in `source`: `whatsapp`, `gateway`, `salesperson`, `phone`, `walk-in`.

**B2B customer fields** on `partners` — customer type (Restaurant, Hotel,
Store…), contact person, delivery address, area, credit days and limit,
and a WhatsApp opt-in flag with the date it was recorded.

**Gapless document numbering** — `next_doc_no()` hands out `ORD-2026-0001`
and invoice numbers from a locked counter row, one financial year at a
time. The previous approach read `max()` from the table, which gives two
simultaneous writers the same number.

---

## Two status columns, deliberately

| Column | Question it answers | Values |
|--------|--------------------|--------|
| `orders.fulfilment_status` | Where are the goods? | pending → packed → dispatched → delivered |
| `invoices.status` | Where is the money? | pending → partial → paid → overdue |

These are separate on purpose. "Delivered but unpaid" is the normal state
of a B2B order on credit terms, and one column cannot express it.

---

## Who can see what

Enforced by Postgres row-level security, not by hiding tabs in the page.
This matters: the browser holds a real database key, so anything the key
may read can be read from the developer console regardless of what the
interface shows.

| | admin | supervisor | salesperson |
|---|---|---|---|
| Customers | all | read | read, add, edit |
| Inventory | all | read + write | **none** |
| Batches & cost | all | read + write | **none** |
| Payments | all | none | none |
| Invoices | all | read | own orders only |
| Orders | all | read | own only |

A salesperson cannot read what a product costs to make, and cannot delete
a customer.

### One trap to know about

`schema.sql` creates a policy named `auth full access` defined as
`USING (true)` on every table. Postgres combines permissive policies with
**OR**, so leaving it in place makes every later restriction evaluate as
`true OR ...` — always true. `02-orders-and-sales.sql` drops it explicitly
per table and writes complete replacements.

If you add a table later, check `pg_policies` before assuming a new
restriction took effect:

```sql
select tablename, policyname, permissive, cmd, qual
from pg_policies order by tablename, policyname;
```

---

## What happens when an order is delivered

Marking `fulfilment_status = 'delivered'` fires a trigger that:

1. Refuses if the order has no items — you cannot invoice an empty delivery.
2. Picks **CGST+SGST** if the customer's state matches `home_state`,
   **IGST** if not.
3. Totals each line separately, since GST rate can differ per product.
4. Takes the next invoice number from the locked counter.
5. Sets `due_date` from the customer's `credit_days`.
6. Queues the invoice to their mobile in the `outbox` table.

Calling it twice returns the same invoice. A double tap on a phone, or a
retried webhook, cannot invoice one delivery twice.

### The outbox

The database never calls WhatsApp directly — an HTTP request inside a
transaction can hold a lock open while a slow API times out. Invoices are
queued in `outbox` and an Edge Function drains it.

This is also what makes failure visible. A customer with no usable mobile
number gets an `outbox` row with status `failed` and the reason, instead
of an invoice that silently never arrives.

## Verifying a change

The migration was developed against a local PostgreSQL 16 with the
Supabase `auth` schema stubbed out. To re-check role isolation after
editing policies, confirm that a salesperson login sees **zero** rows in
`inventory`, `batches` and `payments`, and only their own orders.
