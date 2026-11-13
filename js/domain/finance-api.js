/**
 * finance-api.js — Единственный способ менять балансы и добавлять операции.
 */
(function (global) {
    const FinanceAPI = {
        // Внутренний метод для добавления записи в журнал
        _addOp(op) {
            const ops = State.getOps();
            op.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            op.timestamp = Date.now();
            ops.push(op);
            State.setOps(ops);
            return op.id;
        },

        // Трата (уменьшает баланс кошелька)
        spend({ date, wallet, amount, category, note }) {
            amount = UI.num(amount);
            if (amount <= 0) throw new Error("Сумма должна быть больше нуля");
            
            const wallets = State.getWallets();
            if (wallets[wallet] === undefined) throw new Error("Кошелёк не найден");
            if (wallets[wallet] < amount) throw new Error(`Недостаточно средств. На «${wallet}» только ${UI.fmt(wallets[wallet])}`);

            wallets[wallet] = UI.r2(wallets[wallet] - amount);
            State.setWallets(wallets);

            return this._addOp({
                date: date || UI.date.local(),
                kind: "expense",
                amount: -amount,
                wallet,
                cat: category,
                note: note || ""
            });
        },

        // Доход (увеличивает баланс кошелька)
        receive({ date, wallet, amount, category, note }) {
            amount = UI.num(amount);
            if (amount <= 0) throw new Error("Сумма должна быть больше нуля");

            const wallets = State.getWallets();
            if (wallets[wallet] === undefined) throw new Error("Кошелёк не найден");

            wallets[wallet] = UI.r2(wallets[wallet] + amount);
            State.setWallets(wallets);

            return this._addOp({
                date: date || UI.date.local(),
                kind: "income",
                amount: amount,
                wallet,
                cat: category,
                note: note || ""
            });
        },

        // Перевод между кошельками (не считается доходом или расходом)
        transfer({ date, fromWallet, toWallet, amount, note }) {
            amount = UI.num(amount);
            if (amount <= 0) throw new Error("Сумма должна быть больше нуля");
            if (fromWallet === toWallet) throw new Error("Выберите разные кошельки");

            const wallets = State.getWallets();
            if (wallets[fromWallet] < amount) throw new Error("Недостаточно средств для перевода");

            wallets[fromWallet] = UI.r2(wallets[fromWallet] - amount);
            wallets[toWallet] = UI.r2(wallets[toWallet] + amount);
            State.setWallets(wallets);

            return this._addOp({
                date: date || UI.date.local(),
                kind: "transfer",
                amount: amount,
                wallet: fromWallet,
                toWallet,
                cat: "Перевод",
                note: note || ""
            });
        },

        // Удаление операции (полный откат)
        undo(opId) {
            const ops = State.getOps();
            const idx = ops.findIndex(o => o.id === opId);
            if (idx === -1) return;

            const op = ops[idx];
            const wallets = State.getWallets();

            // Откатываем баланс
            if (op.kind === "expense") {
                wallets[op.wallet] = UI.r2(wallets[op.wallet] + Math.abs(op.amount));
            } else if (op.kind === "income") {
                wallets[op.wallet] = UI.r2(wallets[op.wallet] - op.amount);
            } else if (op.kind === "transfer") {
                wallets[op.wallet] = UI.r2(wallets[op.wallet] + op.amount);
                wallets[op.toWallet] = UI.r2(wallets[op.toWallet] - op.amount);
            }

            ops.splice(idx, 1);
            State.setOps(ops);
            State.setWallets(wallets);
        }
    };

    global.FinanceAPI = FinanceAPI;
})(window);
