---
title: 'Why No Distributed System Can Be "CA": From CAP to PACELC via the Stock Market, Instagram, and LoL'
description: 'How do thousands of servers agree on the price of the same stock? Putting the stock market, Instagram, and online games side by side, we rebuild the CAP theorem, its blind spot, and its successor PACELC: why a partition forces you to sacrifice C or A, why the objection "isn''t the system CA when nothing is wrong?" doesn''t hold, why the speed of light makes a pure CA system physically impossible — and why an exchange won''t even settle for a quorum.'
pubDate: 2026-07-11
tags: ['Distributed Systems', 'CAP Theorem', 'PACELC', 'Consistency', 'Consensus', 'Backend']
draft: false
---

Picture a stock price on a screen, changing at sub-second intervals. Behind it, on exchanges
around the world, thousands of orders match every fraction of a second and the price flows
without pause. The first question that usually comes to mind is "is this much data big data?"
But right behind that question sits a far more interesting engineering problem: **how do
thousands of servers agree on the price of the same stock at exactly the same instant?**

This is where the most famous theorem in distributed systems — **CAP** — and its frequently
misread form come in. This post starts from live stock market data and rebuilds CAP, the
theorem's blind spot, its successor **PACELC**, and the question "why is a pure CA system
impossible?" from the ground up. Along the way we'll keep the same three systems side by
side: **the stock market, Instagram, and online games**. All three operate under the same law
of physics — and make completely opposite choices.

## First things first: is live stock market data big data?

Short answer: absolutely — it's practically a textbook example. Held up against the **5V**
framework used to decide whether data counts as "big data," stock market data checks nearly
every box on its own:

- **Velocity — the defining factor.** On an exchange, speed is everything. On NASDAQ, NYSE,
  or BIST, thousands of transactions happen every fraction of a second; prices flow in real
  time, and even a millisecond of latency can turn into millions in gains or losses.
- **Volume.** A single stock's live price looks small; but thousands of stocks, indices,
  crypto, commodities, and their order books together produce terabytes of data per day.
  Stored historically, it becomes an enormous pool.
- **Variety.** Market data isn't just "Stock X = 100." Alongside structured price/volume
  tables, modern algorithms also process semi-structured and unstructured data: regulatory
  filings, company news, executives' posts, financial reports.
- **Veracity.** Market data leaves no margin for error — what arrives must be unmanipulated,
  complete, and 100% correct. Dirty or delayed data is a catastrophe for a financial system.
- **Value.** This data turns into high financial value the instant it's processed:
  algorithmic trading, risk management, and price prediction models all derive their value
  from it.

But the real issue is none of these. What strains an exchange is not the *size* of the data
but the requirement that it be **identical everywhere, at the same instant, and 100%
correct.** That requirement collides head-on with the most fundamental trade-off in
distributed systems.

## The CAP theorem: a forced choice at the moment of partition

CAP comes from the initials of three properties:

- **C — Consistency:** every read sees the most recently written data. Whichever server you
  ask, the answer is the same.
- **A — Availability:** every request gets a response; the system doesn't say "I'm busy, come
  back later" — it keeps working.
- **P — Partition Tolerance:** when communication between servers is cut (a network
  partition), the system can still stay up.

The theorem's harsh truth: **when a network partition (P) occurs, you cannot provide C and A
at the same time.** The moment communication breaks, you must give up either consistency or
availability. In this dilemma the stock market picks a clear side: **CP** (Consistency +
Partition Tolerance). During a partition, the exchange sacrifices availability to preserve
consistency.

## So why does an exchange choose CP?

To see why, just imagine the opposite. What if the exchange were an **AP** system — one that
prioritizes availability?

Both sides would keep accepting orders even with the network cut. An investor on node A could
sell an Apple share at $150 while someone on the disconnected node B still sees the same
share at $148 and buys it. The same share gets sold twice to two different people, balances
can't reconcile, and clearing collapses. A financial catastrophe.

CP works differently: the moment communication breaks, the system shuts down the isolated
side that **cannot form a majority (quorum)** — sacrificing availability. Investors on that
side see the warning "the system is temporarily closed to transactions." The goal is
absolute: **to categorically prevent trading at an unsynchronized, doubtful price.**

