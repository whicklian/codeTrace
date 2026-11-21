# CodeTrace

> **Interactive Memory & Execution Visualizer for C/C++ Pointers, Java OOP, and SQL Query Execution Plans.**

CodeTrace bridges the gap in computer science education by making invisible low-level runtime behavior—memory allocations, pointer graphs, stack frames, and query execution plans—fully observable and interactive.

---

## 🏛 System Architecture

CodeTrace isolates untrusted code execution using safe, sandboxed execution engines:

```
┌─────────────────────┐      REST / WebSockets      ┌──────────────────────────┐
│   Next.js Frontend  │ ◄─────────────────────────► │   Node.js / Express API  │
│  - Monaco Editor    │                             │  - Trace Parser          │
│  - React Flow Graph │                             │  - Gemini Socratic Agent │
│  - SQL Plan Tree    │                             └────┬────────────────┬────┘
└─────────────────────┘                                  │                │
                                    Docker Sandbox (Unix)│                │ Isolated DB Role
                                                         ▼                ▼
                                            ┌─────────────────┐  ┌──────────────────┐
                                            │   GDB/MI Runner │  │    PostgreSQL    │
                                            │ (g++ -g trace)  │  │ EXPLAIN (FORMAT  │
                                            └─────────────────┘  │      JSON)       │
                                                                 └──────────────────┘
```

1. **C/C++ Memory Tracer (GDB Machine Interface):**
   - Compiles user code with debug symbols (`g++ -g -O0 main.cpp -o app`) inside an isolated, non-networked Docker container (`--network none --memory 128m --cpus 0.5`).
   - Drives `gdb --interpreter=mi2` via a Python wrapper script. At every `step`, dumps stack frames, local variables, and pointer addresses (`&var` and `*ptr`) into a structured JSON trace array.

2. **PostgreSQL Query Plan Visualizer:**
   - Pre-seeded sandbox schemas (e.g., `university_db` with `students`, `courses`, `enrollments`).
   - Executes queries in read-only transactions with `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`.
   - Renders animated query plan trees highlighting bottlenecks (`Seq Scan` vs. `Index Scan`, cost thresholds, row counts).

3. **Socratic Bug Interceptor (Gemini API):**
   - Activated on runtime faults (`SIGSEGV`, null/dangling pointer dereferences) or on-demand via *"I'm Stuck"*.
   - Evaluates code context, failing lines, and memory snapshots to guide students Socratically without simply handing them the solution.

---

## 📂 Repository Structure

```text
codetrace/
├── apps/
│   ├── web/                        # Next.js (App Router, Tailwind CSS, React Flow, Monaco)
│   │   ├── components/
│   │   │   ├── CodeEditor.tsx      # Monaco Editor with active-line & fault highlights
│   │   │   ├── MemoryCanvas.tsx    # React Flow graph linking Stack vars -> Heap addresses
│   │   │   ├── SqlPlanTree.tsx     # Interactive EXPLAIN JSON node visualizer
│   │   │   └── SocraticDrawer.tsx  # Gemini-powered AI tutor panel
│   │   └── app/page.tsx
│   └── api/                        # Node.js + Express REST API
│       ├── routes/
│       │   ├── trace.ts            # POST /api/trace (C++ or SQL execution runner)
│       │   └── hint.ts             # POST /api/hint (Gemini Socratic tutor prompt)
│       └── services/
│           ├── dockerRunner.ts     # Spawns isolated container with execution timeout
│           └── sqlExplainer.ts     # Runs EXPLAIN (FORMAT JSON) queries safely
├── sandbox/                        # Docker container for C/C++ tracing
│   ├── Dockerfile                  # Ubuntu/Alpine + g++ + gdb + python3
│   └── gdb_tracer.py               # GDB/MI protocol driver & JSON serializer
└── schema.sql                      # Database schema for challenges, traces, & hints
```

---

## 🗄 Database Schema

The core database schema is defined in [schema.sql](file:///home/nyxara/Desktop/CodeTrace/schema.sql):

- `challenges`: Curated lab challenges and bug scenarios.
- `execution_traces`: Saved execution traces for instant replay and shareable links.
- `socratic_hints`: Log of student questions and guided Socratic hints.

---

## ⚡ 3-Minute Live Demo Script

1. **0:00 – 0:45 (The Problem):** The barrier of invisible abstractions in introductory CS (pointers, dangling memory, query optimizer decisions).
2. **0:45 – 1:45 (Live C++ Segfault Demo):** Step through a linked-list deletion bug; React Flow visualizes stack boxes and heap allocations with hex addresses. Freeing before pointer advancement marks the node as dangling and triggers the Gemini Socratic tutor.
3. **1:45 – 2:30 (Live SQL Query Plan Demo):** Execute an unindexed multi-table JOIN showing high-cost red `Seq Scan` nodes; add an index live and watch the tree turn green with `Index Only Scan` dropping execution time by 98%.
4. **2:30 – 3:00 (Impact & Vision):** Educational platform integration for CS laboratories and automated conceptual grading.
