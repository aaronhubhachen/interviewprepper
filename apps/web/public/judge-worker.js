/*
 * Synapse judge worker: a classic Web Worker served at /judge-worker.js.
 *
 * It ONLY executes code and posts raw JSON results. The main thread
 * (apps/web/lib/judge) compares outputs with @synapse/core's compareOutput and
 * enforces the time limit by terminating this worker. Nothing here talks to the
 * network except Pyodide's own CDN download, and user code never leaves the tab.
 *
 * Protocol (typed in apps/web/lib/judge/protocol.ts):
 *   in   { type: "run", id, language: "javascript", source, argsJson }
 *          source = core's buildJsRunner(code, fn); new Function(source)() returns run(argsJson)
 *        { type: "run", id, language: "python", code, functionName, argsJson, harness, indexURL }
 *          harness = core's PYTHON_HARNESS; indexURL = the Pyodide CDN folder for PYODIDE_VERSION
 *        { type: "preload", language: "python", harness, indexURL }
 *   out  { type: "status", status: "loading-python" | "python-ready" | "python-error", message? }
 *        { type: "started", id }             right before user code runs (the time limit starts here)
 *        { type: "result", id, raw, logs? }  raw = RawTestResult[] | { kind, message }
 *        { type: "load-error", id, message } the Python runtime could not be loaded
 */
"use strict";

(function () {
  var scope = self;
  var post = scope.postMessage.bind(scope);
  var python = null; // Promise<{ run(code, fn, argsJson): string }>
  var setupLogs = [];
  var queue = Promise.resolve();

  function describeError(error) {
    if (error && typeof error === "object" && typeof error.message === "string") {
      var name = typeof error.name === "string" && error.name ? error.name + ": " : "";
      return name + error.message;
    }
    return String(error);
  }

  function collectSetupLog(line) {
    setupLogs.push(String(line));
    if (setupLogs.length > 200) setupLogs.shift();
  }

  // ── JavaScript ─────────────────────────────────────────────────────────

  function runJavaScript(message) {
    post({ type: "started", id: message.id });
    var run;
    try {
      run = new Function(message.source)();
    } catch (error) {
      return { kind: error instanceof SyntaxError ? "compile" : "runtime", message: describeError(error) };
    }
    if (typeof run !== "function") return { kind: "runtime", message: "The test runner failed to initialise." };
    try {
      return JSON.parse(run(message.argsJson));
    } catch (error) {
      return { kind: "runtime", message: describeError(error) };
    }
  }

  // ── Python (Pyodide) ───────────────────────────────────────────────────

  function loadPython(message) {
    if (python) return python;
    post({ type: "status", status: "loading-python" });
    python = Promise.resolve()
      .then(function () {
        if (typeof scope.loadPyodide !== "function") scope.importScripts(message.indexURL + "pyodide.js");
        if (typeof scope.loadPyodide !== "function") throw new Error("pyodide.js did not define loadPyodide");
        return scope.loadPyodide({ indexURL: message.indexURL, stdout: collectSetupLog, stderr: collectSetupLog });
      })
      .then(function (pyodide) {
        pyodide.runPython(message.harness);
        var runTests = pyodide.globals.get("synapse_run_tests");
        if (typeof runTests !== "function") throw new Error("The Python harness did not define synapse_run_tests");
        post({ type: "status", status: "python-ready" });
        return { run: runTests };
      });
    python.catch(function (error) {
      python = null; // allow a retry on the next run
      post({ type: "status", status: "python-error", message: describeError(error) });
    });
    return python;
  }

  function runPython(message) {
    return loadPython(message).then(
      function (runtime) {
        setupLogs = [];
        post({ type: "started", id: message.id });
        var raw;
        try {
          raw = JSON.parse(runtime.run(message.code, message.functionName, message.argsJson));
        } catch (error) {
          raw = { kind: "runtime", message: describeError(error) };
        }
        post({ type: "result", id: message.id, raw: raw, logs: setupLogs.slice(-50) });
      },
      function (error) {
        post({
          type: "load-error",
          id: message.id,
          message: "Could not load the Python runtime (Pyodide). Check your connection and try again. (" + describeError(error) + ")",
        });
      },
    );
  }

  // ── dispatch ───────────────────────────────────────────────────────────

  function handle(message) {
    if (!message || typeof message !== "object") return undefined;
    if (message.type === "preload") {
      if (message.language === "python") return loadPython(message).then(null, function () {});
      return undefined;
    }
    if (message.type !== "run") return undefined;
    if (message.language === "javascript") {
      post({ type: "result", id: message.id, raw: runJavaScript(message) });
      return undefined;
    }
    if (message.language === "python") return runPython(message);
    post({ type: "result", id: message.id, raw: { kind: "runtime", message: "Unsupported language: " + message.language } });
    return undefined;
  }

  scope.onmessage = function (event) {
    var message = event.data;
    // Serialize: a run that arrives while Pyodide loads waits for it.
    queue = queue.then(function () {
      return handle(message);
    }).then(null, function (error) {
      if (message && typeof message.id === "number") {
        post({ type: "result", id: message.id, raw: { kind: "runtime", message: describeError(error) } });
      }
    });
  };
})();
