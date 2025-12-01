document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerEntregadorForm');
    const messageDiv = document.getElementById('message');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.textContent = '';
            messageDiv.className = 'message';

            const formData = {
                nome: document.getElementById('nome').value,
                cpf: document.getElementById('cpf').value,
                tipo_veiculo: document.getElementById('tipoVeiculo').value,
                placa: document.getElementById('placa').value
            };

            try {
                const response = await fetch('/api/register/entregador', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.textContent = 'Entregador cadastrado com sucesso!';
                    messageDiv.classList.add('success');
                    form.reset();
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                } else {
                    messageDiv.textContent = data.error || 'Erro ao cadastrar entregador.';
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
