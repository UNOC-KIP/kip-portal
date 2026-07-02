import path from 'path'
import { Sequelize } from 'sequelize'
import { SequelizeStorage, Umzug } from 'umzug'

const DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://kip:kip_dev_password@localhost:5433/kip_portal?schema=public'

const sequelize = new Sequelize(DB_URL, {
  dialect: 'postgres',
  logging: false,
  // Hosted Postgres (Neon, RDS, …) requires TLS; local Docker does not.
  dialectOptions: /\bsslmode=require\b/.test(DB_URL)
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : undefined,
})

export const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../migrations/*.ts').replace(/\\/g, '/'),
    resolve: ({ name, path: migrationPath, context }) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const migration = require(migrationPath!)
      return { name, up: async () => migration.up({ context }), down: async () => migration.down?.({ context }) }
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
  logger: console,
})

// CLI
if (require.main === module) {
  const command = process.argv[2] ?? 'up'

  const run = async () => {
    if (command === 'up') {
      await umzug.up()
      console.log('✅  All migrations applied')
    } else if (command === 'down') {
      await umzug.down()
      console.log('✅  Last migration reverted')
    } else if (command === 'status') {
      const pending  = await umzug.pending()
      const executed = await umzug.executed()
      console.log('Applied :', executed.map(m => m.name).join(', ') || '(none)')
      console.log('Pending :', pending.map(m => m.name).join(', ')  || '(none)')
    } else if (command === 'fake') {
      // Mark all pending migrations as applied without running their SQL.
      // Use this on a DB that was already migrated by another tool (e.g. Prisma).
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS "SequelizeMeta" ("name" VARCHAR(255) NOT NULL, CONSTRAINT "SequelizeMeta_pkey" PRIMARY KEY ("name"))`
      )
      const pending = await umzug.pending()
      for (const migration of pending) {
        await sequelize.query(`INSERT INTO "SequelizeMeta" ("name") VALUES ($name) ON CONFLICT DO NOTHING`, {
          bind: { name: migration.name },
        })
        console.log('  Marked as applied:', migration.name)
      }
      console.log('✅  All migrations marked as applied (no SQL executed)')
    } else {
      console.error(`Unknown command: ${command}. Use: up | down | status | fake`)
      process.exit(1)
    }
    await sequelize.close()
  }

  run().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
