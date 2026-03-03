# Startprompt für Claude Code

Kopiere den folgenden Text und füge ihn als ersten Prompt in Claude Code ein:

---

Lies die CLAUDE.md in diesem Ordner. Sie enthält den vollständigen Kontext für dieses Projekt.

Deine Aufgabe: Baue die komplette Landingpage für das Digitalwerk24 Empfehlungsprogramm und deploye sie auf Vercel unter empfehlung.digitalwerk24.com. Der CNAME-Eintrag in Cloudflare ist bereits gesetzt (empfehlung → cname.vercel-dns.com, Nur DNS).

Gehe in dieser Reihenfolge vor:

1. **Projekt initialisieren:** Erstelle ein sauberes Projekt in diesem Ordner. Statisches HTML/CSS/JS bevorzugt – kein Framework nötig, die Seite muss nur schnell laden und gut aussehen. Falls du ein Framework verwenden willst, dann Next.js mit Static Export.

2. **Landingpage bauen:** Setze die komplette Seitenstruktur aus der CLAUDE.md um. WICHTIG: Die Seite muss BEGEISTERN. Die Besucher kommen über Facebook Ads und müssen sofort das große Geld riechen. Der 199€-Betrag muss riesig und überall präsent sein. Jeder Abschnitt muss motivieren – kurze, knackige Texte, du-Ansprache, positive Energie. Die Seite verkauft eine CHANCE, kein Produkt. Denke an die besten Affiliate/Empfehlungsprogramm-Landingpages die du kennst. Folgende Abschnitte umsetzen:
   - Hero mit Headline "Verdiene 199€ – mit einer einzigen Empfehlung", großer animierter 199€-Betrag, emotionaler CTA
   - Verdienstrechner: "1 Empfehlung = 199€ / 5 = 995€ / 10 = 1.990€" – visuell als aufsteigende Balken oder Karten
   - "So funktioniert's" als 3-Schritte-Darstellung mit großen Icons
   - Zielgruppen als ansprechende Karten (Studenten, Freelancer, Handwerker-Umfeld, Gründer, Jeder)
   - Trust-Badges: "Kostenlos", "Keine Verpflichtung", "Auszahlung garantiert", "Ohne Limit"
   - Anmeldeformular mit motivierender Headline und großem CTA-Button
   - FAQ-Bereich als Akkordeon
   - Mehrere CTA-Buttons über die gesamte Seite verteilt – nach JEDEM Abschnitt einen "Jetzt anmelden"-Button
   - Footer mit Impressum, Datenschutz, Kontakt – KEIN Link zur Hauptseite

3. **Design:** Verwende die DW24-Farben aus der CLAUDE.md (Primär: #F97316, Dunkel: #1E293B). Die Seite muss LEBENDIG wirken – sanfte Scroll-Animationen, große Typografie, der 199€-Betrag als visueller Anker. Binde das Logo DW-24-Logo.png ein falls es im Ordner liegt. Mobile-first: 80%+ der Besucher kommen vom Handy über Social Media Ads.

4. **Formular:** Das Anmeldeformular soll die Daten per E-Mail an hello@digitalwerk24.com senden. Nutze dafür einen kostenlosen Service wie Formspree, Web3Forms, oder einen einfachen mailto-Link als Fallback. Alternativ: Zeige nach dem Absenden eine Bestätigungsmeldung an und speichere die Daten in der Konsole (wird später durch einen echten Endpunkt ersetzt).

5. **Impressum & Datenschutz:** Erstelle einfache Unterseiten oder Modals für Impressum und Datenschutz. Betreiber-Daten stehen in der CLAUDE.md.

6. **Git initialisieren:** git init, .gitignore erstellen, initialen Commit machen.

7. **GitHub Repo erstellen:** Erstelle ein neues GitHub Repository namens "dw24-empfehlung" und pushe den Code.

8. **Vercel deployen:** Verbinde das Repo mit Vercel, erstelle ein neues Projekt, und füge die Custom Domain empfehlung.digitalwerk24.com hinzu. Prüfe, ob das SSL-Zertifikat korrekt ausgestellt wird.

9. **Abschluss-Check:** Öffne die fertige URL und prüfe: Lädt die Seite? Ist sie mobil-optimiert? Funktioniert das Formular? Sind Impressum und Datenschutz erreichbar?

Wichtig:
- Die Seite muss komplett eigenständig sein, KEINE Verlinkung zur Hauptseite digitalwerk24.com
- Mobile-first: 80%+ der Besucher kommen über Facebook/Instagram Ads auf dem Handy
- Schnelle Ladezeit hat Priorität
- Facebook Pixel vorbereiten (leeren Platzhalter-Kommentar im Head für spätere Integration)
- Die Seite muss VERKAUFEN – jeder Besucher muss denken "Das ist easy money, da mache ich mit"

Leg los.
