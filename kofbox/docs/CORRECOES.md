# CORREÇÕES — spec original × Kof 0.5.0-beta real

Este documento lista tudo que a spec original
(`../projeto_kofbox_com_ui_e_multi_linguagem.md`) inventou e como foi
corrigido no MVP. Leitura recomendada para jurados que conhecem a linguagem.

## 1. Sintaxe inexistente na spec → sintaxe real

| Spec original (não compila) | Kof 0.5.0-beta real (usado) |
|---|---|
| `module kofbox.container` | sem `module`; arquivos do mesmo diretório = mesmo módulo |
| `import kof.process` / `kof.os` / `kof.web` / `kof.json` | stdlib é **global**, sem import (`web`, `json`, `config`, `time`, `log`, `Path`, `File`, `listOf`, `mapOf`). `import` só para Java (`import java.lang.Runtime`) |
| `struct ExecutionRequest { id: string ... }` | `record ExecutionRequest(String id, String language, String code)`; acesso via `req.id()` |
| `fun runCode(req: ExecutionRequest): ExecutionResult` | `ExecutionResult runCode(String id, String language, String code)` (tipo antes, sem `fun`, sem `:`) |
| `val timestamp = os.timestamp()` | `var stamp = time.now()` (Long) |
| `List<string>`, `Map<string, X>` | `listOf(...)`, `mapOf(...)` (globais) |
| `os.writeFile(fileName, req.code)` | `var path = Path(filePath)` + `path.writeText(code)` |
| `process.run(command, args)` | **existe** (`process.run("timeout", "15s", runner, file)` + `.exitCode/.stdout/.stderr`). Correção posterior: a doc dizia "planejado", mas o runtime 0.5.0-beta já tem `kof_process_run` — migramos e removemos toda a interop Java |
| `web.server(port) { web.static(...); post(...) }` | `var app = web.app()` + `app.get/post/use` + `app.listen(port)`; sem `web.static` |
| `json.parse<T>(req.body)` / `json.response(200, x)` | `json.decode<ExecutionRequest>(body())` + `return json.encode(result)` (handler retorna String) |
| `var history = Map<...>()` global | sem variável global; histórico em arquivo `history.jsonl` via `Path.writeText/appendText`, `File.readText` |
| `src/main.kf` com `import kofbox.daemon` | `Main.kf` + `Daemon.kf` + `Container.kf` no mesmo diretório, chamadas diretas (`startDaemon(port)`) |
| `kof.mod` | Kof não exige manifesto; diretório com `.kf` + `kof run Main.kf` basta |

## 2. Pegadinhas reais descobertas por teste (e resolvidas)

1. **`new Scanner(p.getInputStream())` falha em runtime** (`NoSuchMethodError`
   para `Object`). Correção: atribuir antes com tipo explícito —
   `InputStream outs = p.getInputStream()` + `new Scanner(outs)`.
2. **`ProcessBuilder(List)` não resolve** (Kof faz match exato de assinatura,
   `ArrayList` ≠ `List`). Correção: usar `Runtime.exec(String)` (tokeniza por
   espaço — seguro pois só passamos runner + caminho sem espaços).
3. **`p.waitFor(timeout, TimeUnit)` não resolve** (SEM025). Correção: prefixo
   GNU `timeout 15s` no comando (exit 124 em estouro).
4. **Múltiplos `main()` no mesmo diretório = erro PKG002**. Correção: um único
   `main()` em `Main.kf`; resto são funções/records.
5. **`config.get("HOME")` retorna null** (convenção `KOF_`): usar
   `config.env("HOME")` para env direto e `config.int("server.port", 8080)`
   para porta.
6. **Compilar o diretório, não o arquivo isolado**: `kof run Main.kf` compila
   o módulo inteiro (todos os `.kf` do diretório) — é assim que `Main.kf`
   enxerga `runCode`/`startDaemon`.
7. **Middleware `app.use { ... return null }` quebra todas as rotas**
   (testado 05/10/2026: todo request retorna
   `{"error": "handler error: 'void java.lang.Object.intValue()'"}`).
   Correção: sem `app.use`; log (`log.info("REQ ...")`) dentro de cada
   handler. Também evitado `return null` em qualquer handler.
8. **Int capturado por lambda falha em concatenação**: `port` (Int) usado
   direto em `"..." + port` dentro de handler dá o mesmo `intValue` error.
   Correção: `var portStr = "" + port` antes de `web.app()` e capturar a
   String (documentado via teste A/B em `docs/TESTES.md`).

## 3. Comportamento mantido da spec (intenção preservada)

- API `POST /api/execute` com `{id, language, code}` → `{id, language,
  exitCode, stdout, stderr, status}` (`SUCCESS` se exit 0).
- `GET /api/history` para a UI (formato mudou para JSONL embrulhado — ver `API.md`).
- Dashboard com seletor de linguagem + textarea + output (visual melhorado,
  com health, status e histórico).
- Arquivo temporário por execução + limpeza (`path.delete()`).
