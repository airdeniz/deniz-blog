---
title: 'Why SQL Isn''t Considered "Flexible" — and Why "SQL or NoSQL" Is the Wrong Question'
description: 'If ALTER TABLE adds a column in seconds, why does SQL get called "inflexible"? Because flexibility means two different things: the micro-flexibility of adding a column, and the architectural flexibility of changing billions of rows without downtime, storing schemaless data, and scaling horizontally. This post argues that SQL''s rigidity is not a flaw but a deliberate safety trade-off — and that the real-world answer is combining both in one project (polyglot persistence).'
pubDate: 2026-07-14
tags: ['SQL', 'NoSQL', 'Database', 'Polyglot Persistence', 'Scaling', 'Backend']
draft: false
---

Adding a column to a table is usually a one-line job:

```sql
ALTER TABLE products ADD COLUMN warranty_months INT;
```

The command completes in seconds. Which is exactly why "SQL isn't as flexible as
NoSQL" sounds unfair the first time you hear it: if adding a field, dropping a
column, or defining an index is this easy, what's inflexible about it?

The subtlety is this: "flexibility" here means two entirely different things.
Running a single `ALTER TABLE` in DBeaver is flexibility at the **micro level.**
Flexibility at the **architectural level** is something else altogether: a database
that **adapts instantly to variable data types**, can change **billions of rows
without downtime**, and **scales out without limit.**

This post first builds the case for why SQL counts as "rigid schema" in four
sections, then shows that this rigidity is not a flaw but a **safety trade-off** —
and finally walks through a concrete scenario showing that in the real world the
question isn't "SQL or NoSQL" but how to use both together.

## 1. The "everyone in class wears the same uniform" rule

In SQL, when a new column is added to a table, it applies to **every row** in that
table. No exceptions.

Suppose a `warranty_months` column is added to the `products` table. If the table
holds 10 million products, all 10 million rows now carry a `warranty_months` field.
For products with no warranty, that field is forced to stay `NULL`. Every row must
wear the same schema uniform — even when the field sits empty, the cell is there and
takes up space.

On the document side of NoSQL — MongoDB, for example — there's a **collection**
instead of a table and a **document** instead of a row, and each document is
independent of the others:

```
SQL (every row, same schema)        NoSQL / Document (each doc, its own schema)
+------+---------+----------+        { "name": "Phone", "ram": "8GB",
| id   | name    | warranty |          "warranty": 24 }
+------+---------+----------+
| 1    | Phone   | 24       |        { "name": "Apple", "weight": 1.5 }
| 2    | Apple   | NULL     |          ← no "warranty" field at all, takes no space
+------+---------+----------+
```

Each document defines its own structure; a field a document doesn't have simply
doesn't exist for it — it never even needs to be declared. That is precisely the
flexibility people call "schemaless."

## 2. In production, adding a column is not a "one-line job"

In a development environment, `ALTER TABLE ADD COLUMN` on an empty or
lightly-populated table really does take a second. In production, the picture
changes.

