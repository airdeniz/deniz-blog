---
title: 'Same SELECT, Entirely Different Engine: What Is a DataFrame, and Why PySpark?'
description: 'The SELECT inside spark.sql("SELECT ...") is the very one you''ve written in Oracle or PostgreSQL for years — so what does the PySpark around it actually do? From the DataFrame concept and the pandas–Spark divide, to why transformations aren''t written in plain SQL, to the industry''s SQL/PySpark balance; and most importantly, the distinction that keeps the syntax identical while completely changing the engine, where the data lives, and how it scales — built from classic-SQL reflexes.'
pubDate: 2026-07-12
tags: ['DataFrame', 'PySpark', 'Spark SQL', 'SQL', 'Data Engineering', 'Backend']
draft: false
---

Someone who has spent years writing SQL in Oracle or PostgreSQL pauses the first time this
line appears in a Spark notebook:

```python
spark.sql("SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id")
```

The `SELECT` inside is the very `SELECT` they have written for years. So what is the
`spark.sql(...)` around it? And the more puzzling part: everything seems to revolve around
a **DataFrame** — data is read into it, transformed on top of it, written out from it. The
same SQL, inside an entirely different world.

This post rebuilds two questions by testing them against classic-SQL reflexes: **what
exactly is this thing called a DataFrame? And if we are writing the same SELECT anyway, why
do we write the transformation inside PySpark instead of in plain SQL?**

## First, what is a DataFrame?

At its simplest: **a DataFrame is a data structure that holds data as a two-dimensional
table of rows and columns.** Think of a sheet in Excel or a table in a database — every
column has a **name** and a **data type**, and every row represents a **record**.

```
+-------------+-----------+---------+
| customer_id | city      | amount  |   ← columns (name + type)
+-------------+-----------+---------+
| 1001        | Ankara    | 250.00  |   ← each row is a record
| 1002        | Izmir     | 90.50   |
| 1003        | Ankara    | 400.00  |
+-------------+-----------+---------+
```

What sets it apart from a database table is this: a DataFrame is not a persistent object on
disk but a structure that usually **lives in the program's memory.** That is also where its
real power comes from — a DataFrame is the most ergonomic way to manipulate structured data
**programmatically.** It takes SQL's querying power (filter, group, join, pivot) and layers
a programming language's flexibility (variables, loops, conditionals, functions) on top.
It is the intersection of two worlds.

Three implementations are the most common:

- **pandas (Python):** the best-known DataFrame. Created with `pd.DataFrame()`; filtering,
  grouping, joining, and pivoting all work much like SQL. It runs **on a single machine,
  within the limits of memory** — remarkably effective as long as the data fits in RAM.
- **Spark DataFrame (PySpark):** think of it as the **distributed** counterpart of pandas.
  Data is spread across the nodes of a cluster, so **billions of rows** become workable.
  This is exactly the structure that drives the bronze → silver → gold transformations in
  a lakehouse.
- **data.frame / tibble (R):** R's native data structure, especially common in statistical
  analysis.

## Are a pandas DataFrame and a Spark DataFrame the same thing?

Conceptually, yes — both are row-and-column tables. But their execution models could not be
more different, and that difference is the foundation of the SQL-versus-PySpark discussion
to come.

| Criterion | pandas DataFrame | Spark DataFrame |
| --- | --- | --- |
| **Where it runs** | Single machine, single process | Cluster — data spread across nodes |
| **Scale** | As much as fits in RAM (GBs) | Terabytes, billions of rows |
| **Evaluation** | Eager — each line runs immediately | Lazy — a plan is built, runs on an action |
| **Mutability** | Mutable — modified in place | Immutable — each transform yields a new DataFrame |

The most critical row is the next-to-last one: **lazy evaluation.** In pandas, a filter
runs the moment you write it. In Spark, transformations like `filter`, `join`, and
`groupBy` do not run right away; Spark accumulates them into a **plan**, and only when an
**action** such as `count`, `write`, or `show` arrives does it optimize the whole chain
and execute it in a single pass. This is the core mechanism that keeps data from shuffling
needlessly between nodes in a distributed world — and it returns shortly, when we reach
the Catalyst optimizer.

## Why do we do this in PySpark rather than in plain SQL?

A common misconception needs correcting first: **the issue is not that SQL falls short.**
The vast majority of the same transformations can be written in Spark SQL as well. The
issue is that in certain scenarios PySpark is simply the better-suited tool. Here is where
SQL struggles on its own:

- **Complex control flow:** `if/else` branching, loops, error handling with `try/except`,
  retry logic… in SQL these are either impossible or painfully convoluted.
- **Multi-source reads and writes:** SQL alone cannot say "read from Kafka, write to
  Iceberg." That requires an **execution engine** — a layer that manages where data comes
  from and where it goes.
- **Work that needs programmatic intervention:** schema evolution, data quality checks,
  dynamic partition management — all of these call for conditional, programmable logic.
- **Access to the ecosystem:** writing UDFs, integrating an ML pipeline, reaching into
  Python libraries — all of it lives on the programming-language side.

This is where PySpark's real difference emerges: **PySpark is not merely a "query
language" but an orchestration layer.** You define where to read the data from, how to
transform it, where to write it, and what to do when something fails — all **in a single
program.** SQL is used as a **tool** inside that pipeline.

In practice the two already work together. In a typical job, the skeleton lives in Python
and the transformation in SQL:

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

> In short: **SQL states "what to do"; PySpark manages "what + how + where + what happens
> on failure" all at once.** The skeleton that holds the pipeline upright — the part SQL
> cannot build on its own — is PySpark.

