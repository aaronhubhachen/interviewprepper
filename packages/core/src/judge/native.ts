/**
 * Server-compiled languages for the card-flip IDE. Pure string generation (browser-safe):
 * typed starters from a problem's signature, and a harness per language that decodes the
 * JSON test arguments, calls the user's function, and prints RawTestResult[] JSON after
 * NATIVE_RESULT_MARKER. The web server compiles and runs these; comparison stays in judgeResults.
 */
import type { CodeStage, JudgeLanguage } from "../content/types";

export type NativeLanguage = "java" | "cpp" | "go" | "typescript";
export type CodeLanguage = JudgeLanguage | NativeLanguage;

export const NATIVE_LANGUAGES: readonly NativeLanguage[] = ["java", "cpp", "go", "typescript"];
export const CODE_LANGUAGES: readonly CodeLanguage[] = ["python", "javascript", "java", "cpp", "go", "typescript"];

export const LANGUAGE_LABELS: Readonly<Record<CodeLanguage, string>> = {
  javascript: "JavaScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  go: "Go",
  typescript: "TypeScript",
};

export const LANGUAGE_EXTENSIONS: Readonly<Record<CodeLanguage, string>> = {
  javascript: "js",
  python: "py",
  java: "java",
  cpp: "cpp",
  go: "go",
  typescript: "ts",
};

export function isNativeLanguage(language: string): language is NativeLanguage {
  return (NATIVE_LANGUAGES as readonly string[]).includes(language);
}

export function isCodeLanguage(language: string): language is CodeLanguage {
  return (CODE_LANGUAGES as readonly string[]).includes(language);
}

/** Value types used by problem signatures. "int?[]" allows nulls (level-order trees); "list<bool?>" too. */
export type ValueType =
  | "int"
  | "bool"
  | "string"
  | "int[]"
  | "int[][]"
  | "string[]"
  | "char[][]"
  | "list<list<int>>"
  | "int?[]"
  | "list<bool?>";

export interface Signature {
  params: ValueType[];
  returns: ValueType;
}

export const NATIVE_RESULT_MARKER = "@@PREPR_RESULTS@@";

type NativeStage = Pick<CodeStage, "functionName" | "params" | "signature" | "nativeStarters">;

const JAVA_TYPES: Record<ValueType, string> = {
  int: "int",
  bool: "boolean",
  string: "String",
  "int[]": "int[]",
  "int[][]": "int[][]",
  "string[]": "String[]",
  "char[][]": "char[][]",
  "list<list<int>>": "List<List<Integer>>",
  "int?[]": "Integer[]",
  "list<bool?>": "List<Boolean>",
};

const CPP_TYPES: Record<ValueType, string> = {
  int: "int",
  bool: "bool",
  string: "string",
  "int[]": "vector<int>",
  "int[][]": "vector<vector<int>>",
  "string[]": "vector<string>",
  "char[][]": "vector<vector<char>>",
  "list<list<int>>": "vector<vector<int>>",
  "int?[]": "vector<optional<int>>",
  "list<bool?>": "vector<optional<bool>>",
};

const GO_TYPES: Record<ValueType, string> = {
  int: "int",
  bool: "bool",
  string: "string",
  "int[]": "[]int",
  "int[][]": "[][]int",
  "string[]": "[]string",
  "char[][]": "[][]byte",
  "list<list<int>>": "[][]int",
  "int?[]": "[]*int",
  "list<bool?>": "[]*bool",
};

const TS_TYPES: Record<ValueType, string> = {
  int: "number",
  bool: "boolean",
  string: "string",
  "int[]": "number[]",
  "int[][]": "number[][]",
  "string[]": "string[]",
  "char[][]": "string[][]",
  "list<list<int>>": "number[][]",
  "int?[]": "(number | null)[]",
  "list<bool?>": "(boolean | null)[]",
};

