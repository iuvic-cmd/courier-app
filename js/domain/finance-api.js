/**
 * finance-api.js — Единственный способ менять балансы и добавлять операции из других страниц.
 * Пишет операции в том же формате, что и fin.html (tip / summa / kat / koshel / data).
 */
(function (global) {
    const pad = n => String(n).padStart(2, "0");
    const stamp = date => {
        const d = new Date();
        return (date || UI.date.local()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    };
    const nextId = ops => Math.max(0, ...ops.map(o => +o.id || 0)) + 1;
    const walletCur = w => (AppStorage.get("valyuty", {}) || {})[w] || "MDL";
    const toBase = (w, amount) => {
        const c = walletCur(w);
        if (c === "MDL") return null;
        const rate = +(AppStorage.get("kursy", {}) || {})[c] || 0;
        return rate ? UI.r2(amount * rate) : null;
    };
    // Накопительные итоги по категориям, которые ведёт fin.html (traty / dohody)
    const bump = (key, cat, v) => {
        if (!cat) return;
        const m = AppStorage.get(key, {}) || {};
        m[cat] = Math.max(0, UI.r2((m[cat] || 0) + v));
        AppStorage.set(key, m);
    };

    const FinanceAPI = {
        _addOp(op) {
            const ops = State.getOps();
            op.id = nextId(ops);
            Object.keys(op).forEach(k => { if (op[k] === "" || op[k] == null) delete op[k]; });
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
            bump("traty", category, amount);

            return this._addOp({ data: stamp(date), tip: "Трата", summa: amount, koshel: wallet, kat: category, zametka: note, baz: toBase(wallet, amount) });
        },

        // Доход (увеличивает баланс кошелька)
        receive({ date, wallet, amount, category, note }) {
            amount = UI.num(amount);
            if (amount <= 0) throw new Error("Сумма должна быть больше нуля");

            const wallets = State.getWallets();
            if (wallets[wallet] === undefined) throw new Error("Кошелёк не найден");

            wallets[wallet] = UI.r2(wallets[wallet] + amount);
            State.setWallets(wallets);
            bump("dohody", category, amount);

            return this._addOp({ data: stamp(date), tip: "Доход", summa: amount, koshel: wallet, kat: category, zametka: note, baz: toBase(wallet, amount) });
        },

        // Перевод между кошельками одной валюты (конвертация — только в «Финансах»)
        transfer({ date, fromWallet, toWallet, amount, note }) {
            amount = UI.num(amount);
            if (amount <= 0) throw new Error("Сумма должна быть больше нуля");
            if (fromWallet === toWallet) throw new Error("Выберите разные кошельки");

            const wallets = State.getWallets();
            if (wallets[fromWallet] === undefined || wallets[toWallet] === undefined) throw new Error("Кошелёк не найден");
            if (walletCur(fromWallet) !== walletCur(toWallet)) throw new Error("Конвертацию между валютами делайте в «Финансах»");
            if (wallets[fromWallet] < amount) throw new Error("Недостаточно средств для перевода");

            wallets[fromWallet] = UI.r2(wallets[fromWallet] - amount);
            wallets[toWallet] = UI.r2(wallets[toWallet] + amount);
            State.setWallets(wallets);

            return this._addOp({ data: stamp(date), tip: "Перевод", summa: amount, koshel: fromWallet, kuda: toWallet, zametka: note });
        },

        // Удаление операции (полный откат)
        undo(opId) {
            const ops = State.getOps();
            const idx = ops.findIndex(o => String(o.id) === String(opId));
            if (idx === -1) return;

            const op = ops[idx];
            const wallets = State.getWallets();
            const tip = op.tip || ({ expense: "Трата", income: "Доход", transfer: "Перевод" })[op.kind];
            const s = Math.abs(+op.summa || +op.amount || 0);
            const w = op.koshel || op.wallet, to = op.kuda || op.toWallet, cat = op.kat || op.cat;

            if (tip === "Трата") { wallets[w] = UI.r2(wallets[w] + s); bump("traty", cat, -s); }
            else if (tip === "Доход") { wallets[w] = UI.r2(wallets[w] - s); bump("dohody", cat, -s); }
            else if (tip === "Перевод") { wallets[w] = UI.r2(wallets[w] + s); wallets[to] = UI.r2(wallets[to] - s); }
            else return; // прочие типы отменяются только в «Финансах»

            ops.splice(idx, 1);
            State.setOps(ops);
            State.setWallets(wallets);
        }
    };

    global.FinanceAPI = FinanceAPI;
})(window);
