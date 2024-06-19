
const UrlInondation = 'https://www.georisques.gouv.fr/api/v1/gaspar/azi';
const UrlRadon = 'https://www.georisques.gouv.fr/api/v1/radon';
const UrlClay = 'https://www.georisques.gouv.fr/api/v1/rga';
const UrlSeismic = 'https://www.georisques.gouv.fr/api/v1/zonage_sismique';
const UrlReport = 'https://www.georisques.gouv.fr/api//v1/rapport_pdf';
const LocalProxy = 'http://localhost:3000/api';

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
            longitude: location[0],
            codeInsee: data.features[0].properties.citycode,
            fullAddress: data.features[0].properties.label
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des coordonnées de l\'adresse :', error);
        return null;
    }
}

async function fetchFloodZones(latitude, longitude) {
    const params = {
        latlon: `${longitude},${latitude}`,
  
       
    };

    const urlWithParams = buildUrl(UrlInondation, params);
    
    // Ajouter cette ligne pour afficher l'URL dans la console
    console.log('URL envoyée à l\'API pour les zones inondables:', urlWithParams);

    try {
        const response = await fetch(urlWithParams);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP ! statut : ${response.status}`);
        }

        const data = await response.json();
        console.log('Données reçues des zones inondables:', data);

        if (data.data && data.data.length > 0) {
            const risks = data.data.flatMap(item => item.liste_libelle_risque.map(risk => risk.libelle_risque_long));
            return risks;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        return null;
    }
}

async function fetchRadonZones(codeInsee) {
    const params = {
        code_insee: codeInsee,
        page: 1,
        page_size: 10
    };

    const urlWithParams = buildUrl(UrlRadon, params);

    try {
        const response = await fetch(urlWithParams);
        if (!response.ok) {
            throw new Error(`Erreur HTTP ! statut : ${response.status}`);
        }

        const data = await response.json();
        console.log('Données reçues des zones Radon:', data);

        if (data.data && data.data.length > 0) {
            const radonClass = data.data.map(item => item.classe_potentiel);
            return radonClass;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        return null;
    }
}

async function fetchClayRisk(latitude, longitude) {
    const params = {
        latlon: `${longitude},${latitude}`
    };

    const urlWithParams = buildUrl(UrlClay, params);

    try {
        const response = await fetch(urlWithParams);
        if (!response.ok) {
            throw new Error(`Erreur HTTP ! statut : ${response.status}`);
        }

        const data = await response.json();
        console.log('Données reçues des risques de gonflement des sols argileux:', data);

        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des données de gonflement des sols argileux:', error);
        return null;
    }
}

async function fetchSeismicZones(rayon, latlon, codeInsee) {
    const params = {};
    if (rayon && latlon) {
        params.rayon = rayon;
        params.latlon = latlon;
    } else if (codeInsee) {
        params.code_insee = codeInsee;
    } else {
        throw new Error('Paramètres manquants pour la recherche des zones sismiques.');
    }

    const urlWithParams = buildUrl(UrlSeismic, params);

    try {
        const response = await fetch(urlWithParams);
        if (!response.ok) {
            throw new Error(`Erreur HTTP ! statut : ${response.status}`);
        }

        const data = await response.json();
        console.log('Données reçues des zones sismiques:', data);

        // Vérification et extraction des données
        if (data.data && data.data.length > 0) {
            // Extraire les informations de sismicité
            return data.data.map(item => ({
                codeInsee: item.code_insee,
                commune: item.libelle_commune,
                codeZone: item.code_zone,
                sismicite: item.zone_sismicite
            }));
        } else {
            return [];
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données des zones sismiques:', error);
        return null;
    }
}

function buildUrl(baseUrl, params) {
    const url = new URL(baseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    return url.toString();
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

async function generateReport(codeInsee, latlon, address) {
    const params = {
        code_insee: codeInsee,
        latlon: latlon,
        adresse: address
    };

    const urlWithParams = buildUrl(UrlReport, params);

    try {
        const response = await fetch(urlWithParams);
        if (!response.ok) {
            throw new Error(`Erreur HTTP ! statut : ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'rapport.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        console.log('Rapport PDF généré avec succès.');
    } catch (error) {
        console.error('Erreur lors de la génération du rapport PDF:', error);
    }
}

document.getElementById('searchForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const address = document.getElementById('address').value;
    if (address) {
        const coordinates = await geocodeAddress(address);
        if (coordinates) {
            console.log('Coordonnées de l\'adresse:', coordinates);

            // Centrer la carte et ajouter un marqueur
            centerMapOnCity(coordinates.latitude, coordinates.longitude);

            const floodZones = await fetchFloodZones(coordinates.latitude, coordinates.longitude);
            const radonZones = await fetchRadonZones(coordinates.codeInsee);
            const clayRisk = await fetchClayRisk(coordinates.latitude, coordinates.longitude);
            const seismicZones = await fetchSeismicZones(1000, `${coordinates.longitude},${coordinates.latitude}`, coordinates.codeInsee);

            const resultsContainer = document.getElementById('results');
            resultsContainer.innerHTML = '';

            let cardTemplate = `
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-header">{title}</div>
                        <div class="card-body">
                            <h5 class="card-title">{content}</h5>
                        </div>
                    </div>
                </div>
            `;

            if (floodZones && floodZones.length > 0) {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Zones Inondables')
                    .replace('{content}', `L'adresse est en zone inondable avec les risques suivants : ${floodZones.join(', ')}.`);
            } else {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Zones Inondables')
                    .replace('{content}', 'L\'adresse n\'est pas en zone inondable.');
            }

            if (radonZones && radonZones.length > 0) {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Risques Radon')
                    .replace('{content}', `L'adresse est en zone à risque radon (${radonZones[0]}).`);
            } else {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Risques Radon')
                    .replace('{content}', 'L\'adresse n\'est pas en zone à risque radon.');
            }

            if (clayRisk) {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Gonflement des Sols Argileux')
                    .replace('{content}', `Exposition au risque de gonflement des sols argileux : ${clayRisk.exposition}.`);
            }

            if (seismicZones && seismicZones.length > 0) {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Zones Sismiques')
                    .replace('{content}', `L'adresse est en zone sismique avec un risque ${seismicZones.map(zone => ` Sismicité: ${zone.sismicite}`).join(', ')}.`);
            } else {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Zones Sismiques')
                    .replace('{content}', 'L\'adresse n\'est pas en zone sismique.');
            }

            // Rendre le bouton de téléchargement visible
            const downloadButton = document.getElementById('downloadReportButton');
            downloadButton.style.display = 'block';

            // Associer le téléchargement du PDF au clic sur le bouton
            downloadButton.addEventListener('click', async function() {
                const latlon = `${coordinates.longitude},${coordinates.latitude}`;
                await generateReport(coordinates.codeInsee, latlon, coordinates.fullAddress);
            });
        } else {
            document.getElementById('results').innerText = 'Coordonnées non trouvées.';
        }
    } else {
        document.getElementById('results').innerText = 'Veuillez entrer une adresse.';
    }
});

