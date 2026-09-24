/**
 * Word blocklist for anything users publish (posts and replies).
 *
 * The match is per word, not per substring, so "drug" and "arugula" are fine
 * while "rug", "rugs" and "rug-pull" are not. Common suffixes and the usual
 * dodges — leet spelling, stretched letters, letters spaced apart — are
 * folded in before matching.
 */
export const BANNED_WORDS = [
  "scam",
  "rug",
  "relaunch",
  "scammer",
  "farm",
  "farmer",
  "larp",
] as const;

/** The stems that carry the rest: "scammer" is "scam" with a suffix. */
const STEMS = ["scam", "rug", "relaunch", "farm", "larp"];

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
};

/** stem + a common suffix; doubled letters are already collapsed by then. */
const PATTERNS = STEMS.map((stem) => ({
  stem,
  re: new RegExp(`^${stem}(?:s|es|ed|er|ers|ing|ings|y|z)?$`),
}));

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ​-‍﻿]/g, "")
    .replace(/[0134579@$!]/g, (c) => LEET[c] ?? c)
    .replace(/([a-z])\1+/g, "$1");
}

/** Words to test: the plain ones, plus runs of single letters glued back. */
function words(text: string): string[] {
  const parts = normalize(text).split(/[^a-z]+/).filter(Boolean);
  const out = [...parts];

  let run: string[] = [];
  const flush = () => {
    if (run.length >= 3) out.push(run.join(""));
    run = [];
  };
  for (const part of parts) {
    if (part.length === 1) run.push(part);
    else flush();
  }
  flush();

  return out;
}

/** The first blocked word in the text, in its listed spelling — or null. */
export function findBannedWord(text: string): string | null {
  for (const word of words(text)) {
    const hit = PATTERNS.find(({ re }) => re.test(word));
    if (hit) return hit.stem;
  }
  return null;
}

export function bannedWordError(word: string): string {
  return `“${word}” is on the blocklist here — reword it and try again.`;
}

/** Ready-made message for text that cannot be published, or null if it can. */
export function checkText(text: string): string | null {
  const word = findBannedWord(text);
  return word ? bannedWordError(word) : null;
}
