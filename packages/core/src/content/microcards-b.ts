import type { MicroCard } from "./types";

export const MICROCARDS_B: MicroCard[] = [
  {
    id: "mc-bitmask-dp-transition",
    title: "Bitmask DP: the state transition",
    prompt:
      "🧩 TSP-style bitmask DP: dp[mask][i] = min cost to visit exactly the cities in mask, ending at city i. Write the transition that extends it to a new city j, and give the total time complexity.",
    answerKey:
      "For every city j not in mask: dp[mask | (1 << j)][j] = min(dp[mask | (1 << j)][j], dp[mask][i] + cost[i][j]). There are 2^n * n states with n transitions each, so O(2^n * n^2) time and O(2^n * n) space.",
    keyPoints: [
      {
        label: "Only extend to cities not yet in mask",
        anyOf: ["not in mask", "not visited", "unvisited", "bit j is 0", "bit is not set", "not set", "mask & (1 << j)"],
      },
      {
        label: "New state sets bit j: mask | (1 << j)",
        anyOf: ["mask | (1 << j)", "mask | 1 << j", "set bit", "set the bit", "turn on", "add j to mask", "include j"],
      },
      {
        label: "Relax with dp[mask][i] + cost[i][j]",
        anyOf: ["cost[i][j]", "dp[mask][i] +", "plus cost", "plus the cost", "relax", "min(", "minimum"],
      },
      {
        label: "O(2^n · n^2) time",
        anyOf: ["2^n * n^2", "2^n n^2", "n^2 * 2^n", "n^2 2^n", "n squared 2 to the n", "2 to the n"],
      },
    ],
    hint: "You're at city i having visited the set mask. Which cities can you move to next, and what does the new mask look like?",
    explanation:
      "The mask compresses 'which subset have I used' into an integer, so paths that visit the same set in different orders share one table cell. Iterating masks in increasing numeric order is valid because adding a bit always makes the mask larger. It only scales to n around 20.",
    tags: ["dp_state_compression", "bit_manipulation"],
    difficulty: 3,
    relatedProblem: {
      title: "Shortest Path Visiting All Nodes",
      leetcodeSlug: "shortest-path-visiting-all-nodes",
    },
  },
  {
    id: "mc-monotonic-stack-next-warmer",
    title: "Monotonic stack: next warmer day",
    prompt:
      "📚 Daily Temperatures: for each day, how many days until a warmer one? Explain the monotonic stack: what does it hold, in what order, and when do you pop?",
    answerKey:
      "Keep a stack of indices still waiting for a warmer day, with temperatures decreasing from bottom to top. While today is warmer than the top, pop it and set its answer to today's index minus its index, then push today. Each index is pushed and popped once, so O(n).",
    keyPoints: [
      {
        label: "Stack holds indices still waiting",
        anyOf: ["indices", "index", "indexes", "waiting", "unresolved", "not yet found", "unanswered"],
      },
      {
        label: "Temperatures decreasing bottom to top",
        anyOf: ["decreasing", "descending", "non-increasing", "monotonic"],
      },
      {
        label: "Pop while today is warmer; answer = i - j",
        anyOf: ["pop while", "pop when", "warmer", "greater than the top", "higher than the top", "i - j", "index minus", "difference"],
      },
      {
        label: "O(n): each index pushed and popped once",
        anyOf: ["o(n)", "linear", "pushed and popped once", "each element once", "amortized"],
      },
    ],
    hint: "Which days are still waiting for a warmer day? When a hot day arrives, which of them get resolved first?",
    explanation:
      "Because the stack decreases from bottom to top, the top is always the coldest unresolved day, so a warmer day resolves days from the top down. Once popped, a day never matters again, which bounds the total work at O(n). The same pattern solves next greater element, stock span, and largest rectangle in a histogram.",
    tags: ["monotonic_stack"],
    difficulty: 2,
    relatedProblem: { title: "Daily Temperatures", leetcodeSlug: "daily-temperatures" },
  },
  {
    id: "mc-kahn-cycle-detection",
    title: "Kahn's algorithm: detecting a cycle",
    prompt:
      "🧭 Course Schedule: using Kahn's algorithm (BFS topological sort), how do you detect that it's impossible to finish every course?",
    answerKey:
      "Compute in-degrees, enqueue every node with in-degree 0, then repeatedly pop a node and decrement its neighbors' in-degrees, enqueuing any that reach 0. If fewer than n nodes get processed, the rest sit on a cycle, so finishing is impossible.",
    keyPoints: [
      {
        label: "Track in-degrees; start from in-degree 0",
        anyOf: ["in-degree", "indegree", "in degree", "no prerequisites", "zero incoming", "incoming edges"],
      },
      {
        label: "Pop, decrement neighbors, enqueue at 0",
        anyOf: ["decrement", "reduce", "subtract", "reaches 0", "hits 0", "becomes 0", "reaches zero", "queue", "bfs"],
      },
      {
        label: "Processed count < n means a cycle",
        anyOf: ["cycle", "fewer than n", "less than n", "not all nodes", "processed count", "visited count", "leftover", "remaining nodes"],
      },
    ],
    hint: "Courses on a cycle all wait on each other. What happens to their in-degrees?",
    explanation:
      "A node on a cycle always keeps an incoming edge from another cycle node, so its in-degree never reaches 0 and it is never enqueued. Counting processed nodes is therefore a complete cycle check in O(V + E), with no recursion stack.",
    tags: ["topological_sort", "bfs"],
    difficulty: 2,
    relatedProblem: { title: "Course Schedule", leetcodeSlug: "course-schedule" },
  },
];
