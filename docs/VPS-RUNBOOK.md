# VPS production-demo runbook

## Before deployment

- Isolate the application in its own Docker Compose project and bind its ports to localhost.
- Route `swoop.video` through the checked-in Cloudflare Worker.
- Allow inbound TCP 80 and 443; restrict SSH by key and firewall policy.
- Install current Docker Engine and the Compose plugin.
- Copy the repository without any resumes, private documents, or real client data.

## Configure

Create `.env` from `.env.example`:

```dotenv
POSTGRES_PASSWORD=<generated-random-secret>
```

Create `/etc/rook/caddy.env` outside the repository:

```dotenv
ROOK_ORIGIN_HOST=<vps-ip-address>
ROOK_ORIGIN_TOKEN=<generated-random-secret>
```

Store `ORIGIN_HOST` and the matching `ORIGIN_TOKEN` as encrypted Worker secrets. Never commit either populated environment file.

## Start and inspect

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 web api document-ai postgres
curl -fsS https://swoop.video/health
```

## Update

```bash
git pull --ff-only
docker compose up -d --build
```

## Roll back

Deploy from a tagged commit:

```bash
git checkout <known-good-tag>
docker compose up -d --build
```

## Production hardening boundary

The production demo has PostgreSQL migrations and private origin routing, but it intentionally contains synthetic data only. Before any real environmental or client data is used, add authenticated user/tenant isolation, automated database backups, encrypted object storage, malware scanning for uploads, managed secret rotation, rate limits, structured logs, alerting, retention policies, Canadian data-residency review, an incident procedure, and professional validation of every environmental workflow.
