---
title: 'Understanding the Kafka Broker Through Oracle Eyes'
description: 'The fourth post in the Kafka series: what does a broker actually do? Is a topic the counterpart of a table, is picking a controller mandatory, how does Raft consensus work, what does 5 brokers = 5 instances mean, and how do local ports become real servers in prod? The broker, built up from scratch for someone arriving from Oracle''s client-server world.'
pubDate: 2026-07-05
tags: ['Kafka', 'Broker', 'KRaft', 'Raft', 'Distributed Systems', 'Backend']
draft: false
---

This is the fourth part of the Kafka series. The first three posts covered how a
cluster is assembled ([post 1](/en/blog/kafka-cluster-mimarisi/)), which partition a
message lands in and how the offset orders it
([post 2](/en/blog/kafka-partition-offset-siralama/)), and the partitioners that make
that decision ([post 3](/en/blog/kafka-partitioner-cesitleri/)). The broker was on
stage in all three — but always in the shadow of other concepts: partition, leader,
KRaft. In this post, the camera turns squarely onto the **broker**.

We have a specific starting point: anyone arriving from the **Oracle ecosystem**
carries a **client-server** model that years of practice have worn deep. The single
most disorienting thing about a first look at Kafka is that this model no longer
applies. So we will build the broker from scratch, testing it against those Oracle
reflexes step by step.

## What is a broker?

In its plainest form: **a broker is a single running Kafka process (instance).**
Kafka rarely runs alone; it usually runs as a **cluster** — several processes working
side by side. Every independent Kafka process in that cluster is a broker.

> **1 broker = 1 Kafka instance.**

A broker has three core duties:

- **It receives messages:** it takes delivery of data coming from producers.
- **It stores messages:** it keeps that data on disk as an append-only log.
- **It distributes messages:** when consumers ask for data, it hands it over.

Up to this point it may sound like just another kind of database server. That is
exactly where the first misconception begins. An Oracle server is a **smart hub**: it
parses the query, optimizes it, plans it, computes the result. A Kafka broker is
deliberately kept **simple** — its main job is to maintain a log and serve it fast.
The intelligence, as we will see shortly, lives not at the center but on the
**client side**.

## Is a topic a table?

The first equation someone from Oracle tends to write is: "Isn't this topic thing
just a table?" The answer: **both yes and no.**

**Why yes:** Just as a table in a relational database gathers the data of one
subject (the `users` table) in one place, a Kafka topic gathers the message stream of
one kind (the `user_activity` topic) in one place. Both are **grouping units**.

**Why no** — here are the critical differences:

| Criterion | Table (Oracle) | Topic (Kafka) |
| --- | --- | --- |
| **Data structure** | Rows/columns; modified with `UPDATE`/`DELETE` | Append-only log; data is **only appended**, the past never changes |
| **Persistence** | Permanent until deleted | Usually expires automatically after a retention period (e.g. 7 days) |
| **Purpose** | Holds the current **state** | Carries the **events/stream** flowing through |

A table answers "what does the world look like right now?"; a topic answers "what
happened, and in what order?" In Oracle, an order's latest status lives in a single
row; in Kafka, **every step** of that order's `created → paid → shipped` journey sits
in the log as a **separate event**, in sequence.

A parenthesis is due here, or we would be unfair to Oracle: history can be
accumulated there too — history/audit tables, journaling, `flashback`, or a
hand-maintained `order_log` table exist for exactly that. "Holding state" is not a
limitation of the table; it is the **design convention of the OLTP world**: OLTP
systems are built to keep and update the *latest state* of a transaction
efficiently, and accumulating history is an extra choice. In Kafka, the equation
flips — the append-only log is the **default and only** behavior; an "overwrite"
option simply does not exist. The difference is not "can it be done," but **which is
natural and which is the exception**.

> A table is a photograph; a topic is a strip of film.

One technical note as well: a topic is actually a **logical** concept. Physically,
the data lives in the **partitions** the topic is split into, and on the **disks of
the brokers** those partitions are spread across. A topic is not a single file
sitting in one place; it is written split across multiple brokers. The details of
that distribution were covered in the [first post](/en/blog/kafka-cluster-mimarisi/)
through partitions and leader/replica.

