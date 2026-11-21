# CodeTrace

> **Interactive Multi-Language Memory & Execution Visualizer, Debugger, and Project Builder.**

CodeTrace bridges the gap in computer science education and software engineering by making low-level runtime behavior—memory allocations, pointer graphs, object heaps, stack frames, query plans, and multi-file builds—observable and interactive across **C, C++, Python, Java, JavaScript/TypeScript, and SQL**.

---

## 🚀 Key Features

- **🌐 Multi-Language Support**:
  - **C & C++**: Direct GDB/MI2 tracer capturing stack frames, pointer dereferences, heap allocations, and `SIGSEGV` segmentation faults.
  - **Python**: Line-by-line `sys.settrace` execution tracer capturing variable scopes, memory addresses (`id`), recursive call stacks, and exception diagnostics.
  - **Java (OOP)**: Object heap visualizer with reference pointers and class state inspection.
  - **JavaScript / TypeScript**: Node.js runtime execution with variable scope inspect.
  - **PostgreSQL / SQL**: Visual query plan tree analyzer rendering costs, row metrics, and `Seq Scan` vs. `Index Scan` bottlenecks.

- **📁 Multi-File Project Builder & Runner**:
  - Built-in **File Explorer** allowing creation, editing, and deletion of multi-file projects (e.g. `main.cpp` + `LinkedList.h` + `LinkedList.cpp`).
  - **One-Click Build & Run**: Compiles with `g++ -std=c++17 -Wall`, runs scripts with Python 3, Java, or Node, capturing build outputs, exit codes, and execution times.

- **🖥 Integrated Terminal & Build Console**:
  - Live console displaying Build logs, Standard Output (`stdout`), Standard Error (`stderr`), execution duration, and exit status.

- **🧠 Gemini Socratic AI Tutor**:
  - Socratic bug interceptor that never gives away direct fixes—instead asks targeted conceptual questions pointing to the exact memory address, dangling pointer, or scan bottleneck.

---

## 🏛 System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js Web Client                            │
│  • File Explorer (Multi-file projects & templates)                     │
│  • Monaco Code Editor (Active line & runtime fault highlights)         │
│  • React Flow Memory Canvas (Stack ➔ Heap & Dangling Pointers)         │
│  • PostgreSQL EXPLAIN Execution Plan Tree                              │
│  • Integrated Terminal Console (Build logs, stdout, stderr)            │
│  • Gemini Socratic Tutor Drawer ("I'm Stuck")                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Express.js API Engine                           │
│  • POST /api/build  (Compiles & runs multi-file C++, Python, Java, JS)  │
│  • POST /api/trace  (Step-by-step MI2 / sys.settrace execution tracer) │
│  • POST /api/hint   (Gemini 2.5 Socratic guiding question generator)   │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
     ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
     │  GDB/MI Runner   │ │  Python Tracer   │ │    PostgreSQL    │
     │  (C/C++ Pointer  │ │ (sys.settrace    │ │ EXPLAIN (FORMAT  │
     │   Memory Trace)  │ │  Memory & Scope) │ │      JSON)       │
     └──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 📂 Repository Structure

```text
codetrace/
├── apps/
│   ├── web/                        # Next.js (App Router, Tailwind CSS, React Flow, Monaco)
│   │   ├── components/
│   │   │   ├── CodeEditor.tsx      # Monaco Editor with active-line & fault highlights
│   │   │   ├── FileTree.tsx        # Multi-file explorer with starter templates
│   │   │   ├── MemoryCanvas.tsx    # React Flow graph linking Stack vars -> Heap addresses
│   │   │   ├── SqlPlanTree.tsx     # Interactive EXPLAIN JSON node visualizer
│   │   │   ├── TerminalOutput.tsx  # Integrated build & execution output console
│   │   │   └── SocraticDrawer.tsx  # Gemini-powered Socratic AI tutor panel
│   │   └── app/page.tsx
│   └── api/                        # Node.js + Express REST API
│       ├── routes/
│       │   ├── build.ts            # POST /api/build (multi-file project builder)
│       │   ├── trace.ts            # POST /api/trace (C++, Python, Java, JS, SQL tracer)
│       │   └── hint.ts             # POST /api/hint (Gemini Socratic tutor prompt)
│       └── services/
│           ├── projectBuilder.ts   # Compiles and runs multi-file projects with timeouts
│           ├── dockerRunner.ts     # Sandboxed GDB execution runner
│           └── sqlExplainer.ts     # PostgreSQL EXPLAIN (FORMAT JSON) plan analyzer
├── sandbox/                        # Low-level execution tracers
│   ├── Dockerfile                  # Ubuntu sandbox container
│   ├── gdb_tracer.py               # GDB/MI2 step tracer for C/C++ memory
│   └── python_tracer.py            # sys.settrace step tracer for Python memory
└── schema.sql                      # Database schema for challenges, traces, & hints
```

---

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- GCC / G++ (for C/C++ compilation)
- Python 3 (for Python tracing)
- Java Runtime (for Java execution)

### 2. Development Setup

```bash
# Clone the repository
git clone https://github.com/whicklian/codeTrace.git
cd codeTrace

# Start Backend API (runs on http://localhost:3001)
npm run dev:api

# In a separate terminal, start Next.js Frontend (runs on http://localhost:3000)
npm run dev:web
```

### 3. Production Build

```bash
npm run build
```
