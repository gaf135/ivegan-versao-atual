document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerRestauranteForm');
    const messageDiv = document.getElementById('message');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.textContent = '';
            messageDiv.className = 'message';

            const formData = {
                nome_publico: document.getElementById('nomePublico').value,
                nome_legal: document.getElementById('nomeLegal').value,
                cnpj: document.getElementById('cnpj').value,
                telefone: document.getElementById('telefone').value,
                categoria: document.getElementById('categoria').value,
                endereco: document.getElementById('endereco').value
            };

            try {
                const response = await fetch('/api/register/restaurante', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.textContent = 'Restaurante cadastrado com sucesso!';
                    messageDiv.classList.add('success');
                    form.reset();
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    messageDiv.textContent = data.error || 'Erro ao cadastrar restaurante.';
                    messageDiv.classList.add('error');
                }
            } catch (error) {
                console.error('Erro:', error);
                messageDiv.textContent = 'Erro de conexão. Tente novamente.';
                messageDiv.classList.add('error');
            }
        });
    }
});
