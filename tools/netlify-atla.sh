#!/usr/bin/env bash
# Netlify's "ignore" step (netlify.toml): exit 0 skips the deploy, exit 1 goes ahead. A skipped deploy spends no credits.
#   - only production (the main branch) is published; pull-request previews and branch deploys are skipped,
#     the pages are checked locally and in GitHub Actions instead
#   - a push that changes only working files (docs, tests, database scripts, tools, notes) is skipped too:
#     the published site would be byte for byte the same
# With no earlier deploy to compare against, or anything unclear, it deploys.

if [ "$CONTEXT" != "production" ]; then
  echo "Önizleme atlandı ($CONTEXT): yalnız main yayınlanır."
  exit 0
fi
if [ -z "$CACHED_COMMIT_REF" ] || [ "$CACHED_COMMIT_REF" = "$COMMIT_REF" ]; then
  exit 1
fi
if git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- . \
    ':(exclude)docs' ':(exclude)tests' ':(exclude)supabase' ':(exclude)tools' ':(exclude).github' ':(exclude).claude' \
    ':(exclude)README.md' ':(exclude)DESIGN.md' ':(exclude)package.json' ':(exclude)package-lock.json' \
    ':(exclude)playwright.config.mjs' ':(exclude).gitignore'; then
  echo "Yalnız çalışma dosyaları değişti: yayın atlandı."
  exit 0
fi
exit 1
