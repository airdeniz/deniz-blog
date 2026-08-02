---
title: 'Which Data Goes Where: Data Warehouse, Lakehouse, and the Real-Time Analytics Store'
description: 'Analytical data has three classic homes: the clean, modeled Data Warehouse; the Lakehouse, which keeps raw files and open tables under one roof; and the real-time analytics store that answers queries over streaming events in under a second (ClickHouse, Druid, Pinot, Azure Data Explorer). This post answers "which data goes where?" through each store''s identity, the decision signals, the traps that exams and architects love, and how all three flow together in the real world.'
pubDate: 2026-07-28
tags: ['Data Warehouse', 'Lakehouse', 'Real-Time Analytics', 'OLAP', 'Data Architecture', 'Big Data']
draft: false
---

Consider three questions:

1. "What was last quarter's revenue by region?"
2. "Train a churn model on two years of raw clickstream logs."
3. "How many users hit the 'checkout' button in the last 30 seconds?"

All three look like the same job: put the data somewhere, then query it. The
first instinct is to answer all of them with "we'll throw it in a database."
Yet the right answer to these three questions is **three different store
types** — and the price of picking the wrong one is either a system brought to
its knees or a budget spent on nothing.

The industry mostly knows these three stores by these names: **Data
Warehouse**, **Data Lakehouse**, and the **real-time analytics store**
(real-time / streaming analytics database). Microsoft Fabric packages them as
Warehouse, Lakehouse, and Eventhouse; you can build the same trio with
Databricks + Snowflake + ClickHouse, or entirely with open-source tools. The
names vary from platform to platform; **the division of roles does not.**

This post first places the trio on the map (hint: none of them is **OLTP**),
then builds each one's identity, then lists the signal words that drive the
"which data goes where" decision — and at the end shows, with a concrete flow,
that in the real world these three work **together, not one at a time.**

## First, a boundary: none of these is your application database

Let's draw a line up front to head off confusion. The database your
application uses in production — the PostgreSQL/MySQL/MongoDB that writes
orders and updates carts — belongs to the **OLTP** (Online Transaction
Processing) world: it reads and writes single records fast, row by row, with
consistency ahead of everything else.

The three protagonists of this post sit on the **OLAP** (Online Analytical
Processing) side: they are built to scan millions or billions of rows **in
bulk** — to summarize, group and count, and catch trends. The question is no
longer "fetch this one order" but "sum these 400 million orders by region."
Warehouse, Lakehouse, and the real-time store are three different answers to
different types of that analytical question. And what separates them is
precisely the **shape of the data** and the **mode of access.**

## 1. Data Warehouse — the clean, modeled, trusted tier

The data warehouse is the oldest and most mature of the trio. Its identity in
one sentence: **the SQL world that serves cleaned, structured, relational data
to business reporting.**

Data enters here not raw but **modeled.** The classic method is *dimensional
modeling*: a fact table in the middle (e.g. `sales`), dimension tables around
it (`customer`, `product`, `date`, `store`). The analyst `JOIN`s these tables
in plain T-SQL, aggregates with `GROUP BY`, and turns out the report. The data
is disciplined: columns are defined, types are clear; the "single truth" lives
here.

- **Whose tool:** the SQL-fluent data analyst / classic DWH specialist, the BI
  team.
- **Data type:** structured and relational only.
- **Language:** T-SQL — with full rights, at that (`INSERT/UPDATE/DELETE`,
  stored procedures).
- **Typical workload:** quarterly reports, summary tables feeding dashboards,
  multi-table joins.
- **Latency:** batch. Data is processed overnight and is in the report by
  morning.
- **Industry examples:** Snowflake, Google BigQuery, Amazon Redshift, Azure
  Synapse / Fabric Warehouse, and classic Oracle/Teradata warehouses.

If you carry an Oracle DWH reflex, this tier maps onto it one-to-one: the
star-schema, "single source for the report" layer fed by ODI + PL/SQL.

## 2. Data Lakehouse — the data lake's freedom, the warehouse's discipline

The way to understand the lakehouse is to first understand **why it was
born** — because it is a compromise.

In the 2010s there were two separate worlds. On one side, the **data
warehouse**: reliable and consistent, but expensive and rigid, and it accepts
only structured data — you cannot push a raw log file, a video, or messy JSON
into it. On the other side, the **data lake**: a giant file store on S3/HDFS
that cheaply accumulates everything (Parquet, JSON, images, whatever comes) —
but schemaless, without ACID guarantees, and prone to rotting into a "data
swamp." Teams were drowning either in one's rigidity or in the other's
disorder.

