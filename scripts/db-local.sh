#!/usr/bin/env bash
# Start a throwaway local Postgres 16 cluster at /tmp/pg and create the `snacker` database.
# Usage: pnpm db:local   (then DATABASE_URL=postgres://postgres@localhost:5432/snacker)
set -euo pipefail
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
DATA=${PGDATA_LOCAL:-/tmp/pg/data}
run_pg() { if [ "$(id -u)" = "0" ]; then su postgres -c "$1"; else bash -c "$1"; fi; }
mkdir -p "$(dirname "$DATA")"
if [ "$(id -u)" = "0" ]; then chown postgres:postgres "$(dirname "$DATA")"; fi
if [ ! -f "$DATA/PG_VERSION" ]; then
  run_pg "$PGBIN/initdb -D $DATA --auth=trust --encoding=UTF8 --locale=C.UTF-8" >/dev/null
fi
if ! run_pg "$PGBIN/pg_ctl -D $DATA status" >/dev/null 2>&1; then
  run_pg "$PGBIN/pg_ctl -D $DATA -l /tmp/pg/log -o '-k /tmp/pg -p 5432' start" >/dev/null
fi
if ! run_pg "psql -h localhost -p 5432 -tAc \"SELECT 1 FROM pg_database WHERE datname='snacker'\"" | grep -q 1; then
  run_pg "createdb -h localhost -p 5432 snacker"
fi
echo "Postgres ready: DATABASE_URL=postgres://postgres@localhost:5432/snacker"