const JAVA_DEFAULTS: Record<ValueType, string> = {
  int: "0",
  bool: "false",
  string: '""',
  "int[]": "new int[0]",
  "int[][]": "new int[0][]",
  "string[]": "new String[0]",
  "char[][]": "new char[0][]",
  "list<list<int>>": "new ArrayList<>()",
  "int?[]": "new Integer[0]",
  "list<bool?>": "new ArrayList<>()",
};

const GO_DEFAULTS: Record<ValueType, string> = {
  int: "0",
  bool: "false",
  string: '""',
  "int[]": "nil",
  "int[][]": "nil",
  "string[]": "nil",
  "char[][]": "nil",
  "list<list<int>>": "nil",
  "int?[]": "nil",
  "list<bool?>": "nil",
};

const TS_DEFAULTS: Record<ValueType, string> = {
  int: "0",
  bool: "false",
  string: '""',
  "int[]": "[]",
  "int[][]": "[]",
  "string[]": "[]",
  "char[][]": "[]",
  "list<list<int>>": "[]",
  "int?[]": "[]",
  "list<bool?>": "[]",
};

function cppParam(type: ValueType, name: string): string {
  const cpp = CPP_TYPES[type];
  return cpp.startsWith("vector") ? `${cpp}& ${name}` : `${cpp} ${name}`;
}

/** Idiomatic LeetCode-style starter for a server-compiled language. */
export function nativeStarter(stage: NativeStage, language: NativeLanguage): string {
  const override = stage.nativeStarters?.[language];
  if (override) return override;
  const { functionName: fn, params, signature } = stage;
  const typed = (map: Record<ValueType, string>, sep: string) =>
    params.map((name, i) => (sep === " " ? `${map[signature.params[i]!]} ${name}` : `${name}${sep}${map[signature.params[i]!]}`));
  switch (language) {
    case "java":
      return `class Solution {
    public ${JAVA_TYPES[signature.returns]} ${fn}(${typed(JAVA_TYPES, " ").join(", ")}) {
        // Your code here
        return ${JAVA_DEFAULTS[signature.returns]};
    }
}
`;
    case "cpp":
      return `class Solution {
public:
    ${CPP_TYPES[signature.returns]} ${fn}(${params.map((name, i) => cppParam(signature.params[i]!, name)).join(", ")}) {
        // Your code here
        return {};
    }
};
`;
    case "go":
      return `func ${fn}(${params.map((name, i) => `${name} ${GO_TYPES[signature.params[i]!]}`).join(", ")}) ${GO_TYPES[signature.returns]} {
\t// Your code here
\treturn ${GO_DEFAULTS[signature.returns]}
}
`;
    case "typescript":
      return `function ${fn}(${typed(TS_TYPES, ": ").join(", ")}): ${TS_TYPES[signature.returns]} {
  // Your code here
  return ${TS_DEFAULTS[signature.returns]};
}
`;
  }
}

/** Starters for every language: authored JS/Python plus generated native ones. */
export function allStarters(stage: NativeStage & Pick<CodeStage, "starter">): Record<CodeLanguage, string> {
  return {
    ...stage.starter,
    java: nativeStarter(stage, "java"),
    cpp: nativeStarter(stage, "cpp"),
    go: nativeStarter(stage, "go"),
    typescript: nativeStarter(stage, "typescript"),
  };
}

// ── Harnesses ───────────────────────────────────────────────────────────────

export interface NativeProgram {
  /** Relative file name → contents. */
  files: Record<string, string>;
  /** The user's file and how many lines were prepended to it (compiler line numbers are shifted back). */
  userFile: string;
  userLineOffset: number;
}

const IDENTIFIER = /^[A-Za-z_]\w*$/;

function assertIdentifier(name: string): void {
  if (!IDENTIFIER.test(name)) throw new Error(`Invalid function name: ${name}`);
}

const JAVA_DECODERS: Record<ValueType, string> = {
  int: "toInt",
  bool: "toBool",
  string: "toStr",
  "int[]": "toIntArray",
  "int[][]": "toIntMatrix",
  "string[]": "toStrArray",
  "char[][]": "toCharMatrix",
  "list<list<int>>": "toIntListList",
  "int?[]": "toNullableIntArray",
  "list<bool?>": "toBoolList",
};

