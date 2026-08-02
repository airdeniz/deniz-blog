---
title: 'Which Partition Does a Message Land In? Kafka Partitioner Strategies'
description: 'The third post in the Kafka series: the partitioner that decides which partition each message lands in. Hash-based, round-robin, sticky and custom strategies; what each choice costs you in ordering guarantees, and how often each one actually shows up in production.'
pubDate: 2026-07-03
tags: ['Kafka', 'Partition', 'Partitioner', 'Distributed Systems', 'Backend']
draft: false
---

This is the third installment of the Kafka series. The first post covered how a
cluster is set up ([read it here](/en/blog/kafka-cluster-mimarisi/)); the second
looked at which partition a message gets written to, the role of the offset,
and ordering guarantees
([read it here](/en/blog/kafka-partition-offset-siralama/)). The core formula
from that second post was this: a message lands in a partition via
`hash(key) % partition_count`.

But who actually makes that decision? And more importantly: can the behavior be
changed? Could you, say, tell Kafka "skip the hash, just deal messages out to
partitions in turn"?

You could. The component that makes this decision is called the
**partitioner**, and it comes in several variants. But — and this is the real
point of the post — every choice buys you something while giving something else
up. So the options are worth examining one by one, price tags included.

## What is a partitioner?

The **partitioner** is the component that runs on the producer side and answers
one question: "which partition should this message go to?" **Right before** the
producer sends a message, the partitioner steps in and determines the target
partition number.

Kafka's default behavior works like this: if the message has a **key**, the key
is hashed and the result is taken modulo the partition count (the
`hash(key) % partition_count` from the second post). If there is no key
(`null`), an entirely different strategy takes over. Understanding what that
"different strategy" is means looking at the partitioner variants.

On the producer side, the behavior is switched with a single configuration
setting naming the partitioner class to use. Let's walk through the options in
order.

## 1. Hash-Based (Keyed) Partitioner — the default

This is the mechanism the second post described in detail. The message is given
a key (`order_id`, `user_id`, and so on), and Kafka picks the partition based
on that key's hash.

```
order_id = 5   →  hash(5) % 3  →  P1  (always)
```

The critical property: **the same key always goes to the same partition.** All
events belonging to one order ("created → paid → shipped") therefore stay in a
single partition, in offset order, **sequential**.

> If you need ordering, this is almost always the right answer.

That is why this strategy is the choice in every scenario where events of the
same entity must be processed in the correct order — CDC (Change Data Capture),
finance, e-commerce. The pipeline in this project uses exactly this, with
`order_id` as the key.

## 2. Round-Robin Partitioner

Round-Robin deals messages out to partitions **in turn**, without looking at
the key at all: the first message to P0, the second to P1, the third to P2, the
fourth back to P0…

```
message 1 → P0
message 2 → P1
message 3 → P2
message 4 → P0
```

At first glance it looks appealing: load spreads across partitions with perfect
evenness, and the hot-key risk disappears. But it carries a heavy price.

### Round-Robin breaks ordering

Imagine three events from the same user arriving back to back:

```
User_A → Order Created      → P0
User_A → Payment Completed  → P1
User_A → Shipment Prepared  → P2
```

Kafka guarantees ordering **only within a partition** — we saw this in the
second post. Because these three events land in three separate partitions,
consumers read them independently and asynchronously. The consumer handling
"Payment Completed" may get there before the one handling "Order Created." The
result: a payment is processed for an order that doesn't exist yet — a classic
**race condition** and data inconsistency.

> Round-Robin loses the ordering of related events. It is never used anywhere
> that ordering matters.

## 3. Sticky Partitioner — the modern default (key = null)

But what if the only goal is "no key, just spread the data evenly"? You don't
need Round-Robin for that. Since Kafka 2.4, the default mechanism that takes
over when the key is `null` is the **Sticky Partitioner**, and it has fully
retired the old Round-Robin.

The difference comes down to performance:

