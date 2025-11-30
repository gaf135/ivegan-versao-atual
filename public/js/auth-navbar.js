document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Selecionar elementos da navbar desktop
    const loginBtn = document.querySelector('.auth-buttons .login');
    const registerBtn = document.querySelector('.auth-buttons .cadastre-se, .auth-buttons .cadastro');

    // Selecionar elementos da navbar mobile (se houver)
    // Nota: A implementação atual da navbar mobile pode variar, ajustando conforme necessário

    if (token) {
        // Usuário logado
        if (loginBtn) {
            loginBtn.textContent = 'Perfil';
            loginBtn.href = 'perfil.html';
        }

        if (registerBtn) {
            registerBtn.textContent = 'Sair';
            registerBtn.href = '#';
            registerBtn.classList.remove('cadastre-se', 'cadastro');
            registerBtn.classList.add('btn-logout'); // Classe para estilização se necessário

            registerBtn.addEventListener('click', function (e) {
                e.preventDefault();
                logout();
            });
        }
    } else {
        // Usuário não logado - garantir estado inicial
        if (loginBtn) {
            loginBtn.textContent = 'Login';
            loginBtn.href = 'login.html';
        }
        if (registerBtn) {
            registerBtn.textContent = 'Entrar'; // ou Cadastre-se
            registerBtn.href = 'cadastro.html';
        }
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
});
