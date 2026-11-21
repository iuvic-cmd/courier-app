/**
 * selectors.js — единые расчёты для всех страниц (Calc).
 * Страницы ничего не считают сами: берут цифры отсюда, поэтому не расходятся.
 * Читает только через State / AppStorage, ничего не пишет.
 */
(function (global) {
    const num = v => Number(v) || 0;
    const sumBy = (a, f) => a.reduce((s, x) => s + f(x), 0);
    const catHas = (o, w) => String(o.cat || "").includes(w);

    // Операция журнала -> { date, kind: expense|income, cat, amount } или null (переводы, долги, цели и т.д. не считаются)
    function normOp(o) {
        if (!o || typeof o !== "object") return null;
        const date = String(o.data || o.date || "").slice(0, 10);
        const base = num(o.baz != null ? o.baz : o.summa);
        switch (o.tip) {
            case "Трата": return { date, kind: "expense", cat: o.kat, amount: base };
            case "Доход": return { date, kind: "income", cat: o.kat, amount: base };
            case "Кредитка":
                if (o.napr === "покупка") return { date, kind: "expense", cat: o.kat, amount: num(o.summa) };
                if (o.napr === "проценты") return { date, kind: "expense", cat: "💳 Проценты по кредиткам", amount: num(o.summa) };
                return null;
            case "Кредит":
            case "Ломбард":
                return o.napr === "платёж" && num(o.proc) > 0
                    ? { date, kind: "expense", cat: o.tip === "Кредит" ? "🏛 Проценты по кредитам" : "🥇 Проценты по ломбарду", amount: num(o.proc) }
                    : null;
            default: return null;
        }
    }
    const isExpense = o => !!o && o.kind === "expense";
    // Прочие доходы. «Зарплата» исключена: она учтена по дням, а получение — отдельная сущность (см. salary)
    const isIncome = o => !!o && o.kind === "income" && !String(o.cat || "").includes("Зарплата");
    const ops = () => State.getOps().map(normOp).filter(Boolean);

    // Зарплата за месяц: начислено (по дням), получено (операции «Доход» с ref salary), остаток
    const salaryReceipts = ym => State.getOps()
        .filter(o => o.tip === "Доход" && o.ref && o.ref.t === "salary" && o.ref.ym === ym)
        .sort((a, b) => String(b.data).localeCompare(String(a.data)));
    function salary(ym) {
        const days = State.getDays() || {};
        const accrued = sumBy(Object.keys(days).filter(k => k.startsWith(ym)), k => num(days[k].total));
        const received = sumBy(salaryReceipts(ym), o => num(o.summa));
        return { accrued, received, due: Math.max(0, Math.round((accrued - received) * 100) / 100) };
    }

    // Всё за месяц ym ("ГГГГ-ММ")
    function month(ym) {
        const days = State.getDays() || {};
        const dayKeys = Object.keys(days).filter(k => k.startsWith(ym)).sort();
        let sal = 0, orders = 0, workDays = 0, night = 0, ap = 0;
        dayKeys.forEach(k => {
            const r = days[k], n = num(r.night), a = num(r.ap), t = num(r.total);
            sal += t; night += n; ap += a; orders += n + a;
            if (n + a > 0 || t > 0) workDays++;
        });
        const mOps = ops().filter(o => o.date.startsWith(ym));
        const expenseOps = mOps.filter(isExpense);
        const incomeOps = mOps.filter(isIncome);
        const sumAbs = list => sumBy(list, o => Math.abs(num(o.amount)));
        const expenses = sumAbs(expenseOps), income = sumAbs(incomeOps);

        // Топливо берём из журнала заправок, если его нет — из расходов категории «Топливо»
        const fuels = State.getFuel().filter(f => String(f.date || "").startsWith(ym));
        const fuelFromLog = sumBy(fuels, f => num(f.total != null ? f.total : f.amount));
        const fuelCost = fuelFromLog > 0 ? fuelFromLog : sumAbs(expenseOps.filter(o => catHas(o, "Топливо")));
        // «Топливо (Скутер)» тоже содержит слово «Скутер» — исключаем, чтобы не считать дважды
        const scooterNonFuel = expenseOps.filter(o => catHas(o, "Скутер") && !catHas(o, "Топливо"));
        const maintCost = sumAbs(scooterNonFuel);
        const washCost = sumAbs(scooterNonFuel.filter(o => /мойк/i.test(String(o.cat || ""))));
        const sr = salary(ym);
        return {
            ym, dayKeys, salary: sal, totalOrders: orders, workDays, nightSum: night, apSum: ap,
            expenseOps, incomeOps, expenses, income, net: sal + income - expenses,
            fuels, fuelCost, maintCost, washCost, serviceCost: maintCost - washCost,
            salaryReceived: sr.received, salaryDue: Math.max(0, sal - sr.received)
        };
    }

    // Пройденные км по датам. Новые записи: trip; прежние: км за день (меньше стартового показания) или показание одометра.
    function kmDeltas() {
        const sc = State.getScooter() || {}, startKm = num(sc.startKm), out = [];
        const log = State.getMileageLog()
            .map(e => ({ date: String(e.date || ""), km: num(e.km), trip: e.trip != null ? num(e.trip) : null }))
            .filter(e => e.date);
        let odoL = startKm;
        log.filter(e => e.trip == null && e.km > 0).sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
            let d;
            if (e.km >= startKm) { d = Math.max(0, e.km - odoL); odoL = Math.max(odoL, e.km); }
            else { d = e.km; odoL += e.km; }
            out.push({ date: e.date, km: d });
        });
        log.filter(e => e.trip != null).forEach(e => out.push({ date: e.date, km: e.trip }));
        return out;
    }

    // Скутер за месяц: цена литра, пробег, расход, стоимость км. M — результат month(ym), если уже есть.
    function scooter(ym, M) {
        M = M || month(ym);
        const sc = State.getScooter() || {};
        const liters = sumBy(M.fuels, f => num(f.liters));
        const monthKm = sumBy(kmDeltas().filter(d => d.date.startsWith(ym)), d => d.km);
        const kmIsMonthly = monthKm > 0;
        return {
            liters,
            price: liters > 0 ? M.fuelCost / liters : 0,
            km: kmIsMonthly ? monthKm : Math.max(num(sc.currentKm) - num(sc.startKm), 0),
            kmIsMonthly,
            cons: kmIsMonthly ? liters / monthKm * 100 : 0,
            costKm: kmIsMonthly ? M.fuelCost / monthKm : 0
        };
    }

    global.Calc = { normOp, ops, isExpense, isIncome, salary, salaryReceipts, month, kmDeltas, scooter };
})(window);
