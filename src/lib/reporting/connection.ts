export interface DatabaseConnectionDto {
  databaseEngine: 'postgresql'
  host: string
  port: number
  databaseName: string
  username: string
  password: string
}

/**
 * Parse a DATABASE_URL into a connection DTO understood by the reporting engine.
 * Supports standard Postgres URLs like:
 *   postgres://user:pass@host:5432/dbname
 */
export function parseDatabaseUrl(urlString?: string): DatabaseConnectionDto {
  const raw = urlString || process.env.DATABASE_URL

  if (!raw) {
    throw new Error('DATABASE_URL is not configured')
  }

  const url = new URL(raw)

  const host = url.hostname
  const port = url.port ? Number(url.port) : 5432
  const databaseName = url.pathname.replace(/^\//, '')
  const username = decodeURIComponent(url.username)
  const password = decodeURIComponent(url.password)

  if (!host || !databaseName || !username) {
    throw new Error('Invalid DATABASE_URL – missing host, database or username')
  }

  return {
    databaseEngine: 'postgresql',
    host,
    port,
    databaseName,
    username,
    password,
  }
}



