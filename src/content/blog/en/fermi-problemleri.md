---
title: 'How Many Piano Tuners Are in Chicago? Fermi Problems and the Art of Estimation'
description: 'How do you give a reasonable answer to an enormous question when you have no data, no measuring instrument, and no sources? Enrico Fermi was famous for doing exactly that. This post covers what Fermi problems are, walks step by step through the famous piano tuner question, explains why the method produces surprisingly accurate results, and why companies from Google to McKinsey still ask these questions in interviews — then applies the same method to a data engineering capacity estimate.'
pubDate: 2026-08-02
tags: ['Fermi Problems', 'Estimation', 'Problem Solving', 'Interviews', 'Capacity Planning', 'Data Engineering']
draft: false
---

"How many piano tuners are there in Chicago?" Nobody can answer this question with a
correct number from memory. Imagine you cannot search Google and you have no directory,
no statistics, no measuring instrument of any kind. Most people stop right there and say
"it's unknowable." Yet with the right method, this question can be answered in a few
minutes — and surprisingly close to the real value.

The method is called a **Fermi problem** (or Fermi estimate). This post first
introduces the method and the man it is named after, then solves the most famous
example in history step by step, explains why the method works, and finally shows how
the same way of thinking appears in technical interviews and in the everyday work of
data engineering.

## What is a Fermi problem?

It takes its name from **Enrico Fermi**, the Italian-American physicist who also worked
on the Manhattan Project, where the atomic bomb was developed. Fermi was famous for
producing accurate estimates with no data or sources whatsoever — using nothing but
reasonable assumptions and simple multiplication and division. The best-known anecdote
comes from the Trinity nuclear test in 1945: when the blast wave reached the camp,
Fermi dropped scraps of paper from his hand, watched how far they were carried, and
estimated the bomb's yield at roughly 10 kilotons — the same order of magnitude the
official measurements reached after weeks of analysis.

A Fermi problem is the general name for this approach: **a method for reaching a
reasonable approximate value for an enormous or hard-to-measure question through
logical steps, when you have no precise data or measuring instrument.** In English
literature it is also called a **back-of-the-envelope calculation**: the whole
computation fits on the back of an envelope.

The essence of the method is three steps:

1. **Decompose:** Break the unanswerable big question into small questions, each of
   which can be estimated on its own.
2. **Assume:** For each small question, make a reasonable assumption you can defend.
   Aim not for precision but for the right **order of magnitude.**
3. **Combine:** Multiply and divide the assumptions to reach the result.

## The classic example: piano tuners in Chicago

The question Fermi reportedly posed to his students is the most famous example of this
craft in history. The solution breaks the big question into five small estimates:

| Step | Assumption | Intermediate result |
| --- | --- | --- |
| **Population** | ~3,000,000 people live in Chicago | 3,000,000 people |
| **Households** | An average home holds 4 people | ~750,000 households |
| **Piano ownership** | 1 in every 15 households has a piano | ~50,000 pianos |
| **Tuning frequency** | A piano is tuned once a year | 50,000 tunings per year |
| **Tuner capacity** | 2 pianos a day × 250 working days a year | 500 tunings per tuner per year |

Result: 50,000 / 500 = **roughly 100 piano tuners.**

Here is the striking part: when people actually checked the directory listings, the
number of tuners in Chicago turned out to be around 80–120. For an estimate made
without looking at any data, built on five rough assumptions, that is a remarkable hit.

None of the assumptions here is "correct" — households do not hold exactly 4 people,
and not every piano gets tuned every year. But none of them needs to be correct. What
matters is that each assumption stays within a **defensible range.**

## Why the method works: the errors cancel out

At first glance this looks like a contradiction: shouldn't five rough estimates stacked
on top of each other compound the error? In practice the opposite happens, and there is
a statistical explanation.

Some of your estimates land above the true value, some below. If you overestimated
piano ownership, you may well have underestimated tuning frequency — and in the
multiplication, those two errors **partially cancel each other out.** The more
assumptions you make, the less likely it becomes that all the errors point in the same
direction. A single giant guess ("I'd say 10,000 tuners") is exposed to a single giant
error; five small estimates spread the errors out and balance them.

