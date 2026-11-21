/**
 * pin.js — необязательный PIN-код (включается в «Настройках»). Подключается на каждой странице.
 * Это защита от случайного просмотра, а не шифрование: данные лежат в браузере открыто.
 * Ключи: pin (4 цифры), pin_on (true/false). Разблокировка действует до закрытия приложения.
 */
(function () {
    let on = false, pin = "";
    try { on = AppStorage.get("pin_on", false) === true; pin = String(AppStorage.get("pin", "") || ""); } catch (e) { return; }
    if (!on || !/^\d{4}$/.test(pin)) return;
    try { if (sessionStorage.getItem("appUnlocked") === "true") return; } catch (e) {}

    const st = document.createElement("style");
    st.textContent = "#plock{position:fixed;inset:0;z-index:99999;background:var(--bg);color:var(--text);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;transition:transform .05s}" +
        "#plock .pl-t{font-size:20px;font-weight:600;margin-bottom:26px}#plock .pl-d{display:flex;gap:16px;margin-bottom:34px}" +
        "#plock .pl-d i{width:16px;height:16px;border-radius:50%;border:2px solid var(--text);display:block}#plock .pl-d i.on{background:var(--text)}" +
        "#plock .pl-p{display:grid;grid-template-columns:repeat(3,72px);gap:16px}" +
        "#plock .pl-p button{width:72px;height:72px;border-radius:50%;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:28px;font-weight:500;cursor:pointer;padding:0}" +
        "#plock .pl-p button:active{transform:scale(.9)}#plock .pl-p .pl-e{visibility:hidden}" +
        "#plock .pl-f{margin-top:26px;background:none;border:none;color:var(--accent);font-size:15px;cursor:pointer;display:none}";
    document.head.appendChild(st);

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
    const box = document.createElement("div");
    box.id = "plock";
    box.innerHTML = '<div class="pl-t">🔒 Введите PIN-код</div><div class="pl-d"><i></i><i></i><i></i><i></i></div><div class="pl-p">' +
        keys.map(k => k === "" ? '<button class="pl-e" tabindex="-1"></button>' : '<button data-k="' + k + '">' + k + "</button>").join("") +
        '</div><button class="pl-f" id="plForgot">Забыли PIN?</button>';
    document.body.appendChild(box);
    document.body.style.overflow = "hidden";

    let cur = "", fails = 0;
    const dots = () => box.querySelectorAll(".pl-d i").forEach((d, i) => d.classList.toggle("on", i < cur.length));
    function unlock() {
        try { sessionStorage.setItem("appUnlocked", "true"); } catch (e) {}
        box.remove(); document.body.style.overflow = "";
    }
    box.querySelector(".pl-p").addEventListener("click", e => {
        const b = e.target.closest("button[data-k]");
        if (!b) return;
        if (b.dataset.k === "⌫") { cur = cur.slice(0, -1); dots(); return; }
        if (cur.length >= 4) return;
        cur += b.dataset.k; dots();
        if (cur.length < 4) return;
        if (cur === pin) { unlock(); return; }
        fails++;
        box.style.transform = "translateX(10px)";
        setTimeout(() => box.style.transform = "translateX(-10px)", 60);
        setTimeout(() => box.style.transform = "", 120);
        setTimeout(() => { cur = ""; dots(); }, 250);
        if (fails >= 3) box.querySelector("#plForgot").style.display = "block";
    });
    box.querySelector("#plForgot").addEventListener("click", () => {
        if (confirm("Выключить PIN-код? Данные не удалятся.")) { AppStorage.set("pin_on", false); unlock(); }
    });
})();
