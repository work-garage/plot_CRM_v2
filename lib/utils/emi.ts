/**
 * Compute next EMI due date from sale and last payment info.
 * Returns the next calendar date matching emi_day on or after the reference date.
 */
export function getNextEmiDueDate(sale: {
  emi_day: number | null;
  token_date?: string | null;
  agreement_date?: string | null;
}, lastPaymentDate?: string | null): string | null {
  const day = sale.emi_day;
  if (!day || day < 1 || day > 31) return null;

  const refStr = lastPaymentDate ?? sale.agreement_date ?? sale.token_date;
  const ref = refStr ? new Date(refStr) : new Date();
  const now = new Date();

  // Start from the month after last payment (or sale date)
  let year = ref.getFullYear();
  let month = ref.getMonth();

  // If no last payment, first EMI is in the same or next month based on emi_day
  const refDay = ref.getDate();
  if (!lastPaymentDate) {
    if (refDay <= day) {
      // Same month
    } else {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
  } else {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  // Get last day of that month
  const lastDay = new Date(year, month + 1, 0).getDate();
  const effectiveDay = Math.min(day, lastDay);
  const nextDue = new Date(year, month, effectiveDay);

  // If that date is in the past, advance to next month
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let candidate = new Date(nextDue);
  while (candidate < today) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const d = Math.min(day, lastDayOfMonth);
    candidate = new Date(year, month, d);
  }

  return candidate.toISOString().slice(0, 10);
}

export function computeEmiSchedule(
  remaining: number,
  emiMonths: number,
  emiDay: number
): { monthlyEmi: number; nextDueDate: string; schedule: { month: number; amount: number; dueDate: string }[] } {
  const monthlyEmi = Math.ceil(remaining / emiMonths);
  const schedule: { month: number; amount: number; dueDate: string }[] = [];
  const start = new Date();
  start.setMonth(start.getMonth() + 1);
  start.setDate(Math.min(emiDay, 28));

  for (let m = 0; m < emiMonths; m++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + m);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(emiDay, lastDay));
    schedule.push({
      month: m + 1,
      amount: monthlyEmi,
      dueDate: d.toISOString().slice(0, 10),
    });
  }

  const nextDueDate = schedule[0]?.dueDate ?? "";
  return { monthlyEmi, nextDueDate, schedule };
}
