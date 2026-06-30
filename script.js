// --- State Management ---
let namesArray = [];
let winnerHistory = []; // Neu: Speichert alle Gewinner chronologisch
let selectedWinner = "";
let isSpinning = false;
let currentWheelAngle = 0; // Speichert den aktuellen Rotationswinkel des Rades

// --- DOM Elemente ---
const sections = {
    welcome: document.getElementById('step-welcome'),
    names: document.getElementById('step-names'),
    spinner: document.getElementById('step-spinner'),
    winner: document.getElementById('step-winner'),
    goodbye: document.getElementById('step-goodbye')
};

const inputField = document.getElementById('name-input');
const errorMsg = document.getElementById('error-msg');
const namesList = document.getElementById('names-list');
const btnNamesDone = document.getElementById('btn-names-done');
const winnerDisplay = document.getElementById('winner-name');
const winnersHistoryList = document.getElementById('winners-history-list');

// Canvas für das Rad
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');

// --- Navigation (SPA Ein-/Ausblenden) ---
function navigateTo(targetSection) {
    Object.values(sections).forEach(section => {
        section.classList.remove('active');
        setTimeout(() => { section.style.display = 'none'; }, 400); 
    });
    
    setTimeout(() => {
        targetSection.style.display = 'block';
        setTimeout(() => targetSection.classList.add('active'), 50);
    }, 400);
}

// --- Event Listener: Schritt 1 (Welcome) ---
document.getElementById('btn-start').addEventListener('click', () => {
    navigateTo(sections.names);
    inputField.focus();
});

// --- Event Listener: Schritt 2 (Namen eingeben) ---
document.getElementById('btn-add-name').addEventListener('click', addName);
inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter') addName(); });

function addName() {
    const name = inputField.value.trim();
    errorMsg.textContent = "";

    if (name === "") {
        errorMsg.textContent = "Please enter a valid, non-empty name.";
        return;
    }
    if (namesArray.includes(name)) {
        errorMsg.textContent = "This name has already been added.";
        return;
    }

    namesArray.push(name);
    inputField.value = "";
    updateNamesList();
    inputField.focus();
}

function updateNamesList() {
    namesList.innerHTML = "";
    namesArray.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        namesList.appendChild(li);
    });
    
    btnNamesDone.disabled = namesArray.length < 2;
}

btnNamesDone.addEventListener('click', () => {
    navigateTo(sections.spinner);
    currentWheelAngle = 0;
    drawWheel(currentWheelAngle);
});

// --- Schritt 3: Canvas Glücksrad zeichnen ---
const colors = ["#1a365d", "#2b6cb0", "#2c5282", "#3182ce", "#4299e1", "#1a365d"];

function drawWheel(angleOffset) {
    const numSegments = namesArray.length;
    if (numSegments === 0) return;
    
    const arcSize = (2 * Math.PI) / numSegments;
    const size = canvas.width;
    const center = size / 2;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < numSegments; i++) {
        // Berechne den Start- und Endwinkel für jedes Segment basierend auf dem Versatz
        const startAngle = angleOffset + (i * arcSize);
        const endAngle = startAngle + arcSize;
        
        // Segment-Kuchenstück zeichnen
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, center - 10, startAngle, endAngle);
        ctx.lineTo(center, center);
        ctx.fill();
        
        // Dezente weiße Trennlinie
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text-Rendering (Namen von links nach rechts / lesbar ausrichten)
        ctx.save();
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 14px sans-serif";
        
        // Rotiere den Kontext in die Mitte des aktuellen Segments
        ctx.translate(center, center);
        ctx.rotate(startAngle + arcSize / 2);
        
        // Bestimme Winkel im vollen Kreis, um Überkopf-Stehen zu verhindern
        let currentStringAngle = (startAngle + arcSize / 2) % (Math.PI * 2);
        if (currentStringAngle < 0) currentStringAngle += Math.PI * 2;
        
        // Wenn der Text auf dem Kopf stehen würde (rechte Radhälfte vs linke Radhälfte),
        // drehen wir ihn um 180 Grad um die eigene Achse, damit er immer von links nach rechts lesbar ist.
        if (currentStringAngle > Math.PI / 2 && currentStringAngle < (3 * Math.PI) / 2) {
            ctx.translate(center - 50, 0);
            ctx.rotate(Math.PI);
            ctx.textAlign = "left";
            ctx.fillText(namesArray[i], 0, 5);
        } else {
            ctx.textAlign = "right";
            ctx.fillText(namesArray[i], center - 30, 5);
        }
        
        ctx.restore();
    }
}

