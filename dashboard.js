/* ===================== STORAGE ===================== */
let bins = JSON.parse(localStorage.getItem("bins")) || [];
let history = JSON.parse(localStorage.getItem("history")) || [];
let alertedBins = JSON.parse(localStorage.getItem("alertedBins")) || {};

const ALERT_LEVEL = 85;
const HISTORY_DAYS = 7;

/* ===================== TELEGRAM ===================== */
const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN";
const TELEGRAM_CHAT_ID = "YOUR_CHAT_ID";

/* ===================== MAP ===================== */
let map;
let markers = [];

document.addEventListener("DOMContentLoaded", () => {
  map = L.map("map").setView([20.5937, 78.9629], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  cleanupHistory();
});

/* ===================== UI ===================== */
function hideAll() {
  ["levelsSection", "alertsSection", "historySection"].forEach(id => {
    document.getElementById(id).style.display = "none";
  });
  document.getElementById("mapContainer").style.display = "none";
}

function clearMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
}

function showMap() {
  document.getElementById("mapContainer").style.display = "block";
  setTimeout(() => map.invalidateSize(), 200);
}

/* ===================== MODALS ===================== */
function openAddBin() {
  document.getElementById("addModal").style.display = "flex";
}

function openDeleteBin() {
  document.getElementById("deleteModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("addModal").style.display = "none";
  document.getElementById("deleteModal").style.display = "none";
}

/* ===================== ADD BIN ===================== */
function addBin() {
  const id = document.getElementById("binId").value.trim();
  const channelId = document.getElementById("channelId").value.trim();
  const apiKey = document.getElementById("apiKey").value.trim();
  const lat = parseFloat(document.getElementById("lat").value);
  const lon = parseFloat(document.getElementById("lon").value);

  if (!id || !channelId || !apiKey || isNaN(lat) || isNaN(lon)) {
    alert("❌ Please fill all fields correctly");
    return;
  }

  if (bins.some(b => b.id === id)) {
    alert("❌ Bin ID already exists");
    return;
  }

  bins.push({ id, channelId, apiKey, lat, lon });
  localStorage.setItem("bins", JSON.stringify(bins));

  ["binId","channelId","apiKey","lat","lon"].forEach(i => {
    document.getElementById(i).value = "";
  });

  closeModal();
  alert("✅ Bin Added Successfully");
}

/* ===================== DELETE BIN ===================== */
function deleteBin() {
  const deleteId = document.getElementById("deleteId").value.trim();

  const count = bins.length;
  bins = bins.filter(b => b.id !== deleteId);

  if (bins.length === count) {
    alert("❌ Bin ID not found");
    return;
  }

  localStorage.setItem("bins", JSON.stringify(bins));
  document.getElementById("deleteId").value = "";

  closeModal();
  alert("✅ Bin Deleted Successfully");
}

/* ===================== THINGSPEAK ===================== */
async function getLevel(bin) {
  try {
    const res = await fetch(
      `https://api.thingspeak.com/channels/${bin.channelId}/feeds/last.json?api_key=${bin.apiKey}`
    );
    const data = await res.json();
    const level = parseInt(data.field1);
    return isNaN(level) ? null : level;
  } catch {
    return null;
  }
}

/* ===================== COLOR ===================== */
function getFillClass(level) {
  if (level <= 40) return "green";
  if (level <= 70) return "yellow";
  if (level <= 85) return "orange";
  return "red";
}

/* ===================== BIN CARD ===================== */
function createBinCard(container, id, level) {
  const card = document.createElement("div");
  card.className = "bin-card";

  const fill = document.createElement("div");
  fill.className = "bin-fill " + getFillClass(level);

  const text = document.createElement("div");
  text.className = "bin-text";
  text.innerHTML = `BIN ID : ${id}<br>LEVEL : ${level}%`;

  card.appendChild(fill);
  card.appendChild(text);
  container.appendChild(card);

  setTimeout(() => fill.style.height = level + "%", 300);
}

/* ===================== LEVELS ===================== */
async function showLevels() {
  hideAll();
  clearMarkers();
  levelsCards.innerHTML = "";

  for (let bin of bins) {
    const level = await getLevel(bin);
    if (level !== null) {
      createBinCard(levelsCards, bin.id, level);
      addMarker(bin, level);

      if (level < ALERT_LEVEL) {
        delete alertedBins[bin.id];
        localStorage.setItem("alertedBins", JSON.stringify(alertedBins));
      }
    }
  }

  document.getElementById("levelsSection").style.display = "block";
  showMap();
}

/* ===================== ALERTS ===================== */
async function showAlerts() {
  hideAll();
  clearMarkers();
  alertCards.innerHTML = "";

  for (let bin of bins) {
    const level = await getLevel(bin);

    if (level !== null && level >= ALERT_LEVEL) {
      createBinCard(alertCards, bin.id, level);
      addMarker(bin, level);

      if (!alertedBins[bin.id]) {
        sendTelegramAlert(bin, level);
        alertedBins[bin.id] = true;
        localStorage.setItem("alertedBins", JSON.stringify(alertedBins));
      }
    }
  }

  document.getElementById("alertsSection").style.display = "block";
  showMap();
}

/* ===================== TELEGRAM ALERT ===================== */
function sendTelegramAlert(bin, level) {
  const time = new Date().toLocaleString();
  const mapsLink = `https://www.google.com/maps?q=${bin.lat},${bin.lon}`;

  const message =
`🚨 BIN ALERT 🚨
Bin ID : ${bin.id}
Level  : ${level}%
Location : ${bin.lat}, ${bin.lon}
Map : ${mapsLink}
Time : ${time}`;

  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    })
  });

  history.push({
    binId: bin.id,
    level,
    lat: bin.lat,
    lon: bin.lon,
    map: mapsLink,
    message,
    time,
    timestamp: Date.now()
  });

  cleanupHistory();
  localStorage.setItem("history", JSON.stringify(history));
}

/* ===================== HISTORY ===================== */
function cleanupHistory() {
  const now = Date.now();
  const limit = HISTORY_DAYS * 24 * 60 * 60 * 1000;
  history = history.filter(h => now - h.timestamp <= limit);
  localStorage.setItem("history", JSON.stringify(history));
}

function showHistory() {
  hideAll();
  cleanupHistory();
  historyList.innerHTML = "";

  history.forEach(h => {
    historyList.innerHTML += `
      <div class="history-card">
        <b>Bin ID:</b> ${h.binId}<br>
        <b>Level:</b> ${h.level}%<br>
        <b>Time:</b> ${h.time}<br>
        <b>Location:</b>
        <a href="${h.map}" target="_blank">${h.lat}, ${h.lon}</a><br>
        <b>Message:</b>
        <pre>${h.message}</pre>
      </div>`;
  });

  document.getElementById("historySection").style.display = "block";
}

/* ===================== MAP MARKERS ===================== */
function addMarker(bin, level) {
  const color = level >= ALERT_LEVEL ? "red" : "green";

  const icon = L.divIcon({
    html: `<div style="width:14px;height:14px;background:${color};border-radius:50%"></div>`
  });

  markers.push(L.marker([bin.lat, bin.lon], { icon }).addTo(map));
}
