/**
 * ledger.js — Аналитика и расчёты на основе журнала операций.
 */
(function (global) {
    const Ledger = {
        // Получить все операции за указанный месяц (YYYY-MM)
        forMonth(monthStr) {
            return State.getOps().filter(o => (o.date || "").startsWith(monthStr));
        },

        // Сумма трат по категории
        sumByCategory(opsList, category) {
            return opsList
                .filter(o => o.kind === "expense" && o.cat === category)
                .reduce((sum, o) => sum + Math.abs(o.amount), 0);
        },

        // Общая сумма расходов (без учета долгов и переводов)
        totalExpenses(opsList) {
            return opsList
                .filter(o => o.kind === "expense")
                .reduce((sum, o) => sum + Math.abs(o.amount), 0);
        },

        // Общая сумма доходов
        totalIncome(opsList) {
            return opsList
                .filter(o => o.kind === "income")
                .reduce((sum, o) => sum + o.amount, 0);
        },

        // Расчёт чистого дохода за месяц:
        // (Заработок по дням) + (Чаевые/прочий приход) - (Расходы)
        getMonthlyNet(monthStr) {
            // 1. Заработок по дням из календаря
            const days = State.getDays();
            let salary = 0;
            for (const date in days) {
                if (date.startsWith(monthStr)) {
                    salary += (+days[date].total || 0);
                }
            }

            // 2. Операции из журнала
            const ops = this.forMonth(monthStr);
            const extraIncome = this.totalIncome(ops);
            const expenses = this.totalExpenses(ops);

            return {
                salary,
                extraIncome,
                expenses,
                net: UI.r2(salary + extraIncome - expenses)
            };
        }
    };

    global.Ledger = Ledger;
})(window);
