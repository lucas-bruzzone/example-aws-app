// Configurações da API
const PROPERTIES_API_URL = 'https://nfvbev7jgc.execute-api.us-east-1.amazonaws.com/devops/properties';

// Variáveis globais do mapa
let map;
let drawnItems;
let drawControl;
let currentPolygon = null;
let properties = [];
let editingPropertyId = null;

// DOM Elements
const propertyForm = document.getElementById('propertyForm');
const propertyNameInput = document.getElementById('propertyName');
const propertyTypeSelect = document.getElementById('propertyType');
const propertyDescriptionInput = document.getElementById('propertyDescription');
const calculatedAreaSpan = document.getElementById('calculatedArea');
const calculatedPerimeterSpan = document.getElementById('calculatedPerimeter');
const savePropertyBtn = document.getElementById('savePropertyBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const refreshPropertiesBtn = document.getElementById('refreshPropertiesBtn');
const propertiesList = document.getElementById('propertiesList');
const mapStatus = document.getElementById('mapStatus');
const logoutNavBtn = document.getElementById('logoutNavBtn');

// Initialize app
window.addEventListener('load', function() {
    setTimeout(function() {
        // Verificar autenticação primeiro
        if (!auth.isAuthenticated() || !auth.isTokenValid()) {
            window.location.href = 'index.html';
            return;
        }
        
        try {
            // Verificar bibliotecas
            if (typeof L === 'undefined') {
                throw new Error('Leaflet não carregou');
            }
            if (typeof L.Control.Draw === 'undefined') {
                throw new Error('Leaflet Draw não carregou');
            }
            if (typeof turf === 'undefined') {
                throw new Error('Turf.js não carregou');
            }
            
            console.log('Todas as bibliotecas carregaram com sucesso');
            showStatus('Inicializando mapa...', 'info');
            
            initializeMap();
            setupEventListeners();
            
            // Verificar conectividade e carregar propriedades
            checkAPIConnection().then(connected => {
                if (connected) {
                    loadProperties();
                }
            });
            
        } catch (error) {
            console.error('Erro de carregamento:', error);
            showStatus(`Erro: ${error.message}. Recarregue a página.`, 'error');
        }
    }, 500);
});

// Inicializar mapa
function initializeMap() {
    try {
        // Coordenadas de São Sebastião do Paraíso, MG
        map = L.map('map').setView([-21.206, -46.876], 13);

        // Adicionar tiles do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Layer para armazenar as formas desenhadas
        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        // Configurar controles de desenho
        setupDrawControls();
        
        // Event listeners do mapa
        setupMapEventListeners();
        
        showStatus('Mapa carregado! Use as ferramentas de desenho para criar polígonos.', 'success');
        console.log('Mapa inicializado com sucesso');
        
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
        showStatus(`Erro ao inicializar mapa: ${error.message}`, 'error');
    }
}

// Configurar controles de desenho
function setupDrawControls() {
    try {
        drawControl = new L.Control.Draw({
            edit: {
                featureGroup: drawnItems,
                remove: true
            },
            draw: {
                polygon: {
                    allowIntersection: false,
                    shapeOptions: {
                        color: '#667eea',
                        weight: 3,
                        fillOpacity: 0.2,
                        fillColor: '#667eea'
                    }
                },
                rectangle: {
                    shapeOptions: {
                        color: '#667eea',
                        weight: 3,
                        fillOpacity: 0.2,
                        fillColor: '#667eea'
                    }
                },
                polyline: false,
                circle: false,
                marker: false,
                circlemarker: false
            }
        });
        
        map.addControl(drawControl);
        console.log('Controles de desenho configurados com sucesso');
        
    } catch (error) {
        console.error('Erro ao configurar controles de desenho:', error);
        showStatus('Erro ao carregar ferramentas de desenho.', 'error');
    }
}

// Event listeners do mapa
function setupMapEventListeners() {
    // Quando um polígono é criado
    map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        currentPolygon = layer;
        drawnItems.addLayer(layer);
        
        // Calcular métricas
        const metrics = calculatePolygonMetrics(layer);
        
        // Mostrar popup com informações
        layer.bindPopup(`
            <div class="popup-content">
                <strong>Nova área demarcada</strong><br>
                Área: ${metrics.area} hectares<br>
                Perímetro: ${metrics.perimeter} metros
            </div>
        `).openPopup();
        
        // Mostrar formulário
        showPropertyForm(metrics);
        
        showStatus('Área demarcada! Preencha os dados da propriedade.', 'info');
    });

    // Quando um polígono é editado
    map.on(L.Draw.Event.EDITED, function (e) {
        const layers = e.layers;
        layers.eachLayer(function (layer) {
            const metrics = calculatePolygonMetrics(layer);
            
            // Atualizar popup
            layer.setPopupContent(`
                <div class="popup-content">
                    <strong>Área editada</strong><br>
                    Área: ${metrics.area} hectares<br>
                    Perímetro: ${metrics.perimeter} metros
                </div>
            `);
            
            // Se este é o polígono atual, atualizar o formulário
            if (layer === currentPolygon) {
                updateFormMetrics(metrics);
            }
        });
        
        showStatus('Área editada com sucesso!', 'success');
    });

    // Quando um polígono é deletado
    map.on(L.Draw.Event.DELETED, function (e) {
        hidePropertyForm();
        currentPolygon = null;
        showStatus('Área removida.', 'info');
    });
}

