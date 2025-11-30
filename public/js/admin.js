// Funções auxiliares (fora da classe)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

class AdminManager {
    constructor() {
        this.currentUser = null;
        this.init();
        this.pedidoItens = [];
        this.pratosCarregados = null;
    }

    async init() {
        await this.checkAuth();
        this.bindEvents();
        await this.loadDashboard();
        await this.loadAllData();
    }

    async checkAuth() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (!token || !user) {
            window.location.href = 'login.html';
            return;
        }

        this.currentUser = JSON.parse(user);
        const welcomeSpan = document.getElementById('adminWelcome');
        if (welcomeSpan) {
            welcomeSpan.textContent = `Olá, ${this.currentUser.nome}`;
        }
    }

    bindEvents() {
        // Tabs do menu
        document.querySelectorAll('.admin-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(link.dataset.tab);
            });
        });

        // Botões de novo item
        document.getElementById('novoUsuarioBtn')?.addEventListener('click', () => this.openUserModal());
        document.getElementById('novoRestauranteBtn')?.addEventListener('click', () => this.openRestaurantModal());
        document.getElementById('novoPratoBtn')?.addEventListener('click', () => this.openPratoModal());
        document.getElementById('novoEntregadorBtn')?.addEventListener('click', () => this.openEntregadorModal());
        document.getElementById('novaCategoriaBtn')?.addEventListener('click', () => this.openCategoriaModal());
        document.getElementById('novoPedidoBtn')?.addEventListener('click', () => this.openNovoPedidoModal());

        const novoPedidoForm = document.getElementById('novoPedidoForm');
        if (novoPedidoForm) {
            novoPedidoForm.addEventListener('submit', (e) => this.handleNovoPedidoSubmit(e));
        }

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());

        // Fechar modais
        document.querySelectorAll('.close, .btn-secondary[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                this.closeModal(modalId);
            });
        });

        // Fechar modal ao clicar fora
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // Forms
        document.getElementById('userForm')?.addEventListener('submit', (e) => this.handleUserSubmit(e));
        document.getElementById('restaurantForm')?.addEventListener('submit', (e) => this.handleRestaurantSubmit(e));
        document.getElementById('pratoForm')?.addEventListener('submit', (e) => this.handlePratoSubmit(e));
        document.getElementById('entregadorForm')?.addEventListener('submit', (e) => this.handleEntregadorSubmit(e));
        document.getElementById('categoriaForm')?.addEventListener('submit', (e) => this.handleCategoriaSubmit(e));
        document.getElementById('pedidoStatusForm')?.addEventListener('submit', (e) => this.handlePedidoStatusSubmit(e));
    }

    // ===== TOAST NOTIFICATIONS =====
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = '';
        switch (type) {
            case 'success': icon = '✓'; break;
            case 'error': icon = '✕'; break;
            case 'warning': icon = '⚠'; break;
            default: icon = 'ℹ';
        }

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Trigger reflow
        toast.offsetHeight;

        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ===== API HELPERS =====
    async fetchData(url) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.logout();
                    return;
                }
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erro na requisição para ${url}:`, error);
            this.showToast('Erro ao carregar dados. Tente novamente.', 'error');
            throw error;
        }
    }

    async updateData(url, data, method = 'POST') {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Erro na atualização para ${url}:`, error);
            this.showToast(error.message || 'Erro ao salvar dados.', 'error');
            throw error;
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    switchTab(tabName) {
        // Atualizar menu
        document.querySelectorAll('.admin-menu a').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Mostrar tab
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.getElementById(tabName);
        if (activeTab) activeTab.classList.add('active');

        // Carregar dados específicos se necessário
        if (tabName !== 'dashboard') {
            this.loadTabData(tabName);
        }
    }

    async loadDashboard() {
        try {
            const stats = await this.fetchData('/api/admin/stats');

            const totalUsuarios = document.getElementById('totalUsuarios');
            const totalRestaurantes = document.getElementById('totalRestaurantes');
            const pedidosHoje = document.getElementById('pedidosHoje');
            const totalEntregadores = document.getElementById('totalEntregadores');

            if (totalUsuarios) totalUsuarios.textContent = stats.totalUsuarios || 0;
            if (totalRestaurantes) totalRestaurantes.textContent = stats.totalRestaurantes || 0;
            if (pedidosHoje) pedidosHoje.textContent = stats.pedidosHoje || 0;
            if (totalEntregadores) totalEntregadores.textContent = stats.totalEntregadores || 0;

        } catch (error) {
            // Erro já tratado no fetchData
        }
    }

    async loadAllData() {
        await Promise.all([
            this.loadUsuarios().catch(() => { }),
            this.loadRestaurantes().catch(() => { }),
            this.loadPratos().catch(() => { }),
            this.loadPedidos().catch(() => { }),
            this.loadEntregadores().catch(() => { }),
            this.loadCategorias().catch(() => { })
        ]);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'usuarios':
                await this.loadUsuarios();
                break;
            case 'restaurantes':
                await this.loadRestaurantes();
                break;
            case 'pratos':
                await this.loadPratos();
                await this.loadRestaurantesForSelect();
                await this.loadCategoriasForSelect();
                break;
            case 'pedidos':
                await this.loadPedidos();
                break;
            case 'entregadores':
                await this.loadEntregadores();
                break;
            case 'categorias':
                await this.loadCategorias();
                break;
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // ===== USUÁRIOS =====
    async loadUsuarios() {
        const tbody = document.getElementById('usuariosTable');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Carregando usuários...</td></tr>';

        try {
            const usuarios = await this.fetchData('/api/admin/usuarios');

            if (!usuarios || usuarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum usuário encontrado</td></tr>';
                return;
            }

            tbody.innerHTML = usuarios.map(usuario => `
                <tr>
                    <td>${usuario.id}</td>
                    <td>${escapeHtml(usuario.nome)}</td>
                    <td>${escapeHtml(usuario.email)}</td>
                    <td>${usuario.telefone || '-'}</td>
                    <td>${formatDate(usuario.data_criacao)}</td>
                    <td class="action-buttons">
                        <button class="btn-edit" data-user-id="${usuario.id}">Editar</button>
                        <button class="btn-delete" data-user-id="${usuario.id}">Excluir</button>
                    </td>
                </tr>
            `).join('');

            // Adicionar event listeners aos botões
            tbody.querySelectorAll('.btn-edit[data-user-id]').forEach(btn => {
                btn.addEventListener('click', () => this.editUser(btn.dataset.userId));
            });

            tbody.querySelectorAll('.btn-delete[data-user-id]').forEach(btn => {
                btn.addEventListener('click', () => this.deleteUser(btn.dataset.userId));
            });

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Erro ao carregar usuários</td></tr>';
        }
    }

    openUserModal(userId = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');

        if (!modal || !title || !form) return;

        if (userId) {
            title.textContent = 'Editar Usuário';
            this.loadUserData(userId);
        } else {
            title.textContent = 'Novo Usuário';
            form.reset();
            const userIdField = document.getElementById('userId');
            if (userIdField) userIdField.value = '';
        }

        modal.classList.add('active');
    }

    async loadUserData(userId) {
        try {
            const usuario = await this.fetchData(`/api/admin/usuarios/${userId}`);

            const userIdField = document.getElementById('userId');
            const userNome = document.getElementById('userNome');
            const userEmail = document.getElementById('userEmail');
            const userTelefone = document.getElementById('userTelefone');
            const userEndereco = document.getElementById('userEndereco');

            if (userIdField) userIdField.value = usuario.id;
            if (userNome) userNome.value = usuario.nome;
            if (userEmail) userEmail.value = usuario.email;
            if (userTelefone) userTelefone.value = usuario.telefone || '';
            if (userEndereco) userEndereco.value = usuario.endereco || '';

        } catch (error) {
            this.showToast('Erro ao carregar dados do usuário', 'error');
        }
    }

    async handleUserSubmit(e) {
        e.preventDefault();

        const formData = {
            nome: document.getElementById('userNome')?.value || '',
            email: document.getElementById('userEmail')?.value || '',
            telefone: document.getElementById('userTelefone')?.value || null,
            endereco: document.getElementById('userEndereco')?.value || null
        };

        const userId = document.getElementById('userId')?.value;
        const senha = document.getElementById('userSenha')?.value;

        if (senha) {
            formData.senha = senha;
        }

        try {
            if (userId) {
                await this.updateData(`/api/admin/usuarios/${userId}`, formData, 'PUT');
                this.showToast('Usuário atualizado com sucesso!', 'success');
            } else {
                await this.updateData('/api/admin/usuarios', formData, 'POST');
                this.showToast('Usuário criado com sucesso!', 'success');
            }

            this.closeModal('userModal');
            await this.loadUsuarios();
            await this.loadDashboard();

        } catch (error) {
            // Erro já tratado no updateData
        }
    }

    async editUser(userId) {
        this.openUserModal(userId);
    }

    async deleteUser(userId) {
        if (!confirm('Tem certeza que deseja excluir este usuário?')) {
            return;
        }

        try {
            await this.updateData(`/api/admin/usuarios/${userId}`, {}, 'DELETE');
            this.showToast('Usuário excluído com sucesso!', 'success');
            await this.loadUsuarios();
            await this.loadDashboard();
        } catch (error) {
            // Erro já tratado
        }
    }

    // ===== RESTAURANTES =====
    async loadRestaurantes() {
        const tbody = document.getElementById('restaurantesTable');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Carregando restaurantes...</td></tr>';

        try {
            const restaurantes = await this.fetchData('/api/admin/restaurantes');

            if (!restaurantes || restaurantes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum restaurante encontrado</td></tr>';
                return;
            }

            tbody.innerHTML = restaurantes.map(rest => `
                <tr>
                    <td>${rest.id}</td>
                    <td>${escapeHtml(rest.nome_publico)}</td>
                    <td>${escapeHtml(rest.cnpj)}</td>
                    <td>${rest.categoria}</td>
                    <td>${rest.avaliacao_media || 'N/A'}</td>
                    <td class="action-buttons">
                        <button class="btn-edit" data-restaurant-id="${rest.id}">Editar</button>
                        <button class="btn-delete" data-restaurant-id="${rest.id}">Excluir</button>
                    </td>
                </tr>
            `).join('');

            // Adicionar event listeners
            tbody.querySelectorAll('.btn-edit[data-restaurant-id]').forEach(btn => {
                btn.addEventListener('click', () => this.editRestaurant(btn.dataset.restaurantId));
            });

            tbody.querySelectorAll('.btn-delete[data-restaurant-id]').forEach(btn => {
                btn.addEventListener('click', () => this.deleteRestaurant(btn.dataset.restaurantId));
            });

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Erro ao carregar restaurantes</td></tr>';
        }
    }

    openRestaurantModal(restaurantId = null) {
        const modal = document.getElementById('restaurantModal');
        const title = document.getElementById('restaurantModalTitle');
        const form = document.getElementById('restaurantForm');

        if (!modal || !title || !form) return;

        if (restaurantId) {
            title.textContent = 'Editar Restaurante';
            this.loadRestaurantData(restaurantId);
        } else {
            title.textContent = 'Novo Restaurante';
            form.reset();
            const restaurantIdField = document.getElementById('restaurantId');
            if (restaurantIdField) restaurantIdField.value = '';
        }

        modal.classList.add('active');
    }

    async loadRestaurantData(restaurantId) {
        try {
            const restaurant = await this.fetchData(`/api/admin/restaurantes/${restaurantId}`);

            const restaurantIdField = document.getElementById('restaurantId');
            const restaurantNomePublico = document.getElementById('restaurantNomePublico');
            const restaurantNomeLegal = document.getElementById('restaurantNomeLegal');
            const restaurantCnpj = document.getElementById('restaurantCnpj');
            const restaurantTelefone = document.getElementById('restaurantTelefone');
            const restaurantEndereco = document.getElementById('restaurantEndereco');
            const restaurantCategoria = document.getElementById('restaurantCategoria');

            if (restaurantIdField) restaurantIdField.value = restaurant.id;
            if (restaurantNomePublico) restaurantNomePublico.value = restaurant.nome_publico;
            if (restaurantNomeLegal) restaurantNomeLegal.value = restaurant.nome_legal;
            if (restaurantCnpj) restaurantCnpj.value = restaurant.cnpj;
            if (restaurantTelefone) restaurantTelefone.value = restaurant.telefone || '';
            if (restaurantEndereco) restaurantEndereco.value = restaurant.endereco || '';
            if (restaurantCategoria) restaurantCategoria.value = restaurant.categoria || 'restaurante';

        } catch (error) {
            this.showToast('Erro ao carregar dados do restaurante', 'error');
        }
    }

    async handleRestaurantSubmit(e) {
        e.preventDefault();

        const formData = {
            nome_publico: document.getElementById('restaurantNomePublico')?.value || '',
            nome_legal: document.getElementById('restaurantNomeLegal')?.value || '',
            cnpj: document.getElementById('restaurantCnpj')?.value || '',
            telefone: document.getElementById('restaurantTelefone')?.value || null,
            endereco: document.getElementById('restaurantEndereco')?.value || null,
            categoria: document.getElementById('restaurantCategoria')?.value || 'restaurante'
        };

        const restaurantId = document.getElementById('restaurantId')?.value;

        try {
            if (restaurantId) {
                await this.updateData(`/api/admin/restaurantes/${restaurantId}`, formData, 'PUT');
                this.showToast('Restaurante atualizado com sucesso!', 'success');
            } else {
                await this.updateData('/api/admin/restaurantes', formData, 'POST');
                this.showToast('Restaurante criado com sucesso!', 'success');
            }

            this.closeModal('restaurantModal');
            await this.loadRestaurantes();
            await this.loadDashboard();

        } catch (error) {
            // Erro já tratado
        }
    }

    async editRestaurant(restaurantId) {
        this.openRestaurantModal(restaurantId);
    }

    async deleteRestaurant(restaurantId) {
        if (!confirm('Tem certeza que deseja excluir este restaurante?')) {
            return;
        }

        try {
            await this.updateData(`/api/admin/restaurantes/${restaurantId}`, {}, 'DELETE');
            this.showToast('Restaurante excluído com sucesso!', 'success');
            await this.loadRestaurantes();
            await this.loadDashboard();
        } catch (error) {
            // Erro já tratado
        }
    }

    // ===== PRATOS =====
    async loadPratos() {
        const tbody = document.getElementById('pratosTable');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Carregando pratos...</td></tr>';

        try {
            const pratos = await this.fetchData('/api/admin/pratos');

            if (!pratos || pratos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum prato encontrado</td></tr>';
                return;
            }

            tbody.innerHTML = pratos.map(prato => `
                <tr>
                    <td>${prato.id}</td>
                    <td>${escapeHtml(prato.nome)}</td>
                    <td>${prato.restaurante_nome}</td>
                    <td>R$ ${parseFloat(prato.preco).toFixed(2)}</td>
                    <td><span class="status-badge ${prato.tipo === 'vegano' ? 'status-active' : 'status-pending'}">${prato.tipo}</span></td>
                    <td class="action-buttons">
                        <button class="btn-edit" data-prato-id="${prato.id}">Editar</button>
                        <button class="btn-delete" data-prato-id="${prato.id}">Excluir</button>
                    </td>
                </tr>
            `).join('');

            // Adicionar event listeners
            tbody.querySelectorAll('.btn-edit[data-prato-id]').forEach(btn => {
                btn.addEventListener('click', () => this.editPrato(btn.dataset.pratoId));
            });

            tbody.querySelectorAll('.btn-delete[data-prato-id]').forEach(btn => {
                btn.addEventListener('click', () => this.deletePrato(btn.dataset.pratoId));
            });

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Erro ao carregar pratos</td></tr>';
        }
    }

    async loadRestaurantesForSelect() {
        const select = document.getElementById('pratoRestauranteId');
        if (!select) return;

        try {
            const restaurantes = await this.fetchData('/api/admin/restaurantes');
            select.innerHTML = '<option value="">Selecione um restaurante</option>' +
                restaurantes.map(rest =>
                    `<option value="${rest.id}">${escapeHtml(rest.nome_publico)}</option>`
                ).join('');
        } catch (error) {
            // Erro silencioso
        }
    }

    async loadCategoriasForSelect() {
        const select = document.getElementById('pratoCategoriaId');
        if (!select) return;

        try {
            const categorias = await this.fetchData('/api/admin/categorias');
            select.innerHTML = '<option value="">Sem categoria</option>' +
                categorias.map(cat =>
                    `<option value="${cat.id}">${escapeHtml(cat.nome)}</option>`
                ).join('');
        } catch (error) {
            // Erro silencioso
        }
    }

    openPratoModal(pratoId = null) {
        const modal = document.getElementById('pratoModal');
        const title = document.getElementById('pratoModalTitle');
        const form = document.getElementById('pratoForm');

        if (!modal || !title || !form) return;

        if (pratoId) {
            title.textContent = 'Editar Prato';
            this.loadPratoData(pratoId);
        } else {
            title.textContent = 'Novo Prato';
            form.reset();
            const pratoIdField = document.getElementById('pratoId');
            if (pratoIdField) pratoIdField.value = '';
        }

        modal.classList.add('active');
    }

    async loadPratoData(pratoId) {
        try {
            const prato = await this.fetchData(`/api/admin/pratos/${pratoId}`);

            const pratoIdField = document.getElementById('pratoId');
            const pratoRestauranteId = document.getElementById('pratoRestauranteId');
            const pratoCategoriaId = document.getElementById('pratoCategoriaId');
            const pratoNome = document.getElementById('pratoNome');
            const pratoDescricao = document.getElementById('pratoDescricao');
            const pratoPreco = document.getElementById('pratoPreco');
            const pratoTipo = document.getElementById('pratoTipo');
            const pratoImagem = document.getElementById('pratoImagem');

            if (pratoIdField) pratoIdField.value = prato.id;
            if (pratoRestauranteId) pratoRestauranteId.value = prato.restaurante_id;
            if (pratoCategoriaId) pratoCategoriaId.value = prato.categoria_id || '';
            if (pratoNome) pratoNome.value = prato.nome;
            if (pratoDescricao) pratoDescricao.value = prato.descricao || '';
            if (pratoPreco) pratoPreco.value = parseFloat(prato.preco).toFixed(2);
            if (pratoTipo) pratoTipo.value = prato.tipo;
            if (pratoImagem) pratoImagem.value = prato.url_imagem || '';

        } catch (error) {
            this.showToast('Erro ao carregar dados do prato', 'error');
        }
    }

    async handlePratoSubmit(e) {
        e.preventDefault();

        const formData = {
            restaurante_id: document.getElementById('pratoRestauranteId')?.value || '',
            categoria_id: document.getElementById('pratoCategoriaId')?.value || null,
            nome: document.getElementById('pratoNome')?.value || '',
            descricao: document.getElementById('pratoDescricao')?.value || null,
            preco: parseFloat(document.getElementById('pratoPreco')?.value || 0),
            tipo: document.getElementById('pratoTipo')?.value || '',
            url_imagem: document.getElementById('pratoImagem')?.value || null
        };

        const pratoId = document.getElementById('pratoId')?.value;

        try {
            if (pratoId) {
                await this.updateData(`/api/admin/pratos/${pratoId}`, formData, 'PUT');
                this.showToast('Prato atualizado com sucesso!', 'success');
            } else {
                await this.updateData('/api/admin/pratos', formData, 'POST');
                this.showToast('Prato criado com sucesso!', 'success');
            }

            this.closeModal('pratoModal');
            await this.loadPratos();

        } catch (error) {
            // Erro já tratado
        }
    }

    async editPrato(pratoId) {
        this.openPratoModal(pratoId);
    }

    async deletePrato(pratoId) {
        if (!confirm('Tem certeza que deseja excluir este prato?')) {
            return;
        }

        try {
            await this.updateData(`/api/admin/pratos/${pratoId}`, {}, 'DELETE');
            this.showToast('Prato excluído com sucesso!', 'success');
            await this.loadPratos();
        } catch (error) {
            // Erro já tratado
        }
    }

    // ===== ENTREGADORES =====
    async loadEntregadores() {
        const tbody = document.getElementById('entregadoresTable');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Carregando entregadores...</td></tr>';

        try {
            const entregadores = await this.fetchData('/api/admin/entregadores');

            if (!entregadores || entregadores.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum entregador encontrado</td></tr>';
                return;
            }

            tbody.innerHTML = entregadores.map(entregador => `
                <tr>
                    <td>${entregador.id}</td>
                    <td>${escapeHtml(entregador.nome)}</td>
                    <td>${escapeHtml(entregador.cpf)}</td>
                    <td>${entregador.tipo_veiculo}</td>
                    <td><span class="status-badge ${entregador.status === 'disponivel' ? 'status-active' : 'status-inactive'}">${entregador.status}</span></td>
                    <td class="action-buttons">
                        <button class="btn-edit" data-entregador-id="${entregador.id}">Editar</button>
                        <button class="btn-delete" data-entregador-id="${entregador.id}">Excluir</button>
                    </td>
                </tr>
            `).join('');

            // Adicionar event listeners
            tbody.querySelectorAll('.btn-edit[data-entregador-id]').forEach(btn => {
                btn.addEventListener('click', () => this.editEntregador(btn.dataset.entregadorId));
            });

            tbody.querySelectorAll('.btn-delete[data-entregador-id]').forEach(btn => {
                btn.addEventListener('click', () => this.deleteEntregador(btn.dataset.entregadorId));
            });

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Erro ao carregar entregadores</td></tr>';
        }
    }

    openEntregadorModal(entregadorId = null) {
        const modal = document.getElementById('entregadorModal');
        const title = document.getElementById('entregadorModalTitle');
        const form = document.getElementById('entregadorForm');

        if (!modal || !title || !form) return;

        if (entregadorId) {
            title.textContent = 'Editar Entregador';
            this.loadEntregadorData(entregadorId);
        } else {
            title.textContent = 'Novo Entregador';
            form.reset();
            const entregadorIdField = document.getElementById('entregadorId');
            if (entregadorIdField) entregadorIdField.value = '';
        }

        modal.classList.add('active');
    }

    async loadEntregadorData(entregadorId) {
        try {
            const entregador = await this.fetchData(`/api/admin/entregadores/${entregadorId}`);

            const entregadorIdField = document.getElementById('entregadorId');
            const entregadorNome = document.getElementById('entregadorNome');
            const entregadorCpf = document.getElementById('entregadorCpf');
            const entregadorTipoVeiculo = document.getElementById('entregadorTipoVeiculo');
            const entregadorPlaca = document.getElementById('entregadorPlaca');
            const entregadorStatus = document.getElementById('entregadorStatus');

            if (entregadorIdField) entregadorIdField.value = entregador.id;
            if (entregadorNome) entregadorNome.value = entregador.nome;
            if (entregadorCpf) entregadorCpf.value = entregador.cpf;
            if (entregadorTipoVeiculo) entregadorTipoVeiculo.value = entregador.tipo_veiculo;
            if (entregadorPlaca) entregadorPlaca.value = entregador.placa || '';
            if (entregadorStatus) entregadorStatus.value = entregador.status;

        } catch (error) {
            this.showToast('Erro ao carregar dados do entregador', 'error');
        }
    }

    async handleEntregadorSubmit(e) {
        e.preventDefault();

        const formData = {
            nome: document.getElementById('entregadorNome')?.value || '',
            cpf: document.getElementById('entregadorCpf')?.value || '',
            tipo_veiculo: document.getElementById('entregadorTipoVeiculo')?.value || '',
            placa: document.getElementById('entregadorPlaca')?.value || null,
            status: document.getElementById('entregadorStatus')?.value || ''
        };

        const entregadorId = document.getElementById('entregadorId')?.value;

        try {
            if (entregadorId) {
                await this.updateData(`/api/admin/entregadores/${entregadorId}`, formData, 'PUT');
                this.showToast('Entregador atualizado com sucesso!', 'success');
            } else {
                await this.updateData('/api/admin/entregadores', formData, 'POST');
                this.showToast('Entregador criado com sucesso!', 'success');
            }

            this.closeModal('entregadorModal');
            await this.loadEntregadores();
            await this.loadDashboard();

        } catch (error) {
            // Erro já tratado
        }
    }

    async editEntregador(entregadorId) {
        this.openEntregadorModal(entregadorId);
    }

    async deleteEntregador(entregadorId) {
        if (!confirm('Tem certeza que deseja excluir este entregador?')) {
            return;
        }

        try {
            await this.updateData(`/api/admin/entregadores/${entregadorId}`, {}, 'DELETE');
            this.showToast('Entregador excluído com sucesso!', 'success');
            await this.loadEntregadores();
            await this.loadDashboard();
        } catch (error) {
            // Erro já tratado
        }
    }

    // ===== CATEGORIAS =====
    async loadCategorias() {
        const tbody = document.getElementById('categoriasTable');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Carregando categorias...</td></tr>';

        try {
            const categorias = await this.fetchData('/api/admin/categorias');

            if (!categorias || categorias.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Nenhuma categoria encontrada</td></tr>';
                return;
            }

            tbody.innerHTML = categorias.map(categoria => `
                <tr>
                    <td>${categoria.id}</td>
                    <td>${escapeHtml(categoria.nome)}</td>
                    <td>${categoria.descricao || '-'}</td>
                    <td>${formatDate(categoria.data_criacao)}</td>
                    <td class="action-buttons">
                        <button class="btn-edit" data-categoria-id="${categoria.id}">Editar</button>
                        <button class="btn-delete" data-categoria-id="${categoria.id}">Excluir</button>
                    </td>
                </tr>
            `).join('');

            // Adicionar event listeners
            tbody.querySelectorAll('.btn-edit[data-categoria-id]').forEach(btn => {
                btn.addEventListener('click', () => this.editCategoria(btn.dataset.categoriaId));
            });

            tbody.querySelectorAll('.btn-delete[data-categoria-id]').forEach(btn => {
                btn.addEventListener('click', () => this.deleteCategoria(btn.dataset.categoriaId));
            });

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Erro ao carregar categorias</td></tr>';
        }
    }

    openCategoriaModal(categoriaId = null) {
        const modal = document.getElementById('categoriaModal');
        const title = document.getElementById('categoriaModalTitle');
        const form = document.getElementById('categoriaForm');

        if (!modal || !title || !form) return;

        if (categoriaId) {
            title.textContent = 'Editar Categoria';
            this.loadCategoriaData(categoriaId);
        } else {
            title.textContent = 'Nova Categoria';
            form.reset();
            const categoriaIdField = document.getElementById('categoriaId');
            if (categoriaIdField) categoriaIdField.value = '';
        }

        modal.classList.add('active');
    }

    async loadCategoriaData(categoriaId) {
        try {
            const categoria = await this.fetchData(`/api/admin/categorias/${categoriaId}`);

            const categoriaIdField = document.getElementById('categoriaId');
            const categoriaNome = document.getElementById('categoriaNome');
            const categoriaDescricao = document.getElementById('categoriaDescricao');
            const categoriaIcone = document.getElementById('categoriaIcone');

            if (categoriaIdField) categoriaIdField.value = categoria.id;
            if (categoriaNome) categoriaNome.value = categoria.nome;
            if (categoriaDescricao) categoriaDescricao.value = categoria.descricao || '';
            if (categoriaIcone) categoriaIcone.value = categoria.icone || '';

        } catch (error) {
            this.showToast('Erro ao carregar dados da categoria', 'error');
        }
    }

    async handleCategoriaSubmit(e) {
        e.preventDefault();

        const formData = {
            nome: document.getElementById('categoriaNome')?.value || '',
            descricao: document.getElementById('categoriaDescricao')?.value || null,
            icone: document.getElementById('categoriaIcone')?.value || null
        };

        const categoriaId = document.getElementById('categoriaId')?.value;

        try {
            if (categoriaId) {
                await this.updateData(`/api/admin/categorias/${categoriaId}`, formData, 'PUT');
                this.showToast('Categoria atualizada com sucesso!', 'success');
            } else {
                await this.updateData('/api/admin/categorias', formData, 'POST');
                this.showToast('Categoria criada com sucesso!', 'success');
            }

            this.closeModal('categoriaModal');
            await this.loadCategorias();

        } catch (error) {
            // Erro já tratado
        }
    }

    async editCategoria(categoriaId) {
        this.openCategoriaModal(categoriaId);
    }

    async deleteCategoria(categoriaId) {
        if (!confirm('Tem certeza que deseja excluir este categoria?')) {
            return;
        }

        try {
            await this.updateData(`/api/admin/categorias/${categoriaId}`, {}, 'DELETE');
            this.showToast('Categoria excluída com sucesso!', 'success');
            await this.loadCategorias();
        } catch (error) {
            // Erro já tratado
        }
    }

    // ===== PEDIDOS =====
    async loadPedidos() {
        const tbody = document.getElementById('pedidosTable');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="loading-row">Carregando pedidos...</td></tr>';

        try {
            const pedidos = await this.fetchData('/api/admin/pedidos');

            if (!pedidos || pedidos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Nenhum pedido encontrado</td></tr>';
                return;
            }

            tbody.innerHTML = pedidos.map(pedido => `
                <tr>
                    <td>${pedido.id}</td>
                    <td>${escapeHtml(pedido.usuario_nome)}</td>
                    <td>${escapeHtml(pedido.restaurante_nome)}</td>
                    <td><span class="status-badge ${this.getStatusClass(pedido.status)}">${pedido.status}</span></td>
                    <td>${formatDateTime(pedido.data_pedido)}</td>
                    <td>R$ ${parseFloat(pedido.total).toFixed(2)}</td>
                    <td class="action-buttons">
                        <button class="btn-edit" data-pedido-id="${pedido.id}">Detalhes</button>
                        <button class="btn-edit" data-status-id="${pedido.id}">Status</button>
                    </td>
                </tr>
            `).join('');

            // Adicionar event listeners
            tbody.querySelectorAll('.btn-edit[data-pedido-id]').forEach(btn => {
                btn.addEventListener('click', () => this.openPedidoModal(btn.dataset.pedidoId));
            });

            tbody.querySelectorAll('.btn-edit[data-status-id]').forEach(btn => {
                btn.addEventListener('click', () => this.openPedidoStatusModal(btn.dataset.statusId));
            });

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-row">Erro ao carregar pedidos</td></tr>';
        }
    }

    getStatusClass(status) {
        switch (status) {
            case 'entregue':
            case 'pago':
                return 'status-completed';
            case 'em preparação':
            case 'saiu para entrega':
                return 'status-active';
            case 'cancelado':
                return 'status-inactive';
            default:
                return 'status-pending';
        }
    }

    async openPedidoModal(pedidoId) {
        const modal = document.getElementById('pedidoModal');
        if (!modal) return;

        try {
            const pedido = await this.fetchData(`/api/admin/pedidos/${pedidoId}`);

            // Preencher dados básicos
            document.getElementById('pedidoDetailId').textContent = pedido.id;
            document.getElementById('pedidoDetailStatus').textContent = pedido.status;
            document.getElementById('pedidoDetailData').textContent = formatDateTime(pedido.data_pedido);
            document.getElementById('pedidoDetailTotal').textContent = parseFloat(pedido.total).toFixed(2);

            // Cliente
            document.getElementById('pedidoDetailCliente').textContent = pedido.usuario_nome;
            document.getElementById('pedidoDetailClienteTelefone').textContent = pedido.usuario_telefone || '-';
            document.getElementById('pedidoDetailEndereco').textContent = pedido.endereco_entrega;

            // Restaurante
            document.getElementById('pedidoDetailRestaurante').textContent = pedido.restaurante_nome;
            document.getElementById('pedidoDetailRestauranteTelefone').textContent = pedido.restaurante_telefone || '-';

            // Entregador
            document.getElementById('pedidoDetailEntregador').textContent = pedido.entregador_nome || 'Não atribuído';
            document.getElementById('pedidoDetailEntregadorStatus').textContent = pedido.entregador_status || '-';

            // Pagamento
            document.getElementById('pedidoDetailPagamentoMetodo').textContent = pedido.metodo_pagamento;
            document.getElementById('pedidoDetailPagamentoStatus').textContent = pedido.status_pagamento;
            document.getElementById('pedidoDetailPagamentoValor').textContent = parseFloat(pedido.total).toFixed(2);

            // Itens
            const itensList = document.getElementById('pedidoItensList');
            if (itensList && pedido.itens) {
                itensList.innerHTML = pedido.itens.map(item => `
                    <div class="item-pedido">
                        <div class="item-info">
                            <div class="item-nome">${item.quantidade}x ${escapeHtml(item.prato_nome)}</div>
                            <div class="item-detalhes">R$ ${parseFloat(item.preco_unitario).toFixed(2)} un.</div>
                        </div>
                        <div class="item-preco">R$ ${parseFloat(item.subtotal).toFixed(2)}</div>
                    </div>
                `).join('');
            }

            modal.classList.add('active');

        } catch (error) {
            this.showToast('Erro ao carregar detalhes do pedido', 'error');
        }
    }

    async openPedidoStatusModal(pedidoId) {
        const modal = document.getElementById('pedidoStatusModal');
        if (!modal) return;

        try {
            const pedido = await this.fetchData(`/api/admin/pedidos/${pedidoId}`);

            document.getElementById('pedidoStatusId').value = pedido.id;
            document.getElementById('pedidoStatusSelect').value = pedido.status;

            // Carregar entregadores disponíveis
            const entregadores = await this.fetchData('/api/admin/entregadores');
            const selectEntregador = document.getElementById('pedidoEntregadorSelect');

            selectEntregador.innerHTML = '<option value="">Selecionar entregador</option>' +
                entregadores.map(ent => `
                    <option value="${ent.id}" ${pedido.entregador_id == ent.id ? 'selected' : ''}>
                        ${escapeHtml(ent.nome)} (${ent.status})
                    </option>
                `).join('');

            modal.classList.add('active');

        } catch (error) {
            this.showToast('Erro ao carregar dados do pedido', 'error');
        }
    }

    async handlePedidoStatusSubmit(e) {
        e.preventDefault();

        const pedidoId = document.getElementById('pedidoStatusId').value;
        const status = document.getElementById('pedidoStatusSelect').value;
        const entregadorId = document.getElementById('pedidoEntregadorSelect').value;

        const data = { status };
        if (entregadorId) {
            data.entregador_id = entregadorId;
        }

        try {
            await this.updateData(`/api/admin/pedidos/${pedidoId}/status`, data, 'PUT');
            this.showToast('Status do pedido atualizado!', 'success');
            this.closeModal('pedidoStatusModal');
            await this.loadPedidos();
            await this.loadDashboard();
        } catch (error) {
            // Erro já tratado
        }
    }

    // ===== NOVO PEDIDO =====
    async openNovoPedidoModal() {
        const modal = document.getElementById('novoPedidoModal');
        if (!modal) return;

        // Resetar form e estado
        document.getElementById('novoPedidoForm').reset();
        this.pedidoItens = [];
        this.updateItensList();

        // Carregar dados iniciais
        await Promise.all([
            this.loadClientesForSelect(),
            this.loadRestaurantesForPedido(),
            this.loadEntregadoresForPedido()
        ]);

        // Listener para mudança de restaurante
        const restauranteSelect = document.getElementById('novoPedidoRestaurante');
        restauranteSelect.onchange = () => this.loadPratosForPedido(restauranteSelect.value);

        modal.classList.add('active');
    }

    async loadClientesForSelect() {
        const select = document.getElementById('novoPedidoUsuario');
        try {
            const usuarios = await this.fetchData('/api/admin/usuarios');
            select.innerHTML = '<option value="">Selecione um cliente</option>' +
                usuarios.map(u => `<option value="${u.id}">${escapeHtml(u.nome)} (${u.email})</option>`).join('');
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    async loadRestaurantesForPedido() {
        const select = document.getElementById('novoPedidoRestaurante');
        try {
            const restaurantes = await this.fetchData('/api/admin/restaurantes');
            select.innerHTML = '<option value="">Selecione um restaurante</option>' +
                restaurantes.map(r => `<option value="${r.id}">${escapeHtml(r.nome_publico)}</option>`).join('');
        } catch (error) {
            console.error('Erro ao carregar restaurantes:', error);
        }
    }

    async loadEntregadoresForPedido() {
        const select = document.getElementById('novoPedidoEntregador');
        try {
            const entregadores = await this.fetchData('/api/admin/entregadores');
            select.innerHTML = '<option value="">Selecione um entregador</option>' +
                entregadores
                    .filter(e => e.status === 'disponivel')
                    .map(e => `<option value="${e.id}">${escapeHtml(e.nome)}</option>`).join('');
        } catch (error) {
            console.error('Erro ao carregar entregadores:', error);
        }
    }

    async loadPratosForPedido(restauranteId) {
        const container = document.getElementById('pratosDisponiveis');
        if (!restauranteId) {
            container.innerHTML = '<div class="empty-message">Selecione um restaurante para ver os pratos</div>';
            return;
        }

        container.innerHTML = '<div class="pratos-loading">Carregando pratos...</div>';

        try {
            // Usando a rota pública de pratos do restaurante
            const response = await fetch(`/api/restaurantes/${restauranteId}/pratos`);
            if (!response.ok) throw new Error('Erro ao carregar pratos');

            const pratos = await response.json();

            if (pratos.length === 0) {
                container.innerHTML = '<div class="empty-message">Nenhum prato disponível neste restaurante</div>';
                return;
            }

            this.pratosCarregados = pratos;
            this.renderPratosGrid(pratos);

        } catch (error) {
            console.error('Erro:', error);
            container.innerHTML = '<div class="empty-message">Erro ao carregar pratos</div>';
        }
    }

    renderPratosGrid(pratos) {
        const container = document.getElementById('pratosDisponiveis');

        container.innerHTML = `
            <div class="pratos-grid">
                ${pratos.map(prato => `
                    <div class="prato-card" onclick="adminManager.addItemPedido(${prato.id})">
                        <div class="prato-info">
                            <h5>${escapeHtml(prato.nome)}</h5>
                            <div class="prato-descricao">${escapeHtml(prato.descricao || '')}</div>
                            <div class="prato-preco">R$ ${parseFloat(prato.preco).toFixed(2)}</div>
                        </div>
                        <button type="button" class="btn-primary btn-sm">Adicionar</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    addItemPedido(pratoId) {
        const prato = this.pratosCarregados.find(p => p.id === pratoId);
        if (!prato) return;

        const itemExistente = this.pedidoItens.find(i => i.prato_id === pratoId);

        if (itemExistente) {
            itemExistente.quantidade++;
        } else {
            this.pedidoItens.push({
                prato_id: prato.id,
                nome: prato.nome,
                preco: parseFloat(prato.preco),
                quantidade: 1
            });
        }

        this.updateItensList();
        this.showToast('Item adicionado!', 'success');
    }

    removeItemPedido(index) {
        this.pedidoItens.splice(index, 1);
        this.updateItensList();
    }

    updateItensList() {
        const container = document.getElementById('listaItensPedido');
        const totalEl = document.getElementById('totalPedido');

        if (this.pedidoItens.length === 0) {
            container.innerHTML = '<div class="empty-message">Nenhum item adicionado</div>';
            totalEl.textContent = '0.00';
            return;
        }

        let total = 0;

        container.innerHTML = this.pedidoItens.map((item, index) => {
            const subtotal = item.preco * item.quantidade;
            total += subtotal;

            return `
                <div class="item-pedido">
                    <div class="item-info">
                        <div class="item-nome">${escapeHtml(item.nome)}</div>
                        <div class="item-detalhes">
                            ${item.quantidade}x R$ ${item.preco.toFixed(2)}
                        </div>
                    </div>
                    <div class="item-preco">R$ ${subtotal.toFixed(2)}</div>
                    <button type="button" class="remover-item" onclick="adminManager.removeItemPedido(${index})">
                        &times;
                    </button>
                </div>
            `;
        }).join('');

        totalEl.textContent = total.toFixed(2);
    }

    async handleNovoPedidoSubmit(e) {
        e.preventDefault();

        if (this.pedidoItens.length === 0) {
            this.showToast('Adicione pelo menos um item ao pedido', 'warning');
            return;
        }

        const total = this.pedidoItens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

        const formData = {
            usuario_id: document.getElementById('novoPedidoUsuario').value,
            restaurante_id: document.getElementById('novoPedidoRestaurante').value,
            endereco_entrega: document.getElementById('novoPedidoEndereco').value,
            metodo_pagamento: document.getElementById('novoPedidoMetodoPagamento').value,
            status_pagamento: document.getElementById('novoPedidoStatusPagamento').value,
            entregador_id: document.getElementById('novoPedidoEntregador').value || null,
            itens: this.pedidoItens,
            total: total
        };

        try {
            await this.updateData('/api/admin/pedidos/novo', formData, 'POST');
            this.showToast('Pedido criado com sucesso!', 'success');
            this.closeModal('novoPedidoModal');
            await this.loadPedidos();
            await this.loadDashboard();
        } catch (error) {
            // Erro já tratado
        }
    }
}

// Inicializar
const adminManager = new AdminManager();
// Expor para acesso global (necessário para os onlick no HTML gerado dinamicamente)
window.adminManager = adminManager;