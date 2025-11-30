document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    updateCartCounter();
});

function loadCart() {
    const cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    const deliveryFeeEl = document.getElementById('delivery-fee');

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-shopping-basket fa-3x text-muted mb-3"></i>
                <p class="text-muted">Seu carrinho está vazio.</p>
                <a href="mercado.html" class="btn btn-primary">Ir para o Mercado</a>
            </div>
        `;
        subtotalEl.textContent = 'R$ 0,00';
        totalEl.textContent = 'R$ 0,00';
        return;
    }

    let subtotal = 0;
    container.innerHTML = '';

    cart.forEach((item, index) => {
        const itemTotal = item.preco * item.quantidade;
        subtotal += itemTotal;

        const itemEl = document.createElement('div');
        itemEl.className = 'd-flex justify-content-between align-items-center border-bottom py-3';
        itemEl.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="ms-3">
                    <h6 class="mb-0">${item.nome}</h6>
                    <small class="text-muted">R$ ${item.preco.toFixed(2)} un.</small>
                </div>
            </div>
            <div class="d-flex align-items-center">
                <div class="input-group input-group-sm me-3" style="width: 100px;">
                    <button class="btn btn-outline-secondary" onclick="updateQuantity(${index}, -1)">-</button>
                    <input type="text" class="form-control text-center" value="${item.quantidade}" readonly>
                    <button class="btn btn-outline-secondary" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
                <span class="fw-bold me-3">R$ ${itemTotal.toFixed(2)}</span>
                <button class="btn btn-link text-danger p-0" onclick="removeItem(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(itemEl);
    });

    // Taxa de entrega fixa por enquanto (pode vir do restaurante no futuro)
    const deliveryFee = 5.00;

    subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
    deliveryFeeEl.textContent = `R$ ${deliveryFee.toFixed(2)}`;
    totalEl.textContent = `R$ ${(subtotal + deliveryFee).toFixed(2)}`;
}

function updateQuantity(index, change) {
    let cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];
    if (cart[index]) {
        cart[index].quantidade += change;
        if (cart[index].quantidade <= 0) {
            cart.splice(index, 1);
        }
    }
    localStorage.setItem('ivegan_cart', JSON.stringify(cart));
    loadCart();
    updateCartCounter();
    window.dispatchEvent(new Event('cartUpdated'));
}

function removeItem(index) {
    let cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('ivegan_cart', JSON.stringify(cart));
    loadCart();
    updateCartCounter();
    window.dispatchEvent(new Event('cartUpdated'));
}

function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];
    const count = cart.reduce((acc, item) => acc + item.quantidade, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
}

async function checkout() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Você precisa estar logado para finalizar o pedido.');
        window.location.href = 'login.html';
        return;
    }

    const cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];
    if (cart.length === 0) {
        alert('Seu carrinho está vazio.');
        return;
    }

    const address = document.getElementById('delivery-address').value;
    if (!address) {
        alert('Por favor, informe o endereço de entrega.');
        return;
    }

    const paymentMethod = document.getElementById('payment-method').value;
    const deliveryFee = 5.00;
    const subtotal = cart.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    const total = subtotal + deliveryFee;

    // Preparar dados para o backend
    // Assumindo que todos os itens são do mesmo restaurante (validação feita no add to cart)
    const restauranteId = cart[0].restaurante_id;

    const payload = {
        restaurante_id: restauranteId,
        endereco_entrega: address,
        metodo_pagamento: paymentMethod,
        itens: cart.map(item => ({
            prato_id: item.id,
            quantidade: item.quantidade,
            preco: item.preco
        })),
        total: total
    };

    try {
        const response = await fetch('/api/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao criar pedido');
        }

        const data = await response.json();
        alert(`Pedido realizado com sucesso! ID: ${data.pedido_id}`);

        // Limpar carrinho
        localStorage.removeItem('ivegan_cart');
        loadCart();
        updateCartCounter();

        // Redirecionar para página de pedidos (se existir) ou home
        window.location.href = 'pedidos.html';

    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao finalizar pedido: ' + error.message);
    }
}
