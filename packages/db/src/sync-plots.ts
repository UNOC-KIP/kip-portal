/**
 * Plot sync — mirrors the UNOC GIS "KIP Phase 2" feature service into the local
 * Plot table. Run wherever both the GIS and the database are reachable:
 *
 *   pnpm --filter @kip/db sync:plots      (or: pnpm db:sync-plots from the root)
 *
 * Auth: generates a short-lived ArcGIS token from GIS_USERNAME/GIS_PASSWORD
 * (or uses GIS_TOKEN directly). The GIS remains the source of truth for the map;
 * this copy is what the portal reads so plot selection does not depend on the
 * GIS at request time. Idempotent: upserts on the GIS object id (fid).
 *
 * Uses raw `pg` with the same DATABASE_URL fallback as seed.ts, so it runs as a
 * standalone script without loading the full model layer / env.
 *
 * Note: allocation is NOT read from the GIS. Nothing is allocated at this stage;
 * every plot stays selectable and the "how many have applied" figure is derived
 * from portal applications (Application.plotId), not the GIS status. The GIS
 * status/investor are stored for reference only.
 */
import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const DB_URL =
  process.env.DATABASE_URL ??
  'postgresql://kip:kip_dev_password@localhost:5433/kip_portal?schema=public'

const PORTAL_URL = (process.env.GIS_PORTAL_URL ?? 'https://gis.unoc.co.ug/portal').replace(/\/$/, '')
const FEATURE_URL = (
  process.env.GIS_FEATURE_URL ??
  'https://gis.unoc.co.ug/server/rest/services/Hosted/KIP_Phase_2/FeatureServer/0'
).replace(/\/$/, '')

const OUT_FIELDS = 'fid,no,plotname,zone,arcreage,areacatego,status,lot,investor,usage'
const PAGE = 1000

type Attrs = {
  fid: number
  plotname?: string | null
  zone?: string | null
  arcreage?: number | null
  areacatego?: string | null
  status?: string | null
  lot?: string | null
  investor?: string | null
  usage?: string | null
}

function clean(v: string | null | undefined): string | null {
  const t = (v ?? '').trim()
  return t.length ? t : null
}

async function getToken(): Promise<string> {
  if (process.env.GIS_TOKEN) return process.env.GIS_TOKEN
  const username = process.env.GIS_USERNAME
  const password = process.env.GIS_PASSWORD
  if (!username || !password) {
    throw new Error('Set GIS_USERNAME and GIS_PASSWORD (or GIS_TOKEN) to sync plots from the GIS.')
  }
  const body = new URLSearchParams({
    username,
    password,
    client: 'requestip',
    expiration: '60',
    f: 'json',
  })
  const res = await fetch(`${PORTAL_URL}/sharing/rest/generateToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as { token?: string; error?: { message?: string } }
  if (!data.token) {
    throw new Error(`GIS token request failed: ${data.error?.message ?? 'no token returned'}`)
  }
  return data.token
}

async function fetchPage(
  token: string,
  offset: number,
): Promise<{ features: { attributes: Attrs }[]; more: boolean }> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: OUT_FIELDS,
    returnGeometry: 'false',
    orderByFields: 'fid ASC',
    resultOffset: String(offset),
    resultRecordCount: String(PAGE),
    f: 'json',
    token,
  })
  const res = await fetch(`${FEATURE_URL}/query?${params.toString()}`)
  const data = (await res.json()) as {
    features?: { attributes: Attrs }[]
    exceededTransferLimit?: boolean
    error?: { message?: string }
  }
  if (data.error) throw new Error(`GIS query failed: ${data.error.message}`)
  return { features: data.features ?? [], more: data.exceededTransferLimit === true }
}

async function main() {
  const token = await getToken()

  const all: Attrs[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { features, more } = await fetchPage(token, offset)
    all.push(...features.map((f) => f.attributes))
    if (!more || features.length === 0) break
  }
  console.log(`Fetched ${all.length} plots from the GIS.`)

  const pool = new Pool({ connectionString: DB_URL })
  let upserted = 0
  try {
    for (const a of all) {
      await pool.query(
        `INSERT INTO "Plot"
           ("id","gisObjectId","plotName","zone","acreage","areaCategory","lot","usage","gisStatus","gisInvestor","available","lastSyncedAt","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),now(),now())
         ON CONFLICT ("gisObjectId") DO UPDATE SET
           "plotName"=EXCLUDED."plotName","zone"=EXCLUDED."zone","acreage"=EXCLUDED."acreage",
           "areaCategory"=EXCLUDED."areaCategory","lot"=EXCLUDED."lot","usage"=EXCLUDED."usage",
           "gisStatus"=EXCLUDED."gisStatus","gisInvestor"=EXCLUDED."gisInvestor",
           "available"=EXCLUDED."available","lastSyncedAt"=now(),"updatedAt"=now()`,
        [
          randomUUID(),
          a.fid,
          clean(a.plotname) ?? `Plot ${a.fid}`,
          clean(a.zone),
          typeof a.arcreage === 'number' ? a.arcreage : null,
          clean(a.areacatego),
          clean(a.lot),
          clean(a.usage),
          a.status ?? null,
          clean(a.investor),
          true, // allocation is not tracked in the GIS — every plot stays selectable
        ],
      )
      upserted += 1
    }
    console.log(`Synced ${upserted} plots into the Plot table.`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
