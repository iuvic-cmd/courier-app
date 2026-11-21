/**
 * backup.js — резервные копии, снимки перед опасными действиями, защита от автоочистки.
 * Нужен: storage.js (AppStorage). Данные приложения лежат в localStorage с префиксом uchot.v2.
 */
(function (global) {
    const PREFIX = "uchot.v2.";
    const INTERNAL = /^(snap_|backup_)/; // служебные ключи в копию не входят
    const pad = n => String(n).padStart(2, "0");
    const today = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };

    function collect() {
        const out = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith(PREFIX)) continue;
            const name = k.slice(PREFIX.length);
            if (INTERNAL.test(name)) continue;
            try { out[name] = JSON.parse(localStorage.getItem(k)); } catch (e) { out[name] = localStorage.getItem(k); }
        }
        return out;
    }

    // Значение -> литерал Python (компактно)
    function py(v) {
        if (v === null || v === undefined) return "None";
        if (v === true) return "True";
        if (v === false) return "False";
        if (typeof v === "number") return String(v);
        if (typeof v === "string") return "'" + v.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + "'";
        if (Array.isArray(v)) return "[" + v.map(py).join(",") + "]";
        return "{" + Object.keys(v).map(k => py(k) + ":" + py(v[k])).join(",") + "}";
    }

    function build(fmt) {
        const data = collect(), names = Object.keys(data).sort();
        if (fmt === "json") {
            const o = {};
            names.forEach(k => o[PREFIX + k] = data[k]);
            return { text: JSON.stringify(o, null, 2), count: names.length, ext: "json", mime: "application/json" };
        }
        const lines = ["# Копия данных «Учёт» " + today()];
        names.forEach(k => lines.push(k + " = " + py(data[k])));
        return { text: lines.join("\n") + "\n", count: names.length, ext: "txt", mime: "text/plain" };
    }

    const Backup = {
        format() { try { return localStorage.getItem("export_fmt") === "json" ? "json" : "py"; } catch (e) { return "py"; } },
        build,

        mark() { AppStorage.set("last_backup", new Date().toISOString()); },
        daysSince() {
            const v = AppStorage.get("last_backup", null);
            if (!v) return null;
            const t = new Date(v).getTime();
            return isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t) / 86400000));
        },

        // Скачать файл копии. Бросает Error, если данных нет.
        download(fmt) {
            const { text, count, ext, mime } = build(fmt || this.format());
            if (!count) throw new Error("Нет данных для копии");
            const url = URL.createObjectURL(new Blob([text], { type: mime + ";charset=utf-8" }));
            const a = document.createElement("a");
            a.href = url; a.download = "uchot-backup-" + today() + "." + ext;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            this.mark();
            return count;
        },

        // Снимок «на всякий случай» перед импортом или сбросом (один, последний)
        snapshot() {
            try { const data = collect(); AppStorage.set("snap_last", { at: new Date().toISOString(), count: Object.keys(data).length, data }); }
            catch (e) { console.warn("Backup.snapshot:", e); }
        },
        snapshotInfo() {
            const s = AppStorage.get("snap_last", null);
            return s && s.data ? { at: s.at, count: s.count } : null;
        },
        restoreSnapshot() {
            const s = AppStorage.get("snap_last", null);
            if (!s || !s.data) throw new Error("Снимка нет");
            Object.keys(collect()).forEach(k => AppStorage.remove(k));
            Object.keys(s.data).forEach(k => AppStorage.set(k, s.data[k]));
            return Object.keys(s.data).length;
        },

        // Просим браузер не удалять данные при нехватке места
        persist() {
            try { if (navigator.storage && navigator.storage.persist) return navigator.storage.persist().catch(() => false); } catch (e) {}
            return Promise.resolve(false);
        },
        isPersisted() {
            try { if (navigator.storage && navigator.storage.persisted) return navigator.storage.persisted().catch(() => false); } catch (e) {}
            return Promise.resolve(false);
        }
    };

    global.Backup = Backup;
})(window);