Imagine adding a column to a table with hundreds of millions of rows, serving
thousands of queries per second. While applying the change, the SQL engine often
**locks** the table (write lock / table lock). For the duration of that lock, users
can't write to the table — and in some cases can't read from it either. The system
temporarily stalls: **downtime.** That's why changing a SQL schema in large systems
demands serious planning, a maintenance window, and risk management. (Online DDL in
modern databases and tools like `pt-online-schema-change` soften this, but the
underlying problem doesn't go away.)

In NoSQL, since there is no schema, you never tell the database "I'm adding a
column." You add a field to newly saved documents in the backend code, and the
database accepts it as is. No lock, no downtime. Old documents carry on without the
field.

## 3. Relational bonds (foreign keys) can become shackles

SQL's real power comes from being **relational.** Tables are bound to each other by
foreign-key rules, and those bonds guarantee the data's consistency.

Picture an `orders` table bound to a `users` table. When a deep change is wanted in
the order structure or the users table, those constraints force every link in the
chain to stay consistent — a domino effect. The bonds keep the data safe, but they
also slow change down.

On the document side of NoSQL, relationships are usually loose, or the data is
stored **embedded.** A customer's name and address can be embedded directly inside
the order document. With no relational bond, changing one side doesn't break the
other — but that too has a price: the same customer info is repeated across many
documents, and keeping it consistent becomes the **application's** responsibility.

## 4. The difficulty of horizontal scaling

When data outgrows a single server, it has to be spread across several. This is
where the paths of SQL and NoSQL diverge most sharply.

Because SQL tables are tied together by `JOIN`s, splitting the data across servers
(**sharding**) is hard. If table `A` lives on one server and table `B` on another,
combining them with a fast `JOIN` is expensive — the query gets bogged down in
cross-server network traffic. So SQL usually scales **vertically:** toward a more
powerful, more expensive **single** server.

In NoSQL, each document is self-contained and there are no rigid relationships, so
the data spreads comfortably across dozens of servers. When the system gets
congested, one more server goes in behind it; growth is **horizontal** and nearly
linear.

| Criterion | SQL (Relational) | NoSQL (e.g. Document) |
| --- | --- | --- |
| **Schema** | Rigid — every row carries the same schema | Flexible — each document sets its own schema |
| **Adding a column** | `ALTER TABLE`, lock risk in production | Add a field in code, no downtime |
| **Relationships** | Tight and consistent via foreign keys | Loose or embedded |
| **Scaling** | Vertical — a more powerful single server | Horizontal — distribute by adding servers |
| **Consistency** | Strong (ACID), guaranteed by the engine | Usually the application's responsibility |

## Rigidity is not a flaw but a choice

Looking at that table and concluding "then NoSQL is superior in every way" would be
a mistake. SQL's rigidity isn't there for nothing — every line of it buys a
**guarantee.**

SQL enforces its strict rules and safety-first stance through the **ACID**
principles (Atomicity, Consistency, Isolation, Durability). A rigid schema stops bad
data at the door. Foreign keys prevent an order from being written for a user who
doesn't exist. Strong consistency on a single server won't let two operations
corrupt the same balance. SQL's "inflexibility" is the price of data that stays
**consistent and safe at all times.**

NoSQL's flexibility, in turn, often means loosening some of those guarantees. That
isn't a flaw; it's a **different choice.** The right question isn't "which is
better" but "which one does the job at hand call for."

And this is exactly where the real-world answer hides: most large systems don't
**choose** between the two at all.

## The real answer: polyglot persistence

Nearly every large, scalable production project uses an approach called **polyglot
persistence:** instead of committing to a single database technology, pick the
**best-suited database for each job** and run them all side by side in the same
project.

To make this concrete, consider a large e-commerce platform. In such a system, each
piece of data has its own character — its own required level of safety and speed. So
architects split the data into separate drawers:

<pre style="width:max-content;max-width:100%;margin-inline:auto">
                  +-----------------------------------+
                  |           USER / CLIENT           |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |            API GATEWAY            |
                  +-----------------------------------+
                                    |
         +--------------------------+--------------------------+
         |                          |                          |
         v                          v                          v
+------------------+       +------------------+       +------------------+
| Order & Payment  |       | Product Catalog  |       |  Cart & Session  |
|     Service      |       |     Service      |       |     Service      |
+------------------+       +------------------+       +------------------+
         |                          |                          |
         v                          v                          v
+------------------+       +------------------+       +------------------+
|    POSTGRESQL    |       |     MONGODB      |       |      REDIS       |
|   (SQL / ACID)   |       | (NoSQL/Document) |       | (NoSQL/In-Mem)   |
+------------------+       +------------------+       +------------------+
</pre>

### Orders, payments, finance → SQL (PostgreSQL)

In payment and order flows, **consistency is vital.** When a customer pays, the
debit from the account, the invoice, and the stock decrement must either all succeed
together or, on any error, all be rolled back (ACID's *atomicity* principle). The
order here is bound by foreign keys to the ID in the `users` table and the
transaction ID in the `payments` table. In this drawer, even a one-cent
inconsistency is unacceptable — which is why a rigid, relational, ACID-compliant SQL
database is the choice.

### Product catalog → NoSQL / Document (MongoDB)

E-commerce means millions of different products, and **each product's attributes
(its schema) are entirely different:**

- A mobile phone: RAM, storage, camera resolution, screen size
- A T-shirt: size, color, fabric type, collar type
- An apple: just weight

Kept in SQL, this catalog would demand either hundreds of columns per category or a
tangle of `JOIN` tables — most of them filled with `NULL`. In a document database
like MongoDB, each product is stored with its own JSON schema. Adding a new product
type happens instantly, without taking the live system down or waiting on an
`ALTER TABLE`. What this job calls for is **flexibility,** not consistency.

### Cart and session → NoSQL / In-Memory (Redis)

The items in a user's cart and their session data must be read and written **very
fast,** but they don't need to live forever. Redis keeps data in **RAM**
(in-memory) rather than on disk, so it handles hundreds of thousands of reads and
writes per second at microsecond latency. When a product goes into the cart, the
data is written straight to Redis. The moment "complete order" is pressed, the cart
is read from Redis, validated, and handed to PostgreSQL for **durable, safe**
storage. This drawer's priority isn't consistency — it's raw **speed.**

### Search and filtering → NoSQL / Search engine (Elasticsearch)

When someone types "blue running shoes" into the search box, running
`LIKE '%blue%'` over billions of rows overwhelms SQL — the query takes seconds and
locks up the system. A search engine like Elasticsearch **indexes** the words ahead
of time; it tolerates typos and returns the most relevant results in milliseconds.
What's decisive here is **search performance.**

## How do these databases talk to each other?

In this system, each service owns its own job and its own database (microservice
architecture). So how does data that changes in one service reach another? The
answer: not directly, but through a **message broker** (Kafka, for example).

A typical purchase flow works like this:

1. The **Cart Service (Redis)** keeps the cart ready.
2. When the user hits "Buy," the **Order Service (PostgreSQL)** takes over,
   validates the payment with ACID guarantees, and writes the order durably.
3. Once the order completes, a **"product X sold"** message is published to a Kafka
   topic in the background.
4. The **Product Service (MongoDB)**, listening for that message, updates the
   product's stock count.
5. The **Search Service (Elasticsearch)**, listening for the same message,
   refreshes the stock info in its results.

Each database thus does the work it's strongest at without losing touch with the
others; together they play like a loosely coupled orchestra, conducted by events.

## Summary: flexibility isn't a shortfall — it's an axis

Adding a column with `ALTER TABLE` is flexibility too, but at the micro level. The
architectural flexibility meant by "SQL isn't flexible" lives on a different axis —
and SQL constrains it deliberately, so that data stays consistent and safe at all
times. What we call its "inflexibility" is that safety trade-off itself.

So the right reading isn't "SQL weak, NoSQL strong." The two are **opposite ends of
one axis:** rigid consistency and safety on one end, flexibility and scale on the
other. Large real-world systems don't pick an end; they place **each job at the end
it belongs to.** Orders and payments live in PostgreSQL, the catalog in MongoDB, the
cart in Redis, search in Elasticsearch — and they all talk over Kafka. In a modern
architecture there is no single hero: **SQL provides the safety, NoSQL carries the
flexibility and the speed.**
