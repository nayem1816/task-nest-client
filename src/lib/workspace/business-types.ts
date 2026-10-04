/** Mirrors BUSINESS_TYPES on the API. */
export const BUSINESS_TYPE_VALUES = [
  'ecommerce',
  'd2c',
  'saas',
  'services',
  'agency',
  'education',
  'clinic',
  'other',
] as const;

export type BusinessType = (typeof BUSINESS_TYPE_VALUES)[number];

/** What an owner would call their own business. */
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  ecommerce: 'Online store',
  d2c: 'Direct-to-consumer brand',
  saas: 'Software / SaaS',
  services: 'Online services',
  agency: 'Agency',
  education: 'Education',
  clinic: 'Clinic or appointments',
  other: 'Something else',
};

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
}
