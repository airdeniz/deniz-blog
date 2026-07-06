---
title: 'Partitions, Offsets, and Ordering Guarantees in Kafka'
description: 'The second post in the Kafka series: which partition does a message get written to (hash), partition count and hot key risk, the role of the offset, ordering guarantees, and retention — why is Kafka a commit log and not a queue?'
pubDate: 2026-07-03
tags: ['Kafka', 'Partition', 'Offset', 'Distributed Systems', 'Backend']
draft: false
---

This is the second part of the Kafka series. The first post covered how a Kafka cluster is
set up: brokers, partition distribution, replication, feeding data in via CDC, and consumer
groups ([you can read the first post here](/en/blog/kafka-cluster-mimarisi/)). Now we drop
down a notch and look at the level of a **single message**: which partition does a message
get written to, what is an offset for, and what exactly does Kafka guarantee when it comes
to ordering?

## Which partition does a message get written to?

In Kafka, the partition a message is written to is determined by a **hashing mechanism**.
The hash here really just means a specific set of mathematical operations. And a given
**key** (here, `order_id`) always maps to a single partition.

If `order_id` is the key in the `order` table, then the order with `order_id = 5` is always
written to one specific partition. The partition it lands on is determined by this mechanism:

```
target partition = hash(key) % partition_count
```

For example, say there are 3 partitions (P0, P1, P2) and `order_id` is used as the key:

```
order_id = 5   →  hash(5)  = 7634  →  7634 % 3 = 1  →  P1
order_id = 12  →  hash(12) = 4821  →  4821 % 3 = 0  →  P0
order_id = 5   →  hash(5)  = 7634  →  7634 % 3 = 1  →  P1 (again!)
```

The same input always produces the same output. That's why `order_id = 5` lands on P1 every
time. This way, all events belonging to the same order stay **in order** on the same
partition. That order is critical, because if the "created → status changed → deleted" events
of the same order are processed out of order, the consumer ends up with an inconsistent
result.

### The partition count must be chosen correctly from the start

But this partition count has to be figured out very carefully when the system is built. If the
current need is 3, you should pick at least **12 or 24** partitions, since you may need more
capacity down the line.

The reason: increasing the partition count (and on an existing topic the partition count can
only be **increased** — to reduce it you have to delete the topic and recreate it) causes the
hashing mechanism to produce different results. Because the partition count plays a critical
role in the calculation. If the calculation changes, then `order_id = 5` no longer goes to P1
and might land on P2 instead.

And Kafka only provides its **ordering guarantee within a single partition**. If the events of
the same order end up spread across two different partitions, the order (offset) can get
scrambled.

### Watch out: hot keys and data skew

Making the entity ID (`order_id` in this example) the partition key is the right design for
ordering. But there's a risk that's easy to miss here: if one entity produces **many times
more** events than the others, the partition that key lands on — and therefore the broker that
is the leader of that partition — gets overloaded. This is called the **data skew** or **hot
key** problem.

A concrete example: if a normal order produces 300 records while a huge enterprise order
produces millions of records, that order's key crams a single partition full while the other
partitions sit almost empty. The load is distributed unevenly.

In cases like this, keeping the ordering requirement in mind, you can use a **composite key**
(for example, `order_number + status group`) to spread the load out a bit more.

## Offset

Every message written to a partition gets a sequential **offset** number: 0, 1, 2, 3… When a
consumer reads a partition, it reads the messages in this offset order.

There's another important thing to know here: a single Kafka topic can be fed from **multiple
sources**. For example, two different PostgreSQL databases might be sending data to the same
topic independently of each other, and each produces its own independent **LSN** (PostgreSQL's
internal sequence number). Or multiple CDC products might be writing to the same topic.

Kafka doesn't know what the source is, and it doesn't need to. For this reason, instead of
depending on the sequence numbers coming from the source, it produces **its own sequence
number**: the offset. Even if there's only a single source, Kafka still assigns an offset,
because the offset is a core part of Kafka's design. Having multiple sources just makes it even
more necessary.

### What is an offset for?

**First: ordering.** Messages within the same partition are read in offset order. A consumer
reads the message at offset 5 before the one at offset 8.

**Second: resuming where you left off.** When a consumer crashes and comes back up, it says "I
had read up to offset 42" and resumes from 43. Without offsets, the consumer would have to
either read from the very beginning every time or keep track of which messages it had read
somewhere itself.

### An offset doesn't provide semantic correctness

But an offset **doesn't provide semantic correctness**. When multiple independent sources write
to the same partition, Kafka just says "this message reached me first" and assigns it a lower
offset; it doesn't actually know which event occurred first.

Semantic ordering is preserved **at the source**. For example, events flowing in via CDC from a
single PostgreSQL are written to Kafka in the LSN order from the WAL, and the offset order lines
up with the semantic order. That's why it matters that the events of the same entity come from
**a single source**.

This leads to a critical design rule:

> The events of the same entity must come from a single source.

If the events belonging to the same order are flowing into Kafka from two different databases
via two different CDCs, the offset order may not line up with the semantic order, and this can
lead to inconsistencies on the consumer side. The mistake here is made at the **database
level**. Kafka just writes the incoming messages in order; whether the source is designed
correctly is not Kafka's responsibility.

## How is data written from Kafka to a destination? Connect, or Flink/Spark?

So when you need to take this data from Kafka and write it to a final destination — say, an
**Iceberg** table or **BigQuery** — what do you use?

A common misconception is to think there must always be a **Flink** or **Spark** in between. But
that's not required. **Kafka Connect** (or more precisely, a **Sink Connector**) can move the
data straight to the destination without writing a single line of code, using just
configuration.

The dividing line is the **need for transformation**:

- If the data will be moved as-is, unchanged along the way → **Kafka Connect** is enough and much
  lighter.
- If a heavy transformation like aggregation, stream-stream join, or windowing is needed along the
  way → this is where **Flink** or **Spark Structured Streaming** comes into play. The key
  difference between the two is this: because Flink is a native stream engine that processes each
  event one at a time (event-at-a-time), it offers millisecond-level low latency, while Spark
  Structured Streaming processes events in small groups (micro-batch), so its latency is a bit
  higher but its integration with the batch ecosystem is easier.

So the only question you need to ask is: *"Do I need to put the data through a heavy
transformation along the way before writing it to the destination?"* If the answer is **no**,
Kafka Connect; if **yes**, Flink/Spark.

## Retention: Kafka is not a queue

Finally, we need to look at Kafka **retention**. Kafka does not delete messages after writing
them; by default it keeps them on disk for **7 days**. But this 7 days can be made 7 minutes if
you want, or 7 years. It depends entirely on the regulations you're subject to and your disk
size.

And this is exactly the point where it becomes clear that Kafka is not a traditional **message
queue**:

- In a queue, a message is deleted from the queue the moment it's read by a consumer. It's read
  once and it's gone.
- In Kafka, a message is not deleted after being read; it stays on disk until the retention
  period expires.

This way, different consumer groups can read the same message **independently**; a consumer can
rewind its offset and reprocess past messages (replay).

> Kafka is not a queue, it's a **distributed commit log**.
