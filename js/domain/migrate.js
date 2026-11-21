/**
 * migrate.js — версия схемы данных и автомиграции.
 * Вызывать на каждой странице сразу после state.js:  Schema.run();
 * Перед каждой миграцией делается резервная копия затрагиваемых ключей.
 */
(function (global) {
    const VERSION = 2;
    const maxId = ops => Math.max(0, ...ops.map(o => +o.id || 0));

    const MIGRATIONS = {
        // v1: старый формат операций (kind/amount/date/cat/wallet) -> единый (tip/summa/data/kat/koshel)
        1() {
            const ops = State.getOps();
            if (!ops.some(z => z && typeof z === "object" && z.kind)) return;
            AppStorage.set("backup_ops_pre_v1", ops);
            let id = maxId(ops);
            State.setOps(ops.map(z => {
                if (!z || typeof z !== "object" || !z.kind) return z;
                const b = {
                    id: +z.id > 0 ? +z.id : ++id,
                    data: (z.date || "") + " 00:00",
                    koshel: z.wallet,
                    summa: Math.abs(+z.amount || 0)
                };
                if (z.note) b.zametka = z.note;
                if (String(z.cat || "").includes("Корректировка")) return Object.assign(b, { tip: "Корректировка", summa: +z.amount || 0 });
                if (z.kind === "expense") return Object.assign(b, { tip: "Трата", kat: z.cat });
                if (z.kind === "income") return Object.assign(b, { tip: "Доход", kat: z.cat });
                if (z.kind === "transfer") return Object.assign(b, { tip: "Перевод", kuda: z.toWallet });
                return z;
            }));
        },

        // v2: заправки — единое поле суммы total (раньше иногда amount)
        2() {
            const fuels = State.getFuel();
            if (!fuels.some(f => f && f.total == null && f.amount != null)) return;
            AppStorage.set("backup_fuel_pre_v2", fuels);
            State.setFuel(fuels.map(f => {
                if (f && f.total == null && f.amount != null) {
                    const g = Object.assign({}, f, { total: +f.amount || 0 });
                    delete g.amount;
                    return g;
                }
                return f;
            }));
        }
    };

    global.Schema = {
        VERSION,
        run() {
            let v = +AppStorage.get("schema", 0) || 0;
            // Импорт старой копии мог откатить ключ schema — миграции идемпотентны, просто прогоняем снова
            const start = v;
            while (v < VERSION) {
                v++;
                try { MIGRATIONS[v](); }
                catch (e) { console.error("Schema: миграция v" + v + " не удалась", e); return false; }
            }
            if (v !== start) AppStorage.set("schema", v);
            return true;
        }
    };
})(window);
