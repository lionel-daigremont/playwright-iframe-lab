import { test, expect } from '@playwright/test';
import { CardWidget, CARDS } from '../pages/CardWidget';

const SUCCESS_PATTERN = /^Payment approved\. Transaction ID: TX-\d{6}$/;
const BANK_CHECK_FAILED = "Payment declined: insufficient funds";
const INVALID_CARD = "Card number is invalid";
const SECURED_FRAME = 'iframe[title="Secure card payment"]';
const LOADING_FORM = 'Loading secure payment form…'
const YAPE_FRAME_TITLE= "Yape Payment";
const CHAT_FRAME_TITLE = "Support chat";
const CONSENT_FRAME_TITLE = "Privacy consent";

const VALID_YAPE_NUMBER = "987654321";
const VALID_YAPE_CODE = "123456";
const YAPE_SENT = "Request sent to your Yape app";
const AGENT_RESPONSE_PATTERN = /^Agent\:/;
const SERVICE_UNAVAILABLE = "Payment service unavailable, please try again"

const UNEXPECTED_RESPONSES = [
  { name: 'unknown status',         body: { status: 'pending' } },
  { name: 'approved without TX ID', body: { status: 'approved' }, knownBug: 'BUG-006' },
  { name: 'empty body',             body: {} },
];

/*
 * TD iframes: a local shop (http://localhost:3100) embeds a payment provider (http://localhost:3101).
 * Two ports = two origins: the card form is a real cross-origin iframe, like Stripe or Adyen.
 *
 * Rules of the game:
 *  - remove `.fixme` from a test to activate it, then make it pass;
 *  - no waitForTimeout, no .first() / .nth() to silence a strict mode violation;
 *  - prefer user-facing locators (getByRole, getByLabel, getByTitle) inside the frames.
 *
 * Run: npm run td            (all browsers)
 *      npm run td -- --ui     (UI mode, recommended)
 */

