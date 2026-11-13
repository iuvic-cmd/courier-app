/**
 * notify.js — Всплывающие уведомления (тосты).
 */
(function (global) {
    function show(message, isError = false) {
        // Удаляем предыдущее, если висит
        const old = document.querySelector(".toast");
        if (old) old.remove();

        const el = document.createElement("div");
        el.className = "toast" + (isError ? " error" : "");
        el.innerText = message;
        
        document.body.appendChild(el);
        
        // Плавное появление (анимация в CSS)
        requestAnimationFrame(() => el.classList.add("show"));
        
        // Скрытие через 2.5 секунды
        setTimeout(() => {
            el.classList.remove("show");
            setTimeout(() => el.remove(), 300);
        }, 2500);
    }

    global.Notify = {
        show(msg) { show(msg, false); },
        error(msg) { show(msg, true); }
    };
})(window);
