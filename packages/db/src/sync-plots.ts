/**
 * Plot sync — mirrors the UNOC GIS "KIP Phase 2" feature service into the local
 * Plot table. Run wherever both the GIS and the database are reachable:
 *
 *   pnpm --filter @kip/db sync:plots      (or: pnpm db:sync-plots from the root)
 *
 * Auth: generates a short-lived ArcGIS token from GIS_USERNAME/GIS_PASSWORD
 * (or uses GIS_TOKEN directly). The GIS remains the source of truth; this copy
 * is what the portal reads so plot selection does not depend on the GIS being
 * reachable at request time. Idempotent: upserts on the GIS object id (fid).
 */
import { sequelize, Plot } from './index'

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
    throw new Error(
      'Set GIS_USERNAME and GIS_PASSWORD (or GIS_TOKEN) to sync plots from the GIS.',
    )
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

async function fetchPage(token: string, offset: number): Promise<{ features: { attributes: Attrs }[]; more: boolean }> {
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

  const now = new Date()
  let created = 0
  let updated = 0
  for (const a of all) {
    const status = clean(a.status)
    const fields = {
      plotName: clean(a.plotname) ?? `Plot ${a.fid}`,
      zone: clean(a.zone),
      acreage: typeof a.arcreage === 'number' ? a.arcreage : null,
      areaCategory: clean(a.areacatego),
      lot: clean(a.lot),
      usage: clean(a.usage),
      gisStatus: a.status ?? null,
      gisInvestor: clean(a.investor),
      available: (status ?? '').toLowerCase() === 'not taken',
      lastSyncedAt: now,
    }
    const [row, wasCreated] = await Plot.findOrCreate({
      where: { gisObjectId: a.fid },
      defaults: { gisObjectId: a.fid, ...fields },
    })
    if (wasCreated) {
      created += 1
    } else {
      await row.update(fields)
      updated += 1
    }
  }

  const available = all.filter((a) => (clean(a.status) ?? '').toLowerCase() === 'not taken').length
  console.log(`Synced: ${created} created, ${updated} updated. ${available} available.`)
  await sequelize.close()
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err)
  await sequelize.close().catch(() => {})
  process.exit(1)
})