// Calcular métricas do polígono
function calculatePolygonMetrics(layer) {
    try {
        let coords;
        
        if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
            coords = layer.getLatLngs()[0].map(latlng => [latlng.lng, latlng.lat]);
        } else {
            throw new Error('Tipo de geometria não suportado');
        }
        
        // Fechar o polígono se necessário
        if (coords[0][0] !== coords[coords.length - 1][0] || 
            coords[0][1] !== coords[coords.length - 1][1]) {
            coords.push(coords[0]);
        }
        
        const polygon = turf.polygon([coords]);
        
        // Calcular área em hectares
        const areaM2 = turf.area(polygon);
        const areaHectares = (areaM2 / 10000).toFixed(2);
        
        // Calcular perímetro em metros
        const perimeterKm = turf.length(polygon, {units: 'kilometers'});
        const perimeterMeters = Math.round(perimeterKm * 1000);
        
        return {
            area: areaHectares,
            perimeter: perimeterMeters,
            coordinates: coords
        };
    } catch (error) {
        console.error('Erro ao calcular métricas:', error);
        return {
            area: '0.00',
            perimeter: '0',
            coordinates: []
        };
    }
}

// Event listeners gerais
function setupEventListeners() {
    // Botão de logout na navegação
    if (logoutNavBtn) {
        logoutNavBtn.addEventListener('click', handleLogout);
    }
    
    // Formulário de propriedade - usar função controladora
    if (savePropertyBtn) {
        savePropertyBtn.addEventListener('click', handlePropertySubmit);
    }
    
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', handleCancelForm);
    }
    
    // Atualizar propriedades
    if (refreshPropertiesBtn) {
        refreshPropertiesBtn.addEventListener('click', loadProperties);
    }
    
    // Enter no campo nome para focar no próximo
    if (propertyNameInput) {
        propertyNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                propertyTypeSelect.focus();
            }
        });
    }
}

// Função controladora que decide se é criação ou edição
async function handlePropertySubmit() {
    if (editingPropertyId) {
        await handleUpdateProperty(editingPropertyId);
    } else {
        await handleSaveProperty();
    }
}

// Função para cancelar formulário
function handleCancelForm() {
    hidePropertyForm();
    resetFormToCreateMode();
}

// Mostrar formulário de propriedade
function showPropertyForm(metrics) {
    updateFormMetrics(metrics);
    propertyForm.classList.remove('hidden');
    propertyNameInput.focus();
}

// Esconder formulário de propriedade
function hidePropertyForm() {
    propertyForm.classList.add('hidden');
    clearPropertyForm();
    resetFormToCreateMode();
}

// Atualizar métricas no formulário
function updateFormMetrics(metrics) {
    if (calculatedAreaSpan) calculatedAreaSpan.textContent = metrics.area;
    if (calculatedPerimeterSpan) calculatedPerimeterSpan.textContent = metrics.perimeter;
}

// Limpar formulário de propriedade
function clearPropertyForm() {
    if (propertyNameInput) propertyNameInput.value = '';
    if (propertyTypeSelect) propertyTypeSelect.value = 'fazenda';
    if (propertyDescriptionInput) propertyDescriptionInput.value = '';
    if (calculatedAreaSpan) calculatedAreaSpan.textContent = '-';
    if (calculatedPerimeterSpan) calculatedPerimeterSpan.textContent = '-';
}

