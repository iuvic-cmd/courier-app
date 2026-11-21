/**
 * state.js — Единый доступ ко всем данным приложения.
 * Только этот файл знает точные ключи (кроме настроек).
 */
(function (global) {
    const State = {
        // Настройки и профиль
        getSettings() { return AppStorage.get("settings", {}); },
        setSettings(s) { AppStorage.set("settings", s); },
        
        // Курьерские дни (объект вида { "2026-11-13": { type, night, ap, total, note } })
        getDays() { return AppStorage.get("days", {}); },
        setDays(d) { AppStorage.set("days", d); },
        
        // Смены и напарники
        getShift() { return AppStorage.get("shift", null); },
        setShift(s) { AppStorage.set("shift", s); },
        
        getRoster() { return AppStorage.get("roster", { A: {}, B: {} }); },
        setRoster(r) { AppStorage.set("roster", r); },
        
        // Тарифы (массив истории: [{ from, night, ap }])
        getTariff() { return AppStorage.get("tariff", [{ from: "2024-01-01", night: 74, ap: 54 }]); },
        setTariff(t) { AppStorage.set("tariff", t); },
        
        // Единый финансовый журнал (все операции: доходы, траты, переводы, долги)
        getOps() { return AppStorage.get("ops", []); },
        setOps(ops) { AppStorage.set("ops", ops); },
        
        // Кошельки (наличные, карта)
        getWallets() { return AppStorage.get("wallets", { "Наличные": 0, "Карта": 0 }); },
        setWallets(w) { AppStorage.set("wallets", w); },
        
        // Категории (трат и доходов)
        getCategories() { return AppStorage.get("categories", { expense: ["Продукты", "Транспорт", "Скутер"], income: ["Зарплата", "Чаевые"] }); },
        setCategories(c) { AppStorage.set("categories", c); },
        
        // Долги и цели
        getDebts() { return AppStorage.get("debts", []); },
        setDebts(d) { AppStorage.set("debts", d); },
        
        getGoals() { return AppStorage.get("goals", []); },
        setGoals(g) { AppStorage.set("goals", g); },

        // --- Скутер ---
        
        // Пробег (текущий и начальный)
        getScooter() { return AppStorage.get("scooter", { currentKm: 0, startKm: 0 }); },
        setScooter(s) { AppStorage.set("scooter", s); },
        
        // История обновлений пробега
        getMileageLog() { return AppStorage.get("mileage_log", []); },
        setMileageLog(l) { AppStorage.set("mileage_log", l); },
        
        // Заправки скутера
        getFuel() { return AppStorage.get("scooter_fuel", []); },
        setFuel(f) { AppStorage.set("scooter_fuel", f); },
        
        // Общие расходы на мойку/сервис (если понадобятся)
        getScooterExpenses() { return AppStorage.get("scooter_expenses", []); },
        setScooterExpenses(e) { AppStorage.set("scooter_expenses", e); },
        
        // Компоненты ТО (масло, фильтр и т.д.)
        getComponent(id) { return AppStorage.get("comp_" + id, { lastKm: 0, lastDate: "", intervalKm: 0, history: [] }); },
        setComponent(id, data) { AppStorage.set("comp_" + id, data); },
        
        // Официальные документы (техосмотр, налоги, страховка)
        getOfficial(id) { return AppStorage.get("official_" + id, { lastDate: "", nextDate: "", cost: 0, history: [] }); },
        setOfficial(id, data) { AppStorage.set("official_" + id, data); }
    };

    global.State = State;
})(window);
