/**
 * dialog.js — Модальные окна (замена дефолтным alert/confirm).
 */
(function (global) {
    const D = {
        _build(msg, buttons) {
            const ov = document.createElement("div");
            ov.className = "dialog-overlay";
            
            const box = document.createElement("div");
            box.className = "dialog-box";
            
            const p = document.createElement("p");
            p.innerText = msg;
            
            const row = document.createElement("div");
            row.className = "dialog-buttons";
            
            buttons.forEach(btn => {
                const b = document.createElement("button");
                b.className = btn.cls;
                b.innerText = btn.text;
                b.onclick = () => { ov.remove(); if (btn.cb) btn.cb(); };
                row.appendChild(b);
            });
            
            box.append(p, row);
            ov.appendChild(box);
            document.body.appendChild(ov);
        },

        // Просто показать сообщение
        alert(msg, callback) {
            this._build(msg, [{ text: "OK", cls: "dialog-ok", cb: callback }]);
        },

        // Спросить Да/Нет
        confirm(msg, onYes, onNo) {
            this._build(msg, [
                { text: "✅ Да", cls: "dialog-yes", cb: onYes },
                { text: "❌ Нет", cls: "dialog-no", cb: onNo }
            ]);
        },

        // Спросить текст
        prompt(title, defaultValue, onOk) {
            const ov = document.createElement("div");
            ov.className = "dialog-overlay";
            const box = document.createElement("div");
            box.className = "dialog-box";
            
            box.innerHTML = `<h3>${UI.esc(title)}</h3>`;
            
            const inp = document.createElement("input");
            inp.type = "text";
            inp.className = "form-control";
            inp.value = defaultValue || "";
            inp.style.marginBottom = "16px";
            
            const row = document.createElement("div");
            row.className = "dialog-buttons";
            
            const ok = document.createElement("button");
            ok.className = "dialog-yes";
            ok.innerText = "OK";
            ok.onclick = () => { ov.remove(); onOk(inp.value.trim()); };
            
            const no = document.createElement("button");
            no.className = "dialog-no";
            no.innerText = "Отмена";
            no.onclick = () => ov.remove();
            
            row.append(ok, no);
            box.append(inp, row);
            ov.appendChild(box);
            document.body.appendChild(ov);
            
            setTimeout(() => inp.focus(), 100);
            inp.addEventListener("keydown", e => { if (e.key === "Enter") ok.click(); });
        }
    };

    global.Dialog = D;
})(window);
