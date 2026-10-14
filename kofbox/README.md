# 📦 KofBox — Sandbox multi-linguagem com Dashboard Web, em Kof

> **Status:** MVP funcional em **Kof real (0.6.4, target JVM)**.
> Todo o backend (`Main.kf`, `Container.kf`, `Daemon.kf`) é 100% linguagem Kof.
> A spec original (`../projeto_kofbox_com_ui_e_multi_linguagem.md`) foi usada como
> ponto de partida, **corrigida** para a sintaxe e stdlib reais do Kof —
> ver [`docs/CORRECOES.md`](docs/CORRECOES.md).

## O que é

O KofBox recebe código-fonte (Python, JavaScript/Node, Ruby, Bash) via API REST,
executa em processo isolado com timeout, devolve stdout/stderr/exit code em JSON
e exibe tudo num **Dashboard Web** servido pelo próprio daemon Kof.

```
[ Browser / Dashboard UI ] ──(HTTP)──► [ KofBox Daemon (Kof) ]
                                              ├─► kof.web (rotas + HTML estático via Path.readText)
                                              ├─► Container.kf (temp file + Runtime.exec)
                                              └─► python3 / node / ruby / bash / lua / perl / R / awk / dart / julia / go / sqlite / duckdb + GNU timeout
```

## Estrutura

```
kofbox/
├── Main.kf            # entrada: lê porta (config) e sobe o daemon
├── Container.kf       # motor multi-linguagem + blocos `test` (kof test)
├── Daemon.kf          # rotas /, /styles.css, /app.js, /api/* (+ cache + headerSet)
├── public/            # index.html + styles.css + app.js (UI autocontida, sem CDN)
├── kof.config         # server.port + opções (api-key, timeout, history-file)
├── run.sh             # ./run.sh [porta]
├── history.jsonl      # criado em runtime (uma linha JSON por execução)
└── docs/              # documentação complementar
    ├── ARQUITETURA.md
    ├── API.md
    ├── SEGURANCA.md
    ├── ROADMAP-HACKATHON.md
    └── CORRECOES.md
```

Cliente desktop em `kof.ui`: ver `../mini/` (KofBox Mini no webview nativo).

## Quickstart (2 min)

```bash
export PATH="$HOME/.kof/bin:$PATH"
cd kofbox

# 1. Checagem estática
kof check Main.kf

# 2. Rodar (porta 8080)
./run.sh
# ou: KOF_SERVER_PORT=9090 kof run Main.kf
# ou: kof serve Main.kf --port 8080

# 3. Abrir http://localhost:8080
```

Teste rápido via curl:

```bash
curl -s http://localhost:8080/api/health
curl -s -X POST http://localhost:8080/api/execute \
  -H 'Content-Type: application/json' \
  -d '{"id":"box-1","language":"python","code":"print(40+2)"}'
curl -s http://localhost:8080/api/history
```

## Linguagens suportadas

| `language`   | runner   | extensão | notas |
|--------------|----------|----------|-------|
| `python`     | python3  | .py      | |
| `javascript` | node     | .js      | |
| `ruby`       | ruby     | .rb      | |
| `bash`       | bash     | .sh      | fallback p/ desconhecidas |
| `lua`        | lua      | .lua     | |
| `perl`       | perl     | .pl      | |
| `r`          | Rscript  | .R       | |
| `awk`        | awk      | .awk     | roda com `/dev/null` de entrada |
| `dart`       | dart     | .dart    | |
| `julia`      | julia    | .jl      | |
| `go`         | go run   | .go      | compila+roda |
| `sqlite`     | sqlite3  | .sql     | `:memory:`, código via argumento |
| `duckdb`     | duckdb   | .sql     | `-c` com o código (saída em tabela) |
| `rust`       | rustc    | .rs      | compila (`--edition 2021`) + roda binário |
| `java`       | java     | .java    | single-file launch (qualquer nome de classe) |
| `postgres`   | docker   | .sql     | container `kofbox-postgres` (auto-criado) |
| `mysql`      | docker   | .sql     | container `kofbox-mysql` (auto-criado) |
| `kof`        | kof      | .kf      | self-hosted (`kof run`) |
| `portukof`   | kof      | .ptkf    | self-hosted (`kof run`, superfície PT) |

Valores desconhecidos caem para `bash` (documentado em `API.md`).

### Postgres e MySQL via Docker

Sem servidor local, o KofBox cria sozinho (`docker run -d`, imagens
`postgres:16`/`mysql:8.4`, senha `kofbox`, banco `kofbox`) e executa via
`docker exec` — **sem porta publicada**, só o daemon alcança. Para resetar:

```bash
docker rm -f kofbox-postgres kofbox-mysql
```

## Configuração

Via `kof.config` ou env (`KOF_` + maiúsculas, env vence):

| Chave | Env | Padrão | Efeito |
|---|---|---|---|
| `server.port` | `KOF_SERVER_PORT` | 8080 | porta do daemon |
| `kofbox.api-key` | `KOF_KOFBOX_API_KEY` | vazio (= sem auth) | exige header `x-api-key` em `/api/execute` e `/api/history` |
| `kofbox.timeout-seconds` | `KOF_KOFBOX_TIMEOUT_SECONDS` | 15 | timeout por execução |
| `kofbox.history-file` | `KOF_KOFBOX_HISTORY_FILE` | `history.jsonl` | caminho do histórico |

```bash
KOF_KOFBOX_API_KEY=segredo ./run.sh 9090
curl -s -X POST localhost:9090/api/execute -H 'x-api-key: segredo' \
  -H 'Content-Type: application/json' \
  -d '{"id":"a1","language":"python","code":"print(1)"}'
```

## Testes

```bash
kof check kofbox              # estática (3 arquivos, 0 erros)
kof test kofbox/Container.kf  # 8 testes (langDef, limites, runCode)
```

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| `porta X já está em uso` | servidor antigo rodando | `lsof -ti:X \| xargs kill -9` ou outra porta |
| `kof: command not found` | PATH | `export PATH="$HOME/.kof/bin:$PATH"` |
| runners `false` no `/api/health` | interpretador ausente | instale `python3`/`node`/`ruby` |
| dashboard como texto puro | regressão de Content-Type | deve ser `text/html` (via `headerSet`); reporte |
| `address already in use` no log | resto de outro teste | mate pelo `lsof` acima |

## Decisões técnicas (resumo)

- **`kof.process` NATIVO**: `process.run(programa, args...)` existe no Kof 0.6.4
  (descoberta posterior — a doc da stdlib estava desatualizada) e devolve
  `Result` com `.exitCode/.stdout/.stderr`. Zero interop Java.
- **Sem `web.static`**: não existe. O `/` lê `public/index.html` via
  `File.readText` e devolve como String (com fallback embutido).
- **Timeout real**: `waitFor(timeout)` não resolve no Kof atual → prefixo
  `timeout 15s` (GNU coreutils) em todo comando.
- **Histórico em JSONL**: `history.jsonl`, uma linha por execução (persistente).
- **Sem `module/struct/fun/import kof.x`**: sintaxe real é
  `record`, `Funções Tipo nome(...)`, `main()`, stdlib global (`web`, `json`,
  `config`, `time`, `log`, `Path/File`), import só para Java.

Detalhes: `docs/ARQUITETURA.md`, `docs/API.md`, `docs/SEGURANCA.md`,
`docs/CORRECOES.md`, `docs/ROADMAP-HACKATHON.md`.