**The lakehouse is precisely the idea of merging the two:** bringing the
warehouse's discipline — ACID transactions, schema enforcement, table
semantics — on top of cheap object storage (the data lake). The mechanism that
makes this possible is **open table formats:** Delta Lake, Apache Iceberg,
Apache Hudi. These formats lay a metadata/transaction-log layer over Parquet
files, and an ordinary pile of files becomes a reliable, transactional,
time-travel-capable **table** — while the data still sits in an open format,
in cheap storage, accessible to everyone.

- **Whose tool:** the data engineer, the data scientist (fluent in
  Spark/Python).
- **Data type:** all of it — structured tables, semi-structured JSON, and raw
  files alike.
- **Language:** Spark (PySpark, Spark SQL); on the read side, most platforms
  also expose a read-only SQL endpoint.
- **Typical workload:** the *medallion* architecture (bronze raw → silver
  clean → gold serving-ready), large file processing, feature preparation for
  ML.
- **Latency:** batch / micro-batch.
- **Industry examples:** Databricks (Delta Lake), Apache Iceberg on S3/ADLS,
  Fabric Lakehouse.

The key intuition: the lakehouse does not **replace** the warehouse; it is the
**bridge** between raw data and a trusted table. Raw data lands here, gets
cleaned and modeled here, and its "gold" layer is usually served on to the
warehouse or straight to BI.

## 3. Real-time analytics store — query the flowing event in under a second

The third is a category the industry has not settled on a single standard name
for: roughly, the **real-time / streaming analytics database** (real-time
analytics database, streaming analytics store, sometimes "event/time-series
analytics engine"). Fabric packages it as **Eventhouse** (with the Azure Data
Explorer / Kusto engine underneath); its counterparts in the independent world
are **ClickHouse, Apache Druid, Apache Pinot**, and the closely related
**Elasticsearch**.

This store has a single purpose: **to answer queries over continuously flowing
event data, in milliseconds, while that data is only seconds old.** Data
enters the warehouse overnight; here, data enters **now** and is queried
**now.**

- **Whose tool:** the team doing real-time/operational analytics, the
  observability team.
- **Data type:** time series, events, telemetry, logs, clickstream —
  high-volume, high-cardinality data, always flowing with a timestamp.
- **Language:** engine-specific query languages (Kusto/KQL, ClickHouse SQL,
  Druid SQL) + streaming ingestion.
- **Typical workload:** live dashboards ("error rate in the last 5 minutes"),
  anomaly detection, IoT sensor streams, "how many people are online right
  now."
- **Latency:** **sub-second**, near-real-time. Both the ingest and the query
  are fresh.
- **Industry examples:** ClickHouse, Apache Druid, Apache Pinot, Azure Data
  Explorer (Fabric Eventhouse), and (on the search side) Elasticsearch.

Why does this need its own engine? Because queries of this kind — "out of
billions of rows, filter the last minute by the time column and group it" —
demand an engine purpose-built around columnar storage, aggressive indexing,
and ingest at stream speed. Push the same job onto a warehouse and either the
latency climbs into minutes or the cost multiplies.

## Decision table: "which data goes where?"

|  | **Data Warehouse** | **Lakehouse** | **Real-Time Store** |
| --- | --- | --- | --- |
| **Main user** | SQL analyst / BI | Data engineer, data scientist | Real-time / observability team |
| **Data type** | Structured, relational | Structured + semi/raw (files) | Time series, events, logs, telemetry |
| **Write/process language** | T-SQL (full rights) | Spark (PySpark, Spark SQL) | KQL / engine SQL + streaming ingest |
| **Typical workload** | Dimensional model, business report | Medallion, ML prep, large files | Live dashboard, IoT, anomaly |
| **Latency** | Batch | Batch / micro-batch | Sub-second |
| **Storage** | Closed, engine-specific (mostly) | Open format (Delta/Iceberg), cheap lake | Column-based, optimized for streams |
| **Nearest reflex** | Oracle/Teradata DWH | Spark + Iceberg/Delta layer | ClickHouse/Elasticsearch feel |

## Signal words in the question → the right store

In a scenario question — or a real architecture decision — these words usually
point to these stores:

- **"dimensional model", "stored procedure", "UPDATE/DELETE with T-SQL", "SQL
  analysts don't know Spark", "multi-table business report", "single source of
  truth"** → **Data Warehouse**
- **"raw/semi-structured files", "CSV/JSON/Parquet", "PySpark", "ML/feature
  prep", "medallion / bronze-silver-gold", "keep it in cheap open storage"** →
  **Lakehouse**
