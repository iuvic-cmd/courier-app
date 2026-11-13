/**
 * guard.js — защита от двойных нажатий.
 * guardAction("key") вернёт false, если то же действие было только что.
 */
(function (global) {
    const last = {};
    global.guardAction = function (key, ms = 800) {
        const now = Date.now();
        if (last[key] && now - last[key] < ms) return false;
        last[key] = now;
        return true;
    };
})(window);
