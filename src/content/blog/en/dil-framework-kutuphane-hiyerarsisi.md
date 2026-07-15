---
title: 'Language > Framework > Library: Is This Hierarchy Right, and Where Do the Data Tools Fit?'
description: 'The ordering "programming language > framework > library" looks right at first glance, but it isn''t a single axis: alongside the scope axis there is a "who''s in control" axis (Inversion of Control). Are libraries always part of a framework, are there libraries that only work with a specific framework, when do I stand up a whole framework versus say "a library is enough", and how do I tell whether something is a framework or a library without asking anyone? Plus: where the heavy hitters of the data world — Spark, Airflow, Kafka, dbt — sit in this table, and why most of them aren''t actually Python frameworks. A piece that rebuilds the whole picture from scratch.'
pubDate: 2026-07-15
tags: ['Framework', 'Library', 'Python', 'Spark', 'Data Engineering', 'Backend']
draft: false
---

Almost everyone looking at software from the outside builds this ordering in their head:

> Programming language > Framework > Library

And this ordering **is not wrong.** In terms of scope and size it holds up nicely: at the bottom sits
the language itself, above it the giant skeletons written in that language (frameworks), and at the top
the small tools that solve a single problem (libraries). Asked "is this right?", the answer is largely
**yes.**

But once you've drawn this picture, questions start piling up one after another: Are libraries always
part of a framework? If I use a framework, am I forced to use a library? When do I stand up a whole
framework, and when do I say "a library is enough for me"? And the sneakiest one: when a new tool
crosses my path, am I going to learn whether it's a framework or a library by asking someone every
single time?

This piece is here to close exactly those questions, one by one, in order. At the end we'll apply the
same frame to the heavy hitters of the data world — Spark, Airflow, Kafka, dbt — and talk through a
strange surprise that shows up there.

## 1. The hierarchy is right, but it isn't a single axis

The small flaw in the ordering is this: thinking of it as one "large to small" axis hides the real
difference between a framework and a library. There are actually two axes:

- **The scope axis:** The language is the broadest, the framework is a subset of it, the library
  solves an even narrower problem. The opening ordering is correct on this axis.
- **The control axis:** This is where the real distinction lives. Its famous name is **Inversion of
  Control**. In one sentence: **you call the library, but the framework calls you.**

When defining the three levels, you have to fold in this second axis too:

**1. Programming language — the foundation.** It sets the alphabet, the rules, the syntax of the code.
Python, JavaScript, Java. Everything is built on top of it.

**2. Framework — the structural skeleton.** A large structure written in the language that hands you a
ready-made application skeleton. The **framework sets the rules**, and you write your code within the
boundaries it draws. Django (Python), Spring (Java), Angular (TypeScript).

**3. Library — the helper tool.** A narrower collection of code that solves a specific problem. Control
is **entirely yours**: you manage the flow, and you call the library when you need it. Pandas, NumPy,
Requests.

With a construction analogy:

- **The language** is the building material (bricks, cement). Raw power.
- **The framework** is the finished blueprint of the house and its load-bearing columns. The rooms have
  fixed positions; you can't step outside the load-bearing structure.
- **The library** is the ready-made furniture you bring into the house. You pull the food processor
  (Pandas) out of the cupboard when you need it, and put it away when you're done.

So accepting the "Language > Framework > Library" hierarchy in terms of **scope** is correct; you just
have to keep in mind that the line separating a framework from a library isn't size but **who holds
control.** Every question that follows is really a consequence of these two axes.

## 2. When I open a file and write `print("deniz")`, what am I using?

Let's start from the purest case, because it sharpens the picture. If you open an empty `.py` file and
write only this:

```python
print("deniz")
```

You're using **neither a framework nor a library.** Here you're using only **the language itself** —
and its built-in functions like `print()` that ship in the core and require no `import`. You didn't
bring in any "ready-made structure" or "helper tool" from outside; you're working purely with the bare
power of the language. This is the most fundamental, purest level.

Let's place that same line across the three levels:

