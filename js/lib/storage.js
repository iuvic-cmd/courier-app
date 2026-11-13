/**
 * storage.js — Единственный слой доступа к localStorage.
 * Все ключи приложения живут в префиксе "uchot.v2."
 */
(function (global) {
    const PREFIX = "uchot.v2.";
    const memFallback = {}; // Запасник на случай Private Mode или ошибки записи

    const Storage = {
        get(key, defaultValue = null) {
            const fullKey = PREFIX + key;
            
            // Сначала проверяем память (если localStorage упал при записи)
            if (memFallback[fullKey] !== undefined) {
                return memFallback[fullKey];
            }
            
            try {
                const raw = localStorage.getItem(fullKey);
                if (raw === null) return defaultValue;
                return JSON.parse(raw);
            } catch (e) {
                return defaultValue;
            }
        },

        set(key, value) {
            const fullKey = PREFIX + key;
            const serialized = JSON.stringify(value);
            try {
                localStorage.setItem(fullKey, serialized);
            } catch (e) {
                // Если места нет или Safari в приватном режиме — пишем в память
                memFallback[fullKey] = value;
                console.warn("Storage: использован fallback (память).", e);
            }
        },

        remove(key) {
            const fullKey = PREFIX + key;
            try { localStorage.removeItem(fullKey); } catch (e) {}
            delete memFallback[fullKey];
        },

        has(key) {
            return this.get(key, null) !== null;
        }
    };

    global.AppStorage = Storage;
})(window);
