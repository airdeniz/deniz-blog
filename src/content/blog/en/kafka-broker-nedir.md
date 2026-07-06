---
title: 'What Is a Broker in Kafka, for Someone Coming from Oracle?'
description: 'The fourth post in the Kafka series: what does a broker actually do? Is a topic a table, is choosing a controller mandatory, how does Raft consensus work, what does 5 brokers = 5 instances mean, and how do local ports turn into real servers in prod? The Kafka broker, rebuilt from scratch for someone coming from the Oracle client-server world.'
pubDate: 2026-07-05
tags: ['Kafka', 'Broker', 'KRaft', 'Raft', 'Distributed Systems', 'Backend']
draft: false
---

This is the fourth part of the Kafka series. In the first three posts we covered how a
cluster is set up ([post 1](/en/blog/kafka-cluster-mimarisi/)), which partition a message
lands in and how it is ordered by offset ([post 2](/en/blog/kafka-partition-offset-siralama/)),
and the partitioners that make that decision ([post 3](/en/blog/kafka-partitioner-cesitleri/)).
In all three the broker was constantly on stage, but always seen through other concepts
(partition, leader, KRaft). In this post the camera turns directly onto the **broker**.

To do that, we use a specific starting point: someone coming from the **Oracle ecosystem**
carries a **client-server** mindset that has settled in over years. That is also the thing
that most catches you off guard when you first look at Kafka. So we'll build up the broker
from scratch, comparing it against those Oracle reflexes.

## What is a broker?

At its simplest: **a broker is a single running Kafka process (instance).** Kafka usually
doesn't run alone; it runs as a **cluster** formed by several processes standing side by
side. Each independent Kafka process in that cluster is a broker.

> **1 broker = 1 Kafka instance.**

A broker has three basic jobs:

- **It receives messages:** it takes in the data sent by the producers.
- **It stores messages:** it keeps that data on disk as an append-only log.
- **It distributes messages:** when consumers ask for data, it delivers it to them.

So far this sounds like "well, this is basically a database server." And that's exactly
where the first misconception begins. An Oracle server is a **smart hub**: it parses the
query, optimizes it, plans it, and computes the result. A Kafka broker, on the other hand,
is deliberately kept **simple** — it essentially maintains a log and serves that log
quickly. The intelligence, as we'll see shortly, is not at the center but on the **client
side**.

## Is a topic a table?

Coming from Oracle, the first equation you tend to make is this: "Isn't this topic thing
really just a table?" The answer: **both yes and no.**

**Why yes:** Just as a table in a relational database holds the data for a specific subject
(the `users` table) together, a topic in Kafka holds the message stream belonging to a
specific type (the `user_activity` topic) together. Both are a **grouping unit**.

**Why no** — the critical differences are here:

| Criterion | Table (Oracle) | Topic (Kafka) |
| --- | --- | --- |
| **Data structure** | Rows/columns; modified with `UPDATE`/`DELETE` | Append-only log; data is **only appended to the end**, the past never changes |
| **Persistence** | Permanent until deleted | Usually dropped automatically at the end of a retention period (e.g. 7 days) |
| **Purpose** | Holds the current **state** | Carries the **events/stream** flowing past |

So a table answers "what is the state of the world right now?"; a topic answers "what
happened, in order?" In Oracle you see the latest status of an order in a single row; in
Kafka **each step** of that order's `created → paid → shipped` journey sits in the log as a
**separate event**, in order.

We should open a parenthesis here, otherwise it would be unfair: history can be
accumulated in Oracle too — history/audit tables, journaling, `flashback`, or a
hand-maintained `order_log` table exist for exactly this. In other words, "holding state"
is not a limitation of the table; it's the **design convention of the OLTP world**: OLTP
systems are built to efficiently keep and update the *latest state* of a transaction, and
accumulating history is an extra choice. In Kafka the equation is reversed — the
append-only log is the **default and only** behavior; there simply is no "overwrite"
option. The difference isn't "can it be done," but **which is natural and which is the
exception**.

> A table is a photograph; a topic is a strip of film.

And a technical note: a topic is actually a **logical** concept. Physically, the data lives
in the **partitions** the topic is divided into, and on the **disks of the brokers** those
partitions are spread across. So a topic is not a single file sitting in one place; it is
written by being split across multiple brokers. The details of this distribution were
explained in the [first post](/en/blog/kafka-cluster-mimarisi/) through partitions and
leader/replica.

