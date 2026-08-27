export function runDeterministicCheck(questionText: string, answerText: string): string | null {
  const qLower = questionText.toLowerCase();
  const aLower = answerText.toLowerCase();

  // Handle base conversions like "Convert 4310 from base 5 to decimal"
  const baseConversionRegex = /convert\s+([0-9a-f]+)\s+(?:from\s+)?(?:base\s+)?(\d+)\s+to\s+(?:base\s+)?(decimal|binary|octal|hexadecimal|10|2|8|16)/;
  const match = qLower.match(baseConversionRegex);

  if (match) {
    const numStr = match[1];
    const fromBase = parseInt(match[2], 10);
    const toBaseStr = match[3];

    let toBase = 10;
    if (toBaseStr === 'binary' || toBaseStr === '2') toBase = 2;
    if (toBaseStr === 'octal' || toBaseStr === '8') toBase = 8;
    if (toBaseStr === 'hexadecimal' || toBaseStr === '16') toBase = 16;
    if (toBaseStr === 'decimal' || toBaseStr === '10') toBase = 10;

    try {
      const decimalValue = parseInt(numStr, fromBase);
      if (!isNaN(decimalValue)) {
        const expectedAnswer = decimalValue.toString(toBase);
        return expectedAnswer;
      }
    } catch (e) {
      // Ignored
    }
  }

  // Handle explicitly "decimal to base X" (e.g., (198) 12 -> base 12) if the prompt is structured that way
  // Since questions might be like: "(198) 12" implying convert 198 (base 10) to base 12
  const directConversionRegex = /\(\s*([0-9]+)\s*\)\s*(\d+)/;
  const directMatch = qLower.match(directConversionRegex);
  
  if (directMatch && !qLower.includes('convert')) { // simplistic heuristic
    const numStr = directMatch[1];
    const toBase = parseInt(directMatch[2], 10);
    if (toBase >= 2 && toBase <= 36) {
       const decimalValue = parseInt(numStr, 10);
       return decimalValue.toString(toBase);
    }
  }

  return null;
}
