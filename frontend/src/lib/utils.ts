import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a phone or WhatsApp number into a direct https://wa.me/<number> link.
 * Handles +, dashes, spaces, and standard local formats.
 */
export function formatWhatsAppUrl(rawPhone?: string | null, rawCountry?: string | null, message?: string): string | null {
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) return null;

  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  let digitsOnly = cleaned.replace(/^\+/, '').replace(/^00/, '');

  // If starts with 0 (local trunk code e.g. 08012345678 or 07123456789)
  if (digitsOnly.startsWith('0')) {
    const countryUpper = (rawCountry || '').toUpperCase();
    if (countryUpper.includes('UK') || countryUpper.includes('UNITED KINGDOM') || countryUpper.includes('BRITAIN')) {
      digitsOnly = '44' + digitsOnly.slice(1);
    } else if (digitsOnly.startsWith('07') && digitsOnly.length === 11 && (countryUpper.includes('UK') || countryUpper.includes('LONDON'))) {
      digitsOnly = '44' + digitsOnly.slice(1);
    } else {
      // Default standard Nigerian mobile numbers (080, 081, 090, 091, 070) or 11-digit local
      digitsOnly = '234' + digitsOnly.slice(1);
    }
  }

  // A valid international phone number typically has at least 7 digits
  if (digitsOnly.length < 7) return null;

  const url = `https://wa.me/${digitsOnly}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}
