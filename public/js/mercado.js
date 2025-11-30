document.addEventListener('DOMContentLoaded', () => {
    loadMercadoProducts();
    updateCartCounter();
});

async function loadMercadoProducts() {
    try {
        const response = await fetch('/api/public/mercado/produtos');
        if (!response.ok) throw new Error('Erro ao carregar produtos');

        const produtos = await response.json();
        renderProductsGrid(produtos);
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('mercado-grid').innerHTML =
            '<div class="col-12 text-center"><p class="text-danger">Erro ao carregar produtos. Tente novamente.</p></div>';
    }
}

function renderProductsGrid(produtos) {
    const grid = document.getElementById('mercado-grid');
    grid.innerHTML = '';

    if (produtos.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center"><p>Nenhum produto encontrado.</p></div>';
        return;
    }

    produtos.forEach(produto => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${produto.url_imagem || '/img/default-dish.png'}" class="card-img-top" alt="${produto.nome}" style="height: 200px; object-fit: cover;">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${produto.nome}</h5>
                    <p class="card-text text-muted small">${produto.restaurante_nome}</p>
                    <p class="card-text flex-grow-1">${produto.descricao || ''}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="h5 mb-0 text-primary">R$ ${produto.preco.toFixed(2)}</span>
                        <button class="btn btn-outline-primary btn-sm" onclick="addToCart(${JSON.stringify(produto).replace(/"/g, '&quot;')})">
                            <i class="fas fa-cart-plus"></i> Adicionar
                        </button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Reutilizando lógica do carrinho (simplificada)
function addToCart(produto) {
    let cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];

    // Verificar se o produto é do mesmo restaurante (para simplificar, vamos permitir apenas um restaurante por pedido por enquanto, ou tratar como mix)
    // O ideal seria verificar se já existe itens de outro restaurante.
    if (cart.length > 0 && cart[0].restaurante_id !== produto.restaurante_id) {
        if (!confirm('Seu carrinho contém itens de outro restaurante. Deseja limpar o carrinho e adicionar este item?')) {
            return;
        }
        cart = [];
    }

    const existingItem = cart.find(item => item.id === produto.id);
    if (existingItem) {
        existingItem.quantidade += 1;
    } else {
        cart.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            quantidade: 1,
            restaurante_id: produto.restaurante_id,
            restaurante_nome: produto.restaurante_nome
        });
    }

    localStorage.setItem('ivegan_cart', JSON.stringify(cart));
    updateCartCounter();
    window.dispatchEvent(new Event('cartUpdated'));

    // Feedback visual
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '11';
    toast.innerHTML = `
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">iVegan</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${produto.nome} adicionado ao carrinho!
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];
    const count = cart.reduce((acc, item) => acc + item.quantidade, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
}