This distinction isn't foreign to Oracle either. In Oracle a table is a logical object too;
the data is physically kept not "inside" the table but in **data blocks** (block → extent →
segment → **datafile**). The table is a presentation layer sitting on top of those blocks.
Roughly mapping: the **topic** in Kafka corresponds to the **table** in Oracle; the
**partition/broker disk** where the data is actually written corresponds to the
**block/datafile** layer in Oracle. In both worlds the "logical name" and the "physical
storage" are separate from each other — it's just that Kafka spreads this split across
multiple **machines**, whereas Oracle (outside of RAC) keeps it in the datafiles of a
single server.

## Is choosing a controller server mandatory?

Short answer: **yes, mandatory — the developer defines the candidates, but Kafka chooses
the active one.**

For a cluster to run in good health, there must always be a **controller** in the
background. One of the nodes in the cluster takes on the controller role, and that node
becomes responsible for the **management** of the cluster: it makes decisions like which
broker is up, which one has crashed, and who will be the new leader of the partitions on a
crashed broker, and then it announces them to all the other brokers. Without a controller,
management chaos breaks out in the cluster.

But we need to correct a misunderstanding right away: being the controller is a role that,
most of the time, is **layered on top of** a broker's actual job rather than **replacing**
it. That is, the same node can both do the normal broker work — holding partitions,
handling producer/consumer traffic, i.e. reads/writes — and carry out the controller duty.
The two are not mutually exclusive. There are two different setups for this:

- **Combined mode:** The node is in both the `broker` and `controller` roles
  (`process.roles=broker,controller`). It both reads and writes data and takes on
  management. In the ZooKeeper architecture it was always like this anyway — the active
  controller was an elected **ordinary data broker** that took on management on top of its
  real job. In KRaft, this mode is common in small and development clusters too.
- **Dedicated mode:** There are nodes running only in the controller role
  (`process.roles=controller`); these hold no partitions and see no producer/consumer
  traffic — their only job is to manage metadata. This is the recommended setup in large
  production clusters, because the management work is **isolated** from the heavy data
  load.

So saying "a controller is just a box that manages" would be incomplete: it's true in
dedicated mode, but in combined mode that node is simultaneously **both a data broker and a
manager**.

We also need to split the election side into two layers, because both "it's elected" and
"it's not elected" are misleading on their own:

- **The developer defines the candidate pool.** Especially in KRaft, which brokers can be
  controllers is **explicitly defined** via `process.roles` and `controller.quorum.voters`.
  Saying "let these three nodes be the controller candidates" is entirely in the developer's
  hands.
- **From that pool, Kafka chooses the active (leader) controller.** Which candidate is
  actually on duty at a given moment, and who takes over after a crash, is **not pinned by
  hand** — Kafka decides this internally.

So the correct phrasing isn't "it's never elected"; it's **the developer sets the
candidates, Kafka picks the active leader.**

How this distinction works is Kafka's most-changed area:

- **Old architecture (ZooKeeper):** When brokers started up, they entered a race on
  ZooKeeper; whoever got there first became the controller. If it crashed, ZooKeeper
  detected this and a new one was elected from the rest.
- **New architecture (KRaft — Kafka Raft Metadata Mode):** ZooKeeper is fully out of the
  picture. Now some brokers are started directly in the **controller role**
  (`process.roles=controller`); they hold a **vote** among themselves to elect the leader
  controller.

The algorithm at the heart of this vote is **Raft**. So that's the next stop.

> The transition from ZooKeeper to KRaft and why the controller count is always given as
> odd (the [split-brain](/en/blog/kafka-cluster-mimarisi/) issue) were covered separately
> in the first post. Here the focus is on Raft itself.

## What is the Raft consensus algorithm?

**Raft** is a protocol that makes several servers work in harmony as if they were a single
server, and that guarantees the system keeps making **correct and consistent** decisions
even if some of them crash. Kafka's KRaft, Kubernetes' etcd, and many distributed systems
achieve consistency with it.

Before Raft, the standard for this was **Paxos**; but it was so complex that in 2014
researchers from Stanford released Raft, focused on "understandability." It rests
comfortably on three pillars:

### 1. Roles

At any given moment, each server is in **exactly one** of these three roles:

