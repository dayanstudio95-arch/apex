# APEX

אפליקציית אימונים בעברית: מאמן חכם שבונה תוכנית ומעלה עומס לבד, רצף שבועי, XP ורמות, הישגים ומעקב התקדמות.

**פותחים ב-Safari באייפון → שיתוף → הוספה למסך הבית.**

- כל הנתונים נשמרים רק במכשיר (IndexedDB). אין שרת ואין חשבון.
- עובדת גם בלי אינטרנט (PWA).
- מאגר התרגילים והתמונות: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (נחלת הכלל).

## פיתוח
```bash
npm install
npm run dev      # http://localhost:5173/apex/
npx vitest run   # בדיקות המנוע
npm run build
```
כל דחיפה ל-`main` בונה ומפרסמת אוטומטית ל-GitHub Pages.
