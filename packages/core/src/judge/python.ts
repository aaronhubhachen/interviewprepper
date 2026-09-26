/** Must match the exact `pyodide` devDependency version (verified by a test). */
export const PYODIDE_VERSION = "0.29.5";

export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/**
 * Python source that defines `synapse_run_tests(code, fn_name, args_list_json) -> str`.
 * It execs the user's code in a fresh namespace (with LeetCode's usual imports),
 * resolves either a top-level function or a `Solution` class method (new instance
 * per test), and returns JSON of RawTestResult[] with per-test stdout captured —
 * or of a RunFailure ({kind, message}) when the code cannot be loaded at all.
 * Either shape goes straight into judgeResults.
 *
 * Worker usage: `pyodide.runPython(PYTHON_HARNESS)` once, then
 * `pyodide.globals.get("synapse_run_tests")(code, functionName, argsListJson)`.
 */
export const PYTHON_HARNESS = String.raw`
import io as _synapse_io
import json as _synapse_json
import sys as _synapse_sys
import time as _synapse_time
import traceback as _synapse_traceback

_SYNAPSE_PRELUDE = """
from typing import *
import bisect, collections, functools, heapq, itertools, math, re, string
from collections import Counter, OrderedDict, defaultdict, deque
from functools import cache, lru_cache
from heapq import heapify, heappop, heappush
from math import inf
"""


def _synapse_to_json(value):
    if isinstance(value, (set, frozenset)):
        try:
            return sorted(value)
        except TypeError:
            return list(value)
    raise TypeError(f"return value of type {type(value).__name__} is not JSON-serializable")


def _synapse_format_error(error):
    line = getattr(error, "lineno", None) if isinstance(error, SyntaxError) else None
    for frame in _synapse_traceback.extract_tb(error.__traceback__):
        if frame.filename == "solution.py":
            line = frame.lineno
    suffix = f" (line {line})" if line else ""
    return f"{type(error).__name__}: {error}{suffix}"


def _synapse_resolve(namespace, fn_name):
    fn = namespace.get(fn_name)
    if callable(fn) and not isinstance(fn, type):
        return lambda: fn
    solution = namespace.get("Solution")
    if isinstance(solution, type) and hasattr(solution, fn_name):
        return lambda: getattr(solution(), fn_name)
    raise NameError(f"Define a function named {fn_name} (or a Solution class with that method).")


def synapse_run_tests(code, fn_name, args_list_json):
    args_list = _synapse_json.loads(args_list_json)
    namespace = {"__name__": "__synapse__"}
    try:
        exec(_SYNAPSE_PRELUDE, namespace)
        exec(compile(code, "solution.py", "exec"), namespace)
        factory = _synapse_resolve(namespace, fn_name)
    except Exception as error:
        kind = "compile" if isinstance(error, SyntaxError) else "runtime"
        return _synapse_json.dumps({"kind": kind, "message": _synapse_format_error(error)})

    results = []
    for args in args_list:
        buffer = _synapse_io.StringIO()
        previous_stdout = _synapse_sys.stdout
        _synapse_sys.stdout = buffer
        started = _synapse_time.perf_counter()
        try:
            value = factory()(*args)
            entry = {"ok": True, "output": _synapse_json.dumps(value, default=_synapse_to_json)}
        except Exception as error:
            entry = {"ok": False, "error": _synapse_format_error(error)}
        finally:
            _synapse_sys.stdout = previous_stdout
        entry["ms"] = round((_synapse_time.perf_counter() - started) * 1000, 3)
        entry["logs"] = buffer.getvalue().splitlines()[-50:]
        results.append(entry)
    return _synapse_json.dumps(results)
`;
