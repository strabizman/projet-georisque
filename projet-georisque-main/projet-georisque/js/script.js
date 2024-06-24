
const UrlInondation = 'https://www.georisques.gouv.fr/api/v1/gaspar/azi';
const UrlRadon = 'https://www.georisques.gouv.fr/api/v1/radon';
const UrlClay = 'https://www.georisques.gouv.fr/api/v1/rga';
const UrlSeismic = 'https://www.georisques.gouv.fr/api/v1/zonage_sismique';
const UrlReport = 'https://www.georisques.gouv.fr/api//v1/rapport_pdf';
const LocalProxy = 'http://localhost:3000/api';

// récupération des coordonées de l'adresse
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

// zone inondable
async function fetchFloodZones(latitude, longitude) {
    const params = {
        latlon: `${longitude},${latitude}`,
  
       
    };

    const urlWithParams = buildUrl(UrlInondation, params);
    
    
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

// Radon
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
            // Mappage des classes de risque radon à leurs descriptions
            const radonRiskDescriptions = {
                1: 'faible',
                2: 'moyenne',
                3: 'élevé'
            };

            // Obtenir la description du risque radon
            const radonClass = data.data.map(item => radonRiskDescriptions[item.classe_potentiel]);
            return radonClass;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        return null;
    }
}

// Argile

async function fetchClayRisk(lat, lon) {
    const params = { lat: lat, lon: lon };
    const urlWithParams = buildUrl(UrlClay, params);

    try {
        const response = await fetch(urlWithParams);
        if (!response.ok) {
            throw new Error(`Erreur HTTP ! statut : ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
            throw new Error('Réponse vide de l\'API pour les risques argileux.');
        }

        const data = JSON.parse(text);
        console.log('Données reçues des risques argileux:', data);

        // Vérification et extraction des données
        if (data.data && data.data.length > 0) {
            return data.data[0];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données de gonflement des sols argileux:', error);
        return null;
    }
}

// Zone Sismique

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
            // Extraire les informations de sismicité et éviter les doublons
            const uniqueSismicities = new Set(data.data.map(item => item.zone_sismicite));
            return [...uniqueSismicities].map(sismicite => ({
                codeInsee: codeInsee,
                sismicite: sismicite
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

// Compléter l'adresse automatiquement
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

// Génération du rapport pdf
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
function groupSeismicZonesByRisk(seismicZones) {
    const grouped = {};
    seismicZones.forEach(zone => {
        if (!grouped[zone.zone_sismicite]) {
            grouped[zone.zone_sismicite] = [];
        }
        grouped[zone.zone_sismicite].push(zone.libelle_commune);
    });
    return grouped;
}

// Affichage des résultat et de la carte
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
            // résultat en card
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
                    .replace('{content}', `L'adresse est en zone à risque radon ${radonZones[0]}.`);
            } else {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Risques Radon')
                    .replace('{content}', 'L\'adresse n\'est pas en zone à risque radon.');
            }

            if (clayRisk) {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Gonflement des Sols Argileux')
                    .replace('{content}', `Votre exposition au risque de gonflement des sols est considéré comme une ${clayRisk.exposition}.`);
            }

            if (seismicZones && seismicZones.length > 0) {
                const uniqueSeismicities = [...new Set(seismicZones.map(zone => `Sismicité: ${zone.sismicite}`))];
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Zones Sismiques')
                    .replace('{content}', `L'adresse est en zone sismique avec un risque ${uniqueSeismicities.join(', ')}.`);
            } else {
                resultsContainer.innerHTML += cardTemplate
                    .replace('{title}', 'Zones Sismiques')
                    .replace('{content}', 'L\'adresse n\'est pas en zone sismique.');
            }

            // Rendre le bouton de téléchargement visible
            const downloadButton = document.getElementById('downloadReportButton');
            downloadButton.style.display = 'block';

            // bouton de dl du pdf
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
})

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

    // Ajouter une couche de tuiles de base à la carte
    const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    baseLayer.addTo(map);

    // Ajouter des couches WMS pour les différents risques
    const floodLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'PPRN_COMMUNE_RISQINOND_APPROUV',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    const radonLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'RADON',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    const clayLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'ALEARG',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    const sismicLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'SIS_INTENSITE_EVT',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    const cavityLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'PPRN_COMMUNE_MVT_APPROUV',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    const industryLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'PPRT_COMMUNE_RISQIND_APPROUV',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    const forestFireLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'SUP_FEU',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
    });

    const submersionLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'ALEA_SYNT_03_02MOY_FXX',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
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

    const controlLayers = L.control.layers(null, overlayMaps).addTo(map);

    let selectedLayer = null; // Variable pour suivre la couche sélectionnée

    // Fonction qui surveille les checkboxs pour qu'une seule couche soit afficher à la fois par l'utilisateur
    document.addEventListener('change', function(event) {
        if (event.target.type === 'checkbox') {
            const checkbox = event.target;
            const layerName = checkbox.nextSibling.textContent.trim();
            const layer = overlayMaps[layerName];

            if (checkbox.checked) {
                // Ajouter la nouvelle couche et désélectionner l'ancienne si elle existe
                if (selectedLayer && selectedLayer !== layer) {
                    map.removeLayer(selectedLayer);
                }
                map.addLayer(layer);
                selectedLayer = layer;
                uncheckOtherCheckboxes(layerName);
                updateMapTitle(layerName);
            } else {
                // Retirer la couche si elle est désélectionnée
                map.removeLayer(layer);
                selectedLayer = null;
                updateMapTitle(null);
            }
        }
    });

    function updateMapTitle(layerName) {
        const mapTitle = document.getElementById('mapTitle');
        if (layerName) {
            mapTitle.innerText = `Carte des risques: ${layerName}`;
        } else {
            mapTitle.innerText = 'Carte des risques';
        }
    }
     // permet de ne cocher qu'une couche à la fois pour éviter les superpositions
    function uncheckOtherCheckboxes(selectedLayerName) {
        
        const overlays = document.querySelectorAll('.leaflet-control-layers-overlays input[type="checkbox"]');
        overlays.forEach(checkbox => {
            const label = checkbox.nextSibling.textContent.trim();
            // Décocher toutes les autres cases sauf celle sélectionnée
            if (label !== selectedLayerName) {
                checkbox.checked = false;
            }
        });
    }
});

window.onload = setupAutocomplete;














        