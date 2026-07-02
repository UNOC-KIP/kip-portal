// Hosted Postgres (Neon, RDS, …) requires TLS; local Docker does not.
// Sequelize does not honour sslmode in the URL, so decide explicitly:
// any non-local host gets TLS unless the URL opts out with sslmode=disable.
export function databaseNeedsSsl(url: string): boolean {
  if (/\bsslmode=disable\b/.test(url)) return false
  if (/\bsslmode=(require|verify-ca|verify-full)\b/.test(url)) return true
  try {
    const host = new URL(url).hostname
    return !['localhost', '127.0.0.1', '::1', ''].includes(host)
  } catch {
    return false
  }
}