const JAVA_PRELUDE = "import java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\n";

function javaProgram(code: string, stage: NativeStage): NativeProgram {
  const args = stage.signature.params.map((type, i) => `${JAVA_DECODERS[type]}(a.get(${i}))`).join(", ");
  const main = `import java.io.*;
import java.util.*;

public class Main {
  static final String MARKER = ${JSON.stringify(NATIVE_RESULT_MARKER)};

  static Object call(List<?> a) {
    Solution s = new Solution();
    return s.${stage.functionName}(${args});
  }

  // ---- minimal JSON ----
  static int pos;
  static String src;
  static Object parse(String text) { src = text; pos = 0; Object v = value(); return v; }
  static void ws() { while (pos < src.length() && Character.isWhitespace(src.charAt(pos))) pos++; }
  static Object value() {
    ws();
    char c = src.charAt(pos);
    if (c == '[') {
      pos++; List<Object> list = new ArrayList<>(); ws();
      if (src.charAt(pos) == ']') { pos++; return list; }
      while (true) { list.add(value()); ws(); char d = src.charAt(pos++); if (d == ']') return list; }
    }
    if (c == '"') return string();
    if (src.startsWith("true", pos)) { pos += 4; return Boolean.TRUE; }
    if (src.startsWith("false", pos)) { pos += 5; return Boolean.FALSE; }
    if (src.startsWith("null", pos)) { pos += 4; return null; }
    int start = pos;
    while (pos < src.length() && "+-0123456789.eE".indexOf(src.charAt(pos)) >= 0) pos++;
    String num = src.substring(start, pos);
    if (num.contains(".") || num.contains("e") || num.contains("E")) return Double.parseDouble(num);
    return Long.parseLong(num);
  }
  static String string() {
    StringBuilder b = new StringBuilder(); pos++;
    while (true) {
      char c = src.charAt(pos++);
      if (c == '"') return b.toString();
      if (c == '\\\\') {
        char e = src.charAt(pos++);
        switch (e) {
          case 'n': b.append('\\n'); break;
          case 't': b.append('\\t'); break;
          case 'r': b.append('\\r'); break;
          case 'b': b.append('\\b'); break;
          case 'f': b.append('\\f'); break;
          case 'u': b.append((char) Integer.parseInt(src.substring(pos, pos + 4), 16)); pos += 4; break;
          default: b.append(e);
        }
      } else b.append(c);
    }
  }
  static String quote(String s) {
    StringBuilder b = new StringBuilder("\\"");
    for (char c : s.toCharArray()) {
      switch (c) {
        case '"': b.append("\\\\\\""); break;
        case '\\\\': b.append("\\\\\\\\"); break;
        case '\\n': b.append("\\\\n"); break;
        case '\\r': b.append("\\\\r"); break;
        case '\\t': b.append("\\\\t"); break;
        default: if (c < 0x20) b.append(String.format("\\\\u%04x", (int) c)); else b.append(c);
      }
    }
    return b.append('"').toString();
  }

  // ---- decoders ----
  static int toInt(Object o) { return ((Number) o).intValue(); }
  static boolean toBool(Object o) { return (Boolean) o; }
  static String toStr(Object o) { return (String) o; }
  static List<?> list(Object o) { return (List<?>) o; }
  static int[] toIntArray(Object o) { List<?> l = list(o); int[] r = new int[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toInt(l.get(i)); return r; }
  static int[][] toIntMatrix(Object o) { List<?> l = list(o); int[][] r = new int[l.size()][]; for (int i = 0; i < r.length; i++) r[i] = toIntArray(l.get(i)); return r; }
  static String[] toStrArray(Object o) { List<?> l = list(o); String[] r = new String[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toStr(l.get(i)); return r; }
  static char[][] toCharMatrix(Object o) {
    List<?> l = list(o); char[][] r = new char[l.size()][];
    for (int i = 0; i < r.length; i++) { List<?> row = list(l.get(i)); r[i] = new char[row.size()]; for (int j = 0; j < row.size(); j++) { String s = toStr(row.get(j)); r[i][j] = s.isEmpty() ? 0 : s.charAt(0); } }
    return r;
  }
  static List<List<Integer>> toIntListList(Object o) {
    List<List<Integer>> r = new ArrayList<>();
    for (Object row : list(o)) { List<Integer> inner = new ArrayList<>(); for (Object x : list(row)) inner.add(toInt(x)); r.add(inner); }
    return r;
  }
  static Integer[] toNullableIntArray(Object o) { List<?> l = list(o); Integer[] r = new Integer[l.size()]; for (int i = 0; i < r.length; i++) r[i] = l.get(i) == null ? null : toInt(l.get(i)); return r; }
  static List<Boolean> toBoolList(Object o) { List<Boolean> r = new ArrayList<>(); for (Object x : list(o)) r.add((Boolean) x); return r; }

  // ---- encoder (by runtime type) ----
  static void enc(StringBuilder b, Object v) {
    if (v == null) { b.append("null"); return; }
    if (v instanceof String) { b.append(quote((String) v)); return; }
    if (v instanceof Character) { b.append(quote(String.valueOf(v))); return; }
    if (v instanceof Boolean) { b.append(v); return; }
    if (v instanceof Double || v instanceof Float) {
      double d = ((Number) v).doubleValue();
      if (d == Math.rint(d) && Math.abs(d) < 1e15) b.append((long) d); else b.append(d);
      return;
    }
    if (v instanceof Number) { b.append(((Number) v).longValue()); return; }
    if (v instanceof int[]) { int[] a = (int[]) v; b.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); } b.append(']'); return; }
    if (v instanceof long[]) { long[] a = (long[]) v; b.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); } b.append(']'); return; }
    if (v instanceof double[]) { double[] a = (double[]) v; b.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); enc(b, a[i]); } b.append(']'); return; }
    if (v instanceof boolean[]) { boolean[] a = (boolean[]) v; b.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(a[i]); } b.append(']'); return; }
    if (v instanceof char[]) { char[] a = (char[]) v; b.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); b.append(quote(String.valueOf(a[i]))); } b.append(']'); return; }
    if (v instanceof Object[]) { Object[] a = (Object[]) v; b.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) b.append(','); enc(b, a[i]); } b.append(']'); return; }
    if (v instanceof Iterable) { b.append('['); boolean first = true; for (Object x : (Iterable<?>) v) { if (!first) b.append(','); first = false; enc(b, x); } b.append(']'); return; }
    b.append(quote(String.valueOf(v)));
  }

  static String logs(ByteArrayOutputStream buf) throws UnsupportedEncodingException {
    String text = buf.toString("UTF-8");
    if (text.isEmpty()) return "[]";
    String[] lines = text.split("\\\\r?\\\\n", -1);
    int end = lines.length; if (end > 0 && lines[end - 1].isEmpty()) end--;
    int start = Math.max(0, end - 50);
    StringBuilder b = new StringBuilder("[");
    for (int i = start; i < end; i++) { if (i > start) b.append(','); b.append(quote(lines[i])); }
    return b.append(']').toString();
  }

  static String describe(Throwable e) {
    String text = e.toString();
    for (StackTraceElement el : e.getStackTrace()) {
      if ("Solution.java".equals(el.getFileName())) return text + " (line " + Math.max(1, el.getLineNumber() - ${JAVA_PRELUDE.split("\n").length - 1}) + ")";
    }
    return text;
  }

  public static void main(String[] argv) throws Exception {
    String input = new String(System.in.readAllBytes(), "UTF-8");
    List<?> tests = (List<?>) parse(input);
    PrintStream realOut = System.out;
    StringBuilder out = new StringBuilder("[");
    for (int t = 0; t < tests.size(); t++) {
      List<?> a = (List<?>) tests.get(t);
      ByteArrayOutputStream buf = new ByteArrayOutputStream();
      System.setOut(new PrintStream(buf, true, "UTF-8"));
      long start = System.nanoTime();
      String entry;
      try {
        Object result = call(a);
        double ms = (System.nanoTime() - start) / 1e6;
        StringBuilder r = new StringBuilder();
        enc(r, result);
        entry = "{\\"ok\\":true,\\"output\\":" + quote(r.toString()) + ",\\"ms\\":" + ms + ",\\"logs\\":" + logs(buf) + "}";
      } catch (Throwable e) {
        double ms = (System.nanoTime() - start) / 1e6;
        entry = "{\\"ok\\":false,\\"error\\":" + quote(describe(e)) + ",\\"ms\\":" + ms + ",\\"logs\\":" + logs(buf) + "}";
      } finally {
        System.setOut(realOut);
      }
      if (t > 0) out.append(',');
      out.append(entry);
    }
    realOut.print("\\n" + MARKER + out + "]");
    realOut.flush();
  }
}
`;
  return {
    files: { "Main.java": main, "Solution.java": JAVA_PRELUDE + code },
    userFile: "Solution.java",
    userLineOffset: JAVA_PRELUDE.split("\n").length - 1,
  };
}

