import { type Locator, type Page } from '@playwright/test';

/** Product details page. */
export class ProductPage {
  readonly title: Locator;
  readonly price: Locator;
  readonly addToCartButton: Locator;

  constructor(private readonly page: Page) {
    this.title = page.getByRole('heading', { level: 1 });
    this.price = page.locator('.product-price');
    this.addToCartButton = page.locator('.product-essential').getByRole('button', { name: 'Add to cart' });
  }

  /** Reads the displayed price and converts it to a number. */
  async priceValue(): Promise<number> {
    const text = (await this.price.innerText()).trim(); // e.g. "1800.00"
    return Number(text);
  }

  /** Add a product into cart (not with id, id is different for each product) */
  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }  
}