// Resetar formulário para modo de criação
function resetFormToCreateMode() {
    editingPropertyId = null;
    currentPolygon = null;
    savePropertyBtn.textContent = 'Salvar Propriedade';
    cancelFormBtn.textContent = 'Cancelar';
}

// Salvar propriedade
async function handleSaveProperty() {
    const name = propertyNameInput.value.trim();
    const type = propertyTypeSelect.value;
    const description = propertyDescriptionInput.value.trim();
    
    if (!name) {
        showStatus('Por favor, digite o nome da propriedade.', 'error');
        propertyNameInput.focus();
        return;
    }
    
    if (!currentPolygon) {
        showStatus('Nenhuma área foi demarcada. Desenhe um polígono primeiro.', 'error');
        return;
    }
    
    const metrics = calculatePolygonMetrics(currentPolygon);
    
    const propertyData = {
        name: name,
        type: type,
        description: description,
        area: parseFloat(metrics.area),
        perimeter: metrics.perimeter,
        coordinates: metrics.coordinates
    };
    
    savePropertyBtn.disabled = true;
    savePropertyBtn.textContent = 'Salvando...';
    
    try {
        const token = auth.getToken();
        if (!token) {
            throw new Error('Token de autenticação não encontrado');
        }
        
        const response = await fetch(PROPERTIES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(propertyData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP ${response.status}`);
        }
        
        const result = await response.json();
        const savedProperty = result.property;
        
        // Atualizar o polígono salvo
        currentPolygon.setStyle({
            color: '#28a745',
            fillColor: '#28a745'
        });
        
        currentPolygon.bindPopup(`
            <div class="popup-content">
                <strong>${savedProperty.name}</strong><br>
                Tipo: ${capitalizeFirst(savedProperty.type)}<br>
                Área: ${savedProperty.area} hectares<br>
                Perímetro: ${savedProperty.perimeter} metros
            </div>
        `);
        
        currentPolygon.propertyData = savedProperty;
        
        hidePropertyForm();
        loadProperties(); // Recarregar lista
        currentPolygon = null;
        
        showStatus(`Propriedade "${name}" salva com sucesso!`, 'success');
        
    } catch (error) {
        console.error('Erro ao salvar propriedade:', error);
        showStatus(`Erro ao salvar: ${error.message}`, 'error');
    } finally {
        savePropertyBtn.disabled = false;
        savePropertyBtn.textContent = 'Salvar Propriedade';
    }
}

// Carregar propriedades
async function loadProperties() {
    if (!auth.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }
    
    refreshPropertiesBtn.disabled = true;
    refreshPropertiesBtn.textContent = 'Carregando...';
    
    try {
        const token = auth.getToken();
        if (!token) {
            throw new Error('Token de autenticação não encontrado');
        }
        
        const response = await fetch(PROPERTIES_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                auth.signOut();
                window.location.href = 'index.html';
                return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP ${response.status}`);
        }
        
        const data = await response.json();
        properties = data.properties || [];
        
        // Limpar polígonos existentes do mapa
        drawnItems.clearLayers();
        
        // Adicionar propriedades ao mapa
        properties.forEach(property => {
            if (property.coordinates && property.coordinates.length > 0) {
                // Converter coordenadas (lng,lat) para (lat,lng) para Leaflet
                const latLngs = property.coordinates.slice(0, -1).map(coord => [coord[1], coord[0]]);
                
                const polygon = L.polygon(latLngs, {
                    color: '#28a745',
                    fillColor: '#28a745',
                    weight: 3,
                    fillOpacity: 0.2
                });
                
                polygon.bindPopup(`
                    <div class="popup-content">
                        <strong>${property.name}</strong><br>
                        Tipo: ${capitalizeFirst(property.type)}<br>
                        Área: ${property.area} hectares<br>
                        Perímetro: ${property.perimeter} metros<br>
                        ${property.description ? `<em>${property.description}</em>` : ''}
                    </div>
                `);
                
                polygon.propertyData = property;
                drawnItems.addLayer(polygon);
            }
        });
        
        updatePropertiesList();
        showStatus(`${properties.length} propriedades carregadas.`, 'success');
        
    } catch (error) {
        console.error('Erro ao carregar propriedades:', error);
        showStatus(`Erro ao carregar: ${error.message}`, 'error');
    } finally {
        refreshPropertiesBtn.disabled = false;
        refreshPropertiesBtn.textContent = 'Atualizar';
    }
}

