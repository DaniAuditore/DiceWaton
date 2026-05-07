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

export type DiceExpressionValidation =
  | { ok: true; normalizedExpression: string }
  | { ok: false; message: string };

function getDiceExpressionTerms(expression: string): { normalizedExpression: string; terms: string[] } {
  const normalizedExpression = expression.replace(/\s+/g, '').toLowerCase();
  const safeExpression = normalizedExpression.startsWith('-') ? normalizedExpression : '+' + normalizedExpression;

  return {
    normalizedExpression,
    terms: safeExpression.match(/[+-][^+-]+/g) || [],
  };
}

export function validateDiceExpression(expression: string): DiceExpressionValidation {
  const { normalizedExpression, terms } = getDiceExpressionTerms(expression);

  if (!normalizedExpression) {
    return { ok: false, message: 'Completá la expresión. Usá formato como 1d20+5 o 8d6.' };
  }

  if (!/^[+-]?(?:\d*d\d+|\d+)(?:[+-](?:\d*d\d+|\d+))*$/.test(normalizedExpression)) {
    return {
      ok: false,
      message: `No entendimos "${expression.trim()}": usá dados NdM, dM o números unidos con +/-. Ejemplo: 1d20+5.`,
    };
  }

  if (terms.length === 0) {
    return { ok: false, message: 'Agregá al menos un dado o modificador. Ejemplo: 1d20+5.' };
  }

  for (const term of terms) {
    const value = term.substring(1);
    const diceMatch = value.match(/^(\d*)d(\d+)$/);

    if (!diceMatch) {
      continue;
    }

    const count = diceMatch[1] ? parseInt(diceMatch[1], 10) : 1;
    const sides = parseInt(diceMatch[2], 10);

    if (count <= 0) {
      return { ok: false, message: 'La cantidad de dados debe ser mayor a 0. Ejemplo válido: 1d20.' };
    }

    if (sides <= 0) {
      return { ok: false, message: 'Las caras del dado deben ser mayores a 0. Ejemplo válido: 1d20.' };
    }
  }

  return { ok: true, normalizedExpression };
}

export function parseAndRollDetailed(expression: string): RollResult {
  const { normalizedExpression: exp, terms } = getDiceExpressionTerms(expression);
  let total = 0;
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
