# API — KofBox MVP

Base: `http://localhost:8080` (ou `KOF_SERVER_PORT`).

## Auth (opcional)

Se `kofbox.api-key` configurada, `/api/execute` e `/api/history` exigem
header `x-api-key`. Sem ela (ou errada): `{"...","exitCode":-1,...,
"stderr":"unauthorized: x-api-key invalida ou ausente"}`.
`/api/health` e `/` seguem abertos (`health` informa `"auth_required"`).
Sem status 401: o `kof.web` Fase 1 não define status custom (sempre 200/404).

## GET /

Dashboard HTML (`public/index.html`, servido como `text/html` via
`headerSet`, com cache em memória e fallback embutido).

## GET /api/health

```json
{"status":"UP","service":"kofbox","port":8080,"timeout_seconds":15,
 "auth_required":false,"runners":{"python":true,"node":true,"ruby":true,"bash":true}}
```

`runners` indica quais interpretadores existem no PATH do servidor.

## POST /api/execute

Request:

```json
{"id":"box-1","language":"python","code":"print(40+2)"}
```

- `id`: se `""`, o servidor gera `box-<time.now()>`.
- `language`: `python|javascript|ruby|bash` (outros → `bash`).
- `code`: fonte completa; gravado em `/tmp/kofbox_<ts>_<n>.<ext>`.

Response (200, JSON):

```json
{
  "id":"box-1","language":"python","exitCode":0,
  "stdout":"42\n","stderr":"","status":"SUCCESS"
}
```

- `status` = `SUCCESS` se `exitCode == 0`, senão `FAILED`.
- Timeout (15s) → exit `124` (GNU timeout), `status FAILED`, stderr pode vir vazio.
- `exitCode: -1` = nem chegou a executar (validação). Casos:
  - body com JSON inválido → `{"id":"unknown","language":"unknown","exitCode":-1,...}` (HTTP 200 com erro no JSON)
  - `code` vazio → `stderr: "codigo vazio: nada para executar"`
  - sem teto de tamanho: qualquer código executa (proteja com proxy reverso + timeout + rate limit em exposição)
  - falha ao gravar temp file → `stderr: "falha ao gravar arquivo temporario"`

Exemplos:

```bash
curl -s -X POST localhost:8080/api/execute -H 'Content-Type: application/json' \
  -d '{"id":"py1","language":"python","code":"print(sum(range(10)))"}'

curl -s -X POST localhost:8080/api/execute -H 'Content-Type: application/json' \
  -d '{"id":"js1","language":"javascript","code":"console.log(6*7)"}'

curl -s -X POST localhost:8080/api/execute -H 'Content-Type: application/json' \
  -d '{"id":"sh1","language":"bash","code":"echo oi; uname -s"}'

curl -s -X POST localhost:8080/api/execute -H 'Content-Type: application/json' \
  -d '{"id":"rb1","language":"ruby","code":"puts 1+2"}'
```

## GET /api/history

Array JSON real com as últimas execuções (do JSONL em disco):

```json
{"history":[{"id":"...","language":"python","exitCode":0,
             "stdout":"...","stderr":"","status":"SUCCESS"}],"total":2}
```

- `?limit=N` (padrão 50, teto 500; inválido → 50).
- Histórico vazio: `{"history":[],"total":0}`.

## Códigos de erro

| Situação | Resposta |
|---|---|
| Rota inexistente | `404` (null do handler) |
| `code` vazio | executa arquivo vazio (exit 0, stdout vazio) — v2 valida e retorna 422 |
| Comando `timeout`/runner ausente | exit 127, `FAILED` |
| Servidor fora | conexão recusada (UI mostra OFFLINE) |
