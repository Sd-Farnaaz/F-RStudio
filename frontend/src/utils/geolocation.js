/**
 * Real location detection helper.
 * Uses the browser Geolocation API and reverse-geocodes with OpenStreetMap Nominatim.
 *
 * @returns {Promise<{
 *   latitude: number,
 *   longitude: number,
 *   addressLine: string,
 *   city: string,
 *   state: string,
 *   postalCode: string,
 *   country: string,
 *   displayName: string
 * }>}
 */
export async function detectCurrentLocation() {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not supported by your current browser.');
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    });
  }).catch((err) => {
    if (err.code === 1) { // PERMISSION_DENIED
      throw new Error('Location access was denied. Please allow location permission in your browser or enter address manually.');
    } else if (err.code === 2) { // POSITION_UNAVAILABLE
      throw new Error('Location information is unavailable on your device.');
    } else if (err.code === 3) { // TIMEOUT
      throw new Error('Location request timed out. Please try again or fill in the address manually.');
    }
    throw new Error(err.message || 'Failed to detect current location.');
  });

  const { latitude, longitude } = position.coords;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en'
        }
      }
    );

    if (!res.ok) {
      throw new Error('Could not fetch address details for coordinates.');
    }

    const data = await res.json();
    const addr = data.address || {};

    const streetPieces = [
      addr.house_number || addr.building || '',
      addr.road || addr.street || addr.pedestrian || '',
      addr.suburb || addr.neighbourhood || addr.residential || ''
    ].filter(Boolean);

    const addressLine = streetPieces.length > 0 
      ? streetPieces.join(', ')
      : (data.display_name?.split(',').slice(0, 2).join(',').trim() || '');

    const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
    const state = addr.state || addr.region || '';
    const postalCode = addr.postcode || '';
    const country = addr.country || 'India';

    return {
      latitude,
      longitude,
      addressLine,
      city,
      state,
      postalCode,
      country,
      displayName: data.display_name || ''
    };
  } catch (apiErr) {
    // Return coordinates even if reverse geocoding was throttled or failed
    return {
      latitude,
      longitude,
      addressLine: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      displayName: `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`
    };
  }
}