function centerMapOnCity(latitude, longitude) {
    map.setView([latitude, longitude], 12); // Ajustez le niveau de zoom pour centrer sur la ville

    // Ajouter un marqueur sur la carte à l'adresse recherchée
    if (marker) {
        map.removeLayer(marker);
    }
    
}
let map;
let marker;

document.addEventListener("DOMContentLoaded", function() {
    // Initialiser la carte centrée sur la France
    map = L.map('map').setView([46.603354, 1.888334], 6);

    // Ajouter une couche de tuiles (par exemple OpenStreetMap)
    const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Ajouter des couches WMS pour les différents risques
    const floodLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'PPRN_COMMUNE_RISQINOND_APPROUV',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    floodLayer.on('click', function () {
        if (map.hasLayer(floodLayer)) {
            map.removeLayer(floodLayer);
        } else {
            map.addLayer(floodLayer);
        }
    });

    const radonLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'RADON',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    radonLayer.on('click', function () {
        if (map.hasLayer(radonLayer)) {
            map.removeLayer(radonLayer);
        } else {
            map.addLayer(radonLayer);
        }
    });

    const clayLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'ALEARG',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    clayLayer.on('click', function () {
        if (map.hasLayer(clayLayer)) {
            map.removeLayer(clayLayer);
        } else {
            map.addLayer(clayLayer);
        }
    });

    const sismicLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'SIS_INTENSITE_EVT',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    sismicLayer.on('click', function () {
        if (map.hasLayer(sismicLayer)) {
            map.removeLayer(sismicLayer);
        } else {
            map.addLayer(sismicLayer);
        }
    });

    const cavityLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'PPRN_COMMUNE_MVT_APPROUV',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    cavityLayer.on('click', function () {
        if (map.hasLayer(cavityLayer)) {
            map.removeLayer(cavityLayer);
        } else {
            map.addLayer(cavityLayer);
        }
    });

    const industryLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'PPRT_COMMUNE_RISQIND_APPROUV',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });
    industryLayer.on('click', function () {
        if (map.hasLayer(industryLayer)) {
            map.removeLayer(industryLayer);
        } else {
            map.addLayer(industryLayer);
        }
    });


    const forestFireLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'SUP_FEU',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    forestFireLayer.on('click', function () {
        if (map.hasLayer(forestFireLayer)) {
            map.removeLayer(forestFireLayer);
        } else {
            map.addLayer(forestFireLayer);
        }
    });


    const submersionLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'ALEA_SYNT_03_02MOY_FXX',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    submersionLayer.on('click', function () {
        if (map.hasLayer(submersionLayer)) {
            map.removeLayer(submersionLayer);
        } else {
            map.addLayer(submersionLayer);
        }
    });

    // Créer un contrôle de couches
    const overlayMaps = {
        "Zones Inondables": floodLayer,
        "Risques Radon": radonLayer,
        "Gonflement argile": clayLayer,
        "activité sismique": sismicLayer,
        "PPR mouvement de terrain": cavityLayer,
        "risque industriel": industryLayer,
        "PPR feux de forets": forestFireLayer,
        "Risque submersion fréquent": submersionLayer,
    };

   // Créer un contrôle de couches avec un gestionnaire d'événements
const controlLayers = L.control.layers(null, overlayMaps).addTo(map);

let selectedLayer = null; // Variable pour suivre la couche sélectionnée

// Ajouter un événement 'baselayerchange' pour détecter les changements de couche
map.on('baselayerchange', function (eventLayer) {
    // Retirer la couche précédemment sélectionnée si elle existe
    if (selectedLayer) {
        map.removeLayer(selectedLayer);
    }

    // Ajouter la nouvelle couche sélectionnée à la carte
    selectedLayer = eventLayer.layer;
});

// Ajouter une couche de tuiles de base à la carte
baseLayer.addTo(map);

    // Ajouter un gestionnaire d'événements pour le changement de couches
    map.on('overlayadd', function(e) {
        updateMapTitle(e.name);
    });

    map.on('overlayremove', function(e) {
        updateMapTitle(null);
    });

    function updateMapTitle(layerName) {
        const mapTitle = document.getElementById('mapTitle');
        if (layerName) {
            mapTitle.innerText = `Carte des risques: ${layerName}`;
        } else {
            mapTitle.innerText = 'Carte des risques';
        }
    }
    
});

window.onload = setupAutocomplete;















        