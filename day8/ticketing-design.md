# TicketHub: Event Ticketing System Design

TicketHub is a website that sells tickets for concerts and events. This document follows the six-part design framework: requirements, estimates, API, data model, architecture, trade-offs.

---

## 1. Requirements

### Functional requirements

1. Users can register, log in and log out.
2. Users can browse and search upcoming events (by name, city, date, category).
3. Users can view an event's details and its seat map with live availability.
4. Users can select one or more seats (max 6 per order) and **hold** them temporarily (10 minutes) while they pay.
5. Users can pay for held seats; on success they receive tickets (with a QR code).
6. Users can view their past and upcoming tickets.
7. Users can release a hold, and holds expire automatically.
8. Organizers can create events and define seats and prices (out of scope for detailed design here).

### Non-functional requirements

| Quality | Requirement |
|---|---|
| **Speed** | Browsing pages load in under 300 ms (p95). Seat map loads in under 500 ms. Placing a hold responds in under 1 s even during a big sale. |
| **Correctness** | A seat is **never sold to two people**. A user is never charged without receiving a ticket, and never receives a ticket without being charged. Payments are processed exactly once, even if the user clicks twice or the network retries. |
| **Fairness** | During a big sale, people are served roughly in the order they arrived (first come, first served). Bots and one person opening many tabs must not get an unfair advantage: one active queue place per account, per-user rate limits. |
| **Availability** | Browsing stays up at 99.9%. If the sale system is overloaded, it must degrade gracefully (users wait in a queue) rather than crash. |
| **Scalability** | Handle a ~500x jump in request rate for a short period without a redesign. |
| **Security** | Passwords hashed, HTTPS everywhere, card details never stored by us (payment provider handles them). |

---

## 2. Estimates

### Normal day

- Page views: 50,000 visitors x 10 pages = **500,000 page views/day**.
- Average rate: 500,000 / 86,400 s = **about 6 requests/s**.
- Traffic is not flat. Assume the peak hour is about 10x the average: **about 60 requests/s**.
- Sales: 5,000 tickets/day / 86,400 s = **about 0.06 tickets/s** (one ticket every ~17 seconds).
- Read:write ratio is extreme: 500,000 page views vs 5,000 purchases, so about **100 reads per purchase**.
- Storage: 5,000 tickets/day x 365 = about 1.8 million tickets/year. At ~500 bytes per row, under 1 GB/year for tickets. Small. Users (2 million rows x ~300 B) is about 600 MB. The whole database fits on a single modest server.

### Big sale (popular concert)

- 200,000 people try to buy 20,000 seats within the first 10 minutes (600 s).
- Arrivals: 200,000 / 600 = **about 333 new users/s**.
- Each user does roughly 10 requests in the window (load event page, seat map, a few seat-map refreshes, one or more hold attempts, pay): 200,000 x 10 = 2,000,000 requests in 600 s = **about 3,300 requests/s average**. Most people arrive in the first seconds, so assume the peak is 3x the average: **about 10,000 requests/s**.
- Successful sales: 20,000 seats / 600 s (if sold out in 10 minutes) = **about 33 sales/s**. Hold *attempts* are far higher, because many users compete for the same seats: demand is **10 users per seat**, so about 90% of users will fail and must be told quickly and politely.

### Comparison

| Metric | Normal day | Big sale (10 min) | Ratio |
|---|---|---|---|
| Users | 50,000 per day | 200,000 per 10 min | 4x users |
| Request rate | ~6/s (60/s at peak hour) | ~3,300/s (10,000/s at peak) | ~550x average, ~170x peak-hour |
| Ticket sales | 0.06/s | 33/s | ~550x |

The key insight: the big sale is only 4x more *people*, but they arrive in 10 minutes instead of 24 hours, a 144x compression, so the rate is about 550x higher. And all those people fight for the *same 20,000 rows* of one event. The problem is **contention on a small set of hot rows**, not just raw volume. The normal architecture cannot simply be scaled up for this; it needs a queue and an atomic hold mechanism.

---

## 3. API Design

Base URL: `https://api.tickethub.example/v1`. JSON over HTTPS. Authenticated endpoints use a bearer token.

