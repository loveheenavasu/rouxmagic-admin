import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Robust utility to deeply unwrap and clean nested/corrupted JSON strings or arrays.
 * Keeps unwrapping until we have a flat array of plain strings (no stringified JSON).
 */
export const smartParse = (val: any): string[] => {
  if (val === null || val === undefined) return [];

  let current = val;

  // 1. If it's a string, try to parse and unwrap until we get non-JSON or plain text
  if (typeof current === 'string') {
    const trimmed = current.trim();
    if (!trimmed) return [];

    // Try JSON.parse once in case of escaped/double-encoded string from DB
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed !== trimmed) return smartParse(parsed);
    } catch {
      /* not valid JSON, continue */
    }

    // Keep unwrapping stringified JSON (e.g. "[\"PizzaTest\"]" or "\"[\"PizzaTest\"]\"")
    let str: string = trimmed;
    for (let i = 0; i < 10; i++) {
      const looksLikeJson =
        (str.startsWith('[') && str.endsWith(']')) ||
        (str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith('\\"') && str.endsWith('\\"'));
      if (!looksLikeJson) break;
      try {
        const parsed = JSON.parse(str);
        if (parsed === str) break;
        if (typeof parsed === 'string') {
          str = parsed;
          continue;
        }
        if (Array.isArray(parsed)) {
          return parsed.flatMap((item) => smartParse(item)).filter(Boolean);
        }
        return [String(parsed)];
      } catch {
        break;
      }
    }

    // Plain string: split by comma or return as single tag
    if (str.includes(',') && !str.startsWith('http')) {
      return str.split(',').map((v) => v.trim()).filter(Boolean);
    }
    return str ? [str] : [];
  }

  // 2. If it's an array, recursively parse each item and flatten (unwrap nested stringified items)
  if (Array.isArray(current)) {
    let result = current.flatMap((item) => smartParse(item)).filter(Boolean);
    result = Array.from(new Set(result));
    // If the only element is a string that looks like stringified JSON, unwrap again
    while (result.length === 1 && typeof result[0] === 'string') {
      const s = result[0].trim();
      if (
        (s.startsWith('[') && s.endsWith(']')) ||
        (s.startsWith('"') && s.endsWith('"'))
      ) {
        try {
          const inner = JSON.parse(s);
          result = smartParse(inner);
        } catch {
          break;
        }
      } else {
        break;
      }
    }
    return result;
  }

  if (typeof current === 'boolean' || typeof current === 'number') {
    return [String(current)];
  }

  return current ? [String(current)] : [];
};
