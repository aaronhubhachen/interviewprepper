/** Must match the exact `pyodide` devDependency version (verified by a test). */
export const PYODIDE_VERSION = "0.29.5";

export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/**
 * Cap on sys.setrecursionlimit inside the judge. Past a few thousand levels the
 * recursion overflows the JS stack and Pyodide dies outright ("fatal error", no
 * RecursionError), taking the warm worker with it. Measured on Pyodide 0.29.5
 * under Node: plain recursion survives ~8000 levels, recursion through generator
 * expressions ~2000, so 1500 leaves room for smaller browser worker stacks.
 */
export const PYTHON_MAX_RECURSION = 1500;

/**
 * Python source that defines `synapse_run_tests(code, fn_name, args_list_json) -> str`.
 * It execs the user's code in a fresh namespace (with LeetCode's usual imports),
 * resolves either a top-level function or a `Solution` class method (new instance
 * per test), and returns JSON of RawTestResult[] with per-test stdout/stderr captured —
 * or of a RunFailure ({kind, message}) when the code cannot be loaded at all.
 * Either shape goes straight into judgeResults.
 *
 * The interpreter stays warm between runs, so each run starts from (and restores)
 * the process-wide state a submission can change: sys.stdout/stderr and the
 * recursion limit (capped at PYTHON_MAX_RECURSION). sys.exit() and
 * KeyboardInterrupt are reported like any other error. A return value JSON can't
 * hold (inf, nan) is a per-test error that names the value.
 *
 * Worker usage: `pyodide.runPython(PYTHON_HARNESS)` once, then
 * `pyodide.globals.get("synapse_run_tests")(code, functionName, argsListJson)`.
 */
export const PYTHON_HARNESS = String.raw`
import io as _synapse_io
import json as _synapse_json
import math as _synapse_math
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

# User code may raise these; BaseExceptions such as SystemExit must not escape the harness.
_SYNAPSE_ERRORS = (Exception, SystemExit, KeyboardInterrupt)

# Process-wide state as the harness found it. Every run starts from it and restores it,
# even when the previous run died without reaching its finally blocks.
_SYNAPSE_STDOUT = _synapse_sys.stdout
_SYNAPSE_STDERR = _synapse_sys.stderr
_SYNAPSE_MAX_RECURSION = ${PYTHON_MAX_RECURSION}
_synapse_set_recursion = getattr(_synapse_sys.setrecursionlimit, "_synapse_original", _synapse_sys.setrecursionlimit)
_SYNAPSE_DEFAULT_RECURSION = min(_synapse_sys.getrecursionlimit(), _SYNAPSE_MAX_RECURSION)
_synapse_requested_recursion = [_SYNAPSE_DEFAULT_RECURSION]


def _synapse_capped_setrecursionlimit(limit):
    _synapse_requested_recursion[0] = limit
    _synapse_set_recursion(min(limit, _SYNAPSE_MAX_RECURSION) if isinstance(limit, int) else limit)


_synapse_capped_setrecursionlimit._synapse_original = _synapse_set_recursion


def _synapse_reset():
    _synapse_sys.stdout = _SYNAPSE_STDOUT
    _synapse_sys.stderr = _SYNAPSE_STDERR
    _synapse_sys.setrecursionlimit = _synapse_capped_setrecursionlimit
    _synapse_requested_recursion[0] = _SYNAPSE_DEFAULT_RECURSION
    _synapse_set_recursion(_SYNAPSE_DEFAULT_RECURSION)


def _synapse_to_json(value):
    if isinstance(value, (set, frozenset)):
        try:
            return sorted(value)
        except TypeError:
            return list(value)
    raise TypeError(f"return value of type {type(value).__name__} is not JSON-serializable")


def _synapse_nonfinite(value, depth=0):
    if isinstance(value, float):
        return None if _synapse_math.isfinite(value) else repr(value)
    if depth > 50:
        return None
    if isinstance(value, dict):
        items = [*value.keys(), *value.values()]
    elif isinstance(value, (list, tuple, set, frozenset)):
        items = value
    else:
        return None
    for item in items:
        found = _synapse_nonfinite(item, depth + 1)
        if found:
            return found
    return None


def _synapse_output(value):
    try:
        return {"ok": True, "output": _synapse_json.dumps(value, default=_synapse_to_json, allow_nan=False)}
    except Exception as error:
        found = _synapse_nonfinite(value) if isinstance(error, ValueError) else None
        if found:
            return {"ok": False, "error": f"Returned {found}, which is not valid JSON."}
        return {"ok": False, "error": f"{type(error).__name__}: {error}"}


def _synapse_format_error(error):
    name = type(error).__name__
    if isinstance(error, SyntaxError) and error.filename == "solution.py":
        # str(SyntaxError) already ends in "(solution.py, line N)"; say the line once.
        return f"{name}: {error.msg} (line {error.lineno})" if error.lineno else f"{name}: {error.msg}"
    line = None
    for frame in _synapse_traceback.extract_tb(error.__traceback__):
        if frame.filename == "solution.py":
            line = frame.lineno
    text = "" if isinstance(error, SystemExit) and error.code is None else str(error)
    message = f"{name}: {text}" if text else name
    requested = _synapse_requested_recursion[0]
    if isinstance(error, RecursionError) and isinstance(requested, int) and requested > _SYNAPSE_MAX_RECURSION:
        message += f" (the browser judge caps recursion at {_SYNAPSE_MAX_RECURSION} levels)"
    return f"{message} (line {line})" if line else message


def _synapse_resolve(namespace, fn_name):
    fn = namespace.get(fn_name)
    if callable(fn) and not isinstance(fn, type):
        return lambda: fn
    solution = namespace.get("Solution")
    if isinstance(solution, type) and hasattr(solution, fn_name):
        return lambda: getattr(solution(), fn_name)
    raise NameError(f"Define a function named {fn_name} (or a Solution class with that method).")


def _synapse_run(code, fn_name, args_list_json):
    args_list = _synapse_json.loads(args_list_json)
    namespace = {"__name__": "__synapse__"}
    try:
        exec(_SYNAPSE_PRELUDE, namespace)
        exec(compile(code, "solution.py", "exec"), namespace)
        factory = _synapse_resolve(namespace, fn_name)
    except _SYNAPSE_ERRORS as error:
        kind = "compile" if isinstance(error, SyntaxError) else "runtime"
        return _synapse_json.dumps({"kind": kind, "message": _synapse_format_error(error)})

    results = []
    for args in args_list:
        buffer = _synapse_io.StringIO()
        previous = (_synapse_sys.stdout, _synapse_sys.stderr)
        _synapse_sys.stdout = _synapse_sys.stderr = buffer
        started = _synapse_time.perf_counter()
        try:
            value = factory()(*args)
        except _SYNAPSE_ERRORS as error:
            entry = {"ok": False, "error": _synapse_format_error(error)}
        else:
            entry = _synapse_output(value)
        finally:
            _synapse_sys.stdout, _synapse_sys.stderr = previous
        entry["ms"] = round((_synapse_time.perf_counter() - started) * 1000, 3)
        entry["logs"] = buffer.getvalue().splitlines()[-50:]
        results.append(entry)
    return _synapse_json.dumps(results)


def synapse_run_tests(code, fn_name, args_list_json):
    _synapse_reset()
    try:
        return _synapse_run(code, fn_name, args_list_json)
    finally:
        _synapse_reset()


_synapse_reset()
`;
