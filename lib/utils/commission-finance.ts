export type CommissionFinanceInput = {
  saleTotalAmount: number | null | undefined;
  saleAmountPaid: number | null | undefined;
  plotSizeSqft: number | null | undefined;
  plotBaseRatePerSqft: number | null | undefined;
  advisorAmountPaid: number | null | undefined;
  storedTotalCommissionAmount?: number | null | undefined;
};

export type CommissionFinanceSnapshot = {
  profitTotal: number;
  eligibleNow: number;
  remainingEligible: number;
  remainingOverall: number;
  extraPaid: number;
  collectionRatio: number;
};

function toSafeNumber(value: number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function calculateCommissionFinance(
  input: CommissionFinanceInput,
): CommissionFinanceSnapshot {
  const saleTotalAmount = Math.max(0, toSafeNumber(input.saleTotalAmount));
  const saleAmountPaid = Math.max(0, toSafeNumber(input.saleAmountPaid));
  const plotSizeSqft = Math.max(0, toSafeNumber(input.plotSizeSqft));
  const plotBaseRatePerSqft = Math.max(0, toSafeNumber(input.plotBaseRatePerSqft));
  const advisorAmountPaid = Math.max(0, toSafeNumber(input.advisorAmountPaid));
  const storedTotalCommissionAmount = Math.max(
    0,
    toSafeNumber(input.storedTotalCommissionAmount),
  );

  const derivedProfit = Math.max(0, saleTotalAmount - plotSizeSqft * plotBaseRatePerSqft);
  const profitTotal = derivedProfit > 0 ? derivedProfit : storedTotalCommissionAmount;
  const collectionRatio =
    saleTotalAmount > 0 ? Math.min(1, Math.max(0, saleAmountPaid / saleTotalAmount)) : 0;
  const eligibleNow = profitTotal * collectionRatio;
  const remainingEligible = Math.max(0, eligibleNow - advisorAmountPaid);
  const remainingOverall = Math.max(0, profitTotal - advisorAmountPaid);
  const extraPaid = Math.max(0, advisorAmountPaid - profitTotal);

  return {
    profitTotal,
    eligibleNow,
    remainingEligible,
    remainingOverall,
    extraPaid,
    collectionRatio,
  };
}
