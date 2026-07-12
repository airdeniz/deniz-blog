---
title: 'What Is a DataFrame, and Why Do We Write the Same SQL Inside PySpark?'
description: 'Someone coming from Oracle or PostgreSQL pauses the first time they see spark.sql("SELECT ..."): the SELECT inside is the same one they''ve written for years. So what is the PySpark wrapping it, and what is this "DataFrame" everyone passes around? The DataFrame concept, the difference between pandas and Spark DataFrames, why we write transformations in PySpark rather than plain SQL, how much SQL vs PySpark gets written in real life, and most importantly: even with the same syntax, the engine, data location, and scaling difference that separate classic SQL from PySpark SQL — rebuilt from classic-SQL reflexes.'
pubDate: 2026-07-12
tags: ['DataFrame', 'PySpark', 'Spark SQL', 'SQL', 'Data Engineering', 'Backend']
draft: false
---

Someone who has written SQL in Oracle or PostgreSQL for years pauses the first time they see
this line in a Spark notebook:

```python
spark.sql("SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id")
```

The `SELECT` inside is exactly the `SELECT` they've written for years. So what is the
`spark.sql(...)` wrapping it? And more confusingly: everyone keeps passing around a
**"DataFrame"** — reading data into it, transforming on top of it, writing from it. The same
SQL, but inside an entirely different world.

This post rebuilds two questions by comparing them against classic-SQL reflexes: **what exactly
is this thing called a DataFrame, and since we're writing the same SELECT, why do we write the
transformation inside PySpark rather than in plain SQL?**

## First, what is a DataFrame?

At its simplest: **a DataFrame is a data structure that holds data in a two-dimensional table of
rows and columns.** Think of a sheet in Excel or a table in a database — each column has a
**name** and a **data type**, and each row represents a **record**.

```
+-------------+-----------+---------+
| customer_id | city      | amount  |   ← columns (name + type)
+-------------+-----------+---------+
| 1001        | Ankara    | 250.00  |   ← each row is a record
| 1002        | Izmir     | 90.50   |
| 1003        | Ankara    | 400.00  |
+-------------+-----------+---------+
```

The difference from a database table is this: a DataFrame is not a persistent disk object but a
structure that usually **lives in the program's memory.** And its real power comes from there —
a DataFrame is the most ergonomic way to manipulate structured data **programmatically.** It
takes SQL's querying power (filter, group, join, pivot) and adds the flexibility of a
programming language (variables, loops, conditionals, functions) on top. It's the intersection
of two worlds.

There are three common implementations:

- **pandas (Python):** the best-known DataFrame. Created with `pd.DataFrame()`; filtering,
  grouping, joining, and pivoting are done very similarly to SQL. It runs **on a single machine,
  within the limits of memory** — wonderful as long as the data fits in RAM.
- **Spark DataFrame (PySpark):** think of it as the **distributed** version of pandas. Data is
  spread across the nodes of a cluster, so **billions of rows** can be processed. This is
  exactly the structure that drives the bronze → silver → gold transformations in a lakehouse.
- **data.frame / tibble (R):** R's native data structure; especially common in statistical
  analysis.

## Are a pandas DataFrame and a Spark DataFrame the same thing?

Conceptually yes (both are row-column tables), but their execution models are entirely
different — and that difference is the foundation of the SQL vs PySpark discussion later.

| Criterion | pandas DataFrame | Spark DataFrame |
| --- | --- | --- |
| **Where it runs** | Single machine, single process | Cluster — data spread across nodes |
| **Scale** | As much as fits in RAM (GBs) | Terabytes, billions of rows |
| **Evaluation** | Eager — each line runs immediately | Lazy — a plan is built, runs on an action |
| **Mutability** | Mutable — modified in place | Immutable — each transform yields a new DataFrame |

