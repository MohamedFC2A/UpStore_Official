/**
 * Utility functions for UpStore UI components.
 */

export function cn(...classes: (string | undefined | null | false | Record<string, boolean> | (string | undefined | null | false | Record<string, boolean>)[])[]): string {
  const result: string[] = [];

  const processClass = (item: any) => {
    if (!item) return;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) result.push(trimmed);
    } else if (Array.isArray(item)) {
      item.forEach(processClass);
    } else if (typeof item === 'object') {
      for (const [key, val] of Object.entries(item)) {
        if (val && key.trim()) result.push(key.trim());
      }
    }
  };

  classes.forEach(processClass);
  return result.join(' ');
}
