document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                senha
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Salvar token no localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            messageDiv.className = 'message success';
            messageDiv.textContent = 'Login realizado com sucesso!';

            // Redirecionar para página principal
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            messageDiv.className = 'message error';
            messageDiv.textContent = data.error;
        }
    } catch (error) {
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Erro de conexão';
    }
});

// Verificar se usuário já está logado
if (localStorage.getItem('token')) {
    window.location.href = 'index.html';
}