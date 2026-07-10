---
title: 'Why Can No Distributed System Be "CA"? From CAP to PACELC, Through the Stock Market, Instagram, and LoL'
description: 'Is live stock market data big data, and how do thousands of servers agree on the same price? Why does an exchange choose CP during a network partition? Why is the answer to "isn''t the system CA when nothing is wrong?" actually PACELC? Why is a pure CA system physically impossible because of the speed of light? How do the stock market, Instagram, and online games make opposite choices between consistency and latency under the same law of physics, and why isn''t a quorum even enough for an exchange? From CAP to PACELC, rebuilt from scratch with examples.'
pubDate: 2026-07-11
tags: ['Distributed Systems', 'CAP Theorem', 'PACELC', 'Consistency', 'Consensus', 'Backend']
draft: false
---

Picture a stock price flickering on a screen at sub-second intervals. Behind it, on exchanges
around the world, thousands of orders match every fraction of a second, and the price flows
without pause. The first question that comes to mind is "is this much data big data?" But the
moment you get past that question, a far more interesting engineering drama begins: **how do
thousands of servers agree on the price of the same stock at exactly the same instant?**

This is where distributed systems' most famous theorem — **CAP** — and its frequently
misread form come in. This post starts from live stock market data and tries to rebuild CAP,
its blind spot, its successor **PACELC**, and the question "why is a pure CA system
impossible?" from scratch. Along the way we'll keep three systems side by side: **the stock
market, Instagram, and online games** — because all three, under the same law of physics, make
completely opposite choices.

## First things first: is live stock market data big data?

Short answer: absolutely — in fact it's one of the most classic examples of big data. Placed
against the **5V** framework used to test whether data is "big data," stock market data fills
nearly every item on its own:

- **Velocity — the defining factor.** On an exchange, speed is everything. On NASDAQ, NYSE, or
  BIST, thousands of transactions happen every fraction of a second; prices flow in real time,
  and even a millisecond of latency can turn into millions in gains or losses.
- **Volume.** A single stock's live price looks small; but thousands of stocks, indices,
  crypto, commodities, and their order books together produce terabytes of data per day. Stored
  historically, it becomes an enormous pool.
- **Variety.** Stock data isn't just "Stock X = 100." Alongside structured price/volume tables,
  modern algorithms also process semi- and unstructured data: regulatory filings, company news,
  executives' posts, financial reports.
- **Veracity.** There can be no margin of error in stock data — what arrives must be
  unmanipulated, complete, and 100% correct. Dirty or delayed data is a catastrophe for a
  financial system.
- **Value.** This data turns into very high financial value the instant it's processed:
  algorithmic trading, risk management, and price prediction models all derive value from it.

But the real issue is none of these. What strains an exchange is not the *size* of the data but
its requirement to be **the same everywhere, at the same instant, and 100% correct.** And that
very requirement collides with the most fundamental trade-off in distributed systems.

## The CAP theorem: a forced choice at the moment of partition

CAP comes from the initials of three things:

- **C — Consistency:** every read sees the most recently written data. Whichever server you
  ask, the answer is the same.
- **A — Availability:** every request gets a response; the system doesn't say "I'm busy, come
  back later," it keeps working.
- **P — Partition Tolerance:** when communication between servers is cut (a network partition),
  the system can still stay up.

The theorem's harsh truth is this: **when a network partition (P) occurs, you cannot provide
C and A at the same time.** The moment communication breaks, you must give up either
consistency or availability. In this dilemma the stock market picks a clear side: **CP**
(Consistency + Partition Tolerance). During a partition, the exchange sacrifices availability
to preserve consistency.

## So why does an exchange choose CP?

To see the answer, just imagine the opposite. What if the exchange were an **AP** system (one
that prioritizes availability)?

Both sides would keep accepting orders even though the network was cut. An investor on node A
could sell an Apple share at $150, while another investor on the disconnected node B still sees
and buys the same share at $148. The same share gets sold twice to two different people,
balances can't reconcile, and clearing collapses. A financial catastrophe.

