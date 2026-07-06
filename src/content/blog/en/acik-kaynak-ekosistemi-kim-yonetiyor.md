---
title: 'For Someone Coming From a Monolith: Where Do These Tools Recognize Each Other, and Who Governs the Ecosystem?'
description: 'When you come from a world like Oracle that gathers everything under one roof, the way open-source tools click together like lego feels like magic. So how does git get recognized in PowerShell, what does pip install actually do, which contract lets Airflow talk to Spark, and most importantly — who governs all of this? A piece that rebuilds, from scratch, an order with no one at the center.'
pubDate: 2026-07-06
tags: ['Open Source', 'PATH', 'CLI', 'Python', 'Ecosystem', 'Standards', 'Backend']
draft: false
---

Someone who has worked for years in a monolithic world like Oracle develops a certain reflex:
the database, the ETL tool (ODI), replication (GoldenGate), reporting (OBIEE)... they are all
parts designed by **a single company** and pre-soldered to one another. Integration is set up
by the company "from above"; the user merely uses it. Stepping out of that world and looking at
modern software is disorienting: `git`, `docker`, `python`, `airflow`, `spark`... each is the
product of a separate company or community. Yet they work together flawlessly, as if someone sat
down and wired them all up.

And that is exactly where the real question begins: **When Windows has never even heard of `git`,
how does typing `git status` into PowerShell actually work? When Python runs `import airflow`, what
is it finding? And most piercingly of all: who decides that these tools should recognize each other,
and when?** Is there some "ministry of software" out there?

The short answer: no, there is no one at the center. Let's build up the long answer in this piece,
comparing it against those monolith reflexes as we go.

## 1. Where does PowerShell recognize `git` from? The answer: PATH

Let's demolish the first misconception right away: **PowerShell does not know a command called
`git`.** Neither does cmd, bash, or zsh. When you type `git status`, what the shell does is really
just a bit of simple clerical work:

1. It scans the folders listed in an environment variable called **PATH**, left to right, asking
   "is there an executable file called `git` here?"
2. When it finds one somewhere like `C:\Program Files\Git\cmd\git.exe`, it runs that `.exe`.
3. It passes along the arguments you typed (`status`) exactly as they are.

So there is no such thing as Windows "adapting" to Git. When Git is installed, **the installer adds
Git's folder to the PATH variable.** That's all. The same thing happens when you install Docker
Desktop. In PowerShell, this command shows you that list exactly as it is:

```powershell
$env:PATH -split ';'
```

Inside this output you'll find Git, Docker, and — if an Oracle client is installed — even the folder
holding `sqlplus`, because the reason `sqlplus` runs when you type it in the terminal is the exact
same mechanism. When the Oracle client was installed, it added its own `bin` folder to PATH, and
that's it.

### An analogy in Oracle terms

You can think of PATH as the shell's `ALL_OBJECTS`. Just as, when you say `SELECT * FROM table`,
Oracle first searches the current schema, then synonyms, then public objects; the shell searches for
the command in PATH's folders **left to right and runs the first one it finds.**

This "run the first one you find" behavior is also the source of a famous headache: if a machine has
two Pythons installed and typing `python` opens "the wrong one," the reason is almost always that
that version's folder comes first in PATH. **Whoever is earlier in PATH wins.**

### So when was this "agreement" made?

It never was. There is no signed accord anywhere. This convention comes from **Unix (the 1970s):**
commands are just files on disk, and the shell finds them along a search path. DOS imitated this
logic, Windows inherited it from DOS, and PowerShell inherited it from Windows. So Git or Docker
don't perform any special "magic" for Windows; they simply use a **standard door the operating system
has left open for 50 years** (PATH and command-line conventions).

Keep the key idea here in mind, because the second section repeats it exactly: **there is no
integration, only conformance to a shared convention.**

## 2. How do Airflow and Spark "integrate" inside Python?

The same elegance is at work here too. **Python itself does not know Airflow or Spark.** The only
thing Python knows is this: when you say `import x`, look for `x` in a set of specific folders. The
list of those folders is called `sys.path` — you can roughly think of it as **the Python version of
PATH.**

