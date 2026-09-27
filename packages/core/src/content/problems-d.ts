import type { NativeLanguage } from "../judge/native";
import type { Problem } from "./types";

/** Blind 75 batch D. */
export const PROBLEMS_D: Problem[] = [
  // ---------------------------------------------------------------- arrays / greedy
  {
    id: "p-best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    leetcodeSlug: "best-time-to-buy-and-sell-stock",
    difficulty: "easy",
    tags: ["arrays", "greedy"],
    statement: `You are given an array \`prices\` where \`prices[i]\` is the price of a stock on day \`i\`.

Choose **one day to buy** and a **later day to sell** to maximize your profit. Return the maximum profit you can achieve, or \`0\` if no profitable trade exists.`,
    examples: [
      { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 1 (price 1) and sell on day 4 (price 6)." },
      { input: "prices = [7,6,4,3,1]", output: "0", explanation: "Prices only fall, so the best move is not to trade." },
    ],
    constraints: ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "📈 Best Time to Buy and Sell Stock: what do you track in one left-to-right pass, and why is that enough to find the best profit? Reply in 1-2 sentences.",
        answerKey:
          "Track the minimum price seen so far; the best sale ending today is the price minus that running minimum, so keep the max profit over all days. Any optimal trade buys at the cheapest earlier day, so one pass with O(1) space covers every sell day.",
        keyPoints: [
          {
            label: "Track the running minimum price",
            anyOf: ["minimum price", "min price", "lowest price", "running min", "cheapest price so far"],
          },
          {
            label: "Profit today is price minus the min so far; keep the max",
            anyOf: ["price minus", "price - min", "keep the max", "max profit", "best profit"],
          },
          {
            label: "One pass, O(1) space",
            anyOf: ["one pass", "single pass", "o(1) space", "o(n) time"],
          },
        ],
        hint: "If you had to sell today, which earlier day would you have wanted to buy on?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: prices = [7,6,4,3,1]. What should you return, and what initialization bug reports a negative profit here? Reply in 1-2 sentences.",
        answerKey:
          "Return 0, because you may skip trading when prices only fall. Initializing best to prices[1] - prices[0] or to negative infinity reports a loss like -1, so start best at 0 to keep the no-trade option.",
        keyPoints: [
          {
            label: "Return 0 when prices only fall",
            anyOf: ["return 0", "profit is 0", "answer is 0", "zero profit"],
          },
          {
            label: "Start best at 0, not a first difference or negative infinity",
            anyOf: ["start best at 0", "best at 0", "initialize best to 0", "no-trade option", "skip trading"],
          },
        ],
        hint: "Is doing nothing allowed? What profit does it give?",
      },
      code: {
        functionName: "maxProfit",
        params: ["prices"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} prices
 * @return {number}
 */
function maxProfit(prices) {
  // Your code here
  return 0;
}
`,
          python: `def maxProfit(prices: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function maxProfit(prices) {
  let minPrice = Infinity;
  let best = 0;
  for (const price of prices) {
    minPrice = Math.min(minPrice, price);
    best = Math.max(best, price - minPrice);
  }
  return best;
}
`,
          python: `from typing import List


def maxProfit(prices: List[int]) -> int:
    min_price = float("inf")
    best = 0
    for price in prices:
        min_price = min(min_price, price)
        best = max(best, price - min_price)
    return best
`,
        },
        tests: [
          { args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
          { args: [[7, 6, 4, 3, 1]], expected: 0 },
          { args: [[1, 2]], expected: 1 },
          { args: [[2, 4, 1]], expected: 2 },
          { args: [[3]], expected: 0 },
          { args: [[2, 1, 2, 1, 0, 1, 2]], expected: 2, hidden: true },
          { args: [[3, 2, 6, 5, 0, 3]], expected: 4, hidden: true },
          { args: [[1, 2, 4, 2, 5, 7, 2, 4, 9, 0]], expected: 8, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["arrays", "greedy"],
    relatedCardIds: ["mc-best-time-buy-sell", "mc-kadane-max-subarray"],
  },

  // ---------------------------------------------------------------- hashing
  {
    id: "p-contains-duplicate",
    title: "Contains Duplicate",
    leetcodeSlug: "contains-duplicate",
    difficulty: "easy",
    tags: ["arrays", "hashing"],
    statement: `Given an integer array \`nums\`, return \`true\` if any value appears **at least twice**, and \`false\` if every element is distinct.`,
    examples: [
      { input: "nums = [1,2,3,1]", output: "true", explanation: "1 appears at indices 0 and 3." },
      { input: "nums = [1,2,3,4]", output: "false" },
      { input: "nums = [1,1,1,3,3,4,3,2,4,2]", output: "true" },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    stages: {
      invariant: {
        prompt:
          "🔁 Contains Duplicate: what structure answers this in one pass, and how do its time and space compare with sorting first? Reply in 1-2 sentences.",
        answerKey:
          "Keep a hash set of the values seen so far and return true the moment a number is already in it, which is O(n) time and O(n) space. Sorting first and comparing adjacent pairs costs O(n log n) time but only O(1) extra space.",
        keyPoints: [
          {
            label: "Hash set of seen values",
            anyOf: ["hash set", "hashset", "set of the values", "seen set"],
          },
          {
            label: "O(n) time and space",
            anyOf: ["o(n) time", "o(n) space", "linear time"],
          },
          {
            label: "Sorting trade-off: O(n log n), compare adjacent",
            anyOf: ["o(n log n)", "adjacent pairs", "adjacent", "neighbors"],
          },
        ],
        hint: "What do you need to remember about the numbers you've already passed?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [3,1,4,3]. If you compare neighbors without sorting first, what do you return, and what is the fix? Reply in 1-2 sentences.",
        answerKey:
          "The neighbor pairs 3-1, 1-4 and 4-3 all differ, so the check wrongly returns false even though 3 repeats. Either sort first so equal values become adjacent, or use a hash set that remembers every earlier value.",
        keyPoints: [
          {
            label: "The unsorted neighbor check returns false",
            anyOf: ["returns false", "return false", "misses the repeat"],
          },
          {
            label: "Fix: sort first or use a hash set",
            anyOf: ["sort first", "hash set", "become adjacent", "sorting first"],
          },
        ],
        hint: "Duplicates only sit next to each other after one particular step.",
      },
      code: {
        functionName: "containsDuplicate",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {boolean}
 */
function containsDuplicate(nums) {
  // Your code here
  return false;
}
`,
          python: `def containsDuplicate(nums: List[int]) -> bool:
    # Your code here
    return False
`,
        },
        reference: {
          javascript: `function containsDuplicate(nums) {
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}
`,
          python: `from typing import List


def containsDuplicate(nums: List[int]) -> bool:
    seen = set()
    for n in nums:
        if n in seen:
            return True
        seen.add(n)
    return False
`,
        },
        tests: [
          { args: [[1, 2, 3, 1]], expected: true },
          { args: [[1, 2, 3, 4]], expected: false },
          { args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expected: true },
          { args: [[5]], expected: false },
          { args: [[3, 1, 4, 3]], expected: true },
          { args: [[-1, 0, 1, -1]], expected: true, hidden: true },
          { args: [[0, 1000000000, -1000000000]], expected: false, hidden: true },
          { args: [[2, 14, 18, 22, 22]], expected: true, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["hashing"],
    relatedCardIds: ["mc-two-sum-hash-map", "mc-longest-consecutive-sequence"],
  },

  // ---------------------------------------------------------------- 1D DP
  {
    id: "p-maximum-subarray",
    title: "Maximum Subarray",
    leetcodeSlug: "maximum-subarray",
    difficulty: "medium",
    tags: ["arrays", "dp_1d"],
    statement: `Given an integer array \`nums\`, find the **non-empty** contiguous subarray with the largest sum and return that sum.`,
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has sum 6." },
      { input: "nums = [1]", output: "1" },
      { input: "nums = [5,4,-1,7,8]", output: "23" },
    ],
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    stages: {
      invariant: {
        prompt:
          "➕ Maximum Subarray: in Kadane's algorithm, what does the running value mean at index i, and when do you restart it? Reply in 1-2 sentences.",
        answerKey:
          "cur is the best sum of a subarray that ends exactly at index i, updated as cur = max(nums[i], cur + nums[i]), so you restart at nums[i] whenever the previous sum is negative. The answer is the max of cur over all i.",
        keyPoints: [
          {
            label: "cur is the best sum ending at i",
            anyOf: ["ends exactly at", "ending at", "ends at"],
          },
          {
            label: "Restart when the previous sum is negative",
            anyOf: ["restart", "previous sum is negative", "drop the prefix", "start fresh"],
          },
          {
            label: "The answer is the max over all i",
            anyOf: ["max of cur", "over all i", "global max", "best overall"],
          },
        ],
        hint: "If the best subarray ending at i - 1 has a negative sum, would you want to extend it?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [-3,-1,-2]. What is the answer, and what initialization bug returns 0 instead? Reply in 1-2 sentences.",
        answerKey:
          "The answer is -1, since the subarray must be non-empty. Starting best at 0, or resetting cur to 0, returns 0 for the empty subarray; initialize best and cur to nums[0].",
        keyPoints: [
          {
            label: "The answer is -1 (the subarray is non-empty)",
            anyOf: ["answer is -1", "non-empty", "must be non"],
          },
          {
            label: "Initialize to nums[0], not 0",
            anyOf: ["to nums[0]", "initialize best and cur", "first element"],
          },
        ],
        hint: "Is the empty subarray allowed? What does best = 0 silently assume?",
      },
      code: {
        functionName: "maxSubArray",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
  // Your code here
  return 0;
}
`,
          python: `def maxSubArray(nums: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function maxSubArray(nums) {
  let cur = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}
`,
          python: `from typing import List


def maxSubArray(nums: List[int]) -> int:
    cur = best = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return best
`,
        },
        tests: [
          { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
          { args: [[1]], expected: 1 },
          { args: [[5, 4, -1, 7, 8]], expected: 23 },
          { args: [[-3, -1, -2]], expected: -1 },
          { args: [[-1]], expected: -1 },
          { args: [[8, -19, 5, -4, 20]], expected: 21, hidden: true },
          { args: [[-2, -1]], expected: -1, hidden: true },
          { args: [[1, 2, -1, -2, 2, 1, -2, 1, 4, -5, 4]], expected: 6, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_1d"],
    relatedCardIds: ["mc-kadane-max-subarray", "mc-best-time-buy-sell"],
  },
  {
    id: "p-maximum-product-subarray",
    title: "Maximum Product Subarray",
    leetcodeSlug: "maximum-product-subarray",
    difficulty: "medium",
    tags: ["arrays", "dp_1d"],
    statement: `Given an integer array \`nums\`, find the **non-empty** contiguous subarray with the largest product and return that product.

The answer is guaranteed to fit in a 32-bit integer.`,
    examples: [
      { input: "nums = [2,3,-2,4]", output: "6", explanation: "The subarray [2,3] has product 6." },
      { input: "nums = [-2,0,-1]", output: "0", explanation: "[-2,-1] is not contiguous, so the best is 0." },
    ],
    constraints: [
      "1 <= nums.length <= 2 * 10^4",
      "-10 <= nums[i] <= 10",
      "The product of any subarray fits in a 32-bit integer",
    ],
    stages: {
      invariant: {
        prompt:
          "✖️ Maximum Product Subarray: why is tracking only the max product ending at i wrong, and what do you track instead? Reply in 1-2 sentences.",
        answerKey:
          "A negative number flips the sign, so the most negative product ending at i can become the largest after one more negative. Track both the max and min product ending at i, updating each from x, x * hi and x * lo.",
        keyPoints: [
          {
            label: "A negative turns the min into the max",
            anyOf: ["flips the sign", "negative number", "most negative", "sign flip"],
          },
          {
            label: "Track both the max and the min ending at i",
            anyOf: ["max and min", "both the max", "min product", "max and the min"],
          },
          {
            label: "Update from x, x * hi and x * lo",
            anyOf: ["x * hi", "x * lo", "three candidates"],
          },
        ],
        hint: "Take [-2, 3, -4]. What is the smallest product ending at 3, and what happens to it at -4?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [-2,0,-1]. What is the answer, and how must your running max and min handle the 0? Reply in 1-2 sentences.",
        answerKey:
          "The answer is 0. A zero resets both running products to 0, and because each update also considers x alone, the next element starts a fresh subarray instead of multiplying through the zero.",
        keyPoints: [
          {
            label: "The answer is 0",
            anyOf: ["answer is 0"],
          },
          {
            label: "Zero resets both products; x alone starts a fresh subarray",
            anyOf: ["resets both", "fresh subarray", "x alone", "start over"],
          },
        ],
        hint: "What are the running max and min right after you multiply by 0?",
      },
      code: {
        functionName: "maxProduct",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxProduct(nums) {
  // Your code here
  return 0;
}
`,
          python: `def maxProduct(nums: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function maxProduct(nums) {
  let hi = nums[0];
  let lo = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    const a = x * hi;
    const b = x * lo;
    hi = Math.max(x, a, b);
    lo = Math.min(x, a, b);
    best = Math.max(best, hi);
  }
  return best;
}
`,
          python: `from typing import List


def maxProduct(nums: List[int]) -> int:
    hi = lo = best = nums[0]
    for x in nums[1:]:
        candidates = (x, x * hi, x * lo)
        hi, lo = max(candidates), min(candidates)
        best = max(best, hi)
    return best
`,
        },
        tests: [
          { args: [[2, 3, -2, 4]], expected: 6 },
          { args: [[-2, 0, -1]], expected: 0 },
          { args: [[-2]], expected: -2 },
          { args: [[-2, 3, -4]], expected: 24 },
          { args: [[0, 2]], expected: 2 },
          { args: [[2, -5, -2, -4, 3]], expected: 24, hidden: true },
          { args: [[-1, -1]], expected: 1, hidden: true },
          { args: [[3, -1, 4]], expected: 4, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["dp_1d"],
    relatedCardIds: ["mc-kadane-max-subarray", "mc-dp-rolling-array"],
  },

  // ---------------------------------------------------------------- bit manipulation
  {
    id: "p-sum-of-two-integers",
    title: "Sum of Two Integers",
    leetcodeSlug: "sum-of-two-integers",
    difficulty: "medium",
    tags: ["bit_manipulation", "math"],
    statement: `Given two integers \`a\` and \`b\`, return their sum **without using the operators \`+\` and \`-\`**.`,
    examples: [
      { input: "a = 1, b = 2", output: "3" },
      { input: "a = 2, b = 3", output: "5" },
    ],
    constraints: ["-1000 <= a, b <= 1000"],
    stages: {
      invariant: {
        prompt:
          "🧮 Sum of Two Integers: with no + or -, how do XOR and AND together add a and b, and when does the loop stop? Reply in 1-2 sentences.",
        answerKey:
          "a XOR b is the sum ignoring carries, and (a AND b) shifted left by 1 is the carry; set a to the XOR and b to the carry, and repeat until the carry is 0, when a holds the sum.",
        keyPoints: [
          {
            label: "XOR is the sum without carries",
            anyOf: ["xor", "sum ignoring carries", "add without carry"],
          },
          {
            label: "AND shifted left by 1 is the carry",
            anyOf: ["shifted left", "<< 1", "shift left"],
          },
          {
            label: "Repeat until the carry is 0",
            anyOf: ["until the carry is 0", "until carry", "repeat until", "carry becomes 0"],
          },
        ],
        hint: "Add 5 + 3 in binary by hand. Which bits come from XOR and which positions get a carry?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: a = -1, b = 1. In Python, why can the XOR/carry loop run forever, and how do you fix it? Reply in 1-2 sentences.",
        answerKey:
          "Python ints have unlimited width, so the negative carry keeps shifting left and the loop runs forever. Mask every step with 0xFFFFFFFF to simulate 32 bits, then convert the result back to a negative number if it is above 0x7FFFFFFF.",
        keyPoints: [
          {
            label: "Unbounded ints: the carry keeps growing",
            anyOf: ["unlimited width", "arbitrary precision", "unbounded", "keeps shifting"],
          },
          {
            label: "Mask each step to 32 bits",
            anyOf: ["0xffffffff", "mask", "32 bits"],
          },
          {
            label: "Convert back to a negative above 0x7fffffff",
            anyOf: ["0x7fffffff", "back to a negative", "convert the result back", "sign bit"],
          },
        ],
        hint: "Java and C++ ints wrap at 32 bits. What does Python do instead?",
      },
      code: {
        functionName: "getSum",
        params: ["a", "b"],
        signature: { params: ["int", "int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function getSum(a, b) {
  // Your code here
  return 0;
}
`,
          python: `def getSum(a: int, b: int) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function getSum(a, b) {
  while (b !== 0) {
    const carry = (a & b) << 1;
    a = a ^ b;
    b = carry;
  }
  return a;
}
`,
          python: `def getSum(a: int, b: int) -> int:
    mask = 0xFFFFFFFF
    while b != 0:
        a, b = (a ^ b) & mask, ((a & b) << 1) & mask
    return a if a <= 0x7FFFFFFF else ~(a ^ mask)
`,
        },
        tests: [
          { args: [1, 2], expected: 3 },
          { args: [2, 3], expected: 5 },
          { args: [-1, 1], expected: 0 },
          { args: [-2, -3], expected: -5 },
          { args: [0, 7], expected: 7 },
          { args: [1000, -1000], expected: 0, hidden: true },
          { args: [-1000, 999], expected: -1, hidden: true },
          { args: [123, 456], expected: 579, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["bit_manipulation"],
    relatedCardIds: ["mc-add-without-plus", "mc-single-number-xor"],
  },
  {
    id: "p-number-of-1-bits",
    title: "Number of 1 Bits",
    leetcodeSlug: "number-of-1-bits",
    difficulty: "easy",
    tags: ["bit_manipulation"],
    statement: `Given a non-negative integer \`n\`, return the number of \`1\` bits in its binary representation (its **Hamming weight**).`,
    examples: [
      { input: "n = 11", output: "3", explanation: "11 is 1011 in binary." },
      { input: "n = 128", output: "1", explanation: "128 is 10000000 in binary." },
      { input: "n = 2147483645", output: "30" },
    ],
    constraints: ["0 <= n <= 2^31 - 1"],
    stages: {
      invariant: {
        prompt:
          "🔢 Number of 1 Bits: what does n & (n - 1) do, and why does looping on it beat checking all 32 bits? Reply in 1-2 sentences.",
        answerKey:
          "n & (n - 1) clears the lowest set bit, so counting how many times you apply it before n hits 0 gives the popcount. The loop runs once per set bit rather than 32 times.",
        keyPoints: [
          {
            label: "n & (n - 1) clears the lowest set bit",
            anyOf: ["clears the lowest set bit", "lowest set bit", "drops the lowest", "removes the lowest"],
          },
          {
            label: "Count iterations until n is 0",
            anyOf: ["hits 0", "until n is 0", "counting how many times", "count how many times", "reaches 0"],
          },
          {
            label: "Runs once per set bit",
            anyOf: ["once per set bit", "per set bit", "number of set bits"],
          },
        ],
        hint: "Write 12 as 1100 and 11 as 1011. What does 12 & 11 leave?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: n = 2147483647. Why is n / 2 the wrong way to halve n in JavaScript or Python 3, and what do you use? Reply in 1-2 sentences.",
        answerKey:
          "In JavaScript and Python 3, / is float division, so 2147483647 / 2 gives 1073741823.5 and the loop miscounts on fractions. Use an integer shift like n >> 1 (or // 2) so each step drops exactly the lowest bit; the answer here is 31.",
        keyPoints: [
          {
            label: "/ is float division",
            anyOf: ["float division", "fractions", "1073741823.5", "floating point"],
          },
          {
            label: "Use an integer shift",
            anyOf: ["integer shift", "n >> 1", "n >>> 1", "// 2", "right shift"],
          },
          {
            label: "The answer is 31",
            anyOf: ["answer here is 31", "answer is 31", "31 ones"],
          },
        ],
        hint: "What is 7 / 2 in JavaScript? And in Python 3?",
      },
      code: {
        functionName: "hammingWeight",
        params: ["n"],
        signature: { params: ["int"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number} n
 * @return {number}
 */
function hammingWeight(n) {
  // Your code here
  return 0;
}
`,
          python: `def hammingWeight(n: int) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    n &= n - 1;
    count++;
  }
  return count;
}
`,
          python: `def hammingWeight(n: int) -> int:
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count
`,
        },
        tests: [
          { args: [11], expected: 3 },
          { args: [128], expected: 1 },
          { args: [2147483645], expected: 30 },
          { args: [0], expected: 0 },
          { args: [1], expected: 1 },
          { args: [2147483647], expected: 31, hidden: true },
          { args: [1023], expected: 10, hidden: true },
          { args: [1431655765], expected: 16, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["bit_manipulation"],
    relatedCardIds: ["mc-clear-lowest-set-bit", "mc-reverse-bits-shift"],
  },
  {
    id: "p-counting-bits",
    title: "Counting Bits",
    leetcodeSlug: "counting-bits",
    difficulty: "easy",
    tags: ["bit_manipulation", "dp_1d"],
    statement: `Given an integer \`n\`, return an array \`ans\` of length \`n + 1\` where \`ans[i]\` is the number of \`1\` bits in the binary representation of \`i\`, for every \`0 <= i <= n\`.

Can you do it in **O(n)** time without a built-in popcount?`,
    examples: [
      { input: "n = 2", output: "[0,1,1]" },
      { input: "n = 5", output: "[0,1,1,2,1,2]" },
    ],
    constraints: ["0 <= n <= 10^5"],
    stages: {
      invariant: {
        prompt:
          "📊 Counting Bits: how do you get bits[i] from an earlier answer in O(1), for O(n) overall? Reply in 1-2 sentences.",
        answerKey:
          "Reuse a smaller index: bits[i] = bits[i >> 1] + (i & 1), since shifting right drops the last bit, or bits[i] = bits[i & (i - 1)] + 1, since that clears the lowest set bit. Each entry is O(1), so the whole table is O(n).",
        keyPoints: [
          {
            label: "Recurrence from a smaller index",
            anyOf: ["smaller index", "bits[i >> 1]", "i >> 1", "i / 2", "i // 2"],
          },
          {
            label: "Why: the shift drops the last bit (or the lowest set bit is cleared)",
            anyOf: ["drops the last bit", "clears the lowest set bit", "last bit"],
          },
          {
            label: "O(1) per entry, O(n) total",
            anyOf: ["o(n)", "o(1)"],
          },
        ],
        hint: "How does the binary of 6 relate to the binary of 3?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: n = 0. What must you return, and what off-by-one in the output size is easy to make? Reply in 1-2 sentences.",
        answerKey:
          "Return [0], a single entry, because the output covers every i from 0 to n inclusive, so it has n + 1 entries. Allocating only n slots drops the last number and returns an empty array for n = 0.",
        keyPoints: [
          {
            label: "Return [0]",
            anyOf: ["return [0]", "single entry", "one entry"],
          },
          {
            label: "n + 1 entries, 0 to n inclusive",
            anyOf: ["n + 1", "inclusive"],
          },
        ],
        hint: "How many integers are there from 0 to n?",
      },
      code: {
        functionName: "countBits",
        params: ["n"],
        signature: { params: ["int"], returns: "int[]" },
        starter: {
          javascript: `/**
 * @param {number} n
 * @return {number[]}
 */
function countBits(n) {
  // Your code here
  return [];
}
`,
          python: `def countBits(n: int) -> List[int]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function countBits(n) {
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
  return bits;
}
`,
          python: `from typing import List


def countBits(n: int) -> List[int]:
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)
    return bits
`,
        },
        tests: [
          { args: [2], expected: [0, 1, 1] },
          { args: [5], expected: [0, 1, 1, 2, 1, 2] },
          { args: [0], expected: [0] },
          { args: [1], expected: [0, 1] },
          { args: [8], expected: [0, 1, 1, 2, 1, 2, 2, 3, 1] },
          { args: [15], expected: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4], hidden: true },
          { args: [16], expected: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1], hidden: true },
          { args: [10], expected: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["bit_manipulation", "dp_1d"],
    relatedCardIds: ["mc-counting-bits-half", "mc-clear-lowest-set-bit"],
  },
  {
    id: "p-missing-number",
    title: "Missing Number",
    leetcodeSlug: "missing-number",
    difficulty: "easy",
    tags: ["arrays", "math", "bit_manipulation"],
    statement: `Given an array \`nums\` containing \`n\` **distinct** numbers in the range \`[0, n]\`, return the only number in the range that is missing from the array.

Can you do it in **O(n)** time and **O(1)** extra space?`,
    examples: [
      { input: "nums = [3,0,1]", output: "2", explanation: "n = 3, so the range is [0,3] and 2 is missing." },
      { input: "nums = [0,1]", output: "2", explanation: "n = 2, so the range is [0,2] and 2 is missing." },
      { input: "nums = [9,6,4,2,3,5,7,0,1]", output: "8" },
    ],
    constraints: ["n == nums.length", "1 <= n <= 10^4", "0 <= nums[i] <= n", "All numbers in nums are unique"],
    stages: {
      invariant: {
        prompt:
          "🕳️ Missing Number: nums holds n distinct values from 0 to n with one missing. How do you find it in O(n) time and O(1) space? Reply in 1-2 sentences.",
        answerKey:
          "The expected sum of 0 to n is n * (n + 1) / 2, so the missing number is that minus the actual sum. Equivalently, XOR every index 0 to n with every value; matching pairs cancel and only the missing number is left.",
        keyPoints: [
          {
            label: "Expected sum n(n + 1)/2 minus the actual sum",
            anyOf: ["expected sum", "n * (n + 1) / 2", "minus the actual sum", "gauss"],
          },
          {
            label: "Or XOR indices with values so pairs cancel",
            anyOf: ["xor", "pairs cancel", "cancel"],
          },
        ],
        hint: "You know exactly which numbers should be there. What single number summarizes all of them?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [0,1]. What is the answer, and why does scanning sorted neighbors for a gap miss it? Reply in 1-2 sentences.",
        answerKey:
          "The answer is 2, because n = 2 so the range is 0 to 2 and the missing value is n itself. The sorted neighbors 0 and 1 have no gap, so a gap scan must also check the end of the range (and the start, for a missing 0).",
        keyPoints: [
          {
            label: "The answer is 2, which is n",
            anyOf: ["answer is 2", "n itself", "missing value is n"],
          },
          {
            label: "A gap scan must also check the end",
            anyOf: ["check the end", "end of the range", "the end"],
          },
        ],
        hint: "How long is the array, and so what is n?",
      },
      code: {
        functionName: "missingNumber",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function missingNumber(nums) {
  // Your code here
  return 0;
}
`,
          python: `def missingNumber(nums: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function missingNumber(nums) {
  let missing = nums.length;
  for (let i = 0; i < nums.length; i++) missing ^= i ^ nums[i];
  return missing;
}
`,
          python: `from typing import List


def missingNumber(nums: List[int]) -> int:
    n = len(nums)
    return n * (n + 1) // 2 - sum(nums)
`,
        },
        tests: [
          { args: [[3, 0, 1]], expected: 2 },
          { args: [[0, 1]], expected: 2 },
          { args: [[9, 6, 4, 2, 3, 5, 7, 0, 1]], expected: 8 },
          { args: [[1]], expected: 0 },
          { args: [[0]], expected: 1 },
          { args: [[1, 2]], expected: 0, hidden: true },
          { args: [[2, 0, 3, 4, 1, 6, 5, 8, 7]], expected: 9, hidden: true },
          { args: [[4, 2, 0, 1]], expected: 3, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["math", "bit_manipulation"],
    relatedCardIds: ["mc-missing-number-sum-or-xor", "mc-single-number-xor"],
  },
  {
    id: "p-reverse-bits",
    title: "Reverse Bits",
    leetcodeSlug: "reverse-bits",
    difficulty: "easy",
    tags: ["bit_manipulation"],
    statement: `Reverse the bits of a **32-bit unsigned** integer \`n\` and return the result as an unsigned value.

Bit \`0\` of the input becomes bit \`31\` of the output, bit \`1\` becomes bit \`30\`, and so on. Inputs and outputs here are plain non-negative numbers in \`[0, 2^32 - 1]\`.`,
    examples: [
      {
        input: "n = 43261596",
        output: "964176192",
        explanation: "00000010100101000001111010011100 reversed is 00111001011110000010100101000000.",
      },
      { input: "n = 4294967293", output: "3221225471" },
      { input: "n = 1", output: "2147483648" },
    ],
    constraints: ["0 <= n <= 2^32 - 1", "n is treated as exactly 32 bits"],
    stages: {
      invariant: {
        prompt:
          "🔄 Reverse Bits: describe the loop that builds the reversed 32-bit value. How many iterations, and what happens each step? Reply in 1-2 sentences.",
        answerKey:
          "Loop exactly 32 times: shift the result left by 1, OR in the lowest bit of n (n & 1), then shift n right by 1. After 32 steps the bit that started at position i sits at position 31 - i.",
        keyPoints: [
          {
            label: "Exactly 32 iterations",
            anyOf: ["32 times", "32 steps", "32 iterations"],
          },
          {
            label: "Shift the result left and OR in n & 1",
            anyOf: ["shift the result left", "lowest bit of n", "n & 1"],
          },
          {
            label: "Shift n right each step",
            anyOf: ["shift n right", "n >>= 1", "n >>> 1"],
          },
        ],
        hint: "Think of popping bits off the right end of n and pushing them onto the right end of the result.",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: n = 1. What is the answer, and why can't you stop the loop as soon as n reaches 0? Reply in 1-2 sentences.",
        answerKey:
          "The answer is 2147483648, which is 1 << 31. Stopping when n hits 0 would return 1, because the leading zeros of n still have to push the result left, so the loop must run all 32 times; in JavaScript finish with >>> 0 to keep the result unsigned.",
        keyPoints: [
          {
            label: "The answer is 2147483648",
            anyOf: ["2147483648", "1 << 31"],
          },
          {
            label: "Always run all 32 iterations",
            anyOf: ["all 32 times", "all 32", "leading zeros"],
          },
          {
            label: "Keep the result unsigned",
            anyOf: ["unsigned", ">>> 0"],
          },
        ],
        hint: "The leading zeros of n become trailing zeros of the answer. Who shifts them in?",
      },
      code: {
        functionName: "reverseBits",
        params: ["n"],
        signature: { params: ["long"], returns: "long" },
        starter: {
          javascript: `/**
 * @param {number} n - an unsigned 32-bit value
 * @return {number} an unsigned 32-bit value
 */
function reverseBits(n) {
  // Your code here
  return 0;
}
`,
          python: `def reverseBits(n: int) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function reverseBits(n) {
  let result = 0;
  for (let i = 0; i < 32; i++) {
    result = ((result << 1) | (n & 1)) >>> 0;
    n >>>= 1;
  }
  return result;
}
`,
          python: `def reverseBits(n: int) -> int:
    result = 0
    for _ in range(32):
        result = (result << 1) | (n & 1)
        n >>= 1
    return result
`,
        },
        tests: [
          { args: [43261596], expected: 964176192 },
          { args: [4294967293], expected: 3221225471 },
          { args: [1], expected: 2147483648 },
          { args: [0], expected: 0 },
          { args: [2147483648], expected: 1 },
          { args: [4294967295], expected: 4294967295, hidden: true },
          { args: [2], expected: 1073741824, hidden: true },
          { args: [305419896], expected: 510274632, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["bit_manipulation"],
    relatedCardIds: ["mc-reverse-bits-shift", "mc-counting-bits-half"],
  },

  // ---------------------------------------------------------------- hashing / greedy
  {
    id: "p-longest-consecutive-sequence",
    title: "Longest Consecutive Sequence",
    leetcodeSlug: "longest-consecutive-sequence",
    difficulty: "medium",
    tags: ["arrays", "hashing"],
    statement: `Given an unsorted array of integers \`nums\`, return the length of the longest run of **consecutive integers** (values \`x, x + 1, x + 2, ...\`) that all appear in \`nums\`. Order in the array does not matter.

You must write an algorithm that runs in **O(n)** time.`,
    examples: [
      { input: "nums = [100,4,200,1,3,2]", output: "4", explanation: "The run is 1, 2, 3, 4." },
      { input: "nums = [0,3,7,2,5,8,4,6,0,1]", output: "9" },
      { input: "nums = [1,0,1,2]", output: "3" },
    ],
    constraints: ["0 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    stages: {
      invariant: {
        prompt:
          "🔗 Longest Consecutive Sequence: how do you get O(n) with a hash set, and which numbers do you start counting from? Reply in 1-2 sentences.",
        answerKey:
          "Put every number in a hash set and only start counting at x when x - 1 is absent, so x begins a run, then walk x + 1, x + 2 and so on while they are present. Each number is visited by at most one walk, so the total is O(n).",
        keyPoints: [
          {
            label: "Hash set of all numbers",
            anyOf: ["hash set", "put every number", "set of all"],
          },
          {
            label: "Start only where x - 1 is absent",
            anyOf: ["x - 1 is absent", "begins a run", "start of a run", "x - 1"],
          },
          {
            label: "Each number is walked once, O(n) total",
            anyOf: ["o(n)", "at most one walk", "visited once"],
          },
        ],
        hint: "If you start a walk from every number, [1,2,3,4] costs O(n^2). Which starts are wasted?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [1,2,0,1]. What is the answer, and how do duplicates break a sort-and-scan approach if handled carelessly? Reply in 1-2 sentences.",
        answerKey:
          "The answer is 3, from 0, 1, 2. After sorting to [0,1,1,2], a scan that resets the run on the repeated 1 reports 2, so skip equal neighbors so duplicates neither extend nor break the run; a hash set removes them automatically.",
        keyPoints: [
          {
            label: "The answer is 3",
            anyOf: ["answer is 3"],
          },
          {
            label: "Skip equal neighbors (or dedupe)",
            anyOf: ["skip equal neighbors", "skip duplicates", "equal neighbors", "removes them", "dedupe"],
          },
        ],
        hint: "Sort [1,2,0,1] and walk it. What happens at the second 1?",
      },
      code: {
        functionName: "longestConsecutive",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function longestConsecutive(nums) {
  // Your code here
  return 0;
}
`,
          python: `def longestConsecutive(nums: List[int]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const x of set) {
    if (set.has(x - 1)) continue;
    let length = 1;
    while (set.has(x + length)) length++;
    best = Math.max(best, length);
  }
  return best;
}
`,
          python: `from typing import List


def longestConsecutive(nums: List[int]) -> int:
    values = set(nums)
    best = 0
    for x in values:
        if x - 1 in values:
            continue
        length = 1
        while x + length in values:
            length += 1
        best = max(best, length)
    return best
`,
        },
        tests: [
          { args: [[100, 4, 200, 1, 3, 2]], expected: 4 },
          { args: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], expected: 9 },
          { args: [[1, 0, 1, 2]], expected: 3 },
          { args: [[]], expected: 0 },
          { args: [[5]], expected: 1 },
          { args: [[9, 1, 4, 7, 3, -1, 0, 5, 8, -1, 6]], expected: 7, hidden: true },
          { args: [[-3, -2, -1, 10, 11]], expected: 3, hidden: true },
          { args: [[1, 3, 5, 7]], expected: 1, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["hashing"],
    relatedCardIds: ["mc-longest-consecutive-sequence", "mc-two-sum-hash-map"],
  },
  {
    id: "p-jump-game",
    title: "Jump Game",
    leetcodeSlug: "jump-game",
    difficulty: "medium",
    tags: ["arrays", "greedy"],
    statement: `You start at index \`0\` of an integer array \`nums\`. Each element \`nums[i]\` is the **maximum** jump length from position \`i\`.

Return \`true\` if you can reach the last index, or \`false\` otherwise.`,
    examples: [
      { input: "nums = [2,3,1,1,4]", output: "true", explanation: "Jump 1 step to index 1, then 3 steps to the last index." },
      {
        input: "nums = [3,2,1,0,4]",
        output: "false",
        explanation: "Every path lands on index 3, whose jump length is 0.",
      },
    ],
    constraints: ["1 <= nums.length <= 10^4", "0 <= nums[i] <= 10^5"],
    stages: {
      invariant: {
        prompt:
          "🦘 Jump Game: what single value do you track in the greedy left-to-right pass, and when do you return false? Reply in 1-2 sentences.",
        answerKey:
          "Track the farthest index reachable so far, updating it to max(farthest, i + nums[i]) at each index i you can reach. If i ever exceeds farthest you are stuck and return false; otherwise return true once farthest reaches the last index.",
        keyPoints: [
          {
            label: "Track the farthest reachable index",
            anyOf: ["farthest index", "farthest reachable", "max reach", "furthest"],
          },
          {
            label: "Update it with i + nums[i]",
            anyOf: ["i + nums[i]", "max(farthest"],
          },
          {
            label: "Stuck once i passes farthest",
            anyOf: ["exceeds farthest", "i > farthest", "stuck"],
          },
        ],
        hint: "You don't need to know which jumps to take, only how far you could possibly get.",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: nums = [3,2,1,0,4]. What is the answer, and where exactly does the greedy scan get stuck? Reply in 1-2 sentences.",
        answerKey:
          "The answer is false: every index from 0 to 3 reaches at most index 3, where nums[3] = 0, so farthest stays 3 and index 4 is beyond it. The zero at index 3 is a wall that no earlier jump clears.",
        keyPoints: [
          {
            label: "The answer is false",
            anyOf: ["answer is false"],
          },
          {
            label: "Stuck at index 3, where nums[3] = 0",
            anyOf: ["farthest stays 3", "nums[3] = 0", "index 3", "zero at index 3"],
          },
        ],
        hint: "Compute i + nums[i] for i = 0 to 3. What is the largest?",
      },
      code: {
        functionName: "canJump",
        params: ["nums"],
        signature: { params: ["int[]"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {number[]} nums
 * @return {boolean}
 */
function canJump(nums) {
  // Your code here
  return false;
}
`,
          python: `def canJump(nums: List[int]) -> bool:
    # Your code here
    return False
`,
        },
        reference: {
          javascript: `function canJump(nums) {
  let farthest = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;
    farthest = Math.max(farthest, i + nums[i]);
    if (farthest >= nums.length - 1) return true;
  }
  return true;
}
`,
          python: `from typing import List


def canJump(nums: List[int]) -> bool:
    farthest = 0
    for i, jump in enumerate(nums):
        if i > farthest:
            return False
        farthest = max(farthest, i + jump)
        if farthest >= len(nums) - 1:
            return True
    return True
`,
        },
        tests: [
          { args: [[2, 3, 1, 1, 4]], expected: true },
          { args: [[3, 2, 1, 0, 4]], expected: false },
          { args: [[0]], expected: true },
          { args: [[2, 0, 0]], expected: true },
          { args: [[1, 0, 1, 0]], expected: false },
          { args: [[2, 5, 0, 0]], expected: true, hidden: true },
          { args: [[1, 1, 0, 1]], expected: false, hidden: true },
          { args: [[5, 0, 0, 0, 0, 0]], expected: true, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["greedy"],
    relatedCardIds: ["mc-jump-game-farthest-reach", "mc-greedy-exchange-argument"],
  },
];

/** Java / C++ / Go / TypeScript reference solutions for this batch, by problem id. */
export const NATIVE_REFERENCES_D: Record<string, Record<NativeLanguage, string>> = {
  "p-best-time-to-buy-and-sell-stock": {
    java: `class Solution {
    public int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE, best = 0;
        for (int p : prices) {
            minPrice = Math.min(minPrice, p);
            best = Math.max(best, p - minPrice);
        }
        return best;
    }
}`,
    cpp: `class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minPrice = INT_MAX, best = 0;
        for (int p : prices) {
            minPrice = min(minPrice, p);
            best = max(best, p - minPrice);
        }
        return best;
    }
};`,
    go: `func maxProfit(prices []int) int {
	minPrice, best := prices[0], 0
	for _, p := range prices {
		if p < minPrice {
			minPrice = p
		}
		if p-minPrice > best {
			best = p - minPrice
		}
	}
	return best
}`,
    typescript: `function maxProfit(prices: number[]): number {
  let minPrice = Infinity;
  let best = 0;
  for (const p of prices) {
    minPrice = Math.min(minPrice, p);
    best = Math.max(best, p - minPrice);
  }
  return best;
}`,
  },
  "p-contains-duplicate": {
    java: `class Solution {
    public boolean containsDuplicate(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int n : nums) {
            if (!seen.add(n)) return true;
        }
        return false;
    }
}`,
    cpp: `class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        unordered_set<int> seen;
        for (int n : nums) {
            if (!seen.insert(n).second) return true;
        }
        return false;
    }
};`,
    go: `func containsDuplicate(nums []int) bool {
	seen := make(map[int]bool, len(nums))
	for _, n := range nums {
		if seen[n] {
			return true
		}
		seen[n] = true
	}
	return false
}`,
    typescript: `function containsDuplicate(nums: number[]): boolean {
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}`,
  },
  "p-maximum-subarray": {
    java: `class Solution {
    public int maxSubArray(int[] nums) {
        int cur = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            cur = Math.max(nums[i], cur + nums[i]);
            best = Math.max(best, cur);
        }
        return best;
    }
}`,
    cpp: `class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int cur = nums[0], best = nums[0];
        for (size_t i = 1; i < nums.size(); i++) {
            cur = max(nums[i], cur + nums[i]);
            best = max(best, cur);
        }
        return best;
    }
};`,
    go: `func maxSubArray(nums []int) int {
	cur, best := nums[0], nums[0]
	for _, x := range nums[1:] {
		if cur+x > x {
			cur += x
		} else {
			cur = x
		}
		if cur > best {
			best = cur
		}
	}
	return best
}`,
    typescript: `function maxSubArray(nums: number[]): number {
  let cur = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}`,
  },
  "p-maximum-product-subarray": {
    java: `class Solution {
    public int maxProduct(int[] nums) {
        int hi = nums[0], lo = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            int x = nums[i], a = x * hi, b = x * lo;
            hi = Math.max(x, Math.max(a, b));
            lo = Math.min(x, Math.min(a, b));
            best = Math.max(best, hi);
        }
        return best;
    }
}`,
    cpp: `class Solution {
public:
    int maxProduct(vector<int>& nums) {
        int hi = nums[0], lo = nums[0], best = nums[0];
        for (size_t i = 1; i < nums.size(); i++) {
            int x = nums[i], a = x * hi, b = x * lo;
            hi = max({x, a, b});
            lo = min({x, a, b});
            best = max(best, hi);
        }
        return best;
    }
};`,
    go: `func maxProduct(nums []int) int {
	hi, lo, best := nums[0], nums[0], nums[0]
	for _, x := range nums[1:] {
		a, b := x*hi, x*lo
		hi = max(x, a, b)
		lo = min(x, a, b)
		if hi > best {
			best = hi
		}
	}
	return best
}`,
    typescript: `function maxProduct(nums: number[]): number {
  let hi = nums[0];
  let lo = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const x = nums[i];
    const a = x * hi;
    const b = x * lo;
    hi = Math.max(x, a, b);
    lo = Math.min(x, a, b);
    best = Math.max(best, hi);
  }
  return best;
}`,
  },
  "p-sum-of-two-integers": {
    java: `class Solution {
    public int getSum(int a, int b) {
        while (b != 0) {
            int carry = (a & b) << 1;
            a ^= b;
            b = carry;
        }
        return a;
    }
}`,
    cpp: `class Solution {
public:
    int getSum(int a, int b) {
        while (b != 0) {
            unsigned carry = static_cast<unsigned>(a & b) << 1;
            a ^= b;
            b = static_cast<int>(carry);
        }
        return a;
    }
};`,
    go: `func getSum(a int, b int) int {
	x, y := int32(a), int32(b)
	for y != 0 {
		carry := (x & y) << 1
		x ^= y
		y = carry
	}
	return int(x)
}`,
    typescript: `function getSum(a: number, b: number): number {
  while (b !== 0) {
    const carry = (a & b) << 1;
    a ^= b;
    b = carry;
  }
  return a;
}`,
  },
  "p-number-of-1-bits": {
    java: `class Solution {
    public int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1;
            count++;
        }
        return count;
    }
}`,
    cpp: `class Solution {
public:
    int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1;
            count++;
        }
        return count;
    }
};`,
    go: `func hammingWeight(n int) int {
	count := 0
	for n != 0 {
		n &= n - 1
		count++
	}
	return count
}`,
    typescript: `function hammingWeight(n: number): number {
  let count = 0;
  while (n !== 0) {
    n &= n - 1;
    count++;
  }
  return count;
}`,
  },
  "p-counting-bits": {
    java: `class Solution {
    public int[] countBits(int n) {
        int[] bits = new int[n + 1];
        for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
        return bits;
    }
}`,
    cpp: `class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> bits(n + 1, 0);
        for (int i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
        return bits;
    }
};`,
    go: `func countBits(n int) []int {
	bits := make([]int, n+1)
	for i := 1; i <= n; i++ {
		bits[i] = bits[i>>1] + i&1
	}
	return bits
}`,
    typescript: `function countBits(n: number): number[] {
  const bits: number[] = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
  return bits;
}`,
  },
  "p-missing-number": {
    java: `class Solution {
    public int missingNumber(int[] nums) {
        int missing = nums.length;
        for (int i = 0; i < nums.length; i++) missing ^= i ^ nums[i];
        return missing;
    }
}`,
    cpp: `class Solution {
public:
    int missingNumber(vector<int>& nums) {
        int missing = static_cast<int>(nums.size());
        for (int i = 0; i < static_cast<int>(nums.size()); i++) missing ^= i ^ nums[i];
        return missing;
    }
};`,
    go: `func missingNumber(nums []int) int {
	missing := len(nums)
	for i, x := range nums {
		missing ^= i ^ x
	}
	return missing
}`,
    typescript: `function missingNumber(nums: number[]): number {
  let missing = nums.length;
  for (let i = 0; i < nums.length; i++) missing ^= i ^ nums[i];
  return missing;
}`,
  },
  "p-reverse-bits": {
    java: `class Solution {
    public long reverseBits(long n) {
        long result = 0;
        for (int i = 0; i < 32; i++) {
            result = (result << 1) | (n & 1);
            n >>= 1;
        }
        return result;
    }
}`,
    cpp: `class Solution {
public:
    long long reverseBits(long long n) {
        long long result = 0;
        for (int i = 0; i < 32; i++) {
            result = (result << 1) | (n & 1);
            n >>= 1;
        }
        return result;
    }
};`,
    go: `func reverseBits(n int64) int64 {
	var result int64
	for i := 0; i < 32; i++ {
		result = result<<1 | n&1
		n >>= 1
	}
	return result
}`,
    typescript: `function reverseBits(n: number): number {
  let result = 0;
  for (let i = 0; i < 32; i++) {
    result = ((result << 1) | (n & 1)) >>> 0;
    n >>>= 1;
  }
  return result;
}`,
  },
  "p-longest-consecutive-sequence": {
    java: `class Solution {
    public int longestConsecutive(int[] nums) {
        Set<Integer> set = new HashSet<>();
        for (int n : nums) set.add(n);
        int best = 0;
        for (int x : set) {
            if (set.contains(x - 1)) continue;
            int length = 1;
            while (set.contains(x + length)) length++;
            best = Math.max(best, length);
        }
        return best;
    }
}`,
    cpp: `class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        unordered_set<int> values(nums.begin(), nums.end());
        int best = 0;
        for (int x : values) {
            if (values.count(x - 1)) continue;
            int length = 1;
            while (values.count(x + length)) length++;
            best = max(best, length);
        }
        return best;
    }
};`,
    go: `func longestConsecutive(nums []int) int {
	values := make(map[int]bool, len(nums))
	for _, n := range nums {
		values[n] = true
	}
	best := 0
	for x := range values {
		if values[x-1] {
			continue
		}
		length := 1
		for values[x+length] {
			length++
		}
		if length > best {
			best = length
		}
	}
	return best
}`,
    typescript: `function longestConsecutive(nums: number[]): number {
  const values = new Set(nums);
  let best = 0;
  for (const x of values) {
    if (values.has(x - 1)) continue;
    let length = 1;
    while (values.has(x + length)) length++;
    best = Math.max(best, length);
  }
  return best;
}`,
  },
  "p-jump-game": {
    java: `class Solution {
    public boolean canJump(int[] nums) {
        int farthest = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i > farthest) return false;
            farthest = Math.max(farthest, i + nums[i]);
        }
        return true;
    }
}`,
    cpp: `class Solution {
public:
    bool canJump(vector<int>& nums) {
        int farthest = 0;
        for (int i = 0; i < static_cast<int>(nums.size()); i++) {
            if (i > farthest) return false;
            farthest = max(farthest, i + nums[i]);
        }
        return true;
    }
};`,
    go: `func canJump(nums []int) bool {
	farthest := 0
	for i, jump := range nums {
		if i > farthest {
			return false
		}
		if i+jump > farthest {
			farthest = i + jump
		}
	}
	return true
}`,
    typescript: `function canJump(nums: number[]): boolean {
  let farthest = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;
    farthest = Math.max(farthest, i + nums[i]);
  }
  return true;
}`,
  },
};
