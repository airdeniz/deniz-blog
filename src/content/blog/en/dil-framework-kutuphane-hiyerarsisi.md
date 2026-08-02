---
title: 'Language > Framework > Library: A Correct but Incomplete Hierarchy'
description: 'The familiar ordering is right on the scope axis, but it hides the line that actually separates a framework from a library: who holds control. Independent versus framework-bound libraries, when a library is enough and when a framework is worth it, how to diagnose a tool without asking anyone — and the unexpected place Spark, Airflow, Kafka, and dbt occupy in this picture.'
pubDate: 2026-07-15
tags: ['Framework', 'Library', 'Python', 'Spark', 'Data Engineering', 'Backend']
draft: false
---

Almost everyone approaching software from the outside builds this ordering in
their head:

> Programming language > Framework > Library

And the ordering **is not wrong.** On the scope axis it holds up nicely: at the
bottom sits the language itself, above it rise the large skeletons written in that
language (frameworks), and at the top float the small tools that solve a single
problem (libraries). Asked "is this right?", the answer is largely **yes.**

But once the picture is drawn, the questions start piling up: Are libraries always
part of a framework? If I use a framework, am I forced to use libraries? When do I
stand up a whole framework, and when do I say "a library is enough"? And the
sneakiest one: when a new tool crosses my path, do I really have to ask someone
every time whether it's a framework or a library?

This post closes those questions one by one. At the end, we'll apply the same
frame to the heavy hitters of the data world — Spark, Airflow, Kafka, dbt — and
look at the unexpected result that shows up there.

## 1. The hierarchy is right, but it isn't a single axis

The ordering's small flaw is this: arranging everything on one "large to small"
axis hides the real difference between a framework and a library. There are two
separate axes:

- **The scope axis:** The language is the broadest, the framework is built on top
  of it, the library solves an even narrower problem. The opening ordering is
  correct on this axis.
- **The control axis:** This is where the real distinction lives. Its famous name
  is **Inversion of Control**. In one sentence: **you call the library, but the
  framework calls you.**

Defining the three levels means folding in that second axis:

**1. Programming language — the foundation.** It sets the alphabet, the rules, the
syntax of the code. Python, JavaScript, Java. Everything is built on top of it.

**2. Framework — the structural skeleton.** A large structure written in the
language that hands you a ready-made application skeleton. The **framework sets
the rules**; you write your code within the boundaries it draws. Django (Python),
Spring (Java), Angular (TypeScript).

**3. Library — the helper tool.** A narrow collection of code that solves a
specific problem. Control is **entirely yours**: you manage the flow and call the
library when you need it. Pandas, NumPy, Requests.

With a construction analogy:

- **The language** is the building material (bricks, cement). Raw power.
- **The framework** is the house's finished blueprint and load-bearing columns.
  The rooms have fixed positions; you can't step outside the structure.
- **The library** is the ready-made furniture you bring into the house. You pull
  the food processor (Pandas) out of the cupboard when you need it and put it away
  when you're done.

So accepting the "Language > Framework > Library" hierarchy in terms of **scope**
is correct; you just have to remember that the line separating a framework from a
library isn't size but **who holds control.** Every question that follows is
really a consequence of these two axes.

## 2. If I open a file and write `print("deniz")`, what am I using?

Let's start from the purest case, because it sharpens the picture. Open an empty
`.py` file and write only this:

```python
print("deniz")
```

You're using **neither a framework nor a library.** Here you're using only **the
language itself** — plus built-in functions like `print()` that ship in its core
and require no `import`. You brought in no ready-made structure and no helper tool
from outside; you're working purely with the bare power of the language. This is
the most fundamental level.

Let's place that same line across the three levels:

| Level | Equivalent | What you're doing |
| --- | --- | --- |
| **Language (pure Python)** | Writing with pen and paper | `print("deniz")` — a direct core capability of the language |
| **Library** | Pulling a tool from your pocket | If you wrote `import math`, you'd be calling a tool |
| **Framework** | Filling out a ready-made form | With Django, you'd write to a given file structure by its rules |

Keep this bare level in mind, because everything we call a "library" or a
"framework" is a layer added on top of it.

## 3. Are libraries always part of a framework? (Answer: no)

A common misconception: hearing "library," people imagine a component inside some
framework. In reality, the overwhelming majority of libraries are **completely
independent** and stand on their own.

The cleanest example is Pandas. Pandas is tied to no framework (Django, Flask...).
You can open an empty Python file and, with no framework anywhere in sight, import
it purely for data analysis:

```python
import pandas as pd

df = pd.DataFrame({"Name": ["Deniz"], "Age": [29]})
print(df)
```

The relationship comes down to three rules:

- **Libraries are free.** You import Pandas, NumPy, or Requests wherever you like
  and drop them when you're done. You need no framework to use them.
- **Frameworks use libraries.** Behind the scenes, Django pulls in dozens of
  libraries to connect to databases, handle encryption, and process data.
- **You can use both together.** While writing an API with FastAPI, you add Pandas
  to the project to analyze incoming data. Pandas doesn't become part of the
  framework there; it remains an **independent helper** you happen to use in that
  project.

