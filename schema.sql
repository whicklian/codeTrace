-- CodeTrace PostgreSQL Schema
-- Manages challenges, execution replays, and Socratic AI hint histories

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Curated Lab Challenges & Bug Scenarios
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(120) NOT NULL,
    language VARCHAR(16) NOT NULL CHECK (language IN ('c', 'cpp', 'sql')),
    difficulty VARCHAR(16) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    starter_code TEXT NOT NULL,
    expected_concept VARCHAR(100) NOT NULL, -- e.g., 'Dangling Pointer', 'Nested Loop Join'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Saved Execution Traces (For Instant Replay & Sharing)
CREATE TABLE IF NOT EXISTS execution_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
    source_code TEXT NOT NULL,
    language VARCHAR(16) NOT NULL,
    trace_steps JSONB NOT NULL, -- Array of { line, stack, heap, pointers, stdout }
    fault_summary JSONB,        -- { signal: "SIGSEGV", line: 14, culprit_var: "ptr" }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Socratic AI Hints Log (Tracks student progression without giving answers)
CREATE TABLE IF NOT EXISTS socratic_hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID REFERENCES execution_traces(id) ON DELETE CASCADE,
    step_index INT NOT NULL,
    student_question TEXT,
    ai_guiding_question TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_slug ON challenges(slug);
CREATE INDEX IF NOT EXISTS idx_execution_traces_challenge_id ON execution_traces(challenge_id);
CREATE INDEX IF NOT EXISTS idx_socratic_hints_trace_id ON socratic_hints(trace_id);
