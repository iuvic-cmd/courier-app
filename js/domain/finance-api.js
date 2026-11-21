/**
 * finance-api.js — Единственный способ менять балансы и добавлять операции.
 * Все денежные операции приложения (траты, доходы, переводы, конвертации, карты, кредиты, ломбард, долги, цели).
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

        // ====== Остальные денежные операции «Финансов» (раньше жили в fin.html) ======
        // Ошибки — Error с понятным текстом. Всё пишется в хранилище; страница после вызова перечитывает данные.
        _ym() { return stamp(null).slice(0, 7); },
        _pos(x) { x = UI.r2(UI.num(x)); if (!(x > 0)) throw new Error("Сумма должна быть больше нуля"); return x; },
        _wallets(w) { const ws = State.getWallets(); if (ws[w] === undefined) throw new Error("Кошелёк не найден"); return ws; },
        _rec(tip, s, w, o) {
            const z = Object.assign({ data: stamp(o && o.date), tip, summa: s, koshel: w }, o);
            delete z.date;
            if (w && walletCur(w) !== "MDL" && ["Трата", "Доход", "Корректировка"].includes(tip)) z.baz = toBase(w, s);
            return this._addOp(z);
        },
        _card(id) {
            const cards = AppStorage.get("kartki", []) || [], c = cards.find(x => x.id === id);
            if (!c) throw new Error("Карта не найдена");
            return { cards, c };
        },

        // Конвертация между кошельками разных валют
        convert({ date, fromWallet, toWallet, amount, received, note }) {
            const s = this._pos(amount);
            if (fromWallet === toWallet) throw new Error("Выберите разные кошельки");
            const ws = this._wallets(fromWallet); this._wallets(toWallet);
            if (ws[fromWallet] < s) throw new Error(`Недостаточно средств на «${fromWallet}»`);
            if (walletCur(fromWallet) === walletCur(toWallet)) throw new Error("Валюты совпадают — используйте перевод");
            const t = UI.r2(UI.num(received));
            if (!(t > 0)) throw new Error("Укажи сумму к зачислению");
            ws[fromWallet] = UI.r2(ws[fromWallet] - s); ws[toWallet] = UI.r2(ws[toWallet] + t);
            State.setWallets(ws);
            return this._addOp({ data: stamp(date), tip: "Конвертация", summa: s, koshel: fromWallet, kuda: toWallet, summa_kuda: t, zametka: note });
        },

        // Корректировка баланса кошелька до реального остатка
        adjust({ wallet, actual, note }) {
            const ws = this._wallets(wallet), r = UI.r2(UI.num(actual));
            if (!isFinite(r) || r < 0) throw new Error("Остаток не может быть отрицательным");
            const d = UI.r2(r - ws[wallet]);
            if (!d) throw new Error("Уже совпадает");
            ws[wallet] = r; State.setWallets(ws);
            return this._rec("Корректировка", d, wallet, { zametka: note });
        },

        // --- Кредитные карты ---
        payCard({ date, wallet, cardId, amount, note }) {
            const s = this._pos(amount), { cards, c } = this._card(cardId), ws = this._wallets(wallet);
            if (walletCur(wallet) !== "MDL") throw new Error("Платёж по карте — только с кошелька в леях");
            if (ws[wallet] < s) throw new Error(`Недостаточно средств на «${wallet}»`);
            if (s > c.dolg) throw new Error("Больше текущего долга по карте (" + UI.fmt(c.dolg) + ")");
            const pp = c.posl;
            ws[wallet] = UI.r2(ws[wallet] - s); c.dolg = UI.r2(c.dolg - s);
            if (!c.min || s >= c.min || c.dolg <= 0) c.posl = this._ym();
            State.setWallets(ws); AppStorage.set("kartki", cards);
            return this._rec("Кредитка", s, wallet, { date, kat: c.nazvanie, napr: "платёж", cid: c.id, pp, zametka: note });
        },
        cardBuy({ date, cardId, category, amount, note }) {
            const s = this._pos(amount), { cards, c } = this._card(cardId), av = UI.r2(c.limit - c.dolg);
            if (s > av) throw new Error("Превышен лимит. Доступно: " + UI.fmt(Math.max(0, av)));
            c.dolg = UI.r2(c.dolg + s); bump("traty", category, s);
            AppStorage.set("kartki", cards);
            return this._rec("Кредитка", s, c.nazvanie, { date, kat: category, napr: "покупка", cid: c.id, zametka: note });
        },
        cardFee({ date, cardId, amount, note }) {
            const s = this._pos(amount), { cards, c } = this._card(cardId);
            c.dolg = UI.r2(c.dolg + s); AppStorage.set("kartki", cards);
            return this._rec("Кредитка", s, c.nazvanie, { date, kat: c.nazvanie, napr: "проценты", cid: c.id, zametka: note });
        },
        cardCash({ date, cardId, wallet, amount }) {
            const s = this._pos(amount), { cards, c } = this._card(cardId), ws = this._wallets(wallet), av = UI.r2(c.limit - c.dolg);
            if (s > av) throw new Error("Превышен лимит. Доступно: " + UI.fmt(Math.max(0, av)));
            c.dolg = UI.r2(c.dolg + s); ws[wallet] = UI.r2(ws[wallet] + s);
            State.setWallets(ws); AppStorage.set("kartki", cards);
            return this._rec("Кредитка", s, wallet, { date, kat: c.nazvanie, napr: "снятие", cid: c.id });
        },
        // Привести долг по карте к значению debt (после правки параметров карты)
        cardAdjust({ cardId, debt }) {
            const { cards, c } = this._card(cardId), d = Math.abs(UI.r2(UI.num(debt))), df = UI.r2(d - c.dolg);
            if (!df) return null;
            c.dolg = d; AppStorage.set("kartki", cards);
            return this._rec("Кредитка", Math.abs(df), c.nazvanie, { kat: c.nazvanie, napr: "корректировка", cid: c.id, d: df });
        },
        undoCard(opId) {
            const ops = State.getOps(), z = ops.find(x => String(x.id) === String(opId));
            if (!z) return false;
            const { cards, c } = this._card(z.cid), ws = State.getWallets(), s = z.summa, n = z.napr;
            if (n === "покупка") { c.dolg = UI.r2(c.dolg - s); bump("traty", z.kat, -s); }
            else if (n === "проценты") { c.dolg = UI.r2(c.dolg - s); }
            else if (n === "платёж") {
                if (!(z.koshel in ws)) throw new Error("Кошелёк из операции удалён");
                c.dolg = UI.r2(c.dolg + s); ws[z.koshel] = UI.r2(ws[z.koshel] + s); c.posl = z.pp || "";
            } else if (n === "снятие") {
                if (!(z.koshel in ws) || ws[z.koshel] < s) throw new Error("На кошельке уже меньше этой суммы");
                ws[z.koshel] = UI.r2(ws[z.koshel] - s); c.dolg = UI.r2(c.dolg - s);
            } else if (n === "корректировка") { c.dolg = UI.r2(c.dolg - z.d); }
            else throw new Error("Эту операцию нельзя отменить");
            c.dolg = Math.max(0, c.dolg);
            ops.splice(ops.indexOf(z), 1);
            State.setOps(ops); State.setWallets(ws); AppStorage.set("kartki", cards);
            return true;
        },

        // --- Кредиты и ломбард ---
        payCredit({ date, creditId, wallet, amount }) {
            let s = this._pos(amount);
            const ks = AppStorage.get("kredity", []) || [], k = ks.find(x => x.id === creditId);
            if (!k) throw new Error("Кредит не найден");
            const ws = this._wallets(wallet);
            const pr = Math.min(s, UI.r2(k.ostatok * k.stavka / 1200)), os = UI.r2(Math.min(k.ostatok, s - pr));
            s = UI.r2(pr + os);
            if (ws[wallet] < s) throw new Error("Недостаточно средств");
            ws[wallet] = UI.r2(ws[wallet] - s); k.ostatok = UI.r2(k.ostatok - os); k.posl = this._ym();
            State.setWallets(ws); AppStorage.set("kredity", ks);
            return this._rec("Кредит", s, wallet, { date, kat: k.nazvanie, napr: "платёж", osn: os, proc: pr });
        },
        payLombard({ date, wallet, amount }) {
            const ym = this._ym(), lomb = AppStorage.get("lombard", []) || [];
            const I = AppStorage.get("lombard_info", { stavka: 3, den: 25, koshel: "Наличные", proc_ym: "", proc_sum: 0 });
            const LO = () => lomb.filter(b => b.ostatok > 0.005);
            const pm = UI.r2(LO().reduce((a, b) => a + b.summa, 0) * I.stavka / 100);
            const due = Math.max(0, UI.r2(pm - (I.proc_ym === ym ? I.proc_sum : 0)));
            const tot = UI.r2(LO().reduce((a, b) => a + b.ostatok, 0));
            const s = Math.min(this._pos(amount), UI.r2(due + tot)), ws = this._wallets(wallet);
            if (ws[wallet] < s) throw new Error("Недостаточно средств");
            const pr = Math.min(s, due); let rest = UI.r2(s - pr); const det = [];
            LO().forEach(b => {
                if (rest <= 0) return;
                const x = Math.min(rest, b.ostatok);
                b.ostatok = UI.r2(b.ostatok - x); rest = UI.r2(rest - x); det.push([b.id, x]);
                if (b.ostatok <= 0.005) b.ostatok = 0;
            });
            ws[wallet] = UI.r2(ws[wallet] - s);
            if (I.proc_ym !== ym) { I.proc_ym = ym; I.proc_sum = 0; }
            I.proc_sum = UI.r2(I.proc_sum + pr);
            State.setWallets(ws); AppStorage.set("lombard", lomb); AppStorage.set("lombard_info", I);
            return this._rec("Ломбард", s, wallet, { date, kat: "Ломбард", napr: "платёж", osn: UI.r2(s - pr), proc: pr, det });
        },

        // --- Долги людям ---
        debtNew({ date, borrowed, person, wallet, amount, note }) {
            const s = this._pos(amount), kk = String(person || "").trim();
            if (!kk) throw new Error("Укажи, кто");
            const ws = this._wallets(wallet);
            if (!borrowed && ws[wallet] < s) throw new Error("Недостаточно средств");
            ws[wallet] = UI.r2(ws[wallet] + (borrowed ? s : -s));
            const list = AppStorage.get("dolgi", []) || [];
            const d = { id: Math.max(0, ...list.map(x => x.id || 0)) + 1, kto: kk, napr: borrowed ? "Я должен" : "Мне должны", summa: s, ostatok: s, data: stamp(date), zametka: note };
            if (walletCur(wallet) !== "MDL") d.val = walletCur(wallet);
            list.push(d);
            State.setWallets(ws); AppStorage.set("dolgi", list);
            return this._rec("Долг", s, wallet, { date, kat: kk, napr: borrowed ? "взял" : "дал", zametka: note, did: d.id });
        },
        debtPay({ date, debtId, wallet, amount }) {
            const s = this._pos(amount), list = AppStorage.get("dolgi", []) || [], d = list.find(x => x.id === debtId);
            if (!d) throw new Error("Долг не найден");
            const me = d.napr === "Я должен", ws = this._wallets(wallet);
            if (s > d.ostatok) throw new Error("Больше остатка долга");
            if (me && ws[wallet] < s) throw new Error("Недостаточно средств");
            ws[wallet] = UI.r2(ws[wallet] + (me ? -s : s)); d.ostatok = UI.r2(d.ostatok - s);
            State.setWallets(ws); AppStorage.set("dolgi", list);
            return this._rec("Долг", s, wallet, { date, kat: d.kto, napr: me ? "вернул я" : "вернули мне", did: d.id });
        },

        // --- Цели накоплений ---
        goalMove({ date, goal, inn, wallet, amount }) {
            const s = this._pos(amount), celi = AppStorage.get("celi", {}) || {}, g = celi[goal];
            if (!g) throw new Error("Цель не найдена");
            const ws = this._wallets(wallet);
            if (inn) {
                if (ws[wallet] < s) throw new Error("Недостаточно средств");
                ws[wallet] = UI.r2(ws[wallet] - s); g.nakopleno = UI.r2(g.nakopleno + s);
            } else {
                if (g.nakopleno < s) throw new Error("В цели меньше");
                g.nakopleno = UI.r2(g.nakopleno - s); ws[wallet] = UI.r2(ws[wallet] + s);
            }
            State.setWallets(ws); AppStorage.set("celi", celi);
            return this._rec("Цель", s, wallet, { date, kat: goal, napr: inn ? "in" : "out" });
        },

        // Полный откат операции. Возвращает true, если откатили; бросает Error, если нельзя.
        // Типы Кредит / Ломбард / Кредитка / Долг / Цель / Конвертация откатываются только в «Финансах».
        undo(opId) {
            const ops = State.getOps();
            const idx = ops.findIndex(o => String(o.id) === String(opId));
            if (idx === -1) return false;

            const op = ops[idx], wallets = State.getWallets();
            if (op.tip === "Кредитка") return this.undoCard(opId);
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
