# SEGURANÇA — KofBox MVP (leitura obrigatória antes de expor)

> O MVP **NÃO é sandbox**. É um executor local com timeout. Trate como
> ferramenta de demo/dev em máquina confiável, nunca como serviço público.

## Riscos reais do MVP

1. **Execução arbitrária**: qualquer `POST /api/execute` roda `python3/node/
   ruby/bash` como o usuário do daemon. Código malicioso lê `~/.ssh`,
   `$HOME`, rede interna, etc.
2. **Sem isolamento**: sem container, seccomp, cgroups, nem allowlist de
   syscalls. `timeout 15s` limita tempo, não dano.
3. **Sem auth**: sem API key, sem TLS, sem rate limit. Qualquer um na rede
   alcança o daemon.
4. **Recursos**: sem limite de memória/CPU por execução; `fork-bomb` ou
   `while True` (até 15s) degradam o host. Requests concorrentes = processos
   concorrentes.
5. **Path traversal (baixo)**: o arquivo temporário é gerado pelo servidor
   (`/tmp/kofbox_<ts>_<n>.<ext>`), o cliente não escolhe caminho. O código
   executado, porém, pode acessar qualquer arquivo do usuário.

## Mitigações já aplicadas

- Timeout configurável em **todo** comando (`timeout Ns <runner> <file>`,
  padrão 15s, via `kofbox.timeout-seconds`).
- API key opcional (`kofbox.api-key` → header `x-api-key` em
  `/api/execute` e `/api/history`; `/api/health` informa `auth_required`).
- Sem teto de tamanho no `code` (qualquer código executa) + rejeição de `code` vazio (sem ir ao disco). Em exposição: proxy reverso com limite de body + rate limit + timeout curto.
- Temp files com UUID (imprevisíveis) + deletados após cada execução.
- Whitelist de runners (o *conteúdo* do script continua arbitrário).
- Sem shell intermediário (`Runtime.exec(String)` tokeniza, não interpreta).
- Log de cada execução + histórico persistente (auditoria mínima).

## Regras de operação (demo segura)

- Rode localmente (`localhost`) ou em VM descartável, nunca com dados reais.
- Não exponha a porta para internet sem proxy com auth + TLS + rate limit.
- Para hackathon: demo em `localhost` projetado; se precisar de URL pública,
  use túnel temporário e desligue após a apresentação.
- Monitore `history.jsonl` (auditoria mínima: quem rodou o quê e quando —
  v2 adiciona IP + timestamp ISO).

## Roadmap de segurança (v2+)

- [x] ~~API key (`config` + checagem por handler — middleware `app.use` é inviável no Kof atual)~~ ✅ feito
- [ ] Rate limit (contagem por IP em `kof.cache` + janela de tempo)
- [ ] TLS (`listenSecure` — ver gap da plataforma)
- [ ] Status HTTP reais (401/422/429 — aguardar `kof.web` Fase 2)
- [ ] Allowlist de módulos (ex.: bloquear `os`, `subprocess`, `fs` via análise simples)
- [ ] Limites de CPU/memória (`timeout` + `ulimit`/`systemd-run`/`cgroups`)
- [ ] Usuário dedicado + diretório de trabalho efêmero por execução
- [ ] Validação de `code` vazio → 422; limite de tamanho (ex.: 64 KB)
- [ ] Migrar para `kof.process` com timeout nativo quando o Kof suportar
