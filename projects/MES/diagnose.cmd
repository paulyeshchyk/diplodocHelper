# 1) проверить, что plugins свежий
docker run --rm mdh-docs ls -la /app/plugins/cli/*.module.ts | head

# 2) проверить, что yaml на месте
docker run --rm mdh-docs cat /app/plugins.config.yaml | head

# 3) dry-run pipeline (без билда)
docker run --rm mdh-docs node ./plugins/run-pipeline.js --dry-run
# ожидаемо: [run-pipeline] config: /app/plugins.config.yaml