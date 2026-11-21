#!/usr/bin/env python3
"""
GDB/MI Memory Tracer for CodeTrace.
Compiles C/C++ code with debug symbols and steps through execution line by line,
capturing stack frames, local variables, pointer addresses, and signals.
Outputs a structured JSON trace array to stdout.
"""

import sys
import os
import json
import subprocess
import re

def compile_source(source_path: str, binary_path: str, lang: str = "cpp") -> tuple[bool, str]:
    compiler = "g++" if lang in ("cpp", "c++") else "gcc"
    cmd = [compiler, "-g", "-O0", "-fno-omit-frame-pointer", source_path, "-o", binary_path]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if res.returncode != 0:
            return False, res.stderr
        return True, ""
    except Exception as e:
        return False, str(e)

def parse_mi_output(output: str):
    """Simple parser for key GDB/MI output tokens."""
    return output.strip().splitlines()

def trace_execution(binary_path: str, source_filename: str, max_steps: int = 500) -> dict:
    steps = []
    fault_summary = None
    stdout_chunks = []

    # Launch GDB with MI2 interface
    gdb_cmd = [
        "gdb",
        "--interpreter=mi2",
        "--nx",
        "--quiet",
        binary_path
    ]

    proc = subprocess.Popen(
        gdb_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )

    def send_cmd(cmd: str):
        proc.stdin.write(cmd + "\n")
        proc.stdin.flush()

    def read_until_prompt():
        lines = []
        while True:
            line = proc.stdout.readline()
            if not line:
                break
            lines.append(line.strip())
            if line.strip() == "(gdb)":
                break
        return lines

    try:
        # Initial gdb banner
        read_until_prompt()

        # Set breakpoint at main
        send_cmd("-break-insert main")
        read_until_prompt()

        # Run program
        send_cmd("-exec-run")
        run_output = read_until_prompt()

        step_count = 0
        while step_count < max_steps:
            step_count += 1

            # 1. Inspect current frame
            send_cmd("-stack-info-frame")
            frame_lines = read_until_prompt()
            frame_text = " ".join(frame_lines)

            # Extract line and func
            line_match = re.search(r'line="(\d+)"', frame_text)
            file_match = re.search(r'file="([^"]+)"', frame_text)
            func_match = re.search(r'func="([^"]+)"', frame_text)

            current_line = int(line_match.group(1)) if line_match else None
            current_file = file_match.group(1) if file_match else None
            current_func = func_match.group(1) if func_match else None

            # Only record steps in user's source code
            is_user_file = (not current_file) or (source_filename in current_file) or (current_file == os.path.basename(source_filename))

            # 2. Inspect variables
            variables = []
            send_cmd("-stack-list-variables --all-values")
            var_lines = read_until_prompt()
            var_text = " ".join(var_lines)
            
            # Find variable matches: name="var",value="val"
            var_matches = re.findall(r'name="([^"]+)",value="([^"]*)"', var_text)
            for var_name, var_val in var_matches:
                # Query variable address and type
                send_cmd(f'-data-evaluate-expression "&{var_name}"')
                addr_lines = read_until_prompt()
                addr_text = " ".join(addr_lines)
                addr_match = re.search(r'value="([^"]+)"', addr_text)
                address = addr_match.group(1).split()[0] if addr_match else None

                variables.append({
                    "name": var_name,
                    "value": var_val,
                    "address": address
                })

            if is_user_file and current_line:
                steps.append({
                    "step": step_count,
                    "line": current_line,
                    "function": current_func,
                    "variables": variables,
                    "raw_frame": frame_text
                })

            # Next step (step into)
            send_cmd("-exec-step")
            step_lines = read_until_prompt()
            step_text = " ".join(step_lines)

            # Check for crash/signal (e.g. SIGSEGV)
            if "*stopped,reason=\"signal-received\"" in step_text:
                sig_match = re.search(r'signal-name="([^"]+)"', step_text)
                sig_desc = re.search(r'signal-meaning="([^"]+)"', step_text)
                signal_name = sig_match.group(1) if sig_match else "UNKNOWN_SIGNAL"
                meaning = sig_desc.group(1) if sig_desc else ""

                fault_summary = {
                    "signal": signal_name,
                    "meaning": meaning,
                    "line": current_line,
                    "function": current_func
                }
                break

            # Check for process exit
            if "*stopped,reason=\"exited-normally\"" in step_text or "*stopped,reason=\"exited\"" in step_text:
                break

            if "^error" in step_text and "not running" in step_text:
                break

    finally:
        send_cmd("-gdb-exit")
        proc.kill()

    return {
        "success": True,
        "total_steps": len(steps),
        "steps": steps,
        "fault_summary": fault_summary
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: gdb_tracer.py <source_file> [language]"}))
        sys.exit(1)

    source_path = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else ("cpp" if source_path.endswith(".cpp") else "c")
    binary_path = "/tmp/app_executable"

    compiled, err = compile_source(source_path, binary_path, lang)
    if not compiled:
        print(json.dumps({
            "success": False,
            "error": "Compilation Error",
            "details": err
        }))
        sys.exit(0)

    try:
        result = trace_execution(binary_path, os.path.basename(source_path))
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Tracing Exception: {str(e)}"
        }))

if __name__ == "__main__":
    main()
