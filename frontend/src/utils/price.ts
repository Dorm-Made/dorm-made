export function formatCentsAsDollars(cents: number): string {
  const dollars = cents / 100;
  return dollars.toFixed(2);
}

export function handlePriceInput(currentValue: string, input: string): string {
  const digits = input.replace(/\D/g, "");

  // Limit to max $999,999.99
  if (digits.length > 8) {
    return currentValue;
  }

  return digits;
}

export function handlePriceBackspace(currentValue: string): string {
  if (currentValue.length === 0) {
    return "0";
  }

  const newValue = currentValue.slice(0, -1);
  return newValue || "0";
}

export function formatPriceForDisplay(centsString: string): string {
  const cents = parseInt(centsString || "0", 10);
  return formatCentsAsDollars(cents);
}

export function initializePriceFromCents(cents: number): string {
  return cents.toString();
}

export function getPriceInCents(centsString: string): number {
  return parseInt(centsString || "0", 10);
}