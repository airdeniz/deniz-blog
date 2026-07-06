---
title: 'What Is a Kafka Partitioner? Partitioning Strategies and Real-World Usage'
description: 'The third post in the Kafka series: what is the partitioner that decides which partition a message goes to? Hash-based, round-robin, sticky and custom partitioners; the ordering-guarantee trade-off and how often each one is actually used in the real world.'
pubDate: 2026-07-03
tags: ['Kafka', 'Partition', 'Partitioner', 'Distributed Systems', 'Backend']
draft: false
---

This is the third installment of the Kafka series. The first post covered how a
cluster is set up ([read it here](/en/blog/kafka-cluster-mimarisi/)); the second
covered which partition a message gets written to, the role of the offset, and
ordering guarantees ([read it here](/en/blog/kafka-partition-offset-siralama/)). In
that second post we said this: a message lands in a partition via
`hash(key) % partition_count`.

But who makes that decision? And more importantly: can this behavior be changed? Can
you, for example, say "don't use the hash, just spread messages across partitions in
order"?

The answer: yes. The mechanism that makes this decision is called the **partitioner**,
and it comes in more than one flavor. But — and this is the real point of this post —
every choice buys you one thing while costing you another. It's worth going through them
one by one.

## What is a partitioner?

The **partitioner** is the component that runs on the producer side and answers the
question "which partition should this message go to?" **Right before** the producer sends
a message, the partitioner kicks in and produces the target partition number.

Kafka's default behavior is this: if the message has a **key**, it takes the hash of that
key and applies modulo by the partition count (the `hash(key) % partition_count` from the
second post). If there's no key (`null`), a different strategy takes over. The details of
that "different strategy" are exactly what require us to look at the partitioner variants.

On the producer side, this behavior is changed with a single configuration setting that
specifies which partitioner class to use. Now let's look at the options one by one.

## 1. Hash-Based (Keyed) Partitioner — the default

This is the mechanism described in detail in the second post. The message is given a key
(`order_id`, `user_id`, etc.) and Kafka picks the partition based on the hash of that key.

```
order_id = 5   →  hash(5) % 3  →  P1  (always)
```

The most critical property here: **the same key always goes to the same partition.** This
way, all events belonging to the same order ("created → paid → shipped") stay in a single
partition, in offset order, **sequential**.

> If you need ordering, this is almost always the right answer.

That's why this strategy is used in every scenario where events of the same entity must be
processed in the correct order — CDC (Change Data Capture), finance, e-commerce, and so on.
The pipeline in this project uses exactly this (with `order_id` as the key).

## 2. Round-Robin Partitioner

Round-Robin distributes messages across partitions **in order** without looking at the key
at all: the first message to P0, the second to P1, the third to P2, the fourth back to P0…

```
message 1 → P0
message 2 → P1
message 3 → P2
message 4 → P0
```

At first glance it's appealing: the load spreads perfectly evenly across partitions, and
there's no hot-key risk. But there's a big price to pay here.

### Round-Robin breaks ordering

Suppose three events from the same user arrive in sequence:

```
User_A → Order Created      → P0
User_A → Payment Completed  → P1
User_A → Shipment Prepared  → P2
```

Kafka provides its ordering guarantee **only within a partition** — we covered this in the
second post. Because these three events land in three different partitions, consumers read
them independently and asynchronously. The consumer processing "Payment Completed" may act
faster than the one processing "Order Created." The result: a payment gets processed while
no order exists yet — a classic **race condition** and data inconsistency.

> Round-Robin loses the ordering of related events. It is never used anywhere ordering
> matters.

## 3. Sticky Partitioner — the modern default (key = null)

But what if the goal is "no key is provided, just distribute the data evenly"? You don't
need Round-Robin for that. Since Kafka 2.4, the default mechanism that kicks in when the key
is `null` is the **Sticky Partitioner**, and it has completely replaced the old Round-Robin.

The difference is in performance:

