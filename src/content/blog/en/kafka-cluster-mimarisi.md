---
title: 'Anatomy of a Kafka Cluster: Brokers, Partitions, and Replication'
description: 'The inner workings of Kafka through a three-broker cluster: how data spreads across brokers, what leaders and replicas do, what changed when KRaft took over metadata from ZooKeeper, and how CDC tools capture changes at the source. (Kafka series — part 1)'
pubDate: 2026-07-02
tags: ['Kafka', 'Cluster', 'CDC', 'Distributed Systems', 'Backend']
draft: false
---

**Apache Kafka** is an event streaming platform that moves data between systems
in a distributed, durable way. Its greatest strength is this: it collects data
the moment it's produced at the source and distributes it to dozens of different
services that care about it — each one independent of the others.

In this post we'll walk through how a Kafka cluster works, step by step, using a
**3-broker** cluster as our example. Before we start, keep this basic equation
in mind:

> **1 broker = 1 Kafka service.**

## Why do we need more than one broker?

Why isn't a single Kafka service enough — why do several need to run in
parallel? Because one service may not be able to supply the required I/O
throughput, network bandwidth, RAM, and CPU power on its own. Even on the most
powerful machine money can buy, you eventually run into **hardware limits**.

That's why multiple brokers are run in isolation from one another:

- Brokers defined in the same Docker Compose file, each in its own container,
- Multiple brokers on the same machine, fully isolated from each other,
- Brokers spread across separate servers.

The isolation here is at the **runtime level**; from a data perspective, the
brokers are not cut off from each other. They communicate constantly, driven by
needs like leader election and metadata synchronization. What the separation
really means is this: each broker runs on **its own CPU and its own memory**.

## Why is data distributed?

The real goal is gaining the **power to distribute data**. So why distribute it
at all? Because data produced at the source needs to be processed, and before
that, it needs to be taken from where it was produced and moved to other
services — so the software producing it can focus on its actual job.

