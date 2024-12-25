
  /************************************************
   *       Leaflet Map
   ************************************************/
  const map = L.map('map').setView([29.210815, -81.022835], 13);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 21,
    attribution: 'Tiles © Esri ...'
  }).addTo(map);

  const marker = L.marker([29.210815, -81.022835]).addTo(map);
  const recentCoordinates = [];
  const polyline = L.polyline([], { color: 'red' }).addTo(map);