CP works like this: the moment communication breaks, the system shuts down the isolated side of
the network that **cannot form a majority (quorum)** — that is, it sacrifices availability.
Investors on that side see the warning "the system is temporarily closed to transactions." The
goal is absolute: **to definitively prevent trading at an unsynchronized, doubtful price.**

> The golden rule of financial systems: *being temporarily unavailable* is always better than
> *trading on inconsistent data.* That's why exchanges and banking are always designed CP-first.

## "Isn't the system CA when nothing is wrong?" — CAP's blind spot

A very natural objection arises here: if the choice is made *at the moment of* partition, then
while the system runs fine isn't it both consistent (C) and available (A)? Isn't the system
actually **CA** in normal times?

On the surface, yes — but not by CAP's rules. First, let's fix a misunderstanding: **the P in
CAP does not mean "is the system currently broken?"; it's a design choice.** The question is:
"Does this system have an architecture that can survive when the network splits?" A system like
an exchange runs not on one giant computer but on a network of hundreds of servers; so a
partition isn't a possibility but a matter of **when**. While the system runs normally both C
and A are in effect, but that doesn't make it a "CA system" — because a real CA system is one
that would *collapse* the instant a partition hits, one that never accounted for partitions. An
exchange doesn't collapse; it manages the network and chooses to stay on the safe (CP) side.

So what explains normal time? CAP is completely silent on this — that's its blind spot. The
theorem that fills this gap is called **PACELC**.

## PACELC: bringing normal time into the equation

PACELC extends CAP in a single sentence:

```
if  P (Partition)  →  choose between A and C
else (E, Else)     →  choose between L (Latency) and C (Consistency)
```

That is: if the network is partitioned (P), the classic CAP dilemma applies, A or C? But even
when there's no partition (Else) you're not off the hook: **low latency (L) or strong
consistency (C)?** PACELC's brilliance is seeing that a price is paid even when "all is well."
Because data written to one server doesn't reach the others in zero time; if you wait for them
you get slower, if you don't you stay inconsistent for a moment.

With this framing, two worlds become clear:

- **Stock market (PC/EC):** chooses consistency both in partition (PC) and in normal time (EC).
  Even without a problem, you want to be sure a price on one server has been written to all
  replicas; a millisecond of confirmation time is accepted to make sure everyone sees the exact
  same price.
- **Instagram (PA/EL):** chooses availability in partition (PA) and low latency in normal time
  (EL). A like count doesn't need to reach everyone 100% correct instantly; the system focuses
  on speed and quietly synchronizes the data in the background.

## Stock market vs Instagram: strong consistency vs eventual consistency

These two choices correspond to two different **consistency models** in distributed systems.

**Stock market — Strong Consistency.** When an order arrives, the data is first written to the
leader server. The system does **not consider the operation done** until it copies that change
to all replica servers and gets an "I wrote it too" acknowledgment from them. The cost is
latency; but for finance, that millisecond of delay is far more acceptable than the risk of two
different prices appearing on two servers.

**Instagram — Eventual Consistency.** When you like a photo, the data is instantly written to
the server nearest you and the "liked" response returns immediately. The system doesn't wait for
the hundreds of servers behind it to process it too; they reconcile the data among themselves
slowly (in the background, within milliseconds or seconds). When your friend visits your
profile, if the server they connect to hasn't updated yet, they may see that like a few seconds
late. The data is momentarily incomplete — but no one loses money, and the system keeps flowing.

| Feature | Stock market (PC/EC) | Instagram (PA/EL) |
| --- | --- | --- |
| **Priority** | Consistency | Low latency / speed |
| **Data model** | Strong consistency | Eventual consistency |
| **Normal time** | "Don't confirm until everyone sees the same thing" | "Do it now, the others catch up later" |
| **Tolerance** | Tolerates delay, not error | Tolerates error/delay, not slowness |

## Actually, "CA" is physically impossible

So far we've said "in normal time the system behaves like CA." But taken to its conclusion, it
turns out a pure CA system can't exist **even in normal time.** And this isn't a software
limitation — it's a **law of physics.**

Picture servers **A** and **B** running in two data centers, and let's claim this system is CA
(both 100% consistent and 100% available):