The most critical row is the next-to-last: **lazy evaluation.** In pandas, the moment you write
a filter, that filter runs. In Spark, transformations like `filter`, `join`, and `groupBy` don't
run right away; Spark accumulates them as a **plan** and only when an **action** like `count`,
`write`, or `show` arrives does it optimize the whole chain and run it in one go. This is the
core trick that keeps data from needlessly shuffling between nodes in the distributed world — it
comes up again shortly when we reach the Catalyst optimizer.

## Why do we do this in PySpark rather than in plain SQL?

The first misconception to knock down up front: **the issue is not that SQL is insufficient.**
You can write the vast majority of the same transformations in Spark SQL too. The issue is that
in some scenarios PySpark is the more suitable tool. Here's where SQL alone struggles:

- **Complex control flow:** `if/else` branching, loops, error handling with `try/except`, retry
  logic… in SQL these are either impossible or very convoluted.
- **Multi-source read/write:** SQL alone can't say "read from Kafka, write to Iceberg." That
  needs an **execution engine** — a layer that manages where the data comes from and where it
  goes.
- **Work that requires programmatic intervention:** schema evolution, data quality checks,
  dynamic partition management — these need conditional, programmable logic.
- **Access to the ecosystem:** writing UDFs, integrating an ML pipeline, reaching into Python
  libraries — these require the programming-language side.

That's where PySpark's real difference lies: **PySpark is not just a "query language" but an
orchestration layer.** You define where to read the data from, how to transform it, where to
write it, and what to do on error — all **in a single program.** SQL is used as a **tool**
inside that pipeline.

In practice the two already go together. In a typical job the skeleton lives in Python and the
transformation in SQL:

```python
# 1) WHERE TO READ FROM — SQL can't do this alone
raw = spark.read.format("kafka").option("subscribe", "orders").load()
raw.createOrReplaceTempView("raw_events")

# 2) TRANSFORM — this part is clean SQL
clean = spark.sql("""
    SELECT customer_id, city, SUM(amount) AS total
    FROM raw_events
    WHERE amount > 0
    GROUP BY customer_id, city
""")

# 3) WHERE TO WRITE + ERROR HANDLING — the Python side again
try:
    clean.write.format("iceberg").mode("append").save("silver.order_summary")
except AnalysisException as e:
    log.error(f"Write failed, queued for retry: {e}")
```

> In short: **SQL says "what to do"; PySpark manages "what + how + where + what happens on
> error" all at once.** PySpark is the skeleton that holds up the pipeline — the part SQL can't
> do on its own.

## How much SQL vs PySpark in real life?

This ratio varies a lot by project and team, but a general picture can be drawn. In a typical
lakehouse / ETL project, the bulk of the transformation logic — filtering, joins, grouping,
window functions, `CASE WHEN` — is written **in SQL.** The part written with the PySpark
DataFrame API is usually the pipeline skeleton, I/O, and edge-case handling. Roughly **60–70%
SQL, 30–40% PySpark** is a fair estimate.

So where does this ratio shift?

| Team / context | SQL | PySpark | Why |
| --- | --- | --- | --- |
| **dbt-based teams** | ~90%+ | ~10% | All transforms in SQL; dbt + Airflow handle orchestration |
| **Typical lakehouse / ETL** | 60–70% | 30–40% | Transforms in SQL, skeleton and I/O in PySpark |
| **ML / complex data eng.** | ~50% | ~50%+ | Feature engineering, streaming, model serving need Python |

The practice of most data engineers working in a Databricks/Spark environment is really a
summary of this table: they write `spark.sql("""...""")` in a notebook and wrap it in Python.
That is, **they write SQL, but they write it inside PySpark.**

In a lakehouse's bronze → silver → gold transformations the picture is similar: most of the
transformation logic is written in Spark SQL, while parts like reading from Kafka, writing to
Iceberg, and schema checks are managed with PySpark. In the end, **SQL is still the dominant
side** in the industry. PySpark's strength isn't replacing SQL but completing the part SQL can't
do on its own.

## So what's the difference between PySpark SQL and classic SQL?

