import { test as base } from '@playwright/test';
import { HeaderComponent } from '../pages/HeaderComponent';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';

type Pages = {
  header: HeaderComponent;
  searchResults: SearchResultsPage;
  productPage: ProductPage;
  cartPage: CartPage;
};

/** Each test asks only for the page objects it needs. */
export const test = base.extend<Pages>({
  header: async ({ page }, use) => {
    await page.goto('/');
    await use(new HeaderComponent(page));
  },
  searchResults: async ({ page }, use) => {
    await use(new SearchResultsPage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
});

export { expect } from '@playwright/test';
