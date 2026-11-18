import { test, expect } from './fixtures';

const PRODUCT = 'Build your own expensive computer';
const EXPECTED_PRICE = 1800;

  test('the product have the right price into the cart', async ({ header, searchResults, productPage, cartPage, page }) => {
    await header.search('expensive computer');
    await searchResults.openProduct(PRODUCT);

    await expect(page).toHaveURL(/build-your-own-expensive-computer/);
    await expect(productPage.title).toHaveText(PRODUCT);
    expect(await productPage.priceValue()).toBe(EXPECTED_PRICE);
    //add item to cart
    await productPage.addToCart();
    //a banner may appear when add the product to cart
    await expect(page.locator('#bar-notification')).toContainText('The product has been added to your shopping cart');
    //verify that the elements in cart is 1 (initial condition : always 0 as we start new session)
    await expect(header.itemsInCartLocator).toHaveText('(1)');   
    //go to cart (link from header bar)
    await header.goToCart();
    //verify price given into cart page
    expect(await cartPage.cartTotalValue()).toBe(EXPECTED_PRICE);
  });

