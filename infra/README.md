# Infrastructure

Production deployment targets:

| Layer | Service |
|-------|---------|
| Web (Next.js) | AWS App Runner or ECS Fargate, behind ALB |
| API (Express) | AWS App Runner or ECS Fargate, behind ALB |
| Database | AWS RDS Postgres 16 |
| Object storage | S3 or Cloudflare R2 (S3-compatible) |
| Email | AWS SES |
| n8n | EC2 t3.small (with EBS) or Fly.io app, separate VPC SG |
| DNS / TLS | Route53 + ACM |
| Secrets | AWS Secrets Manager |
| Logs | CloudWatch + (optional) Logflare/Datadog |

## Environments

- `dev` — local docker-compose
- `staging` — full AWS stack, shared with Lilian for UAT
- `prod` — same shape as staging, RDS multi-AZ, daily snapshots

## Secrets to provision

See `.env.example` at the repo root. Each app has its own `.env.example` with
only the subset it needs.

## Things to harden before prod

- Rotate `NEXTAUTH_SECRET` and `N8N_WEBHOOK_SECRET`
- Restrict RDS SG to API/web tasks only
- Enable WAF on the ALB with rate limiting per IP
- Set CSP and HSTS headers in Next config
- Enable RDS encryption-at-rest and SES signed sending domain