```
1. Network cut (P)  →  the cable between A and B is severed, they can't talk (physics:
                       inevitable)
2. A request comes  →  A is told "set price 100 → 105." A must be available, so it
                       accepts. The value is now 105.
3. Same instant     →  someone asks B "what's the price?" B is unaware of A.
   ├─ if B answers    →  it says the old 100. The system is INCONSISTENT (A dies, C dies)
   └─ if B stays silent →  the system is UNAVAILABLE (A dies, A dies)
```

The instant the cable is cut, the CA design collapses mathematically: unless the system freezes
and loses its memory, it must give up either C or A. So why do some traditional databases call
themselves "CA"? Because if you install them on **a single node**, there's no network, so no
partition (P) — in that special case the system is both consistent and available. But when the
subject is *distributed* systems, by definition there are multiple machines, and there a
partition isn't a possibility but a matter of time.

And what if we say "let there be nanosecond latency if it must, in normal time it's CA"? Even
that fails — because that nanosecond runs into the universe's most fundamental rule: **the speed
of light.** As data travels from A to B, light moves through fiber at ~200,000 km/s; so reaching
even the server in the next room takes not zero but *some* time. During that transfer A is
updated and B is still unaware — so the system is technically inconsistent. "Simultaneity"
doesn't physically exist for two separate points; zero-time synchronization would require
something like quantum entanglement, which current computer architectures don't have.

Add the operating system's CPU scheduling queues, packet losses on the network card, and
retransmissions (TCP retransmission), and that "nanosecond" can leap to micro- or milliseconds
at any moment. Leslie Lamport, one of the pioneers of distributed systems, described exactly
this famously:

> "A distributed system is one in which the failure of a computer you didn't even know existed
> can render your own computer unusable."

Eric Brewer, CAP's creator, admitted this years later: "The CA option is misleading; because
you have no chance to ignore partitions (P). The real choice is CP or AP." In short, saying
"the system is CA while it runs fine" is an illusion the outside user sees — under the hood
there's no CA, only a **latency-vs-consistency battle reduced to nanoseconds and managed very
well.**

## Which side do online games (LoL, FIFA) choose?

Competitive online games (LoL, Valorant, FIFA, CS) choose the **AP / EL** world by a wide
margin. The reason is simple: in a game a millisecond of *inconsistency* is tolerable, but a
millisecond of *freeze* loses the player the game.

But an important correction is needed: CAP and PACELC talk not about the player-to-server
relationship but about synchronization **among the servers themselves.** So let's frame it on
the server side. Game companies (Riot, EA) run not one giant server but distributed **server
clusters** in each region (EU West, TR, US East) that share the load. In the relationship among
those nodes, the choice is again AP/EL:

- **Matchmaking and lobby servers:** when you join the queue, your data is written immediately
  to the nearest lobby server (latency priority); it doesn't wait to be fully written to all
  replicas. If there's a sync delay, you see your friend hit "ready" 200 ms late — an acceptable
  inconsistency. If the network splits (P), the sides stay available (A): each node keeps
  matchmaking its own players, and when the network heals the data merges.
- **Game server (the match engine):** here's the real genius. The moment a match starts, it is
  **bound to a single server instance**. In distributed systems this is called *sharding* or
  *room-based isolation*. Match servers don't sync with each other in real time asking "what's
  Deniz's health?"; each match lives and ends fully isolated in that server's RAM. Real-time
  data exchange between servers would be a bottleneck for the server running the match.
- **End-of-match writes:** critical data like winner/loser and XP/LP is written to the main
  database when the match ends. But even then, if there's a partition in the database cluster,
  the system doesn't make the player wait; it says "go ahead, we'll update your LP later
  (eventually)." On an exchange, that order would never move on before being 100% written.

| | Stock market (PC/EC) | Online game (PA/EL) |
| --- | --- | --- |
| **Motto** | "Wait until everyone sees the same price, freeze if needed" | "The game never stops; we fix stragglers later" |
| **Servers** | Walk together hand in hand (synchronous) | Each node runs its own way (isolated/eventual) |
| **Inconsistency** | Never | Accepted live, corrected later (rubberbanding) |

## Quorum: how the majority decides