const CPP_PRELUDE = `#include <algorithm>
#include <array>
#include <bitset>
#include <chrono>
#include <climits>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <deque>
#include <functional>
#include <iostream>
#include <list>
#include <map>
#include <memory>
#include <numeric>
#include <optional>
#include <queue>
#include <set>
#include <sstream>
#include <stack>
#include <string>
#include <tuple>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
using namespace std;
`;

/** Apple clang has no <bits/stdc++.h>; LeetCode habits include it, so ship a shim. */
export const CPP_BITS_SHIM = CPP_PRELUDE.replace("using namespace std;\n", "");

function cppProgram(code: string, stage: NativeStage): NativeProgram {
  const decls = stage.signature.params.map((type, i) => `      auto a${i} = Dec<${CPP_TYPES[type]}>::get(args.a[${i}]);`).join("\n");
  const call = `sol.${stage.functionName}(${stage.signature.params.map((_, i) => `a${i}`).join(", ")})`;
  const main = `${CPP_PRELUDE}
#include "solution.cpp"

namespace prepr {
struct J {
  enum T { Null, Bool, Num, Str, Arr } t = Null;
  bool b = false;
  double n = 0;
  string s;
  vector<J> a;
};
struct Parser {
  const string& s;
  size_t i = 0;
  explicit Parser(const string& text) : s(text) {}
  void ws() { while (i < s.size() && isspace((unsigned char)s[i])) i++; }
  J value() {
    ws();
    J j;
    char c = s[i];
    if (c == '[') {
      i++; j.t = J::Arr; ws();
      if (s[i] == ']') { i++; return j; }
      while (true) { j.a.push_back(value()); ws(); if (s[i++] == ']') return j; }
    }
    if (c == '"') { j.t = J::Str; j.s = str(); return j; }
    if (s.compare(i, 4, "true") == 0) { i += 4; j.t = J::Bool; j.b = true; return j; }
    if (s.compare(i, 5, "false") == 0) { i += 5; j.t = J::Bool; return j; }
    if (s.compare(i, 4, "null") == 0) { i += 4; return j; }
    size_t start = i;
    while (i < s.size() && strchr("+-0123456789.eE", s[i])) i++;
    j.t = J::Num; j.n = stod(s.substr(start, i - start));
    return j;
  }
  string str() {
    string out; i++;
    while (true) {
      char c = s[i++];
      if (c == '"') return out;
      if (c == '\\\\') {
        char e = s[i++];
        if (e == 'n') out += '\\n'; else if (e == 't') out += '\\t'; else if (e == 'r') out += '\\r';
        else if (e == 'u') { out += (char)stoi(s.substr(i, 4), nullptr, 16); i += 4; }
        else out += e;
      } else out += c;
    }
  }
};

template <class T> struct Dec;
template <> struct Dec<int> { static int get(const J& j) { return (int)j.n; } };
template <> struct Dec<long long> { static long long get(const J& j) { return (long long)j.n; } };
template <> struct Dec<double> { static double get(const J& j) { return j.n; } };
template <> struct Dec<bool> { static bool get(const J& j) { return j.b; } };
template <> struct Dec<char> { static char get(const J& j) { return j.s.empty() ? '\\0' : j.s[0]; } };
template <> struct Dec<string> { static string get(const J& j) { return j.s; } };
template <class T> struct Dec<vector<T>> {
  static vector<T> get(const J& j) { vector<T> v; for (const auto& x : j.a) v.push_back(Dec<T>::get(x)); return v; }
};
template <class T> struct Dec<optional<T>> {
  static optional<T> get(const J& j) { if (j.t == J::Null) return nullopt; return Dec<T>::get(j); }
};

string quote(const string& s) {
  string o = "\\"";
  for (char c : s) {
    switch (c) {
      case '"': o += "\\\\\\""; break;
      case '\\\\': o += "\\\\\\\\"; break;
      case '\\n': o += "\\\\n"; break;
      case '\\r': o += "\\\\r"; break;
      case '\\t': o += "\\\\t"; break;
      default:
        if ((unsigned char)c < 0x20) { char buf[8]; snprintf(buf, sizeof buf, "\\\\u%04x", c); o += buf; }
        else o += c;
    }
  }
  return o + "\\"";
}
void enc(string& o, int v) { o += to_string(v); }
void enc(string& o, long v) { o += to_string(v); }
void enc(string& o, long long v) { o += to_string(v); }
void enc(string& o, double v) {
  if (v == (long long)v && fabs(v) < 1e15) o += to_string((long long)v);
  else { ostringstream ss; ss.precision(17); ss << v; o += ss.str(); }
}
void enc(string& o, bool v) { o += v ? "true" : "false"; }
void enc(string& o, char v) { o += quote(string(1, v)); }
void enc(string& o, const string& v) { o += quote(v); }
void enc(string& o, const char* v) { o += quote(v); }
void enc(string& o, const vector<bool>& v) { o += '['; for (size_t i = 0; i < v.size(); i++) { if (i) o += ','; enc(o, (bool)v[i]); } o += ']'; }
template <class T> void enc(string& o, const optional<T>& v) { if (v) enc(o, *v); else o += "null"; }
template <class T> void enc(string& o, const vector<T>& v) { o += '['; for (size_t i = 0; i < v.size(); i++) { if (i) o += ','; enc(o, v[i]); } o += ']'; }

string logs(const string& text) {
  vector<string> lines; string cur;
  for (char c : text) { if (c == '\\n') { lines.push_back(cur); cur.clear(); } else cur += c; }
  if (!cur.empty()) lines.push_back(cur);
  size_t start = lines.size() > 50 ? lines.size() - 50 : 0;
  string o = "[";
  for (size_t i = start; i < lines.size(); i++) { if (i > start) o += ','; o += quote(lines[i]); }
  return o + "]";
}
}  // namespace prepr

int main() {
  using namespace prepr;
  ios::sync_with_stdio(true);
  string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
  Parser parser(input);
  J tests = parser.value();
  string out = "[";
  streambuf* real = cout.rdbuf();
  for (size_t t = 0; t < tests.a.size(); t++) {
    const J& args = tests.a[t];
    stringstream capture;
    cout.rdbuf(capture.rdbuf());
    auto start = chrono::steady_clock::now();
    string entry;
    try {
${decls}
      Solution sol;
      auto result = ${call};
      double ms = chrono::duration<double, milli>(chrono::steady_clock::now() - start).count();
      string encoded;
      enc(encoded, result);
      cout.rdbuf(real);
      entry = "{\\"ok\\":true,\\"output\\":" + quote(encoded) + ",\\"ms\\":" + to_string(ms) + ",\\"logs\\":" + logs(capture.str()) + "}";
    } catch (const exception& e) {
      cout.rdbuf(real);
      double ms = chrono::duration<double, milli>(chrono::steady_clock::now() - start).count();
      entry = "{\\"ok\\":false,\\"error\\":" + quote(string("exception: ") + e.what()) + ",\\"ms\\":" + to_string(ms) + ",\\"logs\\":" + logs(capture.str()) + "}";
    } catch (...) {
      cout.rdbuf(real);
      entry = "{\\"ok\\":false,\\"error\\":\\"unknown exception\\",\\"ms\\":0,\\"logs\\":" + logs(capture.str()) + "}";
    }
    if (t) out += ',';
    out += entry;
  }
  cout.rdbuf(real);
  cout << "\\n" << ${JSON.stringify(NATIVE_RESULT_MARKER)} << out << "]" << flush;
  return 0;
}
`;
  return { files: { "main.cpp": main, "solution.cpp": code, "bits/stdc++.h": CPP_BITS_SHIM }, userFile: "solution.cpp", userLineOffset: 0 };
}

