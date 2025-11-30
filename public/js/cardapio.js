class CardapioApp {
    constructor() {
        this.restauranteId = new URLSearchParams(window.location.search).get('id');
        this.cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];
        this.restaurante = null;
        this.pratos = [];

        this.init();
    }

    async init() {
        if (!this.restauranteId) {
            alert('Restaurante não especificado');
            window.location.href = 'restaurante.html'; // Redirect to new listing page
            return;
        }

        await this.loadRestaurante();
        await this.loadPratos();
        this.renderCart();
        this.bindEvents();
    }

    async loadRestaurante() {
        try {
            const response = await fetch(`/api/public/restaurantes/${this.restauranteId}`);
            if (!response.ok) throw new Error('Erro ao carregar restaurante');
            this.restaurante = await response.json();
            this.renderRestauranteInfo();
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar informações do restaurante');
        }
    }

    async loadPratos() {
        try {
            const response = await fetch(`/api/public/restaurantes/${this.restauranteId}/pratos`);
            if (!response.ok) throw new Error('Erro ao carregar cardápio');
            this.pratos = await response.json();
            this.renderMenu();
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar cardápio');
        }
    }

    renderRestauranteInfo() {
        const container = document.getElementById('restaurante-info');
        if (!container) return;

        container.innerHTML = `
            <div class="restaurante-header">
                <h1>${this.restaurante.nome_publico}</h1>
                <p class="categoria">${this.restaurante.categoria} • ⭐ ${this.restaurante.avaliacao_media || 'Novo'}</p>
                <p class="endereco">${this.restaurante.endereco}</p>
            </div>
        `;
    }

    renderMenu() {
        const container = document.getElementById('menu-container');
        if (!container) return;

        // Agrupar por categoria
        const categorias = {};
        this.pratos.forEach(prato => {
            const cat = prato.categoria_nome || 'Outros';
            if (!categorias[cat]) categorias[cat] = [];
            categorias[cat].push(prato);
        });

        let html = '';
        for (const [categoria, pratos] of Object.entries(categorias)) {
            html += `
                <div class="categoria-section">
                    <h3>${categoria}</h3>
                    <div class="pratos-grid">
                        ${pratos.map(prato => this.createPratoCard(prato)).join('')}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    createPratoCard(prato) {
        return `
            <div class="prato-card">
                <div class="prato-info">
                    <h4>${prato.nome}</h4>
                    <p class="descricao">${prato.descricao || ''}</p>
                    <p class="preco">R$ ${prato.preco.toFixed(2)}</p>
                </div>
                ${prato.url_imagem ? `<img src="${prato.url_imagem}" alt="${prato.nome}">` : ''}
                <button onclick="app.addToCart(${prato.id})" class="btn-add">Adicionar</button>
            </div>
        `;
    }

    addToCart(pratoId) {
        const prato = this.pratos.find(p => p.id === pratoId);
        if (!prato) return;

        // Verificar se é do mesmo restaurante
        if (this.cart.length > 0 && this.cart[0].restaurante_id !== this.restauranteId) {
            if (!confirm('Seu carrinho contém itens de outro restaurante. Deseja limpar o carrinho e adicionar este item?')) {
                return;
            }
            this.cart = [];
        }

        const existingItem = this.cart.find(item => item.prato_id === pratoId);
        if (existingItem) {
            existingItem.quantidade++;
        } else {
            this.cart.push({
                prato_id: pratoId,
                nome: prato.nome,
                preco: prato.preco,
                quantidade: 1,
                restaurante_id: this.restauranteId
            });
        }

        this.saveCart();
        this.renderCart();
        this.showToast('Item adicionado ao carrinho!');
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.saveCart();
        this.renderCart();
    }

    updateQuantity(index, delta) {
        const item = this.cart[index];
        const newQty = item.quantidade + delta;

        if (newQty <= 0) {
            this.removeFromCart(index);
        } else {
            item.quantidade = newQty;
            this.saveCart();
            this.renderCart();
        }
    }

    saveCart() {
        localStorage.setItem('ivegan_cart', JSON.stringify(this.cart));
    }

    renderCart() {
        const container = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');
        const countEl = document.getElementById('cart-count');

        if (!container) return;

        const total = this.cart.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        const count = this.cart.reduce((acc, item) => acc + item.quantidade, 0);

        if (countEl) countEl.textContent = count;
        if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;

        if (this.cart.length === 0) {
            container.innerHTML = '<p class="empty-cart">Seu carrinho está vazio</p>';
            return;
        }

        container.innerHTML = this.cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${item.nome}</strong>
                    <span>R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
                </div>
                <div class="cart-controls">
                    <button onclick="app.updateQuantity(${index}, -1)">-</button>
                    <span>${item.quantidade}</span>
                    <button onclick="app.updateQuantity(${index}, 1)">+</button>
                </div>
            </div>
        `).join('');
    }

    async checkout() {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Você precisa estar logado para finalizar o pedido');
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }

        if (this.cart.length === 0) {
            alert('Seu carrinho está vazio');
            return;
        }

        // Modal de checkout simplificado (poderia ser mais complexo)
        const endereco = prompt('Confirme seu endereço de entrega:', 'Endereço padrão');
        if (!endereco) return;

        const metodoPagamento = prompt('Método de pagamento (pix, cartao, dinheiro):', 'pix');
        if (!metodoPagamento) return;

        const total = this.cart.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

        try {
            const response = await fetch('/api/pedidos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    restaurante_id: this.restauranteId,
                    itens: this.cart,
                    endereco_entrega: endereco,
                    metodo_pagamento: metodoPagamento,
                    total: total
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Pedido realizado com sucesso!');
                this.cart = [];
                this.saveCart();
                this.renderCart();
                window.location.href = 'pedidos.html';
            } else {
                throw new Error(data.error || 'Erro ao realizar pedido');
            }
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    bindEvents() {
        const checkoutBtn = document.getElementById('btn-checkout');
        if (checkoutBtn) {
            checkoutBtn.onclick = () => this.checkout();
        }
    }

    showToast(msg) {
        // Implementação simples de toast
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

const app = new CardapioApp();
window.app = app;
