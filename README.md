# Playwright + TypeScript lab: payment iframes

A hands-on Playwright + TypeScript project built to practice what really matters in e-commerce and fintech UI testing: **cross-origin payment iframes, wait strategies, network mocking, secrets handling and bug hunting**.

It contains two parts:
1. **`tests/`**: UI tests on the public [Tricentis Demo Web Shop](https://demowebshop.tricentis.com) (search, product page, cart), with Page Objects, fixtures and 6 browser projects.
2. **`td/` + `tests-td/`**: a self-contained **payment lab**. A local shop (port 3100) embeds the card form of a fake Payment Service Provider (port 3101) in a **cross-origin iframe**, like Stripe or Adyen. Nothing external is needed: Playwright starts both servers itself.

## What this project shows

| Topic | Where |
|---|---|
| Page Objects and fixtures | `pages/`, `tests/fixtures.ts` |
| A component Page Object built on a **frame**, not a page | `pages/CardWidget.ts` |
| Iframes: basic, lazy-loaded, several on a page, nested | `tests-td/iframes.spec.ts` (ex1 to ex6) |
| Wait strategies: auto-wait, web-first assertions, `waitForResponse` | ex3, ex4 |
| Network mocking (service virtualization) with `page.route` | ex7, ex7b (data-driven) |
| Secrets in `.env`, never committed; API protected by a key; PCI DSS checks | `tests-td/security.spec.ts`, `.env.example` |
| Masking sensitive data in screenshots | ex9 |
| Known bugs tracked with `test.fail`, tags and issue annotations | `BUGS.md` |
| Cross-browser: Chromium, Firefox, WebKit, Edge, mobile emulation | `playwright.config.ts` |
| Linting that catches missing `await`s and assertions that never run | `eslint.config.mjs` |
| CI on every push | `.github/workflows/playwright.yml` |

## Bugs found

Six defects were found while testing the payment lab, including **a double charge** and **price tampering from the browser**. See [`BUGS.md`](BUGS.md).

## Playwright test agents

The project was also used to try Playwright's AI test agents (`npx playwright init-agents --loop=claude`). On a cart test with a deliberate trap (a paid option pre-selected by default), the **healer** agent found the root cause on the live page, fixed the precondition instead of just changing the expected price, and asked whether the test was meant to check the base price or the default configuration, a business decision it left to the engineer.

## Getting started

Requirements: Node.js 20+.

```bash
npm install
npx playwright install chromium firefox webkit
cp .env.example .env          # then set PSP_SECRET_KEY (any value works locally)
```

| Command | What it does |
|---|---|
| `npm test` | Demo Web Shop tests, all browsers |
| `npm run td` | payment lab tests (starts the local servers) |
| `npm run td -- --ui` | payment lab in Playwright UI mode |
| `npm run td:server` | starts the local shop and PSP, to explore them at http://localhost:3100 |
| `npm run lint` | ESLint with the Playwright plugin |
| `npm run report` | opens the last HTML report |

See [`td/README-TD.md`](td/README-TD.md) for the lab exercises.

## Author

Lionel Daigremont, Senior QA Engineer: 20 years of test automation (REST APIs, Java, Playwright), ISTQB certified.
