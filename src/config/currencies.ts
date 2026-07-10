/** Currencies an invoice can be denominated in. Single source of truth shared
 *  by the invoice form and validation. */
export const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN"] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "EUR";
