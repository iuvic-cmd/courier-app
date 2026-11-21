/**
 * schedule.js — Графики смен и короткие дни.
 */
(function (global) {
    // Пара смен
    const PAIRS = [[1,2],[3,4],[5,6],[7,1],[2,3],[4,5],[6,7]];
    
    const dayDiff = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
    const isWeekendStr = ds => { const w = new Date(ds + "T12:00:00").getDay(); return w === 0 || w === 6; };
    
    const Schedule = {
        isWorkDay(dateStr, firstWorkDay) {
            if (!firstWorkDay) return false;
            const p = ((dayDiff(firstWorkDay, dateStr) % 4) + 4) % 4;
            return p === 0 || p === 1;
        },

        getWorkDayIndex(dateStr, firstWorkDay) {
            if (!firstWorkDay) return null;
            const diff = dayDiff(firstWorkDay, dateStr), pos = ((diff % 4) + 4) % 4;
            if (pos >= 2) return null;
            return (diff >= 0 ? Math.floor(diff / 4) : Math.ceil((diff - 3) / 4)) * 2 + pos;
        },

        getPairForWorkDay(wdi, offset) {
            const idx = (((wdi + offset) % 7) + 7) % 7;
            return PAIRS[idx];
        },

        // Возвращает true, если в этот день у курьера короткий день
        isMyShortDay(dateStr) {
            const shift = State.getShift();
            if (!shift || !shift.myNumber || !shift.firstWorkDay) return false;
            const wdi = this.getWorkDayIndex(dateStr, shift.firstWorkDay);
            if (wdi === null) return false;
            const pair = this.getPairForWorkDay(wdi, shift.offset);
            return pair.includes(shift.myNumber);
        },
        
        // Генерация типа дня по умолчанию (если он не задан вручную)
        getDefaultDayType(dateStr) {
            const shift = State.getShift();
            if (!shift) return isWeekendStr(dateStr) ? "weekend" : "work";
            
            if (this.isWorkDay(dateStr, shift.firstWorkDay)) {
                return this.isMyShortDay(dateStr) ? "short" : "work";
            }
            return "weekend";
        }
    };

    global.Schedule = Schedule;
})(window);