This separation is not foreign to Oracle either. There, too, a table is a logical
object; the data physically lives not "inside" the table but in **data blocks**
(block → extent → segment → **datafile**). The table is a presentation layer resting
on those blocks. Mapping roughly: Kafka's **topic** corresponds to Oracle's
**table**, while the **partition/broker disk** where the data is actually written
corresponds to Oracle's **block/datafile** layer. In both worlds, the "logical name"
and the "physical storage" are kept apart — Kafka simply spreads that split across
multiple **machines**, whereas Oracle (RAC aside) keeps it within a single server's
datafiles.

## Is choosing a controller server mandatory?

Short answer: **yes — the developer defines the candidates, Kafka picks the active
one.**

For a cluster to stay healthy, a **controller** must always exist in the background.
One of the cluster's nodes takes on this duty and becomes responsible for the
cluster's **management**: which broker is up, which one crashed, and who becomes the
new leader for the partitions of a crashed broker — it makes those calls and
announces them to every broker. Without a controller, the cluster has a management
vacuum.

Let's fix a common misunderstanding right away: being the controller is a role that,
most of the time, is **added on top of** a broker's real job rather than
**replacing** it. The same node can do the normal broker work — holding partitions,
serving producer/consumer traffic, i.e. reads and writes — while also carrying the
controller duty. The two do not exclude each other. There are two setups for this:

- **Combined mode:** The node holds both the `broker` and `controller` roles
  (`process.roles=broker,controller`). It reads and writes data and manages the
  cluster at the same time. Under the ZooKeeper architecture this was always the
  case — the active controller was an elected **ordinary data broker** that took on
  management in addition to its day job. In KRaft, this mode remains common in small
  clusters and development setups.
- **Dedicated mode:** Some nodes run with only the controller role
  (`process.roles=controller`); they hold no partitions and see no producer/consumer
  traffic — their sole job is managing metadata. This is the recommended setup for
  large production clusters, because the management work is **isolated** from the
  heavy data load.

So "a controller is just a box that manages" falls short: it is true in dedicated
mode, but in combined mode that node is simultaneously **a data broker and a
manager**.

The election side also needs splitting into two layers, because "it's elected" and
"it's not elected" are each misleading on their own:

- **The developer defines the candidate pool.** Especially in KRaft, which brokers
  may become controllers is **explicitly declared** via `process.roles` and
  `controller.quorum.voters`. Deciding "these three nodes are the controller
  candidates" is entirely in the developer's hands.
- **From that pool, Kafka picks the active (leader) controller.** Which candidate is
  actually on duty at any moment, and who takes over after a crash, is **never
  pinned by hand** — Kafka decides that internally.

The correct phrasing is not "it is never elected"; it is: **the developer sets the
candidates, Kafka elects the active leader.**

How this mechanism works is Kafka's most-changed corner:

- **Old architecture (ZooKeeper):** When brokers started, they raced on ZooKeeper;
  whoever arrived first became the controller. If it crashed, ZooKeeper noticed and
  a new one was elected from the rest.
- **New architecture (KRaft — Kafka Raft Metadata Mode):** ZooKeeper is fully out of
  the picture. Some nodes now start directly in the **controller role**
  (`process.roles=controller`); among themselves they hold a **vote** to elect the
  leader controller.

The algorithm at the heart of that vote is **Raft** — our next stop.

> The move from ZooKeeper to KRaft, and why the controller count is always odd
> (the [split-brain](/en/blog/kafka-cluster-mimarisi/) issue), were covered
> separately in the first post. Here the focus is Raft itself.

## What is the Raft consensus algorithm?

**Raft** is a protocol that lets several servers act in harmony as if they were one,
and guarantees the system keeps making **correct and consistent** decisions even
when some of them crash. Kafka's KRaft, Kubernetes' etcd, and many other distributed
systems get their consistency from it.

Before Raft, the standard for this was **Paxos** — so complex that in 2014,
researchers at Stanford published Raft with "understandability" as its explicit
goal. The algorithm rests on three pillars:

### 1. Roles

At any given moment, every server is in **exactly one** of three roles:

