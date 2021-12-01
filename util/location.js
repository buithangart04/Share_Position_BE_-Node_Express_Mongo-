const axios = require("axios");
const API_KEY = "AIzaSyDgLmMpKCzveJf1_yuA0fUzzhy0WRChvZA";

async function getCoordsForAddress(address) {
  try {

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${API_KEY}`
    );
    const data = response.data;

    if (!data || data.status === "ZERO_RESULTS") {
      coordinates = {
        lat: 40.7484474,
        lng: -73.9871516,
      };
    }

   coordinates = data.results[0].geometry.location;
  } catch (error) {
    coordinates = {
      lat: 40.7484474,
      lng: -73.9871516,
    };
  }
  return coordinates;
}

module.exports = getCoordsForAddress;
