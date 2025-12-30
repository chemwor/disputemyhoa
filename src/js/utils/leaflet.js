const leaflet = {
  init() {
    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      return;
    }

    // Initialize the map - Updated to point to Smyrna, GA
    const leafletMap = L.map('map').setView([33.8839, -84.5144], 13);

    // Add tile layer with better styling
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 3,
    }).addTo(leafletMap);

    // Add a marker for Smyrna, GA
    L.marker([33.8839, -84.5144]).addTo(leafletMap)
      .bindPopup('Smyrna, GA<br>Our Location')
      .openPopup();

    // Handle window resize for responsive design
    window.addEventListener('resize', () => {
      leafletMap.invalidateSize();
    });

    // Add zoom control
    leafletMap.zoomControl.setPosition('bottomright');
  },
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  leaflet.init();
});
