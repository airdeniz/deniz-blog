---
title: 'How Does a Kafka Cluster Work?'
description: 'A Kafka cluster architecture, explored through the concepts of brokers, partitions, leader/replica, replication, KRaft, data flow with CDC, and consumer groups. (Kafka series — part 1)'
pubDate: 2026-07-02
tags: ['Kafka', 'Cluster', 'CDC', 'Distributed Systems', 'Backend']
draft: false
---

**Apache Kafka** is an event streaming platform that moves data flowing between
systems in a distributed and durable way. Its greatest strength is that it can
instantly collect data produced at the source and distribute it, independently,
to dozens of different services that care about that data.

This post looks at how a Kafka cluster works. As an example, we'll work through a
**3-broker** cluster. First, it's worth noting this basic equation:

> **1 broker = 1 Kafka service.**

## Why do we need more than one broker?

So why do we need multiple Kafka services running in parallel? Because a single
service may not be enough to provide the required I/O power, network power, RAM,
and CPU power. Even with the best machine, at the end of the day you run into
**hardware limits**.

For this reason, you can use multiple brokers isolated from one another:

- Brokers defined within the same Docker Compose, running in separate containers,
- Multiple brokers on the same machine, fully isolated from one another,
- Brokers on separate servers, isolated from one another.

The isolation here is **about runtime**; from a data perspective the brokers are
not entirely separate. Because of needs like leader election and metadata
synchronization, they are constantly communicating with each other. What the
separation means is this: each broker actually runs on **its own CPU and its own
memory**.

## Why is data distributed?

What's really needed here is to provide the **power to distribute data**. So why is
data distributed? Because we want the data produced at the source to be processed,
and — before it's processed — to be taken from where it was produced and moved to
other services, so that the software doing the producing can focus on its own work.

