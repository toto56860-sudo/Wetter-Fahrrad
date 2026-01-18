async function checkShift() {
    const schicht = document.getElementById("schicht").value.trim().toUpperCase();
    const ausgabe = document.getElementById("schichtErgebnis");

    if (!["F", "S", "N", "D"].includes(schicht)) {
        ausgabe.innerText = "Bitte F, S, N oder D eingeben.";
        return;
    }

    // Ort fest
    const ort = "44629,DE";

    // Zeitfenster definieren (Start–Ende)
    const zeiten = {
        F: [
            { start: "06:00", ende: "07:00", tagOffset: 0 },
            { start: "14:00", ende: "15:00", tagOffset: 0 }
        ],
        S: [
            { start: "13:00", ende: "14:00", tagOffset: 0 },
            { start: "21:00", ende: "22:00", tagOffset: 0 }
        ],
        N: [
            { start: "20:00", ende: "21:00", tagOffset: 0 },  // heute
            { start: "07:00", ende: "08:00", tagOffset: 1 }   // morgen
        ],
        D: [
            { start: "09:00", ende: "10:00", tagOffset: 0 },
            { start: "17:00", ende: "18:00", tagOffset: 0 }
        ]
    };

    const apiKey = "81908089f37bd41d8332620c79dae01e";
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${ort}&appid=${apiKey}&units=metric&lang=de`;

    const response = await fetch(url);
    const data = await response.json();

    // Hilfsfunktion: Datum + Offset erzeugen
    function getDateWithOffset(offset) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d.toISOString().split("T")[0]; // yyyy-mm-dd
    }

    // Hilfsfunktion: passenden Forecast-Eintrag finden
    function findeForecast(start, ende, tagOffset) {
        const datum = getDateWithOffset(tagOffset);

        let besterTreffer = null;
        let besteDistanz = 999;

        const startStunde = parseInt(start.split(":")[0]);
        const endeStunde = parseInt(ende.split(":")[0]);

        data.list.forEach(eintrag => {
            const [eintragDatum, zeit] = eintrag.dt_txt.split(" ");
            const stunde = parseInt(zeit.slice(0, 2));

            if (eintragDatum !== datum) return;

            // Distanz zur Mitte des Zeitfensters
            const ziel = (startStunde + endeStunde) / 2;
            const distanz = Math.abs(stunde - ziel);

            if (distanz < besteDistanz) {
                besteDistanz = distanz;
                besterTreffer = eintrag;
            }
        });

        return besterTreffer;
    }

    const p1 = findeForecast(
        zeiten[schicht][0].start,
        zeiten[schicht][0].ende,
        zeiten[schicht][0].tagOffset
    );

    const p2 = findeForecast(
        zeiten[schicht][1].start,
        zeiten[schicht][1].ende,
        zeiten[schicht][1].tagOffset
    );

    // Wetterdaten extrahieren
    function analyse(p) {
        return {
            temp: p.main.temp,
            wind: p.wind.speed,
            beschreibung: p.weather[0].description,
            regen: p.weather[0].main.toLowerCase().includes("rain")
        };
    }

    const periode1 = analyse(p1);
    const periode2 = analyse(p2);

    let text = "";

    // Zeitraum 1
    text += `--- Zeitraum 1 (${zeiten[schicht][0].start}–${zeiten[schicht][0].ende}) ---\n`;
    text += `Temperatur: ${periode1.temp}°C\n`;
    text += `Wind: ${periode1.wind} m/s\n`;
    text += `Wetter: ${periode1.beschreibung}\n`;
    text += `Status: ${periode1.regen ? "Regen" : "trocken"}\n\n`;

    // Zeitraum 2
    text += `--- Zeitraum 2 (${zeiten[schicht][1].start}–${zeiten[schicht][1].ende}) ---\n`;
    text += `Temperatur: ${periode2.temp}°C\n`;
    text += `Wind: ${periode2.wind} m/s\n`;
    text += `Wetter: ${periode2.beschreibung}\n`;
    text += `Status: ${periode2.regen ? "Regen" : "trocken"}\n\n`;

    // Temperaturregel
    if (periode1.temp < 5 || periode2.temp < 5) {
        ausgabe.className = "bad";
        ausgabe.innerText = text + "Unter 5°C – bitte Auto nehmen.";
        return;
    }

    // Sturmwarnung
    const sturm = periode1.wind > 15 || periode2.wind > 15;

    // Regenanalyse
    if (!periode1.regen && !periode2.regen) {
        ausgabe.className = sturm ? "warn" : "ok";
        text += "Beide Zeiträume trocken – Fahrradfahren möglich.";
        if (sturm) text += "\nAchtung: starker Sturm!";
    } else {
        ausgabe.className = "bad";
        text += "Mindestens ein Zeitraum mit Regen – fahre lieber mit dem Auto.";
    }

    ausgabe.innerText = text;
}