## How much SQL versus PySpark in real life?

The ratio varies considerably by project and team, but a general picture can be drawn. In
a typical lakehouse / ETL project, the bulk of the transformation logic — filtering,
joins, grouping, window functions, `CASE WHEN` — is written **in SQL.** What gets written
with the PySpark DataFrame API is usually the pipeline skeleton, I/O, and edge-case
handling. Roughly **60–70% SQL, 30–40% PySpark** is a fair estimate.

So where does the ratio shift?

| Team / context | SQL | PySpark | Why |
| --- | --- | --- | --- |
| **dbt-based teams** | ~90%+ | ~10% | All transforms in SQL; dbt + Airflow handle orchestration |
| **Typical lakehouse / ETL** | 60–70% | 30–40% | Transforms in SQL, skeleton and I/O in PySpark |
| **ML / complex data eng.** | ~50% | ~50%+ | Feature engineering, streaming, model serving need Python |

The daily practice of most data engineers in a Databricks/Spark environment is really this
table in summary: they write `spark.sql("""...""")` in a notebook and wrap it in Python.
In other words, **they write SQL — but they write it inside PySpark.**

The picture is much the same in a lakehouse's bronze → silver → gold transformations: most
of the transformation logic is written in Spark SQL, while reading from Kafka, writing to
Iceberg, and schema checks are managed with PySpark. The bottom line: in the industry,
**the weight still rests with SQL.** PySpark's strength is not replacing SQL but
completing the part SQL cannot do alone.

## So what separates PySpark SQL from classic SQL?

Now we arrive at the most commonly confused point. In both, you write **almost exactly the
same SQL syntax.** The difference lies in *where* and *how* the query runs.

**Classic SQL (Oracle, PostgreSQL…).** You send the query to the database engine; the
engine runs it against its own data with its own optimizer. The data lives on a single
server (structures like Oracle RAC allow limited distribution). The classic PL/SQL
procedures in an organization are exactly this model — Oracle's own engine runs them.

```sql
-- Classic SQL: engine = the database itself, data in the database
SELECT customer_id, SUM(amount)
FROM orders
GROUP BY customer_id;
```

**PySpark SQL (`spark.sql()`).** You write the same SQL, but the engine executing it is
**Spark.** The data does not sit in a database; you read it from a file or a topic into a
temporary view, then write your SQL on top of that.

```python
# PySpark SQL: same SQL, but engine = Spark, data distributed
spark.read.parquet("s3://data/orders").createOrReplaceTempView("orders")
spark.sql("SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id")
```

Even with near-identical syntax, four things change fundamentally underneath:

- **Distributed execution.** The classic engine runs the query on one server. Spark splits
  it across multiple nodes in the cluster and processes them in parallel. Where Oracle
  strains to process a billion rows on a single server, Spark can spread the same work
  across 10 nodes and finish far sooner.
- **Data-source flexibility.** Oracle SQL queries only Oracle tables. With Spark SQL you
  can **join a Kafka topic, an Iceberg table, a Parquet file, and a CSV in the same
  query** — even if they all live in different places.
- **Temp view logic.** Spark does not require a persistent database. You first read the
  data and call `createOrReplaceTempView("table")`, then write
  `spark.sql("SELECT * FROM table")`. You are running SQL over **in-memory temporary
  tables.**
- **A different optimizer.** Oracle has its cost-based optimizer (CBO); Spark has the
  **Catalyst** optimizer. The two produce different plans for the same query and apply
  different strategies. (This is exactly where the lazy evaluation from earlier pays off:
  Catalyst sees the whole transformation chain at once and collapses it into a single
  optimized plan.)

| Criterion | Classic SQL (Oracle/PostgreSQL) | PySpark SQL (`spark.sql`) |
| --- | --- | --- |
| **Engine** | The database's own engine + CBO | Spark + Catalyst optimizer |
| **Where data lives** | In the database, on one server | Distributed across cluster nodes |
| **Scaling** | Vertical (a more powerful server) | Horizontal (add nodes to the cluster) |
| **Data sources** | Only its own tables | Kafka, Iceberg, Parquet, CSV… in one query |
| **Table** | Persistent schema object | In-memory temp view via `createOrReplaceTempView` |
| **Execution** | Usually eager | Lazy — a plan is built, runs on an action |

> In short: the SQL you write is nearly identical, but **the engine underneath, where the
> data lives, and the scaling model are entirely different.** Classic SQL queries data in
> its own home; Spark SQL gathers data from wherever it originates and processes it with
> the power of a distributed cluster.

## Summary: one structure, two SQLs, one orchestrator

Let's tie the three threads together. A **DataFrame** is the ergonomic way to hold
structured data programmatically — on a single machine in pandas, distributed across a
cluster in Spark. There are **two ways** to talk to this distributed structure: the
DataFrame API (`df.groupBy(...).agg(...)`) and SQL (`spark.sql("...")`). Both descend to
the same Catalyst engine, and choosing between them is mostly a matter of preference.

The **SQL versus PySpark SQL** distinction, meanwhile, lives not in the syntax but in the
engine: the same SELECT, one running on a database's single server, the other on Spark's
distributed cluster. And the **plain SQL versus PySpark** debate has no real winner —
because the two are not rivals but layers: SQL writes the "what" of the transformation,
while PySpark holds the pipeline's skeleton through reading, writing, error handling, and
flow control. The industry's "60–70% SQL, the rest PySpark" practice says precisely this:
**the weight still rests with SQL, and PySpark is the tool that carries it into the work
it cannot do alone.**