> The golden rule of financial systems: *being temporarily unavailable* is always better than
> *trading on inconsistent data.* That's why exchanges and banking are always designed
> CP-first.

## "Isn't the system CA when nothing is wrong?" — CAP's blind spot

A very natural objection arises here: if the choice only happens *at the moment* of a
partition, then while the system runs fine isn't it both consistent (C) and available (A)?
Isn't it effectively **CA** in normal times?

On the surface, yes — but not by CAP's rules. Let's first clear up a misunderstanding: **the
P in CAP is not the question "is the system currently broken?" — it's a design choice.** The
real question is: "Does this system have an architecture that can survive a network split?" A
system like an exchange runs not on one giant computer but on a network of hundreds of
servers, so a partition isn't a possibility — it's a matter of **when**. While the system
runs normally, both C and A are in effect; but that doesn't make it a "CA system." A true CA
system is one that never accounted for partitions and would *collapse* the instant one hit.
An exchange doesn't collapse; it manages the network and chooses to stay on the safe (CP)
side.

So what describes normal time? CAP is completely silent on it — that's precisely its blind
spot. The theorem that fills the gap is called **PACELC**.

## PACELC: bringing normal time into the equation

PACELC extends CAP in a single sentence:

```
if  P (Partition)  →  choose between A and C
else (E, Else)     →  choose between L (Latency) and C (Consistency)
```

That is: if the network is partitioned (P), the classic CAP dilemma applies — A or C? But
even with no partition (Else), you're not off the hook: **low latency (L) or strict
consistency (C)?** PACELC's real contribution is recognizing that a price is paid even when
"all is well." Data written to one server doesn't reach the others in zero time; wait for
them and you get slower, don't wait and you're momentarily inconsistent.

With this framing, two worlds come into focus:

- **Stock market (PC/EC):** chooses consistency both during a partition (PC) and in normal
  time (EC). Even with nothing wrong, you want certainty that a price on one server has been
  written to every replica; a millisecond of confirmation time is accepted so that everyone
  sees exactly the same price.
- **Instagram (PA/EL):** chooses availability during a partition (PA) and low latency in
  normal time (EL). A like count doesn't need to reach everyone instantly and 100% correct;
  the system focuses on speed and quietly synchronizes the data in the background.

## Stock market vs Instagram: strong consistency vs eventual consistency

These two choices map to two different **consistency models** in distributed systems.

**Stock market — Strong Consistency.** When an order arrives, the data is first written to
the leader server. The system does **not consider the operation complete** until it has
copied the change to every replica and received an "I wrote it too" acknowledgment from each.
The cost is latency; but for finance, that millisecond of waiting is far more acceptable than
the risk of two servers showing two different prices.

**Instagram — Eventual Consistency.** When you like a photo, the data is written instantly to
the server nearest you and the "liked" response returns immediately. The system doesn't wait
for the hundreds of servers behind it to process it too; they reconcile among themselves in
the background, within milliseconds or seconds. When a friend visits your profile, if the
server they hit hasn't updated yet, they may see that like a few seconds late. The data is
momentarily incomplete — but nobody loses money, and the system keeps flowing.

| Feature | Stock market (PC/EC) | Instagram (PA/EL) |
| --- | --- | --- |
| **Priority** | Consistency | Low latency / speed |
| **Data model** | Strong consistency | Eventual consistency |
| **Normal time** | "Don't confirm until everyone sees the same thing" | "Do it now, the others catch up later" |
| **Tolerance** | Tolerates delay, not error | Tolerates error/delay, not slowness |

## Actually, "CA" is physically impossible

So far we've said "in normal time the system behaves like CA." But push the argument to its
conclusion and it turns out a pure CA system cannot exist **even in normal time.** And this
isn't a software limitation — it's a **law of physics.**

Picture servers **A** and **B** running in two data centers, and let's claim the system is CA
(both 100% consistent and 100% available):