function goDecode(type: ValueType, index: number): string {
  if (type === "char[][]") {
    return `\tvar raw${index} [][]string
\tif err := json.Unmarshal(args[${index}], &raw${index}); err != nil {
\t\treturn nil, err
\t}
\ta${index} := make([][]byte, len(raw${index}))
\tfor i, row := range raw${index} {
\t\ta${index}[i] = make([]byte, len(row))
\t\tfor j, cell := range row {
\t\t\tif len(cell) > 0 {
\t\t\t\ta${index}[i][j] = cell[0]
\t\t\t}
\t\t}
\t}`;
  }
  return `\tvar a${index} ${GO_TYPES[type]}
\tif err := json.Unmarshal(args[${index}], &a${index}); err != nil {
\t\treturn nil, err
\t}`;
}

function goProgram(code: string, stage: NativeStage): NativeProgram {
  const hasPackage = /^\s*package\s+\w+/m.test(code);
  const user = hasPackage ? code : `package main\n\n${code}`;
  const decodes = stage.signature.params.map((type, i) => goDecode(type, i)).join("\n");
  const call = `${stage.functionName}(${stage.signature.params.map((_, i) => `a${i}`).join(", ")})`;
  const harness = `package main

import (
\t"encoding/json"
\t"fmt"
\t"io"
\t"os"
\t"reflect"
\t"strings"
\t"time"
)

type preprResult struct {
\tOk     bool     \`json:"ok"\`
\tOutput string   \`json:"output,omitempty"\`
\tError  string   \`json:"error,omitempty"\`
\tMs     float64  \`json:"ms"\`
\tLogs   []string \`json:"logs"\`
}

func preprCall(args []json.RawMessage) (interface{}, error) {
${decodes}
\treturn ${call}, nil
}

// Go's nil slices marshal to null; LeetCode treats them as empty.
func preprNormalize(v reflect.Value) interface{} {
\tswitch v.Kind() {
\tcase reflect.Slice:
\t\tif v.Type().Elem().Kind() == reflect.Uint8 {
\t\t\tout := make([]string, v.Len())
\t\t\tfor i := 0; i < v.Len(); i++ {
\t\t\t\tout[i] = string(rune(v.Index(i).Uint()))
\t\t\t}
\t\t\treturn out
\t\t}
\t\tout := make([]interface{}, v.Len())
\t\tfor i := 0; i < v.Len(); i++ {
\t\t\tout[i] = preprNormalize(v.Index(i))
\t\t}
\t\treturn out
\tcase reflect.Ptr, reflect.Interface:
\t\tif v.IsNil() {
\t\t\treturn nil
\t\t}
\t\treturn preprNormalize(v.Elem())
\tcase reflect.Invalid:
\t\treturn nil
\tdefault:
\t\treturn v.Interface()
\t}
}

func preprLogs(text string) []string {
\tlines := strings.Split(strings.TrimRight(text, "\\n"), "\\n")
\tif text == "" {
\t\treturn []string{}
\t}
\tif len(lines) > 50 {
\t\tlines = lines[len(lines)-50:]
\t}
\treturn lines
}

func preprRun(args []json.RawMessage) (res preprResult) {
\treal := os.Stdout
\tr, w, _ := os.Pipe()
\tos.Stdout = w
\tcaptured := make(chan string)
\tgo func() {
\t\tb, _ := io.ReadAll(r)
\t\tcaptured <- string(b)
\t}()
\tstart := time.Now()
\tdefer func() {
\t\trec := recover()
\t\tw.Close()
\t\tos.Stdout = real
\t\tres.Logs = preprLogs(<-captured)
\t\tres.Ms = float64(time.Since(start).Microseconds()) / 1000
\t\tif rec != nil {
\t\t\tres = preprResult{Ok: false, Error: fmt.Sprint("panic: ", rec), Ms: res.Ms, Logs: res.Logs}
\t\t}
\t}()
\tvalue, err := preprCall(args)
\tif err != nil {
\t\treturn preprResult{Ok: false, Error: "could not decode arguments: " + err.Error()}
\t}
\tencoded, err := json.Marshal(preprNormalize(reflect.ValueOf(value)))
\tif err != nil {
\t\treturn preprResult{Ok: false, Error: err.Error()}
\t}
\treturn preprResult{Ok: true, Output: string(encoded)}
}

func main() {
\tinput, _ := io.ReadAll(os.Stdin)
\tvar tests [][]json.RawMessage
\tif err := json.Unmarshal(input, &tests); err != nil {
\t\tfmt.Fprintln(os.Stderr, err)
\t\tos.Exit(2)
\t}
\tresults := make([]preprResult, 0, len(tests))
\tfor _, args := range tests {
\t\tresults = append(results, preprRun(args))
\t}
\tencoded, _ := json.Marshal(results)
\tfmt.Fprint(os.Stdout, "\\n${NATIVE_RESULT_MARKER}"+string(encoded))
}
`;
  return { files: { "harness.go": harness, "solution.go": user }, userFile: "solution.go", userLineOffset: hasPackage ? 0 : 2 };
}

