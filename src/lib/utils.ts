import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Robust utility to deeply unwrap and clean nested/corrupted JSON strings or arrays
 */
export const smartParse = (val: any): string[] => {
  if (val === null || val === undefined) return [];

  let current = val;

  // 1. If it's a string, try to parse it if it looks like JSON
  if (typeof current === 'string') {
    const trimmed = current.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed !== current) {
          return smartParse(parsed);
        }
      } catch (e) { /* not JSON */ }
    }
  }

  // 2. If it's an array, recursively parse each item
  if (Array.isArray(current)) {
    return Array.from(new Set(current.flatMap(item => smartParse(item)))).filter(Boolean);
  }

  // 3. Handle strings with commas
  if (typeof current === 'string') {
    if (current.includes(',') && !current.startsWith('http')) {
      return current.split(',').map(v => v.trim()).filter(Boolean);
    }
    return current.trim() ? [current.trim()] : [];
  }

  if (typeof current === 'boolean' || typeof current === 'number') {
    return [String(current)];
  }

  return current ? [String(current)] : [];
};