| # | Purpose | Endpoint | Auth |
|---|---|---|---|
| 1 | Browse events | `GET /events?city=&category=&from=&q=&page=` | No |
| 2 | Event details | `GET /events/{event_id}` | No |
| 3 | View seats | `GET /events/{event_id}/seats?section=` | No |
| 4 | Join sale queue | `POST /events/{event_id}/queue` | Yes |
| 5 | Hold seats | `POST /events/{event_id}/holds` | Yes (needs queue pass) |
| 6 | Release hold | `DELETE /holds/{hold_id}` | Yes |
| 7 | Pay for held seats | `POST /orders` | Yes |
| 8 | View my tickets | `GET /me/tickets` | Yes |
| 9 | View one order | `GET /orders/{order_id}` | Yes |
| 10 | Register / log in | `POST /users`, `POST /sessions` | No |

### Key request/response examples

**GET /events/{event_id}/seats** (cached for a few seconds)
```json
{
  "event_id": 42,
  "as_of": "2026-11-01T18:00:03Z",
  "seats": [
    {"seat_id": 1001, "section": "A", "row": "1", "number": 1, "price_cents": 8000, "status": "AVAILABLE"},
    {"seat_id": 1002, "section": "A", "row": "1", "number": 2, "price_cents": 8000, "status": "HELD"}
  ]
}
```
The seat map is *advisory*: it may be a few seconds stale. The authoritative check happens when holding.

**POST /events/{event_id}/holds**
```json
{ "seat_ids": [1001, 1003] }
```
Responses:
- `201 Created` `{ "hold_id": "h_9f2", "expires_at": "2026-11-01T18:10:03Z", "total_cents": 16000 }`
- `409 Conflict` `{ "error": "SEAT_UNAVAILABLE", "seat_ids": [1003] }` (nobody gets a partial hold; it is all or nothing)
- `429 Too Many Requests` if rate-limited, `403` if the user has no queue pass.

**POST /orders**
```json
{ "hold_id": "h_9f2", "payment_token": "tok_abc123" }
```
Header: `Idempotency-Key: <uuid>`. The same key sent twice returns the same result and never charges twice.
- `201 Created` with order and ticket ids.
- `410 Gone` if the hold expired.
- `402 Payment Required` if the payment was declined (hold is kept until it expires so the user can retry).

---

## 4. Data Model

Relational database (PostgreSQL). Relationships: a user places many orders; an event has many seats; an order has many tickets; each ticket is for exactly one seat.

### Tables

**users**
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| email | TEXT | UNIQUE, NOT NULL |
| password_hash | TEXT | NOT NULL |
| name | TEXT | |
| created_at | TIMESTAMPTZ | |

**events**
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| name | TEXT | NOT NULL |
| venue | TEXT | |
| city | TEXT | INDEX |
| starts_at | TIMESTAMPTZ | INDEX |
| sale_starts_at | TIMESTAMPTZ | when tickets go on sale |
| total_seats | INT | |

**seats** (one row per physical seat per event)
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| event_id | BIGINT FK -> events.id | NOT NULL |
| section, row_label, seat_number | TEXT/INT | UNIQUE (event_id, section, row_label, seat_number) |
| price_cents | INT | CHECK (price_cents >= 0) |
| status | TEXT | `AVAILABLE` / `HELD` / `SOLD`, CHECK constraint |
| held_by_user_id | BIGINT FK -> users.id | NULL unless HELD |
| hold_id | TEXT | NULL unless HELD |
| hold_expires_at | TIMESTAMPTZ | NULL unless HELD |
| version | INT | incremented on every change |

Index: `(event_id, status)` for fast seat-map queries.

**orders**
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| user_id | BIGINT FK -> users.id | NOT NULL |
| event_id | BIGINT FK -> events.id | |
| total_cents | INT | |
| status | TEXT | `PENDING` / `PAID` / `FAILED` |
| idempotency_key | UUID | UNIQUE per user, prevents double charge |
| payment_ref | TEXT | provider's charge id |
| created_at | TIMESTAMPTZ | |

**tickets**
| Column | Type | Notes |
|---|---|---|
| id | BIGINT PK | |
| order_id | BIGINT FK -> orders.id | NOT NULL |
| seat_id | BIGINT FK -> seats.id | **UNIQUE** |
| user_id | BIGINT FK -> users.id | |
| qr_code | TEXT | UNIQUE |

### Relationships

```
users 1 ──< orders 1 ──< tickets >── 1 seats >── 1 events
users 1 ──< tickets
events 1 ──< orders
```

---

## 5. Preventing Double-Booking (Two People Buying the Same Seat)

The danger is a **race condition**: Alice and Bob both see seat 1001 as available, both click at the same instant, and a naive "check, then write" flow lets both succeed:

