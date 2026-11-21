/**
 * theme.js — Тема (авто / светлая / тёмная).
 * Зум страницы не блокируем (доступность). Двойной тап по кнопкам не даёт зум
 * благодаря touch-action: manipulation в components.css, а поля ввода — font-size 16px.
 */
(function (global) {
    // viewport: без user-scalable=no / maximum-scale
    (function setViewport() {
        const content = "width=device-width, initial-scale=1, viewport-fit=cover";
        let vp = document.querySelector('meta[name="viewport"]');
        if (!vp) {
            vp = document.createElement("meta");
            vp.name = "viewport";
            document.head.appendChild(vp);
        }
        vp.setAttribute("content", content);
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