What happens when you run `pip install pyspark`?

1. `pip` connects to a central repository called **PyPI** (like a repository in the Oracle world,
   but public, where anyone can upload a package).
2. It downloads the package and puts it into the `site-packages` folder.
3. Now `import pyspark` works, because that folder is inside `sys.path`.

Adding Spark capability to Airflow is exactly the same: there is a package called
`apache-airflow-providers-apache-spark`, and once installed, Airflow finds it on `sys.path` and
ready-made components like `SparkSubmitOperator` become available for use.

### The real question: how do these packages talk to each other?

Finding a package is one thing; but two tools written in different languages genuinely **understanding
each other** is another. Airflow is written in Python, while Spark is mostly Scala/Java (running on
the JVM). How do they talk? The answer comes down to a single concept: **interface (API) contracts.**

Every tool publishes a contract that says, "if you want to talk to me, follow these rules":

- **Spark** says: "If you connect to me over the JVM via a bridge called **Py4J**, I'll talk to you."
  PySpark is precisely a Python package that obeys this contract — behind the scenes it carries messages
  between Python and Spark's Java virtual machine.
- **Kafka** says: "Talk to me over TCP using this binary protocol." There are a lot of different clients
  that obey this contract: `kafka-python`, the Java client, a Go client, a Rust client... Because they
  all speak the same protocol, they all work with the same Kafka. CDC tools like Debezium also push data
  into Kafka using this protocol.
- **Airflow** says: "Write me an `Operator` class, fill in the `execute()` method, and I'll handle the
  rest." Everyone writes their own "provider" by conforming to this framework.

So integration is not magic; it's **open contracts, published in advance, that everyone conforms to.**
For one tool to "recognize" another really means that tool has written a piece of code that obeys the
contract the other one has declared.

### A familiar example from the Oracle world: Knowledge Modules

This logic is actually not at all foreign to an Oracle developer. Think of the **Knowledge Modules**
in ODI: ODI says, "If you write these steps in this template structure, I'll run you automatically in
every mapping." The developer then writes a KM that conforms to that framework, and ODI recognizes it.
**Airflow providers are exactly this:** plugins that conform to the framework Airflow lays out. The
difference is that in ODI, Oracle draws the framework; in open source, the framework is drawn by a
community that everyone can see and everyone can contribute to.

This is why Python is called a **"glue language."** It is itself written in C, but it can easily build
bridges to Java, Scala, C++, and Rust. That's why, in the data world, the adhesive that binds together
enormous engines written in different languages is most often Python.

## 3. So who governs all of this?

This is the most piercing part of it all. Someone coming from a monolith keeps looking for **a manager:**
"If this many tools fit together this well, someone must be sitting at the head of the table making
decisions." But that's not how it works. **There is no central manager.** Instead, there is a **layered
order:**

- **Standards bodies** lay the very bottom foundation. The TCP/IP and HTTP protocols (IETF), POSIX (IEEE),
  Unicode, the SQL standard... These are like the shared "data types" of the internet and operating
  systems. No one can change them single-handedly.
- **Foundations** host the large projects. The **Apache Software Foundation** (Kafka, Spark, Airflow,
  Iceberg — almost the entirety of a modern data stack!), the Linux Foundation, the Python Software
  Foundation... These are non-profit, neutral structures kept alive by volunteers and corporate support.
  They guard the copyright and the direction.
- **Companies** publish the APIs for their own products and take **backward compatibility** meticulously
  seriously. Because if an API breaks, the systems of everyone relying on that API blow up, and no one
  uses that tool ever again. Here, compatibility is a commercial necessity.
- **De facto standards** form on their own when the most widespread option wins. No committee chose Git;
  everyone just used it and it eliminated its rivals. No one declared JSON a "standard"; it was so
  practical that it became one.

So the order is built not "top-down by command" but **"bottom-up by conformance."** A tool that obeys an
open contract joins the ecosystem; one that doesn't goes unused and disappears.

## 4. How does a new technology get "accepted" into the ecosystem?

