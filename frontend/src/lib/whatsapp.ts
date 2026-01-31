/**
 * Formats a phone number and opens it in WhatsApp.
 * Default prefix is +237 (Cameroon) if no + is found.
 */
export const openWhatsApp = (rawPhone?: string | null, text?: string): boolean => {
    if (!rawPhone) return false;

    // Remove all non-numeric characters
    let cleaned = rawPhone.replace(/\D/g, '');

    // Add Cameroon prefix if no + was in the original and it doesn't already start with 237
    if (!rawPhone.startsWith('+') && !cleaned.startsWith('237')) {
        cleaned = `237${cleaned}`;
    }

    // If it started with +, it might have a prefix already, or we just use it as is
    // The wa.me API needs the number with no @ or . symbols, just digits

    const url = `https://wa.me/${cleaned}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
};