```
Alice: SELECT status FROM seats WHERE id=1001   -> AVAILABLE
Bob:   SELECT status FROM seats WHERE id=1001   -> AVAILABLE
Alice: UPDATE seats SET status='HELD' ...        -> ok
Bob:   UPDATE seats SET status='HELD' ...        -> ok   (BUG!)
```

The design prevents this with **three layers**, so that no single mistake can sell a seat twice.

### Layer 1: Atomic conditional update (the hold)

The check and the write happen in **one statement**, so the database evaluates them atomically under a row lock:

```sql
UPDATE seats
SET status = 'HELD',
    held_by_user_id = :user_id,
    hold_id = :hold_id,
    hold_expires_at = now() + interval '10 minutes',
    version = version + 1
WHERE id = :seat_id
  AND (status = 'AVAILABLE'
       OR (status = 'HELD' AND hold_expires_at < now()));
```

The database locks the row for the duration of the update. If Alice's statement runs first, Bob's statement waits, then re-evaluates the `WHERE` clause, sees status is now `HELD` with a future expiry, matches **0 rows**, and Bob is told "seat unavailable" (`409`). The application checks the rows-affected count: **1 = you got it, 0 = you lost**. There is no gap between checking and writing.

### Layer 2: Transaction for multi-seat holds (all or nothing)

A user holding seats 1001 and 1003 runs both updates inside **one transaction**. If any update affects 0 rows, the transaction **rolls back**, so the user never ends up with half an order. To avoid **deadlocks** (Alice locks 1001 then wants 1003, Bob locks 1003 then wants 1001), seats are always locked in **ascending seat_id order**.

### Layer 3: Unique constraint (the last line of defence)

When payment succeeds, the order is finalized in one transaction:

1. Verify the user still owns an unexpired hold on each seat (`status='HELD' AND hold_id=:hold_id AND hold_expires_at > now()`).
2. Set seats to `SOLD`.
3. Insert rows into `tickets`.
4. Mark the order `PAID`.

The `tickets.seat_id` column has a **UNIQUE constraint**. Even if a bug in the application code or a rare race slipped through layers 1 and 2, the database would **reject the second ticket for the same seat** and the transaction would fail. The constraint makes double-booking *impossible to store*, not merely unlikely.

### Hold expiry and payment edge cases

- A hold lasts 10 minutes. Expired holds are treated as available by the condition in Layer 1, and a background job also resets them to `AVAILABLE` so the seat map stays accurate. There is no reliance on the job for correctness.
- **Payment arrives after the hold expired:** step 1 of finalization fails, the order is not completed and the charge is automatically refunded.
- **User double-clicks Pay or the network retries:** the `Idempotency-Key` plus the unique `(user_id, idempotency_key)` index means the second request returns the first result and does not charge again.
- **Crash between charging and writing tickets:** the order is stored as `PENDING` before charging. A reconciliation job compares `PENDING` orders with the payment provider and either completes or refunds them.

---

## 6. Architecture

```
                         ┌────────────┐
   Users ───────────────►│    CDN     │  static files, event pages, images
                         └─────┬──────┘
                               │ (misses)
                         ┌─────▼──────┐
                         │    Load    │  rate limiting, TLS, bot checks
                         │  Balancer  │
                         └─────┬──────┘
          ┌────────────────────┼──────────────────────┐
          │                    │                      │
   ┌──────▼──────┐     ┌───────▼────────┐     ┌───────▼───────┐
   │ Browse API  │     │  Waiting Room  │     │  Booking API  │
   │ (stateless, │     │  (queue svc)   │     │ (holds, orders)│
   │  many copies)│    └───────┬────────┘     └───┬───────┬───┘
   └──────┬──────┘             │                  │       │
          │             ┌──────▼──────┐           │       │
          │             │    Redis    │◄──────────┘       │
          │             │ queue, cache│                   │
          │             │ rate limits │             ┌─────▼──────┐
          │             └─────────────┘             │  Payment   │
          │                                         │  Provider  │
          │         ┌──────────────────┐            └────────────┘
          └────────►│ Read replicas    │
                    └────────▲─────────┘
                             │ replication
                    ┌────────┴─────────┐      ┌─────────────────┐
                    │ Primary Database │◄─────│ Background jobs │
                    │  (PostgreSQL)    │      │ expiry, refunds,│
                    └──────────────────┘      │ reconciliation, │
                                              │ email tickets   │
                                              └─────────────────┘
```

### Components

