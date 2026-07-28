---
title: 'Which Data Goes Where: Data Warehouse, Lakehouse, and the Real-Time Analytics Store'
description: 'There are three classic ways to store analytical data: the clean, modeled Data Warehouse; the Lakehouse that holds both raw files and open tables; and the real-time analytics store that queries streaming events in sub-second time (ClickHouse, Druid, Pinot, Azure Data Explorer). A post on "which data goes where" — each one''s identity, its signal words, the traps exams and architects love, and how all three flow together in the real world.'
pubDate: 2026-07-28
tags: ['Data Warehouse', 'Lakehouse', 'Real-Time Analytics', 'OLAP', 'Data Architecture', 'Big Data']
draft: false
---

Say you have three questions in hand:

1. "What was last quarter's revenue by region?"
2. "Train a churn model on two years of raw clickstream logs."
3. "How many users hit the 'checkout' button in the last 30 seconds?"

All three look like "put the data somewhere, then query it." The instinct is to say "we'll throw it in a database" for all of them. But the right answer to these three questions is **three different kinds of store** — and picking the wrong one either brings the system to its knees or wastes the budget.

These three stores usually go by these names in the industry: **Data Warehouse**, **Data Lakehouse**, and the **real-time analytics store** (real-time / streaming analytics database). In Microsoft Fabric they're packaged as Warehouse, Lakehouse, and Eventhouse respectively; but you can build the same trio with Databricks + Snowflake + ClickHouse, or with fully open-source tools. The names change per platform — **the division of roles doesn't.**

This post first places where this trio sits (hint: none of them is **OLTP**), then builds each one's identity, then lays out the signal words behind the "which data goes where" decision — and finally shows, through a concrete flow, that in the real world these work **together, not one at a time.**

## First, the boundary: none of these is your application database

To avoid confusion, let's draw a line up front. The database your app uses while running live — the PostgreSQL/MySQL/MongoDB that writes orders and updates carts — lives in the **OLTP** (Online Transaction Processing) world: read/write single records fast, row by row, with consistency above all.

The three heroes of this post live on the **OLAP** (Online Analytical Processing) side: they're built to **bulk-scan** millions/billions of rows to produce summaries, group and count, find trends. So the question isn't "fetch this one order," it's "sum these 400 million orders by region." Warehouse, Lakehouse, and the real-time store are all answers to different types of this analytical question. What sets them apart is exactly the **shape of the data** and the **mode of access.**

## 1. Data Warehouse — the clean, modeled, trusted tier

The data warehouse is the oldest and most mature of the three. Its identity in one sentence: **the SQL world that serves cleaned, structured, relational data to business reporting.**

Data enters here not raw, but **modeled.** The classic method is *dimensional modeling*: a fact table in the middle (e.g. `sales`), dimension tables around it (`customer`, `product`, `date`, `store`). The analyst `JOIN`s these tables in plain T-SQL, aggregates with `GROUP BY`, and produces the report. The data is disciplined; columns are defined, types are clear, the "single truth" lives here.

- **Whose tool:** the SQL-literate data analyst / classic DWH person, the BI team.
- **Data type:** structured, relational only.
- **Language:** T-SQL — and with full rights (`INSERT/UPDATE/DELETE`, stored procedures).
- **Typical workload:** quarterly reports, summary tables feeding dashboards, multi-table joins.
- **Latency:** batch. Data is processed overnight, in the report by morning.
- **Industry examples:** Snowflake, Google BigQuery, Amazon Redshift, Azure Synapse / Fabric Warehouse, and classic Oracle/Teradata warehouses.

If you have an Oracle DWH reflex, this element maps to it one-to-one: the star-schema, "single source for the report" tier fed by ODI + PL/SQL.

## 2. Data Lakehouse — the data lake's freedom, the warehouse's discipline

To understand the lakehouse, you first have to understand **why it was born,** because it's a compromise.

In the 2010s there were two separate worlds. On one side, the **data warehouse**: reliable, consistent, but expensive, rigid, and it only takes structured data — you can't stuff a raw log file, a video, or messy JSON into it. On the other side, the **data lake**: a giant file store on S3/HDFS that cheaply piles up everything (Parquet, JSON, images, whatever) — but schemaless, no ACID guarantees, a place that easily rots into a "data swamp." Teams were drowning in one or the other.

**The lakehouse is precisely the idea of merging these two:** bringing the warehouse's discipline — ACID transactions, schema enforcement, table semantics — on top of cheap object storage (the data lake). The mechanism that makes this possible is **open table formats:** Delta Lake, Apache Iceberg, Apache Hudi. These lay a metadata/transaction-log layer over Parquet files; so a "plain pile of files" suddenly becomes a reliable, transactional, time-travelable **table** — while the data still sits in an open format, in cheap storage, open to everyone.

- **Whose tool:** the data engineer, the data scientist (who knows Spark/Python).
- **Data type:** all of it — structured tables, semi-structured JSON, and raw files.
- **Language:** Spark (PySpark, Spark SQL); for reads, most platforms also expose a read-only SQL endpoint.
- **Typical workload:** the *medallion* architecture (bronze raw → silver clean → gold serving-ready), large file processing, feature prep for ML.
- **Latency:** batch / micro-batch.
- **Industry examples:** Databricks (Delta Lake), Apache Iceberg on S3/ADLS, Fabric Lakehouse.

Key intuition: the lakehouse isn't something that "replaces the warehouse," it's the **bridge** between raw data and a reliable table. Raw data lands here, gets cleaned and modeled here, and its "gold" layer is often served on to the warehouse or straight to BI.