Here's the most confusing part: **If a brand-new tool came out today — say, the very day Iceberg first
appeared — who decides that tools like Spark, Airflow, and Trino should start recognizing it, and when?**
(Apache Iceberg really did emerge from inside Netflix around 2018 and has become the industry standard
today.) The process is a living example of that very "no one at the center" idea from above. It works
through an organic evolution:

**Stage 0 — Birth.** A large company (for instance, Netflix) hits a massive problem with the existing
tools (the old Hive table format), builds a solution internally, and says, "let's not carry this alone,
let's make it open source so everyone can both use it and improve it," handing the project over to a
foundation (the ASF).

**Stage 1 — The inventor builds the first bridges.** If a new technology wants to catch on, it has to
talk to the tools people already use. So the core team that wrote Iceberg, as their first order of
business, **writes the Spark and Flink connectors themselves.** The newcomer lays the first pipeline into
the ecosystem, because it's the one that needs to catch on.

**Stage 2 — Community pressure.** Success stories spread ("we switched to Iceberg, costs dropped, queries
flew"). Engineers who read these open issues on Airflow's GitHub: "we switched to Iceberg but you don't
have a dedicated operator for it — when are you going to add one?" Demand piles up.

**Stage 3 — Two forces make the decision.** The first is the **volunteer community:** an eager developer
says "I need this too," writes the provider, sends it to the Airflow maintainers, they review and approve
it, and in the next release Iceberg is officially recognized. The second — and often the more powerful —
is **commercial interest:** giants like Databricks, Snowflake, and AWS *must* support every popular new
technology to keep their customers. When Snowflake sees its customers want Iceberg, it assigns its own
engineers to it; competition speeds integration up incredibly. (Indeed, Snowflake acquired Tabular, the
company behind Iceberg.)

A rough chronology:

| Time | What's happening? | Who's doing it? |
| --- | --- | --- |
| Month 0 | The technology is born, becomes open source | The inventor company (e.g. Netflix) |
| Months 1–6 | First bridges to the 1-2 most popular tools | Core developers |
| Months 6–12 | Success stories spread, demand piles up | Engineers in the field |
| Months 12–24 | Adjacent tools (Airflow, Trino) ship official packages | Community + companies |
| ~Year 3 | Cloud giants make a "click-to-install" service | AWS, Azure, GCP |

For a technology to go from birth to "recognized natively everywhere" generally takes **1-3 years.**
Unlike Oracle's single-handed calendar of "this year I'm adding this feature," here **the technology that
is good, solves a problem, and has the wind at its back forces the ecosystem to recognize it.** And to
survive, the ecosystem takes that new lego in.

## Summary: comparing two worlds

The most useful framework for translating the monolith model into this new world is this:

| Criterion | Oracle (Monolith) | Modern Open-Source Stack |
| --- | --- | --- |
| **Who designs it?** | A single company, controlling every layer | No one — a layered, distributed order |
| **Direction of integration** | Top-down, pre-soldered | Bottom-up, by conforming to open contracts |
| **The parts** | Interdependent, one roof | Independent legos, each doing one job well |
| **New features** | Tied to the company's calendar | Decided by need + community + competition |
| **Governance** | Central (Oracle) | Standards, foundations, de facto conventions |

If we gather the three mechanisms into a single sentence each:

- **Shell commands** (`git`, `docker`, `sqlplus`) = **PATH** + `.exe` files on disk.
- **Python integrations** (Airflow, Spark) = the **pip + `import`** mechanism + **API contracts**.
- **Governance** = not a central boss; a mix of standards, foundations, and de facto conventions.

For someone coming from a monolith, it's completely natural to be amazed at "how is everything this
integrated with everything else?" But the secret is this: **no one integrated these with each other.**
Each tool left behind an open door everyone can see (PATH), an open repository (PyPI), and an open
contract (API). When those legos are joined together, what's really happening is that you're passing
through doors that have been standing there for years. The next time you type `git status` or run
`pip install`, you can see that what's turning behind the scenes isn't magic, but a 50-year-old
convention.