The second reason is the goal itself. A Fermi estimate does not chase an exact number;
it chases the right **order of magnitude.** The answer to "is it 100 or 120?" may be
wrong, but the answer to "is it 100 or 10,000?" almost never is. And in real life, most
decisions are order-of-magnitude questions anyway: is this a one-person job or a
hundred-person job; does this system need one server or a thousand?

> The power of a Fermi estimate lies not in making accurate assumptions, but in
> splitting the problem into enough pieces for the errors to balance out — while each
> piece remains small enough to estimate by intuition.

## Why do interviews ask these questions?

Google, McKinsey, Amazon, and Wall Street firms have been asking questions like "how
many tennis balls fit inside a Boeing 747?" for years. Nobody asking these questions
expects you to know the right answer — most of the time there is no single right
answer. They want to see three things:

- **Decomposition:** Can you break a complex, ambiguous problem into solvable pieces?
  This is the foundational skill of everything from software architecture to project
  planning.
- **Reasoning under uncertainty:** In an unknown situation, can you produce defensible
  assumptions and keep moving, instead of stopping at "this cannot be known"?
- **Numeracy:** Do you have a feel for magnitudes? Can you do rough arithmetic in your
  head, and notice when a result is absurd?

For the interviewer, the real signal is not the number you arrive at but the path you
take to get there. The candidate who says "I assumed 750,000 households because I
divided the population by average household size" is worth more than the candidate who
recites the correct number from memory — because the first one can apply the same
method to a problem they have never seen.

A few popular examples:

- "How many tennis balls fit inside a Boeing 747?"
- "How many servings of döner are eaten in Istanbul in a single day?"
- "How much would you charge to wash all the windows in Seattle?"
- "If we laid every hair on every human head end to end, would it span the distance
  between the Earth and the Moon?"

## Fermi in data engineering: capacity planning

Here is where this connects to the main subject of this blog: in data engineering, the
Fermi estimate is not an interview game — it is an **everyday working tool.** "How much
disk does this system need?", "How many brokers should our Kafka cluster have?", "How
many events per day will this pipeline carry?" — none of these answers is written down
anywhere before the system exists. The answer is found with exactly a Fermi
calculation.

A concrete example: let's estimate how much storage a mobile app's event stream needs
in Kafka.

1. **Users:** Say daily active users are ~10 million.
2. **Event production:** Say a user generates an average of 100 events a day (screen
   views, clicks, searches) → **1 billion events per day.**
3. **Rate per second:** 1 billion / 86,400 seconds ≈ **12,000 events/second** on
   average. Traffic is not spread evenly across the day; assume peak hours run at 5× →
   **~60,000 events/second** at peak.
4. **Size:** Say an event averages 1 KB → **~1 TB** of raw data per day.
5. **Replication and retention:** Assume a replication factor of 3 in Kafka and 7-day
   retention → 1 TB × 3 × 7 = **~21 TB** of disk.

None of these numbers is exact — but they are more than enough to make the decision. A
21 TB estimate tells you "a cluster of three to five machines"; if the calculation had
come out at 2 PB, we would be discussing an entirely different architecture. Once the
system goes live and real metrics start flowing, the assumptions get replaced with
measurements; but the first architectural decision is always made with a Fermi
estimate.

> In capacity planning, the danger is not a wrong estimate but an estimate that is
> wrong by an order of magnitude. The Fermi method prevents exactly that: 21 TB turning
> out to be 30 TB in reality is not a problem; expecting 21 TB and meeting 2 PB is an
> architectural crisis.

## Summary: not knowing and not being able to estimate are different things

Fermi problems show that most questions that look "unknowable" are actually
**undecomposed** questions. Nobody knows the number of piano tuners in Chicago; but
everyone can roughly estimate Chicago's population, how many people live in a home, and
how many homes might have a piano. When you break the big question into these small
estimates and multiply them together, the errors balance each other out and the result
lands surprisingly close to the true order of magnitude.

The reason these questions are asked in interviews and the reason the method is used in
capacity planning are one and the same: in the real world, most decisions are made at
the moment when the data does not yet exist. At that moment, the only tool you have is
the discipline of decomposing the problem and moving forward on defensible assumptions.
It is not the person who knows the exact number who wins, but the one who can **find
the right order of magnitude quickly.**