- **Leader:** The one in charge. It handles all client requests, writes data to its
  own log, and distributes it to the others.
- **Follower:** Passive. It applies whatever comes from the leader and updates its
  own data.
- **Candidate:** A server running for election to become the new leader when the
  leader crashes.

### 2. Leader election

When the system first starts, or when the leader crashes, an election begins:

- Every follower carries a **random** timeout counter (e.g. 150–300 ms).
- The leader continuously sends **heartbeats** to prove it is alive.
- If a follower hears no heartbeat within its timeout, it considers the leader dead,
  declares itself a **candidate**, and asks the others for votes.
- The candidate that wins the vote of the cluster's **majority (quorum)** becomes
  the new leader.

The random counter plays a critical role here: it prevents everyone from becoming a
candidate at once and splitting the vote.

### 3. Log Replication

Once a leader is elected, the real work — writing data — begins, and it runs like a
clean chain of command:

```
1. Request arrives   →  client sends a write request to the leader (x = 5)
2. Draft write       →  leader appends to its own log but does NOT say "committed"
3. Order propagates  →  leader sends this record to all followers
4. Majority ACK      →  the MAJORITY of followers say "written to my disk" (ACK)
5. Commit            →  leader marks the data "committed," returns success to the client
```

The critical point is step 4: the leader commits not on its own, but **once the
majority has acknowledged**. That is where the consistency guarantee comes from.

### Why is it so safe? (Fault Tolerance)

Say we have a quorum of 5 servers and 2 crash. The remaining 3 still form a majority
of the original 5, so they immediately elect a new leader and keep running **with no
data loss**. But if 3 crash at once, the remaining 2 cannot form a majority; the
system locks itself **to prevent data inconsistency** and accepts no new writes. The
rule is simple: a system that is not sure would rather not write than write wrong.

Why the number of tolerated crashes is `(N − 1) / 2`, and why the controller count
is therefore always **odd**, was shown in the [quorum table of the first
post](/en/blog/kafka-cluster-mimarisi/).

## 5 brokers = 5 Kafka instances

Let's make this concrete. **A 5-broker cluster** means **5 independent Kafka
processes** running in the background — not one fewer, not one more. However many
active Kafka processes you run, that is how many brokers you have.

So where do these 5 processes physically live? There are two scenarios, and they
should not be confused:

- **Production:** The 5 instances are installed on **5 separate machines** (physical
  servers, VMs, or containers). The goal is high availability: if one fails at the
  hardware level, loses power, or loses its network, the other 4 keep going.
- **Development (local):** On a single computer — **one machine** — you can bring up
  5 instances. Each gets a different `broker.id` and, to avoid clashes, a different
  **port** (9092, 9093, 9094, 9095, 9096). But when the computer shuts down, all of
  them go down together — so there is no real resilience locally; the behavior is
  merely **simulated**.

A concrete example: 5 brokers, and an `orders` topic created with 5 partitions
(replication factor = 2, so each partition has 1 leader + 1 replica). In the ideal
layout, Kafka spreads both the **leadership** of the 5 partitions and one **replica**
of each evenly across the 5 brokers:

```
Broker 1  →  P0 (leader)    P4 (replica)
Broker 2  →  P1 (leader)    P0 (replica)
Broker 3  →  P2 (leader)    P1 (replica)
Broker 4  →  P3 (leader)    P2 (replica)
Broker 5  →  P4 (leader)    P3 (replica)
```

Note: a partition's leader and its replica **never sit on the same broker** —
otherwise a single crash would take out both the leader and its backup at once. The
leaders split the read/write load evenly across the 5 processes, while the replicas
stand ready to take over leadership whenever a broker fails.

If these 5 brokers also hold the KRaft controller role, the majority (quorum) Raft
needs to make decisions is `⌊5/2⌋ + 1 = 3`. So even with 2 of the 5 brokers down,
the remaining 3 keep the system alive — precisely the mechanism described above.

## How do local ports become real servers in prod?

We said above: "a port locally, a separate machine in prod." How exactly does that
transition happen? It is the question the Oracle reflex asks most eagerly, and the
answer is surprisingly clean.

Locally, you write a `docker-compose.yml`, define 3 (or 5) brokers in it, and bind
them to different ports on localhost:

