import type { NativeLanguage } from "../judge/native";
import type { Problem } from "./types";

// ---------------------------------------------------------------- hand-written native starters

/** Encode and Decode Strings: the judge adapter below the stubs, per language. */
const CODEC_ADAPTERS: Record<NativeLanguage, string> = {
  java: `class Solution {
    // Judge adapter: round-trips the list through your Codec. No need to edit below.
    public String[] roundTrip(String[] strs) {
        Codec codec = new Codec();
        String encoded = codec.encode(new ArrayList<>(Arrays.asList(strs)));
        if (encoded == null) throw new IllegalStateException("encode must return a string");
        return codec.decode(encoded).toArray(new String[0]);
    }
}
`,
  cpp: `class Solution {
public:
    // Judge adapter: round-trips the list through your Codec. No need to edit below.
    vector<string> roundTrip(vector<string>& strs) {
        Codec codec;
        vector<string> copy = strs;
        string encoded = codec.encode(copy);
        return codec.decode(encoded);
    }
};
`,
  go: `// Judge adapter: round-trips the list through your Codec. No need to edit below.
func roundTrip(strs []string) []string {
	codec := &Codec{}
	copied := append([]string{}, strs...)
	return codec.Decode(codec.Encode(copied))
}
`,
  typescript: `// Judge adapter: round-trips the list through encode and decode. No need to edit below.
function roundTrip(strs: string[]): string[] {
  const encoded: unknown = encode([...strs]);
  if (typeof encoded !== "string") throw new TypeError("encode must return a string");
  return decode(encoded);
}
`,
};

const CODEC_STUBS: Record<NativeLanguage, string> = {
  java: `class Codec {
    // Encodes a list of strings to a single string.
    public String encode(List<String> strs) {
        // Your code here
        return "";
    }

    // Decodes a single string to a list of strings.
    public List<String> decode(String s) {
        // Your code here
        return new ArrayList<>();
    }
}

`,
  cpp: `class Codec {
public:
    // Encodes a list of strings to a single string.
    string encode(vector<string>& strs) {
        // Your code here
        return "";
    }

    // Decodes a single string to a list of strings.
    vector<string> decode(string s) {
        // Your code here
        return {};
    }
};

`,
  go: `type Codec struct {
}

// Encode turns a list of strings into a single string.
func (c *Codec) Encode(strs []string) string {
	// Your code here
	return ""
}

// Decode turns the encoded string back into the list.
func (c *Codec) Decode(s string) []string {
	// Your code here
	return nil
}

`,
  typescript: `/** Encodes a list of strings to a single string. */
function encode(strs: string[]): string {
  // Your code here
  return "";
}

/** Decodes a single string to a list of strings. */
function decode(s: string): string[] {
  // Your code here
  return [];
}

`,
};

const CODEC_STARTERS: Record<NativeLanguage, string> = {
  java: CODEC_STUBS.java + CODEC_ADAPTERS.java,
  cpp: CODEC_STUBS.cpp + CODEC_ADAPTERS.cpp,
  go: CODEC_STUBS.go + CODEC_ADAPTERS.go,
  typescript: CODEC_STUBS.typescript + CODEC_ADAPTERS.typescript,
};

/** Starters for the "modify in place, then return the matrix" problems. */
function inPlaceStarters(fn: string): Record<NativeLanguage, string> {
  return {
    java: `class Solution {
    // Modify matrix in place, then return it.
    public int[][] ${fn}(int[][] matrix) {
        // Your code here
        return matrix;
    }
}
`,
    cpp: `class Solution {
public:
    // Modify matrix in place, then return it.
    vector<vector<int>> ${fn}(vector<vector<int>>& matrix) {
        // Your code here
        return matrix;
    }
};
`,
    go: `// Modify matrix in place, then return it.
func ${fn}(matrix [][]int) [][]int {
\t// Your code here
\treturn matrix
}
`,
    typescript: `// Modify matrix in place, then return it.
function ${fn}(matrix: number[][]): number[][] {
  // Your code here
  return matrix;
}
`,
  };
}

const SAMPLE_BOARD = [
  ["A", "B", "C", "E"],
  ["S", "F", "C", "S"],
  ["A", "D", "E", "E"],
];

