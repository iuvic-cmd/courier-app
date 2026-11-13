/**
 * theme.js — Управление темой (светлая/тёмная).
 */
(function (global) {
    const THEME_KEY = "theme"; // Используем старый ключ для совместимости с CSS

    global.Theme = {
        init() {
            let saved = null;
            try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
            
            const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
            document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");

            const toggle = document.getElementById("theme-toggle");
            if (toggle) {
                toggle.checked = isDark;
                toggle.addEventListener("change", function () {
                    const val = this.checked ? "dark" : "light";
                    document.documentElement.setAttribute("data-theme", val);
                    try { localStorage.setItem(THEME_KEY, val); } catch (e) {}
                });
            }
        }
    };
    
    // Слушаем изменения из других вкладок
    window.addEventListener("storage", e => {
        if (e.key === THEME_KEY && e.newValue) {
            document.documentElement.setAttribute("data-theme", e.newValue);
            const toggle = document.getElementById("theme-toggle");
            if (toggle) toggle.checked = e.newValue === "dark";
        }
    });

})(window);
