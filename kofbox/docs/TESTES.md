# TESTES — KofBox MVP (executado 13/10/2026, Kof 0.6.4, target JVM)

## 1. Checagem estática

```bash
kof check kofbox
# checked 3 file(s) — no errors
# (apenas warning MEM014 esperado: web.app() nunca fechado — é servidor)
```

## 2. Subida

```bash
KOF_SERVER_PORT=8095 kof run kofbox/Main.kf
# KofBox iniciando... porta 8095
# KofBox rodando em http://localhost:8095
```

## 3. E2E (todos PASS)

| # | Caso | Esperado | Obtido |
|---|---|---|---|
| 1 | `GET /api/health` | `{"status":"UP",...}` | `{"status":"UP","service":"kofbox","port":8095}` ✅ |
| 2 | `GET /` | HTML do dashboard | `<!DOCTYPE html>...KofBox - Dashboard` ✅ |
| 3 | python `print(40+2)` | stdout `42`, SUCCESS | exit 0, `42\n` ✅ |
| 4 | node `console.log(6*7)` | stdout `42`, SUCCESS | exit 0, `42\n` ✅ |
| 5 | bash `echo oi-kofbox` | stdout, SUCCESS | exit 0 ✅ |
| 6 | ruby `puts 1+2` | stdout `3`, SUCCESS | exit 0, `3\n` ✅ |
| 7 | python `raise Exception("boom")` | FAILED + stderr traceback | exit 1, traceback completo ✅ |
| 8 | `language: cobol` | fallback bash | `language: bash`, SUCCESS ✅ |
| 9 | `id: ""` | servidor gera `box-<ts>` | `box-1791204695095` ✅ |
| 10 | `GET /api/history` | 7 entradas JSONL | 7 linhas (py1…autoid) ✅ |
| 11 | bash `sleep 30` | morte em ~15s, exit 124 | 15.0s, exit 124, FAILED ✅ |

## 4. Melhorias 🔴 1–4 (testado após implementação)

| # | Caso | Esperado | Obtido |
|---|---|---|---|
| 12 | body `{invalid json` | JSON de erro, exit -1 | `{"id":"unknown",...,"stderr":"expected string at 1"}` ✅ |
| 13 | `code: ""` | FAILED, exit -1, sem executar | `stderr: "codigo vazio..."` ✅ |
| 14 | `code` 70KB+ | SUCCESS, sem teto (proteção via proxy/timeout) | ✅ |
| 15 | output 200KB (`print("x"*200000)`) | SUCCESS rápido, stdout íntegro | 0.1s, 200001 chars ✅ (antes: travava 15s e perdia output) |
| 16 | 5× POST paralelos com marcadores | cada um recebe o próprio output | cc1–cc5 corretos ✅ (UUID, sem colisão) |
| 17 | regressão node/ruby/erro | inalterado | ✅ + traceback mostra nome UUID |

## 5. Melhorias 🟡 (testado após implementação)

| # | Caso | Esperado | Obtido |
|---|---|---|
| 25 | `GET /styles.css` → `text/css`, idêntico ao arquivo | ✅ |
| 26 | `GET /app.js` → `application/javascript`, idêntico + `node --check` OK | ✅ |
| 27 | HTML sem `onclick`/`onchange`/`<script>`/`<style>` inline (grep vazio) | ✅ |
| 28 | Todos os ids usados pelo JS existem no HTML; tags balanceadas | ✅ |

| # | Caso | Esperado | Obtido |
|---|---|---|---|
| 18 | `GET /api/health` completo | runners + timeout + auth flag | `runners:{python,...,duckdb:true}`, `timeout_seconds:15`, `auth_required:false` ✅ |
| 19 | `GET /api/history` array | objetos reais + total | `{"history":[...],"total":2}` ✅ |
| 20 | `?limit=1` / `?limit=abc` | última 1 / fallback 50 | ✅ |
| 21 | sem key com `KOF_KOFBOX_API_KEY` setada | unauthorized em execute e history | exit -1 ✅ |
| 22 | key errada / key certa | bloqueia / executa | ✅ |
| 23 | `GET /` Content-Type | `text/html` (renderiza) | `text/html; charset=utf-8` ✅ (antes: `text/plain`) |
| 24 | `kof test kofbox/Container.kf` | 17 testes (lua/perl/r, awk/dart/julia, go, sqlite/duckdb, rust, java, kof/portukof, pg/mysql, sem teto) | 17 PASS ✅ |

## 6. UI v2 autocontida (sem CDN)

| # | Caso | Resultado |

## 4. Testes de isolamento de bug (compilador)

| Teste | Resultado |
|---|---|
| health literal (sem concat) | ✅ funciona |
| health + `portStr` (String capturada) | ✅ funciona |
| health + middleware `app.use { return null }` | ❌ quebra tudo (`intValue` error) → removido |
| health + `port` (Int) direto no handler | ❌ mesmo erro → usar `portStr` |

## 5. Limpeza

- Temp files `/tmp/kofbox_*` deletados após cada execução (`path.delete()`).
- `history.jsonl` de teste removido; servidor de teste desligado.
- Para repetir: `./run.sh` (porta 8080) + curls de `docs/API.md`.
