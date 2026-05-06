export function parseAndRoll(expression: string): number {
  const exp = expression.replace(/\s+/g, '').toLowerCase();
  let total = 0;
  const safeExp = exp.startsWith('-') ? exp : '+' + exp;
  const terms = safeExp.match(/[+-][^+-]+/g) || [];

  for (const term of terms) {
    const sign = term[0] === '-' ? -1 : 1;
    const valueStr = term.substring(1);

    const diceMatch = valueStr.match(/^(\d*)d(\d+)$/);
    if (diceMatch) {
      const count = diceMatch[1] ? parseInt(diceMatch[1], 10) : 1;
      const sides = parseInt(diceMatch[2], 10);
      let rollSum = 0;
      for (let i = 0; i < count; i++) {
        rollSum += Math.floor(Math.random() * sides) + 1;
      }
      total += sign * rollSum;
    } else {
      const mod = parseInt(valueStr, 10);
      if (!isNaN(mod)) {
        total += sign * mod;
      }
    }
  }

  return total;
}
