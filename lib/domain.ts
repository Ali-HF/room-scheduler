/**
 * Helper to check if an email matches the ALLOWED_EMAIL_DOMAIN environment variable.
 * If ALLOWED_EMAIL_DOMAIN is blank or unconfigured, all email domains are allowed.
 */
export function isAllowedEmployeeDomain(email?: string | null): boolean {
  if (!email) return false;
  const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

  // If no restricted domain is configured (blank/empty), allow all emails
  if (!allowedDomain) return true;

  const userDomain = email.split("@")[1]?.trim().toLowerCase();
  return userDomain === allowedDomain;
}

export function getAllowedDomainName(): string | null {
  const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  return allowedDomain || null;
}
