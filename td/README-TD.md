# Payment iframe lab

Goal: master iframes with Playwright in a payment context, plus wait strategies, network mocking and secrets.

## The setup
- `http://localhost:3100`: the shop (the merchant)
- `http://localhost:3101`: the Payment Service Provider (PSP), with its card form and its `/api/pay` API
- Two ports = two origins: the card form is a real **cross-origin iframe**, like Stripe or Adyen.
- Test cards: `4242 4242 4242 4242` approved, `4000 0000 0000 0002` declined (insufficient funds), `4242 4242 4242 4241` invalid (Luhn check).

## Before you start: the secret key
The local PSP requires a secret key. It must **never** appear in the code:
```bash
cp .env.example .env        # Windows: copy .env.example .env
```
Then set a value in `.env`, e.g. `PSP_SECRET_KEY=sk_test_local`.
- `.env` holds the real values: it is git-ignored and **never committed**;
- `.env.example` lists the variables **without values**: it is committed, as a guide for the team;
- in CI, the same variable comes from the pipeline's secret store.

You don't need to start the servers yourself: `playwright.td.config.ts` starts and stops them (`webServer`). To explore the pages in a browser: `npm run td:server`, then http://localhost:3100.

## Running the lab
```bash
npm run td -- --ui                    # UI mode, recommended
npm run td -- --project=chromium      # one browser only
npm run td -- -g "ex3"                # one exercise
```

## Exercises
| # | Page | Goal | Key concept |
|---|---|---|---|
| 1 | `/checkout.html` | pay with the approved card, check the result in the **parent page** | entering an iframe: `frameLocator` / `getByTitle(...).contentFrame()` |
| 2 | `/checkout.html` | invalid card: error **inside** the iframe, parent status stays empty | which document each element lives in |
| 3 | `/checkout.html` | declined card: "Processing…" visible then hidden, API response checked, decline message | `waitForResponse` started **before** the click |
| 4 | `/lazy-checkout.html` | the form appears 2 s after a click: pay with **no explicit wait** | auto-wait also applies to frames |
| 5 | `/payment-methods.html` | two iframes: trigger the strict mode error, then pay with Yape | targeting a frame by its title |
| 6 | `/help.html` | consent iframe **inside** a chat iframe | nested frames |
| 7 | `/checkout.html` | the PSP is down (HTTP 500 mocked) | `page.route`: service virtualization |
| 7b | `/checkout.html` | a 200 with an unexpected body is never shown as approved | data-driven tests, fail-safe UI |
| 8 | API | read the payment with the secret key; only the last 4 digits; 401 without a valid key | `process.env`, `request` fixture, PCI DSS, negative tests |
| 9 | `/checkout.html` | screenshot with card data masked | `mask`, `testInfo.attach` |

Rules: no `waitForTimeout`, no `.first()` / `.nth()` to silence a strict mode violation, user-facing locators inside frames.

## Key points
| Topic | API | Takeaway |
|---|---|---|
| Entering an iframe | `page.frameLocator('iframe[title="…"]')` or `page.getByTitle('…').contentFrame()` | an iframe is a separate document: page locators can't see inside it |
| Nested iframes | `frame.frameLocator(...)` | chain frames like locators |
| Several iframes | anchor on `title` or `name` | same strict mode rule as locators |
| Component in an iframe | a Page Object built from a `FrameLocator` (`pages/CardWidget.ts`) | the component doesn't know it lives in an iframe |
| Auto-wait | actions and web-first assertions also wait for the frame | no fixed waits, even for a late iframe |
| Network wait | `page.waitForResponse(...)` started **before** the click | also catches requests sent from an iframe |
| Simulating an outage | `page.route('**/api/pay', r => r.fulfill({ status: 500 }))` | test error paths without breaking the real PSP |

## Wait strategy hierarchy
1. **Auto-wait** on actions: visible, stable, enabled, receives events
2. **Web-first assertions**: `toBeVisible`, `toHaveText`, `toHaveCount`… retry until the timeout
3. **Explicit waits on an event**: `locator.waitFor({ state })`, `page.waitForResponse()`, `page.waitForURL()`
4. **Polling**: `expect.poll()`, `expect(...).toPass()`, for values outside the DOM
5. ❌ **Never** `waitForTimeout`

## Security: sensitive data in tests
| Rule | How |
|---|---|
| Official test cards are not secrets | they can live in the code (`CARDS`) |
| Credentials, passwords, API keys: never in the code | `process.env.X`, from `.env` locally and from CI secrets |
| The PSP never returns the full card number | only the last 4 digits (PCI DSS): check it in API tests |
| Screenshots can show sensitive data | `mask: [locator, …]`, which also works on locators inside an iframe |
| **Traces record everything**: values typed with `fill()`, HTTP headers of API calls (so the secret key) | keep traces only on failure (`retain-on-failure`) and restrict access to CI artifacts |
| `storageState` files hold valid session cookies | git-ignore them |