```
local
  broker 1 → localhost:9092
  broker 2 → localhost:9093
  broker 3 → localhost:9094
```

The goal is to test, on your own machine, how your code responds to a
**multi-broker** environment: if one broker is shut down, does the code fail, or
does it move over to another broker without a hitch?

In prod, ports stop doing the talking and **IP/DNS** takes over. Every server has the
standard Kafka port (9092) open; what differs is the machines themselves:

```
prod
  broker 1 → 10.0.1.10:9092
  broker 2 → 10.0.1.11:9092
  broker 3 → 10.0.1.12:9092
```

And the most elegant part:

> Moving from local to prod, **not a single line of code changes.** The only thing
> that changes is the address list in the configuration — localhost ports are
> swapped for real server IPs.

## How do developers actually use this in practice?

So far we have built the mechanics. The real question from someone with an Oracle
background is: "Fine — but how is this used day to day?" Let's look through two
different lenses.

### Through the developer's lens: "bootstrap servers" and the smart client

In Oracle, you wire up an application with a **single connection string**
(`jdbc:oracle:thin:@//host:port/service`) and connect to that server. The server is
smart; it handles the rest.

In Kafka, you never write a single server address into the code. You provide a
**bootstrap servers** list:

```
kafka.bootstrap.servers = "10.0.1.10:9092, 10.0.1.11:9092, 10.0.1.12:9092"
```

The actual mechanism works like this:

1. On startup, the application (client) connects to **any** broker in the list.
2. It asks for the cluster's current map (metadata): which topic, which partition,
   on which broker, and who leads it?
3. The broker sends the map; the client caches it in its own memory.
4. From then on, **the client itself** knows which data lives on which broker. When
   it writes, it talks directly to that partition's **leader broker**.

This is exactly where the difference lies. In Oracle, the intelligence is in the
server and the client is passive. In Kafka, **the intelligence is in the client**;
the broker just keeps the log. That is also why no load balancer is needed in
between — the client already holds the map and finds the right broker on its own.
And the reason the bootstrap list holds more than one address: the first broker you
try may be down, so the client simply tries the next one.

### Through the data engineer's lens: real-time pipelines

The **ETL** processes an Oracle veteran knows well (moving data in nightly batches)
are what data engineers turn **real-time** with Kafka. The classic scenario:

```
1. Customer adds a product to the cart      →  an "event" is produced (Producer)
2. Event is written to the 'cart_activity' topic
3. A processing application listens to the topic (Consumer: Flink / Spark / Kafka Connect)
4. Data is processed and cleaned in real time
5. Written to Snowflake/BigQuery for analytics, or to a familiar Oracle/PostgreSQL
```

So Kafka is usually not the "final stop" but the **real-time transport layer**
between systems. How a change at the source is captured instantly (via CDC) and fed
into this pipeline was covered in the [first
post](/en/blog/kafka-cluster-mimarisi/).

## Summary: Oracle ↔ Kafka

The table that helps most when translating the client-server model into Kafka:

| Criterion | Oracle (Client-Server) | Kafka (Distributed Event Stream) |
| --- | --- | --- |
| **Center** | One smart, powerful database server | Simple but very fast brokers that just keep a log |
| **Client** | Sends a query, waits for the result (passive) | Knows the cluster map, decides where to read and write on its own (active) |
| **Data** | Data **at rest** in tables is queried | Data continuously **in motion** is captured live |
| **Scaling** | Mostly vertical (a bigger machine) | Horizontal — by adding brokers to the cluster |

To tie the broker down in a single sentence: **Kafka can be pictured as a vast
logistics company.** Topics are the shipping lines, partitions are the trucks, and
brokers are the **main warehouses** where those trucks park and the cargo is sorted
and dispatched. The more warehouses (brokers), the more cargo (data) moves without
trouble — provided a copy of each shipment sits in more than one warehouse, so the
others can take over when one fails. The name for that is **replication**.

With this post, the deepest foundation stone of the series — the broker itself — is
in place. In the next post we will look at how the data spread across these brokers
is read at scale on the consumer side: **consumer groups**, rebalancing, and offset
commit strategies.
