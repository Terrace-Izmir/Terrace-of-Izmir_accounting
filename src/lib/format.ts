const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
});

export function formatCurrency(value: number | null | undefined) {
  if (value === undefined || value === null) {
    return "-";
  }

  return currencyFormatter.format(value);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(date);
}