Now we reach the most commonly confused point. In both you write **almost exactly the same SQL
syntax.** The difference is in *where* and *how* the query runs.

**Classic SQL (Oracle, PostgreSQL…).** You send the query to the database engine; the engine
runs against its own data with its own optimizer. The data lives on a single server (with limited
distribution in structures like Oracle RAC). The classic PL/SQL procedures in an organization are
exactly this model — Oracle's own engine runs them.

```sql
-- Classic SQL: engine = the database itself, data in the database
SELECT customer_id, SUM(amount)
FROM orders
GROUP BY customer_id;
```

**PySpark SQL (`spark.sql()`).** You write the same SQL, but the engine running it is **Spark.**
The data isn't in a database; you read it from a file/topic into a temporary view and then write
SQL on top of it.

```python
# PySpark SQL: same SQL, but engine = Spark, data distributed
spark.read.parquet("s3://data/orders").createOrReplaceTempView("orders")
spark.sql("SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id")
```

Even though the syntax is almost identical, four things change entirely underneath:

- **Distributed execution.** The classic engine runs the query on a single server. Spark splits
  the query across multiple nodes in the cluster and processes them in parallel. Where Oracle
  strains to process 1 billion rows on one server, Spark can spread the same work across 10
  nodes and finish far faster.
- **Data-source flexibility.** Oracle SQL queries only Oracle tables. With Spark SQL you can
  **join a Kafka topic, an Iceberg table, a Parquet file, and a CSV in the same query** — even
  if they all live in different places.
- **Temp view logic.** In Spark a persistent database isn't required. You first read the data
  and say `createOrReplaceTempView("table")`, then write `spark.sql("SELECT * FROM table")`. So
  you run SQL over **in-memory temporary tables.**
- **Different optimizer.** Oracle has its cost-based optimizer (CBO); Spark has the **Catalyst**
  optimizer. The two produce different plans for the same query and apply different strategies.
  (This is exactly where the lazy evaluation we discussed pays off: Catalyst sees the entire
  transformation chain and collapses it into one optimized plan.)

| Criterion | Classic SQL (Oracle/PostgreSQL) | PySpark SQL (`spark.sql`) |
| --- | --- | --- |
| **Engine** | The database's own engine + CBO | Spark + Catalyst optimizer |
| **Where data lives** | In the database, on one server | Distributed across cluster nodes |
| **Scaling** | Vertical (a more powerful server) | Horizontal (add nodes to the cluster) |
| **Data sources** | Only its own tables | Kafka, Iceberg, Parquet, CSV… in one query |
| **Table** | Persistent schema object | In-memory temp view via `createOrReplaceTempView` |
| **Execution** | Usually eager | Lazy — a plan is built, runs on an action |

> In short: the SQL you write is almost identical; but **the engine underneath, where the data
> lives, and the scaling model are entirely different.** Classic SQL queries data in its own
> home; Spark SQL gathers data from wherever it comes and processes it with a distributed army.

## Summary: one structure, two SQLs, one orchestrator

Let's tie the three parts together. A **DataFrame** is the ergonomic way to hold structured data
programmatically — on a single machine in pandas, distributed across a cluster in Spark. There
are **two ways** to talk to this distributed structure: the DataFrame API
(`df.groupBy(...).agg(...)`) and SQL (`spark.sql("...")`) — both descend to the same Catalyst
engine, and choosing between them is often a matter of taste.

The **SQL vs PySpark SQL** distinction, meanwhile, is not in the syntax but in the engine: the
same SELECT, but one runs on a database's single server and the other on Spark's distributed
cluster. And in the **plain SQL vs PySpark** debate there's really no winner — because the two
aren't rivals but layers: SQL writes the "what" of the transformation, while PySpark holds the
pipeline's skeleton with reading, writing, error handling, and flow control. The industry's
"60–70% SQL, the rest PySpark" practice says exactly this: **SQL is still king, and PySpark is
the tool that carries it into the work it can't do alone.**