/** Blind 75 batch F. */
export const PROBLEMS_F: Problem[] = [
  // ---------------------------------------------------------------- valid anagram
  {
    id: "p-valid-anagram",
    title: "Valid Anagram",
    leetcodeSlug: "valid-anagram",
    difficulty: "easy",
    tags: ["hashing", "string", "sorting"],
    statement: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

An **anagram** is a word formed by rearranging the letters of another word, using every original letter exactly once.`,
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: "true" },
      { input: 's = "rat", t = "car"', output: "false" },
    ],
    constraints: ["1 <= s.length, t.length <= 5 * 10^4", "s and t consist of lowercase English letters."],
    stages: {
      invariant: {
        prompt:
          "🔤 Valid Anagram: what quick check comes first, and what single count structure then proves s and t are anagrams? Give the complexity. Reply in 1-2 sentences.",
        answerKey:
          "First return false if the lengths differ. Then count each character of s up and each character of t down in one frequency map (or a 26-slot array); they are anagrams exactly when every count ends at zero, O(n) time and O(1) space for a fixed alphabet.",
        keyPoints: [
          {
            label: "Different lengths can't be anagrams",
            anyOf: ["lengths differ", "different lengths", "length check", "compare lengths", "compare the lengths", "same length"],
          },
          {
            label: "One frequency count (map or 26-slot array)",
            anyOf: ["frequency map", "frequency", "count each character", "character counts", "26-slot", "26 slot", "counter", "count array"],
          },
          {
            label: "Every count ends at zero",
            anyOf: ["ends at zero", "every count", "all zero", "back to zero", "counts match", "same counts", "all counts are zero"],
          },
          {
            label: "O(n)",
            anyOf: ["o(n)", "linear"],
          },
        ],
        hint: "Anagrams use the same letters the same number of times. What can you tally in one pass over s and one pass over t?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: s = \"ab\", t = \"a\". Your code counts s, then checks each char of t still has a count above 0. What does it return, and what check fixes it? Reply in 1-2 sentences.",
        answerKey:
          "It returns true, which is wrong, because every character of t was found but the leftover b in s was never checked. Compare the lengths first (or confirm every count is zero at the end), so the answer becomes false.",
        keyPoints: [
          {
            label: "It wrongly returns true",
            anyOf: ["returns true", "return true", "wrongly true", "says true", "gives true"],
          },
          {
            label: "The leftover character in s is never checked",
            anyOf: ["leftover", "left over", "never checked", "extra character", "extra b", "unused b", "b is never"],
          },
          {
            label: "Fix: compare lengths first or require all counts zero",
            anyOf: ["compare the lengths", "compare lengths", "length check", "lengths first", "every count is zero", "all counts zero", "all counts are zero"],
          },
        ],
        hint: "Every character of t is present in s. Is anything in s left unaccounted for?",
      },
      code: {
        functionName: "isAnagram",
        params: ["s", "t"],
        signature: { params: ["string", "string"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
function isAnagram(s, t) {
  // Your code here
  return false;
}
`,
          python: `def isAnagram(s: str, t: str) -> bool:
    # Your code here
    return False
`,
        },
        reference: {
          javascript: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (const ch of t) {
    const left = counts.get(ch) ?? 0;
    if (left === 0) return false;
    counts.set(ch, left - 1);
  }
  return true;
}
`,
          python: `from collections import Counter


def isAnagram(s: str, t: str) -> bool:
    return len(s) == len(t) and Counter(s) == Counter(t)
`,
        },
        tests: [
          { args: ["anagram", "nagaram"], expected: true },
          { args: ["rat", "car"], expected: false },
          { args: ["a", "ab"], expected: false },
          { args: ["ab", "a"], expected: false },
          { args: ["listen", "silent"], expected: true },
          { args: ["aacc", "ccac"], expected: false },
          { args: ["aabbcc", "abcabc"], expected: true, hidden: true },
          { args: ["abcd", "abce"], expected: false, hidden: true },
          { args: ["x", "x"], expected: true, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["hashing", "string"],
    relatedCardIds: ["mc-group-anagrams-key", "mc-two-sum-hash-map"],
  },

  // ---------------------------------------------------------------- group anagrams
  {
    id: "p-group-anagrams",
    title: "Group Anagrams",
    leetcodeSlug: "group-anagrams",
    difficulty: "medium",
    tags: ["hashing", "string", "sorting"],
    statement: `Given an array of strings \`strs\`, group the **anagrams** together. You can return the answer in any order, and the words inside each group in any order.

An anagram is a word formed by rearranging the letters of another word, using every original letter exactly once.`,
    examples: [
      {
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
      },
      { input: 'strs = [""]', output: '[[""]]' },
      { input: 'strs = ["a"]', output: '[["a"]]' },
    ],
    constraints: ["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100", "strs[i] consists of lowercase English letters."],
    stages: {
      invariant: {
        prompt:
          "🗂️ Group Anagrams: what key do you hash each word by so all anagrams land in the same bucket, and what does it cost? Reply in 1-2 sentences.",
        answerKey:
          "Key each word by its sorted letters (or a 26-count signature), since anagrams share exactly the same multiset of letters, and append the word to that key's list in a hash map; O(n * k log k) with sorting or O(n * k) with counts.",
        keyPoints: [
          {
            label: "Key: sorted letters or a letter-count signature",
            anyOf: ["sorted letters", "sort the letters", "sorted string", "sorted word", "sort each word", "26-count", "count signature", "letter counts", "character counts"],
          },
          {
            label: "Anagrams share the same multiset of letters",
            anyOf: ["same multiset", "same letters", "same characters", "same counts", "identical letters"],
          },
          {
            label: "Bucket words in a hash map",
            anyOf: ["hash map", "hashmap", "dictionary", "dict", "map from key", "bucket"],
          },
          {
            label: "O(n * k log k) or O(n * k)",
            anyOf: ["k log k", "n * k", "nk", "n*k"],
          },
        ],
        hint: "Two words are anagrams exactly when some normalized form of them is identical. What normal form can you compute per word?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: you key words by the sum of their character codes. Why do \"ad\" and \"bc\" break this, and what key is safe? Reply in 1-2 sentences.",
        answerKey:
          "The code of a plus d equals b plus c, so the sums collide and two non-anagrams land in the same bucket; a sum forgets which letters were used. Use the sorted string, or the full 26-count tuple joined with a separator, as the key.",
        keyPoints: [
          {
            label: "The sums collide",
            anyOf: ["collide", "collision", "same sum", "equal sums", "sums are equal", "equals b plus c"],
          },
          {
            label: "Non-anagrams share a bucket",
            anyOf: ["non-anagrams", "same bucket", "share a bucket", "grouped together", "wrong group"],
          },
          {
            label: "Safe key: sorted string or full count tuple",
            anyOf: ["sorted string", "sorted letters", "26-count", "count tuple", "full count", "letter counts"],
          },
        ],
        hint: "Compute the code sums for ad and bc. Does a sum remember which letters produced it?",
      },
      code: {
        functionName: "groupAnagrams",
        params: ["strs"],
        signature: { params: ["string[]"], returns: "list<list<string>>" },
        starter: {
          javascript: `/**
 * @param {string[]} strs
 * @return {string[][]}
 */
function groupAnagrams(strs) {
  // Your code here
  return [];
}
`,
          python: `def groupAnagrams(strs: List[str]) -> List[List[str]]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function groupAnagrams(strs) {
  const groups = new Map();
  for (const word of strs) {
    const key = word.split("").sort().join("");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()];
}
`,
          python: `from collections import defaultdict
from typing import List


def groupAnagrams(strs: List[str]) -> List[List[str]]:
    groups = defaultdict(list)
    for word in strs:
        counts = [0] * 26
        for ch in word:
            counts[ord(ch) - ord("a")] += 1
        groups[tuple(counts)].append(word)
    return list(groups.values())
`,
        },
        tests: [
          {
            args: [["eat", "tea", "tan", "ate", "nat", "bat"]],
            expected: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]],
          },
          { args: [[""]], expected: [[""]] },
          { args: [["a"]], expected: [["a"]] },
          { args: [["", ""]], expected: [["", ""]] },
          { args: [["abc", "bca", "cab", "xyz"]], expected: [["abc", "bca", "cab"], ["xyz"]] },
          { args: [["ab", "ba", "abc"]], expected: [["ab", "ba"], ["abc"]] },
          { args: [["aab", "aba", "baa", "abb"]], expected: [["aab", "aba", "baa"], ["abb"]], hidden: true },
          { args: [["ad", "bc", "da"]], expected: [["ad", "da"], ["bc"]], hidden: true },
          { args: [["ddddddddddg", "dgggggggggg"]], expected: [["ddddddddddg"], ["dgggggggggg"]], hidden: true },
        ],
        compare: "unordered-nested",
      },
    },
    weakTags: ["hashing", "string"],
    relatedCardIds: ["mc-group-anagrams-key"],
  },

  // ---------------------------------------------------------------- valid palindrome
  {
    id: "p-valid-palindrome",
    title: "Valid Palindrome",
    leetcodeSlug: "valid-palindrome",
    difficulty: "easy",
    tags: ["two_pointers", "string"],
    statement: `A phrase is a **palindrome** if, after converting all uppercase letters into lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.`,
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: "true",
        explanation: '"amanaplanacanalpanama" is a palindrome.',
      },
      { input: 's = "race a car"', output: "false", explanation: '"raceacar" is not a palindrome.' },
      { input: 's = " "', output: "true", explanation: "After cleaning, s is empty, which reads the same both ways." },
    ],
    constraints: ["1 <= s.length <= 2 * 10^5", "s consists only of printable ASCII characters."],
    stages: {
      invariant: {
        prompt:
          "🪞 Valid Palindrome: describe the two-pointer loop that checks it without building a cleaned copy. What do you skip, and how do you compare? Reply in 1-2 sentences.",
        answerKey:
          "Put left at the start and right at the end; advance each pointer past non-alphanumeric characters, then compare the two characters case-insensitively and return false on a mismatch, moving both inward until they meet. That is O(n) time and O(1) extra space.",
        keyPoints: [
          {
            label: "Pointers at both ends moving inward",
            anyOf: ["left at the start", "right at the end", "both ends", "inward", "two pointers", "toward each other"],
          },
          {
            label: "Skip non-alphanumeric characters",
            anyOf: ["non-alphanumeric", "not alphanumeric", "skip", "past non", "isalnum"],
          },
          {
            label: "Compare case-insensitively",
            anyOf: ["case-insensitively", "case-insensitive", "case insensitive", "lowercase", "lower case", "ignore case", "ignoring case"],
          },
          {
            label: "O(1) extra space",
            anyOf: ["o(1)", "constant space", "constant extra", "no extra space"],
          },
        ],
        hint: "Compare the outermost valid characters first. What should each pointer do when it lands on punctuation or a space?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: s = \"0P\". A solution keeps letters only, lowercases, and compares. What does it return, and what is the right answer? Reply in 1-2 sentences.",
        answerKey:
          "Digits are alphanumeric and must be kept, so the cleaned string is 0p and the right answer is false; keeping letters only drops the 0 and wrongly returns true. Use an isalnum check, letters and digits.",
        keyPoints: [
          {
            label: "The right answer is false",
            anyOf: ["answer is false", "is false", "false"],
          },
          {
            label: "Digits are alphanumeric and must be kept",
            anyOf: ["digits are alphanumeric", "letters and digits", "must be kept", "keep the 0", "digits count", "isalnum"],
          },
          {
            label: "Letters-only drops the 0 and returns true",
            anyOf: ["drops the 0", "wrongly returns true", "returns true", "letters only", "isalpha"],
          },
        ],
        hint: "Is 0 alphanumeric? Write out the cleaned string both ways.",
      },
      code: {
        functionName: "isPalindrome",
        params: ["s"],
        signature: { params: ["string"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isPalindrome(s) {
  // Your code here
  return false;
}
`,
          python: `def isPalindrome(s: str) -> bool:
    # Your code here
    return False
`,
        },
        reference: {
          javascript: `function isPalindrome(s) {
  const ok = (ch) => /[a-z0-9]/i.test(ch);
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (!ok(s[left])) {
      left++;
    } else if (!ok(s[right])) {
      right--;
    } else {
      if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
      left++;
      right--;
    }
  }
  return true;
}
`,
          python: `def isPalindrome(s: str) -> bool:
    left, right = 0, len(s) - 1
    while left < right:
        if not s[left].isalnum():
            left += 1
        elif not s[right].isalnum():
            right -= 1
        else:
            if s[left].lower() != s[right].lower():
                return False
            left += 1
            right -= 1
    return True
`,
        },
        tests: [
          { args: ["A man, a plan, a canal: Panama"], expected: true },
          { args: ["race a car"], expected: false },
          { args: [" "], expected: true },
          { args: ["0P"], expected: false },
          { args: ["ab_a"], expected: true },
          { args: ["Madam, I'm Adam"], expected: true },
          { args: [".,"], expected: true, hidden: true },
          { args: ["12321"], expected: true, hidden: true },
          { args: ["1a2"], expected: false, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["two_pointers", "string"],
    relatedCardIds: ["mc-palindrome-expand-center", "mc-two-pointers-sorted-two-sum"],
  },

  // ---------------------------------------------------------------- encode and decode strings
  {
    id: "p-encode-and-decode-strings",
    title: "Encode and Decode Strings",
    leetcodeSlug: "encode-and-decode-strings",
    difficulty: "medium",
    tags: ["string", "design"],
    statement: `Design an algorithm to encode a **list of strings** into a **single string**, and decode that string back into the original list.

Implement \`encode(strs)\`, which returns one string, and \`decode(s)\`, which returns the list of strings. The strings may contain **any** ASCII characters, including any delimiter you might pick, so the encoding must be unambiguous. Do not use serialization helpers such as \`JSON.stringify\` or \`eval\`.

**Judge note:** The judge calls the starter's \`roundTrip(strs)\` adapter, which checks that \`encode\` returned a string and returns \`decode(encode(strs))\`. The result must equal the input list.`,
    examples: [
      {
        input: 'strs = ["lint","code","love","you"]',
        output: '["lint","code","love","you"]',
        explanation: 'One possible encoding is "4#lint4#code4#love3#you".',
      },
      { input: 'strs = ["we","say",":","yes"]', output: '["we","say",":","yes"]' },
      { input: 'strs = ["#","3#abc",""]', output: '["#","3#abc",""]', explanation: "Delimiters, digits, and empty strings must survive." },
    ],
    constraints: ["0 <= strs.length <= 200", "0 <= strs[i].length <= 200", "strs[i] contains any of the 256 valid ASCII characters."],
    stages: {
      invariant: {
        prompt:
          "📦 Encode and Decode Strings: how do you pack a list of strings into one string so any characters, even your delimiter, decode unambiguously? Reply in 1-2 sentences.",
        answerKey:
          "Length-prefix each string: write its length, a # separator, then the raw characters. To decode, read digits up to the #, parse the length, and take exactly that many characters, so a # or digits inside a string are never scanned as separators; O(total length).",
        keyPoints: [
          {
            label: "Prefix each string with its length",
            anyOf: ["length-prefix", "length prefix", "its length", "prefix the length", "write the length"],
          },
          {
            label: "A separator ends the length",
            anyOf: ["separator", "up to the #", "delimiter", "then a #"],
          },
          {
            label: "Decode by taking exactly that many characters",
            anyOf: ["exactly that many", "take exactly", "next n characters", "slice", "that many characters"],
          },
          {
            label: "Characters inside a string are never parsed as separators",
            anyOf: ["never scanned", "never parsed", "never treated", "any characters", "inside a string"],
          },
        ],
        hint: "If the decoder knows how long the next string is before reading it, does it ever need to look for a delimiter inside it?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: you join with \"#\" and split on \"#\". What does [\"a#b\", \"\"] decode to, and what encoding fixes it? Reply in 1-2 sentences.",
        answerKey:
          "Joining gives a#b#, which splits into a, b and an empty string, three strings instead of two, because a delimiter inside a string is ambiguous. Prefix each string with its length and a #, like 3#a#b0#, and read exactly that many characters.",
        keyPoints: [
          {
            label: "It splits into three strings",
            anyOf: ["three strings", "3 strings", "splits into", "wrong number"],
          },
          {
            label: "A delimiter inside a string is ambiguous",
            anyOf: ["ambiguous", "delimiter inside", "inside a string"],
          },
          {
            label: "Fix: length prefix",
            anyOf: ["its length", "length prefix", "length-prefix", "3#a#b0#", "exactly that many"],
          },
        ],
        hint: "Write out the joined string, then split it. How many pieces come back?",
      },
      code: {
        functionName: "roundTrip",
        params: ["strs"],
        signature: { params: ["string[]"], returns: "string[]" },
        nativeStarters: CODEC_STARTERS,
        starter: {
          javascript: `/**
 * Encodes a list of strings to a single string.
 * @param {string[]} strs
 * @return {string}
 */
function encode(strs) {
  // Your code here
  return "";
}

/**
 * Decodes a single string to a list of strings.
 * @param {string} s
 * @return {string[]}
 */
function decode(s) {
  // Your code here
  return [];
}

// Judge adapter: round-trips the list through encode and decode. No need to edit below.
function roundTrip(strs) {
  const encoded = encode([...strs]);
  if (typeof encoded !== "string") throw new TypeError("encode must return a string");
  return decode(encoded);
}
`,
          python: `def encode(strs: List[str]) -> str:
    """Encodes a list of strings to a single string."""
    # Your code here
    return ""


def decode(s: str) -> List[str]:
    """Decodes a single string to a list of strings."""
    # Your code here
    return []


# Judge adapter: round-trips the list through encode and decode. No need to edit below.
def roundTrip(strs: List[str]) -> List[str]:
    encoded = encode(list(strs))
    if not isinstance(encoded, str):
        raise TypeError("encode must return a string")
    return decode(encoded)
`,
        },
        reference: {
          javascript: `function encode(strs) {
  return strs.map((word) => word.length + "#" + word).join("");
}

function decode(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const hash = s.indexOf("#", i);
    const length = Number(s.slice(i, hash));
    out.push(s.slice(hash + 1, hash + 1 + length));
    i = hash + 1 + length;
  }
  return out;
}

function roundTrip(strs) {
  const encoded = encode([...strs]);
  if (typeof encoded !== "string") throw new TypeError("encode must return a string");
  return decode(encoded);
}
`,
          python: `from typing import List


def encode(strs: List[str]) -> str:
    return "".join(f"{len(word)}#{word}" for word in strs)


def decode(s: str) -> List[str]:
    out = []
    i = 0
    while i < len(s):
        hash_at = s.index("#", i)
        length = int(s[i:hash_at])
        out.append(s[hash_at + 1 : hash_at + 1 + length])
        i = hash_at + 1 + length
    return out


def roundTrip(strs: List[str]) -> List[str]:
    encoded = encode(list(strs))
    if not isinstance(encoded, str):
        raise TypeError("encode must return a string")
    return decode(encoded)
`,
        },
        tests: [
          { args: [["lint", "code", "love", "you"]], expected: ["lint", "code", "love", "you"] },
          { args: [["we", "say", ":", "yes"]], expected: ["we", "say", ":", "yes"] },
          { args: [[]], expected: [] },
          { args: [[""]], expected: [""] },
          { args: [["", ""]], expected: ["", ""] },
          { args: [["#", "##", "3#abc"]], expected: ["#", "##", "3#abc"] },
          { args: [["12#hello", "", "4#"]], expected: ["12#hello", "", "4#"] },
          { args: [["a#b#c", "#1", "10#"]], expected: ["a#b#c", "#1", "10#"], hidden: true },
          {
            args: [["0123456789#0123456789", "x", "abcdefghijklmnopqrstuvwxyz"]],
            expected: ["0123456789#0123456789", "x", "abcdefghijklmnopqrstuvwxyz"],
            hidden: true,
          },
          { args: [[" ", "  x ", "a/b", ":;,"]], expected: [" ", "  x ", "a/b", ":;,"], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["string", "design"],
    relatedCardIds: ["mc-string-concat-quadratic"],
  },

  // ---------------------------------------------------------------- insert interval
  {
    id: "p-insert-interval",
    title: "Insert Interval",
    leetcodeSlug: "insert-interval",
    difficulty: "medium",
    tags: ["intervals", "arrays"],
    statement: `You are given an array of non-overlapping intervals \`intervals\` where \`intervals[i] = [start_i, end_i]\`, sorted in ascending order by \`start_i\`, and an interval \`newInterval = [start, end]\`.

Insert \`newInterval\` into \`intervals\` so that the result is still sorted by start and has no overlapping intervals (merge overlapping intervals if necessary). Intervals that touch, such as \`[1,5]\` and \`[5,7]\`, overlap. Return the resulting array.`,
    examples: [
      { input: "intervals = [[1,3],[6,9]], newInterval = [2,5]", output: "[[1,5],[6,9]]" },
      {
        input: "intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]",
        output: "[[1,2],[3,10],[12,16]]",
        explanation: "[4,8] overlaps [3,5], [6,7] and [8,10].",
      },
    ],
    constraints: [
      "0 <= intervals.length <= 10^4",
      "intervals[i].length == 2",
      "0 <= start_i <= end_i <= 10^5",
      "intervals is sorted by start_i in ascending order.",
      "newInterval.length == 2",
      "0 <= start <= end <= 10^5",
    ],
    stages: {
      invariant: {
        prompt:
          "📥 Insert Interval: the list is sorted and non-overlapping. Describe the three phases of the single pass and the merge update. Give the complexity. Reply in 1-2 sentences.",
        answerKey:
          "Copy every interval that ends before the new one starts, then merge every interval that overlaps it by taking the min of the starts and the max of the ends, then append the merged interval and copy the rest. One pass, O(n).",
        keyPoints: [
          {
            label: "Copy intervals that end before the new one starts",
            anyOf: ["ends before", "end before", "entirely before", "to the left", "before the new one"],
          },
          {
            label: "Merge overlaps with min start and max end",
            anyOf: ["min of the starts", "max of the ends", "min start", "max end", "min and max", "minimum start", "maximum end"],
          },
          {
            label: "Append the merged interval, then the rest",
            anyOf: ["copy the rest", "append the rest", "the rest", "remaining", "after it"],
          },
          {
            label: "O(n) single pass",
            anyOf: ["o(n)", "one pass", "single pass", "linear"],
          },
        ],
        hint: "Relative to the new interval, every existing one is either fully left of it, overlapping it, or fully right of it. In which order do those groups appear?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: intervals = [[1,5]], newInterval = [5,7]. Do they merge, and which comparison decides it? Reply in 1-2 sentences.",
        answerKey:
          "Yes, they merge into [1,7], because touching intervals overlap: an interval overlaps when its start <= the new end and its end >= the new start. Using a strict comparison would wrongly keep [1,5] and [5,7] apart.",
        keyPoints: [
          {
            label: "They merge into [1,7]",
            anyOf: ["[1,7]", "they merge", "yes, they merge", "do merge"],
          },
          {
            label: "Inclusive overlap test",
            anyOf: ["start <= the new end", "end >= the new start", "touching intervals overlap", "inclusive", "<=", ">="],
          },
          {
            label: "A strict comparison keeps them apart",
            anyOf: ["strict", "keep [1,5] and [5,7] apart", "apart"],
          },
        ],
        hint: "Does an interval ending at 5 share a point with one starting at 5?",
      },
      code: {
        functionName: "insert",
        params: ["intervals", "newInterval"],
        signature: { params: ["int[][]", "int[]"], returns: "int[][]" },
        starter: {
          javascript: `/**
 * @param {number[][]} intervals
 * @param {number[]} newInterval
 * @return {number[][]}
 */
function insert(intervals, newInterval) {
  // Your code here
  return [];
}
`,
          python: `def insert(intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function insert(intervals, newInterval) {
  const out = [];
  let [start, end] = newInterval;
  let i = 0;
  while (i < intervals.length && intervals[i][1] < start) out.push(intervals[i++]);
  while (i < intervals.length && intervals[i][0] <= end) {
    start = Math.min(start, intervals[i][0]);
    end = Math.max(end, intervals[i][1]);
    i++;
  }
  out.push([start, end]);
  while (i < intervals.length) out.push(intervals[i++]);
  return out;
}
`,
          python: `from typing import List


def insert(intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
    out = []
    start, end = newInterval
    i = 0
    while i < len(intervals) and intervals[i][1] < start:
        out.append(intervals[i])
        i += 1
    while i < len(intervals) and intervals[i][0] <= end:
        start = min(start, intervals[i][0])
        end = max(end, intervals[i][1])
        i += 1
    out.append([start, end])
    out.extend(intervals[i:])
    return out
`,
        },
        tests: [
          { args: [[[1, 3], [6, 9]], [2, 5]], expected: [[1, 5], [6, 9]] },
          { args: [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], expected: [[1, 2], [3, 10], [12, 16]] },
          { args: [[], [5, 7]], expected: [[5, 7]] },
          { args: [[[1, 5]], [2, 3]], expected: [[1, 5]] },
          { args: [[[1, 5]], [6, 8]], expected: [[1, 5], [6, 8]] },
          { args: [[[3, 5]], [1, 2]], expected: [[1, 2], [3, 5]] },
          { args: [[[1, 5]], [5, 7]], expected: [[1, 7]], hidden: true },
          { args: [[[1, 2], [5, 6]], [3, 4]], expected: [[1, 2], [3, 4], [5, 6]], hidden: true },
          { args: [[[2, 3], [5, 7], [9, 10]], [0, 11]], expected: [[0, 11]], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["intervals"],
    relatedCardIds: ["mc-insert-interval", "mc-merge-intervals"],
  },

  // ---------------------------------------------------------------- non-overlapping intervals
  {
    id: "p-non-overlapping-intervals",
    title: "Non-overlapping Intervals",
    leetcodeSlug: "non-overlapping-intervals",
    difficulty: "medium",
    tags: ["intervals", "greedy", "sorting"],
    statement: `Given an array of intervals \`intervals\` where \`intervals[i] = [start_i, end_i]\`, return the **minimum number of intervals you need to remove** to make the rest of the intervals non-overlapping.

Intervals that only touch at a point, such as \`[1,2]\` and \`[2,3]\`, do not overlap.`,
    examples: [
      { input: "intervals = [[1,2],[2,3],[3,4],[1,3]]", output: "1", explanation: "Remove [1,3] and the rest do not overlap." },
      { input: "intervals = [[1,2],[1,2],[1,2]]", output: "2" },
      { input: "intervals = [[1,2],[2,3]]", output: "0" },
    ],
    constraints: ["1 <= intervals.length <= 10^5", "intervals[i].length == 2", "-5 * 10^4 <= start_i < end_i <= 5 * 10^4"],
    stages: {
      invariant: {
        prompt:
          "✂️ Non-overlapping Intervals: to remove the fewest intervals, what do you sort by and which interval do you keep on each conflict? Why is that greedy safe? Reply in 1-2 sentences.",
        answerKey:
          "Sort by end time and keep an interval whenever its start >= the last kept end, otherwise remove it; keeping the interval that finishes first leaves the most room for the rest, which an exchange argument proves optimal. O(n log n).",
        keyPoints: [
          {
            label: "Sort by end",
            anyOf: ["sort by end", "sorted by end", "by end time", "earliest end", "finishes first", "ends first"],
          },
          {
            label: "Keep when start >= last kept end",
            anyOf: ["start >= the last kept end", "last kept end", "last kept", ">= the last", "otherwise remove"],
          },
          {
            label: "Earliest finish leaves the most room (exchange argument)",
            anyOf: ["most room", "exchange argument", "leaves the most", "leaves more room"],
          },
          {
            label: "O(n log n)",
            anyOf: ["o(n log n)", "n log n", "nlogn"],
          },
        ],
        hint: "This is interval scheduling: maximize the intervals you keep. Which interval, among those that conflict, can never hurt you to keep?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: [[1,10],[2,3],[4,5],[6,7]]. If you sort by start and always keep the earlier interval on a conflict, how many do you remove versus the optimum? Reply in 1-2 sentences.",
        answerKey:
          "Keeping [1,10] forces removing all three short intervals, 3 removals, but the optimum is 1: drop the long [1,10]. Sort by end instead, or when sorting by start keep the interval with the smaller end on each conflict.",
        keyPoints: [
          {
            label: "Greedy-by-start removes 3",
            anyOf: ["3 removals", "all three", "removes 3", "three removals", "removing all three"],
          },
          {
            label: "The optimum is 1",
            anyOf: ["optimum is 1", "optimum is one", "only 1", "just one", "drop the long"],
          },
          {
            label: "Fix: sort by end or keep the smaller end",
            anyOf: ["sort by end", "smaller end", "earlier end", "earliest end"],
          },
        ],
        hint: "One long interval blocks three short ones. Which one should go?",
      },
      code: {
        functionName: "eraseOverlapIntervals",
        params: ["intervals"],
        signature: { params: ["int[][]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[][]} intervals
 * @return {number}
 */
function eraseOverlapIntervals(intervals) {
  // Your code here
  return 0;
}
`,
          python: `def eraseOverlapIntervals(intervals: List[List[int]]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function eraseOverlapIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  let removed = 0;
  let lastEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (start >= lastEnd) {
      lastEnd = end;
    } else {
      removed++;
    }
  }
  return removed;
}
`,
          python: `from typing import List


def eraseOverlapIntervals(intervals: List[List[int]]) -> int:
    removed = 0
    last_end = float("-inf")
    for start, end in sorted(intervals, key=lambda interval: interval[1]):
        if start >= last_end:
            last_end = end
        else:
            removed += 1
    return removed
`,
        },
        tests: [
          { args: [[[1, 2], [2, 3], [3, 4], [1, 3]]], expected: 1 },
          { args: [[[1, 2], [1, 2], [1, 2]]], expected: 2 },
          { args: [[[1, 2], [2, 3]]], expected: 0 },
          { args: [[[1, 100], [11, 22], [1, 11], [2, 12]]], expected: 2 },
          { args: [[[0, 2], [1, 3], [2, 4], [3, 5], [4, 6]]], expected: 2 },
          { args: [[[1, 2]]], expected: 0 },
          { args: [[[1, 10], [2, 3], [4, 5], [6, 7]]], expected: 1, hidden: true },
          {
            args: [[[-52, 31], [-73, -26], [82, 97], [-65, -11], [-62, -49], [95, 99], [58, 95], [-31, 49], [66, 98], [-63, 2], [30, 47], [-40, -26]]],
            expected: 7,
            hidden: true,
          },
          { args: [[[5, 8], [1, 3], [3, 5], [2, 4]]], expected: 1, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["greedy", "intervals"],
    relatedCardIds: ["mc-greedy-interval-scheduling", "mc-greedy-exchange-argument"],
  },

  // ---------------------------------------------------------------- meeting rooms
  {
    id: "p-meeting-rooms",
    title: "Meeting Rooms",
    leetcodeSlug: "meeting-rooms",
    difficulty: "easy",
    tags: ["intervals", "sorting"],
    statement: `Given an array of meeting time intervals \`intervals\` where \`intervals[i] = [start_i, end_i]\`, determine if a person could attend **all** meetings.

A meeting that ends at time \`t\` does not conflict with one that starts at time \`t\`.`,
    examples: [
      { input: "intervals = [[0,30],[5,10],[15,20]]", output: "false" },
      { input: "intervals = [[7,10],[2,4]]", output: "true" },
    ],
    constraints: ["0 <= intervals.length <= 10^4", "intervals[i].length == 2", "0 <= start_i < end_i <= 10^6"],
    stages: {
      invariant: {
        prompt:
          "📅 Meeting Rooms: how do you decide if one person can attend every meeting, and what is the single comparison after sorting? Give the complexity. Reply in 1-2 sentences.",
        answerKey:
          "Sort the meetings by start time; then only adjacent meetings can conflict, so return false if any meeting has start < previous end, otherwise true. O(n log n) for the sort.",
        keyPoints: [
          {
            label: "Sort by start",
            anyOf: ["sort the meetings by start", "sort by start", "by start time", "sorted by start"],
          },
          {
            label: "Only adjacent meetings can conflict",
            anyOf: ["only adjacent", "adjacent meetings", "neighbors", "neighbours", "consecutive"],
          },
          {
            label: "Conflict when start < previous end",
            anyOf: ["start < previous end", "start < prev end", "starts before the previous", "before the previous one ends"],
          },
          {
            label: "O(n log n)",
            anyOf: ["o(n log n)", "n log n", "nlogn"],
          },
        ],
        hint: "Once meetings are in start order, which meeting is the only one that could clash with the next?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: intervals = [[5,8],[8,10]]. Can the person attend both, and what comparison bug says no? Reply in 1-2 sentences.",
        answerKey:
          "Yes, the answer is true: a meeting ending at 8 frees the person for one starting at 8. Checking start <= previous end flags touching meetings as a conflict; the check must be strict, start < previous end.",
        keyPoints: [
          {
            label: "Yes: true",
            anyOf: ["yes", "answer is true", "true", "can attend"],
          },
          {
            label: "The bug uses <=",
            anyOf: ["start <= previous end", "start <= prev end", "<="],
          },
          {
            label: "The check must be strict",
            anyOf: ["strict", "start < previous end", "start < prev end"],
          },
        ],
        hint: "Does a meeting that ends at 8 overlap a meeting that starts at 8?",
      },
      code: {
        functionName: "canAttendMeetings",
        params: ["intervals"],
        signature: { params: ["int[][]"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {number[][]} intervals
 * @return {boolean}
 */
function canAttendMeetings(intervals) {
  // Your code here
  return false;
}
`,
          python: `def canAttendMeetings(intervals: List[List[int]]) -> bool:
    # Your code here
    return False
`,
        },
        reference: {
          javascript: `function canAttendMeetings(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] < sorted[i - 1][1]) return false;
  }
  return true;
}
`,
          python: `from typing import List


def canAttendMeetings(intervals: List[List[int]]) -> bool:
    ordered = sorted(intervals)
    return all(ordered[i][0] >= ordered[i - 1][1] for i in range(1, len(ordered)))
`,
        },
        tests: [
          { args: [[[0, 30], [5, 10], [15, 20]]], expected: false },
          { args: [[[7, 10], [2, 4]]], expected: true },
          { args: [[]], expected: true },
          { args: [[[5, 8], [8, 10]]], expected: true },
          { args: [[[1, 5]]], expected: true },
          { args: [[[1, 5], [4, 6]]], expected: false },
          { args: [[[9, 10], [1, 3], [3, 9]]], expected: true, hidden: true },
          { args: [[[1, 2], [3, 4], [2, 5]]], expected: false, hidden: true },
          { args: [[[1, 10], [2, 3]]], expected: false, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["intervals", "sorting"],
    relatedCardIds: ["mc-merge-intervals", "mc-meeting-rooms-min-heap"],
  },

  // ---------------------------------------------------------------- meeting rooms ii
  {
    id: "p-meeting-rooms-ii",
    title: "Meeting Rooms II",
    leetcodeSlug: "meeting-rooms-ii",
    difficulty: "medium",
    tags: ["intervals", "heap", "sorting", "greedy"],
    statement: `Given an array of meeting time intervals \`intervals\` where \`intervals[i] = [start_i, end_i]\`, return the **minimum number of conference rooms** required.

A room freed at time \`t\` can host a meeting that starts at time \`t\`.`,
    examples: [
      { input: "intervals = [[0,30],[5,10],[15,20]]", output: "2" },
      { input: "intervals = [[7,10],[2,4]]", output: "1" },
    ],
    constraints: ["1 <= intervals.length <= 10^4", "0 <= start_i < end_i <= 10^6"],
    stages: {
      invariant: {
        prompt:
          "🏢 Meeting Rooms II: after sorting by start, what does your min-heap hold, when do you pop before pushing, and what is the answer? Reply in 1-2 sentences.",
        answerKey:
          "Sort by start and keep a min-heap of end times for rooms in use; for each meeting, pop the earliest end if it is <= the new start because that room is free, then push the new end. The answer is the largest heap size reached, O(n log n).",
        keyPoints: [
          {
            label: "Min-heap of end times",
            anyOf: ["min-heap of end times", "heap of end times", "end times", "heap of ends"],
          },
          {
            label: "Pop the earliest end when that room is free",
            anyOf: ["pop the earliest", "earliest end", "room is free", "reuse", "frees"],
          },
          {
            label: "Answer is the largest heap size",
            anyOf: ["largest heap size", "max heap size", "heap size", "size of the heap", "max size", "final size"],
          },
          {
            label: "O(n log n)",
            anyOf: ["o(n log n)", "n log n", "nlogn"],
          },
        ],
        hint: "When a new meeting starts, the only room worth checking is the one that frees up soonest. What structure hands you that instantly?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: intervals = [[1,5],[5,10]]. Is the answer 1 or 2, and which comparison with the heap top gets it right? Reply in 1-2 sentences.",
        answerKey:
          "It is 1: the first meeting frees its room at 5, exactly when the second starts. Pop the heap top when top <= start; popping only when top < start keeps both rooms and wrongly answers 2.",
        keyPoints: [
          {
            label: "The answer is 1",
            anyOf: ["it is 1", "answer is 1", "one room", "1 room", "it's 1"],
          },
          {
            label: "Pop when top <= start",
            anyOf: ["top <= start", "end <= start", "<="],
          },
          {
            label: "A strict < wrongly needs 2 rooms",
            anyOf: ["wrongly answers 2", "top < start", "strict", "answers 2"],
          },
        ],
        hint: "At time 5 one meeting ends and another begins. Is that room free?",
      },
      code: {
        functionName: "minMeetingRooms",
        params: ["intervals"],
        signature: { params: ["int[][]"], returns: "int" },
        starter: {
          javascript: `/**
 * @param {number[][]} intervals
 * @return {number}
 */
function minMeetingRooms(intervals) {
  // Your code here
  return 0;
}
`,
          python: `def minMeetingRooms(intervals: List[List[int]]) -> int:
    # Your code here
    return 0
`,
        },
        reference: {
          javascript: `function minMeetingRooms(intervals) {
  // Sweep: sorted starts and ends; a start at or after the earliest open end reuses that room.
  const starts = intervals.map((interval) => interval[0]).sort((a, b) => a - b);
  const ends = intervals.map((interval) => interval[1]).sort((a, b) => a - b);
  let rooms = 0;
  let best = 0;
  let j = 0;
  for (const start of starts) {
    while (j < ends.length && ends[j] <= start) {
      j++;
      rooms--;
    }
    rooms++;
    best = Math.max(best, rooms);
  }
  return best;
}
`,
          python: `import heapq
from typing import List


def minMeetingRooms(intervals: List[List[int]]) -> int:
    ends = []
    for start, end in sorted(intervals):
        if ends and ends[0] <= start:
            heapq.heapreplace(ends, end)
        else:
            heapq.heappush(ends, end)
    return len(ends)
`,
        },
        tests: [
          { args: [[[0, 30], [5, 10], [15, 20]]], expected: 2 },
          { args: [[[7, 10], [2, 4]]], expected: 1 },
          { args: [[[1, 5], [5, 10]]], expected: 1 },
          { args: [[[1, 10], [2, 9], [3, 8]]], expected: 3 },
          { args: [[[1, 2]]], expected: 1 },
          { args: [[[9, 10], [4, 9], [4, 17]]], expected: 2 },
          { args: [[[1, 5], [8, 10], [2, 6], [5, 9], [6, 7]]], expected: 2, hidden: true },
          { args: [[[2, 11], [6, 16], [11, 16]]], expected: 2, hidden: true },
          { args: [[[13, 15], [1, 13]]], expected: 1, hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["heap", "intervals"],
    relatedCardIds: ["mc-meeting-rooms-min-heap", "mc-merge-intervals"],
  },

  // ---------------------------------------------------------------- set matrix zeroes
  {
    id: "p-set-matrix-zeroes",
    title: "Set Matrix Zeroes",
    leetcodeSlug: "set-matrix-zeroes",
    difficulty: "medium",
    tags: ["matrix", "arrays", "hashing"],
    statement: `Given an \`m x n\` integer matrix \`matrix\`, if an element is \`0\`, set its entire row and column to \`0\`s. You must do it **in place**.

**Follow up:** an \`O(m + n)\` space solution is easy. Can you do it with \`O(1)\` extra space?

**Judge note:** LeetCode's version returns nothing. Here, modify \`matrix\` in place and then return it; the judge checks the returned matrix.`,
    examples: [
      { input: "matrix = [[1,1,1],[1,0,1],[1,1,1]]", output: "[[1,0,1],[0,0,0],[1,0,1]]" },
      { input: "matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]", output: "[[0,0,0,0],[0,4,5,0],[0,3,1,0]]" },
    ],
    constraints: ["m == matrix.length", "n == matrix[0].length", "1 <= m, n <= 200", "-2^31 <= matrix[i][j] <= 2^31 - 1"],
    stages: {
      invariant: {
        prompt:
          "🧮 Set Matrix Zeroes: how do you get O(1) extra space, and why must the first row and column be zeroed last? Reply in 1-2 sentences.",
        answerKey:
          "Use the first row and first column as markers: for each zero at (i, j), set matrix[i][0] and matrix[0][j] to 0, and keep two flags for whether row 0 and column 0 originally had a zero. Zero the inner cells from the markers first and the first row and column last, or you would overwrite markers you still need.",
        keyPoints: [
          {
            label: "First row and column act as markers",
            anyOf: ["as markers", "markers", "marker", "first row and first column"],
          },
          {
            label: "Two flags remember row 0 and column 0",
            anyOf: ["two flags", "flags", "flag", "originally had a zero"],
          },
          {
            label: "Zero them last or the markers get overwritten",
            anyOf: ["column last", "last", "overwrite markers", "overwrite", "wipe out"],
          },
        ],
        hint: "You need one bit per row and one per column. Is there a row and a column already sitting in the matrix you could borrow?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: matrix = [[1,0],[1,1]]. Why does zeroing rows and columns as you scan, in one pass, give the wrong result? What should it be? Reply in 1-2 sentences.",
        answerKey:
          "New zeros you write look like original zeros, so they cascade: the 0 written at (1,1) wipes row 1 and the answer becomes all zeros. The correct result is [[0,0],[1,0]]; record which rows and columns to clear first, then zero them in a second pass.",
        keyPoints: [
          {
            label: "Written zeros cascade like original ones",
            anyOf: ["cascade", "new zeros", "look like original", "all zeros"],
          },
          {
            label: "Correct result [[0,0],[1,0]]",
            anyOf: ["[[0,0],[1,0]]"],
          },
          {
            label: "Record first, then zero in a second pass",
            anyOf: ["second pass", "record which rows", "record first", "then zero them"],
          },
        ],
        hint: "After you zero row 0 and column 1, look at cell (1,1). Was it a zero in the input?",
      },
      code: {
        functionName: "setZeroes",
        params: ["matrix"],
        signature: { params: ["int[][]"], returns: "int[][]" },
        nativeStarters: inPlaceStarters("setZeroes"),
        starter: {
          javascript: `/**
 * Modify matrix in place, then return it.
 * @param {number[][]} matrix
 * @return {number[][]}
 */
function setZeroes(matrix) {
  // Your code here
  return matrix;
}
`,
          python: `def setZeroes(matrix: List[List[int]]) -> List[List[int]]:
    # Modify matrix in place, then return it.
    # Your code here
    return matrix
`,
        },
        reference: {
          javascript: `function setZeroes(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const firstRow = matrix[0].some((value) => value === 0);
  const firstCol = matrix.some((row) => row[0] === 0);
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (matrix[r][c] === 0) {
        matrix[r][0] = 0;
        matrix[0][c] = 0;
      }
    }
  }
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (matrix[r][0] === 0 || matrix[0][c] === 0) matrix[r][c] = 0;
    }
  }
  if (firstRow) for (let c = 0; c < cols; c++) matrix[0][c] = 0;
  if (firstCol) for (let r = 0; r < rows; r++) matrix[r][0] = 0;
  return matrix;
}
`,
          python: `from typing import List


def setZeroes(matrix: List[List[int]]) -> List[List[int]]:
    rows, cols = len(matrix), len(matrix[0])
    zero_rows = {r for r in range(rows) for c in range(cols) if matrix[r][c] == 0}
    zero_cols = {c for r in range(rows) for c in range(cols) if matrix[r][c] == 0}
    for r in range(rows):
        for c in range(cols):
            if r in zero_rows or c in zero_cols:
                matrix[r][c] = 0
    return matrix
`,
        },
        tests: [
          { args: [[[1, 1, 1], [1, 0, 1], [1, 1, 1]]], expected: [[1, 0, 1], [0, 0, 0], [1, 0, 1]] },
          { args: [[[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]], expected: [[0, 0, 0, 0], [0, 4, 5, 0], [0, 3, 1, 0]] },
          { args: [[[1]]], expected: [[1]] },
          { args: [[[0]]], expected: [[0]] },
          { args: [[[1, 0], [1, 1]]], expected: [[0, 0], [1, 0]] },
          { args: [[[1, 0]]], expected: [[0, 0]] },
          { args: [[[1], [0], [1]]], expected: [[0], [0], [0]], hidden: true },
          {
            args: [[[1, 2, 3, 4], [5, 0, 7, 8], [0, 10, 11, 12], [13, 14, 15, 0]]],
            expected: [[0, 0, 3, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
            hidden: true,
          },
          { args: [[[1, 1, 0], [1, 1, 1], [0, 1, 1]]], expected: [[0, 0, 0], [0, 1, 0], [0, 0, 0]], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["matrix"],
    relatedCardIds: ["mc-set-matrix-zeroes-constant-space"],
  },

  // ---------------------------------------------------------------- spiral matrix
  {
    id: "p-spiral-matrix",
    title: "Spiral Matrix",
    leetcodeSlug: "spiral-matrix",
    difficulty: "medium",
    tags: ["matrix", "arrays"],
    statement: `Given an \`m x n\` matrix, return all elements of the matrix in **spiral order**: across the top row, down the right column, back along the bottom row, up the left column, and so on inward.`,
    examples: [
      { input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]", output: "[1,2,3,6,9,8,7,4,5]" },
      { input: "matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]", output: "[1,2,3,4,8,12,11,10,9,5,6,7]" },
    ],
    constraints: ["m == matrix.length", "n == matrix[i].length", "1 <= m, n <= 10", "-100 <= matrix[i][j] <= 100"],
    stages: {
      invariant: {
        prompt:
          "🌀 Spiral Matrix: what four boundaries do you track, how does each leg of the walk shrink them, and when do you stop? Reply in 1-2 sentences.",
        answerKey:
          "Track top, bottom, left and right bounds; walk the top row then move top down, the right column then move right in, the bottom row backwards then move bottom up, and the left column upwards then move left in, stopping once top passes bottom or left passes right. Each cell is visited once, O(m * n).",
        keyPoints: [
          {
            label: "Four bounds: top, bottom, left, right",
            anyOf: ["bottom, left and right", "four bounds", "four boundaries", "4 bounds", "boundaries"],
          },
          {
            label: "Each leg shrinks one bound",
            anyOf: ["move top down", "move right in", "move bottom up", "shrink", "move left in"],
          },
          {
            label: "Stop when the bounds cross",
            anyOf: ["top passes bottom", "left passes right", "cross", "bounds meet"],
          },
          {
            label: "O(m * n)",
            anyOf: ["o(m * n)", "m * n", "o(mn)", "each cell is visited once", "each cell once"],
          },
        ],
        hint: "Think of peeling the matrix like an onion. After you read the top row, which boundary is no longer valid?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: matrix = [[1,2,3]]. If you skip re-checking top <= bottom before walking the bottom row, what comes out, and what is correct? Reply in 1-2 sentences.",
        answerKey:
          "The bottom row is the same row you already walked, so it is read again backwards and you get [1,2,3,2,1]. The correct output is [1,2,3]; re-check top <= bottom (and left <= right before the left column) after each shrink.",
        keyPoints: [
          {
            label: "The row is read twice: [1,2,3,2,1]",
            anyOf: ["[1,2,3,2,1]", "read again", "same row", "duplicates", "twice"],
          },
          {
            label: "Correct output [1,2,3]",
            anyOf: ["correct output is [1,2,3]", "[1,2,3]"],
          },
          {
            label: "Re-check the bounds after each shrink",
            anyOf: ["re-check", "recheck", "check again", "check the bounds"],
          },
        ],
        hint: "With one row, after the top row and the empty right column, where is the bottom row?",
      },
      code: {
        functionName: "spiralOrder",
        params: ["matrix"],
        signature: { params: ["int[][]"], returns: "int[]" },
        starter: {
          javascript: `/**
 * @param {number[][]} matrix
 * @return {number[]}
 */
function spiralOrder(matrix) {
  // Your code here
  return [];
}
`,
          python: `def spiralOrder(matrix: List[List[int]]) -> List[int]:
    # Your code here
    return []
`,
        },
        reference: {
          javascript: `function spiralOrder(matrix) {
  const out = [];
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) out.push(matrix[r][right]);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push(matrix[r][left]);
      left++;
    }
  }
  return out;
}
`,
          python: `from typing import List


def spiralOrder(matrix: List[List[int]]) -> List[int]:
    out = []
    top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            out.append(matrix[top][c])
        top += 1
        for r in range(top, bottom + 1):
            out.append(matrix[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                out.append(matrix[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                out.append(matrix[r][left])
            left += 1
    return out
`,
        },
        tests: [
          { args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [1, 2, 3, 6, 9, 8, 7, 4, 5] },
          { args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] },
          { args: [[[1]]], expected: [1] },
          { args: [[[1, 2, 3]]], expected: [1, 2, 3] },
          { args: [[[1], [2], [3]]], expected: [1, 2, 3] },
          { args: [[[1, 2], [3, 4], [5, 6]]], expected: [1, 2, 4, 6, 5, 3] },
          { args: [[[1, 2, 3], [4, 5, 6]]], expected: [1, 2, 3, 6, 5, 4], hidden: true },
          {
            args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]],
            expected: [1, 2, 3, 4, 8, 12, 16, 15, 14, 13, 9, 5, 6, 7, 11, 10],
            hidden: true,
          },
          { args: [[[-1, 2], [3, -4]]], expected: [-1, 2, -4, 3], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["matrix"],
    relatedCardIds: ["mc-spiral-matrix-bounds"],
  },

  // ---------------------------------------------------------------- rotate image
  {
    id: "p-rotate-image",
    title: "Rotate Image",
    leetcodeSlug: "rotate-image",
    difficulty: "medium",
    tags: ["matrix", "arrays", "math"],
    statement: `You are given an \`n x n\` 2D \`matrix\` representing an image. Rotate the image by **90 degrees clockwise**.

You have to rotate the image **in place**, which means you modify the input matrix directly. Do not allocate another 2D matrix to do the rotation.

**Judge note:** LeetCode's version returns nothing. Here, rotate \`matrix\` in place and then return it; the judge checks the returned matrix.`,
    examples: [
      { input: "matrix = [[1,2,3],[4,5,6],[7,8,9]]", output: "[[7,4,1],[8,5,2],[9,6,3]]" },
      {
        input: "matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]",
        output: "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]",
      },
    ],
    constraints: ["n == matrix.length == matrix[i].length", "1 <= n <= 20", "-1000 <= matrix[i][j] <= 1000"],
    stages: {
      invariant: {
        prompt:
          "🔄 Rotate Image: how do you rotate an n x n matrix 90 degrees clockwise in place with two simple passes? Give the space cost. Reply in 1-2 sentences.",
        answerKey:
          "Transpose the matrix by swapping matrix[i][j] with matrix[j][i] for j > i, then reverse each row; together that maps (i, j) to (j, n - 1 - i), a clockwise rotation, done in place with O(1) extra space.",
        keyPoints: [
          {
            label: "Transpose",
            anyOf: ["transpose", "swap matrix[i][j] with matrix[j][i]", "swapping matrix[i][j]"],
          },
          {
            label: "Then reverse each row",
            anyOf: ["reverse each row", "reverse every row", "flip each row", "mirror each row", "reverse the row"],
          },
          {
            label: "In place, O(1) extra space",
            anyOf: ["o(1)", "in place", "constant space", "constant extra"],
          },
        ],
        hint: "A clockwise turn sends row i to column n - 1 - i. Which two cheap in-place flips compose to that?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: during the transpose you swap for every (i, j), not just j > i. What happens to the matrix, and why? Reply in 1-2 sentences.",
        answerKey:
          "Every pair gets swapped twice, once at (i, j) and again at (j, i), so the transpose undoes itself and the matrix is unchanged before the row reversal, leaving a mirror image instead of a rotation. Only swap the upper triangle, j > i.",
        keyPoints: [
          {
            label: "Each pair is swapped twice",
            anyOf: ["swapped twice", "twice", "undoes itself", "swaps back"],
          },
          {
            label: "Result: unchanged, then only mirrored",
            anyOf: ["unchanged", "mirror image", "mirrored", "just reversed"],
          },
          {
            label: "Only swap the upper triangle",
            anyOf: ["upper triangle", "j > i", "one triangle"],
          },
        ],
        hint: "Follow cell (0,1). It is swapped with (1,0), and then what happens when the loop reaches (1,0)?",
      },
      code: {
        functionName: "rotate",
        params: ["matrix"],
        signature: { params: ["int[][]"], returns: "int[][]" },
        nativeStarters: inPlaceStarters("rotate"),
        starter: {
          javascript: `/**
 * Rotate matrix in place, then return it.
 * @param {number[][]} matrix
 * @return {number[][]}
 */
function rotate(matrix) {
  // Your code here
  return matrix;
}
`,
          python: `def rotate(matrix: List[List[int]]) -> List[List[int]]:
    # Rotate matrix in place, then return it.
    # Your code here
    return matrix
`,
        },
        reference: {
          javascript: `function rotate(matrix) {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const tmp = matrix[i][j];
      matrix[i][j] = matrix[j][i];
      matrix[j][i] = tmp;
    }
  }
  for (const row of matrix) row.reverse();
  return matrix;
}
`,
          python: `from typing import List


def rotate(matrix: List[List[int]]) -> List[List[int]]:
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()
    return matrix
`,
        },
        tests: [
          { args: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [[7, 4, 1], [8, 5, 2], [9, 6, 3]] },
          {
            args: [[[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]],
            expected: [[15, 13, 2, 5], [14, 3, 4, 1], [12, 6, 8, 9], [16, 7, 10, 11]],
          },
          { args: [[[1]]], expected: [[1]] },
          { args: [[[1, 2], [3, 4]]], expected: [[3, 1], [4, 2]] },
          { args: [[[0, 0], [0, 1]]], expected: [[0, 0], [1, 0]] },
          {
            args: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]],
            expected: [[13, 9, 5, 1], [14, 10, 6, 2], [15, 11, 7, 3], [16, 12, 8, 4]],
          },
          {
            args: [[[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20], [21, 22, 23, 24, 25]]],
            expected: [[21, 16, 11, 6, 1], [22, 17, 12, 7, 2], [23, 18, 13, 8, 3], [24, 19, 14, 9, 4], [25, 20, 15, 10, 5]],
            hidden: true,
          },
          { args: [[[-1, 2], [3, -4]]], expected: [[3, -1], [-4, 2]], hidden: true },
          { args: [[[2, 2], [1, 1]]], expected: [[1, 2], [1, 2]], hidden: true },
        ],
        compare: "exact",
      },
    },
    weakTags: ["matrix"],
    relatedCardIds: ["mc-rotate-image-in-place", "mc-rotate-array-reversals"],
  },

  // ---------------------------------------------------------------- word search
  {
    id: "p-word-search",
    title: "Word Search",
    leetcodeSlug: "word-search",
    difficulty: "medium",
    tags: ["backtracking", "dfs", "matrix"],
    statement: `Given an \`m x n\` grid of characters \`board\` and a string \`word\`, return \`true\` if \`word\` exists in the grid.

The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are **horizontally or vertically** neighboring. The same cell may **not** be used more than once in a word.`,
    examples: [
      {
        input: `board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"`,
        output: "true",
      },
      { input: `board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"`, output: "true" },
      { input: `board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"`, output: "false" },
    ],
    constraints: [
      "m == board.length",
      "n == board[i].length",
      "1 <= m, n <= 6",
      "1 <= word.length <= 15",
      "board and word consist of only lowercase and uppercase English letters.",
    ],
    stages: {
      invariant: {
        prompt:
          "🔍 Word Search: describe the backtracking DFS. Where do you start, how do you stop a path from reusing a cell, and what do you undo? Reply in 1-2 sentences.",
        answerKey:
          "Start a DFS from every cell; at each step check bounds and that the cell matches the next letter, mark it visited (for example overwrite it with #), recurse into the 4 neighbors, then restore the cell when backtracking so other paths can use it. Worst case O(m * n * 3^L).",
        keyPoints: [
          {
            label: "Try a DFS from every cell",
            anyOf: ["from every cell", "every cell", "each cell", "start a dfs"],
          },
          {
            label: "Mark the cell visited on the current path",
            anyOf: ["mark it visited", "visited", "overwrite it with #", "mark the cell"],
          },
          {
            label: "Restore the cell when backtracking",
            anyOf: ["restore", "undo", "unmark", "put it back"],
          },
          {
            label: "Recurse into the 4 neighbors",
            anyOf: ["4 neighbors", "four neighbors", "neighbors", "neighbours", "4 directions", "four directions"],
          },
        ],
        hint: "The visited set only describes the current path. What must happen to a cell once the path through it has failed?",
      },
      edgeCase: {
        prompt:
          "⚠️ Trap check: board = [[\"a\",\"a\"]], word = \"aaa\". What should exist return, and what bug makes it return true? Reply in 1-2 sentences.",
        answerKey:
          "It must return false, since the board has only two cells and each cell may be used once; the bug is forgetting to mark the current cell visited, so the DFS steps back onto the first a. Mark the cell before recursing and restore it after.",
        keyPoints: [
          {
            label: "It must return false",
            anyOf: ["return false", "false"],
          },
          {
            label: "Only two cells, each usable once",
            anyOf: ["only two cells", "used once", "steps back onto", "reuse", "reuses"],
          },
          {
            label: "The bug: the current cell is never marked",
            anyOf: ["mark the current cell", "mark the cell", "forgetting to mark", "visited"],
          },
        ],
        hint: "Three letters, two cells. How could a path of length three exist unless it revisits a cell?",
      },
      code: {
        functionName: "exist",
        params: ["board", "word"],
        signature: { params: ["char[][]", "string"], returns: "bool" },
        starter: {
          javascript: `/**
 * @param {string[][]} board - each cell is a one-character string
 * @param {string} word
 * @return {boolean}
 */
function exist(board, word) {
  // Your code here
  return false;
}
`,
          python: `def exist(board: List[List[str]], word: str) -> bool:
    # Your code here
    return False
`,
        },
        reference: {
          javascript: `function exist(board, word) {
  const rows = board.length;
  const cols = board[0].length;
  const dfs = (r, c, i) => {
    if (i === word.length) return true;
    if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] !== word[i]) return false;
    const saved = board[r][c];
    board[r][c] = "#";
    const found = dfs(r + 1, c, i + 1) || dfs(r - 1, c, i + 1) || dfs(r, c + 1, i + 1) || dfs(r, c - 1, i + 1);
    board[r][c] = saved;
    return found;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0)) return true;
    }
  }
  return false;
}
`,
          python: `from typing import List


def exist(board: List[List[str]], word: str) -> bool:
    rows, cols = len(board), len(board[0])

    def dfs(r: int, c: int, i: int) -> bool:
        if i == len(word):
            return True
        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != word[i]:
            return False
        saved = board[r][c]
        board[r][c] = "#"
        found = dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1) or dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1)
        board[r][c] = saved
        return found

    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
`,
        },
        tests: [
          { args: [SAMPLE_BOARD, "ABCCED"], expected: true },
          { args: [SAMPLE_BOARD, "SEE"], expected: true },
          { args: [SAMPLE_BOARD, "ABCB"], expected: false },
          { args: [[["a"]], "a"], expected: true },
          { args: [[["a", "b"], ["c", "d"]], "abcd"], expected: false },
          { args: [[["a", "b"], ["c", "d"]], "acdb"], expected: true },
          { args: [[["a", "a"]], "aaa"], expected: false, hidden: true },
          { args: [[["C", "A", "A"], ["A", "A", "A"], ["B", "C", "D"]], "AAB"], expected: true, hidden: true },
          {
            args: [
              [
                ["A", "B", "C", "E"],
                ["S", "F", "E", "S"],
                ["A", "D", "E", "E"],
              ],
              "ABCESEEEFS",
            ],
            expected: true,
            hidden: true,
          },
        ],
        compare: "exact",
      },
    },
    weakTags: ["backtracking", "dfs"],
    relatedCardIds: ["mc-backtracking-subsets-perms-combos", "mc-trie-word-search-ii"],
  },
];

// ---------------------------------------------------------------- native references

const CODEC_IMPLS: Record<NativeLanguage, string> = {
  java: `class Codec {
    public String encode(List<String> strs) {
        StringBuilder out = new StringBuilder();
        for (String s : strs) out.append(s.length()).append('#').append(s);
        return out.toString();
    }

    public List<String> decode(String s) {
        List<String> out = new ArrayList<>();
        int i = 0;
        while (i < s.length()) {
            int hash = s.indexOf('#', i);
            int length = Integer.parseInt(s.substring(i, hash));
            out.add(s.substring(hash + 1, hash + 1 + length));
            i = hash + 1 + length;
        }
        return out;
    }
}

`,
  cpp: `class Codec {
public:
    string encode(vector<string>& strs) {
        string out;
        for (const string& s : strs) out += to_string(s.size()) + "#" + s;
        return out;
    }

    vector<string> decode(string s) {
        vector<string> out;
        size_t i = 0;
        while (i < s.size()) {
            size_t hash = s.find('#', i);
            size_t length = stoul(s.substr(i, hash - i));
            out.push_back(s.substr(hash + 1, length));
            i = hash + 1 + length;
        }
        return out;
    }
};

`,
  go: `import (
	"strconv"
	"strings"
)

type Codec struct {
}

func (c *Codec) Encode(strs []string) string {
	var b strings.Builder
	for _, s := range strs {
		b.WriteString(strconv.Itoa(len(s)))
		b.WriteByte('#')
		b.WriteString(s)
	}
	return b.String()
}

func (c *Codec) Decode(s string) []string {
	out := []string{}
	i := 0
	for i < len(s) {
		hash := i + strings.IndexByte(s[i:], '#')
		length, _ := strconv.Atoi(s[i:hash])
		out = append(out, s[hash+1:hash+1+length])
		i = hash + 1 + length
	}
	return out
}

`,
  typescript: `function encode(strs: string[]): string {
  return strs.map((word) => word.length + "#" + word).join("");
}

function decode(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const hash = s.indexOf("#", i);
    const length = Number(s.slice(i, hash));
    out.push(s.slice(hash + 1, hash + 1 + length));
    i = hash + 1 + length;
  }
  return out;
}

`,
};

/** Java / C++ / Go / TypeScript reference solutions for this batch, by problem id. */
export const NATIVE_REFERENCES_F: Record<string, Record<NativeLanguage, string>> = {
  "p-valid-anagram": {
    java: `class Solution {
    public boolean isAnagram(String s, String t) {
        if (s.length() != t.length()) return false;
        int[] counts = new int[26];
        for (int i = 0; i < s.length(); i++) {
            counts[s.charAt(i) - 'a']++;
            counts[t.charAt(i) - 'a']--;
        }
        for (int count : counts) if (count != 0) return false;
        return true;
    }
}
`,
    cpp: `class Solution {
public:
    bool isAnagram(string s, string t) {
        if (s.size() != t.size()) return false;
        int counts[26] = {0};
        for (size_t i = 0; i < s.size(); i++) {
            counts[s[i] - 'a']++;
            counts[t[i] - 'a']--;
        }
        for (int count : counts) if (count != 0) return false;
        return true;
    }
};
`,
    go: `func isAnagram(s string, t string) bool {
	if len(s) != len(t) {
		return false
	}
	var counts [26]int
	for i := 0; i < len(s); i++ {
		counts[s[i]-'a']++
		counts[t[i]-'a']--
	}
	for _, count := range counts {
		if count != 0 {
			return false
		}
	}
	return true
}
`,
    typescript: `function isAnagram(s: string, t: string): boolean {
  if (s.length !== t.length) return false;
  const counts = new Array<number>(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    counts[s.charCodeAt(i) - 97]++;
    counts[t.charCodeAt(i) - 97]--;
  }
  return counts.every((count) => count === 0);
}
`,
  },

  "p-group-anagrams": {
    java: `class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String word : strs) {
            char[] letters = word.toCharArray();
            Arrays.sort(letters);
            groups.computeIfAbsent(new String(letters), k -> new ArrayList<>()).add(word);
        }
        return new ArrayList<>(groups.values());
    }
}
`,
    cpp: `class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> groups;
        for (const string& word : strs) {
            string key = word;
            sort(key.begin(), key.end());
            groups[key].push_back(word);
        }
        vector<vector<string>> out;
        for (auto& entry : groups) out.push_back(entry.second);
        return out;
    }
};
`,
    go: `import "sort"

func groupAnagrams(strs []string) [][]string {
	groups := map[string][]string{}
	order := []string{}
	for _, word := range strs {
		letters := []byte(word)
		sort.Slice(letters, func(i, j int) bool { return letters[i] < letters[j] })
		key := string(letters)
		if _, ok := groups[key]; !ok {
			order = append(order, key)
		}
		groups[key] = append(groups[key], word)
	}
	out := make([][]string, 0, len(order))
	for _, key := range order {
		out = append(out, groups[key])
	}
	return out
}
`,
    typescript: `function groupAnagrams(strs: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const word of strs) {
    const key = word.split("").sort().join("");
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
  return [...groups.values()];
}
`,
  },

  "p-valid-palindrome": {
    java: `class Solution {
    public boolean isPalindrome(String s) {
        int left = 0, right = s.length() - 1;
        while (left < right) {
            char a = s.charAt(left), b = s.charAt(right);
            if (!Character.isLetterOrDigit(a)) left++;
            else if (!Character.isLetterOrDigit(b)) right--;
            else {
                if (Character.toLowerCase(a) != Character.toLowerCase(b)) return false;
                left++;
                right--;
            }
        }
        return true;
    }
}
`,
    cpp: `class Solution {
public:
    bool isPalindrome(string s) {
        int left = 0, right = (int) s.size() - 1;
        while (left < right) {
            unsigned char a = s[left], b = s[right];
            if (!isalnum(a)) left++;
            else if (!isalnum(b)) right--;
            else {
                if (tolower(a) != tolower(b)) return false;
                left++;
                right--;
            }
        }
        return true;
    }
};
`,
    go: `func isPalindrome(s string) bool {
	alnum := func(c byte) bool {
		return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')
	}
	lower := func(c byte) byte {
		if c >= 'A' && c <= 'Z' {
			return c + 32
		}
		return c
	}
	left, right := 0, len(s)-1
	for left < right {
		if !alnum(s[left]) {
			left++
		} else if !alnum(s[right]) {
			right--
		} else {
			if lower(s[left]) != lower(s[right]) {
				return false
			}
			left++
			right--
		}
	}
	return true
}
`,
    typescript: `function isPalindrome(s: string): boolean {
  const ok = (ch: string) => /[a-z0-9]/i.test(ch);
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (!ok(s[left])) left++;
    else if (!ok(s[right])) right--;
    else {
      if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
      left++;
      right--;
    }
  }
  return true;
}
`,
  },

  "p-encode-and-decode-strings": {
    java: CODEC_IMPLS.java + CODEC_ADAPTERS.java,
    cpp: CODEC_IMPLS.cpp + CODEC_ADAPTERS.cpp,
    go: CODEC_IMPLS.go + CODEC_ADAPTERS.go,
    typescript: CODEC_IMPLS.typescript + CODEC_ADAPTERS.typescript,
  },

  "p-insert-interval": {
    java: `class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        List<int[]> out = new ArrayList<>();
        int start = newInterval[0], end = newInterval[1], i = 0, n = intervals.length;
        while (i < n && intervals[i][1] < start) out.add(intervals[i++]);
        while (i < n && intervals[i][0] <= end) {
            start = Math.min(start, intervals[i][0]);
            end = Math.max(end, intervals[i][1]);
            i++;
        }
        out.add(new int[] {start, end});
        while (i < n) out.add(intervals[i++]);
        return out.toArray(new int[0][]);
    }
}
`,
    cpp: `class Solution {
public:
    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {
        vector<vector<int>> out;
        int start = newInterval[0], end = newInterval[1];
        size_t i = 0, n = intervals.size();
        while (i < n && intervals[i][1] < start) out.push_back(intervals[i++]);
        while (i < n && intervals[i][0] <= end) {
            start = min(start, intervals[i][0]);
            end = max(end, intervals[i][1]);
            i++;
        }
        out.push_back({start, end});
        while (i < n) out.push_back(intervals[i++]);
        return out;
    }
};
`,
    go: `func insert(intervals [][]int, newInterval []int) [][]int {
	out := [][]int{}
	start, end := newInterval[0], newInterval[1]
	i, n := 0, len(intervals)
	for i < n && intervals[i][1] < start {
		out = append(out, intervals[i])
		i++
	}
	for i < n && intervals[i][0] <= end {
		if intervals[i][0] < start {
			start = intervals[i][0]
		}
		if intervals[i][1] > end {
			end = intervals[i][1]
		}
		i++
	}
	out = append(out, []int{start, end})
	return append(out, intervals[i:]...)
}
`,
    typescript: `function insert(intervals: number[][], newInterval: number[]): number[][] {
  const out: number[][] = [];
  let [start, end] = newInterval;
  let i = 0;
  while (i < intervals.length && intervals[i][1] < start) out.push(intervals[i++]);
  while (i < intervals.length && intervals[i][0] <= end) {
    start = Math.min(start, intervals[i][0]);
    end = Math.max(end, intervals[i][1]);
    i++;
  }
  out.push([start, end]);
  while (i < intervals.length) out.push(intervals[i++]);
  return out;
}
`,
  },

  "p-non-overlapping-intervals": {
    java: `class Solution {
    public int eraseOverlapIntervals(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
        int removed = 0;
        long lastEnd = Long.MIN_VALUE;
        for (int[] interval : intervals) {
            if (interval[0] >= lastEnd) lastEnd = interval[1];
            else removed++;
        }
        return removed;
    }
}
`,
    cpp: `class Solution {
public:
    int eraseOverlapIntervals(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end(), [](const vector<int>& a, const vector<int>& b) { return a[1] < b[1]; });
        int removed = 0;
        long long lastEnd = LLONG_MIN;
        for (const auto& interval : intervals) {
            if (interval[0] >= lastEnd) lastEnd = interval[1];
            else removed++;
        }
        return removed;
    }
};
`,
    go: `import (
	"math"
	"sort"
)

func eraseOverlapIntervals(intervals [][]int) int {
	sort.Slice(intervals, func(i, j int) bool { return intervals[i][1] < intervals[j][1] })
	removed := 0
	lastEnd := math.MinInt64
	for _, interval := range intervals {
		if interval[0] >= lastEnd {
			lastEnd = interval[1]
		} else {
			removed++
		}
	}
	return removed
}
`,
    typescript: `function eraseOverlapIntervals(intervals: number[][]): number {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  let removed = 0;
  let lastEnd = -Infinity;
  for (const [start, end] of sorted) {
    if (start >= lastEnd) lastEnd = end;
    else removed++;
  }
  return removed;
}
`,
  },

  "p-meeting-rooms": {
    java: `class Solution {
    public boolean canAttendMeetings(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] < intervals[i - 1][1]) return false;
        }
        return true;
    }
}
`,
    cpp: `class Solution {
public:
    bool canAttendMeetings(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());
        for (size_t i = 1; i < intervals.size(); i++) {
            if (intervals[i][0] < intervals[i - 1][1]) return false;
        }
        return true;
    }
};
`,
    go: `import "sort"

func canAttendMeetings(intervals [][]int) bool {
	sort.Slice(intervals, func(i, j int) bool { return intervals[i][0] < intervals[j][0] })
	for i := 1; i < len(intervals); i++ {
		if intervals[i][0] < intervals[i-1][1] {
			return false
		}
	}
	return true
}
`,
    typescript: `function canAttendMeetings(intervals: number[][]): boolean {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] < sorted[i - 1][1]) return false;
  }
  return true;
}
`,
  },

  "p-meeting-rooms-ii": {
    java: `class Solution {
    public int minMeetingRooms(int[][] intervals) {
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        PriorityQueue<Integer> ends = new PriorityQueue<>();
        for (int[] interval : intervals) {
            if (!ends.isEmpty() && ends.peek() <= interval[0]) ends.poll();
            ends.add(interval[1]);
        }
        return ends.size();
    }
}
`,
    cpp: `class Solution {
public:
    int minMeetingRooms(vector<vector<int>>& intervals) {
        sort(intervals.begin(), intervals.end());
        priority_queue<int, vector<int>, greater<int>> ends;
        for (const auto& interval : intervals) {
            if (!ends.empty() && ends.top() <= interval[0]) ends.pop();
            ends.push(interval[1]);
        }
        return (int) ends.size();
    }
};
`,
    go: `import "sort"

func minMeetingRooms(intervals [][]int) int {
	n := len(intervals)
	starts := make([]int, n)
	ends := make([]int, n)
	for i, interval := range intervals {
		starts[i] = interval[0]
		ends[i] = interval[1]
	}
	sort.Ints(starts)
	sort.Ints(ends)
	rooms, best, j := 0, 0, 0
	for _, start := range starts {
		for j < n && ends[j] <= start {
			j++
			rooms--
		}
		rooms++
		if rooms > best {
			best = rooms
		}
	}
	return best
}
`,
    typescript: `function minMeetingRooms(intervals: number[][]): number {
  const starts = intervals.map((interval) => interval[0]).sort((a, b) => a - b);
  const ends = intervals.map((interval) => interval[1]).sort((a, b) => a - b);
  let rooms = 0;
  let best = 0;
  let j = 0;
  for (const start of starts) {
    while (j < ends.length && ends[j] <= start) {
      j++;
      rooms--;
    }
    rooms++;
    best = Math.max(best, rooms);
  }
  return best;
}
`,
  },

  "p-set-matrix-zeroes": {
    java: `class Solution {
    public int[][] setZeroes(int[][] matrix) {
        int rows = matrix.length, cols = matrix[0].length;
        boolean firstRow = false, firstCol = false;
        for (int c = 0; c < cols; c++) if (matrix[0][c] == 0) firstRow = true;
        for (int r = 0; r < rows; r++) if (matrix[r][0] == 0) firstCol = true;
        for (int r = 1; r < rows; r++)
            for (int c = 1; c < cols; c++)
                if (matrix[r][c] == 0) { matrix[r][0] = 0; matrix[0][c] = 0; }
        for (int r = 1; r < rows; r++)
            for (int c = 1; c < cols; c++)
                if (matrix[r][0] == 0 || matrix[0][c] == 0) matrix[r][c] = 0;
        if (firstRow) for (int c = 0; c < cols; c++) matrix[0][c] = 0;
        if (firstCol) for (int r = 0; r < rows; r++) matrix[r][0] = 0;
        return matrix;
    }
}
`,
    cpp: `class Solution {
public:
    vector<vector<int>> setZeroes(vector<vector<int>>& matrix) {
        size_t rows = matrix.size(), cols = matrix[0].size();
        bool firstRow = false, firstCol = false;
        for (size_t c = 0; c < cols; c++) if (matrix[0][c] == 0) firstRow = true;
        for (size_t r = 0; r < rows; r++) if (matrix[r][0] == 0) firstCol = true;
        for (size_t r = 1; r < rows; r++)
            for (size_t c = 1; c < cols; c++)
                if (matrix[r][c] == 0) { matrix[r][0] = 0; matrix[0][c] = 0; }
        for (size_t r = 1; r < rows; r++)
            for (size_t c = 1; c < cols; c++)
                if (matrix[r][0] == 0 || matrix[0][c] == 0) matrix[r][c] = 0;
        if (firstRow) for (size_t c = 0; c < cols; c++) matrix[0][c] = 0;
        if (firstCol) for (size_t r = 0; r < rows; r++) matrix[r][0] = 0;
        return matrix;
    }
};
`,
    go: `func setZeroes(matrix [][]int) [][]int {
	rows, cols := len(matrix), len(matrix[0])
	firstRow, firstCol := false, false
	for c := 0; c < cols; c++ {
		if matrix[0][c] == 0 {
			firstRow = true
		}
	}
	for r := 0; r < rows; r++ {
		if matrix[r][0] == 0 {
			firstCol = true
		}
	}
	for r := 1; r < rows; r++ {
		for c := 1; c < cols; c++ {
			if matrix[r][c] == 0 {
				matrix[r][0] = 0
				matrix[0][c] = 0
			}
		}
	}
	for r := 1; r < rows; r++ {
		for c := 1; c < cols; c++ {
			if matrix[r][0] == 0 || matrix[0][c] == 0 {
				matrix[r][c] = 0
			}
		}
	}
	if firstRow {
		for c := 0; c < cols; c++ {
			matrix[0][c] = 0
		}
	}
	if firstCol {
		for r := 0; r < rows; r++ {
			matrix[r][0] = 0
		}
	}
	return matrix
}
`,
    typescript: `function setZeroes(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const firstRow = matrix[0].some((value) => value === 0);
  const firstCol = matrix.some((row) => row[0] === 0);
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (matrix[r][c] === 0) {
        matrix[r][0] = 0;
        matrix[0][c] = 0;
      }
    }
  }
  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      if (matrix[r][0] === 0 || matrix[0][c] === 0) matrix[r][c] = 0;
    }
  }
  if (firstRow) for (let c = 0; c < cols; c++) matrix[0][c] = 0;
  if (firstCol) for (let r = 0; r < rows; r++) matrix[r][0] = 0;
  return matrix;
}
`,
  },

  "p-spiral-matrix": {
    java: `class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> out = new ArrayList<>();
        int top = 0, bottom = matrix.length - 1, left = 0, right = matrix[0].length - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.add(matrix[top][c]);
            top++;
            for (int r = top; r <= bottom; r++) out.add(matrix[r][right]);
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) out.add(matrix[bottom][c]);
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) out.add(matrix[r][left]);
                left++;
            }
        }
        return out;
    }
}
`,
    cpp: `class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {
        vector<int> out;
        int top = 0, bottom = (int) matrix.size() - 1, left = 0, right = (int) matrix[0].size() - 1;
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.push_back(matrix[top][c]);
            top++;
            for (int r = top; r <= bottom; r++) out.push_back(matrix[r][right]);
            right--;
            if (top <= bottom) {
                for (int c = right; c >= left; c--) out.push_back(matrix[bottom][c]);
                bottom--;
            }
            if (left <= right) {
                for (int r = bottom; r >= top; r--) out.push_back(matrix[r][left]);
                left++;
            }
        }
        return out;
    }
};
`,
    go: `func spiralOrder(matrix [][]int) []int {
	out := []int{}
	top, bottom, left, right := 0, len(matrix)-1, 0, len(matrix[0])-1
	for top <= bottom && left <= right {
		for c := left; c <= right; c++ {
			out = append(out, matrix[top][c])
		}
		top++
		for r := top; r <= bottom; r++ {
			out = append(out, matrix[r][right])
		}
		right--
		if top <= bottom {
			for c := right; c >= left; c-- {
				out = append(out, matrix[bottom][c])
			}
			bottom--
		}
		if left <= right {
			for r := bottom; r >= top; r-- {
				out = append(out, matrix[r][left])
			}
			left++
		}
	}
	return out
}
`,
    typescript: `function spiralOrder(matrix: number[][]): number[] {
  const out: number[] = [];
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) out.push(matrix[r][right]);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push(matrix[r][left]);
      left++;
    }
  }
  return out;
}
`,
  },

  "p-rotate-image": {
    java: `class Solution {
    public int[][] rotate(int[][] matrix) {
        int n = matrix.length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) {
                int tmp = matrix[i][j];
                matrix[i][j] = matrix[j][i];
                matrix[j][i] = tmp;
            }
        for (int[] row : matrix)
            for (int l = 0, r = n - 1; l < r; l++, r--) {
                int tmp = row[l];
                row[l] = row[r];
                row[r] = tmp;
            }
        return matrix;
    }
}
`,
    cpp: `class Solution {
public:
    vector<vector<int>> rotate(vector<vector<int>>& matrix) {
        size_t n = matrix.size();
        for (size_t i = 0; i < n; i++)
            for (size_t j = i + 1; j < n; j++) swap(matrix[i][j], matrix[j][i]);
        for (auto& row : matrix) reverse(row.begin(), row.end());
        return matrix;
    }
};
`,
    go: `func rotate(matrix [][]int) [][]int {
	n := len(matrix)
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
		}
	}
	for _, row := range matrix {
		for l, r := 0, n-1; l < r; l, r = l+1, r-1 {
			row[l], row[r] = row[r], row[l]
		}
	}
	return matrix
}
`,
    typescript: `function rotate(matrix: number[][]): number[][] {
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const tmp = matrix[i][j];
      matrix[i][j] = matrix[j][i];
      matrix[j][i] = tmp;
    }
  }
  for (const row of matrix) row.reverse();
  return matrix;
}
`,
  },

  "p-word-search": {
    java: `class Solution {
    public boolean exist(char[][] board, String word) {
        for (int r = 0; r < board.length; r++)
            for (int c = 0; c < board[0].length; c++)
                if (dfs(board, word, r, c, 0)) return true;
        return false;
    }

    private boolean dfs(char[][] board, String word, int r, int c, int i) {
        if (i == word.length()) return true;
        if (r < 0 || c < 0 || r >= board.length || c >= board[0].length || board[r][c] != word.charAt(i)) return false;
        char saved = board[r][c];
        board[r][c] = '#';
        boolean found = dfs(board, word, r + 1, c, i + 1) || dfs(board, word, r - 1, c, i + 1)
            || dfs(board, word, r, c + 1, i + 1) || dfs(board, word, r, c - 1, i + 1);
        board[r][c] = saved;
        return found;
    }
}
`,
    cpp: `class Solution {
public:
    bool exist(vector<vector<char>>& board, string word) {
        for (int r = 0; r < (int) board.size(); r++)
            for (int c = 0; c < (int) board[0].size(); c++)
                if (dfs(board, word, r, c, 0)) return true;
        return false;
    }

private:
    bool dfs(vector<vector<char>>& board, const string& word, int r, int c, size_t i) {
        if (i == word.size()) return true;
        if (r < 0 || c < 0 || r >= (int) board.size() || c >= (int) board[0].size() || board[r][c] != word[i]) return false;
        char saved = board[r][c];
        board[r][c] = '#';
        bool found = dfs(board, word, r + 1, c, i + 1) || dfs(board, word, r - 1, c, i + 1) ||
                     dfs(board, word, r, c + 1, i + 1) || dfs(board, word, r, c - 1, i + 1);
        board[r][c] = saved;
        return found;
    }
};
`,
    go: `func exist(board [][]byte, word string) bool {
	rows, cols := len(board), len(board[0])
	var dfs func(r, c, i int) bool
	dfs = func(r, c, i int) bool {
		if i == len(word) {
			return true
		}
		if r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] != word[i] {
			return false
		}
		saved := board[r][c]
		board[r][c] = '#'
		found := dfs(r+1, c, i+1) || dfs(r-1, c, i+1) || dfs(r, c+1, i+1) || dfs(r, c-1, i+1)
		board[r][c] = saved
		return found
	}
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			if dfs(r, c, 0) {
				return true
			}
		}
	}
	return false
}
`,
    typescript: `function exist(board: string[][], word: string): boolean {
  const rows = board.length;
  const cols = board[0].length;
  const dfs = (r: number, c: number, i: number): boolean => {
    if (i === word.length) return true;
    if (r < 0 || c < 0 || r >= rows || c >= cols || board[r][c] !== word[i]) return false;
    const saved = board[r][c];
    board[r][c] = "#";
    const found = dfs(r + 1, c, i + 1) || dfs(r - 1, c, i + 1) || dfs(r, c + 1, i + 1) || dfs(r, c - 1, i + 1);
    board[r][c] = saved;
    return found;
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0)) return true;
    }
  }
  return false;
}
`,
  },
};
