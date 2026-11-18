import { type Locator, type Page } from '@playwright/test';

/** Header shared by every page: search box and search button. */
export class HeaderComponent {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly itemsInCartLocator: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.locator('#small-searchterms');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.itemsInCartLocator = page.locator('.cart-qty');
    
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term); // fill() clears the "Search store" default value
    await this.searchButton.click();
  }

  /** Go to Cart */
  async goToCart(): Promise<void> {
    await this.page.locator('#topcartlink').getByRole('link').click();
  }

  /** Reads the number of items in cart. */
  async itemsInCart(): Promise<number> {
    const text = (await this.itemsInCartLocator.innerText()).trim();
    return Number(text);
  }

}
