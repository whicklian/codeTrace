#!/usr/bin/env python3
"""
Python Execution Tracer for CodeTrace.
Uses sys.settrace to record line-by-line variable states, stack frames,
heap/object references, and exceptions into a structured JSON trace array.
"""

import sys
import os
import json
import traceback

class CodeTracer:
    def __init__(self, filename, max_steps=500):
        self.filename = os.path.abspath(filename)
        self.max_steps = max_steps
        self.steps = []
        self.step_count = 0
        self.fault_summary = None

    def trace_callback(self, frame, event, arg):
        if self.step_count >= self.max_steps:
            return None

        # Only trace the target user file
        frame_file = os.path.abspath(frame.f_code.co_filename)
        if frame_file != self.filename:
            return self.trace_callback

        if event == 'line':
            self.step_count += 1
            line_no = frame.f_lineno
            func_name = frame.f_code.co_name

            # Extract local variables
            variables = []
            for name, val in frame.f_locals.items():
                if name.startswith('__') and name.endswith('__'):
                    continue
                try:
                    val_str = repr(val)
                    if len(val_str) > 100:
                        val_str = val_str[:97] + '...'
                    addr = hex(id(val))
                    variables.append({
                        "name": name,
                        "value": val_str,
                        "address": addr,
                        "type": type(val).__name__
                    })
                except Exception:
                    pass

            self.steps.append({
                "step": self.step_count,
                "line": line_no,
                "function": func_name,
                "variables": variables
            })

        elif event == 'exception':
            exc_type, exc_val, exc_tb = arg
            exc_name = exc_type.__name__
            self.fault_summary = {
                "signal": exc_name,
                "meaning": str(exc_val),
                "line": frame.f_lineno,
                "function": frame.f_code.co_name
            }

        return self.trace_callback

def run_trace(script_path):
    tracer = CodeTracer(script_path)
    with open(script_path, 'r', encoding='utf-8') as f:
        code_str = f.read()

    # Compile code object
    try:
        code_obj = compile(code_str, os.path.abspath(script_path), 'exec')
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": "Syntax Error",
            "details": traceback.format_exc()
        }))
        return

    # Execute with tracer
    sys.settrace(tracer.trace_callback)
    global_scope = {"__name__": "__main__"}
    try:
        exec(code_obj, global_scope)
    except Exception as e:
        if not tracer.fault_summary:
            tracer.fault_summary = {
                "signal": type(e).__name__,
                "meaning": str(e),
                "line": getattr(e, 'lineno', None),
                "function": "global"
            }
    finally:
        sys.settrace(None)

    print(json.dumps({
        "success": True,
        "total_steps": len(tracer.steps),
        "steps": tracer.steps,
        "fault_summary": tracer.fault_summary
    }, indent=2))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python_tracer.py <script.py>"}))
        sys.exit(1)
    run_trace(sys.argv[1])
