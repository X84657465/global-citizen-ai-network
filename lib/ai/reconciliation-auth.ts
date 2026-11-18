export function isActiveAdminProfile(profile: unknown): boolean {
  if (typeof profile !== "object" || profile === null || Array.isArray(profile)) {
    return false;
  }

  const candidate = profile as {
    role?: unknown;
    account_status?: unknown;
  };

  return Object.hasOwn(candidate, "role") &&
    Object.hasOwn(candidate, "account_status") &&
    candidate.role === "admin" &&
    candidate.account_status === "active";
}
