import { type Locator, type Page } from '@playwright/test';

/** Shopping cart page. */
export class CartPage {
  readonly title: Locator;
  readonly cartTotal: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByRole('heading', { level: 1 });
    this.cartTotal = page.locator('.product-price.order-total');
  }

  /** Reads the displayed cart total and converts it to a number. */
  async cartTotalValue(): Promise<number> {
    const text = (await this.cartTotal.innerText()).trim(); // e.g. "1800.00"
    return Number(text);
  }
}
