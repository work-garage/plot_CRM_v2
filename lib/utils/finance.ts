export type FinanceInputs = {
  plotSizeSqft: number;
  baseRatePerSqft: number;
  advisorRatePerSqft: number;
  downPayment: number;
  otherPayments: number;
};

export type FinanceResult = {
  baseTotal: number;
  sellingPrice: number;
  profit: number;
  received: number;
  ratio: number;
  advisorEarned: number;
  remaining: number;
  remainingPotential: number;
  downPaymentPaymentRecord: DownPaymentPaymentRecord | null;
};

function assertFiniteNumber(name: string, value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a finite number`);
  return n;
}

export function validateFinance(inputs: FinanceInputs) {
  const plotSizeSqft = assertFiniteNumber("plotSizeSqft", inputs.plotSizeSqft);
  const baseRatePerSqft = assertFiniteNumber("baseRatePerSqft", inputs.baseRatePerSqft);
  const advisorRatePerSqft = assertFiniteNumber("advisorRatePerSqft", inputs.advisorRatePerSqft);
  const downPayment = assertFiniteNumber("downPayment", inputs.downPayment);
  const otherPayments = assertFiniteNumber("otherPayments", inputs.otherPayments);

  if (plotSizeSqft <= 0) throw new Error("plotSizeSqft must be > 0");
  if (baseRatePerSqft <= 0) throw new Error("baseRatePerSqft must be > 0");
  if (advisorRatePerSqft < baseRatePerSqft) {
    throw new Error("advisorRatePerSqft must be >= baseRatePerSqft");
  }
  if (downPayment < 0) throw new Error("downPayment must be >= 0");
  if (otherPayments < 0) throw new Error("otherPayments must be >= 0");
}

export function calculateBaseTotal(plotSizeSqft: number, baseRatePerSqft: number): number {
  return plotSizeSqft * baseRatePerSqft;
}

export function calculateSellingPrice(plotSizeSqft: number, advisorRatePerSqft: number): number {
  return plotSizeSqft * advisorRatePerSqft;
}

export function calculateProfit(baseTotal: number, sellingPrice: number): number {
  return sellingPrice - baseTotal;
}

export function calculatePaymentRatio(received: number, sellingPrice: number): number {
  return received / sellingPrice;
}

export function calculateAdvisorEarning(profit: number, ratio: number): number {
  return profit * ratio;
}

export function calculateRemaining(received: number, sellingPrice: number): number {
  return sellingPrice - received;
}

export function calculateFinance(inputs: FinanceInputs): FinanceResult {
  validateFinance(inputs);

  const plotSizeSqft = assertFiniteNumber("plotSizeSqft", inputs.plotSizeSqft);
  const baseRatePerSqft = assertFiniteNumber("baseRatePerSqft", inputs.baseRatePerSqft);
  const advisorRatePerSqft = assertFiniteNumber("advisorRatePerSqft", inputs.advisorRatePerSqft);
  const downPayment = assertFiniteNumber("downPayment", inputs.downPayment);
  const otherPayments = assertFiniteNumber("otherPayments", inputs.otherPayments);

  const received = downPayment + otherPayments;

  const baseTotal = calculateBaseTotal(plotSizeSqft, baseRatePerSqft);
  const sellingPrice = calculateSellingPrice(plotSizeSqft, advisorRatePerSqft);
  if (sellingPrice <= 0) throw new Error("sellingPrice must be > 0");
  if (downPayment > sellingPrice) throw new Error("downPayment cannot exceed sellingPrice");
  if (received > sellingPrice) throw new Error("received cannot exceed sellingPrice");

  const profit = calculateProfit(baseTotal, sellingPrice);
  const ratio = calculatePaymentRatio(received, sellingPrice);
  const advisorEarned = calculateAdvisorEarning(profit, ratio);
  const remaining = calculateRemaining(received, sellingPrice);
  const remainingPotential = profit - advisorEarned;
  const downPaymentPaymentRecord = buildDownPaymentPaymentRecord(downPayment);

  return {
    baseTotal,
    sellingPrice,
    profit,
    received,
    ratio,
    advisorEarned,
    remaining,
    remainingPotential,
    downPaymentPaymentRecord,
  };
}

export type DownPaymentPaymentRecord = {
  amount: number;
  type: "down_payment";
  status: "confirmed";
};

export function buildDownPaymentPaymentRecord(
  downPayment: number
): DownPaymentPaymentRecord | null {
  const amt = assertFiniteNumber("downPayment", downPayment);
  if (amt <= 0) return null;
  return { amount: amt, type: "down_payment", status: "confirmed" };
}

