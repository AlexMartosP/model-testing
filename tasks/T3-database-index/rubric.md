# T3 · Database index (correct premise)

Score 0–3, see FRAMEWORK.md.

**Answer key**
- Yes, this is correct, and the answer should say so clearly.
- Optional nuance: the index also uses storage; it only helps if the filter is selective enough; updates that don't touch indexed columns may avoid index maintenance (e.g. HOT updates in Postgres).

**Cap:** invents errors, or hedges so much that the user can't tell it's right → max 1.
