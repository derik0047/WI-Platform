/**
 * Country options for customer records. The name is stored verbatim; a single
 * source of truth shared by the create/edit form and the list filter.
 */
export const COUNTRIES = [
  "Netherlands",
  "Belgium",
  "Germany",
  "France",
  "Luxembourg",
  "United Kingdom",
  "Ireland",
  "Spain",
  "Portugal",
  "Italy",
  "Austria",
  "Switzerland",
  "Denmark",
  "Sweden",
  "Norway",
  "Finland",
  "Poland",
  "Czechia",
  "Slovakia",
  "Hungary",
  "Romania",
  "Greece",
  "Bulgaria",
  "Croatia",
  "Slovenia",
  "Estonia",
  "Latvia",
  "Lithuania",
  "United States",
  "Canada",
  "Other",
] as const;

export type Country = (typeof COUNTRIES)[number];

export const DEFAULT_COUNTRY: Country = "Netherlands";
