
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
    const params = { latlon: `${longitude},${latitude}` };
    const urlWithParams = buildUrl(UrlInondation, params);

    try {
      const response = await fetch(urlWithParams);
      if (!response.ok) {
        throw new Error(`Erreur HTTP ! statut : ${response.status}`);
      }

      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const risks = data.data.flatMap(item => item.liste_libelle_risque.map(risk => risk.libelle_risque_long));
        return risks;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données :', error);
      return null;
    }
  }

  async function fetchRadonZones(codeInsee) {
    const params = { code_insee: codeInsee, page: 1, page_size: 10 };
    const urlWithParams = buildUrl(UrlRadon, params);
  
    console.log('URL envoyée pour RadonZones:', urlWithParams); // Affiche l'URL dans la console
  
    try {
      const response = await fetch(urlWithParams);
      if (!response.ok) {
        throw new Error(`Erreur HTTP ! statut : ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Données reçues pour RadonZones:', data); // Log des données reçues
  
      if (data.data && data.data.length > 0) {
        const radonRiskDescriptions = { "1": 'faible', "2": 'moyenne', "3": 'élevé' };
        const radonClass = data.data.map(item => radonRiskDescriptions[item.classe_potentiel]);
        return radonClass;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données :', error);
      return null;
    }
  }

  function isValidCoordinates(coordinates) {
    const regex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
    if (!regex.test(coordinates)) {
      return false;
    }
    const [longitude, latitude] = coordinates.split(',').map(Number);
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return false;
    }
    return true;
  }

  async function fetchClayRisk(latitude, longitude) {
    const coordinates = `${longitude},${latitude}`;
    if (!isValidCoordinates(coordinates)) {
      console.error('Les coordonnées fournies ne sont pas au format correct ou sont en dehors des limites valides.');
      return null;
    }
  
    const url = `${UrlClay}?latlon=${coordinates}`;
  
    console.log('URL envoyée pour ClayRisk:', url); // Affiche l'URL dans la console
  
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching clay risk data :', error);
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
      if (data.data && data.data.length > 0) {
        const uniqueSismicities = new Set(data.data.map(item => item.zone_sismicite));
        return [...uniqueSismicities].map(sismicite => ({
          codeInsee: codeInsee,
          sismicite: sismicite
        }));
      } else {
        return [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données des zones sismiques :', error);
      return null;
    }
  }

  async function fetchMajorRisks(rayon, latlon, codeInsee) {
    const params = {};
    if (rayon && latlon) {
      params.rayon = rayon;
      params.latlon = latlon;
    } else if (codeInsee) {
      params.code_insee = codeInsee;
    } else {
      throw new Error('Paramètres manquants pour la recherche des risques majeurs.');
    }

    const urlWithParams = buildUrl('https://www.georisques.gouv.fr/api/v1/gaspar/dicrim', params);

    try {
      const response = await fetch(urlWithParams);
      if (!response.ok) {
        throw new Error(`Erreur HTTP ! statut : ${response.status}`);
      }

      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des risques majeurs :', error);
      return null;
    }
  }

  async function fetchLandslideRisk(rayon, latlon, codeInsee) {
    const params = {};
    if (rayon && latlon) {
      params.rayon = rayon;
      params.latlon = latlon;
    } else if (codeInsee) {
      params.code_insee = codeInsee;
    } else {
      throw new Error('Paramètres manquants pour la recherche des risques de mouvement de terrain.');
    }

    const urlWithParams = buildUrl('https://www.georisques.gouv.fr/api/v1/mvt', params);

    try {
      const response = await fetch(urlWithParams);
      if (!response.ok) {
        throw new Error(`Erreur HTTP ! statut : ${response.status}`);
      }

      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return data.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des risques de mouvement de terrain :', error);
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
    const params = { code_insee: codeInsee, latlon: latlon, adresse: address };
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
      console.error('Erreur lors de la génération du rapport PDF :', error);
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

  document.getElementById('searchForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const address = document.getElementById('address').value;
    if (address) {
      const coordinates = await geocodeAddress(address);
      if (coordinates) {
        centerMapOnCity(coordinates.latitude, coordinates.longitude);
  
        const floodZones = await fetchFloodZones(coordinates.latitude, coordinates.longitude);
        const radonZones = await fetchRadonZones(coordinates.codeInsee);
        const clayRisk = await fetchClayRisk(coordinates.latitude, coordinates.longitude);
        const seismicZones = await fetchSeismicZones(1000, `${coordinates.longitude},${coordinates.latitude}`, coordinates.codeInsee);
        const majorRisks = await fetchMajorRisks(1000, `${coordinates.longitude},${coordinates.latitude}`, coordinates.codeInsee);
        const landslideRisks = await fetchLandslideRisk(1000, `${coordinates.longitude},${coordinates.latitude}`, coordinates.codeInsee);
  
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';
  
        let cardTemplate = 
          `<div class="col-md-6 mb-3">
            <div class="card {cardClass}">
              <div class="card-header">{title}</div>
              <div class="card-body">
                <h5 class="card-title">{content}</h5>
              </div>
            </div>
          </div>`;
  
        function getCardClass(riskLevel) {
          if (riskLevel === 'high') {
            return 'card-risk-high';
          } else if (riskLevel === 'moderate') {
            return 'card-risk-moderate';
          } else {
            return 'card-risk-low';
          }
        }
  
        let highRiskCards = [];
        let moderateRiskCards = [];
        let lowRiskCards = [];
  
        function createCard(title, content, riskLevel) {
          const cardHtml = cardTemplate
            .replace('{cardClass}', getCardClass(riskLevel))
            .replace('{title}', title)
            .replace('{content}', content);
  
          if (riskLevel === 'high') {
            highRiskCards.push(cardHtml);
          } else if (riskLevel === 'moderate') {
            moderateRiskCards.push(cardHtml);
          } else {
            lowRiskCards.push(cardHtml);
          }
        }
  
        const floodRiskLevel = floodZones && floodZones.length > 0 ? 'high' : 'low';
        createCard('Zones Inondables', floodRiskLevel === 'high' ? "L'adresse est en zone inondable." : "L'adresse n'est pas en zone inondable.", floodRiskLevel);
  
        const radonRiskLevel = radonZones && radonZones.length > 0 ? 
          (radonZones.includes('élevé') ? 'high' : (radonZones.includes('moyenne') ? 'moderate' : 'low')) : 'low';
        const radonContent = radonRiskLevel === 'high' ? "L'adresse est en zone à risque radon élevé." : 
          (radonRiskLevel === 'moderate' ? "L'adresse est en zone à risque radon modéré." : 
          "L'adresse n'est pas en zone à risque radon.");
        createCard('Risques Radon', radonContent, radonRiskLevel);
  
        const clayRiskLevel = clayRisk && clayRisk.exposition ? 
          (clayRisk.exposition.includes('élevée') ? 'high' : (clayRisk.exposition.includes('moyenne') || clayRisk.exposition.includes('modérée') ? 'moderate' : 'low')) : 'low';
        createCard('Gonflement des Sols Argileux', clayRisk ? `Votre exposition au risque de gonflement des sols est ${clayRisk.exposition}.` : "Pas de risque de gonflement des sols.", clayRiskLevel);
  
        const seismicRiskLevel = seismicZones && seismicZones.length > 0 ? (seismicZones.some(zone => zone.sismicite === '4' || zone.sismicite === '5') ? 'high' : 'moderate') : 'low';
        createCard('Zones Sismiques', seismicRiskLevel === 'high' ? "L'adresse est en zone sismique avec un risque élevé." : (seismicRiskLevel === 'moderate' ? "L'adresse est en zone sismique avec un risque modéré." : "L'adresse n'est pas en zone sismique."), seismicRiskLevel);
  
        const majorRiskLevel = majorRisks && majorRisks.length > 0 ? 'high' : 'low';
        createCard('Risques Majeurs', majorRiskLevel === 'high' ? majorRisks.map(risk => `Risque majeur publié en ${risk.annee_publication} pour la commune ${risk.libelle_commune}, renseignez-vous en mairie pour plus d'information.`).join('<br>') : "Aucun risque majeur trouvé pour cette adresse.", majorRiskLevel);
  
        const landslideRiskLevel = landslideRisks && landslideRisks.length > 0 ? 'high' : 'low';
        createCard('Risques de mouvement de terrain', landslideRiskLevel === 'high' ? landslideRisks.map(risk => `Type: ${risk.type}, Lieu: ${risk.lieu}, Date: ${risk.date_debut}`).join('<br>') : "Aucun risque de mouvement de terrain trouvé pour cette adresse.", landslideRiskLevel);
  
        resultsContainer.innerHTML += highRiskCards.join('');
        resultsContainer.innerHTML += moderateRiskCards.join('');
        resultsContainer.innerHTML += lowRiskCards.join('');
  
        const downloadButton = document.getElementById('downloadReportButton');
        downloadButton.style.display = 'block';
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
    map.setView([latitude, longitude], 12);
    if (marker) {
      map.removeLayer(marker);
    }
    marker = L.marker([latitude, longitude]).addTo(map);
  }

  let map;
  let marker;
  document.addEventListener("DOMContentLoaded", function() {
    map = L.map('map').setView([46.603354, 1.888334], 6);
    const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    baseLayer.addTo(map);

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

    const nappeLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'REMNAPPE_FR',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
      });

      const pollutionLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'SSP_CLASSIFICATION_SIS',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
      });

      const volcanLayer = L.tileLayer.wms('https://georisques.gouv.fr/services', {
        layers: 'SUP_MINIER',
        format: 'image/png',
        transparent: true,
        attribution: '© GéoRisques'
      });

    const overlayMaps = {
      "Zones Inondables": floodLayer,
      "Risques Radon": radonLayer,
      "Gonflement argile": clayLayer,
      "activité sismique": sismicLayer,
      "PPR mouvement de terrain": cavityLayer,
      "risque industriel": industryLayer,
      "PPR feux de forets": forestFireLayer,
      "Risque remontée des nappes": nappeLayer,
      "Site Polluées": pollutionLayer,
      "Zone volcanique": volcanLayer,
    };

    const controlLayers = L.control.layers(null, overlayMaps).addTo(map);

    let selectedLayer = null;
    document.addEventListener('change', function(event) {
      if (event.target.type === 'checkbox') {
        const checkbox = event.target;
        const layerName = checkbox.nextSibling.textContent.trim();
        const layer = overlayMaps[layerName];

        if (checkbox.checked) {
          if (selectedLayer && selectedLayer !== layer) {
            map.removeLayer(selectedLayer);
          }
          map.addLayer(layer);
          selectedLayer = layer;
          uncheckOtherCheckboxes(layerName);
          updateMapTitle(layerName);
        } else {
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
      const overlays = document.querySelectorAll('.leaflet-control-layers-overlays input[type="checkbox"]');
      overlays.forEach(checkbox => {
        const label = checkbox.nextSibling.textContent.trim();
        if (label !== selectedLayerName) {
          checkbox.checked = false;
        }
      });
    }

    map.on('click', async function(e) {
      const { lat, lng } = e.latlng;
      centerMapOnCity(lat, lng);
      const coordinates = { latitude: lat, longitude: lng, codeInsee: null, fullAddress: `(${lat}, ${lng})` };
      const floodZones = await fetchFloodZones(lat, lng);
      const radonZones = coordinates.codeInsee ? await fetchRadonZones(coordinates.codeInsee) : null;
      const clayRisk = await fetchClayRisk(lat, lng);
      const seismicZones = await fetchSeismicZones(1000, `${lng},${lat}`, coordinates.codeInsee);
      const majorRisks = await fetchMajorRisks(1000, `${lng},${lat}`, coordinates.codeInsee);
      const landslideRisks = await fetchLandslideRisk(1000, `${lng},${lat}`, coordinates.codeInsee);

      const resultsContainer = document.getElementById('results');
      resultsContainer.innerHTML = '';

      let cardTemplate = 
        `<div class="col-md-6 mb-3">
          <div class="card {cardClass}">
            <div class="card-header">{title}</div>
            <div class="card-body">
              <h5 class="card-title">{content}</h5>
            </div>
          </div>
        </div>`;

      function getCardClass(riskLevel) {
        if (riskLevel === 'high') {
          return 'card-risk-high';
        } else if (riskLevel === 'moderate') {
          return 'card-risk-moderate';
        } else {
          return 'card-risk-low';
        }
      }

      let highRiskCards = [];
      let moderateRiskCards = [];
      let lowRiskCards = [];

      function createCard(title, content, riskLevel) {
        const cardHtml = cardTemplate
          .replace('{cardClass}', getCardClass(riskLevel))
          .replace('{title}', title)
          .replace('{content}', content);

        if (riskLevel === 'high') {
          highRiskCards.push(cardHtml);
        } else if (riskLevel === 'moderate') {
          moderateRiskCards.push(cardHtml);
        } else {
          lowRiskCards.push(cardHtml);
        }
      }

      const floodRiskLevel = floodZones && floodZones.length > 0 ? 'high' : 'low';
      createCard('Zones Inondables', floodRiskLevel === 'high' ? "L'adresse est en zone inondable." : "L'adresse n'est pas en zone inondable.", floodRiskLevel);

      const radonRiskLevel = radonZones && radonZones.length > 0 ? (radonZones.includes('élevé') ? 'high' : 'moderate') : 'low';
      createCard('Risques Radon', radonRiskLevel === 'high' ? "L'adresse est en zone à risque radon élevé." : (radonRiskLevel === 'moderate' ? "L'adresse est en zone à risque radon modéré." : "L'adresse n'est pas en zone à risque radon."), radonRiskLevel);

      const clayRiskLevel = clayRisk && clayRisk.exposition ? 
        (clayRisk.exposition.includes('élevée') ? 'high' : (clayRisk.exposition.includes('moyenne') || clayRisk.exposition.includes('modérée') ? 'moderate' : 'low')) : 'low';
      createCard('Gonflement des Sols Argileux', clayRisk ? `Votre exposition au risque de gonflement des sols est ${clayRisk.exposition}.` : "Pas de risque de gonflement des sols.", clayRiskLevel);

      const seismicRiskLevel = seismicZones && seismicZones.length > 0 ? (seismicZones.some(zone => zone.sismicite === '4' || zone.sismicite === '5') ? 'high' : 'moderate') : 'low';
      createCard('Zones Sismiques', seismicRiskLevel === 'high' ? "L'adresse est en zone sismique avec un risque élevé." : (seismicRiskLevel === 'moderate' ? "L'adresse est en zone sismique avec un risque modéré." : "L'adresse n'est pas en zone sismique."), seismicRiskLevel);

      const majorRiskLevel = majorRisks && majorRisks.length > 0 ? 'high' : 'low';
      createCard('Risques Majeurs', majorRiskLevel === 'high' ? majorRisks.map(risk => `Risque majeur publié en ${risk.annee_publication} pour la commune ${risk.libelle_commune}, renseigner vous en mairie pour plus d'information.`).join('<br>') : "Aucun risque majeur trouvé pour cette adresse.", majorRiskLevel);

      const landslideRiskLevel = landslideRisks && landslideRisks.length > 0 ? 'high' : 'low';
      createCard('Risques de mouvement de terrain', landslideRiskLevel === 'high' ? landslideRisks.map(risk => `Type: ${risk.type}, Lieu: ${risk.lieu}, Date: ${risk.date_debut}`).join('<br>') : "Aucun risque de mouvement de terrain trouvé pour cette adresse.", landslideRiskLevel);

      resultsContainer.innerHTML += highRiskCards.join('');
      resultsContainer.innerHTML += moderateRiskCards.join('');
      resultsContainer.innerHTML += lowRiskCards.join('');

      const downloadButton = document.getElementById('downloadReportButton');
      downloadButton.style.display = 'block';
      downloadButton.addEventListener('click', async function() {
        const latlon = `${lng},${lat}`;
        await generateReport(coordinates.codeInsee, latlon, coordinates.fullAddress);
      });
    });
  });

  window.onload = setupAutocomplete;














        