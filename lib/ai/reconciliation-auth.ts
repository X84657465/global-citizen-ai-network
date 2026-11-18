export function isActiveAdminProfile(profile: unknown): boolean {
  if (typeof profile !== "object" || profile === null || Array.isArray(profile)) {
    return false;
  }

  const candidate = profile as {
    role?: unknown;
    account_status?: unknown;
  };

  return candidate.role === "admin" && candidate.account_status === "active";
}
