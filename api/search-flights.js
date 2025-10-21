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

    // For demo purposes - return sample data
    // In production, you would use the Amadeus API code below
    
    // Sample response based on route
    let sampleFlights = [];
    
    if (from.includes('DAC') && to.includes('LHR')) {
      // Dhaka to London
      sampleFlights = [
        {
          id: "BG101",
          airline: "Biman Bangladesh Airlines",
          airlineCode: "BG",
          flightNumber: "BG 101",
          departure: { code: "DAC", time: "09:30", date: "2024-03-15" },
          arrival: { code: "LHR", time: "15:45", date: "2024-03-15" },
          duration: "11h 15m",
          stops: 0,
          price: 845
        },
        {
          id: "EK586",
          airline: "Emirates",
          airlineCode: "EK",
          flightNumber: "EK 586",
          departure: { code: "DAC", time: "22:15", date: "2024-03-15" },
          arrival: { code: "LHR", time: "06:30", date: "2024-03-16" },
          duration: "13h 15m",
          stops: 1,
          price: 925
        }
      ];
    } else {
      // Default sample flights
      sampleFlights = [
        {
          id: "BA123",
          airline: "British Airways",
          airlineCode: "BA",
          flightNumber: "BA 123",
          departure: { code: from.substring(0, 3).toUpperCase(), time: "08:30", date: "2024-03-15" },
          arrival: { code: to.substring(0, 3).toUpperCase(), time: "20:45", date: "2024-03-15" },
          duration: "7h 15m",
          stops: 0,
          price: 645
        },
        {
          id: "DL456",
          airline: "Delta Airlines",
          airlineCode: "DL",
          flightNumber: "DL 456",
          departure: { code: from.substring(0, 3).toUpperCase(), time: "14:20", date: "2024-03-15" },
          arrival: { code: to.substring(0, 3).toUpperCase(), time: "02:35", date: "2024-03-16" },
          duration: "7h 15m",
          stops: 0,
          price: 725
        }
      ];
    }

    res.status(200).json({ flights: sampleFlights });

    /* 
    // UNCOMMENT THIS CODE WHEN YOU HAVE AMADEUS API KEYS:
    
    // Get Amadeus API credentials from environment variables
    const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
    const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;

    if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
      console.error('Missing Amadeus API credentials');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Step 1: Get access token from Amadeus
    const tokenResponse = await axios.post(
      'https://test.api.amadeus.com/v1/security/oauth2/token',
      `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Search for flights
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
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    // Step 3: Process and format the flight data
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
    */

  } catch (error) {
    console.error('Flight search error:', error.response?.data || error.message);
    
    // Provide user-friendly error messages
    if (error.response?.status === 401) {
      return res.status(500).json({ error: 'API authentication failed. Check your API keys.' });
    } else if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    } else if (error.response?.data?.errors) {
      const errorMessage = error.response.data.errors[0]?.detail || 'Search failed';
      return res.status(400).json({ error: errorMessage });
    } else {
      return res.status(500).json({ error: 'Failed to search for flights. Please try again.' });
    }
  }
};

// Helper function to get airline names
function getAirlineName(code) {
  const airlines = {
    'AA': 'American Airlines',
    'DL': 'Delta Air Lines',
    'UA': 'United Airlines',
    'BA': 'British Airways',
    'LH': 'Lufthansa',
    'AF': 'Air France',
    'KL': 'KLM',
    'EY': 'Etihad Airways',
    'EK': 'Emirates',
    'QR': 'Qatar Airways',
    'BG': 'Biman Bangladesh Airlines'
  };
  return airlines[code] || code;
}
