const COMMON_NAMES_DICTIONARY = [
  'mohamed', 'mohammed', 'muhammad', 'ahmed', 'ahmad', 'mahmoud', 'ali', 'omar', 'khaled', 'khalid',
  'youssef', 'yousef', 'joseph', 'hassan', 'hussein', 'tariq', 'tarek', 'karim', 'kareem', 'faisal',
  'saud', 'salman', 'ibrahim', 'nour', 'aida', 'mariam', 'maryam', 'fatima', 'layla', 'laila',
  'reem', 'mostafa', 'mustafa', 'ziad', 'zeyad', 'amr', 'hany', 'sherif', 'khalil', 'sara', 'sarah',
  'john', 'alex', 'david', 'michael', 'daniel', 'sam', 'samir', 'adam', 'noah', 'james', 'robert',
  'mark', 'paul', 'george', 'lucas', 'anna', 'emma', 'olivia', 'sophia', 'mia', 'elena'
];

/**
 * Fast client & server safe deterministic extractor for a clean single first name (0ms).
 */
export function heuristicExtractFirstName(input?: string | null): string {
  if (!input || typeof input !== 'string') return 'User';

  // 1. If input is email, extract the local part
  let namePart = input.includes('@') ? input.split('@')[0] : input;

  // 2. Clean out Arabic brackets or extraneous parts e.g. "Mohamed Matany (محمد)" -> "Mohamed Matany"
  namePart = namePart.replace(/\([^)]*\)/g, '').trim();

  // 3. Remove non-alphanumeric separators (dots, underscores, dashes, numbers)
  // Check if starts with a known name dictionary match
  const lower = namePart.toLowerCase();
  for (const known of COMMON_NAMES_DICTIONARY) {
    if (lower.startsWith(known)) {
      return known.charAt(0).toUpperCase() + known.slice(1);
    }
  }

  // 4. Split by dot, underscore, dash, plus, numbers
  const tokens = namePart.split(/[._\-\+\d\s]+/).filter(Boolean);
  if (tokens.length > 0) {
    const firstToken = tokens[0];
    // Check if camelCase e.g. "MohamedAhmed" -> "Mohamed"
    const camelMatch = firstToken.match(/^[A-Z][a-z]+/);
    if (camelMatch) {
      return camelMatch[0];
    }
    // Return capitalized token (slice to max 12 chars)
    const clean = firstToken.replace(/[^a-zA-Z]/g, '');
    if (clean.length >= 2) {
      return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
    }
  }

  // 5. Fallback: clean first letters
  const lettersOnly = namePart.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length >= 2) {
    return lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1, 10).toLowerCase();
  }

  return 'User';
}
