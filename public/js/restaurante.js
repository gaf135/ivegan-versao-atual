document.addEventListener('DOMContentLoaded', () => {
    loadRestaurantes();
    updateNavbarCartCount(); // Ensure cart count is updated
});

async function loadRestaurantes() {
    try {
        const response = await fetch('/api/public/restaurantes');
        if (!response.ok) throw new Error('Erro ao carregar restaurantes');

        const todosRestaurantes = await response.json();

        // Filter out 'mercado' category as requested
        const restaurantes = todosRestaurantes.filter(r => r.categoria !== 'mercado');

        renderRestaurantesGrid(restaurantes);
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('restaurantes-grid').innerHTML =
            '<div class="col-12 text-center"><p class="text-danger">Erro ao carregar restaurantes. Tente novamente.</p></div>';
    }
}

function renderRestaurantesGrid(restaurantes) {
    const grid = document.getElementById('restaurantes-grid');
    grid.innerHTML = '';

    if (restaurantes.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center"><p class="text-muted">Nenhum restaurante encontrado.</p></div>';
        return;
    }

    restaurantes.forEach(restaurante => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';

        // Use a default image if none provided (API doesn't seem to return image for restaurant list yet, 
        // but we can use a placeholder or add it to the backend later. For now, placeholder.)
        const imagemUrl = restaurante.url_imagem || 'img/default-restaurant.png';

        card.innerHTML = `
            <div class="card h-100 shadow-sm restaurant-card" style="cursor: pointer; transition: transform 0.2s;">
                <img src="${imagemUrl}" class="card-img-top" alt="${restaurante.nome_publico}" style="height: 200px; object-fit: cover;" onerror="this.onerror=null; this.src='img/default-restaurant.png'">
                <div class="card-body">
                    <h5 class="card-title">${restaurante.nome_publico}</h5>
                    <p class="card-text text-muted small">
                        <i class="fas fa-star text-warning"></i> ${restaurante.avaliacao_media || 'Novo'} • ${restaurante.categoria}
                    </p>
                    <p class="card-text"><small class="text-muted"><i class="fas fa-map-marker-alt"></i> ${restaurante.endereco}</small></p>
                </div>
                <div class="card-footer bg-white border-top-0 text-center pb-3">
                    <button class="btn btn-outline-primary w-100">Ver Cardápio</button>
                </div>
            </div>
        `;

        // Make the whole card clickable
        card.querySelector('.restaurant-card').addEventListener('click', () => {
            window.location.href = `cardapio.html?id=${restaurante.id}`;
        });

        grid.appendChild(card);
    });
}

// Helper to ensure cart count is correct (copied from other files or just rely on navbar.js)
function updateNavbarCartCount() {
    const cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];
    const count = cart.reduce((acc, item) => acc + item.quantidade, 0);
    const badges = document.querySelectorAll('#cart-count');
    badges.forEach(badge => badge.textContent = count);
}
