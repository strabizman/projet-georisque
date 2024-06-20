
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

// Argile

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

    // Ajouter des écouteurs d'événements aux cases à cocher
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

    function uncheckOtherCheckboxes(selectedLayerName) {
        // Obtenir tous les éléments de contrôle de couches
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















        