| Component | Responsibility |
|---|---|
| **CDN** | Serves static assets and cached event pages from locations near users. Absorbs most browsing traffic so it never reaches our servers. |
| **Load balancer** | Spreads requests across servers, terminates HTTPS, applies per-IP and per-user rate limits, and filters obvious bots. |
| **Browse API** | Stateless servers for events, event details and seat maps. Reads from cache and read replicas. Can be scaled out by adding copies. |
| **Waiting room (queue service)** | During a big sale, users join a virtual queue and get a position number. A fixed number (e.g. 2,000 at a time) are admitted with a signed **queue pass** token. This turns a spike of 200,000 into a controlled flow. |
| **Booking API** | Holds seats and creates orders. Only accepts users with a valid queue pass. Runs the transactions from section 5. |
| **Redis** | Stores the queue, short-lived caches (seat map snapshots, ~2 s), rate-limit counters and idempotency keys. It is **not** the source of truth for seat ownership. |
| **Primary database (PostgreSQL)** | The single source of truth. Enforces the atomic updates and unique constraints that prevent double-booking. |
| **Read replicas** | Serve browsing and seat-map reads so the primary only handles writes. |
| **Payment provider** | External service that charges cards. We only store the charge reference. |
| **Background jobs** | Release expired holds, reconcile pending payments, issue refunds, send ticket emails. Run off the critical path. |

### How it survives the big sale

1. **CDN absorbs reads.** Event pages and images are cached, so the 200,000 visitors mostly never touch our servers.
2. **Waiting room shapes the traffic.** Instead of 10,000 requests/s hitting the database, only the admitted batch can reach the Booking API. Admission rate is tuned to what the database can handle (e.g. a few hundred holds/s). The rest see a "you are number 41,230" page, which is cheap to serve from Redis.
3. **Fairness.** Queue position is assigned by arrival time. One queue entry per account, rate limits per IP, and CAPTCHA at the queue entrance reduce bots.
4. **Seat map is cached.** Seat availability is cached for a couple of seconds, and clients poll gently. A stale map just causes a clean `409`, never a wrong sale.
5. **Short, cheap transactions.** A hold is one small transaction that locks at most 6 rows for a few milliseconds, so the hot rows are never locked for long. 33 sales/s is well within what a single PostgreSQL primary can handle.
6. **Fast failure.** When the event sells out, the API returns "sold out" from cache immediately, and the queue is closed, so the 90% who cannot get a seat are told quickly instead of hammering the system.
7. **Scale-out in advance.** Because the sale time is known ahead, we pre-scale the Browse and Booking API servers before it starts rather than relying on slow auto-scaling.
8. **Isolation.** The Booking API and database for sale-heavy events are separate from the Browse API, so a flood of seat-map reads cannot slow down payments.

---

## 7. Trade-offs

### Trade-off 1: Waiting room (fairness and stability) vs. user experience and speed

A queue protects the database and gives fair, ordered access, but users must wait even when the system could technically have handled them, and some will leave in frustration. **Decision:** accept the wait during big sales only. For normal events there is no queue. We chose correctness and fairness over raw speed for the rare high-demand case.

### Trade-off 2: Database as source of truth (strong consistency) vs. Redis for holds (faster)

Doing holds in Redis would be faster, but we would then have two systems that must agree on who owns a seat, and a Redis failure could lose or duplicate holds. Holding seats directly in PostgreSQL is slower, but the atomic update and unique constraint guarantee correctness. **Decision:** PostgreSQL is the single source of truth. At only ~33 sales/s it is fast enough, so the extra speed of Redis is not worth the correctness risk.

### Trade-off 3: Stale (cached) seat map vs. real-time seat map

A real-time seat map would show exactly what is free but would put 3,000+ reads/s on the database. A map cached for ~2 seconds is cheap but can show a seat as free when it was just taken, so some users get a `409`. **Decision:** accept slightly stale data in the display because the real check happens at hold time, so correctness is unaffected.

### Trade-off 4: Hold duration (10 minutes)

Longer holds give users time to find their card and pay, but lock seats from others and let abandoned carts waste inventory. Shorter holds free seats faster but cause payment failures for slow users. **Decision:** 10 minutes normally, with a shorter 5-minute hold during big sales when demand is far above supply.

### Trade-off 5: Single primary database vs. sharding

One primary is simple and makes transactions easy. It is a single point of failure and has a throughput ceiling. **Decision:** keep one primary with a hot standby for failover. At 33 sales/s there is no need for sharding yet; we would revisit if the load grew by 10x or more.
