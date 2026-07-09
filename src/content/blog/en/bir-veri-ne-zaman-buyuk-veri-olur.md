---
title: 'When Does Data Become "Big Data"? Where Do We Draw the Line?'
description: 'Contrary to popular belief, big data does not mean "unstructured data," "a large company''s data," or "a real-time system." Could you have big data with only structured data? What does "location data" in telecom actually refer to, and what else flows behind it? Where is the line between a small insurer and a giant one? Does real-time require big data? A post that rebuilds the answer from scratch, through the architectural difference that truly separates traditional tools from big data tools.'
pubDate: 2026-07-09
tags: ['Big Data', 'Distributed Systems', 'Telecom', 'Real-Time', 'Data Engineering', 'Backend']
draft: false
---

The term "big data" almost always travels with a wrong connotation in everyday speech. For
some it is a pile of **unstructured** data — voice recordings, videos, social media posts.
For others it is the data held by **large companies** — a small firm's data is "normal," a
huge institution's is "big." For yet others, anything flowing in **real-time** is big data.

All three are wrong. More precisely, all three touch the edge of big data while missing the
real line. This post tries to knock down these three misconceptions one by one and rebuild
what remains — the real line, the moment data actually becomes "big data."

As a starting point, let's use a concrete scene, because it's exactly this kind of scene that
blurs big data the most: a manager in a telecom meeting who, while talking about big data,
keeps saying **"location data"** — as if big data consisted of one single thing, position.
Underneath that sentence hide several misunderstandings about big data. Let's unpack them one
at a time.

## Misconception 1: "Big data is unstructured data"

This is the most common shortcut: say "big data" and voices, images, logs, and tweets come to
mind. But if there were **only structured data** on the table, could you still speak of big
data?

**Absolutely.** Data being in a neat row-and-column format does not stop it from being "big."
When defining big data, what matters is not the **type** of data but the famous **3V** rule:
Volume, Velocity, and Variety. Even if Variety alone is limited to structured data, the other
two are more than enough to create big data.

**Volume.** When the number of rows in a structured database reaches the quadrillions, that
data is big. A global bank's entire credit card transaction history, or an airline's live
booking and flight data — all of it sits in relational databases (RDBMS) in clean SQL format.
But once the size hits petabytes, a traditional single server can no longer handle it. This
is exactly where structured big data begins.

**Velocity.** When data flows at very high speed and must be processed within milliseconds, a
big data problem arises no matter how clean its structure is. Telemetry flowing from IoT
devices, smart meters, or vehicle sensors is usually in an extremely structured format like
`[Device_ID, Timestamp, Temperature, Voltage]`. But when it streams in from millions of
devices per second, you need technologies like Kafka or Spark Streaming to capture and
process it.

The origin story of big data confirms this. Google's Bigtable paper, or Apache Hadoop (HDFS +
MapReduce), emerged not to process video and audio, but to solve the problem of traditional
databases (Oracle, SQL Server, MySQL) being confined to a single server's disk and RAM and
thus unable to **scale up vertically**. Even with only structured data, the need to link
thousands of cheap servers horizontally would still have arisen. Today, billion-dollar
technologies like Hive, Presto, Snowflake, and BigQuery are fundamentally designed to query
**structured data** quickly at massive scale.

> Data being "orderly" does not change the fact that it is flowing at a massive scale and a
> dizzying speed. Even when Variety is low, the moment Volume and Velocity break traditional
> methods, we are talking about big data.

## What does "location data" mean in telecom?

Now back to the manager. When he said "location data," did he really mean physical position?
Yes — but in the eyes of a telecom manager, "location data" is far more than the simple pin
on a map; it is a massive big data warehouse in its own right.

Even while your phone sits in your pocket with the screen off, it constantly talks to the
nearest base stations in the background; this is called **signaling data**. In the network of
an operator with millions of subscribers, information about which base station each subscriber
connects to within milliseconds, and which one they hand over to, flows continuously.
Millions of rows per second, billions per day, of raw data (location × timestamp) are
produced. Processing this is squarely a **Spark / Kafka / Hadoop** job.

But the real point is turning these raw coordinates into **semantic location data**.
Latitude-longitude alone means nothing; combined with big data analytics it turns into:

- **Mobility matrices:** how many thousands of people move from one district to another
  between 08:00 and 09:00 in the morning — pure gold for urban planning and public transport.
- **Home/Work areas:** where a subscriber spends their nights (home) and where they are during
  business hours (work).
- **Live footfall:** how many thousands are gathered in a stadium or concert venue right now,
  and which districts that crowd came from.

