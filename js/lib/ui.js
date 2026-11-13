/**
 * ui.js — Утилиты (DOM, числа, даты).
 */
(function (global) {
    const UI = {
        // Быстрый поиск элемента
        $(id) { return document.getElementById(id); },
        
        // Безопасный текст (защита от XSS)
        esc(s) {
            return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
                "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
            }[c]));
        },

        // Надежный парсинг чисел (понимает запятые и пробелы)
        num(v) {
            if (typeof v === "number") return isFinite(v) ? v : 0;
            const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(/[−–—]/g, "-").replace(",", "."));
            return isFinite(n) ? n : 0;
        },

        // Округление до копеек
        r2(x) { return Math.round(x * 100) / 100; },

        // Работа с датами
        date: {
            // YYYY-MM-DD (локальное время)
            local(d) {
                const date = d ? new Date(d) : new Date();
                return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];
            },
            // Строка "дд.мм.гггг"
            ru(ds) {
                if (!ds) return "";
                return String(ds).split("-").reverse().join(".");
            },
            // YYYY-MM (текущий месяц)
            month() {
                const d = new Date();
                return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
            },
            // Нормализация любой даты (ISO, timestamp, ru)
            norm(v) {
                if (v == null || v === "") return "";
                if (typeof v === "number") return this.local(v);
                const s = String(v).trim();
                let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (m) return m[0];
                m = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
                if (m) return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
                const d = new Date(s);
                return isNaN(d) ? "" : this.local(d);
            }
        },
        
        // Форматирование чисел для вывода
        fmt(x) {
            return (+x || 0).toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        }
    };

    global.UI = UI;
})(window);