function typescriptProgram(code: string, stage: NativeStage): NativeProgram {
  const fn = stage.functionName;
  // Plain JavaScript (valid TypeScript), so Node's type stripping runs it as-is.
  const harness = `
;(() => {
  const __marker = ${JSON.stringify(NATIVE_RESULT_MARKER)};
  const __fn = typeof ${fn} === "function" ? ${fn} : undefined;
  let __input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { __input += chunk; });
  process.stdin.on("end", () => {
    const __format = (value) => { if (typeof value === "string") return value; try { return JSON.stringify(value); } catch { return String(value); } };
    const __results = JSON.parse(__input).map((args) => {
      const logs = [];
      const original = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug };
      const capture = (...values) => { logs.push(values.map(__format).join(" ")); };
      console.log = console.info = console.warn = console.error = console.debug = capture;
      const started = performance.now();
      try {
        if (!__fn) throw new ReferenceError("Define a function named ${fn}.");
        const value = __fn(...args);
        return { ok: true, output: JSON.stringify(value === undefined ? null : value), ms: performance.now() - started, logs: logs.slice(-50) };
      } catch (error) {
        const message = error && error.message ? error.name + ": " + error.message : String(error);
        return { ok: false, error: message, ms: performance.now() - started, logs: logs.slice(-50) };
      } finally {
        Object.assign(console, original);
      }
    });
    process.stdout.write("\\n" + __marker + JSON.stringify(__results));
  });
})();
`;
  return { files: { "main.ts": `${code}\n${harness}` }, userFile: "main.ts", userLineOffset: 0 };
}

/** Source files for one run of `code` against the stage's signature. */
export function buildNativeProgram(language: NativeLanguage, code: string, stage: NativeStage): NativeProgram {
  assertIdentifier(stage.functionName);
  if (stage.signature.params.length !== stage.params.length) throw new Error("Signature does not match the parameters.");
  switch (language) {
    case "java":
      return javaProgram(code, stage);
    case "cpp":
      return cppProgram(code, stage);
    case "go":
      return goProgram(code, stage);
    case "typescript":
      return typescriptProgram(code, stage);
  }
}