// Atualizar lista de propriedades
function updatePropertiesList() {
    if (!propertiesList) return;
    
    if (properties.length === 0) {
        propertiesList.innerHTML = `
            <div class="empty-message">
                <p>Nenhuma propriedade cadastrada ainda.</p>
                <p>Desenhe áreas no mapa para começar!</p>
            </div>
        `;
        return;
    }
    
    propertiesList.innerHTML = properties.map(property => `
        <div class="property-card" data-property-id="${property.id}">
            <h4>${property.name}</h4>
            <span class="property-type">${capitalizeFirst(property.type)}</span>
            <p><strong>Área:</strong> ${property.area} hectares</p>
            <p><strong>Perímetro:</strong> ${property.perimeter} metros</p>
            ${property.description ? `<p><strong>Descrição:</strong> ${property.description}</p>` : ''}
            <p class="property-date"><strong>Criado em:</strong> ${formatDate(property.createdAt)}</p>
            <div class="property-actions">
                <button class="btn btn-small btn-success" onclick="zoomToProperty('${property.id}')">
                    Ver no Mapa
                </button>
                <button class="btn btn-small" onclick="editProperty('${property.id}')">
                    Editar
                </button>
                <button class="btn btn-small btn-danger" onclick="deleteProperty('${property.id}')">
                    Excluir
                </button>
            </div>
        </div>
    `).join('');
}

// Editar propriedade
async function editProperty(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) {
        showStatus('Propriedade não encontrada.', 'error');
        return;
    }
    
    // Definir modo de edição
    editingPropertyId = propertyId;
    
    // Preencher formulário com dados atuais
    propertyNameInput.value = property.name;
    propertyTypeSelect.value = property.type;
    propertyDescriptionInput.value = property.description || '';
    calculatedAreaSpan.textContent = property.area;
    calculatedPerimeterSpan.textContent = property.perimeter;
    
    // Encontrar polígono no mapa
    let targetLayer = null;
    drawnItems.eachLayer(layer => {
        if (layer.propertyData && layer.propertyData.id === propertyId) {
            targetLayer = layer;
        }
    });
    
    if (targetLayer) {
        currentPolygon = targetLayer;
        map.fitBounds(targetLayer.getBounds());
        targetLayer.openPopup();
    }
    
    // Mostrar formulário em modo edição
    propertyForm.classList.remove('hidden');
    savePropertyBtn.textContent = 'Atualizar Propriedade';
    cancelFormBtn.textContent = 'Cancelar Edição';
    
    propertyNameInput.focus();
    showStatus('Modo de edição ativado. Modifique os dados e clique em "Atualizar".', 'info');
}

// Atualizar propriedade existente
async function handleUpdateProperty(propertyId) {
    const name = propertyNameInput.value.trim();
    const type = propertyTypeSelect.value;
    const description = propertyDescriptionInput.value.trim();
    
    if (!name) {
        showStatus('Por favor, digite o nome da propriedade.', 'error');
        propertyNameInput.focus();
        return;
    }
    
    // Preparar dados para atualização
    const updateData = {
        name: name,
        type: type,
        description: description
    };
    
    // Se o polígono foi modificado, incluir novas coordenadas
    if (currentPolygon) {
        const metrics = calculatePolygonMetrics(currentPolygon);
        updateData.area = parseFloat(metrics.area);
        updateData.perimeter = metrics.perimeter;
        updateData.coordinates = metrics.coordinates;
    }
    
    savePropertyBtn.disabled = true;
    savePropertyBtn.textContent = 'Atualizando...';
    
    try {
        // Chamada para API
        const updatedProperty = await updatePropertyFromAPI(propertyId, updateData);
        
        // Atualizar na lista local
        const index = properties.findIndex(p => p.id === propertyId);
        if (index !== -1) {
            properties[index] = updatedProperty;
        }
        
        // Atualizar polígono no mapa
        if (currentPolygon) {
            currentPolygon.propertyData = updatedProperty;
            currentPolygon.setPopupContent(`
                <div class="popup-content">
                    <strong>${updatedProperty.name}</strong><br>
                    Tipo: ${capitalizeFirst(updatedProperty.type)}<br>
                    Área: ${updatedProperty.area} hectares<br>
                    Perímetro: ${updatedProperty.perimeter} metros<br>
                    ${updatedProperty.description ? `<em>${updatedProperty.description}</em>` : ''}
                </div>
            `);
        }
        
        hidePropertyForm();
        resetFormToCreateMode();
        updatePropertiesList();
        currentPolygon = null;
        
        showStatus(`Propriedade "${name}" atualizada com sucesso!`, 'success');
        
    } catch (error) {
        console.error('Erro ao atualizar propriedade:', error);
        showStatus(`Erro ao atualizar: ${error.message}`, 'error');
    } finally {
        savePropertyBtn.disabled = false;
        savePropertyBtn.textContent = 'Atualizar Propriedade';
    }
}