test.describe('TD iframes', () => {
  // EX 1: the basics.
  // Open /checkout.html, enter the card iframe (title "Secure card payment"), pay with CARDS.approved,
  // then check in the PARENT page that the status says "Payment approved. Transaction ID: TX-" + 6 digits.
  // Tip: page.frameLocator(...) or page.getByTitle(...).contentFrame(), then CardWidget.
  test('ex1: approved card payment', async ({ page }) => {

    await page.goto('/checkout.html');
    const cardWidget = new CardWidget(page.frameLocator(SECURED_FRAME));
    await cardWidget.fill(CARDS.approved);
    await cardWidget.pay();

    await expect(page.getByRole('status')).toHaveText(SUCCESS_PATTERN);
  });

  // EX 2: an error that stays inside the iframe.
  // Pay with CARDS.invalid: the error "Card number is invalid" is shown INSIDE the iframe,
  // and the parent page status stays empty.
  test('ex2: invalid card number is rejected inside the iframe', async ({ page }) => {
    await page.goto('/checkout.html');
    const cardWidget = new CardWidget(page.frameLocator(SECURED_FRAME));
    await cardWidget.fill(CARDS.invalid);
    await cardWidget.pay();
    await expect(cardWidget.error).toHaveText(INVALID_CARD);

    //verify only here that status on page kept empty
    await expect(page.getByRole('status')).toBeEmpty();
  });

  // EX 3: wait strategies, UI + network.
  // Pay with CARDS.declined. The PSP answers after 1.5 s.
  //  a) while waiting, check that "Processing payment…" is visible, then hidden;
  //  b) capture the POST /api/pay response with page.waitForResponse and check its JSON body;
  //  c) check the parent page status: "Payment declined: insufficient funds".
  // Trap: start waiting for the response BEFORE clicking Pay.
  test('ex3: declined card, checked on the UI and on the API response', async ({ page }) => {
    await page.goto('/checkout.html');
    const cardWidget = new CardWidget(page.frameLocator(SECURED_FRAME));
    await cardWidget.fill(CARDS.declined);

    //api call must be verified and will be called when we expect a response
    const responsePromise = page.waitForResponse((r) => r.url().endsWith('/api/pay') && r.request().method() === 'POST');    
    await cardWidget.pay();

    //payment in progress: message for payment in progress would appear and disappear
    await expect(cardWidget.processing).toBeVisible();

    //check response from the bank
    const response = await responsePromise;
    expect(await response.json()).toEqual({ status: 'declined', reason: 'insufficient_funds' });

    //payment in progress message should disappear
    await expect(cardWidget.processing).toBeHidden();

    //the page would display a rejection by the bank
    await expect(page.getByRole('status')).toHaveText(BANK_CHECK_FAILED);
  });

  // EX 4: an iframe that does not exist yet.
  // On /lazy-checkout.html, the card form is injected 2 s after clicking "Pay by card".
  // Pay with CARDS.approved WITHOUT any explicit wait. Then explain in a comment why it works.
  test('ex4: lazy-loaded payment form, no explicit wait', async ({ page }) => {
    await page.goto('/lazy-checkout.html');

    //cardWidget iframe is not loaded, but still can be declared
    const cardWidget = new CardWidget(page.frameLocator(SECURED_FRAME));
    
    //first push the button
    await page.getByRole('button', { name: 'Pay by card' }).click();

    //as we are on lazy loading, the iframe doesn't display at once
    await expect(page.getByText(LOADING_FORM)).toBeVisible();
    await expect(page.getByText(LOADING_FORM)).toBeHidden();

    await cardWidget.fill(CARDS.approved);

    await cardWidget.pay();

    await expect(page.getByRole('status')).toHaveText(SUCCESS_PATTERN);

  });

  // BUG-001: lazy loading may display several IFrames
  // On /lazy-checkout.html, the card form is injected 2 s after clicking "Pay by card".
  // But the button can be pressed several times, and a new IFrame is displayed each time.
  // Pay with CARDS.approved WITHOUT any explicit wait on BOTH IFrames.
  // Verify if it's possible to generate 2 payments, triggering double-billing
  // (In that case, bug severity is critical)

  test.fail('bug001: lazy-loaded payment form, triggering several IFrames', async ({ page }) => {
    await page.goto('/lazy-checkout.html');

    //in this test we should have 2 cardWidgets while clicking twice
    const cardWidget1 = new CardWidget(page.frameLocator(SECURED_FRAME).first());
    const cardWidget2 = new CardWidget(page.frameLocator(SECURED_FRAME).nth(1));
        
    //first push the button once
    await page.getByRole('button', { name: 'Pay by card' }).click();
    await page.getByRole('button', { name: 'Pay by card' }).click();

    await expect(page.getByText(LOADING_FORM)).toBeVisible();
    await expect(page.getByText(LOADING_FORM)).toBeHidden();

    //pay with 1st IFrame
    await cardWidget1.fill(CARDS.approved);
    //api call must be verified and will be called when we expect a response
    const responsePromise = page.waitForResponse((r) => r.url().endsWith('/api/pay') && r.request().method() === 'POST');   
    await cardWidget1.pay();
    const response1 = await responsePromise;

        //pay with 2nd IFrame
    await cardWidget2.fill(CARDS.approved);
    await cardWidget2.pay();
    const response2 = await responsePromise;

    const body1 = await response1.json();
    const body2 = await response2.json();

    // Both payments are approved, each with a well-formed transaction ID...
    expect(body1).toMatchObject({ status: 'approved', transactionId: expect.stringMatching(/^TX-\d{6}$/) });
    expect(body2).toMatchObject({ status: 'approved', transactionId: expect.stringMatching(/^TX-\d{6}$/) });

    // ...and they are two distinct transactions: the customer is charged twice.
    expect(body1.transactionId).not.toBe(body2.transactionId);
  });

  // EX 5: several iframes.
  // /payment-methods.html has two iframes: Yape and Card.
  //  a) first try page.frameLocator('iframe') and read the error you get;
  //  b) then target the Yape frame properly, enter a phone number and an approval code, click Pay,
  //     and check the message "Request sent to your Yape app".
  test('ex5: several iframes, pick the right one', async ({ page }) => {
    await page.goto('/payment-methods.html');
    
    // Throw: gandalfException "YOU SHALL NOT PASS" - The locator is ambiguous as we have 2 elements
    //const yapeFrame = page.frameLocator('iframe')
    //yapeFrame.getByRole('button', { name: 'Pay' }).click();
    
    //ensure we have 2 iFrames displayed here
    await expect(page.locator('iframe')).toHaveCount(2)
    
    const yape = page.getByTitle(YAPE_FRAME_TITLE).contentFrame();

    //fill yape form
    await yape.getByLabel("Phone number").fill(VALID_YAPE_NUMBER);
    await yape.getByLabel("Approval code").fill(VALID_YAPE_CODE);

    //Pay in yape
    await yape.getByRole('button', { name: 'Pay' }).click();

    //expect message "Request sent to your Yape app"
    await expect(yape.getByRole('status')).toHaveText(YAPE_SENT);
  });

  // EX 6: nested iframes.
  // /help.html contains a chat iframe, which itself contains a consent iframe.
  // Accept the privacy policy, start the chat, send a message,
  // and check that the agent answers (2 messages in the list, the last one starts with "Agent:").
  test('ex6: nested iframes (consent inside chat)', async ({ page }) => {
    await page.goto('/help.html');
    const chat = page.getByTitle(CHAT_FRAME_TITLE).contentFrame();
    const consent = chat.getByTitle(CONSENT_FRAME_TITLE).contentFrame();
    
    //at the beginning Start chat is disabled until accept via the chatbox
    await expect( consent.getByRole("button", { name: "Start chat"})).toBeDisabled();
    await consent.getByRole("checkbox", { name: "I accept the privacy policy"}).check();
    await expect(consent.getByRole("button", { name: "Start chat"})).toBeEnabled();

    //start chat
    await consent.getByRole("button", { name: "Start chat"}).click();

    //enter a message into the chatbox
    await chat.getByLabel("Your message").fill("Where is my refund?");
    await chat.getByRole("button", { name: "Send"}).click();

    //verify we have 2 message (message of user + answer of the agent)
    // The messages are the items of the "Messages" list
    const messages = chat.getByRole('list', { name: 'Messages' }).getByRole('listitem');

    // User message + agent answer (the agent answers after 1 s: toHaveCount retries)
    await expect(messages).toHaveCount(2);

    // The last message comes from the agent
    await expect(messages.last()).toHaveText(AGENT_RESPONSE_PATTERN); 
  });

  // EX 7: the PSP is down (service virtualization).
  // With page.route, make POST /api/pay answer HTTP 500, then pay with CARDS.approved.
  // Check the error "Payment service unavailable, please try again" inside the iframe,
  // and that the parent page status stays empty.
  test('ex7: PSP down, mocked with page.route', async ({ page }) => {
    await page.goto('/checkout.html');
    const cardWidget = new CardWidget(page.frameLocator(SECURED_FRAME));
    await cardWidget.fill(CARDS.approved);

    //Simulate CUT the API service
    //notice: same way we have to declare the API service before getting response, we need to make our API behavior change before we use it at the moment we pay
    await page.route('**/api/pay', (route) => route.fulfill({ status: 500, body: '...' }));
    await cardWidget.pay();
    await expect(cardWidget.error).toHaveText(SERVICE_UNAVAILABLE);

    //verify that status on page kept empty
    await expect(page.getByRole('status')).toBeEmpty();
  });

  for (const c of UNEXPECTED_RESPONSES) {
  // EX 7b - other tests with page.route, server giving unconsistent answers
  test(`ex7b: 200 with ${c.name} is never shown as approved`, async ({ page }) => {
    test.fail(!!c.knownBug, `${c.knownBug}: approved shown without a transaction ID`);
    await page.goto('/checkout.html');
    await page.route('**/api/pay', (route) => route.fulfill({ status: 200, json: c.body }));

    const cardWidget = new CardWidget(page.frameLocator(SECURED_FRAME));
    await cardWidget.fill(CARDS.approved);
    await cardWidget.pay();
    await expect(page.getByRole('status')).not.toHaveText(/approved/i);
  });
}
});
