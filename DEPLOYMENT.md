# KIP Portal — AWS EC2 Deployment Guide

Runbook for deploying the full KIP stack (investor portal, admin portal, Express API, Postgres, n8n) to a single AWS EC2 instance, with GitHub Actions automating build + deploy on every push to `main`.

**All repo-side files are already implemented** — this guide tells you what they are, then walks through the server-side setup you do once (Phases 3–6).

> **Live since 5 July 2026** on EC2 Elastic IP `15.240.34.84`, on the real domain since the same week: investor `kip.unoc.com`, admin `portal.kip.unoc.com`, API `api.kip.unoc.com`. DNS: the `unoc.com` zone is managed in the **cPanel Zone Editor** (Namecheap hosting nameservers `dns1/dns2.namecheaphosting.com`), three A records → the Elastic IP. The original pre-domain sslip.io hosts (`*.15-240-34-84.sslip.io`) 308-redirect to the real hosts (see Caddyfile).

---



## Architecture

```
DNS                       EC2 (ap-south-1, t3.medium, Ubuntu 24.04, Elastic IP, 30 GB gp3)
  kip.unoc.com        ──► ┌─ Caddy :80/:443 ──► portal :4002 (Next.js investor + landing pages)
  portal.kip.unoc.com ──► │                 ──► web :4000    (Next.js admin)
  api.kip.unoc.com    ──► │                 ──► api :4001    (Express)
                          ├─ postgres :5432  (internal only, volume kip-pgdata)
                          ├─ n8n :5678       (internal)
                          └─ one-shot `migrate` service on each deploy

GHCR  ◄── GitHub Actions builds & pushes 3 images; deploy job SSHes in and pulls
S3    ◄── documents bucket (existing presign helpers) + nightly pg_dump backups
```

**Decisions baked in** (each swappable later):