- **Round-Robin** sends every single message to a different partition. Network
  batches leave constantly without ever filling up — which means high
  **overhead**.
- **Sticky Partitioner** accumulates messages into batches instead. Until a
  batch fills, it writes every message to the **same** partition; once the
  batch is full and sent, it moves on to the next partition.

The load still ends up evenly distributed across partitions — but because the
batches travel full, throughput improves noticeably. For scenarios where order
is irrelevant — metrics collection, IoT sensor data, clickstream — this is the
ideal choice.

Note: like Round-Robin, the Sticky Partitioner does **not** guarantee ordering
— it simply does the same job far more efficiently.

## 4. Custom Partitioner

Sometimes none of the built-in strategies fit the business logic. In that case
you implement the `Partitioner` interface yourself and write a custom class.

The classic scenario is the **multi-tenancy** and **hot partition** problem.
Picture a SaaS company: one enormous "Premium" customer on one side, hundreds
of small "Free" customers on the other. Left to the hash, the Premium
customer's millions of events can pile onto a single partition and lock it up —
the very **data skew** problem from the second post.

A custom partitioner isolates the load like this: messages from the Premium
customer are spread across a few partitions reserved for it, while all the Free
customers are gathered into a single partition. Schematically:

```
Premium tenant  →  P0, P1, P2  (load is distributed)
Free tenants    →  P3          (all gathered into one partition)
```

The real idea here: partition selection is no longer decided by math but by
**business logic**. That door opens for special needs like multi-tenancy,
co-location (deliberately keeping related data in the same partition), or
co-partitioning. But it has a cost: responsibility for every guarantee —
ordering, hot keys, rebalancing — now rests on the **developer's** shoulders.

## How much is each one actually used?

In theory, all four options are on the table. The actual distribution in
production environments is decidedly lopsided:

| Partitioner | Usage Share | Most Common Where | Ordering Guarantee |
|---|---|---|---|
| **Hash-Based (Keyed)** | ~75–80% | CDC, finance, e-commerce, event streams | Yes (for the same key) |
| **Sticky / Default (key=null)** | ~15–20% | Metrics, IoT, clickstream | No |
| **Custom** | ~1–5% | Multi-tenancy, co-location | Depends on the scenario |
| **Round-Robin** | <1% | Testing / rare legacy systems | No |

The reasons behind the imbalance:

- **Hash-Based dominates** because in most real projects, data consistency and
  processing order come before everything else. The `INSERT → UPDATE → DELETE`
  events of the same record (the row with the same primary key) must be
  processed in order; otherwise the target replica gets corrupted.
- **Sticky has become the standard for keyless data** and pushed the old
  Round-Robin out of service.
- **Custom is rare** because it is only written when the default algorithm
  falls short in a special case — and it is costly both to write and to
  maintain.
- **Round-Robin is almost never used**: it breaks ordering by ignoring the key,
  and by dealing messages out one at a time it ships batches before they fill —
  in small pieces — which drives up the request count and the latency. For
  keyless data, something better (Sticky) already exists.

## Summary: the decision matrix

When designing a new pipeline, one question usually sets the direction:

> **Does the order of related events matter?**

- **Yes** → give the message a meaningful **key** (`order_id`, `user_id`) and
  go with the default **Hash-Based** partitioner. Order is preserved.
- **No — the only goal is maximum throughput and even distribution** → leave
  the key `null`; the **Sticky Partitioner** handles it automatically and
  efficiently.
- **None of the defaults fit the business logic** (hot-tenant isolation,
  co-location) → then, and only then, write a **Custom Partitioner**.

Round-Robin can in practice be crossed off the list. Anywhere you'd want
"keyless but evenly distributed," its modern, faster successor — the Sticky
Partitioner — is already on duty.

In the next post, we'll look more closely at how data written to partitions
this way gets read at scale on the consumer side — consumer groups,
rebalancing, and offset commit strategies.
