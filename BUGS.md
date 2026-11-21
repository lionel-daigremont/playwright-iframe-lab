# Bug log

Defects found while building and testing the payment iframe lab (`td/`).
Each confirmed bug is covered by an automated test marked `test.fail`: the suite stays green while the bug exists, and the test turns red as soon as the bug is fixed, which is the signal to remove the annotation.

Severity = impact. Priority = urgency.

| ID | Title | Severity | Priority | Status |
|---|---|---|---|---|
| [BUG-001](#bug-001) | Clicking "Pay by card" several times stacks several payment forms | **Critical** | Highest | Open, automated |
| [BUG-002](#bug-002) | Two payment methods can be used for the same order | Major | High | Open, linked to BUG-001 |
| [BUG-003](#bug-003) | An empty message can be sent in the support chat | Minor | Low | Open |
| [BUG-004](#bug-004) | Unknown payment statuses are shown as "insufficient funds" | Major | High | Open |
| [BUG-005](#bug-005) | The payment amount can be changed from the browser | **Critical** | Highest | Open |
| [BUG-006](#bug-006) | A payment is shown as approved without a transaction ID | Major | High | Open, automated |

---

## BUG-001
**Clicking "Pay by card" several times stacks several payment forms**

- **Environment:** `http://localhost:3100/lazy-checkout.html`, Chromium (Playwright 1.63)
- **Steps:** open the page, click "Pay by card" twice
- **Expected:** only one payment form is displayed, however many times the button is clicked
- **Actual:** two stacked payment forms; both submit a payment successfully, with **two different transaction IDs for the same order**: the customer is charged twice
- **Severity:** Critical (double charge confirmed manually and by an automated test)
- **Possible fixes (for the dev team to decide):** disable the button after the first click; only inject the form if it isn't already there; **server-side idempotency key**, so that one order can only be charged once whatever happens in the UI
- **Automated test:** `ex4-bug001`, `test.fail`

## BUG-002
**Two payment methods can be used for the same order**

- **Environment:** `http://localhost:3100/payment-methods.html`
- **Steps:** start a Yape payment, then pay by card on the same page
- **Expected:** once a payment is in progress or confirmed, the order cannot be paid again
- **Actual:** both flows can be started for the same order
- **Severity:** Major (Critical if a double charge is confirmed). In this lab, the Yape flow only sends a request and calls no API, so the double charge is plausible but not proven
- **Root cause (suspected):** same as BUG-001, no order-level protection against duplicate payments. Real-life fix: an order state machine (pending, paid, cancelled); the first confirmed payment wins, later ones are rejected or refunded. Async flows (Yape approval on the phone, card with 3-D Secure) make race conditions a key test target

## BUG-003
**An empty message can be sent in the support chat**

- **Environment:** `http://localhost:3100/help.html`
- **Steps:** accept the privacy policy, start the chat, click "Send" without typing anything
- **Expected:** "Send" is disabled, or the empty message is rejected
- **Actual:** an empty "You:" message is added, and the agent answers it
- **Severity:** Minor
- **Related checks:** whitespace-only messages, very long messages; HTML injection (`<img src=x onerror=alert(1)>`) is correctly shown as text (`textContent`), worth a regression test

## BUG-004
**Unknown payment statuses are shown as "insufficient funds"**

- **Environment:** `/checkout.html`, PSP response mocked with `page.route`
- **Steps:** make `/api/pay` answer `200 { "status": "pending" }`, pay
- **Expected:** a neutral message ("Payment pending" or "We couldn't confirm your payment"), never a wrong reason
- **Actual:** "Payment declined: insufficient funds", a false and worrying message
- **Severity:** Major
- **Rule:** a 200 does not mean success. The UI must handle every status explicitly and fall back to a safe message

## BUG-005
**The payment amount can be changed from the browser (price tampering)**

- **Environment:** `http://localhost:3101/card-widget.html?amount=...`
- **Steps:** open the card form with `?amount=1` (or `0`, `-500`), pay with the approved test card
- **Expected:** the amount is set by the merchant server and cannot be changed by the customer
- **Actual:** the amount is read from the iframe URL and accepted as is by the PSP: the order is paid 1 instead of 1800. A negative amount is displayed ("Pay -500 PEN") and accepted
- **Severity:** Critical
- **Fix:** the merchant sets the amount server-side when creating the payment, never from the browser; before marking an order as paid, the merchant reconciles the amount charged with the order amount
- **Boundary values to cover:** `0`, negative, non-numeric, extra decimals, cents vs units (×100), currency

## BUG-006
**A payment is shown as approved without a transaction ID**

- **Environment:** `/checkout.html`, PSP response mocked with `page.route`
- **Steps:** make `/api/pay` answer `200 { "status": "approved" }`, pay
- **Expected:** no success message without a transaction ID (fail-safe)
- **Actual:** "Payment approved. Transaction ID: undefined": a success that cannot be reconciled, refunded or traced, and a technical value shown to the customer
- **Severity:** Major (Critical if the order is marked as paid on that basis)
- **Automated test:** `ex7b: 200 with approved without TX ID…`, `test.fail`

---

## Security observations

- **Information disclosure:** the decline reason ("insufficient funds") is shown to the customer. Detailed decline codes help card-testing fraud; show a generic message to the customer and keep the detailed code for the merchant.
- **`postMessage` to any origin:** the card form sends the payment result with `postMessage(..., '*')`, so any page embedding the widget can read it. The target origin should be the merchant's origin. (The shop page does check the sender's origin.)
