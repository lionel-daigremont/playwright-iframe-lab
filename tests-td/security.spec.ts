import { test, expect } from '@playwright/test';
import { CardWidget, CARDS } from '../pages/CardWidget';

/*
 * TD security: secrets and sensitive data.
 * Prerequisite: copy .env.example to .env and set PSP_SECRET_KEY (any value works locally).
 * The config loads .env and passes it to the local PSP server: the key never appears in the code.
 */
const SUCCESS_PATTERN = /^Payment approved\. Transaction ID: TX-\d{6}$/;
const SECURED_FRAME = 'iframe[title="Secure card payment"]';
const URL_ROOT = "http://localhost:3101"

test.describe('TD security', () => {
  // EX 8: an API protected by a secret key.
  // The PSP has a merchant back-office API: GET http://localhost:3101/api/v1/payments/{transactionId},
  // protected by the header  Authorization: Bearer <PSP_SECRET_KEY>.
  //  a) pay with CARDS.approved and read the transaction ID displayed in the parent page;
  //  b) with the `request` fixture, read the payment on the API, using process.env.PSP_SECRET_KEY;
  //  c) check the JSON: id, status 'approved', amount '1800.00', cardLast4 '4242'
  //     and that the FULL card number never appears in the response (PCI DSS);
  //  d) negative security tests: without the header, and with a wrong key, the API answers 401.
  test('ex8: check the payment on the PSP API with the secret key', async ({ page, request }) => {
        await page.goto('/checkout.html');
        const cardWidget = new CardWidget(page.frameLocator(SECURED_FRAME));
        await cardWidget.fill(CARDS.approved);
        await cardWidget.pay();
    
        //get the transaction ID after transaction
        await expect(page.getByRole('status')).toHaveText(SUCCESS_PATTERN);
        const statusMsg= (await page.getByRole('status').innerText()).trim()
        const transactionId = statusMsg.match(/TX-\d{6}/)![0];

        const url = URL_ROOT + "/api/v1/payments/" + transactionId;

        //call payment API
        const response = await request.get(url, { headers: { Authorization: `Bearer ${process.env.PSP_SECRET_KEY}` } });
    
        //response is 200
        expect(response.status()).toBe(200);

        //verify body, has id, approved status, amount and only the last 4 digits of the card
        const payment = await response.json();
        expect(payment).toEqual({ id: transactionId, status: 'approved', amount: '1800.00', cardLast4: '4242' });
        
        //payment info never contains the full card number
        expect(JSON.stringify(payment)).not.toContain(CARDS.approved.number)

        //negative cases - what if I call without the headers
        const response_nohead = await request.get(url);
        expect(response_nohead.status()).toBe(401);

        const response_wrongkey = await request.get(url, { headers: { Authorization: `Bearer 'WRONG_KEY'` } });
        expect(response_wrongkey.status()).toBe(401);

  });

  // EX 9: a screenshot without card data.
  // Fill the card form with CARDS.approved, take a screenshot of the whole page with the card number
  // and the CVC masked (option `mask` of page.screenshot), and attach it to the HTML report
  // with testInfo.attach. Then open the report and check the image.
  // Question: once masked in the image, is the value still in the field? Prove it with an assertion.
  test('ex9: screenshot with the card data masked', async ({ page }, testInfo) => {
        //fill in the payment form
        await page.goto('/checkout.html');
        const cardWidget = new CardWidget(page.frameLocator(SECURED_FRAME));
        await cardWidget.fill(CARDS.approved);

        //take a screenshot but with masked card number + CVC (blue)
        //fields will be masked on the rendered screenshot here but in case of test failure, test-results will still contain images without masking
        const image = await page.screenshot({ mask: [cardWidget.number, cardWidget.cvc], maskColor: "#1e32e8" });
        await expect(cardWidget.number).toHaveValue(CARDS.approved.number);
        await testInfo.attach('checkout-masked', { body: image, contentType: 'image/png' });
  });

  test('ex9b: masked checkout matches the visual baseline', { tag: '@visual' }, async ({ page }) => {
  test.skip(process.platform !== 'linux', 'Visual baselines are generated on Linux by the CI (see update-snapshots.yml)');
      await page.goto('/checkout.html');
      const cardWidget = new CardWidget(page.frameLocator(SECURED_FRAME));
      await cardWidget.fill(CARDS.approved);

       //visual verification - screenshot will have to be compared to a reference image (won't pass for the first run)
       await expect(page).toHaveScreenshot('checkout-masked.png', { mask: [cardWidget.number, cardWidget.cvc], maskColor:"#1e32e8" });
  });

});