| Decision       | Choice                                                                                                            | Later upgrade path                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Database       | Postgres 16 container on the EC2, named volume, nightly `pg_dump` → S3                                            | RDS: change `DATABASE_URL`, delete the `postgres` service |
| TLS / proxy    | Caddy (automatic Let's Encrypt)                                                                                   | CloudFront in front if needed                             |
| Registry       | GHCR under `ghcr.io/unoc-kip/` (auth via `GITHUB_TOKEN`)                                                          | ECR + OIDC                                                |
| Email          | Unset for now — magic links & contact form inactive; **credentials sign-in works**                                | AWS SES SMTP creds in `.env.production`                   |
| Domain mapping | `kip.unoc.com` = investor portal (has the landing pages), `portal.kip.unoc.com` = admin, `api.kip.unoc.com` = API | —                                                         |


---



## What's in the repo (already implemented)


| File                             | Purpose                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/Dockerfile`            | Production API image. Also the **migrate/seed job image** — ships the full workspace so `pnpm db:migrate` / `db:seed` work inside it. `EXPOSE 4001`.                                       |
| `apps/web/Dockerfile`            | Admin portal image. `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_PORTAL_URL` are **build args** (Next.js bakes them into the client bundle).                                                       |
| `apps/portal/Dockerfile`         | Investor portal image. `NEXT_PUBLIC_API_URL` build arg.                                                                                                                                    |
| `.dockerignore`                  | Excludes node_modules/.next/dist/.git/env files from build context.                                                                                                                        |
| `apps/portal/src/app/page.tsx`   | Has `export const dynamic = "force-dynamic"` — the home page reads the open window from the DB, and CI Docker builds have no DB, so it must not be statically generated.                   |
| `deploy/docker-compose.prod.yml` | The full production stack. Goes to `/opt/kip/` on the server.                                                                                                                              |
| `deploy/Caddyfile`               | Reverse proxy + automatic HTTPS for the three hosts. Goes to `/opt/kip/`.                                                                                                                  |
| `deploy/.env.production.example` | Env template. Copy to `/opt/kip/.env.production` and fill in. **Values are read literally — no** `${VAR}` **interpolation — so** `DATABASE_URL` **repeats the postgres password in full.** |
| `.github/workflows/ci.yml`       | Branch/PR checks: install → `db:build` → `typecheck` → `test`.                                                                                                                             |
| `.github/workflows/deploy.yml`   | On push to `main`: checks → build 3 images → push to GHCR (`unoc-kip` hardcoded lowercase — Docker rejects the uppercase org name) → SSH to EC2 → pull, migrate, `up -d`.                  |


Design notes:

- The Next.js images deliberately **do not use** `output: "standalone"` — the `serverExternalPackages` + webpack-externals workaround in both `next.config.mjs` files depends on pnpm's node_modules layout, which standalone file-tracing breaks. Runtime stages ship the whole workspace instead: bigger image, zero risk.
- The API runs under **tsx, not plain node** — `@kip/shared`'s package entry is raw TypeScript (`src/index.ts`), which node can't load. `tsc` still runs at build time as a compile check.
- The Next.js builder stages set a **dummy** `DATABASE_URL` — `@kip/db` instantiates Sequelize at import time and `next build` imports it while collecting page data; it never connects during the build. Runtime containers get the real URL from `.env.production`.
- App secrets (DB password, `NEXTAUTH_SECRET`, S3 keys) **never pass through GitHub Actions** — they live only in `/opt/kip/.env.production` on the server.

Local sanity checks:

```bash
# compose file parses (needs any .env.production next to it):
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.production.example config

# images build (slow first time):
docker build -f apps/api/Dockerfile -t kip-api .
docker build -f apps/web/Dockerfile -t kip-web \
  --build-arg NEXT_PUBLIC_API_URL=https://api.kip.unoc.com \
  --build-arg NEXT_PUBLIC_PORTAL_URL=https://kip.unoc.com .
docker build -f apps/portal/Dockerfile -t kip-portal-app \
  --build-arg NEXT_PUBLIC_API_URL=https://api.kip.unoc.com .
```

---



## Phase 3 — AWS provisioning (one-time, manual)

1. **EC2**: Ubuntu 24.04 LTS, `t3.medium` (2 vCPU / 4 GB — Next.js SSR + Postgres + n8n need the headroom), 30 GB gp3, region `ap-south-1`.
2. **Elastic IP**: allocate and associate (IP must survive restarts — DNS points here).
3. **Security group**:

  | Port                                          | Source                                                                                                                                                                                                                            |
  | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 22                                            | 0.0.0.0/0 — **GitHub Actions must SSH in to deploy**; "your IP only" makes the deploy job fail with `dial tcp :22: i/o timeout`. Key-only auth (Ubuntu default) makes this acceptable; tighten later via SSM or GitHub IP ranges. |
  | 80, 443                                       | 0.0.0.0/0                                                                                                                                                                                                                         |
  | Nothing else. Postgres/n8n are never exposed. |                                                                                                                                                                                                                                   |

4. **IAM instance role** with S3 read/write on the documents bucket + a backups bucket (used by the backup cron; the API's presigner uses the `S3_`* env keys).
5. **Install Docker + AWS CLI v2** (Ubuntu 24.04 no longer ships an `awscli` apt package):
  ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker ubuntu   # re-login after
   sudo apt-get update && sudo apt-get install -y unzip
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
   unzip -q awscliv2.zip && sudo ./aws/install && rm -rf aws awscliv2.zip
  ```
6. **Deploy key for GitHub Actions**: on your machine, `ssh-keygen -t ed25519 -f kip-deploy` → append `kip-deploy.pub` to `~/.ssh/authorized_keys` on the EC2. The private key becomes the `EC2_SSH_KEY` GitHub secret.
7. **GHCR pull auth** on the EC2: create a GitHub classic PAT with only `read:packages`, then `docker login ghcr.io -u <your-username> -p <PAT>`.
8. **Server directory**:
  ```bash
   sudo mkdir -p /opt/kip && sudo chown ubuntu:ubuntu /opt/kip
   # copy deploy/docker-compose.prod.yml and deploy/Caddyfile there;
   # create .env.production from deploy/.env.production.example:
   #   - NEXTAUTH_SECRET:  openssl rand -base64 32
   #   - POSTGRES_PASSWORD + the same password inside DATABASE_URL
   #     (openssl rand -hex 16 — hex is URL-safe inside DATABASE_URL)
   #   - DATABASE_URL must keep ?sslmode=disable — packages/db/src/ssl.ts
   #     treats the "postgres" hostname as hosted Postgres and demands TLS,
   #     which the plain container doesn't support
   #   - S3 credentials
  ```
9. **DNS**: A records for `kip.unoc.com`, `portal.kip.unoc.com`, `api.kip.unoc.com` → the Elastic IP.

✅ **Checkpoint**: `ssh -i kip-deploy ubuntu@<EIP> docker ps` works from your machine.

---



## Phase 4 — GitHub repo configuration

**Settings → Secrets and variables → Actions**:


| Type     | Name                     | Value                                    |
| -------- | ------------------------ | ---------------------------------------- |
| Secret   | `EC2_HOST`               | Elastic IP                               |
| Secret   | `EC2_USER`               | `ubuntu`                                 |
| Secret   | `EC2_SSH_KEY`            | contents of the `kip-deploy` private key |
| Variable | `NEXT_PUBLIC_API_URL`    | `https://api.kip.unoc.com`               |
| Variable | `NEXT_PUBLIC_PORTAL_URL` | `https://kip.unoc.com`                   |


✅ **Checkpoint**: push a branch → CI green. Merge to `main` → three images appear under the org's Packages → deploy job green.

---



## Phase 5 — First deploy & seed

The pipeline does pull → migrate → up automatically. For the very first run (or manually):

```bash
cd /opt/kip
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml run --rm migrate              # applies migrations
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml run --rm migrate pnpm db:seed # UAT seed data (idempotent)
```



### Verification checklist

- [ ] `docker compose -f docker-compose.prod.yml ps` — all services `Up`, postgres `healthy`
- [ ] `curl https://api.kip.unoc.com/health` returns OK over valid TLS
- [ ] `https://kip.unoc.com` shows landing pages **and the seeded OPEN window** ("Phase 1 — Round 1") — proves live DB reads
- [ ] Admin sign-in at `https://portal.kip.unoc.com` with `admin@kip.unoc.co.ug` / seed password
- [ ] Investor sign-in at `https://kip.unoc.com` with `investor@gulfpetrochem.ae`
- [ ] A **mutation** works end-to-end (e.g. approve a pending investor, or window open/close) — this is what the Vercel demo could never do
- [ ] INVESTOR logging into the admin portal is blocked; staff logging into the investor portal is blocked

---



## Phase 6 — Backups & aftercare

**Nightly Postgres backup to S3** — `crontab -e` on the EC2:

```cron
15 2 * * * docker compose -f /opt/kip/docker-compose.prod.yml exec -T postgres pg_dump -U kip kip_portal | gzip | aws s3 cp - s3://<backup-bucket>/pg/kip_portal_$(date +\%F).sql.gz
```

(Requires `aws` CLI on the host; auth via the instance role. Add an S3 lifecycle rule for retention.)

**If the hostnames ever change again** (done once already: sslip.io → kip.unoc.com, July 2026): create/update the A records (cPanel Zone Editor); swap the hosts in `deploy/Caddyfile`, the two `NEXTAUTH_URL`s in `deploy/docker-compose.prod.yml`, the four URLs in `.env.production` (server) and `.env.production.example`, and the two GitHub Actions variables; then push to `main` — the client bundles must be **rebuilt** because `NEXT_PUBLIC_`* is baked in at image build time. Copy the updated Caddyfile + compose to `/opt/kip/`, `docker compose up -d` and `docker compose restart caddy` (the bind-mounted Caddyfile is not reloaded automatically). Also update the CORS origins on the S3 documents bucket.

**Later upgrades**, in rough priority order:

1. **SES SMTP** creds into `.env.production` → magic links + contact form go live.
2. **RDS**: create instance, `pg_dump | pg_restore`, point `DATABASE_URL` at it, remove the `postgres` service.
3. **n8n workflows**: import from `n8n/workflows/`, then uncomment `N8N_BASE_URL` + `N8N_WEBHOOK_SECRET` (≥ 8 chars) in `.env.production` — an empty secret crashes API startup.
4. n8n UI access for configuration: SSH tunnel only (`ssh -L 5678:localhost:5678 ...`) — don't expose it publicly.

---



## Rollback

Images are also tagged by commit SHA. To roll back:

```bash
cd /opt/kip
# edit docker-compose.prod.yml image tags from :latest to :<good-sha>, then
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d
```

Database migrations are forward-only — for data disasters, restore the nightly dump rather than running `migrate:down`.