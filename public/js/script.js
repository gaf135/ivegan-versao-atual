    // Inicializa o mapa centrado no Brasil
    const map = L.map('map').setView([-14.235, -51.9253], 5);

    // Camada base OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    
    // Variáveis globais
    let rotaLayer;
    let marcadorOrigem;
    let marcadorDestino;
    
    // Função para buscar coordenadas no Nominatim (com limite regional)
    async function buscarCoordenadas(endereco) {
      // Inclui "Brazil" automaticamente, caso o usuário não escreva
      const enderecoCompleto = endereco.toLowerCase().includes("brasil") 
        ? endereco 
        : `${endereco}, Brasil`;
    
      // URL do Nominatim
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&q=${encodeURIComponent(enderecoCompleto)}&limit=1`;
      
      const resposta = await fetch(url, { headers: { 'User-Agent': 'iFoodMapDemo/1.0' }});
      const dados = await resposta.json();
    
      if (dados.length > 0) {
        return [parseFloat(dados[0].lat), parseFloat(dados[0].lon)];
      } else {
        throw new Error("Endereço não encontrado: " + endereco);
      }
    }
    
    // Função principal: gera a rota entre origem e destino
    async function gerarRota() {
      const origem = document.getElementById('origem').value;
      const destino = document.getElementById('destino').value;
    
      if (!origem || !destino) {
        alert("Por favor, preencha os dois endereços.");
        return;
      }
    
      try {
        const [coordOrigem, coordDestino] = await Promise.all([
          buscarCoordenadas(origem),
          buscarCoordenadas(destino)
        ]);
    
        // Remove rota e marcadores anteriores antes de criar novos
        if (rotaLayer) map.removeLayer(rotaLayer);
        if (marcadorOrigem) map.removeLayer(marcadorOrigem);
        if (marcadorDestino) map.removeLayer(marcadorDestino);
    
        // Requisição para o servidor OSRM (roteamento)
        const rotaUrl = `https://router.project-osrm.org/route/v1/driving/${coordOrigem[1]},${coordOrigem[0]};${coordDestino[1]},${coordDestino[0]}?overview=full&geometries=geojson`;
        const rotaResp = await fetch(rotaUrl);
        const rotaData = await rotaResp.json();
    
        if (rotaData.routes && rotaData.routes.length > 0) {
          const coords = rotaData.routes[0].geometry.coordinates.map(p => [p[1], p[0]]);
    
          // Desenha nova rota
          rotaLayer = L.polyline(coords, { color: '#ea1d2c', weight: 5 }).addTo(map);
    
          // Adiciona marcadores
          marcadorOrigem = L.marker(coordOrigem).addTo(map).bindPopup("Origem").openPopup();
          marcadorDestino = L.marker(coordDestino).addTo(map).bindPopup("Destino");
    
          // Ajusta o zoom para mostrar toda a rota
          map.fitBounds(rotaLayer.getBounds());
        } else {
          alert("Não foi possível traçar a rota.");
        }
    
      } catch (erro) {
        console.error(erro);
        alert("Erro ao gerar rota. Verifique os endereços.");
      }
    }

    