- **Leader:** The boss. It handles all requests from clients, writes the data to its log,
  and distributes it to the others.
- **Follower:** Passive. It applies what comes from the leader and updates its own data.
- **Candidate:** The server that runs in an election to become the new leader when the
  leader crashes.

### 2. Leader election

When the system first starts up or when the leader crashes, an election process begins:

- Each follower has a **random** timeout counter inside it (e.g. 150–300 ms).
- The leader continuously sends **heartbeats** to prove it is alive.
- If a follower doesn't receive a heartbeat from the leader for that duration, it says "the
  leader is dead," declares itself a **candidate**, and asks the others for votes.
- The candidate that gets the vote of the **majority (quorum)** of the cluster becomes the
  new leader.

The random counter here matters: it prevents everyone from becoming a candidate at the same
time and splitting the votes.

### 3. Log Replication

After a leader is elected, the real work — writing data — begins, and it runs like a proper
chain of command:

```
1. Request arrives   →  client sends a write request to the leader (x = 5)
2. Draft write       →  leader appends to its own log but does NOT say "committed"
3. Order propagates  →  leader sends this record to all followers
4. Majority ACK      →  the MAJORITY of followers say "I wrote it to my disk" (ACK)
5. Commit            →  leader marks the data "committed," returns success to the client
```

The critical point is step 4: the leader doesn't commit the data on its own — it commits it
**once the majority approves**. That's where the consistency guarantee comes from.

### Why is it so safe? (Fault Tolerance)

Say there's a quorum of 5 servers and 2 of them crash. The remaining 3 servers, since they
form the majority of the total 5, immediately elect a new leader and keep running **with no
data loss**. But if 3 servers crash at once, the remaining 2 can't form a majority; the
system locks itself **to prevent data inconsistency** and accepts no new writes. It's
saying "if I'm not sure, I won't write wrong."

Why the number of tolerated crashes is `(N − 1) / 2`, and why the controller count is
therefore always given as **odd**, was shown in the [quorum table in the first
post](/en/blog/kafka-cluster-mimarisi/).

## 5 brokers = 5 Kafka instances

Now let's make it concrete so it really settles in. **A cluster with 5 brokers** means **5
independent Kafka processes** running in the background. Not one fewer, not one more. As
many active Kafka processes as you run, that's how many brokers you have.

So where do these 5 processes physically live? There are two scenarios, and you shouldn't
mix them up:

- **Production:** The 5 instances are installed on **5 separate machines** (physical
  server, VM, or container). The goal is high availability: if one crashes at the hardware
  level, loses power, or has its network cut, the other 4 keep running.
- **Development (local):** On a single computer, on a **single machine**, you can bring up 5
  instances. Each is given a different `broker.id` and, so they don't clash, a different
  **port** (9092, 9093, 9094, 9095, 9096). But when the computer shuts down, naturally all
  of them go at once — that's why there's no real resilience locally; the behavior is only
  **simulated**.

A concrete example: there are 5 brokers and a `orders` topic with 5 partitions was created
(let the replication factor be 2, i.e. each partition has 1 leader + 1 replica). In the
ideal scenario, Kafka distributes both the **leadership** of the 5 partitions and a
**replica** of each in a balanced way across the 5 brokers:

```
Broker 1  →  P0 (leader)    P4 (replica)
Broker 2  →  P1 (leader)    P0 (replica)
Broker 3  →  P2 (leader)    P1 (replica)
Broker 4  →  P3 (leader)    P2 (replica)
Broker 5  →  P4 (leader)    P3 (replica)
```

Note: a partition's leader and its replica are **never on the same broker** — otherwise,
when that broker crashed, both the leader and the backup would go at once. While the
read/write load is split evenly across the 5 processes thanks to the leaders, the replicas
also keep a backup ready to take over leadership when a broker crashes.

If these 5 brokers are also in the KRaft controller role, the majority (quorum) needed to
make a decision under Raft is `⌊5/2⌋ + 1 = 3`. So even if 2 of the 5 brokers crash, the
remaining 3 keep the system up — the very mechanism described above.

## How do local ports turn into real servers in prod?

Above we said "a port locally, a separate machine in prod." So how exactly does the
transition happen? This is what's most wondered about with the Oracle reflex, and the
answer is surprisingly clean.

Locally you write a `docker-compose.yml`, define 3 (or 5) brokers in it, and bind them to
different ports on localhost:

