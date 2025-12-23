// 🌍 GLOBAL CONFIG
const weatherApiKey = "f6dadb771340dc69ef307495d8804991";
const waqiToken = "3ba2b256d63a29719c13b910a5947e324ade094b"; // Use existing token
const loader = document.getElementById("loader");

// 🗺️ MAP INIT
const map = L.map("map").setView([20.5937, 78.9629], 5); // Default India view
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);
const marker = L.marker([20.5937, 78.9629]).addTo(map);

// 🔍 SEARCH FUNCTIONALITY
const searchBtn = document.getElementById("searchBtn");
const searchBox = document.getElementById("search-box");

searchBtn.addEventListener("click", performSearch);
searchBox.addEventListener("keypress", (e) => {
  if (e.key === "Enter") performSearch();
});

function performSearch() {
  const query = searchBox.value.trim();
  if (!query) return;

  loader.style.display = "flex";

  // 1. Geocoding
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.length === 0) {
        throw new Error("Location not found");
      }
      const { lat, lon, display_name } = data[0];
      const cityName = display_name.split(",")[0]; // Simple city name

      updateMap(lat, lon);
      fetchWeatherData(lat, lon, cityName);
      fetchAirQuality(lat, lon);
    })
    .catch((err) => {
      console.error(err);
      alert("Could not find location. Please try again.");
      loader.style.display = "none";
    });
}

function updateMap(lat, lon) {
  const newLatLng = [lat, lon];
  map.setView(newLatLng, 10);
  marker.setLatLng(newLatLng);
}

// 🌦️ WEATHER DATA
function fetchWeatherData(lat, lon, city) {
  fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`
  )
    .then((res) => res.json())
    .then((data) => {
      // Update UI
      document.getElementById("location").textContent = city || data.name;
      document.getElementById("temperature").textContent = `${Math.round(data.main.temp)}°C`;
      document.getElementById("humidity").textContent = `${data.main.humidity}%`;
      document.getElementById("wind").textContent = `${data.wind.speed} m/s`;
      document.getElementById("timestamp").textContent = "Updated: " + new Date().toLocaleTimeString();
    })
    .catch(console.error);
}

// 💨 AIR QUALITY DATA
function fetchAirQuality(lat, lon) {
  // Using OpenWeatherMap Air Pollution API for pollutants
  fetch(
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${weatherApiKey}`
  )
    .then((res) => res.json())
    .then((data) => {
      const components = data.list[0].components;
      const aqiIdx = data.list[0].main.aqi; // 1-5 scale from OWM

      updatePollutants(components);
      
      // OWM uses 1-5, but we want US AQI style for the badge
      // We often need a real conversion, but for now let's map roughly or fetch from WAQI for better AQI if needed.
      // Let's TRY WAQI for the main AQI number as it's more accurate for "US Scale" visual
      fetchWaqiData(lat, lon); 
    })
    .catch((err) => {
      console.error(err);
      loader.style.display = "none";
    });
}

// WAQI API for better AQI number (US Standard)
function fetchWaqiData(lat, lon) {
  fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${waqiToken}`)
    .then((res) => res.json())
    .then((data) => {
      loader.style.display = "none";
      if (data.status === "ok") {
        const aqi = data.data.aqi;
        updateAqiUI(aqi);
      } else {
        // Fallback or error
        document.getElementById("aqi-status").textContent = "Data Unavailable";
      }
    })
    .catch(() => loader.style.display = "none");
}

function updatePollutants(comp) {
  document.getElementById("pm25").textContent = comp.pm2_5;
  document.getElementById("pm10").textContent = comp.pm10;
  document.getElementById("no2").textContent = comp.no2;
  document.getElementById("o3").textContent = comp.o3;
}

function updateAqiUI(aqi) {
  const badge = document.getElementById("aqi-badge");
  const valEl = document.getElementById("aqi-value");
  const statusEl = document.getElementById("aqi-status");
  const recEl = document.getElementById("health-recommendation");
  
  valEl.textContent = aqi;

  // Reset classes
  badge.className = "aqi-badge";
  let status = "Unknown";
  let rec = "";

  if (aqi <= 50) {
    badge.classList.add("good");
    status = "Good";
    rec = "Air quality is satisfactory, and air pollution poses little or no risk.";
  } else if (aqi <= 100) {
    badge.classList.add("moderate");
    status = "Moderate";
    rec = "Air quality is acceptable. However, there may be a risk for some people.";
  } else if (aqi <= 150) {
    badge.classList.add("unhealthy-sens"); // styling class needed if desired, or reuse moderate
    badge.style.backgroundColor = "#ff9933"; 
    status = "Unhealthy for Sensitive Groups";
    rec = "Members of sensitive groups may experience health effects.";
  } else if (aqi <= 200) {
    badge.classList.add("unhealthy");
    status = "Unhealthy";
    rec = "Everyone may begin to experience health effects.";
  } else if (aqi <= 300) {
    badge.classList.add("very-poor");
    status = "Very Unhealthy";
    rec = "Health warnings of emergency conditions. The entire population is more likely to be affected.";
  } else {
    badge.classList.add("hazardous"); // Need style
    badge.style.backgroundColor = "#7e0023";
    status = "Hazardous";
    rec = "Health alert: everyone may experience more serious health effects.";
  }

  statusEl.textContent = status;
  recEl.textContent = rec;
}

// 🏆 RANKINGS (Simulated Real-Time)
const cities = [
  { name: "Delhi, India", aqi: 340 },
  { name: "Lahore, Pakistan", aqi: 289 },
  { name: "Dhaka, Bangladesh", aqi: 190 },
  { name: "Beijing, China", aqi: 155 },
  { name: "Jakarta, Indonesia", aqi: 142 },
  { name: "Dubai, UAE", aqi: 120 },
  { name: "Mumbai, India", aqi: 115 },
  { name: "London, UK", aqi: 35 },
  { name: "New York, USA", aqi: 28 },
];

const rankList = document.getElementById("countryList");
rankList.innerHTML = "";

cities.sort((a, b) => b.aqi - a.aqi); // Sort bad to good

cities.slice(0, 5).forEach((city, index) => {
  const li = document.createElement("li");
  const aqiClass = city.aqi > 100 ? "bad" : "ok";
  li.innerHTML = `
    <span>${index + 1}. ${city.name}</span>
    <span class="rank-val ${aqiClass}">${city.aqi} AQI</span>
  `;
  rankList.appendChild(li);
});

// 🌡️ TEMPERATURE CONVERTER
document.getElementById("convertBtn").addEventListener("click", () => {
    const input = parseFloat(document.getElementById("tempInput").value);
    const unit = document.getElementById("unit").value;
    const resultDiv = document.getElementById("result");
    
    if (isNaN(input)) {
        resultDiv.textContent = "Please enter a valid number";
        return;
    }

    let resText = "";
    if (unit === "C") {
        resText = `${(input * 9/5 + 32).toFixed(1)} °F`;
    } else if (unit === "F") {
        resText = `${((input - 32) * 5/9).toFixed(1)} °C`;
    } else {
        resText = `${(input - 273.15).toFixed(1)} °C`;
    }
    
    resultDiv.textContent = `Result: ${resText}`;
});

// Initial Search on Load (optional)
// performSearch(); // Can uncomment to load a default city

