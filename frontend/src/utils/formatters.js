export function formatCurrency(value, options = {}) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(Number(value) || 0);
}

export function formatWeight(value) {
  const kilograms = Number(value) || 0;
  if (kilograms >= 1000) {
    return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(kilograms / 1000)} t`;
  }
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(kilograms)} kg`;
}
