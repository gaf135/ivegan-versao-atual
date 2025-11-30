document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const ordersContainer = document.getElementById('orders-container');

    try {
        const response = await fetch('/api/pedidos', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar pedidos');
        }

        const orders = await response.json();

        if (orders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Você ainda não fez nenhum pedido</h3>
                    <p>Que tal experimentar algo delicioso hoje?</p>
                    <a href="mercado.html" class="btn-cta">Ver Cardápio</a>
                </div>
            `;
            return;
        }

        ordersContainer.innerHTML = orders.map(order => createOrderCard(order)).join('');

    } catch (error) {
        console.error(error);
        ordersContainer.innerHTML = '<p class="error">Erro ao carregar pedidos. Tente novamente.</p>';
    }
});

function createOrderCard(order) {
    const date = new Date(order.data_criacao).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const statusClass = getStatusClass(order.status);
    const total = parseFloat(order.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `
        <div class="order-card">
            <div class="order-header">
                <div class="restaurant-info">
                    <h3>${order.restaurante_nome}</h3>
                    <span class="order-date">${date}</span>
                </div>
                <span class="order-status ${statusClass}">${order.status}</span>
            </div>
            <div class="order-body">
                <p class="order-id">Pedido #${order.id}</p>
                <p class="order-address">📍 ${order.endereco_entrega}</p>
            </div>
            <div class="order-footer">
                <span class="order-total">Total: ${total}</span>
                <!-- <button class="btn-details">Ver Detalhes</button> -->
            </div>
        </div>
    `;
}

function getStatusClass(status) {
    if (!status) return 'status-default';
    const s = status.toLowerCase();
    if (s.includes('preparação') || s.includes('pendente')) return 'status-pending';
    if (s.includes('caminho') || s.includes('saiu')) return 'status-shipping';
    if (s.includes('entregue') || s.includes('concluído')) return 'status-delivered';
    if (s.includes('cancelado')) return 'status-cancelled';
    return 'status-default';
}