| Level | Equivalent | What you're doing |
| --- | --- | --- |
| **Language (pure Python)** | Writing with pen and paper | `print("deniz")` — a direct core capability of the language |
| **Library** | Pulling a tool from your pocket | If you wrote `import math`, you'd be calling a tool |
| **Framework** | Filling out a ready-made form | With Django, you'd write to a given file structure by its rules |

Keep this pure level in mind, because everything we call a "library" or a "framework" is a layer added
on top of this bare ground.

## 3. Are libraries always part of a framework? (Answer: no)

A common misconception: when people hear "library," they imagine it as a part inside a framework. But
the overwhelming majority of libraries are **completely independent** and stand on their own.

The cleanest example is Pandas. Pandas is not under the yoke of any framework (Django, Flask...). You
can open an empty Python file and, with no framework at all, import it just for data analysis:

```python
import pandas as pd

df = pd.DataFrame({"Name": ["Deniz"], "Age": [29]})
print(df)
```

We can sum up the relationship in three rules:

- **Libraries are free.** You import Pandas, NumPy, Requests wherever you like and drop them when
  you're done. You need no framework to use them.
- **Frameworks use libraries.** Behind the scenes, Django pulls in dozens of libraries to connect to a
  database, handle encryption, process data.
- **You can use both together.** While writing an API with FastAPI, you add Pandas to your project to
  analyze incoming data. Here Pandas doesn't become part of the framework; it stays an **independent
  helper** you happen to use in that project.

Libraries are like the independent tools in your bag: you can use the screwdriver (Pandas) to remove a
single screw on its own, or inside the construction of a giant factory (framework). The screwdriver
doesn't belong to the factory.

### And the reverse? Are there libraries that only work with a specific framework?

Yes — and these aren't exceptions to the rule, they're a separate category. Such libraries are usually
called **extensions**, **packages**, or **plugins**. They're useless on their own; their sole reason
for existing is to close a gap in a specific framework or grant it a new capability.

- **Django REST Framework (DRF):** Works only with Django. Quickly adds API capability to Django
  projects. Without Django it means nothing.
- **Flask-SQLAlchemy:** Works only with Flask; designed to ease database work in Flask projects.
- **Redux:** Technically an independent library, but in practice it's almost always used together with
  React for state management.

Roughly split in two:

| Library type | Trait | Example |
| --- | --- | --- |
| **Fully independent** | Works anywhere: in a single file or inside any framework | Pandas, NumPy, Requests |
| **Framework-bound** | Works only if its framework is installed | Django REST Framework, Flask-SQLAlchemy |

## 4. If I use a framework, am I forced to use a library? (Again, no)

No. In fact, most modern frameworks come with a "batteries-included" philosophy and carry almost
everything you need to stand up a project inside themselves.

Think of Django. When building a website, database operations (ORM), user login/authorization, page
routing, basic security measures — they all come out of the box. Without importing a single external
library, you can finish a huge, secure site with pure Django alone.

You call an external library only when the framework's own capability isn't enough:

- **Framework only:** An e-commerce site with Django. No external libraries.
- **Framework + library:** You want to analyze the sales data coming into that same site and show a
  chart. That's the moment you add Pandas and Matplotlib to the project.

So an external library isn't an **obligation, it's a choice.** As long as the framework's capability
suffices, you don't touch anything; when you want to speed things up or do something special, you call
the library in for help.

## 5. We `import` a library — so how do we use a framework?

The difference here is really the practical reflection of the "control axis" difference from the start.
You call a library in the middle of your own code; a framework seats you inside an order. That's why
using a framework is usually more than a single `import` line and spreads across three stages.

**1. Scaffolding the skeleton from the terminal (CLI).** Because a framework is a giant structure, you
usually start from the terminal. This command generates a ready-made folder/file template for you:

```bash
django-admin startproject my_site
```

The moment this runs, the framework creates a folder structure for you with config files, database
connections, and routing templates.

**2. Writing code by the framework's rules.** Once the folders exist, the framework says: "If you're
designing a page, write your code in `views.py` and add its link to `urls.py`." You can't open your own
`deniz.py` and run the system there. Inside the code you still use `import` — but this time to call the
parts the framework offers you, and control isn't yours:

```python
from django.http import HttpResponse

# A function with the name and shape the framework expects
def home(request):
    return HttpResponse("Hello Deniz!")
```

