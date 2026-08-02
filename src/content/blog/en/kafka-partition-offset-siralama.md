---
title: 'Where a Message Lands in Kafka: Partitions, Offsets, and Ordering Guarantees'
description: 'The second post in the Kafka series: the hash mechanism that decides which partition a message lands on, why the partition count must be right from day one, the hot key risk, what an offset actually does and does not guarantee, and retention — why Kafka is a distributed commit log, not a queue.'
pubDate: 2026-07-03
tags: ['Kafka', 'Partition', 'Offset', 'Distributed Systems', 'Backend']
draft: false
---

This is the second part of the Kafka series. The first post covered how a Kafka
cluster is put together: brokers, partition distribution, replication, feeding
data in via CDC, and consumer groups
([you can read it here](/en/blog/kafka-cluster-mimarisi/)). Now we drop down one
level and focus on a **single message**: which partition does it get written to,
what is an offset for, and what exactly does Kafka guarantee about ordering?

## Which partition does a message get written to?

In Kafka, a **hash mechanism** decides which partition a message is written to.
Hash here simply means a fixed series of mathematical operations. What matters is
the outcome: a given **key** (in this example, `order_id`) always maps to a single
partition.

If `order_id` is the key in the `order` table, the order with `order_id = 5` lands
on the same partition every time. The target partition comes from this formula:

```
target partition = hash(key) % partition_count
```

For example, say there are 3 partitions (P0, P1, P2) and `order_id` is the key:

```
order_id = 5   →  hash(5)  = 7634  →  7634 % 3 = 1  →  P1
order_id = 12  →  hash(12) = 4821  →  4821 % 3 = 0  →  P0
order_id = 5   →  hash(5)  = 7634  →  7634 % 3 = 1  →  P1 (again)
```

The same input always produces the same output, which is why `order_id = 5` lands
on P1 every time. As a result, all events belonging to the same order stay
**in order** on a single partition. That order is critical: if the
"created → status changed → deleted" events of the same order are processed out of
sequence, the consumer ends up with an inconsistent picture.

### The partition count must be right from day one

The partition count deserves careful thought when the system is first built. If
today's need is 3 partitions, it is wiser to start with at least **12 or 24**,
anticipating that more capacity may be needed later.

Here is why: on an existing topic the partition count can only be **increased** —
shrinking it means deleting and recreating the topic — and increasing it changes
the results of the hash calculation. Since the partition count is a direct input
to the formula, once it changes, `order_id = 5` no longer goes to P1 but perhaps
to P2.

And Kafka provides its **ordering guarantee only within a single partition**. If
the events of the same order end up spread across two partitions, their order
(offset) can get scrambled.

### Watch out: hot keys and data skew

Making the entity ID (`order_id` in this example) the partition key is the right
design for ordering. But it carries a risk that is easy to miss: if one entity
produces **many times more** events than the others, the partition that key lands
on — and therefore the broker acting as that partition's leader — gets
overloaded. This is known as the **data skew** or **hot key** problem.

A concrete example: if a normal order produces 300 records while a huge enterprise
order produces millions, that order's key fills up a single partition while the
other partitions sit nearly empty. The load ends up unevenly distributed.

In cases like this, a **composite key** (for example,
`order_number + status group`) can spread the load more evenly — as long as the
ordering requirement is kept in mind.

## Offset

Every message written to a partition receives a sequential **offset** number:
0, 1, 2, 3… When a consumer reads a partition, it reads the messages in this
offset order.

There is one more important thing to know here: a single Kafka topic can be fed
from **multiple sources**. Two different PostgreSQL databases might be sending
data to the same topic independently, each producing its own **LSN**
(PostgreSQL's internal sequence number). Or several CDC products might be writing
to the same topic.

Kafka does not know what the source is, and it does not need to. Rather than
depending on sequence numbers from the source, it produces **its own sequence
number**: the offset. Even with a single source, Kafka still assigns offsets,
because the offset is a core part of its design. Multiple sources merely make it
all the more necessary.

### What is an offset for?

**First: ordering.** Messages within the same partition are read in offset order.
A consumer reads the message at offset 5 before the one at offset 8.

**Second: resuming where you left off.** When a consumer crashes and comes back
up, it says "I had read up to offset 42" and resumes from 43. Without offsets, a
consumer would have to either start from the beginning every time or track which
messages it had already read on its own.

### An offset does not provide semantic correctness

What an offset does **not** provide is semantic correctness. When multiple
independent sources write to the same partition, Kafka simply says "this message
reached me first" and assigns it the lower offset; it has no idea which event
actually occurred first.

Semantic ordering is preserved **at the source**. For example, events flowing in
via CDC from a single PostgreSQL are written to Kafka in the LSN order of the WAL,
so the offset order lines up with the semantic order. This is why it matters that
the events of a given entity come from **a single source**.

From this follows a critical design rule:

> The events of the same entity must come from a single source.

If the events of the same order flow into Kafka from two different databases via
two different CDC pipelines, the offset order may not match the semantic order,
leading to inconsistencies on the consumer side. The mistake in that case was made
at the **database level**. Kafka just writes incoming messages in arrival order;
whether the source is designed correctly is not Kafka's responsibility.

## How does data get from Kafka to a destination? Connect, or Flink/Spark?

So when this data needs to move from Kafka to a final destination — say, an
**Iceberg** table or **BigQuery** — what do you use?

A common misconception is that a **Flink** or **Spark** must always sit in
between. It does not. **Kafka Connect** (more precisely, a **Sink Connector**) can
move the data straight to the destination with configuration alone, without a
single line of code.

The dividing line is the **need for transformation**:

- If the data moves as-is, unchanged along the way → **Kafka Connect** is enough,
  and much lighter.
- If a heavy transformation like aggregation, stream-stream joins, or windowing is
  needed en route → this is where **Flink** or **Spark Structured Streaming**
  comes in. The key difference between the two: Flink is a native streaming engine
  that processes each event individually (event-at-a-time), so it delivers
  millisecond-level latency; Spark Structured Streaming processes events in small
  groups (micro-batch), so its latency is somewhat higher, but it integrates more
  easily with the batch ecosystem.

So there is really only one question to ask: *"Does the data need a heavy
transformation on the way to its destination?"* If the answer is **no**, Kafka
Connect; if **yes**, Flink/Spark.

## Retention: Kafka is not a queue

Finally, let's look at Kafka's **retention** behavior. Kafka does not delete
messages after writing them; by default it keeps them on disk for **7 days**. That
window can be shrunk to 7 minutes or stretched to 7 years — the decision depends
entirely on the regulations you operate under and your disk capacity.

This is precisely where it becomes clear that Kafka is not a traditional
**message queue**:

- In a queue, a message is deleted the moment a consumer reads it. It is read once
  and gone.
- In Kafka, a message is not deleted after being read; it stays on disk until the
  retention period expires.

Thanks to this, different consumer groups can read the same message
**independently**, and a consumer can rewind its offset to reprocess past
messages (replay).

> Kafka is not a queue — it is a **distributed commit log**.