// Atualizar propriedade via API
async function updatePropertyFromAPI(propertyId, updateData) {
    const token = auth.getToken();
    if (!token) {
        throw new Error('Token de autenticação não encontrado');
    }
    
    const response = await fetch(`${PROPERTIES_API_URL}/${propertyId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }
    
    const result = await response.json();
    return result.property;
}

// Focar em propriedade no mapa
function zoomToProperty(propertyId) {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;
    
    // Encontrar a camada no mapa
    let targetLayer = null;
    drawnItems.eachLayer(layer => {
        if (layer.propertyData && layer.propertyData.id === propertyId) {
            targetLayer = layer;
        }
    });
    
    if (targetLayer) {
        map.fitBounds(targetLayer.getBounds());
        targetLayer.openPopup();
        showStatus(`Focando na propriedade "${property.name}".`, 'info');
    } else {
        // Criar nova camada baseada nas coordenadas salvas
        const polygon = L.polygon(property.coordinates.slice(0, -1).map(coord => [coord[1], coord[0]]));
        drawnItems.addLayer(polygon);
        polygon.propertyData = property;
        
        polygon.setStyle({
            color: '#28a745',
            fillColor: '#28a745'
        });
        
        polygon.bindPopup(`
            <div class="popup-content">
                <strong>${property.name}</strong><br>
                Tipo: ${capitalizeFirst(property.type)}<br>
                Área: ${property.area} hectares<br>
                Perímetro: ${property.perimeter} metros
            </div>
        `);
        
        map.fitBounds(polygon.getBounds());
        polygon.openPopup();
    }
}

// Excluir propriedade
async function deleteProperty(propertyId) {
    if (!confirm('Tem certeza que deseja excluir esta propriedade?')) {
        return;
    }
    
    try {
        const token = auth.getToken();
        if (!token) {
            throw new Error('Token de autenticação não encontrado');
        }
        
        const response = await fetch(`${PROPERTIES_API_URL}/${propertyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro HTTP ${response.status}`);
        }
        
        // Remover da lista local
        properties = properties.filter(p => p.id !== propertyId);
        
        // Remover do mapa
        drawnItems.eachLayer(layer => {
            if (layer.propertyData && layer.propertyData.id === propertyId) {
                drawnItems.removeLayer(layer);
            }
        });
        
        updatePropertiesList();
        showStatus('Propriedade excluída com sucesso.', 'success');
        
    } catch (error) {
        console.error('Erro ao excluir propriedade:', error);
        showStatus(`Erro ao excluir: ${error.message}`, 'error');
    }
}

// Logout
function handleLogout() {
    auth.signOut();
    window.location.href = 'index.html';
}

// Mostrar status
function showStatus(message, type = 'info') {
    if (!mapStatus) return;
    
    mapStatus.textContent = message;
    mapStatus.className = `status-message ${type} show`;
    
    // Auto-hide após 5 segundos
    setTimeout(() => {
        mapStatus.classList.remove('show');
    }, 5000);
}

// Funções utilitárias
function generateId() {
    return 'prop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Data inválida';
    }
}

// Verificar conectividade com a API
async function checkAPIConnection() {
    try {
        const token = auth.getToken();
        if (!token) {
            showStatus('Token de autenticação não encontrado. Faça login novamente.', 'error');
            return false;
        }
        
        // Fazer uma requisição simples para verificar conectividade
        const response = await fetch(PROPERTIES_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            showStatus('Sessão expirada. Redirecionando para login...', 'error');
            setTimeout(() => {
                auth.signOut();
                window.location.href = 'index.html';
            }, 2000);
            return false;
        }
        
        if (!response.ok) {
            throw new Error(`API indisponível: ${response.status}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('Erro ao verificar API:', error);
        showStatus('Erro de conectividade com o servidor. Tente novamente.', 'error');
        return false;
    }
}