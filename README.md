# ie personal finances

Aplicație de buget și finanțe personale, alb-negru, gândită pentru telefon și calculator.

- **Dashboard**: valoare netă, încasări, cheltuieli, investiții, credite, datorii, scadențe
- **Tranzacții**: pe zile, cu filtre și căutare
- **Conturi**: numerar, carduri (MAIB, MICB), economii în EUR, transferuri și schimb valutar EUR ⇄ MDL
- **Bugete** lunare pe categorii
- **Investiții** în USD / EUR / MDL
- **Credite** cu plata ratei (dobândă + principal)
- **Datorii**: cât datorezi și cât ți se datorează
- **Analiză**: rata de economisire, cheltuieli pe categorii, ultimele 6 luni

Fără dependențe și fără build: HTML, CSS și JavaScript simplu.

## Unde se salvează datele

Datele stau **doar în browserul în care folosești aplicația** (`localStorage`). Nu se trimit nicăieri și nu ajung în repository.
Fiecare dispozitiv și fiecare browser are datele lui. Pentru backup sau mutare pe alt dispozitiv: **Setări → Exportă JSON / Importă JSON**.

## Publicare pe GitHub Pages

1. Creează un repository nou pe GitHub și urcă fișierele din acest folder.
2. În repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, alege `main` și folderul `/ (root)`, apoi **Save**.
3. După 1–2 minute aplicația e la `https://<utilizator>.github.io/<repository>/`. Merge de pe orice telefon, nu doar din rețeaua de acasă.

Pe iPhone: Safari → Share → **Add to Home Screen**. Pe Android: Chrome → meniu → **Add to Home screen**.

## Rulare locală (Windows)

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Apoi deschide `http://localhost:5173`. Scriptul afișează și adresa pentru telefon din aceeași rețea Wi-Fi.

## Structură

```
index.html        scheletul paginii
css/styles.css    tema, layout, animații
js/app.js         date, calcule, ecrane, formulare
serve.ps1         server local pentru dezvoltare
```