## 3. Real-time analytics store — query the flowing event in sub-second time

The third one is a category that doesn't settle onto a single standard name in the industry, but is roughly called a **real-time / streaming analytics database** (real-time analytics database, streaming analytics store, sometimes "event/time-series analytics engine"). Fabric packages it as **Eventhouse** (Azure Data Explorer / Kusto engine underneath); but in the independent world its counterparts are **ClickHouse, Apache Druid, Apache Pinot** and the neighboring **Elasticsearch.**

This store has a single purpose: **querying continuously flowing event data, while that data was produced mere seconds ago, in milliseconds.** Data enters the warehouse overnight; here data enters **now** and is queried **now.**

- **Whose tool:** the team doing real-time/operational analytics, the observability team.
- **Data type:** time series, events, telemetry, logs, clickstream — high-volume, high-cardinality data always flowing with a timestamp.
- **Language:** engine-specific query languages (Kusto/KQL, ClickHouse SQL, Druid SQL) + streaming ingestion.
- **Typical workload:** live dashboards ("error rate in the last 5 minutes"), anomaly detection, IoT sensor streams, "how many people are online right now."
- **Latency:** **sub-second**, near-real-time. Both the ingest and the query are fresh.
- **Industry examples:** ClickHouse, Apache Druid, Apache Pinot, Azure Data Explorer (Fabric Eventhouse), (on the search side) Elasticsearch.

Why does this need a separate engine? Because these kinds of queries — "across billions of rows, filter the last 1 minute by the time column and group" — demand an engine purpose-built for column-based storage, aggressive indexing, and ingest-at-stream-speed. If you try to make a warehouse do this same job, either latency climbs into minutes or cost multiplies.

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

In a scenario question (or a real architecture decision), these words usually point to these stores:

- **"dimensional model", "stored procedure", "UPDATE/DELETE with T-SQL", "SQL analysts don't know Spark", "multi-table business report", "single source of truth"** → **Data Warehouse**
- **"raw/semi-structured files", "CSV/JSON/Parquet", "PySpark", "ML/feature prep", "medallion / bronze-silver-gold", "keep it in cheap open storage"** → **Lakehouse**
- **"telemetry", "IoT", "logs", "clickstream", "time series", "millisecond/second latency", "streaming ingestion", "live dashboard", "last N seconds/minutes"** → **Real-Time Store**

## Three classic traps

This trio is the favorite trap zone of both certification exams and real architecture meetings. The three are:

**1. "They'll use SQL" alone doesn't mean warehouse.** The lakehouse also has a SQL endpoint; many real-time stores speak a SQL dialect too. The distinguishing question isn't "is there SQL," it's **"will they write and modify data, or only read"** and **"what's the shape of the data."** For structured data that will only be `SELECT`ed, the lakehouse's endpoint is enough; if data will be updated with T-SQL, the warehouse is mandatory.

**2. Mixed scenarios aren't solved with one store — but don't add needless layers either.** For questions like "raw files are coming in + a clean SQL report is wanted on top," the right answer is often a **dual architecture**: Lakehouse (raw + processing) → Warehouse (serving/report). The reverse trap exists too: adding a **needless intermediate store** ("let's copy it here first, then move it there") where a single store would do is also wrong. The right answer is neither a missing layer nor an extra one.

**3. On modern platforms, "copy the data" is usually the wrong option.** Because in today's ecosystem stores can sit in an open format (Delta/Iceberg/Parquet) on a shared storage layer, it's possible for one engine to read another's data **without copying** — Fabric's "shortcut" and OneLake, and different engines reading the same Iceberg table in the open world, are examples of this. A design that says "copy first" usually loses both money and freshness.

## The real world: you don't pick one of the three, you flow through all three

As in the SQL vs NoSQL debate, the real lesson here isn't "which one wins" either. In a serious data platform these three live **at the same time** and data flows between them. Picture a huge e-commerce or IoT platform:

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

1. **Transactional data** (orders, users) lands in the **Lakehouse** from OLTP via batch or CDC; it enters bronze raw, gets cleaned in silver.
2. In parallel, the **event/telemetry stream** (clicks, sensors, logs) is ingested straight into the **real-time store**; the live dashboard there shows "what's happening now" in sub-second time.
3. In the lakehouse the **gold** layer is modeled and served on to the **Warehouse**; analysts pull quarterly reports and KPIs from there.
4. Often the real-time store also periodically offloads its data to the lakehouse to archive history; so "live" and "historical" analysis meet in the same lake.

Each store, while doing the job it's strongest at, stays connected to the others: fresh events in the real-time store, everything raw and processed in the lakehouse, the single-truth business report in the warehouse — and data flows between them not one-directionally but as needed.

## Summary: store type is an axis too

Like `ALTER TABLE`'s lesson that "flexibility means two different things," here too there's a single axis. At one end sits **fresh but raw** data (streaming events, raw files), at the other **slow but polished** data (modeled, trusted business reports). The real-time store is at the freshest end; the warehouse at the most refined end; the lakehouse right in the middle, the bridge that takes raw data and carries it toward the refined end.

So the right question isn't "which store is better" — none of them does the others' job well. The right question is where the **shape** of the data in your hands and the **freshness** of the question you'll ask of it fall on this axis. Fabric packages this trio as Warehouse/Lakehouse/Eventhouse, Databricks + Snowflake + ClickHouse package it differently; but the decision always stays the same: **fresh events to the real-time store, raw and processed to the lakehouse, the single-truth report to the warehouse.** In a modern data architecture there's no single hero; there are three distinct store types, and data continuously flows among them.
