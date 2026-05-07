export type RollBreakdownTerm = {
  notation: string;
  sign: 1 | -1;
  subtotal: number;
  rolls?: number[];
};

export type RollResult = {
  total: number;
  normalizedExpression: string;
  terms: RollBreakdownTerm[];
};

export function parseAndRollDetailed(expression: string): RollResult {
  const exp = expression.replace(/\s+/g, '').toLowerCase();
  let total = 0;
  const safeExp = exp.startsWith('-') ? exp : '+' + exp;
  const terms = safeExp.match(/[+-][^+-]+/g) || [];
  const breakdown: RollBreakdownTerm[] = [];

  for (const term of terms) {
    const sign: 1 | -1 = term[0] === '-' ? -1 : 1;
    const valueStr = term.substring(1);

    const diceMatch = valueStr.match(/^(\d*)d(\d+)$/);
    if (diceMatch) {
      const count = diceMatch[1] ? parseInt(diceMatch[1], 10) : 1;
      const sides = parseInt(diceMatch[2], 10);
      const rolls: number[] = [];
      let rollSum = 0;
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        rollSum += roll;
      }
      total += sign * rollSum;
      breakdown.push({
        notation: `${count}d${sides}`,
        sign,
        subtotal: rollSum,
        rolls,
      });
    } else {
      const mod = parseInt(valueStr, 10);
      if (!isNaN(mod)) {
        total += sign * mod;
        breakdown.push({
          notation: valueStr,
          sign,
          subtotal: mod,
        });
      }
    }
  }

  return {
    total,
    normalizedExpression: exp,
    terms: breakdown,
  };
}

export function formatRollBreakdown(result: RollResult): string {
  return result.terms
    .map((term, index) => {
      const prefix = term.sign === -1 ? '-' : index === 0 ? '' : '+';
      const detail = term.rolls ? `${term.notation}[${term.rolls.join(',')}]` : term.notation;
      return `${prefix}${detail}`;
    })
    .join(' ');
}

export function parseAndRoll(expression: string): number {
  return parseAndRollDetailed(expression).total;
}
