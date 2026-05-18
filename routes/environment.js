const express = require('express');
const axios = require('axios');
const router = express.Router();

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const LOCATION = 'Delhi,IN';

router.get('/impact', async (req, res) => {
  try {
    let weatherData = { temp: 32, feelsLike: 35, condition: 'Haze', humidity: 62, windSpeed: 3.5, pressure: 1008, visibility: 4000 };
    
    if (WEATHER_API_KEY && WEATHER_API_KEY !== '') {
      try {
        const axRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${LOCATION}&appid=${WEATHER_API_KEY}&units=metric`);
        const d = axRes.data;
        weatherData = {
          temp: d.main.temp,
          feelsLike: d.main.feels_like,
          condition: d.weather[0].main,
          description: d.weather[0].description,
          humidity: d.main.humidity,
          windSpeed: d.wind.speed,
          pressure: d.main.pressure,
          visibility: d.visibility || 10000,
          icon: d.weather[0].icon
        };
      } catch (err) {
        console.log('Weather API Error (using fallback):', err.message);
      }
    }

    // === WASTE PREDICTION MODEL ===
    const temp = weatherData.temp;
    const humidity = weatherData.humidity;
    const wind = weatherData.windSpeed;

    // Base bio-waste generation (kg/hr) based on a 200-bed hospital
    let baseWaste = 45;
    let infectiousWaste = 12;
    let chemicalWaste = 8;
    let generalWaste = 25;

    // Temperature impact
    let tempMultiplier = 1.0;
    if (temp > 40) tempMultiplier = 1.5;
    else if (temp > 35) tempMultiplier = 1.3;
    else if (temp > 30) tempMultiplier = 1.15;
    else if (temp < 5) tempMultiplier = 0.85;
    else if (temp < 15) tempMultiplier = 0.95;

    // Humidity impact on decomposition speed
    let humidityMultiplier = 1.0;
    if (humidity > 85) humidityMultiplier = 1.4;
    else if (humidity > 70) humidityMultiplier = 1.2;
    else if (humidity > 55) humidityMultiplier = 1.1;
    else if (humidity < 30) humidityMultiplier = 0.9;

    // Wind affects aerosol dispersion risk
    let aerosolRisk = 'Low';
    if (wind > 15) aerosolRisk = 'Critical';
    else if (wind > 8) aerosolRisk = 'High';
    else if (wind > 4) aerosolRisk = 'Moderate';

    const adjustedWaste = Math.round(baseWaste * tempMultiplier * humidityMultiplier);
    const adjustedInfectious = Math.round(infectiousWaste * tempMultiplier * 1.1);
    const adjustedChemical = Math.round(chemicalWaste * humidityMultiplier);
    const adjustedGeneral = adjustedWaste - adjustedInfectious - adjustedChemical;

    // Carbon footprint calculation
    const co2Incineration = adjustedWaste * 1.8;
    const co2Transport = adjustedWaste * 0.3;
    const co2Total = co2Incineration + co2Transport;

    // Daily projections
    const dailyWaste = adjustedWaste * 24;
    const weeklyWaste = dailyWaste * 7;
    const monthlyWaste = dailyWaste * 30;

    // Alert level
    let alertLevel = 'Low';
    let alertColor = '#00b894';
    let recommendation = 'Standard disposal procedures are adequate. No immediate action required.';

    if (temp > 38 || humidity > 85) {
      alertLevel = 'Critical';
      alertColor = '#ee5a24';
      recommendation = 'URGENT: Increase incineration cycles. Deploy additional bio-containment bags. Heat indices risk rapid pathogen multiplication and aerosolization of biological waste.';
    } else if (temp > 33 || humidity > 70) {
      alertLevel = 'High';
      alertColor = '#ff6b6b';
      recommendation = 'Increase chemical treatment frequency. Reduce waste storage time to under 4 hours. Monitor decomposition in holding areas.';
    } else if (temp > 28 || humidity > 55) {
      alertLevel = 'Moderate';
      alertColor = '#fdcb6e';
      recommendation = 'Maintain standard protocols with increased monitoring. Schedule extra sanitation rounds during peak heat hours.';
    }

    // Water contamination risk
    let waterRisk = 'Low';
    if (humidity > 80 && temp > 30) waterRisk = 'High';
    else if (humidity > 65) waterRisk = 'Moderate';

    // Hourly waste trend (simulated 24-hour pattern)
    const hourlyTrend = [];
    for (let h = 0; h < 24; h++) {
      let factor = 0.4; // Night baseline
      if (h >= 8 && h <= 11) factor = 1.2; // Morning rush
      else if (h >= 12 && h <= 14) factor = 0.9; // Afternoon
      else if (h >= 15 && h <= 18) factor = 1.1; // Evening
      else if (h >= 6 && h <= 7) factor = 0.7; // Early morning
      hourlyTrend.push(Math.round(adjustedWaste * factor * (0.9 + Math.random() * 0.2)));
    }

    // Waste type breakdown percentages
    const totalForBreakdown = adjustedInfectious + adjustedChemical + adjustedGeneral;

    res.json({
      weather: weatherData,
      waste: {
        totalPerHour: adjustedWaste,
        infectiousPerHour: adjustedInfectious,
        chemicalPerHour: adjustedChemical,
        generalPerHour: adjustedGeneral > 0 ? adjustedGeneral : 5,
        dailyProjection: dailyWaste,
        weeklyProjection: weeklyWaste,
        monthlyProjection: monthlyWaste,
        breakdown: {
          infectious: Math.round((adjustedInfectious / totalForBreakdown) * 100),
          chemical: Math.round((adjustedChemical / totalForBreakdown) * 100),
          general: Math.round((adjustedGeneral > 0 ? adjustedGeneral : 5) / totalForBreakdown * 100)
        }
      },
      risk: {
        alertLevel,
        alertColor,
        recommendation,
        aerosolDispersion: aerosolRisk,
        waterContamination: waterRisk,
        tempMultiplier: tempMultiplier.toFixed(2),
        humidityMultiplier: humidityMultiplier.toFixed(2)
      },
      carbon: {
        incineration: Math.round(co2Incineration),
        transport: Math.round(co2Transport),
        total: Math.round(co2Total),
        dailyTotal: Math.round(co2Total * 24),
        unit: 'kg CO₂e'
      },
      trends: {
        hourlyWaste: hourlyTrend,
        hours: Array.from({length: 24}, (_, i) => `${String(i).padStart(2,'0')}:00`)
      }
    });

  } catch (err) {
    console.error('Environment error:', err);
    res.status(500).json({ error: 'Failed to compute environmental impact' });
  }
});

module.exports = router;
