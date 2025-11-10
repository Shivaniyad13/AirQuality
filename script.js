// 🌍 MAP + WEATHER + AQI (Search functionality)
const weatherApiKey = "f6dadb771340dc69ef307495d8804991";
const loader = document.getElementById("loader");

const map = L.map("map").setView([26.8467, 80.9462], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);
const marker = L.marker([26.8467, 80.9462]).addTo(map);

document.getElementById("search-box").addEventListener("change", function () {
  const location = this.value;
  loader.style.display = "flex";
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${location}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.length === 0) {
        loader.style.display = "none";
        alert("Location not found.");
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      map.setView([lat, lon], 10);
      marker.setLatLng([lat, lon]);

      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`
      )
        .then((res) => res.json())
        .then((weatherData) => {
          const weather = weatherData.weather[0].main.toLowerCase();
          const temp = weatherData.main.temp;
          const city = weatherData.name;

          document.getElementById("location").textContent = `City: ${city}`;
          document.getElementById(
            "temperature"
          ).textContent = `🌡 Temp: ${temp}°C`;
          document.getElementById(
            "weather"
          ).textContent = `☁ Weather: ${weather}`;

          fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${weatherApiKey}`
          )
            .then((res) => res.json())
            .then((airData) => {
              const aqi = airData.list[0].main.aqi;
              const pm2_5 = airData.list[0].components.pm2_5;
              const pm10 = airData.list[0].components.pm10;

              const aqiText = [
                "🔵 Good",
                "🟢 Fair",
                "🟡 Moderate",
                "🟠 Poor",
                "🔴 Very Poor",
              ][aqi - 1];

              document.getElementById("aqi").textContent = `💨 AQI: ${aqiText}`;
              document.getElementById("pm25").textContent = `PM2.5: ${pm2_5}`;
              document.getElementById("pm10").textContent = `PM10: ${pm10}`;
              loader.style.display = "none";
            });
        });
    })
    .catch(() => {
      loader.style.display = "none";
      alert("Error finding location or weather data.");
    });
});

// 🌍 COUNTRY AQI DASHBOARD
// 🌍 COUNTRY AQI DASHBOARD (Fixed Version)
const countries = [
  { name: "India", capital: "New Delhi" },
  { name: "United States", capital: "Washington" },
  { name: "United Kingdom", capital: "London" },
  { name: "France", capital: "Paris" },
  { name: "Germany", capital: "Berlin" },
  { name: "China", capital: "Beijing" },
  { name: "Japan", capital: "Tokyo" },
  { name: "Brazil", capital: "Brasília" },
  { name: "Russia", capital: "Moscow" },
  { name: "Canada", capital: "Ottawa" },
];

// 🔑 IMPORTANT: Use your own valid AQICN token here (replace "demo")
const token = "3ba2b256d63a29719c13b910a5947e324ade094b";
const countryList = document.getElementById("countryList");

countries.forEach((country) => {
  const div = document.createElement("div");
  div.className = "country";
  div.innerHTML = `
    <strong>${country.name}</strong> 
    (Capital: ${country.capital})
    <div class="aqi-result">Click to load AQI</div>
  `;

  const resultDiv = div.querySelector(".aqi-result");

  div.addEventListener("click", async () => {
    resultDiv.textContent = "⏳ Fetching AQI data...";

    try {
      // Get coordinates for the capital city
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${country.capital}`
      );
      const geoData = await geoResponse.json();

      if (geoData.length === 0) {
        resultDiv.textContent = "⚠️ Location not found.";
        return;
      }

      const { lat, lon } = geoData[0];

      // Fetch AQI based on coordinates
      const response = await fetch(
        `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`
      );
      const data = await response.json();

      if (data.status === "ok" && data.data.aqi !== undefined) {
        const aqi = data.data.aqi;
        const level = getAQILevel(aqi);
        resultDiv.innerHTML = `
          AQI: <strong class="${level.toLowerCase()}">${aqi}</strong> (${level})
        `;
      } else {
        resultDiv.textContent = "Data not available.";
      }
    } catch (error) {
      console.error(error);
      resultDiv.textContent = "⚠️ Error fetching AQI data.";
    }
  });

  countryList.appendChild(div);
});

// Helper function for AQI levels
function getAQILevel(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy";
  if (aqi <= 200) return "Very Unhealthy";
  return "Hazardous";
}

// 📌 ONE PAGE NAVIGATION
document.addEventListener("DOMContentLoaded", () => {
  const content = document.getElementById("content");
  const links = document.querySelectorAll(".nav-link");

  function loadPage(page) {
    fetch(`${page}.html`)
      .then((res) => res.text())
      .then((data) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = data;
        const pageContent = tempDiv.querySelector("main") || tempDiv;
        content.innerHTML = pageContent.innerHTML;
      })
      .catch(() => {
        content.innerHTML = `<p>⚠️ Error loading ${page}.html</p>`;
      });
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      loadPage(page);
      history.pushState({ page }, "", `#${page}`);
    });
  });

  window.addEventListener("popstate", (e) => {
    if (e.state && e.state.page) {
      loadPage(e.state.page);
    }
  });
});

// 🌡️ TEMPERATURE PAGE LOGIC (kept separate to avoid conflicts)
(function () {
  const input = document.getElementById("tempInput");
  const output = document.getElementById("tempResult");
  const select = document.getElementById("unitSelect");

  if (!input || !output || !select) return; // run only if converter exists

  document.getElementById("convertBtn").addEventListener("click", () => {
    const value = parseFloat(input.value);
    const unit = select.value;
    let result = "";

    if (unit === "CtoF") result = ((value * 9) / 5 + 32).toFixed(2) + " °F";
    if (unit === "FtoC") result = (((value - 32) * 5) / 9).toFixed(2) + " °C";

    output.textContent = result;
  });
})();

// Get elements
const tempInput = document.getElementById("tempInput");
const unitSelect = document.getElementById("unit");
const convertBtn = document.getElementById("convertBtn");
const resultDiv = document.getElementById("result");
const errorMsg = document.getElementById("errorMsg");

// Convert temperature on button click
convertBtn.addEventListener("click", () => {
  const tempValue = parseFloat(tempInput.value);
  const selectedUnit = unitSelect.value;

  // Clear previous messages
  errorMsg.textContent = "";
  resultDiv.textContent = "";

  // Validate input
  if (isNaN(tempValue)) {
    errorMsg.textContent = "⚠️ Please enter a valid number.";
    return;
  }

  let celsius, fahrenheit, kelvin;

  // Conversion logic
  switch (selectedUnit) {
    case "C":
      celsius = tempValue;
      fahrenheit = (tempValue * 9) / 5 + 32;
      kelvin = tempValue + 273.15;
      break;

    case "F":
      celsius = ((tempValue - 32) * 5) / 9;
      fahrenheit = tempValue;
      kelvin = ((tempValue - 32) * 5) / 9 + 273.15;
      break;

    case "K":
      celsius = tempValue - 273.15;
      fahrenheit = ((tempValue - 273.15) * 9) / 5 + 32;
      kelvin = tempValue;
      break;

    default:
      errorMsg.textContent = "Invalid unit selection.";
      return;
  }

  // Display result
  resultDiv.innerHTML = `
    <h3>Converted Values:</h3>
    <p>🌡️ Celsius: <b>${celsius.toFixed(2)} °C</b></p>
    <p>🔥 Fahrenheit: <b>${fahrenheit.toFixed(2)} °F</b></p>
    <p>❄️ Kelvin: <b>${kelvin.toFixed(2)} K</b></p>
  `;
});
