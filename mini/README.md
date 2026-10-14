# KofBox Mini — Cliente desktop em `kof.ui`

Janela nativa (WebKitGTK) 100% Kof que consome a API do KofBox: digite Python
de uma linha, aperte **Executar** e veja o stdout — sem abrir o navegador.

## Rodar

```bash
# 1. Daemon no ar (terminal 1)
./kofbox/run.sh            # http://localhost:8080

# 2. Mini no webview (terminal 2)
export PATH="$HOME/.kof/bin:$PATH"
kof run mini/Mini.kf --target=js   # fechar a janela encerra
```

## O que prova (três mundos, uma linguagem)

| Parte | Target | Papel |
|---|---|---|
| `kofbox/` daemon | JVM | `kof.web` + execução de processos |
| `mini/Mini.kf` lógica | JS | `kof.http.post` + `json.*` no GraalJS embarcado |
| janela | webview | `kof.ui`: Window/Label/Input/Button/Row + Theme.dark |

## Verificado em 05/10/2026

- `kof check mini/Mini.kf` — 0 erros.
- Webview abre (janela "Kof" 900×600) sem erros no log; DOM gerado contém os widgets.
- Caminho de rede+JSON no target JS: `http.post` → `/api/execute` → `stdout 42` ✅
  (programa headless equivalente; o botão usa o mesmo código).
- Screenshot do conteúdo não foi possível (sessão gráfica ocupada) — para ver,
  rode e traga a janela "Kof" para frente.

## Limites honestos do `kof.ui` (0.5.0-beta)

- `Input` é de linha única: sem editor multilinha, sem dropdown de linguagens —
  por isso o Mini é fixo em Python de uma linha, **companheiro** do dashboard.
- Ação do botão roda na thread da UI (requests lentos congelam a janela;
  para demo local com timeout de 15s é aceitável).
- Render só no target `js` (JVM/native viram no-ops).
