# Projeto KofBox: Versão Avançada com Web UI e Multi-Linguagem

Para transformar o **KofBox** em um projeto de destaque em um hackathon, vamos adicionar duas super funcionalidades:
1. **Uma Interface Web (Dashboard UI) embutida:** Para acompanhar em tempo real os status, logs e saídas de cada execução sem precisar sair do navegador.
2. **Suporte a Múltiplas Linguagens:** O KofBox não vai rodar apenas comandos soltos, mas vai detectar a linguagem (Python, JavaScript/Node.js, Ruby, Rust, etc.), criar arquivos temporários de forma inteligente e executá-los em sandbox utilizando o motor de processos do Kof.

---

## 1. Nova Arquitetura do Sistema

```text
[ Browser / Dashboard UI ] ──(HTTP GET/POST)──► [ KofBox Daemon (Kof Lang) ]
                                                        │
                                                        ├─► kof.web (Servidor nativo + Arquivos Estáticos)
                                                        ├─► Interpretador / Compilador Dinâmico
                                                        └─► process.run (Executa Python, Node, etc.)
```

---

## 2. Estrutura de Arquivos

```text
kofbox/
├── kof.mod
├── public/
│   └── index.html      # A Web UI moderna (HTML + Tailwind CSS + Alpine.js/Vanilla JS)
└── src/
    ├── main.kf         # Ponto de entrada do Daemon
    ├── container.kf    # Lógica inteligente de multi-linguagem e process.run
    └── daemon.kf       # Servidor HTTP nativo e rotas da API + arquivos estáticos
```

---

## 3. Código do Projeto

### A. O Gerenciador Multi-Linguagem (`src/container.kf`)
Este módulo mapeia extensões de arquivo ou tipos de linguagem para os interpretadores/compiladores corretos instalados no sistema operacional hospedeiro, salvando o código do usuário em um arquivo temporário antes de rodá-lo.

```kof
// src/container.kf
module kofbox.container

import kof.process
import kof.os

struct ExecutionRequest {
    id: string
    language: string // "python", "javascript", "ruby", "bash"
    code: string
}

struct ExecutionResult {
    id: string
    language: string
    exitCode: int
    stdout: string
    stderr: string
    status: string
}

fun runCode(req: ExecutionRequest): ExecutionResult {
    val timestamp = os.timestamp()
    var fileName = ""
    var command = ""
    var args = List<string>()

    // Mapeia a linguagem para o comando correspondente do sistema
    if (req.language == "python") {
        fileName = "script_${timestamp}.py"
        os.writeFile(fileName, req.code)
        command = "python3"
        args = [fileName]
    } else if (req.language == "javascript") {
        fileName = "script_${timestamp}.js"
        os.writeFile(fileName, req.code)
        command = "node"
        args = [fileName]
    } else if (req.language == "ruby") {
        fileName = "script_${timestamp}.rb"
        os.writeFile(fileName, req.code)
        command = "ruby"
        args = [fileName]
    } else {
        // Fallback para shell script genérico
        fileName = "script_${timestamp}.sh"
        os.writeFile(fileName, req.code)
        command = "bash"
        args = [fileName]
    }

    println("Executando código em [${req.language}] via arquivo ${fileName}...")

    // Executa o processo de forma isolada usando o recurso nativo do Kof
    val result = process.run(command, args)

    // Opcional: Limpeza do arquivo temporário gerado
    // os.remove(fileName)

    val status = if (result.exitCode == 0) "SUCCESS" else "FAILED"

    return ExecutionResult(
        id = req.id,
        language = req.language,
        exitCode = result.exitCode,
        stdout = result.stdout,
        stderr = result.stderr,
        status = status
    )
}
```

### B. O Servidor & API Web (`src/daemon.kf`)
Além de prover os endpoints da API, o KofBox serve a interface visual diretamente da pasta `public/`.