- **Round-Robin** sends every single message to a different partition. This causes network
  batches to be shipped constantly without ever filling up — that is, high **overhead**.
- **Sticky Partitioner** collects messages into batches. Until a batch fills up, it writes
  all messages to the **same** partition; once the batch fills and is sent, it moves on to
  the next partition.

The end result is that the load still spreads evenly across partitions, but because the
batches are fully filled, throughput improves noticeably. This is the ideal choice in
scenarios where order doesn't matter — metrics collection, IoT sensor data, clickstream.

Note: the Sticky Partitioner, just like Round-Robin, does **not** provide an ordering
guarantee — it simply doesn't provide one in a more performant way.

## 4. Custom Partitioner

Sometimes none of the built-in strategies fit the business logic. In that case you implement
the `Partitioner` interface by hand and write a custom class.

The most classic scenario is the **multi-tenancy** and **hot partition** problem. Suppose
there's a SaaS company: one enormous "Premium" customer, plus hundreds of small "Free"
customers. If you leave it to the hash, the Premium customer's millions of events can land
in a single partition and lock it up — the very same **data skew** problem from the second
post.

With a custom partitioner, the load can be isolated like this: if a message comes from a
Premium customer, it's spread across a few reserved partitions, while all Free customers are
funneled into a single partition. Schematically:

```
Premium tenant  →  P0, P1, P2  (load is distributed)
Free tenants    →  P3          (all funneled into one partition)
```

The idea here is that partition selection is now determined not by math but by **business
logic**. This path opens up for special needs like multi-tenancy, co-location (deliberately
keeping related data in the same partition), or co-partitioning. But it has a cost:
responsibility for all the guarantees — ordering, hot keys, rebalancing — now lies with the
**developer**.

## In the real world, how much is each one used?

In theory, all four options are on the table. But the actual distribution in production
environments is quite lopsided:

| Partitioner | Usage Share | Most Common Where | Ordering Guarantee |
|---|---|---|---|
| **Hash-Based (Keyed)** | ~75–80% | CDC, finance, e-commerce, event streams | Yes (for the same key) |
| **Sticky / Default (key=null)** | ~15–20% | Metrics, IoT, clickstream | No |
| **Custom** | ~1–5% | Multi-tenancy, co-location | Depends on the scenario |
| **Round-Robin** | <1% | Testing / rare legacy systems | No |

Why is it so lopsided?

- **Hash-Based is the overwhelming majority**, because in most real projects data
  consistency and processing order matter more than anything else. The `INSERT → UPDATE →
  DELETE` events of the same record (the row with the same primary key) must be processed in
  order; otherwise the target replica gets corrupted.
- **Sticky has become the standard for keyless data** and has retired the old Round-Robin.
- **Custom is rare**, because it's only written when the default algorithm isn't enough for a
  special case — and it's costly both to write and to maintain.
- **Round-Robin is almost never used**: it breaks ordering because it ignores the key, and it
  distributes messages to partitions one at a time, so batches are shipped in small pieces
  before filling up — which increases the request count and raises latency. For keyless data
  there's already something better (Sticky).

## Summary: the decision matrix

When designing a new pipeline, a single question usually sets your direction:

> **Does the order of related events matter?**

- **Yes** → give the message a meaningful **key** (`order_id`, `user_id`) and go with the
  default **Hash-Based** partitioner. Order is preserved.
- **No, the only concern is maximum throughput and even distribution** → leave the key
  `null`, and the **Sticky Partitioner** handles it automatically and performantly.
- **None of the defaults fit the business logic** (hot-tenant isolation, co-location) → then,
  and only then, write a **Custom Partitioner**.

Round-Robin can, in practice, be crossed off the list. Everywhere you'd want "keyless but
evenly distributed," its modern and faster form — the Sticky Partitioner — is already at
work.

In the next post, we'll take a closer look at how the data written to partitions this way is
read at scale on the consumer side — consumer groups, rebalancing, and offset commit
strategies.