At the heart of CP systems and partitions lies the **quorum**. A quorum (majority) is the
**minimum number of servers** that must approve for an operation to count as valid or a decision
to be made. The logic is the same as a parliament's quorum: a decision needs more than half the
members. With total servers `N`:

```
Q = ⌊ N / 2 ⌋ + 1
```

That's why in distributed systems (Kafka, ZooKeeper, Raft, Paxos) the number of servers is
almost always chosen **odd**. The reason is to determine who's right at the moment of a
partition:

```
5-server cluster → quorum = ⌊5/2⌋ + 1 = 3
Network splits: 3 servers on one side, 2 on the other

The 3 side  →  "I'm the majority (quorum present), keep processing"
The 2 side  →  "I'm the minority (no quorum), I lock myself to avoid inconsistency"
```

In modern NoSQL systems (Cassandra, DynamoDB) the quorum turns into two separate settings:
**Write Quorum (W)**, how many servers must persist a piece of data for it to count as
"written"; and **Read Quorum (R)**, how many servers are asked to confirm on a read. The golden
rule of strong consistency:

```
W + R > N
```

For example, in a 3-server system with `W=2, R=2` (2 + 2 > 3), every read is **mathematically
guaranteed** to hit at least one server holding the most up-to-date data. Without a quorum, when
the network splits both sides could declare themselves leader — this is called **split-brain**;
on an exchange that means a database that collapses irreparably when the network merges. Thanks
to the quorum, the minority goes silent and consistency is preserved.

## Is a quorum enough for an exchange? No — it wants full sync

Now a subtle but critical distinction. A quorum considers the approval of 3 out of 5 servers
enough; the remaining 2 may stay on old data and reconcile in the background. **For an exchange,
even that isn't enough.**

Why? While servers A, B, C have approved an order but D and E are still unaware, if at that very
microsecond the data center holding A, B, C loses power — the system, per CP, halts new orders,
correct. But if the disks of those three servers were physically damaged, the approved orders
(for which the user was told "executed") worth millions vanish entirely because they aren't on D
and E. In finance this is called **RPO (Recovery Point Objective) > 0**, and it means the ruin
of the exchange.

That's why exchanges run, behind the matching engine, on a model stricter than quorum —
**synchronous replication.** In Kafka terms, `acks=all`: an operation is written to **all**
primary and replica servers in the group at once, and the "executed" notice doesn't go to the
investor until every one of them says "persisted to disk." Does this slow the system down? Yes,
latency rises. That's exactly why exchanges don't spread servers across the globe; they keep
them all in the same data center, linked by ultra-fast fiber, so the cost of synchronous
confirmation stays minimal.

So is a quorum never used on an exchange? It is — but not for **writing data**, for **electing a
leader.** If the leader server crashes, the survivors hold a vote; if they're the majority
(quorum) they elect the one among them with the most up-to-date data as the new leader, and the
exchange keeps running.

> For data safety (transactions) an exchange isn't satisfied with a quorum; it waits for 100%
> sync of all critical servers. It uses the quorum only to elect a new leader when one crashes
> and to prevent split-brain.

## Summary: "CA" is a myth, the real axis is consistency vs latency

The question at the start of the road was "is stock market data big data?"; the answer was yes,
but it was that question that opened the real door. What emerges behind it is this: **there is
no pure CA distributed system** — neither at the moment of partition nor "while all is well,"
because even the speed of light forbids zero-time synchronization. That's why CAP is
insufficient; it sees the world in black and white ("either there's a partition or there's
perfection"), whereas systems spend most of their time running normally. The theorem that fills
that gap, **PACELC**, is the more correct frame: in partition A or C, in normal time **L or C.**

The single real axis that remains is this: **consistency or latency?** And this choice is
dictated not by theory but by the needs of the business. The stock market says "I'll wait until
the data is written everywhere without error" (PC/EC, synchronous replication, freeze the screen
if needed). Instagram and online games say "the flow must never stop, I'll fix stragglers later"
(PA/EL, eventual consistency, rubberbanding). The same law of physics, the same CAP/PACELC
trade-off — but three different businesses, three different answers. That is the finest proof
that "there is no single distributed system that fits every scenario."
