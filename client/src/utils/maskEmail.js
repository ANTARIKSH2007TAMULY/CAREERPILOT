const MAX_MASK_CHARS = 5;
const VISIBLE_LOCAL_CHARS = 3;

export const maskEmail = (email) => {
  if (email == null) return '';

  const value = String(email).trim();
  if (!value) return '';

  const separator = value.lastIndexOf('@');
  if (separator <= 0 || separator === value.length - 1) return '';

  const localPart = value.slice(0, separator);
  const domain = value.slice(separator + 1);
  if (!localPart || !domain) return '';

  if (localPart.length <= VISIBLE_LOCAL_CHARS) {
    return `${localPart}@${domain}`;
  }

  const asteriskCount = Math.min(localPart.length - VISIBLE_LOCAL_CHARS, MAX_MASK_CHARS);
  return `${localPart.slice(0, VISIBLE_LOCAL_CHARS)}${'*'.repeat(asteriskCount)}@${domain}`;
};

export default maskEmail;