**3. Bringing the system up with the framework's engine.** For your code to run, you go back to the
terminal and start the framework's own engine:

```bash
python manage.py runserver
```

With this command the framework takes control entirely: it starts a server in the background, scans
your code, and **calls the `home` function itself when the right request comes in.** You wrote the
function and set it aside; it decides when it runs. This is the concrete form of the sentence "the
framework calls you."

| Action | Library | Framework |
| --- | --- | --- |
| **How does it enter the project?** | `import`ed into your code | Scaffolded via a terminal command |
| **Who's in control?** | You — you manage the flow | The framework — it manages, it calls your code |
| **How is it run?** | Standard `python file.py` | With the framework's command: `python manage.py runserver` |

### On the download side there's no difference: both are `pip install`

Here's the confusing bit: we download a library with `pip install`, so what about a framework? The
answer: **also with `pip install`.** On the download side there's no difference at all. In the Python
world, whatever you add from outside — a giant framework or a tiny library — all live in a shared
repository called **PyPI** (Python Package Index); `pip` is the package manager that downloads from it.

```bash
pip install django
```

The difference begins **after** you download:

- A **library** is a *hand tool* you bought: you say `pip install pandas`, then immediately open a file,
  write `import pandas`, and start using it.
- A **framework** is a *large piece of furniture that arrives flat-packed*: you say `pip install django`
  but you can't write code right away; first you have to **assemble** it with `django-admin
  startproject`.

## 6. When a framework, when is "a library enough"?

Two practical questions remain. First the decision, then the diagnosis.

### The decision: the size, purpose, and management needs of the work

**When a library alone is enough:**

- **When you have a single focus:** Just data analysis (Pandas), just charts (Matplotlib), just fetching
  data (Requests), just training a model (scikit-learn).
- **When you want to keep control entirely in your hands:** "I'll set up my own file structure and
  sprinkle in libraries as needed."
- **When you're doing script-level work:** For jobs that run and finish in a single file, you don't
  install a framework.

**When you need a framework:**

- **When you're building a big, standard, organized system:** A website (Django/FastAPI), a large mobile
  app.
- **When you don't want to reinvent the wheel:** Writing a login system, database security, routing from
  scratch takes months; a framework hands them to you as a package.
- **When you're working in a team:** With a framework, everyone knows where the code goes. Nobody asks
  "where do I put the database code?" because its place is already fixed.

### The diagnosis: telling framework from library without asking

Good news: you don't need to ask. There are a few clear tells.

**A) Look at the "Getting Started" docs (the safest way).** Go to the technology's site/GitHub and
glance at the intro:

- If the docs have you write `import technology` and start coding directly → **library.**
- If the docs have you type a terminal command like `technology-admin start` or `create-technology-app`
  that auto-creates folders → **framework.**

**B) Look at the tagline.** The intro sentence on the homepage often gives it away:

- "A Python **library** for data analysis" (Pandas) → library.
- "The web **framework** for perfectionists" (Django) → framework.

**C) The "who's in control?" test.** A mental test: *"Am I calling it, or is it calling me?"*

- If you call it yourself in the middle of your code — "now read this data" (`pd.read_csv()`) →
  **library.**
- If you write your code and set it aside, and the engine behind it picks up your code and runs it
  whenever it wants → **framework.**

## 7. So what about Spark, Airflow, Kafka? The data world's heavy hitters

Now let's apply this frame to the most-used tools of data engineering — and there's a nice surprise
there. Short answer: **almost all of Spark and friends are frameworks, not libraries.** That's exactly
why, in big-data projects, opening a single file and writing code isn't enough; behind the scenes a
whole server system (a cluster) is set up for these frameworks to run on.

The most-used, grouped by area:

| Framework | What it does | The "who's in control?" test |
| --- | --- | --- |
| **Apache Spark** | Distributed, in-memory big-data processing | You say "what" you want; Spark's engine handles splitting data across servers and computing |
| **Apache Flink** | Real-time (true streaming) data processing | The engine processes each event in its own stream |
| **Apache Kafka** | Live data transport / event streaming between systems | Its own "broker" servers run continuously in the background |
| **Apache Airflow** | Workflow (pipeline) scheduling and orchestration | You drop your code in `dags/`; the scheduler decides when it runs |
| **dbt** | Transformation/modeling in the data warehouse with SQL | It compiles and runs with `dbt run`; it dictates the folder structure |
| **Trino / Presto** | Querying different sources with a single SQL | The engine distributes and merges the query |
| **Ray** | Distributing Python AI/ML workloads across a cluster | The engine manages the distribution |

What they all share is passing the "who's in control?" test above: you say "what" you want, and the
"how" — splitting the data, distributing it across servers, scheduling — is handled by the engine
itself. That, by definition, is framework behavior.

**Inside** these big frameworks, in turn, live libraries that do narrower jobs. Spark is a framework;
but Spark SQL (writing SQL inside it), MLlib (machine learning), and Spark Streaming (live streaming)
are libraries within it. The factory is Spark; the conveyor belts and robot arms inside it (MLlib,
Spark SQL) are the libraries.

### The surprise: most of these aren't actually a *Python* framework

Here's the subtle part of the diagnostic test. The answer to "is Spark a Python framework?" is
**precisely no.** Spark is at its core **written in Scala and runs on the JVM (Java Virtual Machine).**
Its homeland is the Java/Scala world. So how do we write Spark in Python? **PySpark** steps in between:

- In your code you write `from pyspark.sql import SparkSession`.
- The Python you write is translated behind the scenes into Java/Scala code via a bridge called
  **Py4J**.
- The real heavy lifting — splitting and processing the data — is still done by the JVM behind it
  (Spark Core).
- The result is translated back into Python and handed to you.

So Spark is technically a **JVM framework**; what you use via `pip install pyspark` is an **interface
(wrapper / API)** that lets you drive that giant engine from Python. But since at the end of the day you
get your work done writing Python, calling it "the big-data framework of the Python ecosystem" isn't
wrong in practice either. The same distinction holds for **Kafka**: Kafka is also a platform written in
Java/Scala; to connect to it from Python you use **intermediary libraries** like `confluent-kafka` or
`kafka-python` — the library in your hand, the framework on the server behind it.

**dbt** and **Airflow** are the other side of the coin: both are **written in Python.** But that doesn't
make them "libraries" — both are frameworks, because they pass the diagnostic tests. dbt dictates a
strict folder structure with `dbt init`, takes your SQL and compiles it (`dbt run`), and runs it in the
data warehouse. Airflow has you write your code into the `dags/` folder, and in the background its own
scheduler, web server, and metadata database run continuously; it — not you — decides when to run your
code. Both even have their own framework-bound packages (libraries): dbt's `dbt-utils`, like Django's
DRF, works only inside dbt by being listed in `packages.yml`.

In short, "which language it's written in" and "whether it's a framework or a library" are separate
questions. A tool's language tells you where it was written; whether it's a framework or a library is
told by **who holds control.**

## Summary

Back to the opening order: "Programming language > Framework > Library" is a correct hierarchy **on the
scope axis.** The only thing not to forget is that the line separating a framework from a library is not
size but **control.**

- **The language** is the foundation; when you write `print("deniz")`, it's neither a framework nor a
  library — you're just using the language.
- **A library** is an independent tool — most (Pandas) belong to no framework; you call it, you `import`
  it, the flow stays with you.
- **A framework** is a skeleton — it calls you, it sets the rules, it's set up via the CLI; but the
  download side is the same as a library (`pip install`).
- **Some libraries** work only inside a specific framework (DRF, Flask-SQLAlchemy, dbt-utils).
- **The way to resolve "framework or library?"** without asking: the getting-started docs, the tagline,
  and the "who's in control?" test.
- **Spark, Flink, Kafka, Airflow, dbt** are all frameworks; but some (Spark, Kafka) actually come from
  the JVM world and connect to Python through bridges — the language tells you where it was written, and
  control tells you whether it's a framework or a library.

Next time you meet a new tool, instead of wondering who to ask "is this a framework or a library?", ask
a single question: **am I calling it, or is it calling me?** The rest falls into place on its own.
