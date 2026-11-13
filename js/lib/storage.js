/**
 * storage.js — Единственный слой доступа к localStorage.
 * Все ключи приложения живут в префиксе "uchot.v2."
 */
(function (global) {
    const PREFIX = "uchot.v2.";
    const memFallback = {}; // Запасник на случай Private Mode

    const Storage = {
        // Получить значение (с авто-парсингом JSON)
        get(key, defaultValue = null) {
            const fullKey = PREFIX + key;
            try {
                const raw = localStorage.getItem(fullKey);
                if (raw === null) return defaultValue;
                return JSON.parse(raw);
            } catch (e) {
                return memFallback[fullKey] !== undefined ? memFallback[fullKey] : defaultValue;
            }
        },

        // Записать значение
        set(key, value) {
            const fullKey = PREFIX + key;
            const serialized = JSON.stringify(value);
            try {
                localStorage.setItem(fullKey, serialized);
            } catch (e) {
                memFallback[fullKey] = value;
                console.warn("Storage: использован fallback (память).", e);
            }
        },

        // Удалить ключ
        remove(key) {
            const fullKey = PREFIX + key;
            try { localStorage.removeItem(fullKey); } catch (e) {}
            delete memFallback[fullKey];
        },

        // Проверить наличие
        has(key) {
            return this.get(key, null) !== null;
        }
    };

    global.AppStorage = Storage;
})(window);