That's why location data is not an ordinary log for an operator but a core asset that directly
generates revenue and runs operations: it decides where to build a new base station
(**network planning**); with all personal information stripped out (**anonymized**), it is
sold as a commercial product to municipalities or retail chains ("where should we open the new
store?"). When the manager said "location data," he didn't simply mean "where is Deniz right
now?"; he meant that flowing pool — born from millions of people moving over time — that a
traditional database could never hold.

## But location is only the tip of the iceberg

The manager stressed location because location is the easiest and "coolest" data type to
explain to outsiders. Yet in an operator's kitchen, what truly melts the big data
infrastructure lies far beyond location. Roughly three categories:

**1. Network and signaling data.** Every technical contact the phone makes with the network
produces billions of rows of logs:

- **CDR (Call Detail Records):** who called whom, when, for how long; when an SMS was sent.
  Content is never stored — only metadata.
- **IPDR / data consumption:** how much traffic went to which app, how much latency or packet
  loss occurred on the network.
- **Device diagnostics:** the device's brand, model, operating system, and the signal quality
  it currently receives (RSRP/RSRQ). Processed live to determine whether a fault stems from
  the device or the base station.

**2. Customer interaction and financial data (CRM & Billing).** Operational data that looks
ordinary on its own but reaches big data scale when multiplied by millions of subscribers:
text analysis of call center and chatbot logs (NLP to catch complaint trends), billing and
payment history (the most critical data for **churn** — predicting who will cancel), and the
digital footprints inside the operator's mobile app.

**3. DPI (Deep Packet Inspection).** The technically heaviest part. The packet headers of the
internet traffic passing through the network are inspected to derive which services are being
used. For security, legal obligations, and network optimization, terabytes of DPI data per
second must flow through big data systems in **real-time**.

There's a saying among telecom people: *"CRM data is what the customer claims; location and
network data is what actually happens."* Billing, CRM, and package info exist in other
companies too. But live location and mobility is a mine unique to operators, one that can't be
imitated. That's probably why the manager highlighted it as the "crown of big data" — but that
doesn't mean the rest of the vast data ocean isn't there.

## Misconception 2: "Big data is a big company's data"

A natural question follows: if volume matters, then is a small insurance company's data
"normal" while a much larger insurer's is "big data"? Do we draw the line by company size?

No. What draws the line is not the size of the company but the **nature of the data** and
whether processing it **structurally forces you to change your technology.**

The most concrete technical line is this: if you can load your data onto **a single powerful
server** (SQL Server, Oracle, PostgreSQL) and query it in a reasonable time by increasing its
RAM and CPU (**vertical scaling**), then no matter how large it is, it is traditional data.
The moment that data exceeds a single machine's limits — won't fit on disk, RAM runs out — and
you are forced to split it into pieces and process it on **a cluster of multiple machines
(distributed architecture)**, that's when you cross the line.

Let's make it concrete with the insurance example. Say it's Turkey's largest insurer;
millions of customers, policies, claim records.

- **Still "normal" data:** 20 years of policy history, customer and financial records sit in
  structured tables totaling, say, 2–3 TB. This runs comfortably on a single well-configured
  Oracle/MSSQL. The data is "large," but technologically it is not Big Data — it is a classic
  **Data Warehouse** matter.
- **The moment it crosses the line:** if that same company changes how it works, fits devices
  to customers' cars, collects driving behavior (instant speed, hard braking, cornering,
  location) second by second to produce personalized policy pricing — the telemetry streaming
  in from millions of cars instantly creates a Volume and Velocity explosion. Or if it starts
  analyzing millions of high-resolution damage photos, videos, and voice recordings from
  accidents with AI (Variety), the line has long been crossed.

You can test where your own data sits with three questions:

| Criterion | Traditional Data (Small/Medium) | Big Data |
| --- | --- | --- |
| **How do I store it?** | On a single database server (RDBMS) | On distributed file systems (HDFS, S3) or NoSQL |
| **How do I query it?** | Standard SQL + indexes, in seconds | With distributed engines (Spark, Presto), in parallel |
| **How fast does it grow?** | Monthly/yearly, predictable, linear | Within seconds, via logs/sensors, exponential |

> The line is not a quantitative size (there is no "over 5 TB is big" threshold); it is a
> **qualitative architectural shift.** The moment your classic tools start buckling under the
> data, you've hit the big data line.

## Misconception 3: "Anything real-time is big data"

These two are always mentioned side by side in presentations, as if they were synonyms. Yet a
data being **real-time** and a data being **big data** are two technically completely separate
dimensions. One is a "speed and architecture" choice; the other is a "scale and volume"
problem.

Because they are separate axes, the clearest way is to lay it out as a matrix:

| | Traditional / Small Data | Big Data |
| --- | --- | --- |
| **Batch (delayed)** | A small e-commerce site reporting last night's sales in the morning | A bank scanning 10 years of card spending nightly with Spark for risk analysis |
| **Real-time (live)** | Courier tracking, stock price screen, live chat | Netflix personalizing the homepage from millions of viewers' live clicks |