// --- Glücksrad Physik & Korrektur des Gewinner-Pfeils ---
document.getElementById('btn-spin').addEventListener('click', () => {
    if (isSpinning) return;

    // Automatischer Sofortgewinn, wenn nur noch ein Name existiert
    if (namesArray.length === 1) {
        selectedWinner = namesArray[0];
        showWinnerPage();
        return;
    }

    isSpinning = true;
    document.getElementById('btn-spin').disabled = true;

    let duration = 4000; 
    let startTimestamp = null;
    
    // Generiere eine zufällige, weite Drehung
    const spinRotation = (Math.PI * 2 * 6) + (Math.random() * Math.PI * 2);
    const startAngle = currentWheelAngle;

    function animateWheel(timestamp) {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);

        // Sanftes Ausbremsen (Ease-Out)
        const easeOut = 1 - Math.pow(1 - progress, 4);
        currentWheelAngle = startAngle + (easeOut * spinRotation);

        drawWheel(currentWheelAngle);

        if (progress < 1) {
            requestAnimationFrame(animateWheel);
        } else {
            // --- PRÄZISE PFEIL-BERECHNUNG (Problem 3 behoben) ---
            const numSegments = namesArray.length;
            const arcSize = (2 * Math.PI) / numSegments;
            
            // Der Pfeil befindet sich fix oben bei 12 Uhr (entspricht mathematisch 270° bzw. 1.5 * PI)
            const targetPointerAngle = 1.5 * Math.PI;
            
            // Berechne den relativen Winkel des Rades normiert auf den Bereich [0, 2*PI]
            let absoluteWheelAngle = currentWheelAngle % (Math.PI * 2);
            if (absoluteWheelAngle < 0) absoluteWheelAngle += Math.PI * 2;
            
            // Berechne, welches Segment unter dem 12-Uhr-Zeiger gelandet ist
            let winningIndex = Math.floor((targetPointerAngle - absoluteWheelAngle + Math.PI * 2) % (Math.PI * 2) / arcSize);
            
            // Sicherstellen, dass der Index innerhalb des Arrays liegt
            winningIndex = (winningIndex % numSegments + numSegments) % numSegments;

            selectedWinner = namesArray[winningIndex];
            
            setTimeout(() => {
                showWinnerPage();
                isSpinning = false;
                document.getElementById('btn-spin').disabled = false;
            }, 500);
        }
    }

    requestAnimationFrame(animateWheel);
});

// --- Schritt 4: Gewinner-Seite & Konfetti ---
let confettiInterval;
function showWinnerPage() {
    winnerDisplay.textContent = selectedWinner;
    navigateTo(sections.winner);
    startConfetti();

    // Gewinner in die Chronologie eintragen
    winnerHistory.push(selectedWinner);

    // Gewinner für zukünftige Runden aus dem aktiven Pool entfernen
    namesArray = namesArray.filter(name => name !== selectedWinner);
}

// Reines HTML5 Canvas Konfetti
const confettiCanvas = document.getElementById('confetti-canvas');
const confCtx = confettiCanvas.getContext('2d');
let particles = [];

function startConfetti() {
    confettiCanvas.width = confettiCanvas.parentElement.clientWidth;
    confettiCanvas.height = confettiCanvas.parentElement.clientHeight;
    particles = [];

    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * confettiCanvas.height,
            color: `rgba(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, 0.8)`,
            tilt: Math.random() * 10 - 5
        });
    }

    clearInterval(confettiInterval);
    confettiInterval = setInterval(drawConfetti, 20);
}

function drawConfetti() {
    confCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particles.forEach((p, idx) => {
        p.y += Math.cos(p.d) + 1 + p.r / 2;
        p.tilt += 0.1;
        p.x += Math.sin(p.tilt);

        confCtx.beginPath();
        confCtx.lineWidth = p.r;
        confCtx.strokeStyle = p.color;
        confCtx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        confCtx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        confCtx.stroke();

        if (p.y > confettiCanvas.height) {
            particles[idx] = p;
            p.y = -20;
            p.x = Math.random() * confettiCanvas.width;
        }
    });
}

// --- Navigation aus Gewinner-Ansicht & Historie rendern ---
document.getElementById('btn-spin-again').addEventListener('click', () => {
    clearInterval(confettiInterval);
    if (namesArray.length === 0) {
        showGoodbyePage();
    } else {
        navigateTo(sections.spinner);
        // Setze das Rad zurück, zeichne es mit verbleibenden Namen neu
        currentWheelAngle = 0;
        drawWheel(currentWheelAngle);
    }
});

document.getElementById('btn-winner-done').addEventListener('click', () => {
    clearInterval(confettiInterval);
    showGoodbyePage();
});

// Funktion zur Anzeige der Abschiedsseite inkl. der Gewinnerliste
function showGoodbyePage() {
    winnersHistoryList.innerHTML = "";
    
    // Befülle die geordnete Liste (ol) mit allen gezogenen Gewinnern
    winnerHistory.forEach(winner => {
        const li = document.createElement('li');
        li.textContent = winner;
        winnersHistoryList.appendChild(li);
    });

    navigateTo(sections.goodbye);
}