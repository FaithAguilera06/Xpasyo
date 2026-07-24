<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>KNN Location Search for Parks</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        /* Full height so map container fills the viewport */
        html, body {
            height: 100%;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f4f7fa;
            display: flex;
            flex-direction: column;
        }
        header {
            background: linear-gradient(135deg, #4a90e2, #007acc);
            color: white;
            padding: 1rem 2rem;
            font-size: 1.5rem;
            font-weight: 700;
            text-align: center;
        }
        #map {
            flex: 1 1 auto;
            border-radius: 8px;
            box-shadow: 0 0 16px rgba(0,0,0,0.1);
            height: 100vh; /* Important: full viewport height for visibility */
        }
        .ranking {
            padding: 1rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 0 12px rgba(0,0,0,0.1);
            margin: 1rem;
        }
        .ranking h2 {
            margin-top: 0;
        }
    </style>
</head>
<body>
    <header>
        KNN Location Search for Parks
    </header>
    <section id="map" role="region" aria-label="Map of locations"></section>
    <div class="ranking" id="ranking" aria-label="Ranking of nearest parks">
        <h2>Nearest Parks</h2>
        <ul id="ranking-list"></ul>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Initialize Leaflet map
        const map = L.map('map').setView([40.7128, -74.0060], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        let markersLayer = L.layerGroup().addTo(map);

        // Calculate distance (haversine) between two lat-lng points in kilometers
        function haversineDistance(lat1, lng1, lat2, lng2) {
            function toRad(x) { return x * Math.PI / 180; }
            const R = 6371; // Earth radius in km
            const dLat = toRad(lat2 - lat1);
            const dLng = toRad(lng2 - lng1);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }

        // KNN algorithm to find k nearest neighbors to query location
        function knn(data, queryLat, queryLng, k) {
            const distances = data.map(loc => ({
                loc,
                distance: haversineDistance(queryLat, queryLng, loc.lat, loc.lng)
            }));
            distances.sort((a, b) => a.distance - b.distance);
            return distances.slice(0, k).map(d => d.loc);
        }

        // Clear all markers from map
        function clearMarkers() {
            markersLayer.clearLayers();
        }

        // Add markers for locations to the map
        function addMarkers(locations) {
            clearMarkers();
            locations.forEach(loc => {
                const marker = L.marker([loc.lat, loc.lng]).addTo(markersLayer);
                marker.bindPopup(`
                    <strong>${loc.name}</strong><br />
                    Type: Park<br />
                `);
            });
        }

        // Display ranking of nearest parks
        function displayRanking(neighbors) {
            const rankingList = document.getElementById('ranking-list');
            rankingList.innerHTML = ''; // Clear previous rankings
            if (neighbors.length === 0) {
                rankingList.innerHTML = '<li>No parks found nearby.</li>';
                return;
            }
            neighbors.forEach((park, index) => {
                const listItem = document.createElement('li');
                listItem.textContent = `${index + 1}. ${park.name}`;
                rankingList.appendChild(listItem);
            });
        }

        // Fetch parks from Overpass API
        function fetchParks(lat, lng) {
            const query = `
                [out:json];
                (
                    node["leisure"="park"](around:2000, ${lat}, ${lng});
                    way["leisure"="park"](around:2000, ${lat}, ${lng});
                    relation["leisure"="park"](around:2000, ${lat}, ${lng});
                );
                out body;
            `;
            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

            console.log("Fetching parks from Overpass API...");
            fetch(overpassUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Parks data received:", data);
                    const parks = data.elements.map(element => ({
                        name: element.tags.name || "Unnamed Park",
                        lat: element.lat || (element.center.lat),
                        lng: element.lon || (element.center.lon)
                    }));
                    console.log("Parsed parks:", parks); // Log parsed parks
                    addMarkers(parks);
                    return parks;
                })
                .then(parks => {
                    navigator.geolocation.getCurrentPosition(position => {
                        const queryLat = position.coords.latitude;
                        const queryLng = position.coords.longitude;
                        console.log("User  location:", queryLat, queryLng); // Log user location
                        const neighbors = knn(parks, queryLat, queryLng, 3); // Get 3 nearest parks
                        console.log("Nearest parks:", neighbors); // Log nearest parks
                        displayRanking(neighbors);
                    });
                })
                .catch(error => {
                    console.error('Error fetching parks:', error);
                });
        }

        // Get user's location and fetch parks
        navigator.geolocation.getCurrentPosition(position => {
            const queryLat = position.coords.latitude;
            const queryLng = position.coords.longitude;

            // Center map on user's location
            map.setView([queryLat, queryLng], 13);
            L.marker([queryLat, queryLng]).addTo(markersLayer).bindPopup('Your Location').openPopup();

            // Fetch parks around user's location
            fetchParks(queryLat, queryLng);
        }, () => {
            alert('Unable to retrieve your location.');
        });
    </script>
</body>
</html>
