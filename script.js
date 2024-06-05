
const UrlInondation = 'https://www.georisques.gouv.fr/api/v1/gaspar/azi';
const LocalProxy = 'http://localhost:3000/api'; 

         //verif connexion api

        async function geocodeAddress(address) {
            const apiUrl = `${LocalProxy}/search/?q=${encodeURIComponent(address)}&limit=1`;

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ! Statut : ${response.status}`);
                }

                const data = await response.json();
                if (data.features.length === 0) {
                    throw new Error(`Adresse "${address}" non trouvée.`);
                }

                const location = data.features[0].geometry.coordinates;
                return {
                    latitude: location[1],
                    longitude: location[0]
                };
            } catch (error) {
                console.error('Erreur lors de la récupération des coordonnées de l\'adresse :', error);
                return null;
            }
        }

         // remplissage automatique de l'adresse

        async function autocompleteAddress(query) {
            const apiUrl = `${LocalProxy}/search/?q=${encodeURIComponent(query)}&limit=5`;

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ! Statut : ${response.status}`);
                }

                const data = await response.json();
                return data.features.map(feature => feature.properties.label);
            } catch (error) {
                console.error('Erreur lors de l\'autocomplétion de l\'adresse :', error);
                return [];
            }
        }

        function setupAutocomplete() {
            const addressInput = document.getElementById('address');

            if (addressInput) {
                addressInput.addEventListener('input', async function() {
                    const query = this.value.trim();
                    if (query === '') {
                        return;
                    }

                    const suggestions = await autocompleteAddress(query);
                    displayAutocompleteSuggestions(suggestions);
                });
            }
        }

        function displayAutocompleteSuggestions(suggestions) {
            const autocompleteDropdown = document.getElementById('autocomplete-dropdown');
            if (autocompleteDropdown) {
                autocompleteDropdown.innerHTML = '';

                suggestions.forEach(suggestion => {
                    const option = document.createElement('option');
                    option.value = suggestion;
                    autocompleteDropdown.appendChild(option);
                });
            }
        }

       
        // récupére les informations sur les zones inondables
        async function fetchFloodZones(latitude, longitude) {
            const params = {
                rayon: 1000,
                latlon: `${longitude},${latitude}`,
                page: 1,
                page_size: 10
            };

            const urlWithParams = buildUrl(UrlInondation, params);

            try {
                const response = await fetch(urlWithParams);

                if (!response.ok) {
                    throw new Error(`Erreur HTTP ! statut : ${response.status}`);
                }

                const data = await response.json();
                console.log('Données reçues des zones inondables:', data);

                return data;
            } catch (error) {
                console.error('Erreur lors de la récupération des données:', error);
                return null;
            }
        }

        function buildUrl(baseUrl, params) {
            const url = new URL(baseUrl);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            return url.toString();
        }

        // surveille l'envoie du formulaire et affiche si l'adresse est en zone inondable

        document.getElementById('searchForm').addEventListener('submit', async function(event) {
            event.preventDefault();

            const address = document.getElementById('address').value;
            if (address) {
                const coordinates = await geocodeAddress(address);
                if (coordinates) {
                    console.log('Coordonnées de l\'adresse:', coordinates);
                    const floodZones = await fetchFloodZones(coordinates.latitude, coordinates.longitude);
                    if (floodZones) {
                        if (floodZones.features && floodZones.features.length > 0) {
                            document.getElementById('results').innerText = `L'adresse est en zone inondable. Latitude: ${coordinates.latitude}, Longitude: ${coordinates.longitude}`;
                        } else {
                            document.getElementById('results').innerText = `L'adresse n'est pas en zone inondable. Latitude: ${coordinates.latitude}, Longitude: ${coordinates.longitude}`;
                        }
                    }
                } else {
                    document.getElementById('results').innerText = 'Coordonnées non trouvées.';
                }
            } else {
                document.getElementById('results').innerText = 'Veuillez entrer une adresse.';
            }
        });

        



        

        window.onload = setupAutocomplete;