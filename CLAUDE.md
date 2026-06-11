# NexDev Talent — Platformă internă de recrutare asistată de AI

## Context și rol

Acest proiect este platforma internă de recrutare a NexDev (firmă de consultanță și staffing IT din București). Utilizator principal: Marius Enache, Executive Director — **non-tehnic**. Tu (Claude Code) ești arhitectul și developerul; Marius e product owner și validator de business logic.

Reguli de colaborare:
- Explică fiecare pas în limbaj simplu, în română, înainte să-l execuți.
- Nu rula operațiuni distructive (ștergere date, drop tables, force push) fără confirmare explicită.
- La final de sesiune, fă commit cu mesaje descriptive și rezumă ce s-a construit și ce urmează.
- Construiește incremental: fiecare sesiune trebuie să lase aplicația într-o stare funcțională, testabilă în browser.

## Business context

- Client principal actual: London Stock Exchange Group (LSEG), prin platforma de vendor management Fieldglass. În viitor: mai mulți clienți.
- Flux real: clientul deschide un rol → îl publică în Fieldglass → NexDev trimite candidați într-un format impus (coversheet LSEG cu skilluri + CV-ul candidatului reformatat în template NexDev).
- Candidații vin de pe LinkedIn (sourcing propriu), de la recruiteri externi sau de la parteneri.
- Platforma este alternativa internă la o ofertă comercială de ~2.000 EUR (MINDLOOP); scopul: aceleași funcționalități + funcții specifice NexDev pe care nicio platformă generică nu le are.

## Stack tehnic (decis, nu se schimbă fără discuție)

- **Frontend + Backend:** Next.js 15 (App Router) + TypeScript
- **DB / Auth / Storage:** Supabase (Postgres, auth, file storage pentru CV-uri, row-level security)
- **AI:** Claude API — Sonnet pentru scoring/matching, Haiku pentru parsing CV
- **Deploy:** Vercel
- **Generare documente (faza 3):** Node.js `docx` library pentru CV NexDev; unpack/repack XML pentru coversheet LSEG
- Desktop-first; responsive secundar.

## Design system

- Brand NexDev: navy `#0B1A33` (sidebar, accente închise), albastru accent `#2AA3FF`, fundal light, mult alb.
- Direcție vizuală: SaaS modern curat (referință: ecranele concept din oferta MINDLOOP — sidebar navigare stânga, carduri de statistici pe dashboard, scoruri AI circulare colorate (verde >85%, galben 60–85%, roșu <60%), tag-uri/pastile pentru competențe și statusuri, tabele cu filtre sus).
- NU copia pixel-perfect mockup-urile MINDLOOP; replică structura și claritatea, cu brandul NexDev.
- Logo oficial: `Logo_Firma.png` (cere fișierul dacă lipsește; nu genera placeholder).

## Module și funcționalități (scope complet MVP)

### 1. Candidați
- CRUD candidat: nume, prenume, email, telefon, LinkedIn, locație, ani experiență, senioritate.
- **Profil/categorie** dintr-un nomenclator (Project Manager, Penetration Tester, Data Engineer, DevOps, iOS Developer, Quant Developer etc.) — extensibil de utilizator.
- **Skilluri** selectate dintr-un nomenclator central de skilluri IT, pre-populat (limbaje, frameworks, cloud, security, data, tools, certificări). Selecție cu căutare typeahead — filtrare instant la fiecare literă tastată. Utilizatorul poate adăuga skilluri noi în nomenclator.
- **Rate candidat** (cât cere) + **monedă selectabilă** (EUR/USD/GBP/RON).
- **Sursă CV:** sourcing propriu / recruiter extern / partener — cu selecție partener dintr-un nomenclator de parteneri (nume, contact, condiții comision).
- **Flag "successful candidate"**: derivat automat (are cel puțin un contract finalizat cu succes) + setabil manual pentru istoric pre-platformă; afișează pentru ce client a lucrat.
- Upload CV (PDF/DOCX) cu **parsing automat via Claude** → precompletează profilul (nume, skilluri detectate, experiență); utilizatorul validează înainte de salvare.
- Notițe interne + istoric interacțiuni pe candidat.
- **Link public de upload CV** (fază MVP, în loc de cont complet de candidat): generezi un link, candidatul își încarcă CV-ul + bifează consimțământ GDPR, intră în baza de date cu status "Nou". Conturi complete self-service de candidat = post-MVP.