```
local
  broker 1 → localhost:9092
  broker 2 → localhost:9093
  broker 3 → localhost:9094
```

The goal is to test on your own machine how the code you write reacts to a **multi-broker**
environment: "If one broker is shut down, does the code blow up, or does it fail over to
another broker seamlessly?"

Once you go to prod, it's no longer ports but **IP/DNS** that do the talking. On each server
the standard Kafka port (9092) is open, but the machines are separate:

```
prod
  broker 1 → 10.0.1.10:9092
  broker 2 → 10.0.1.11:9092
  broker 3 → 10.0.1.12:9092
```

And the best part:

> When moving from local to prod, **not a single line of code changes.** The only thing
> that changes is the list of addresses in the configuration — the localhost ports are
> swapped out for the real server IPs.

## So how do developers actually use this in real life?

Up to here we've built the mechanics. But this is exactly where someone coming from Oracle
really asks "okay, but how do they use this in practice?" Let's look at it through two
different lenses.

### From the developer's view: "bootstrap servers" and the smart client

In Oracle, when you connect an application you give a **single connection string**
(`jdbc:oracle:thin:@//host:port/service`) and you connect to that server. The server is
smart; it handles the rest.

In Kafka, you don't write a single server address into the code. You give a **bootstrap
servers** list:

```
kafka.bootstrap.servers = "10.0.1.10:9092, 10.0.1.11:9092, 10.0.1.12:9092"
```

Here's the magic:

1. When the application (client) starts, it connects to **any** broker in this list.
2. It tells it: "Give me the current map (metadata) of the cluster — which topic, which
   partition, on which broker, who is the leader?"
3. The broker sends this map, and the client takes it into its own memory.
4. From now on **the client itself** knows which data is on which broker. When it's going to
   write data, it goes directly and talks to the **leader broker** of that partition.

The difference is exactly here. In Oracle the intelligence is on the server and the client
is passive. In Kafka **the intelligence is on the client**; the broker just keeps the log.
That's why you don't even need to put a load balancer in between — since the client already
knows the map, it goes to the right broker on its own. The reason you write more than one
address in the bootstrap list is this: the first broker you try to connect to may have
crashed, so the client tries the next one on the list.

### From the data engineer's view: real-time pipelines

The **ETL** processes someone with an Oracle background knows (moving data with nightly
batches), data engineers make **real-time** with Kafka. The classic scenario:

```
1. Customer adds a product to the cart      →  an "event" is produced (Producer)
2. Event is written to the 'cart_activity' topic
3. A processing application listens to the topic (Consumer: Flink / Spark / Kafka Connect)
4. Data is processed and cleaned in real time
5. Written to Snowflake/BigQuery for analysis, or to a familiar Oracle/PostgreSQL
```

So Kafka is often not the "final stop" but the **real-time transport layer** between
systems. How a change at the source is captured instantly (via CDC) and enters this
pipeline was explained in the [first post](/en/blog/kafka-cluster-mimarisi/).

## Summary: Oracle ↔ Kafka

The table that helps most when translating the client-server model to Kafka is this:

| Criterion | Oracle (Client-Server) | Kafka (Distributed Event Stream) |
| --- | --- | --- |
| **Center** | A single smart, powerful database server | Simple but very fast brokers that just keep a log |
| **Client** | Sends a query, waits for the result (passive) | Knows the cluster's map, manages on its own where to write and read (active) |
| **Data** | Queries data **at rest** in a table | Captures continuously **flowing** (in motion) data in real time |
| **Scaling** | Mostly vertical (a more powerful machine) | Horizontal — by adding brokers to the cluster |

To tie the broker down in one sentence: **Kafka can be thought of as a huge logistics
company.** Topics are the shipping lines, partitions are the trucks, and brokers are the
**main warehouses** where these trucks park and where the cargo is sorted and distributed.
The more you increase the number of warehouses (brokers), the more cargo (data) is
transported without trouble. As long as a copy of the cargo sits in several warehouses at
once — so that if something happens to one of the warehouses the others can take over — and
the name for that is **replication**.

With this post we've put the deepest foundation stone of the series — the broker itself —
in place. In the next post we'll take a closer look at how we read the data distributed
across these brokers at scale on the consumer side — at **consumer groups**, rebalancing,
and offset commit strategies.