Libraries are like the independent tools in your bag: you can use the screwdriver
(Pandas) to remove a single screw, or inside the construction of a giant factory
(a framework). The screwdriver doesn't belong to the factory.

### And the reverse? Are there libraries that only work with one framework?

Yes — and they aren't exceptions to the rule; they're a separate category. These
are usually called **extensions**, **packages**, or **plugins**. On their own they
do nothing; their sole reason to exist is to close a gap in a specific framework
or grant it a new capability.

- **Django REST Framework (DRF):** Works only with Django; it quickly adds API
  capability to Django projects. Without Django it means nothing.
- **Flask-SQLAlchemy:** Works only with Flask; designed to ease database work in
  Flask projects.
- **Redux:** Technically an independent library, but in practice it's almost
  always paired with React for state management.

Roughly split in two:

| Library type | Trait | Example |
| --- | --- | --- |
| **Fully independent** | Works anywhere: in a single file or inside any framework | Pandas, NumPy, Requests |
| **Framework-bound** | Works only if its framework is installed | Django REST Framework, Flask-SQLAlchemy |

## 4. If I use a framework, must I use libraries? (Again, no)

No. If anything, most modern frameworks come with a "batteries-included"
philosophy and carry nearly everything you need to stand up a project.

Think of Django. Building a website, you get database operations (ORM), user login
and authorization, page routing, and basic security measures — all out of the box.
Without importing a single external library, you can finish a large, secure site
with pure Django alone.

You call an external library only when the framework's own capability runs out:

- **Framework only:** An e-commerce site with Django. No external libraries.
- **Framework + library:** You want to analyze that site's incoming sales data and
  show a chart. That's the moment you add Pandas and Matplotlib to the project.

In short, an external library is a **choice, not an obligation.** As long as the
framework's capability suffices, you touch nothing; when you want to speed things
up or do something special, you call a library in to help.

## 5. We `import` a library — so how do we use a framework?

The difference here is the practical face of the "control axis" from the start.
You call a library in the middle of your own code; a framework seats you inside an
order of its own. That's why using a framework is usually more than a single
`import` line — it spreads across three stages.

**1. Scaffolding the skeleton from the terminal (CLI).** Because a framework is a
large structure, you usually start in the terminal. This command generates a
ready-made folder and file template for you:

```bash
django-admin startproject my_site
```

The moment it runs, the framework creates a folder structure containing config
files, database connections, and routing templates.

**2. Writing code by the framework's rules.** Once the folders exist, the
framework says: "If you're designing a page, write the code in `views.py` and add
its link to `urls.py`." You can't open your own `deniz.py` and run the system from
there. Inside the code you still use `import` — but this time to call the parts
the framework offers you, and control isn't yours:

```python
from django.http import HttpResponse

# A function with the name and shape the framework expects
def home(request):
    return HttpResponse("Hello Deniz!")
```

**3. Bringing the system up with the framework's engine.** For your code to run,
you return to the terminal and start the framework's own engine:

```bash
python manage.py runserver
```

With this command the framework takes full control: it starts a server in the
background, scans your code, and **calls the `home` function itself when the right
request arrives.** You wrote the function and set it aside; the framework decides
when it runs. This is the concrete form of "the framework calls you."

| Action | Library | Framework |
| --- | --- | --- |
| **How does it enter the project?** | `import`ed into your code | Scaffolded via a terminal command |
| **Who's in control?** | You — you manage the flow | The framework — it manages, it calls your code |
| **How is it run?** | Standard `python file.py` | With the framework's command: `python manage.py runserver` |

### On the download side there's no difference: both are `pip install`

Here's the confusing part: we download a library with `pip install` — so what
about a framework? The answer: **also `pip install`.** On the download side there
is no difference at all. In the Python world, everything you add from outside —
whether a giant framework or a tiny library — lives in a shared repository called
**PyPI** (Python Package Index), and `pip` is the package manager that downloads
from it.

```bash
pip install django
```

The difference begins **after** the download:

- A **library** is a *hand tool* you bought: you run `pip install pandas`, then
  immediately open a file, write `import pandas`, and start using it.
- A **framework** is a *large piece of flat-packed furniture*: you run
  `pip install django`, but you can't write code right away; first you have to
  **assemble** it with `django-admin startproject`.

## 6. When a framework, and when is "a library enough"?

Two practical questions remain. First the decision, then the diagnosis.

### The decision: the size, purpose, and management needs of the work

**When a library alone is enough:**

- **You have a single focus:** Just data analysis (Pandas), just charts
  (Matplotlib), just fetching data (Requests), just training a model
  (scikit-learn).
- **You want to keep full control:** "I'll set up my own file structure and add
  libraries as the need arises."
- **You're doing script-level work:** For jobs that run and finish in a single
  file, you don't install a framework.

**When you need a framework:**

- **You're building a large, standard, organized system:** A website
  (Django/FastAPI), a large mobile app.
- **You don't want to reinvent the wheel:** Writing a login system, database
  security, and routing from scratch takes months; a framework hands them to you
  as a package.
