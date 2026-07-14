---
title: 'Why Isn''t SQL as "Flexible" as NoSQL — and How Do the Two Live Together in One Project?'
description: 'If a column goes in within seconds via ALTER TABLE, why is SQL called "inflexible"? Because "flexibility" means two things: the micro-flexibility of adding a column, versus the architectural flexibility of changing billions of rows without downtime, a flexible schema, and horizontal scaling. A post on why that rigidity is actually a safety trade-off, and why the real-world answer is using both together (polyglot persistence).'
pubDate: 2026-07-14
tags: ['SQL', 'NoSQL', 'Database', 'Polyglot Persistence', 'Scaling', 'Backend']
draft: false
---

Adding a column to a table is usually a one-line job:

```sql
ALTER TABLE products ADD COLUMN warranty_months INT;
```

The command finishes in seconds. That's exactly why "SQL isn't as flexible as NoSQL" sounds unfair
the first time you hear it: if adding a new field, dropping a column, or adding an index to one is
this easy, what's inflexible about it?

The point to catch is this: the word "flexibility" here means two completely different things.
Running a single `ALTER TABLE` in DBeaver is flexibility at the **micro level.** Flexibility at the
**architectural** level means something else entirely: the database **adapting instantly to
variable data types**, being able to change **billions of rows without downtime**, and **scaling
out without limit.**

This post builds up why SQL is considered "rigid-schema" in four points, then shows that this
rigidity is not a flaw but a **safety trade-off** — and finally explains, through a concrete
scenario, that in the real world the question isn't "SQL or NoSQL" but using both together.

## 1. The "everyone in class wears the same uniform" rule

In SQL, when you add a new column to a table, that column applies to **every row** in the table.
No exceptions.

Suppose a `warranty_months` column is added to the `products` table. If there are 10 million
products, the `warranty_months` field now opens up on all 10 million rows. For products with no
warranty, that field is forced to stay `NULL` (empty). Every row must wear the same schema uniform
— even if a field sits empty, that cell is there and takes up space.

On the document side of NoSQL — MongoDB, for example — there's a **collection** instead of a
"table" and a **document** instead of a "row," and each document is independent of the others:

```
SQL (every row, same schema)        NoSQL / Document (each doc, its own schema)
+------+---------+----------+        { "name": "Phone", "ram": "8GB",
| id   | name    | warranty |          "warranty": 24 }
+------+---------+----------+
| 1    | Phone   | 24       |        { "name": "Apple", "weight": 1.5 }
| 2    | Apple   | NULL     |          ← no "warranty" field at all, takes no space
+------+---------+----------+
```

Each document determines its own structure; a field that isn't there simply doesn't exist for that
document — it doesn't even need to be defined. This is the flexibility that's called "schemaless."

## 2. Adding a column in production is not a "one-line job"

In a development environment, running `ALTER TABLE ADD COLUMN` on an empty or lightly-populated
table really does take 1 second. But in production, things change.

Suppose a new column is added to a table with hundreds of millions of rows that takes thousands of
queries per second. While making this change, the SQL engine often **locks** the table (write lock
/ table lock). During that lock, users on the live system can't write to the table, and in some
cases can't read from it either. The system is temporarily paralyzed — there's **downtime.** In
large systems, changing a SQL schema therefore demands serious planning, a maintenance window, and
risk management. (Modern databases mitigate this with online DDL and tools like
`pt-online-schema-change`, but the underlying problem is still there.)

In NoSQL, since there's no schema, you don't tell the database "I'm adding a new column." In the
backend code you add a new field to the newly saved document and the database accepts it directly.
No locking, no downtime. Old documents keep living without that field.

## 3. Relational bonds (foreign keys) can turn into shackles

SQL's real power comes from being **relational.** Tables are bound to each other by foreign-key
rules, and that guarantees the consistency of the data.

Suppose an `orders` table is bound to a `users` table. When a radical change is wanted in the
order structure or the users table, those relational constraints mean everything has to be kept
consistent in a chain — a domino effect arises. These bonds keep the data safe, but they also slow
change down.

On the document side of NoSQL, relationships are usually loose, or data is stored **embedded.** A
customer's name and address can be embedded directly inside the order document. Since there's no
relational bond, changing one side doesn't break the other — but this has a cost too: the same
customer info is repeated across many documents, and preserving consistency now becomes the
**application's** responsibility.

## 4. The difficulty of horizontal scaling

When data grows too large to fit on a single server, it has to be spread across multiple servers.
This is where the paths of SQL and NoSQL diverge most sharply.

Because SQL tables are bound to each other by `JOIN`s, splitting the data across different servers
(**sharding**) is hard. If table `A` is on one server and table `B` on another, merging them with
a fast `JOIN` is costly — the query gets stuck in cross-server network traffic. So SQL usually
scales **vertically:** it grows toward a more powerful, more expensive **single** server.

In NoSQL, since each document is self-contained and there are no rigid relationships, the data can
be spread comfortably across dozens of servers. As the system gets congested, you add one more
server behind it; it grows **horizontally,** almost linearly.

| Criterion | SQL (Relational) | NoSQL (e.g. Document) |
| --- | --- | --- |
| **Schema** | Rigid — every row carries the same schema | Flexible — each document sets its own schema |
| **Adding a column** | `ALTER TABLE`, lock risk in production | Add a field in code, no downtime |
| **Relationships** | Tight and consistent via foreign keys | Loose or embedded |
| **Scaling** | Vertical — a more powerful single server | Horizontal — distribute by adding servers |
| **Consistency** | Strong (ACID), guaranteed by the engine | Usually the application's responsibility |

