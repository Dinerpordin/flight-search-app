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
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get Amadeus API credentials from environment variables
    const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
    const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;

    if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Get access token
    const tokenResponse = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Search for flights
    const flightResponse = await axios.get(
      `https://test.api.amadeus.com/v2/shopping/flight-offers`,
      {
        params: {
          originLocationCode: from,
          destinationLocationCode: to,
          departureDate: date,
          adults: travelers,
          currencyCode: 'USD',
          max: 10
        },
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    // Process flight data
    const flights = flightResponse.data.data.map(offer => {
      const itinerary = offer.itineraries[0];
      const segment = itinerary.segments[0];
      const duration = itinerary.duration.replace('PT', '').toLowerCase();

      return {
        id: offer.id,
        airline: getAirlineName(segment.carrierCode),
        flightNumber: `${segment.carrierCode} ${segment.number}`,
        departure: {
          code: segment.departure.iataCode,
          time: segment.departure.at.split('T')[1].substring(0, 5)
        },
        arrival: {
          code: segment.arrival.iataCode,
          time: segment.arrival.at.split('T')[1].substring(0, 5)
        },
        duration: duration,
        stops: itinerary.segments.length - 1,
        price: offer.price.total
      };
    });

    res.status(200).json({ flights });

  } catch (error) {
    console.error('Flight search error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'API authentication failed' });
    } else if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Too many requests' });
    } else if (error.response?.data?.errors) {
      const errorMessage = error.response.data.errors[0]?.detail || 'Search failed';
      return res.status(400).json({ error: errorMessage });
    } else {
      return res.status(500).json({ error: 'Failed to search for flights' });
    }
  }
};

function getAirlineName(code) {
  const airlines = {
    'AA': 'American Airlines', 'DL': 'Delta Air Lines', 'UA': 'United Airlines',
    'BA': 'British Airways', 'LH': 'Lufthansa', 'AF': 'Air France',
    'KL': 'KLM', 'EY': 'Etihad Airways', 'EK': 'Emirates', 'QR': 'Qatar Airways'
  };
  return airlines[code] || code;
}