```
1. Network cut (P)  →  the cable between A and B is severed; they can't talk
                       (physics: inevitable)
2. A request comes  →  A is told "set the price 100 → 105." A must stay available,
                       so it accepts. The value is now 105.
3. Same instant     →  someone asks B "what's the price?" B knows nothing of A.
   ├─ if B answers      →  it gives the old 100. The system is INCONSISTENT (C is gone)
   └─ if B stays silent →  the system is UNAVAILABLE (A is gone)
```

The instant the cable is cut, the CA design collapses mathematically: unless the system
freezes and forgets everything, it must give up either C or A. So why do some traditional
databases call themselves "CA"? Because installed on **a single node**, there is no network
and therefore no partition (P) — in that special case the system really is both consistent
and available. But once the subject is *distributed* systems, there are by definition
multiple machines, and there a partition isn't a possibility but a matter of time.

What if we say "fine, allow a nanosecond of latency — in normal time it's CA"? Even that
fails, because that nanosecond runs into the universe's most fundamental rule: **the speed of
light.** As data travels from A to B, light moves through fiber at roughly 200,000 km/s;
reaching even the server in the next room takes not zero but *some* time. During that
transfer, A has been updated and B is still unaware — so the system is, technically,
inconsistent. "Simultaneity" simply doesn't exist for two separate points in space; zero-time
synchronization would require something like quantum entanglement, and no current computer
architecture has such a mechanism.

Add the operating system's CPU scheduling queues, packet loss at the network card, and
retransmissions (TCP retransmission), and that "nanosecond" can stretch to micro- or
milliseconds at any moment. Leslie Lamport, one of the pioneers of distributed systems,
captured exactly this in his famous definition:

> "A distributed system is one in which the failure of a computer you didn't even know
> existed can render your own computer unusable."

Eric Brewer, CAP's creator, conceded the point years later: "The CA option is misleading,
because you never get to ignore partitions (P). The real choice is CP versus AP." In short,
saying "the system is CA while it runs fine" is an illusion seen by the outside user — under
the hood there is no CA, only a **latency-versus-consistency trade-off compressed to
nanoseconds and managed very well.**

## Which side do online games (LoL, FIFA) choose?

Competitive online games (LoL, Valorant, FIFA, CS) choose the **AP / EL** world by a wide
margin. The reason is simple: in a game, a millisecond of *inconsistency* is tolerable, but a
millisecond of *freeze* costs the player the match.

One important correction, though: CAP and PACELC describe not the player-to-server
relationship but synchronization **among the servers themselves.** So let's frame it on the
server side. Game companies (Riot, EA) run not one giant server but distributed **server
clusters** in each region (EU West, TR, US East) that share the load. In the relationship
among those nodes, the choice is again AP/EL:

- **Matchmaking and lobby servers:** when you queue up, your data is written immediately to
  the nearest lobby server (latency first); it doesn't wait to be fully written to every
  replica. If there's a sync delay, you see your friend hit "ready" 200 ms late — an
  acceptable inconsistency. If the network splits (P), both sides stay available (A): each
  node keeps matching its own players, and when the network heals, the data merges.
- **Game server (the match engine):** here's the real subtlety. The moment a match starts, it
  is **bound to a single server instance**. In distributed systems this is called *sharding*
  or *room-based isolation*. Match servers don't sync with each other in real time asking
  "what's Deniz's health?"; each match lives and ends fully isolated in that server's RAM.
  Real-time data exchange between servers would be a bottleneck for the server running the
  match.
- **End-of-match writes:** critical data like winner/loser and XP/LP is written to the main
  database once the match ends. But even then, if the database cluster is partitioned, the
  system doesn't make the player wait; it says "go ahead — we'll update your LP later
  (eventually)." On an exchange, that order would never move on before being 100% written.

| | Stock market (PC/EC) | Online game (PA/EL) |
| --- | --- | --- |
| **Motto** | "Wait until everyone sees the same price; freeze if needed" | "The game never stops; we fix stragglers later" |
| **Servers** | Walk together hand in hand (synchronous) | Each node runs its own way (isolated/eventual) |
| **Inconsistency** | Never | Accepted live, corrected later (rubberbanding) |

