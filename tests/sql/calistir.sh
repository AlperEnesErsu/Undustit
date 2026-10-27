#!/usr/bin/env bash
# Runs every migration in order on an empty Postgres, runs 4 to 8 a second time (they must be safe to
# repeat), then the checks. Needs psql and the usual PG* variables (PGHOST, PGPORT, PGUSER, PGPASSWORD).
#   bash tests/sql/calistir.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGCLIENTENCODING=UTF8 PGOPTIONS="--client-min-messages=warning"
run(){ echo "== $1"; psql -v ON_ERROR_STOP=1 -q -X -f "$1"; }
run tests/sql/0-supabase-taklit.sql
for f in supabase/sema.sql supabase/2-fikirler.sql supabase/3-hiz.sql supabase/4-acilis.sql supabase/5-guven.sql supabase/6-gorsel.sql supabase/7-firma.sql supabase/8-gizli.sql; do run "$f"; done
run supabase/4-acilis.sql
run supabase/5-guven.sql
run supabase/6-gorsel.sql
run supabase/7-firma.sql
run supabase/8-gizli.sql
run tests/sql/kontrol.sql
