/**
 * tariff.js — Управление тарифами и расчёт стоимости дня.
 */
(function (global) {
    const DEFAULT_TARIFF = { night: 74, ap: 54 };

    const Tariff = {
        // Получить тариф на конкретную дату (YYYY-MM-DD)
        getForDate(dateStr) {
            const history = State.getTariff().slice().sort((a, b) => a.from.localeCompare(b.from));
            let actual = DEFAULT_TARIFF;
            for (let i = 0; i < history.length; i++) {
                if (dateStr >= history[i].from) {
                    actual = { night: +history[i].night, ap: +history[i].ap };
                }
            }
            return actual;
        },

        // Добавить новый тариф (действует с указанной даты)
        setNewRate(dateStr, nightPrice, apPrice) {
            const history = State.getTariff();
            const existingIdx = history.findIndex(t => t.from === dateStr);
            
            if (existingIdx >= 0) {
                history[existingIdx] = { from: dateStr, night: nightPrice, ap: apPrice };
            } else {
                history.push({ from: dateStr, night: nightPrice, ap: apPrice });
            }
            history.sort((a, b) => a.from.localeCompare(b.from));
            State.setTariff(history);
        },

        // Рассчитать сумму за день по количеству заказов
        calcTotal(dateStr, nightOrders, apOrders) {
            const rates = this.getForDate(dateStr);
            return UI.r2((+nightOrders || 0) * rates.night + (+apOrders || 0) * rates.ap);
        }
    };

    global.Tariff = Tariff;
})(window);