This is exactly where Kafka comes in. When an order is created in an order system,
different **consumer groups** (a concept we'll touch on later) can read the same
event:

- One forwards it to the payment service,
- One triggers the shipping service,
- One sends a notification email to the customer.

They all take data from the same topic, the same event, and use it for **different
jobs**. For example, think of a stock alert service. If there's a Kafka service
feeding it data, then when a product's stock drops below 10 units, a service can be
triggered to alert the relevant team via Slack or some other application.

## How does Kafka detect changes at the source?

So how does Kafka detect a new order placed on the production side, a status change
on that order, or that the order was deleted from the system? This is where **CDC
(Change Data Capture)** tools come in.

At this point a company can take one of three paths:

- Build its own CDC tool,
- Use an open source CDC tool (for example **Debezium**),
- Buy one from a vendor (for example **Oracle GoldenGate**).

These CDC tools read any DML operation in the source database instantly from the
logs:

- **WAL** in PostgreSQL (for this, the WAL log level must be `logical`),
- **redo log** in Oracle.

And they carry the data over to Kafka. On update operations they carry this data
as both **before** and **after**. The logic works like this:

| Operation | before | after |
| --- | --- | --- |
| **INSERT** | — (no prior record in the system) | populated |
| **UPDATE** | populated | populated |
| **DELETE** | populated | — (no content, since the row is deleted) |

That is, when a brand-new record that didn't exist before is created, there can be
no before; the message at that offset contains only after. On a delete operation,
since the row is deleted, only before comes populated.

The CDC tool tracks this via a **unique column (key)** or columns in each table. If
no such definition was made on the source side, then it behaves as if all columns
together provide uniqueness — which is not really a desirable situation.

This data flowing into Kafka can be viewed either through a Kafka UI tool or through
third-party tools (for example **Redpanda**).

## Partition and broker distribution within the cluster

Now back to the situation in the cluster. Imagine 3 brokers: **Broker1, Broker2,
Broker3**. Suppose a topic named `orders` is created and given **3 partitions**:
**P0, P1, P2**.

Note this carefully: a topic is a **logical** concept. What you really need to focus
on is the **partitions and brokers**. In this scenario where the load is evenly
distributed — that is, in this example — each broker holds 2 partitions:

```
Broker 1   →   P0 (leader)    P2 (replica)
Broker 2   →   P1 (leader)    P0 (replica)
Broker 3   →   P2 (leader)    P1 (replica)
```

### What are leader and replica?

So what are the concepts of **leader** and **replica** here?

- If a partition is in the **leader** position on a broker, it means that broker
  handles the write and read operations for that partition.
- If a partition is in **replica** mode on a broker, this is also called a
  **follower** partition. Followers continuously pull data from their own leader
  partitions.

This pulling is not a periodic refresh but rather an almost **real-time streaming**
flow of data. To put a number on it, under default settings this interval is
**500 ms**.

> A partition cannot be leader on more than one broker.

### Replication factor

How many replicas a partition will have is determined by the **replication factor**
parameter:

- **replication factor = 2** → 1 leader + 1 replica. (This was the case in the example above.)
- **replication factor = 3** → 1 leader + 2 replicas.

In the real world, **replication factor = 3** is generally taken as the baseline.

A broker can hold more than one replica partition; Kafka places no limit on this.
The limit is determined entirely by the broker's hardware capacity: disk, RAM, CPU,
network bandwidth.

## From ZooKeeper to KRaft: who manages the metadata?

Up to this point, we've dealt with which broker each partition sits on, and who is
leader and who is follower. But where is all this "map" — that is, the metadata —
kept? This is precisely the part of Kafka that has changed the most in recent years.

In the old architecture, Kafka kept this metadata (the broker and leader map) not
within itself but in a separate external **ZooKeeper** cluster. This had a few
drawbacks:

- When the **controller** broker responsible for the metadata crashed, the new
  controller had to load all the metadata from ZooKeeper **from scratch**. On large
  clusters this recovery could take minutes.
- In practice, the partition count hit a ceiling around ~200 thousand.
- Two separate systems (Kafka + ZooKeeper) had to stay constantly in sync; this
  meant both a risk of metadata inconsistency and extra operational overhead
  (separate setup, separate maintenance).

With **KRaft**, this external dependency was eliminated entirely. Metadata is now
managed within Kafka itself using the **Raft consensus** algorithm. As a result,
controller failover dropped below a second, the partition limit was effectively
removed, and there was no longer a separate system to manage.

### Why is the controller count always odd?

ZooKeeper or KRaft — what both have in common is that they operate through a
**quorum (majority)** mechanism. For this coordination layer to make a decision (for
example, to elect a new controller), **more than half** of the nodes must be up. The
number of crashes that can be tolerated is found by this simple formula:

> tolerated crashes = (N − 1) / 2

Comparing odd and even numbers makes it clear why an even number is illogical:

| Node count | Needed for majority | Tolerated crashes |
| --- | --- | --- |
| **3** (odd) | 2 | 1 |
| **4** (even) | 3 | 1 |
| **5** (odd) | 3 | 2 |

Notice that **4 nodes provide no additional resilience compared to 3 nodes**; both
tolerate only 1 crash. The 4th node merely increases the cost and the
synchronization overhead. On top of that, an even number increases the
**split-brain** risk: when the cluster splits in two (a network partition), each
half is left with 2 nodes and neither can achieve a majority. That's why the
coordination layer is always given an odd number like **3, 5, 7**.

Keep in mind that this "odd number" rule applies to the **controller/quorum** layer.
The number of **brokers** that hold the actual data can be even too (4, 6, 8); what
matters there is not quorum but being able to comfortably distribute the replication
factor and balance the load. Still, since the minimum production setup requires at
least 3 brokers for `replication factor = 3`, in practice the broker side also
usually starts with an odd number (at least 3), and a general "odd number" habit has
taken hold in the industry.

## Consumer group

As for the topic of consumer groups; what's meant here is **groups of services that
read the same topic but do different jobs**. While one service routes the data
coming from Kafka into a reporting flow, another service might send an email using
that same data.

## A topic is actually read from more than one broker

Now the two things described from the beginning can be combined, because they sit
together nicely in your mind: partition distribution + consumer group. When a topic
is created, its partitions are distributed across the brokers; each partition has a
leader on one broker and follower replicas on other brokers. So a single topic is
physically written **split across the disks of multiple brokers** — you shouldn't
think of a topic as a file sitting in one place.

So how does a consumer read this distributed structure? When connecting, the
consumer provides not a single broker address but a **bootstrap servers** list.
Through this list it connects to Kafka, obtains the "which partition is on which
broker?" map (metadata), and goes directly to the relevant brokers.

Here's the nice part: multiple consumers with the same `group.id` share the
partitions among themselves. Say Consumer 1 reads Partition 0 on Broker 1, while
Consumer 2 reads Partition 1 on Broker 2. This way a single topic is read in
**parallel** from multiple brokers at the same time. And if a broker crashes, the
followers take over the leadership of those partitions and reading continues
uninterrupted.

---

So far we've covered how the cluster is set up, how data is distributed across the
brokers, and how it's read. But when you drop down to the level of a single message,
how do things work — which partition does a message land in, what is an offset for,
and how far does the ordering guarantee hold? These are covered in the second post
of the series:
**[Partitions, Offsets, and Ordering Guarantees in Kafka »](/en/blog/kafka-partition-offset-siralama/)**
