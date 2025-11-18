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
    const { from, to, date, travelers = 1, tripType, returnDate } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ error: 'Missing required parameters: from, to, date' });
    }

    // Extract airport codes
    const fromCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from.substring(0, 3).toUpperCase();
    const toCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to.substring(0, 3).toUpperCase();

    // Get API token from environment variable
    const apiToken = process.env.TRAVELPAYOUTS_TOKEN || '198f3af298a92077a4f370c32dc1a517';
    const marker = process.env.TRAVELPAYOUTS_MARKER || '685384';

    // Format date for API (YYYY-MM-DD)
    const departureDate = date;
    
    // Build API request
    const apiUrl = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';
    const params = {
      origin: fromCode,
      destination: toCode,
      departure_at: departureDate,
      return_at: tripType === 'return' && returnDate ? returnDate : undefined,
      currency: 'USD',
      unique: false,
      sorting: 'price',
      direct: false,
      limit: 30,
      token: apiToken
    };

    // Remove undefined params
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

    console.log('Calling Travelpayouts API with:', params);

    // Call Travelpayouts API
    const response = await axios.get(apiUrl, { params });

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      // If no results, return sample data as fallback
      return res.status(200).json({
        success: true,
        flights: [],
        message: 'No flights found for this route'
      });
    }

    // Transform API response to match frontend format
    const flights = response.data.data.map(flight => {
      // Generate booking URL
      const bookingUrl = `https://tp.media/click?shmarker=${marker}&type=click&origin=${fromCode}&destination=${toCode}&departure_date=${departureDate}${returnDate ? `&return_date=${returnDate}` : ''}&adults=${travelers}&currency=USD`;

      return {
        id: flight.link || `${flight.airline}-${Date.now()}`,
        airline: flight.airline || 'Unknown',
        flightNumber: `${flight.airline}${Math.floor(Math.random() * 999) + 100}`,
        departure: {
          airport: fromCode,
          time: flight.departure_at || departureDate,
          date: departureDate
        },
        arrival: {
          airport: toCode,
          time: flight.return_at || departureDate,
          date: flight.return_at || departureDate
        },
        duration: `${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m` || 'N/A',
        price: flight.price || 0,
        currency: 'USD',
        stops: flight.transfers || 0,
        bookingUrl: flight.link || bookingUrl
      };
    });

    res.status(200).json({
      success: true,
      flights: flights,
      count: flights.length
    });

  } catch (error) {
    console.error('Flight search error:', error.message);
    
    // Return friendly error
    res.status(200).json({
      success: false,
      flights: [],
      error: 'Unable to fetch flights at this time. Please try again.'
    });
  }
};