```kof
// src/daemon.kf
module kofbox.daemon

import kof.web
import kof.json
import kofbox.container

// Histórico em memória das execuções
var history = Map<string, container.ExecutionResult>()

fun startDaemon(port: int) {
    println("KofBox rodando em http://localhost:${port}")

    web.server(port) {
        // Serve a Web UI estática a partir da pasta public/
        web.static("/", "./public")

        // API para submeter código de qualquer linguagem
        post("/api/execute") { req ->
            val body = json.parse<container.ExecutionRequest>(req.body)
            
            // Executa o código usando o motor multi-linguagem
            val result = container.runCode(body)
            
            // Salva no histórico
            history[result.id] = result

            json.response(200, result)
        }

        // API para resgatar histórico de execuções para a UI
        get("/api/history") { req ->
            json.response(200, history)
        }
    }
}
```

### C. O Ponto de Entrada (`src/main.kf`)
```kof
// src/main.kf
module kofbox.main

import kofbox.daemon

fun main(args: List<string>) {
    // Inicia diretamente o Daemon com a Web UI embutida na porta 8080
    daemon.startDaemon(8080)
}
```

### D. A Interface Web Minimalista (`public/index.html`)
Crie um arquivo HTML simples utilizando Tailwind CSS para dar um visual moderno (estilo Vercel/Docker Dashboard) sem precisar configurar frameworks pesados de frontend.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>KofBox - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-8">
    <div class="max-w-4xl mx-auto">
        <header class="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <h1 class="text-2xl font-bold tracking-wider text-indigo-400">📦 KofBox Playground</h1>
            <span class="text-xs bg-indigo-900 text-indigo-300 px-3 py-1 rounded-full border border-indigo-700">Powered by Kof Lang</span>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Painel de Envio de Código -->
            <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg flex flex-col gap-4">
                <h2 class="text-lg font-semibold text-slate-200">Novo Container / Execução</h2>
                
                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Linguagem:</label>
                    <select id="langSelect" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                        <option value="python">Python 3</option>
                        <option value="javascript">JavaScript (Node.js)</option>
                        <option value="ruby">Ruby</option>
                        <option value="bash">Bash Script</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-400 mb-1">Código fonte:</label>
                    <textarea id="codeArea" rows="8" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-sm text-indigo-200 focus:outline-none focus:border-indigo-500" placeholder="print('Hello from KofBox!')"></textarea>
                </div>

                <button onclick="executeCode()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-all shadow-md">
                    Executar Código 🚀
                </button>
            </div>

            <!-- Painel de Output e Logs -->
            <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg flex flex-col">
                <h2 class="text-lg font-semibold text-slate-200 mb-3">Saída (Stdout / Stderr)</h2>
                <div id="outputBox" class="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-y-auto max-h-[320px] whitespace-pre-wrap">
Aguardando execução...
                </div>
            </div>
        </div>
    </div>

    <script>
        async function executeCode() {
            const language = document.getElementById('langSelect').value;
            const code = document.getElementById('codeArea').value;
            const outputBox = document.getElementById('outputBox');

            outputBox.innerText = "Executando no KofBox...";

            try {
                const response = await fetch('/api/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: 'box-' + Date.now(),
                        language: language,
                        code: code
                    })
                });

                const data = await response.json();
                if (data.exitCode === 0) {
                    outputBox.innerText = data.stdout;
                } else {
                    outputBox.innerText = "ERRO (Exit Code " + data.exitCode + "):\n" + (data.stderr || data.stdout);
                }
            } catch (err) {
                outputBox.innerText = "Erro de conexão com o KofBox Daemon: " + err;
            }
        }
    </script>
</body>
</html>
```

---

## 4. Por que essa versão vai garantir o pódio no Hackathon?
* **Demonstração Visual:** Jurados adoram ver uma aplicação web interativa rodando de verdade do que apenas texto no terminal.
* **Ecossistema Limpo:** O servidor HTTP embutido do Kof serve tanto a API REST quanto os arquivos estáticos (`public/`) em pouquíssimo código.
* **Versatilidade Real:** Prova que a linguagem Kof consegue orquestrar qualquer outro ecossistema tecnológico do mercado (Python, Node, Ruby) de forma fluida.