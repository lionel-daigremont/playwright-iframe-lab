import { type FrameLocator, type Locator } from '@playwright/test';

export interface Card {
  holder: string;
  number: string;
  expiry: string;
  cvc: string;
}

/** Test cards understood by the local PSP. */
export const CARDS = {
  approved: { holder: 'Ana Quispe', number: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' },
  declined: { holder: 'Ana Quispe', number: '4000 0000 0000 0002', expiry: '12/30', cvc: '123' },
  invalid: { holder: 'Ana Quispe', number: '4242 4242 4242 4241', expiry: '12/30', cvc: '123' },
} satisfies Record<string, Card>;

/** The PSP card form. It lives inside an iframe, so it is built from a FrameLocator, not from the Page. */
export class CardWidget {
  readonly holder: Locator;
  readonly number: Locator;
  readonly expiry: Locator;
  readonly cvc: Locator;
  readonly payButton: Locator;
  readonly error: Locator;
  readonly processing: Locator;

  constructor(readonly frame: FrameLocator) {
    this.holder = frame.getByLabel('Cardholder name');
    this.number = frame.getByLabel('Card number');
    this.expiry = frame.getByLabel('Expiry date');
    this.cvc = frame.getByLabel('CVC');
    this.payButton = frame.getByRole('button', { name: /^Pay/ });
    this.error = frame.getByRole('alert');
    this.processing = frame.getByText('Processing payment…');
  }

  async fill(card: Card): Promise<void> {
    await this.holder.fill(card.holder);
    await this.number.fill(card.number);
    await this.expiry.fill(card.expiry);
    await this.cvc.fill(card.cvc);
  }

  async pay(): Promise<void> {
    await this.payButton.click();
  }
}
