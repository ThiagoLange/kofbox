# 📦 KofBox — Sandbox multi-linguagem em Kof puro

Rode código de **19 linguagens** pelo navegador ou API REST, com execução real
em processo isolado (timeout, sem mock) — backend 100% linguagem Kof, sem
Spring/Express.

## Linguagens (19)

| Grupo | Linguagens |
|---|---|
| Clássicas | Python, JavaScript (node), Ruby, Bash |
| Scripting | Lua, Perl, R, Awk, Dart, Julia |
| Compiladas | Go (`go run`), Rust (rustc), Java (single-file) |
| SQL | SQLite (`:memory:`), DuckDB (`-c`), Postgres e MySQL (via Docker auto-provisionado) |
| Casa | Kof (`.kf`), PortuKof (`.ptkf`) — self-hosted |

Qualquer outra cai no Bash; sem teto de tamanho.

## Instalação

```bash
# 1. Toolchain Kof 0.6.4 (Linux x86_64)
cd /tmp
curl -sL -o kof.tgz "https://github.com/KofLang/Kof4j/releases/download/kof-0.6.4-linux-x86_64/kof-0.6.4-linux-x86_64.tar.gz"
mkdir -p /tmp/kof064 && tar -xzf kof.tgz -C /tmp/kof064
mv /tmp/kof064/kof-0.6.4-linux-x86_64 "$HOME/.kof"
export PATH="$HOME/.kof/bin:$PATH"

# 2. KofBox
git clone https://github.com/ThiagoLange/kofbox.git
cd kofbox/kofbox
./run.sh              # http://localhost:8080
```

Runtimes das linguagens vêm do sistema (`python3`, `node`, `docker`...);
o `/api/health` diz quais foram encontrados. Postgres/MySQL sobem
sozinhos via Docker (sem porta publicada; `docker rm -f kofbox-postgres
kofbox-mysql` para resetar).

## Testando

```bash
curl -X POST localhost:8080/api/execute \
  -H 'Content-Type: application/json' \
  -d '{"id":"t","language":"python","code":"print(6*7)"}'
# → {"stdout":"42\n","status":"SUCCESS"}
```

## Estrutura

```
kofbox/           # app (detalhes em kofbox/README.md)
├── Main.kf       # entrada + porta via config
├── Container.kf  # motor multi-linguagem (temp UUID + timeout por run)
├── Daemon.kf     # rotas /, /api/health|execute|history
├── public/       # dashboard (abas por linguagem, sem CDN)
├── kof.config    # server.port + api-key + timeout
├── run.sh        # ./run.sh [porta]
└── docs/         # API, arquitetura, segurança, testes, correções
mini/             # cliente desktop em kof.ui (consome a API)
data/             # apoio local
projeto_kofbox_com_ui_e_multi_linguagem.md  # especificação original
```

## Docs

- [`kofbox/README.md`](kofbox/README.md) — tabela de linguagens, config
- [`kofbox/docs/API.md`](kofbox/docs/API.md) — contratos das rotas
- [`kofbox/docs/ARQUITETURA.md`](kofbox/docs/ARQUITETURA.md) — desenho
- [`kofbox/docs/SEGURANCA.md`](kofbox/docs/SEGURANCA.md) — limites honestos
- [`kofbox/docs/TESTES.md`](kofbox/docs/TESTES.md) — unitários + E2E
