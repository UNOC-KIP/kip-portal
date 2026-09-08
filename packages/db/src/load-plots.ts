/**
 * Load KIP Phase-2 plots into the local Plot table from the committed register
 * (src/data/phase2-plots.json, exported from the UNOC plot spreadsheet). Run:
 *
 *   pnpm --filter @kip/db load:plots      (or: pnpm db:load-plots from the root)
 *
 * The spreadsheet is the source for the picker list and the road each plot
 * fronts; it carries no geometry, so map shapes are not set here (the embedded
 * GIS viewer provides the visual map). Idempotent: upserts on the plot register
 * id (fid → gisObjectId) and then removes any plots no longer in the register,
 * along with their application selections, so the table matches the current
 * phase exactly.
 *
 * Uses raw `pg` with the same DATABASE_URL fallback as seed.ts / sync-plots.ts,
 * so it runs standalone without the model layer.
 */
import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'

const DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://kip:kip_dev_password@localhost:5433/kip_portal?schema=public'

// CommonJS package (see tsconfig module=CommonJS): __dirname is a native global.
// Run via tsx from src, so this resolves to src/data/phase2-plots.json.
const DATA_FILE = join(__dirname, 'data', 'phase2-plots.json')

type PlotRow = {
  fid: number
  plotNo: number
  street: string | null
  acreage: number | null
  zone: string | null
  lot: string | null
  available: boolean
}

async function main() {
  const rows = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as PlotRow[]
  console.log(`Loaded ${rows.length} plots from ${DATA_FILE}.`)

  const pool = new Pool({ connectionString: DB_URL })
  const client = await pool.connect()
  let upserted = 0
  try {
    await client.query('BEGIN')
    for (const p of rows) {
      await client.query(
        `INSERT INTO "Plot"
           ("id","gisObjectId","plotName","zone","acreage","street","lot","gisStatus","available","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())
         ON CONFLICT ("gisObjectId") DO UPDATE SET
           "plotName"=EXCLUDED."plotName","zone"=EXCLUDED."zone","acreage"=EXCLUDED."acreage",
           "street"=EXCLUDED."street","lot"=EXCLUDED."lot","gisStatus"=EXCLUDED."gisStatus",
           "available"=EXCLUDED."available","updatedAt"=now()`,
        [
          randomUUID(),
          p.fid,
          `Plot ${p.plotNo}`,
          p.zone,
          typeof p.acreage === 'number' ? p.acreage : null,
          p.street,
          p.lot,
          p.available ? 'Not taken' : 'Taken',
          p.available,
        ],
      )
      upserted += 1
    }

    const fids = rows.map((p) => p.fid)
    // Remove plots (and their selections) that are no longer in the register.
    const stalePlots = await client.query<{ id: string }>(
      `SELECT "id" FROM "Plot" WHERE "gisObjectId" <> ALL($1::int[])`,
      [fids],
    )
    const staleIds = stalePlots.rows.map((r) => r.id)
    if (staleIds.length) {
      await client.query(`DELETE FROM "ApplicationPlot" WHERE "plotId" = ANY($1::uuid[])`, [staleIds])
      await client.query(`DELETE FROM "Plot" WHERE "id" = ANY($1::uuid[])`, [staleIds])
    }
    await client.query('COMMIT')
    console.log(`Upserted ${upserted} plots; removed ${staleIds.length} stale plot(s).`)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
