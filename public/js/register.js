class RegisterManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupValidation();
        this.checkAuthStatus();
    }

    bindEvents() {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Validação em tempo real
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        const senha = document.getElementById('senha');
        const confirmarSenha = document.getElementById('confirmarSenha');
        const telefone = document.getElementById('telefone');

        if (senha) {
            senha.addEventListener('input', () => this.validatePasswordStrength());
        }

        if (confirmarSenha) {
            confirmarSenha.addEventListener('input', () => this.validatePasswordMatch());
        }

        if (telefone) {
            telefone.addEventListener('input', (e) => this.formatPhoneNumber(e));
        }
    }

    setupValidation() {
        // Adicionar validação customizada aos campos
        const fields = ['nome', 'email', 'senha', 'confirmarSenha', 'termos'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.addEventListener('blur', () => this.validateField(field));
            }
        });
    }

    validateField(fieldName) {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(fieldName + 'Error');
        
        if (!field) return true;

        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'nome':
                if (!field.value.trim()) {
                    errorMessage = 'Nome é obrigatório';
                    isValid = false;
                } else if (field.value.trim().length < 2) {
                    errorMessage = 'Nome deve ter pelo menos 2 caracteres';
                    isValid = false;
                }
                break;

            case 'email':
                if (!field.value) {
                    errorMessage = 'Email é obrigatório';
                    isValid = false;
                } else if (!this.isValidEmail(field.value)) {
                    errorMessage = 'Email inválido';
                    isValid = false;
                }
                break;

            case 'senha':
                if (!field.value) {
                    errorMessage = 'Senha é obrigatória';
                    isValid = false;
                } else if (field.value.length < 6) {
                    errorMessage = 'Senha deve ter pelo menos 6 caracteres';
                    isValid = false;
                }
                break;

            case 'confirmarSenha':
                const senha = document.getElementById('senha').value;
                if (!field.value) {
                    errorMessage = 'Confirme sua senha';
                    isValid = false;
                } else if (field.value !== senha) {
                    errorMessage = 'Senhas não coincidem';
                    isValid = false;
                }
                break;

            case 'termos':
                if (!field.checked) {
                    errorMessage = 'Você deve aceitar os termos';
                    isValid = false;
                }
                break;
        }

        this.showFieldError(fieldName, errorMessage);
        return isValid;
    }

    validatePasswordStrength() {
        const senha = document.getElementById('senha').value;
        const strengthElement = document.getElementById('senhaStrength') || this.createPasswordStrengthElement();

        if (!senha) {
            strengthElement.className = 'password-strength';
            return;
        }

        let strength = 'weak';
        if (senha.length >= 8) strength = 'medium';
        if (senha.length >= 10 && /[A-Z]/.test(senha) && /[0-9]/.test(senha)) strength = 'strong';

        strengthElement.className = `password-strength strength-${strength}`;
    }

    createPasswordStrengthElement() {
        const strengthElement = document.createElement('div');
        strengthElement.id = 'senhaStrength';
        strengthElement.className = 'password-strength';
        document.getElementById('senha').parentNode.appendChild(strengthElement);
        return strengthElement;
    }

    validatePasswordMatch() {
        const senha = document.getElementById('senha').value;
        const confirmarSenha = document.getElementById('confirmarSenha').value;
        const errorElement = document.getElementById('confirmarSenhaError');

        if (!confirmarSenha) return;

        if (senha !== confirmarSenha) {
            this.showFieldError('confirmarSenha', 'Senhas não coincidem');
        } else {
            this.showFieldError('confirmarSenha', '');
        }
    }

    formatPhoneNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length <= 11) {
            value = value.replace(/(\d{2})(\d)/, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showFieldError(fieldName, message) {
        const errorElement = document.getElementById(fieldName + 'Error');
        const field = document.getElementById(fieldName);
        
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        if (field) {
            if (message) {
                field.classList.add('error');
                field.classList.add('shake');
                setTimeout(() => field.classList.remove('shake'), 300);
            } else {
                field.classList.remove('error');
            }
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        // Validar todos os campos
        const fields = ['nome', 'email', 'senha', 'confirmarSenha', 'termos'];
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        if (!isValid) {
            this.showMessage('Por favor, corrija os erros no formulário', 'error');
            return;
        }

        // Coletar dados do formulário
        const formData = {
            nome: document.getElementById('nome').value.trim(),
            email: document.getElementById('email').value.trim(),
            telefone: document.getElementById('telefone').value.trim() || null,
            endereco: document.getElementById('endereco').value.trim() || null,
            senha: document.getElementById('senha').value
        };

        await this.submitRegistration(formData);
    }

    async submitRegistration(formData) {
        const submitBtn = document.getElementById('submitBtn');
        const messageDiv = document.getElementById('message');

        // Mostrar loading
        this.setButtonLoading(submitBtn, true);
        this.showMessage('', '');

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.showMessage('Conta criada com sucesso! Redirecionando...', 'success');
                
                // Salvar dados de autenticação
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirecionar para dashboard
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                this.handleRegistrationError(data.error);
            }
        } catch (error) {
            console.error('Erro:', error);
            this.showMessage('Erro de conexão. Tente novamente.', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    handleRegistrationError(error) {
        if (error.includes('Email já cadastrado')) {
            this.showFieldError('email', 'Este email já está em uso');
            this.showMessage('Email já cadastrado. Tente fazer login.', 'error');
        } else if (error.includes('obrigatórios')) {
            this.showMessage('Preencha todos os campos obrigatórios', 'error');
        } else {
            this.showMessage(error || 'Erro ao criar conta', 'error');
        }
    }

    setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.classList.add('btn-loading');
            button.innerHTML = 'Criando conta...';
        } else {
            button.disabled = false;
            button.classList.remove('btn-loading');
            button.textContent = 'Criar Conta';
        }
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.textContent === message) {
                    messageDiv.textContent = '';
                    messageDiv.className = 'message';
                }
            }, 5000);
        }
    }

    checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            window.location.href = 'index.html';
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new RegisterManager();
});