The bottom-right cell is where the two concepts overlap — and it's what glues them together in
people's minds. But the bottom-left cell shows that real-time is possible **without** big data.
Because the heart of real-time is not in the size of the data but in its processing
**latency**:

- **Stock / crypto price:** all that flows is `[Ticker, Price, Time]`. The row is light; but
  you must render the price on screen within milliseconds. It's real-time — yet it needs no
  Hadoop cluster behind it; a light WebSocket + Redis/MQTT queue solves it.
- **Smart thermostat (IoT):** measures temperature, sends it, the server says "turn off the
  boiler." A few bytes per second. Fully real-time, but there is no big data here.
- **Live chat:** while two people message, data must be delivered in milliseconds (real-time),
  but what's carried is a few kilobytes of plain text.

So why are they mentioned together so often? Two valid reasons. First, big data's **most
valuable form** is now real-time: big data used to be processed only to ask "what happened
yesterday?"; today, to stop credit card fraud, a model fed by petabytes of past data must run
within that very **1 second** the card is swiped. Second, the tools are shared: Kafka, Flink,
and Spark Streaming can carry 10 rows per second just as they can carry 10 million. But using
the same tool doesn't mean the two problems are the same.

> A small, fast-flowing stream is real-time too (small data), and so is a tsunami-like, vast,
> fast-flowing ocean (big data). Real-time is about the **speed** of the flow; big data is
> about its **size.**

## So what actually draws the line: the tools

Once all three misconceptions (format, company size, real-time) fall, a single solid criterion
remains: **are your tools buckling under the data or not?** So the real distinction must be
sought in the architecture of the tools. The philosophy that separates traditional tools from
big data tools is one sentence: *do we process the data in one powerful center, or split it and
distribute it to an army of computers?*

**Architecture: Scale-Up vs. Scale-Out.** Traditional tools (RDBMS) run within a single
server's limits; as data grows you add more RAM/CPU to that server (**vertical scaling**) — and
at some point you hit the hardware's physical limit and astronomical costs. Big data tools are
built on **distributed architecture**: they spread the workload across a "cluster" of hundreds
of cheap machines linked by a network. Data grew? You don't beef up the server; you add a few
more cheap machines to the cluster (**horizontal scaling**).

**Storage.** The traditional side keeps data in tables with strict rules bound to a predefined
schema (**schema-on-write**). The big data side uses **distributed file systems** (HDFS, S3,
GCS) that accept data raw; the data is split into blocks distributed across different machines
in the cluster and copied so it won't be lost (**replication**). The schema is applied not when
writing but when **reading** (**schema-on-read**).

**Processing.** In a traditional system the processing goes to the data: a single engine runs
the query. In big data it's the reverse — **the processing (code) is sent to the machine where
the data sits** (data locality), the query is split into 100 pieces, run on 100 machines at
once (MapReduce / MPP), and the results are merged.

| Feature | Traditional (RDBMS / DWH) | Big Data |
| --- | --- | --- |
| **Technologies** | Oracle, SQL Server, PostgreSQL, Teradata | Hadoop, Spark, Kafka, Flink, Cassandra, ClickHouse |
| **Data structure** | Structured only (rows/columns) | Structured + semi-structured + unstructured |
| **Query** | A single engine runs it | Query is split, parallel across dozens of machines |
| **Schema** | Schema-on-write (schema first) | Schema-on-read (data first) |
| **Scaling** | Vertical (a more powerful machine) | Horizontal (add machines to the cluster) |

A single e-commerce scenario makes this distinction concrete:

- **A job for traditional tools:** the user hit "Buy." The cart must be calculated, stock
  decremented, the invoice written. This requires **ACID** (strict consistency); not a cent may
  be off. The king here is PostgreSQL or Oracle — no need for the complexity of distributed
  systems.
- **A job for big data:** on the same site, you want to log, live, the mouse movements of the 1
  million users browsing right now, how many seconds they looked at which product (for a
  recommendation engine). Billions of logs flow per second. If you try to push these into a
  traditional SQL database with millions of `INSERT`s per second, the database locks up. This
  is exactly where **Kafka** (to collect the logs) and **Spark** (to process them live) step
  in.

## Summary: the line is not a threshold, it's a break

There were three misconceptions at the start; all three fell. Big data **doesn't have to be
unstructured** — structured data alone becomes big data through Volume and Velocity. Big data
**isn't the monopoly of large companies** — the line is drawn not by revenue but by the nature
of the data. And big data **isn't synonymous with real-time** — small data can flow in
real-time too.

The single real criterion that remains: the moment your traditional tools (classic relational
databases) start buckling under the volume or speed of the data, forcing you to split it and
distribute it across a cluster of machines — that is exactly when you cross the big data line.
What that telecom manager meant by "location data," what separates a small insurer from a giant
one, and what separates a stock ticker from Netflix — it's all the same question: **can a single
machine still carry this data?**
