# ROADMAP + GUIA DE HACKATHON — KofBox

## Pitch (30s)

> "KofBox é um sandbox multi-linguagem com dashboard web, escrito 100% em Kof:
> a linguagem orquestra Python, Node, Ruby e Bash num clique, com API REST,
> histórico persistente e timeout — tudo servido pelo `kof.web` em poucas
> centenas de linhas."

## Roteiro de demo (3 min)

1. `./run.sh` + abrir `http://localhost:8080` (badge health UP).
2. Rodar exemplo **Python** → mostrar stdout + `SUCCESS` + id/exit.
3. Trocar para **JavaScript**, rodar → mesmo fluxo, outra linguagem.
4. Forçar erro (ex.: `raise Exception('boom')`) → `FAILED` + stderr.
5. `curl /api/health` + `curl /api/history` no terminal → "é API de verdade".
6. Mostrar código Kof (`Container.kf` ~100 linhas) → "orquestra 4 ecossistemas".
7. Fechar com honestidade técnica: timeout via GNU, `kof.process` como próximo
   passo nativo, segurança como roadmap (jurados valorizam).

## Por que o júri gosta

- **Visual**: dashboard funcional > terminal.
- **Integração real**: 4 linguagens de verdade, não mock.
- **Domínio da plataforma**: interop Java onde a stdlib ainda não chega.
- **Honestidade**: CORRECOES.md mostra que testamos contra o compilador real.

## Roadmap

### v1.1 (polimento demo)
- [ ] Exemplos clicáveis por linguagem na UI (já embutidos; melhorar UX)
- [ ] Streaming de output (SSE `sse.send` — JVM suporta)
- [ ] Validação `code` vazio → 422 + limite 64 KB
- [ ] `GET /api/history` como array JSON + `?limit=N`
- [ ] WebSocket para logs ao vivo (`app.ws` — ver gap WEB004)

### v2 (plataforma)
- [ ] Migrar para `kof.process` nativo (quando existir) com timeout/ENV/CWD
- [ ] `kof.db`/SQLite para histórico (paginação, filtro por linguagem/status)
- [ ] API key + rate limit + TLS (`listenSecure`)
- [ ] Fila + `spawn/await` para execuções concorrentes com limite (ex.: 4 slots)
- [ ] Suporte a Go/Rust/Java (compilação) além de interpretadas

### v3 (sandbox de verdade)
- [ ] Isolamento por execução (user dedicado, tmp efêmero, `systemd-run` scope)
- [ ] Limites CPU/memória, allowlist de módulos, auditoria com IP
- [ ] Target native para o daemon (quando `kof.web` chegar ao native)
