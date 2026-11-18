/**
 * theme.js — Тема (авто / светлая / тёмная) + запрет зума страницы.
 */
(function (global) {
    // --- Запрет зума (пинч и двойной тап) ---
    (function disableZoom() {
        const content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
        let vp = document.querySelector('meta[name="viewport"]');
        if (!vp) {
            vp = document.createElement("meta");
            vp.name = "viewport";
            document.head.appendChild(vp);
        }
        vp.setAttribute("content", content);
        // iOS Safari игнорирует user-scalable=no, поэтому дополнительно гасим жесты
        ["gesturestart", "gesturechange", "gestureend"].forEach(ev =>
            document.addEventListener(ev, e => e.preventDefault(), { passive: false })
        );
        let lastTouch = 0;
        document.addEventListener("touchend", e => {
            const now = Date.now();
            if (now - lastTouch < 300 && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") e.preventDefault();
            lastTouch = now;
        }, { passive: false });
    })();

    const THEME_KEY = "theme"; // "dark" | "light"; ключа нет = следовать системе
    const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    function readMode() {
        let v = null;
        try { v = localStorage.getItem(THEME_KEY); } catch (e) {}
        return v === "dark" || v === "light" ? v : "system";
    }

    function apply(mode) {
        const isDark = mode === "dark" || (mode === "system" && !!(mq && mq.matches));
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
        const toggle = document.getElementById("theme-toggle");
        if (toggle) toggle.checked = isDark;
    }

    global.Theme = {
        // "system" | "light" | "dark"
        get() { return readMode(); },

        set(mode) {
            try {
                if (mode === "light" || mode === "dark") localStorage.setItem(THEME_KEY, mode);
                else localStorage.removeItem(THEME_KEY);
            } catch (e) {}
            apply(readMode());
        },

        init() {
            apply(readMode());
            const toggle = document.getElementById("theme-toggle");
            if (toggle) {
                toggle.addEventListener("change", function () {
                    global.Theme.set(this.checked ? "dark" : "light");
                });
            }
        }
    };

    // Системная тема изменилась — подхватываем, если выбран режим «авто»
    if (mq) {
        const onSys = () => { if (readMode() === "system") apply("system"); };
        if (mq.addEventListener) mq.addEventListener("change", onSys);
        else if (mq.addListener) mq.addListener(onSys);
    }

    // Тема изменена на другой странице/вкладке
    window.addEventListener("storage", e => {
        if (e.key === THEME_KEY || e.key === null) apply(readMode());
    });

})(window);