## Rigidity is not a flaw but a choice

Looking at this table and concluding "then NoSQL is superior in every way" would be wrong. All of
SQL's rigidity is not for nothing — each part comes in exchange for a **guarantee.**

SQL manages its strict rules and safety priority through the **ACID** principles (Atomicity,
Consistency, Isolation, Durability). A rigid schema stops bad data at the door. Foreign keys
prevent an order from being written for a user who doesn't exist. Strong consistency on a single
server won't let two operations corrupt the same balance. So SQL's "lack of flexibility" is the
price of data staying **always consistent and safe.**

NoSQL's flexibility, meanwhile, often means loosening some of these guarantees. That's not a flaw;
it's simply a **different choice.** The right question isn't "which is better" but "which does the
job at hand want."

And this is exactly where the real-world answer hides: most large systems don't **choose** between
the two.

## The real answer: polyglot persistence

Nearly all large, scalable production projects use an approach called **polyglot persistence:**
instead of being stuck with a single database technology, they pick the **most suitable database
for each job** and run them all together within the same project.

To make this concrete, let's look at the scenario of a large e-commerce platform. In such a system,
each piece of data has a different character — a different level of safety and speed it needs. So
architects split the data into different drawers:

```
                  +-----------------------------------+
                  |          USER / CLIENT           |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |            API GATEWAY           |
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
```

### Orders, payments, finance → SQL (PostgreSQL)

In payment and order processes, **consistency is vital.** When a customer pays, the operations —
debiting the account, issuing the invoice, decrementing stock — must either all succeed together,
or, if there's an error, all be rolled back (ACID's *atomicity* principle). The order here is bound
by foreign keys to the ID in the `users` table and the transaction ID in the `payments` table. In
this drawer, even a one-cent inconsistency is unacceptable — which is why a rigid, relational,
ACID-compliant SQL database is chosen.

### Product catalog → NoSQL / Document (MongoDB)

In e-commerce there are millions of different products, and **each product's attributes (schema)
are entirely different:**

- A mobile phone: RAM, storage, camera resolution, screen size
- A T-shirt: size, color, fabric type, collar type
- An apple: just weight

If this catalog were kept in SQL, you'd have to either open hundreds of columns per category or
build complex `JOIN` tables — and most of those tables would be filled with `NULL`. In a document
database like MongoDB, each product is stored flexibly with its own JSON schema. Adding a new
product type to the system is done instantly, without taking the live system down and without
waiting on an `ALTER TABLE`. The job here wants **flexibility,** not consistency.

### Cart and session → NoSQL / In-Memory (Redis)

The products in a user's cart and their session info must be read and written **very fast,** but
don't need to be stored forever. Redis keeps data in **RAM** (in-memory) rather than on disk, so it
handles hundreds of thousands of reads/writes per second at microsecond latency. When a product is
added to the cart, the data is written straight to Redis. The moment the "complete order" button is
pressed, the cart is read from Redis, validated, and transferred to PostgreSQL for **durable/safe**
storage. This drawer's priority isn't consistency but raw **speed.**

### Search and filtering → NoSQL / Search engine (Elasticsearch)

When "blue running shoes" is typed into the search box, running a `LIKE '%blue%'` search over
billions of rows brings SQL to its knees — the query takes seconds and locks the system. A search
engine like Elasticsearch, on the other hand, **indexes** the words ahead of time; tolerating
typos, it returns the most relevant results within milliseconds. What's decisive here is **search
performance.**

## How do these databases talk to each other?

In this system, each service is responsible for its own job and its own database (microservice
architecture). So how does data that changes in one service reach another? The answer: not
directly, but through a **message broker** (Kafka, for example).

A typical purchase flow works like this:

1. The **Cart Service (Redis)** keeps the cart ready.
2. When the user hits "Buy," the **Order Service (PostgreSQL)** kicks in, validates the payment
   with ACID guarantees, and writes the order durably.
3. Once the order completes, a **"product X sold"** message is published to a Kafka topic in the
   background.
4. The **Product Service (MongoDB)**, listening to that message, updates the stock count of the
   relevant product.
5. The **Search Service (Elasticsearch)**, listening to the same message, refreshes the stock info
   in the results.

This way each database, while doing the job it's strongest at, doesn't get cut off from the
others; they work like a loosely-coupled orchestra over events.

## Summary: flexibility isn't a shortfall but an axis

Adding a column with `ALTER TABLE` is flexibility too, but at the micro level. The architectural
flexibility meant by "SQL isn't flexible" lives on a different axis — and SQL deliberately
constrains it for the sake of keeping data always consistent and safe. What we call its "lack of
flexibility" is really that safety trade-off itself.

So the right reading isn't "SQL weak, NoSQL strong." The two are **two ends of one axis:** rigid
consistency and safety at one end, flexibility and scale at the other. And large real-world systems
don't pick one of these ends; they place **each job at its own end.** The money lives in
PostgreSQL, the catalog in MongoDB, the cart in Redis, search in Elasticsearch — and they all talk
over Kafka. In a modern architecture there's no single hero: **SQL provides safety, NoSQL carries
flexibility and speed.**
