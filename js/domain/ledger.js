/**
 * ledger.js — Аналитика и расчёты на основе журнала операций.
 * Устарел: старый формат операций. Оставлен только чтобы страницы, где он подключён, не получали ошибку 404.
 */
(function (global) {
    const Ledger = {
        forMonth(monthStr) {
            return State.getOps().filter(o => (o.date || o.data || "").startsWith(monthStr));
        }
    };
    global.Ledger = Ledger;
})(window);
