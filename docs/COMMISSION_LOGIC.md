## Commission logic (advisor payouts)

### 1) Total commission (per sale)

- When a sale is created, we create one row in `advisor_commissions`.
- `total_commission_amount` is the **maximum** commission for that sale (based on project/advisor rates at that time).
- This total does **not** change when payments come in.

### 2) Confirmed customer receipts

- Customer payments are stored in `payments`.
- Only **confirmed** payments count toward the sale’s received amount.
- `plot_sales.amount_paid` is maintained by a DB trigger and is equal to:

\[
\text{saleReceived} = \sum \text{payments.amount where is_confirmed = true}
\]

### 3) Eligible commission (proportional)

Advisor becomes eligible in the same proportion as money received:

\[
\text{ratio} = \min\left(1, \max\left(0, \frac{\text{saleReceived}}{\text{saleTotal}}\right)\right)
\]

\[
\text{eligibleCommissionNow} = \text{totalCommission} \times \text{ratio}
\]

Example:
- Sale total = ₹2000
- Total commission = ₹500
- Received (confirmed) = ₹1000 (50%)
- Eligible now = ₹250

### 4) Commission payouts (history)

- Every advisor payout is stored in `advisor_commission_payments` (multiple rows per commission).
- A DB trigger sums the payout history to keep `advisor_commissions.amount_paid` in sync.

### 5) How much can be paid right now

\[
\text{availableToPayNow} = \max(0, \text{eligibleCommissionNow} - \text{commissionPaidAlready})
\]

The app enforces this in two places:
- **UI**: blocks entering an amount above "Available to pay"
- **Server action**: rejects attempts to overpay (source of truth)

