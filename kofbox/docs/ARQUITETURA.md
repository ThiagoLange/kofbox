# ARQUITETURA — KofBox MVP

## Diagrama real

```
Browser ──HTTP──► Daemon.kf (kof.web, JVM, virtual threads por conexão)
  GET  /              → loadIndex(): public/index.html via File.readText (+fallback)
  GET  /styles.css    → tema próprio (text/css, com cache)
  GET  /app.js        → lógica da UI (javascript, com cache)
  GET  /api/health    → {"status":"UP","service":"kofbox","port":N}
  POST /api/execute    → json.decode<ExecutionRequest>(body())
                         → Container.runCode(id, language, code)
                         → appendHistory(json.encode(result))
                         → json.encode(result)
  GET  /api/history    → history.jsonl (JSONL) embrulhado em JSON

Container.kf
  normalizeLanguage → whitelist python|javascript|ruby|bash (fallback bash)
  extensionFor/runnerFor → py/python3, js/node, rb/ruby, sh/bash
  arquivo /tmp/kofbox_<time.now()>_<Seq.n>.<ext> via Path.writeText
  Runtime.getRuntime().exec("timeout 15s <runner> <file>")
  p.waitFor() (bloqueante; cada handler roda em virtual thread)
  Scanner(InputStream) stdout + stderr (delimitador \A)
  path.delete() + status SUCCESS/FAILED

Main.kf
  config.int("server.port", 8080) → startDaemon(port)
```

## Arquivos e responsabilidades

| Arquivo | Responsabilidade | Não faz |
|---|---|---|
| `Main.kf` | ler porta, subir daemon | nada de HTTP ou execução |
| `Daemon.kf` | rotas, JSON, histórico, HTML | nada de processos |
| `Container.kf` | temp file, exec, captura, timeout | nada de HTTP |
| `public/` (html+css+js) | UI autocontida (fetch na API) | nada de lógica de sandbox; sem CDN (CSP `default-src 'self'` do kof.web bloqueia externos e inline — por isso CSS/JS próprios servidos pelo daemon com `headerSet` + cache) |
| `history.jsonl` | persistência append-only | nada de query (v2: SQLite) |

## Concorrência

`kof.web` trata cada conexão em virtual thread (JVM). `p.waitFor()` bloqueia
só a thread do request — requests concorrentes progridem em paralelo.
Sem `spawn/await` no MVP (execução já é paralela por conexão).

## Por que JSONL para histórico?

- Sem estado global em Kof (sem top-level var) e sem `kof.db` no MVP.
- `appendText`/`readText` são as APIs mais testadas do `kof.io`.
- Persistente entre restarts (bom para demo).
- Limite: leitura integral do arquivo por request — suficiente para hackathon;
  v2 migra para `kof.db`/SQLite com paginação (ver ROADMAP).

## Limites conhecidos (honestos para o júri)

- `kof.process` não existe → interop Java (JVM-only; native/js fora do escopo).
- Sem isolamento real (não é Docker/gVisor) → ver SEGURANCA.md.
- `waitFor` bloqueante + `timeout 15s` externo (sem kill granular).
- Histórico sem paginação; HTML servido via `readText` (sem cache/mime completo).
