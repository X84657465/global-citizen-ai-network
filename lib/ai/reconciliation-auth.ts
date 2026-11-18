export function isActiveAdminProfile(profile: unknown): boolean {
  if (typeof profile !== "object" || profile === null || Array.isArray(profile)) {
    return false;
  }

  const candidate = profile as {
    role?: unknown;
    account_status?: unknown;
  };

  return Object.prototype.hasOwnProperty.call(candidate, "role") &&
    Object.prototype.hasOwnProperty.call(candidate, "account_status") &&
    candidate.role === "admin" &&
    candidate.account_status === "active";
}
