/**
 * finance-api.js — Единственный способ менять балансы и добавлять операции.
 * Формат операции: id, data, tip, summa, koshel, kat, kuda, zametka, baz, ref.
 * ref = { t: "fuel"|"comp"|"off", id, hid? } — ссылка на запись-источник (скутер и т.д.).
 */
(function (global) {
    const pad = n => String(n).padStart(2, "0");
    // date: null | "ГГГГ-ММ-ДД" | "ГГГГ-ММ-ДД ЧЧ:ММ"
    const stamp = date => {
        if (date && String(date).length > 10) return String(date);
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
    // Накопительные итоги по категориям (traty / dohody)
    const bump = (key, cat, v) => {
        if (!cat) return;
        const m = AppStorage.get(key, {}) || {};
        m[cat] = Math.max(0, UI.r2((m[cat] || 0) + v));
        AppStorage.set(key, m);
    };
    // Добавляет категорию в список, только если список уже хранится (не затираем дефолты «Финансов»)
    const ensureCat = (kind, cat) => {
        if (!cat || !AppStorage.has("categories")) return;
        const c = State.getCategories();
        const list = c[kind] = Array.isArray(c[kind]) ? c[kind] : [];
        if (!list.includes(cat)) { list.push(cat); State.setCategories(c); }
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

        exists(opId) {
            return opId != null && State.getOps().some(o => String(o.id) === String(opId));
        },

        // Трата (уменьшает баланс кошелька)
        spend({ date, wallet, amount, category, note, ref, addCategory }) {
            amount = UI.r2(UI.num(amount));
            if (amount <= 0) throw new Error("Сумма должна быть больше нуля");

            const wallets = State.getWallets();
            if (wallets[wallet] === undefined) throw new Error("Кошелёк не найден");
            if (wallets[wallet] < amount) throw new Error(`Недостаточно средств. На «${wallet}» только ${UI.fmt(wallets[wallet])}`);

            wallets[wallet] = UI.r2(wallets[wallet] - amount);
            State.setWallets(wallets);
            bump("traty", category, amount);
            if (addCategory) ensureCat("expense", category);

            return this._addOp({ data: stamp(date), tip: "Трата", summa: amount, koshel: wallet, kat: category, zametka: note, baz: toBase(wallet, amount), ref });
        },

        // Доход (увеличивает баланс кошелька)
        receive({ date, wallet, amount, category, note, ref, addCategory }) {
            amount = UI.r2(UI.num(amount));
            if (amount <= 0) throw new Error("Сумма должна быть больше нуля");

            const wallets = State.getWallets();
            if (wallets[wallet] === undefined) throw new Error("Кошелёк не найден");

            wallets[wallet] = UI.r2(wallets[wallet] + amount);
            State.setWallets(wallets);
            bump("dohody", category, amount);
            if (addCategory) ensureCat("income", category);

            return this._addOp({ data: stamp(date), tip: "Доход", summa: amount, koshel: wallet, kat: category, zametka: note, baz: toBase(wallet, amount), ref });
        },

        // Перевод между кошельками одной валюты (конвертация — только в «Финансах»)
        transfer({ date, fromWallet, toWallet, amount, note }) {
            amount = UI.r2(UI.num(amount));
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

        // Полный откат операции. Возвращает true, если откатили; бросает Error, если нельзя.
        // Типы Кредит / Ломбард / Кредитка / Долг / Цель / Конвертация откатываются только в «Финансах».
        undo(opId) {
            const ops = State.getOps();
            const idx = ops.findIndex(o => String(o.id) === String(opId));
            if (idx === -1) return false;

            const op = ops[idx], wallets = State.getWallets();
            const tip = op.tip, s = Math.abs(+op.summa || 0), w = op.koshel, to = op.kuda, cat = op.kat;
            if (!["Трата", "Доход", "Перевод", "Корректировка"].includes(tip)) throw new Error("Эту операцию можно отменить только в «Финансах»");
            if (wallets[w] === undefined || (tip === "Перевод" && wallets[to] === undefined)) throw new Error("Кошелёк из этой операции удалён");

            if (tip === "Трата") { wallets[w] = UI.r2(wallets[w] + s); bump("traty", cat, -s); }
            else if (tip === "Доход") {
                if (wallets[w] < s) throw new Error("На кошельке уже меньше этой суммы");
                wallets[w] = UI.r2(wallets[w] - s); bump("dohody", cat, -s);
            } else if (tip === "Корректировка") {
                const v = UI.r2(wallets[w] - (+op.summa || 0));
                if (v < 0) throw new Error("Баланс станет отрицательным");
                wallets[w] = v;
            } else {
                if (wallets[to] < s) throw new Error("На кошельке назначения уже меньше");
                wallets[w] = UI.r2(wallets[w] + s); wallets[to] = UI.r2(wallets[to] - s);
            }

            ops.splice(idx, 1);
            State.setOps(ops);
            State.setWallets(wallets);
            return true;
        }
    };

    global.FinanceAPI = FinanceAPI;
})(window);
