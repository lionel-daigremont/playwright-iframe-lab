import { test, expect } from './fixtures';

const PRODUCT = 'Build your own expensive computer';
const EXPECTED_PRICE = 1800;

test.describe('Product price', () => {
  test('the search result shows the right price @smoke', async ({ header, searchResults }) => {
    await header.search('expensive computer');

    const card = searchResults.product(PRODUCT);
    await expect(card).toHaveCount(1);
    await expect(card.locator('.actual-price')).toHaveText(EXPECTED_PRICE.toFixed(2));
  });

  test('the product page shows the right title and price', async ({ header, searchResults, productPage, page }) => {
    await header.search('expensive computer');
    await searchResults.openProduct(PRODUCT);

    await expect(page).toHaveURL(/build-your-own-expensive-computer/);
    await expect(productPage.title).toHaveText(PRODUCT);
    expect(await productPage.priceValue()).toBe(EXPECTED_PRICE);
  });
});