- **You're working in a team:** With a framework, everyone knows where the code
  goes. Nobody asks "where do I put the database code?" because its place is
  already fixed.

### The diagnosis: telling framework from library without asking

Good news: you don't need to ask. There are a few clear tells.

**A) Check the "Getting Started" docs (the surest way).** Open the tool's site or
GitHub and skim the intro:

- If the docs have you write `import technology` and start coding directly →
  **library.**
- If the docs have you type a terminal command like `technology-admin start` or
  `create-technology-app` that auto-creates folders → **framework.**

**B) Check the tagline.** The pitch sentence on the homepage usually gives it
away:

- "A Python **library** for data analysis" (Pandas) → library.
- "The web **framework** for perfectionists" (Django) → framework.

**C) The "who's in control?" test.** The mental test: *"Am I calling it, or is it
calling me?"*

- If you call it yourself in the middle of your code — "now read this data"
  (`pd.read_csv()`) → **library.**
- If you write your code and set it aside, and the engine behind it picks your
  code up and runs it at the right moment → **framework.**

## 7. So what about Spark, Airflow, Kafka? The data world's heavy hitters

Now let's apply this frame to data engineering's most-used tools — and something
interesting turns up. Short answer: **Spark and friends are almost all frameworks,
not libraries.** That's exactly why, in big-data projects, opening a single file
and writing code isn't enough: an entire server system (a cluster) is stood up
behind the scenes for these frameworks to run on.

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

What they all share is passing the "who's in control?" test: you say "what" you
want, and the "how" — splitting the data, distributing it across servers,
scheduling — is handled by the engine itself. That, by definition, is framework
behavior.

**Inside** these large frameworks, in turn, live libraries doing narrower jobs.
Spark is a framework; but Spark SQL (writing SQL inside it), MLlib (machine
learning), and Spark Streaming (live streams) are libraries within it. The factory
is Spark; the conveyor belts and robot arms inside it (MLlib, Spark SQL) are the
libraries.

### The interesting part: most of these aren't actually a *Python* framework

Here's the subtle side of the diagnostic test. The answer to "is Spark a Python
framework?" is **precisely no.** At its core, Spark is **written in Scala and runs
on the JVM (Java Virtual Machine).** Its homeland is the Java/Scala world. So how
do we write Spark in Python? **PySpark** steps in between:

- In your code you write `from pyspark.sql import SparkSession`.
- The Python you write is translated behind the scenes into Java/Scala code
  through a bridge called **Py4J**.
- The real heavy lifting — splitting and processing the data — is still done by
  the JVM behind it (Spark Core).
- The result is translated back into Python and handed to you.

So Spark is technically a **JVM framework**; what you install with
`pip install pyspark` is an **interface (wrapper / API)** that lets you drive that
giant engine from Python. But since at the end of the day you get your work done
writing Python, calling it "the big-data framework of the Python ecosystem" isn't
wrong in practice either. The same distinction holds for **Kafka**: Kafka too is a
platform written in Java/Scala; to reach it from Python you use **intermediary
libraries** like `confluent-kafka` or `kafka-python` — the library in your hand,
the framework on the server behind it.

**dbt** and **Airflow** are the other side of the coin: both are **written in
Python.** But that doesn't make them "libraries" — both are frameworks, because
they pass the diagnostic tests. dbt dictates a strict folder structure with
`dbt init`, takes your SQL, compiles it (`dbt run`), and runs it in the data
warehouse. Airflow has you write code into the `dags/` folder; in the background
its own scheduler, web server, and metadata database run continuously, and it —
not you — decides when your code runs. Both even have their own framework-bound
packages (libraries): dbt's `dbt-utils`, like Django's DRF, works only inside dbt
by being listed in `packages.yml`.

In short, "which language it's written in" and "whether it's a framework or a
library" are separate questions. A tool's language tells you where it was written;
whether it's a framework or a library is told by **who holds control.**

## Summary

Back to the opening order: "Programming language > Framework > Library" is a
correct hierarchy **on the scope axis.** The one thing to remember is that the
line separating a framework from a library is not size but **control.**

- **The language** is the foundation; writing `print("deniz")` uses neither a
  framework nor a library — just the language.
- **A library** is an independent tool — most (Pandas) belong to no framework; you
  call it, you `import` it, the flow stays with you.
- **A framework** is a skeleton — it calls you, it sets the rules, it's assembled
  via the CLI; but the download side is the same as a library's (`pip install`).
- **Some libraries** work only inside a specific framework (DRF, Flask-SQLAlchemy,
  dbt-utils).
- **To resolve "framework or library?"** without asking anyone: the
  getting-started docs, the tagline, and the "who's in control?" test.
- **Spark, Flink, Kafka, Airflow, dbt** are all frameworks; but some (Spark,
  Kafka) actually come from the JVM world and reach Python through bridges — the
  language tells you where a tool was written, and control tells you whether it's
  a framework or a library.

Next time you meet a new tool, instead of wondering whom to ask "is this a
framework or a library?", ask a single question: **am I calling it, or is it
calling me?** The rest falls into place on its own.