## Quorum: how the majority decides

At the heart of CP systems and partitions lies the **quorum**. A quorum (majority) is the
**minimum number of servers** that must approve for an operation to count as valid or a
decision to be made. The logic is the same as a parliament's quorum: a decision requires more
than half the members.

The formula, with total servers `N`:

```
Q = ⌊ N / 2 ⌋ + 1
```

This is why distributed systems (Kafka, ZooKeeper, Raft, Paxos) almost always run an **odd**
number of servers. The point is to be able to determine who's right at the moment of a
partition:

```
5-server cluster → quorum = ⌊5/2⌋ + 1 = 3
Network splits: 3 servers on one side, 2 on the other

The 3 side  →  "I have the majority (quorum), keep processing"
The 2 side  →  "I'm the minority (no quorum), locking myself to avoid inconsistency"
```

In modern NoSQL systems (Cassandra, DynamoDB) the quorum becomes two separate settings:
**Write Quorum (W)** — how many servers must persist a write for it to count as "written" —
and **Read Quorum (R)** — how many servers are consulted on a read. The golden rule of strong
consistency:

```
W + R > N
```

For example, in a 3-server system with `W=2, R=2` (2 + 2 > 3), every read is
**mathematically guaranteed** to hit at least one server holding the most recent data.
Without a quorum, a network split would let both sides declare themselves leader — that's
called **split-brain**; on an exchange, it means a database that collapses irreparably once
the network merges back. With a quorum, the minority goes silent and consistency survives.

## Is a quorum enough for an exchange? No — it wants full sync

Now a subtle but critical distinction. A quorum treats the approval of 3 servers out of 5 as
sufficient; the remaining 2 can lag on old data and catch up in the background. **For an
exchange, even that isn't enough.**

Why? Suppose servers A, B, and C have approved an order while D and E are still unaware — and
at that very microsecond the data center holding A, B, and C loses power. The system, per CP,
halts new orders: correct. But if those three servers' disks were physically damaged, the
approved orders — for which users were already told "executed" — worth millions vanish
entirely, because they never reached D and E. In finance this is called **RPO (Recovery Point
Objective) > 0**, and for an exchange it means ruin.

That's why exchanges run, behind the matching engine, on a model stricter than quorum:
**synchronous replication.** In Kafka terms, `acks=all`: an operation is written to **every**
primary and replica server in the group, and the "executed" notice doesn't go to the investor
until each one has said "persisted to disk." Does this slow the system down? Yes — latency
rises. That's exactly why exchanges don't spread servers across the globe; they keep them all
in the same data center, linked by ultra-fast fiber, so the cost of synchronous confirmation
stays minimal.

So is a quorum never used on an exchange? It is — but not for **writing data**; for
**electing a leader.** If the leader server crashes, the survivors hold a vote; if they hold
the majority (quorum), they elect the one with the most recent data as the new leader, and
the exchange keeps running.

> For data safety (transactions), an exchange won't settle for a quorum; it waits for 100%
> sync of all critical servers. It uses the quorum only to elect a new leader after a crash
> and to prevent split-brain.

## Summary: "CA" is a myth — the real axis is consistency vs latency

The question at the start was "is stock market data big data?" The answer was yes, but that
question merely opened the door. Behind it lies this: **there is no pure CA distributed
system** — not at the moment of partition, and not "while all is well," because even the
speed of light forbids zero-time synchronization. That's why CAP falls short; it sees the
world in black and white ("either there's a partition or there's perfection"), while systems
spend most of their time running normally. **PACELC**, which fills that gap, is the more
accurate frame: during a partition, A or C; in normal time, **L or C**.

What remains is a single real axis: **consistency or latency?** And that choice is dictated
not by theory but by the needs of the business. The stock market says "I'll wait until the
data is written everywhere without error" (PC/EC, synchronous replication, freeze the screen
if needed). Instagram and online games say "the flow must never stop; I'll fix stragglers
later" (PA/EL, eventual consistency, rubberbanding). The same law of physics, the same
CAP/PACELC trade-off — three different businesses, three different answers. There is no finer
proof that "no single distributed system fits every scenario."