This is exactly where Kafka comes in. When a new order is created in an order
system, different **consumer groups** (we'll get to this concept shortly) can
read the same event:

- One forwards it to the payment service,
- One triggers the shipping service,
- One sends a notification email to the customer.

They all take data from the same topic, the same event, but use it for
**different jobs**. Picture a stock alert service: fed by Kafka, it can
automatically notify the relevant team through Slack or another application
whenever a product's stock drops below 10 units.

## How does Kafka detect changes at the source?

So how does Kafka learn about a new order on the production side, a status
change on that order, or its deletion? This is where **CDC (Change Data
Capture)** tools come in.

A company has three paths to choose from here:

- Build its own CDC tool,
- Use an open source CDC tool (for example, **Debezium**),
- Buy one from a vendor (for example, **Oracle GoldenGate**).

CDC tools read every DML operation in the source database straight from its
logs, the moment it happens:

- The **WAL** in PostgreSQL (this requires the WAL level to be `logical`),
- The **redo log** in Oracle.

They then forward the data to Kafka. For update operations, the data is carried
in both its **before** and **after** states. The logic works like this:

| Operation | before | after |
| --- | --- | --- |
| **INSERT** | — (no prior record in the system) | populated |
| **UPDATE** | populated | populated |
| **DELETE** | populated | — (no content, since the row is gone) |

In other words, when a record that never existed before is created, there can be
no before; the message at that offset carries only an after. On a delete, the
row no longer exists, so only the before arrives populated.

The CDC tool does this tracking through a **unique column (key)** — or a group
of columns — in each table. If no such definition exists on the source side, it
treats all columns together as if they guaranteed uniqueness, which is hardly a
desirable situation.

The data flowing into Kafka can be inspected either through the Kafka UI or
through third-party tools such as **Redpanda**.

## Partition and broker distribution within the cluster

Back to the cluster. Say we have 3 brokers: **Broker1, Broker2, Broker3**.
Suppose a topic named `orders` is created and given **3 partitions**: **P0, P1,
P2**.

Here's a critical distinction: a topic is a **logical** concept. What actually
deserves your attention is the **partitions and the brokers**. In this example,
with the load evenly balanced, each broker ends up holding 2 partitions:

```
Broker 1   →   P0 (leader)    P2 (replica)
Broker 2   →   P1 (leader)    P0 (replica)
Broker 3   →   P2 (leader)    P1 (replica)
```

### What are leader and replica?

So what do **leader** and **replica** mean in this diagram?

- If a partition sits on a broker in the **leader** position, that broker
  handles the reads and writes for that partition.
- If a partition sits on a broker in **replica** mode, it's also called a
  **follower** partition. Followers continuously pull data from their leader
  partitions.

This pulling is not a periodic refresh but a near **real-time stream** of data.
To put a number on it: under default settings, the interval is **500 ms**.

> A partition cannot be the leader on more than one broker at once.

### Replication factor

How many replicas a partition gets is set by the **replication factor**
parameter:

- **replication factor = 2** → 1 leader + 1 replica. (That was the example above.)
- **replication factor = 3** → 1 leader + 2 replicas.

In the real world, **replication factor = 3** is the usual baseline.

A broker can hold more than one replica partition; Kafka imposes no limit here.
The limit is drawn entirely by the broker's hardware capacity: disk, RAM, CPU,
and network bandwidth.

## From ZooKeeper to KRaft: who manages the metadata?

So far we've been talking about which partition lives on which broker, and who
is leader versus follower. But where is that "map" — the metadata — actually
kept? This is precisely the part of Kafka that has changed the most in recent
years.

In the old architecture, Kafka kept this metadata (the broker and leader map)
not within itself but in a separate, external **ZooKeeper** cluster. That came
at a price:

- When the **controller** broker responsible for the metadata crashed, the new
  controller had to load all of it from ZooKeeper **from scratch**. On large
  clusters, that recovery could take minutes.
- In practice, the partition count hit a ceiling at around ~200 thousand.
- Two separate systems (Kafka + ZooKeeper) had to stay in constant sync, which
  meant both a risk of metadata inconsistency and extra operational overhead
  (separate setup, separate maintenance).

**KRaft** eliminated this external dependency entirely. Metadata is now managed
inside Kafka itself, through the **Raft consensus** algorithm. The results:
controller failover dropped below a second, the partition ceiling effectively
disappeared, and there was no longer a second system to operate.

### Why is the controller count always odd?

ZooKeeper and KRaft share one mechanism: **quorum (majority)**. For this
coordination layer to make a decision — electing a new controller, say — **more
than half** of its nodes must be up. A simple formula gives the number of
crashes it can tolerate:

> tolerated crashes = (N − 1) / 2

Put odd and even counts side by side and it becomes clear why an even number
makes no sense:

| Node count | Needed for majority | Tolerated crashes |
| --- | --- | --- |
| **3** (odd) | 2 | 1 |
| **4** (even) | 3 | 1 |
| **5** (odd) | 3 | 2 |

Notice that **4 nodes buy you no extra resilience over 3**; both tolerate just
1 crash. The fourth node only adds cost and synchronization overhead. Worse, an
even count amplifies the **split-brain** risk: if the cluster splits in two (a
network partition), each half is left with 2 nodes and neither can reach a
majority. That's why the coordination layer is always given an odd number —
**3, 5, 7**.

One distinction worth keeping straight: this "odd number" rule applies to the
**controller/quorum** layer. The number of **brokers** holding the actual data
can perfectly well be even (4, 6, 8); what matters there isn't quorum but
distributing the replication factor comfortably and balancing the load. Still,
since a minimum production setup needs at least 3 brokers for
`replication factor = 3`, the broker side usually starts with an odd number (at
least 3) too, and a general "odd number" habit has settled into the industry.

## Consumer group

A consumer group refers to **groups of services that read the same topic but do
different jobs**. While one service routes the data coming from Kafka into a
reporting flow, another might use that same data to send an email.

## A topic is actually read from more than one broker

Now we can join the two threads we've been following, because together they
complete the picture: partition distribution + consumer groups. When a topic is
created, its partitions are spread across the brokers; each partition has a
leader on one broker and follower replicas on others. A single topic is
therefore physically written **split across the disks of multiple brokers** —
don't picture a topic as a file sitting in one place.

So how does a consumer read this scattered structure? When connecting, a
consumer supplies not a single broker address but a **bootstrap servers** list.
Through that list it connects to Kafka, obtains the "which partition is on
which broker?" map (the metadata), and goes straight to the relevant brokers.

Here's the most efficient part: multiple consumers sharing the same `group.id`
divide the partitions among themselves. While Consumer 1 reads Partition 0 on
Broker 1, Consumer 2 reads Partition 1 on Broker 2. A single topic is thus read
in **parallel** from several brokers at once. And if a broker crashes, the
followers take over leadership of its partitions and reading continues without
interruption.

---

We've now covered how the cluster is set up, how data is distributed across the
brokers, and how it's read back. But what happens at the level of a single
message — which partition does it land in, what is an offset for, and how far
does the ordering guarantee actually hold? That's the subject of the second post
in the series:
**[Partitions, Offsets, and Ordering Guarantees in Kafka »](/en/blog/kafka-partition-offset-siralama/)**