- **"telemetry", "IoT", "logs", "clickstream", "time series",
  "millisecond/second latency", "streaming ingestion", "live dashboard", "last
  N seconds/minutes"** → **Real-Time Store**

## Three classic traps

This trio is the favorite trap zone of certification exams and real
architecture meetings alike. The three traps:

**1. "They'll use SQL" alone does not mean warehouse.** The lakehouse has a
SQL endpoint too; many real-time stores speak a SQL dialect as well. The
distinguishing question is not "is there SQL," but **"will they write and
modify data, or only read it"** and **"what is the shape of the data."** For
structured data that will only be `SELECT`ed, the lakehouse's endpoint is
enough; if data will be updated with T-SQL, the warehouse is mandatory.

**2. Mixed scenarios are not solved with one store — but don't add needless
layers either.** For questions like "raw files are arriving + a clean SQL
report is wanted on top," the right answer is usually a **dual architecture**:
Lakehouse (raw + processing) → Warehouse (serving/report). The trap runs the
other way too: adding a **needless intermediate store** ("copy it here first,
then move it there") where a single store would do is just as wrong. The right
answer has neither a missing layer nor an extra one.

**3. On modern platforms, "copy the data" is usually the wrong option.**
Because today's stores can sit in an open format (Delta/Iceberg/Parquet) on a
shared storage layer, one engine can read another's data **without copying
it** — Fabric's shortcuts and OneLake, and different engines reading the same
Iceberg table in the open world, are examples. A design that says "copy first"
usually loses both money and freshness.

## The real world: you don't pick one of the three, you flow through all three

As in the SQL vs NoSQL debate, the real lesson here is not "which one wins."
In a serious data platform all three live **at the same time**, and data flows
between them. Picture a large e-commerce or IoT platform:

<pre style="width:max-content;max-width:100%;margin-inline:auto">
   TRANSACTIONAL SOURCES (OLTP)         EVENTS / TELEMETRY (stream)
   PostgreSQL, application DBs           Kafka, IoT, logs, clickstream
             |                                     |
             |  batch / CDC                        |  streaming ingest
             v                                     v
   +----------------------+            +--------------------------+
   |      LAKEHOUSE       |            |    REAL-TIME STORE       |
   |  raw + processed     |            |  ClickHouse / Druid /    |
   |  open tables         |            |  Pinot / ADX             |
   |  (Delta / Iceberg)   |            |  sub-second on events    |
   |  Spark + ML          |            +--------------------------+
   +----------------------+                        |
             |                                     v
             |  "gold" (clean, modeled)      +--------------------------+
             v                               |     LIVE DASHBOARD       |
   +----------------------+                  |     "last 30 seconds"    |
   |      WAREHOUSE       |                  +--------------------------+
   |  modeled, trusted    |
   |  T-SQL, serves BI    |
   +----------------------+
             |
             v
      BI / reports (Power BI, Tableau)
</pre>

The flow works like this:

1. **Transactional data** (orders, users) lands in the **Lakehouse** from OLTP
   via batch or CDC; it enters bronze raw and gets cleaned in silver.
2. In parallel, the **event/telemetry stream** (clicks, sensors, logs) is
   ingested straight into the **real-time store**; the live dashboard there
   answers "what is happening right now" in under a second.
3. In the lakehouse, the **gold** layer is modeled and served on to the
   **Warehouse**; analysts pull their quarterly reports and KPIs from there.
4. Often the real-time store also periodically offloads its data to the
   lakehouse to archive history — so "live" and "historical" analysis meet in
   the same lake.

Each store does the job it is strongest at without cutting itself off from the
others: fresh events sit in the real-time store, everything raw and processed
in the lakehouse, the single-truth business report in the warehouse — and data
flows between them not in one direction, but as needed.

## Summary: store type is an axis too

Like `ALTER TABLE`'s lesson that "flexibility is two different things," there
is a single axis here as well. At one end sits **fresh but raw** data
(streaming events, raw files); at the other, **slow but polished** data
(modeled, trusted business reports). The real-time store sits at the freshest
end; the warehouse at the most refined; the lakehouse right in the middle —
the bridge that takes raw data and carries it toward the refined end.

So the right question is not "which store is better"; none of them does the
others' job well. The right question is where the **shape** of your data and
the **freshness** of the question you will ask of it fall on this axis. Fabric
packages the trio as Warehouse/Lakehouse/Eventhouse; Databricks + Snowflake +
ClickHouse package it differently; but the decision never changes: **fresh
events to the real-time store, raw and processed data to the lakehouse, the
single-truth report to the warehouse.** In a modern data architecture there is
no single hero; there are three distinct store types, and data flows among
them continuously.
