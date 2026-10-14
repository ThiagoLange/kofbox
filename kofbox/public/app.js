/* KofBox UI — vanilla JS, sem dependências (CSP bloqueia CDNs). */
(function () {
    "use strict";

    var $ = function (id) { return document.getElementById(id); };

    var EXAMPLES = {
        python: "print('Hello from KofBox!')\nfor i in range(3):\n    print(f'linha {i}')",
        javascript: "console.log('Hello from KofBox!');\nfor (let i = 0; i < 3; i++) console.log('linha ' + i);",
        ruby: "puts 'Hello from KofBox!'\n3.times { |i| puts \"linha #{i}\" }",
        bash: "echo 'Hello from KofBox!'\nfor i in 1 2 3; do echo \"linha $i\"; done",
        lua: "print('Hello from KofBox!')\nfor i = 0, 2 do\n    print('linha ' .. i)\nend",
        perl: "print \"Hello from KofBox!\\n\";\nfor my $i (0..2) {\n    print \"linha $i\\n\";\n}",
        r: "cat('Hello from KofBox!\n')\nfor (i in 0:2) {\n    cat('linha', i, '\n')\n}",
        awk: "BEGIN {\n    print \"Hello from KofBox!\"\n    for (i = 1; i <= 3; i++) print \"linha \" i\n}",
        dart: "void main() {\n    print('Hello from KofBox!');\n    for (var i = 0; i < 3; i++) print('linha $i');\n}",
        julia: "println(\"Hello from KofBox!\")\nfor i in 0:2\n    println(\"linha \", i)\nend",
        go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    fmt.Println(\"Hello from KofBox!\")\n    for i := 0; i < 3; i++ {\n        fmt.Println(\"linha\", i)\n    }\n}",
        sqlite: "-- SQLite em memória\nSELECT 'Hello from KofBox!';\nSELECT 6 * 7;",
        duckdb: "-- DuckDB em memória\nSELECT 'Hello from KofBox!' AS msg;\nSELECT 6 * 7 AS resposta;",
        rust: "fn main() {\n    println!(\"Hello from KofBox!\");\n    for i in 0..3 {\n        println!(\"linha {}\", i);\n    }\n}",
        java: "class Hello {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from KofBox!\");\n        for (int i = 0; i < 3; i++) System.out.println(\"linha \" + i);\n    }\n}",
        postgres: "-- Postgres (container kofbox-postgres)\nSELECT 'Hello from KofBox!' AS msg;\nSELECT 6 * 7 AS resposta;",
        mysql: "-- MySQL (container kofbox-mysql)\nSELECT 'Hello from KofBox!' AS msg;\nSELECT 6 * 7 AS resposta;",
        kof: "main() {\n    println(\"Hello from KofBox!\");\n    for (var i = 0; i < 3; i++) println(\"linha \" + i);\n}",
        portukof: "principal() {\n    escrevaln(\"Hello from KofBox!\");\n    para (var i = 0; i < 3; i = i + 1) {\n        escrevaln(\"linha \" + i);\n    }\n}"
    };

    var lang = "python";
    var codeArea = $("codeArea");
    var gutter = $("gutter");
    var outputBox = $("outputBox");
    var statusBadge = $("statusBadge");
    var runBtn = $("runBtn");

    function storageKey(l) { return "kofbox_code_" + l; }

    function setBadge(el, text, kind) {
        el.textContent = text;
        el.className = "badge badge-" + kind;
    }

    function apiHeaders(extra) {
        var h = { "Content-Type": "application/json" };
        var key = $("apiKeyInput").value.trim();
        if (key) { h["x-api-key"] = key; }
        if (extra) {
            for (var k in extra) { h[k] = extra[k]; }
        }
        return h;
    }

    function refreshGutter() {
        var n = codeArea.value.split("\n").length;
        var s = "";
        for (var i = 1; i <= n; i++) { s += i + "\n"; }
        gutter.textContent = s;
        gutter.scrollTop = codeArea.scrollTop;
    }

    function setLang(l) {
        try { localStorage.setItem(storageKey(lang), codeArea.value); } catch (e) {}
        lang = l;
        var tabs = document.querySelectorAll(".tab");
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle("active", tabs[i].getAttribute("data-lang") === l);
        }
        var saved = null;
        try { saved = localStorage.getItem(storageKey(l)); } catch (e) {}
        codeArea.value = (saved !== null && saved !== "") ? saved : (EXAMPLES[l] || "");
        refreshGutter();
    }

    function restoreExample() {
        codeArea.value = EXAMPLES[lang] || "";
        try { localStorage.setItem(storageKey(lang), codeArea.value); } catch (e) {}
        refreshGutter();
    }

    function checkHealth() {
        var badge = $("healthBadge");
        fetch("/api/health").then(function (r) { return r.json(); }).then(function (d) {
            setBadge(badge, "health: " + (d.status || "UP"), (d.status === "UP") ? "ok" : "warn");
            var runners = d.runners || {};
            var names = [];
            for (var k in runners) { if (runners[k]) { names.push(k); } }
            var rb = $("runnersBadge");
            rb.textContent = "runners: " + (names.length ? names.join(" · ") : "nenhum");
            rb.className = "badge badge-muted";
        }).catch(function () {
            setBadge(badge, "health: OFFLINE", "err");
        });
    }

    function runCode() {
        var code = codeArea.value;
        try { localStorage.setItem(storageKey(lang), code); } catch (e) {}
        outputBox.textContent = "Executando no KofBox…";
        outputBox.classList.remove("is-error");
        setBadge(statusBadge, "running…", "warn");
        runBtn.disabled = true;
        var t0 = performance.now();

        fetch("/api/execute", {
            method: "POST",
            headers: apiHeaders(),
            body: JSON.stringify({ id: "box-" + Date.now(), language: lang, code: code })
        }).then(function (r) { return r.json(); }).then(function (d) {
            var dt = ((performance.now() - t0) / 1000).toFixed(2) + "s";
            $("lastId").textContent = d.id || "—";
            $("lastExit").textContent = (d.exitCode === undefined || d.exitCode === null) ? "—" : d.exitCode;
            $("lastTime").textContent = dt;
            if (d.exitCode === 0) {
                outputBox.textContent = d.stdout || "(sem saída)";
                setBadge(statusBadge, "SUCCESS", "ok");
            } else if (d.stderr && d.stderr.indexOf("unauthorized") !== -1) {
                outputBox.textContent = "Não autorizado: preencha o campo x-api-key no topo.";
                outputBox.classList.add("is-error");
                setBadge(statusBadge, "FAILED", "err");
            } else {
                outputBox.textContent = "ERRO (exit " + d.exitCode + "):\n" + (d.stderr || d.stdout || "(sem detalhes)");
                outputBox.classList.add("is-error");
                setBadge(statusBadge, "FAILED", "err");
            }
            loadHistory();
        }).catch(function (err) {
            outputBox.textContent = "Erro de conexão com o KofBox Daemon: " + err;
            outputBox.classList.add("is-error");
            setBadge(statusBadge, "OFFLINE", "err");
        }).then(function () { runBtn.disabled = false; });
    }

    function loadHistory() {
        var box = $("historyBox");
        fetch("/api/history?limit=20", { headers: apiHeaders() }).then(function (r) {
            return r.json();
        }).then(function (d) {
            var items = (d && d.history instanceof Array) ? d.history : [];
            box.innerHTML = "";
            if (!items.length) {
                var li = document.createElement("li");
                li.className = "history-empty";
                li.textContent = d && d.error ? d.error : "Histórico vazio.";
                box.appendChild(li);
                return;
            }
            for (var i = items.length - 1; i >= 0; i--) {
                (function (o) {
                    var li = document.createElement("li");
                    var dot = document.createElement("span");
                    dot.className = "dot " + (o.exitCode === 0 ? "dot-ok" : "dot-err");
                    var txt = document.createElement("span");
                    txt.className = "grow";
                    txt.textContent = o.id + " [" + o.language + "] exit " + o.exitCode;
                    txt.title = (o.stdout || o.stderr || "").slice(0, 300);
                    li.appendChild(dot);
                    li.appendChild(txt);
                    box.appendChild(li);
                })(items[i]);
            }
        }).catch(function (e) {
            box.innerHTML = "";
            var li = document.createElement("li");
            li.className = "history-empty";
            li.textContent = "Falha ao carregar histórico: " + e;
            box.appendChild(li);
        });
    }

    function copyOutput() {
        var t = outputBox.textContent;
        function done(ok) {
            var b = $("copyBtn");
            b.textContent = ok ? "Copiado!" : "Falhou";
            setTimeout(function () { b.textContent = "Copiar saída"; }, 1500);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t).then(function () { done(true); }, function () { done(false); });
        } else {
            var ta = document.createElement("textarea");
            ta.value = t;
            document.body.appendChild(ta);
            ta.select();
            try { done(document.execCommand("copy")); } catch (e) { done(false); }
            document.body.removeChild(ta);
        }
    }

    // Tabs
    var tabs = document.querySelectorAll(".tab");
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener("click", function () { setLang(this.getAttribute("data-lang")); });
    }

    // Editor: Tab indenta, Ctrl+Enter executa, gutter sincronizado
    codeArea.addEventListener("keydown", function (e) {
        if (e.key === "Tab") {
            e.preventDefault();
            var s = codeArea.selectionStart;
            codeArea.value = codeArea.value.slice(0, s) + "    " + codeArea.value.slice(codeArea.selectionEnd);
            codeArea.selectionStart = codeArea.selectionEnd = s + 4;
            refreshGutter();
        }
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { runCode(); }
    });
    codeArea.addEventListener("input", refreshGutter);
    codeArea.addEventListener("scroll", function () { gutter.scrollTop = codeArea.scrollTop; });

    runBtn.addEventListener("click", runCode);
    $("exampleBtn").addEventListener("click", restoreExample);
    $("historyBtn").addEventListener("click", loadHistory);
    $("copyBtn").addEventListener("click", copyOutput);
    $("apiKeyInput").addEventListener("change", function () {
        try { localStorage.setItem("kofbox_api_key", $("apiKeyInput").value); } catch (e) {}
    });
    try { $("apiKeyInput").value = localStorage.getItem("kofbox_api_key") || ""; } catch (e) {}

    setLang("python");
    checkHealth();
    loadHistory();
})();
