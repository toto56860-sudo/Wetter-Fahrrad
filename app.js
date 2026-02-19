// =======================
// SCHICHT-LOGIK (Open‑Meteo)
// =======================

async function checkShift() {
    const schicht = document.getElementById("schicht").value.trim().toUpperCase();
    const ausgabe = document.getElementById("schichtErgebnis");

    if (!["F", "S", "N", "D"].includes(schicht)) {
        ausgabe.className = "";
        ausgabe.innerText = "Bitte F, S, N oder D eingeben.";
        return;
    }

    // Schichtzeiten (Stunden)
    const zeiten = {
        F: [6, 14],
        S: [13, 21],
        N: [20, 7],
        D: [9, 17]
    };

    const lat = 51.538;
    const lon = 7.225;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,precipitation_probability,windspeed_10m&timezone=auto`;

    let data;
    try {
        const res = await fetch(url);
        data = await res.json();
    } catch (e) {
        ausgabe.className = "bad";
        ausgabe.innerText = "Fehler beim Abrufen der Wetterdaten.";
        return;
    }

    const hourly = data.hourly;

    // ============================
    // DATUMSLOGIK (WICHTIG!)
    // ============================

    const jetzt = new Date();
    const heute = jetzt.toISOString().split("T")[0];

    const hin = zeiten[schicht][0];
    const rueck = zeiten[schicht][1];

    // Hinfahrt ist IMMER am nächsten passenden Tag
    let datumHin = heute;

    // Rückfahrt ist IMMER NACH der Hinfahrt
    let datumRueck;

    if (rueck < hin) {
        // Rückfahrt am nächsten Tag
        const morgen = new Date(jetzt.getTime() + 24 * 60 * 60 * 1000);
        datumRueck = morgen.toISOString().split("T")[0];
    } else {
        datumRueck = heute;
    }

    // ============================
    // WERT AUS OPEN-METEO FINDEN
    // ============================

    function findeWertMitDatum(datum, stunde) {
        for (let i = 0; i < hourly.time.length; i++) {
            const [d, t] = hourly.time[i].split("T");
            const h = parseInt(t.slice(0, 2));

            if (d === datum && h === stunde) {
                return {
                    temp: hourly.temperature_2m[i],
                    regen: hourly.precipitation[i],
                    wahrscheinlichkeit: hourly.precipitation_probability[i],
                    wind: hourly.windspeed_10m[i]
                };
            }
        }
        return null;
    }

    const p1 = findeWertMitDatum(datumHin, hin);
    const p2 = findeWertMitDatum(datumRueck, rueck);

    if (!p1 || !p2) {
        ausgabe.className = "bad";
        ausgabe.innerText = "Keine passenden Zeitpunkte gefunden.";
        return;
    }

    // Labels
    const labels = {
        F: ["Frühdienst – Hinfahrt (06:00)", "Frühdienst – Rückfahrt (14:00)"],
        S: ["Spätdienst – Hinfahrt (13:00)", "Spätdienst – Rückfahrt (21:00)"],
        N: ["Nachtdienst – Hinfahrt (20:00)", "Nachtdienst – Rückfahrt (07:00)"],
        D: ["DV – Hinfahrt (09:00)", "DV – Rückfahrt (17:00)"]
    };

    function block(label, p) {
        return `
<div style="
    background: #ffffff;
    padding: 12px;
    margin-bottom: 10px;
    border-radius: 10px;
    box-shadow: 0 0 6px rgba(0,0,0,0.1);
">
    <strong>${label}</strong><br>
    🌡️ ${p.temp}°C<br>
    💨 ${p.wind} m/s<br>
    🌧️ ${p.regen.toFixed(1)} mm<br>
    📊 ${p.wahrscheinlichkeit}% Regenwahrscheinlichkeit
</div>
`;
    }

    let text = "";
    text += block(labels[schicht][0], p1);
    text += block(labels[schicht][1], p2);

    // Empfehlung
    let empfehlung = "";
    let klasse = "";

    if (p1.regen > 0.3 || p2.regen > 0.3 || p1.wahrscheinlichkeit > 60 || p2.wahrscheinlichkeit > 60) {
        empfehlung = "🌧️ Regen erwartet – Auto empfohlen.";
        klasse = "bad";
    } else if (p1.temp < 3 || p2.temp < 3) {
        empfehlung = "❄️ Sehr kalt – Auto empfohlen.";
        klasse = "bad";
    } else if (p1.wind > 30 || p2.wind > 30) {
        empfehlung = "💨 Starker Wind – Fahrrad möglich, aber vorsichtig.";
        klasse = "warn";
    } else {
        empfehlung = "🚴‍♂️ Alles trocken – Fahrrad empfohlen.";
        klasse = "ok";
    }

    ausgabe.className = klasse;
    ausgabe.innerHTML = text + `
<div style="
    margin-top: 15px;
    padding: 12px;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 0 6px rgba(0,0,0,0.1);
    font-weight: bold;
">
${empfehlung}
</div>
`;
}

// =======================
// TIMELINE (Open‑Meteo)
// =======================

async function ladeWetterTimeline(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,precipitation_probability,windspeed_10m&timezone=auto`;

    const res = await fetch(url);
    const data = await res.json();

    zeigeTimeline(data.hourly);
}

function zeigeTimeline(hourly) {
    wetterAusgabe.innerHTML = "<h3>Nächste Stunden</h3>";

    const container = document.createElement("div");

    const jetzt = new Date();
    const aktuelleStunde = jetzt.getHours();

    // Index der aktuellen Stunde finden
    let startIndex = 0;
    for (let i = 0; i < hourly.time.length; i++) {
        const [d, t] = hourly.time[i].split("T");
        const h = parseInt(t.slice(0, 2));

        if (h === aktuelleStunde) {
            startIndex = i;
            break;
        }
    }

    // Jetzt die nächsten 12 Stunden anzeigen
    for (let i = startIndex; i < startIndex + 12; i++) {
        const zeit = hourly.time[i].split("T")[1].slice(0, 5);
        const temp = hourly.temperature_2m[i];
        const regen = hourly.precipitation[i];
        const wahrscheinlichkeit = hourly.precipitation_probability[i];
        const wind = hourly.windspeed_10m[i];

        const box = document.createElement("div");
        box.className = "timeline-box";

        if (regen > 1) box.style.background = "#ff8a8a";
        else if (regen > 0) box.style.background = "#ffd27f";
        else box.style.background = "#b7ffb7";

        box.innerHTML = `
            <strong>${zeit}</strong>
            <span>${regen > 0 ? "🌧️" : "☀️"} ${regen.toFixed(1)} mm</span>
            <span>${temp}°C</span>
            <span>${wind} m/s</span>
            <span>${wahrscheinlichkeit}%</span>
        `;

        container.appendChild(box);
    }

    wetterAusgabe.appendChild(container);
}


// =======================
// BUTTONS
// =======================

const btnZuhause = document.getElementById("btnZuhause");
const btnUnterwegs = document.getElementById("btnUnterwegs");
const wetterAusgabe = document.getElementById("wetterAusgabe");

btnZuhause.addEventListener("click", () => {
    ladeWetterTimeline(51.538, 7.225); // Herne
});

btnUnterwegs.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition(
        pos => ladeWetterTimeline(pos.coords.latitude, pos.coords.longitude),
        err => alert("GPS konnte nicht abgerufen werden.")
    );
});
