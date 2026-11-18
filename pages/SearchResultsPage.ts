import { type Locator, type Page } from '@playwright/test';

/** Search results page: a grid of product items. */
export class SearchResultsPage {
  readonly productItems: Locator;

  constructor(private readonly page: Page) {
    this.productItems = page.locator('.product-item');
  }

  /** Returns the product card whose title matches exactly. */
  product(name: string): Locator {
    return this.productItems.filter({
      has: this.page.getByRole('link', { name, exact: true }),
    });
  }

  async openProduct(name: string): Promise<void> {
    await this.product(name).getByRole('link', { name, exact: true }).click();
  }
}