### 2. Roluri / Joburi
- CRUD rol: titlu, client (nomenclator clienți — LSEG primul), descriere/JD complet, cerințe obligatorii, competențe preferate (din nomenclatorul de skilluri), locație, senioritate, tip colaborare, status job, **Fieldglass ID (RFTJP...)**, deadline submisii.
- **Etape de interviu configurabile per rol**: utilizatorul definește câte etape vrea, cu nume și ordine (ex: Screening → Interviu tehnic → Interviu manager → Interviu final). Template default copiabil.
- La crearea unui rol: **matching automat invers** — aplicația scanează baza existentă și propune candidații potriviți (păstrarea candidaților valoroși pentru oportunități viitoare).

### 3. Pipeline / Submisii
- Asignarea candidaților la rol din poolul existent (căutare + filtrare la asignare).
- Statusuri per submisie (set predefinit, preluat din oferta MINDLOOP): Nou, CV primit, În analiză, Potrivire identificată, De contactat, Contactat, Screening programat, Screening realizat, Propus către client, Nepotrivit, În așteptare job potrivit, Închis — plus progresul prin etapele de interviu definite pe rol.
- Vizualizare per rol: câți candidați în fiecare etapă, cine a avansat, cine a fost respins (funnel vizibil).
- **Feedback per candidat per etapă**, cu istoric complet (cine, când, ce rezultat).
- Vizualizare Kanban a pipeline-ului (stil Fieldglass, ca în mockup-urile aprobate anterior).

### 4. AI Matching & Scoring
- Scoring transparent: rubrică **editabilă per rol**, derivată din JD-ul real (criterii ponderate, scor per criteriu, breakdown auditabil — același mecanism pe care Marius îl folosește manual azi).
- Scor afișat ca procent + listă de **competențe comune** + argumentele potrivirii în limbaj natural (ca în ecranul Matching AI din ofertă).
- Regulă de scoring (importată din practica NexDev): scorează linie cu linie contra textului literal "Required Knowledge" din JD, aceeași rubrică pe toată cohorta, nu impune interpretări peste litera JD-ului.

### 5. Căutare & Filtrare
- Motor de căutare candidați: după nume, skilluri, profil, locație, senioritate, status, sursă/partener.
- Filtre combinabile + vizualizare după statusul curent.

### 6. Dashboard
- Carduri: candidați noi (ultimele 7 zile), joburi active, potriviri AI de calitate, candidați de contactat.
- Activitate recentă, joburi cu cele mai bune potriviri, top candidați cu scoruri.
- Funnel pipeline agregat.

### 7. Contracte & Financiar (specific NexDev — nu există la MINDLOOP)
- Când o submisie devine plasare → se creează **contract**: candidat, rol, client, **start date, end date, pay rate (cât plătește NexDev candidatului), bill rate (cât facturează NexDev clientului), monedă per rate, comision către partener (dacă sursa e partener)**.
- Tabel centralizat al tuturor oamenilor angajați/plasați cu toate câmpurile de mai sus + **marjă calculată automat** (per om, per lună, agregat).
- Date sensibile: protejate prin row-level security; vizibile doar utilizatorului admin.

## Schema bazei de date (validată cu Marius)

Tabele: `profiles` (nomenclator categorii), `skills` (nomenclator skilluri, cu categorie), `partners`, `clients`, `candidates` (FK profile, partner; rate+currency, source_type, successful, cv_file), `candidate_skills` (M2M), `roles` (FK client; fieldglass_id, jd, status), `role_stages` (FK role; ordine, nume etapă), `submissions` (FK candidate, role; current_stage, status), `stage_history` (FK submission, stage; rezultat, feedback, data), `contracts` (FK submission; start/end date, pay_rate, bill_rate, currency, comision_partener). Toate cu uuid PK, created_at/updated_at, soft delete unde are sens.

## Plan pe faze

- **F1 — Fundație:** setup Next.js + Supabase, schema completă + seed nomenclatoare (skilluri IT ~300+, profiluri, clienți: LSEG), auth (un singur user admin), layout cu sidebar + design system.
- **F2 — Candidați & Roluri:** CRUD complet ambele module, typeahead skilluri, upload + parsing CV cu Claude, link public de upload.
- **F3 — Pipeline & Matching:** submisii, etape configurabile, statusuri, feedback, Kanban, AI scoring cu rubrici editabile + matching invers la rol nou.
- **F4 — Dashboard, Contracte, Documente:** dashboard, modul contracte cu marje, căutare globală; apoi generare documente (CV NexDev format Adrian Turbatu + coversheet LSEG + email RPH) — prioritatea exactă se decide cu Marius.

## Post-MVP (explicit NU acum)
Conturi complete self-service candidați; import candidați din email; preluare CV-uri din WhatsApp; integrare automată LinkedIn; automatizări de follow-up; conturi pentru clienți finali; publicare joburi de către clienți; monetizare. Site-ul public nexdev.vip va citi rolurile deschise din Supabase (endpoint public read-only) — de planificat după F4.
