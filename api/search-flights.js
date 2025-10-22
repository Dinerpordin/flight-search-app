// api/search-flights.js
const axios = require('axios');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { from, to, date, travelers = 1, tripType } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ error: 'Missing required parameters: from, to, date' });
    }

    // Extract airport codes
    const fromCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from.substring(0, 3).toUpperCase();
    const toCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to.substring(0, 3).toUpperCase();

    // Generate TravelPayouts affiliate URL
    const generateBookingUrl = (flightId, direction = 'outbound') => {
      const marker = process.env.TRAVELPAYOUTS_MARKER || 'YOUR_MARKER';
      const baseUrl = 'https://tp.media/click';
      const params = {
        shmarker: marker,
        type: 'click',
        origin: fromCode,
        destination: toCode,
        departure_date: date,
        return_date: tripType === 'return' ? req.query.return : '',
        adults: travelers,
        children: req.query.children || 0,
        currency: 'USD',
        flight_number: flightId
      };
      
      const queryString = Object.entries(params)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');
      
      return `${baseUrl}?${queryString}`;
    };

    // Sample flight data with multiple options
    const sampleFlights = {
      oneway: [
        {
          id: "BG101",
          airline: "Biman Bangladesh
