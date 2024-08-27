document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const usuarioInput = document.getElementById('usuario');
    const senhaInput = document.getElementById('senha');
    const loginButton = document.getElementById('login-button');
    const errorDiv = document.getElementById('usuario-required-error');

    // Função para validar os campos de entrada
    function validateInputs() {
        const usuario = usuarioInput.value.trim();
        const senha = senhaInput.value.trim();
        
        // Habilita o botão de login somente se ambos os campos estiverem preenchidos
        loginButton.disabled = !(usuario && senha);
    }

    // Função para verificar se o usuário já está logado
    function checkLoggedIn() {
        const token = localStorage.getItem('token');
        if (token) {
            fetch('/api/produtos', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` // Adiciona 'Bearer' para o token
                }
            })
            .then(response => {
                if (response.ok) {
                    window.location.href = "produtos.html";
                } else {
                    localStorage.removeItem('token'); // Remove o token se a resposta não for ok
                }
            })
            .catch(error => {
                console.error('Erro ao verificar o token:', error);
                localStorage.removeItem('token'); // Remove o token se houver erro
            });
        }
    }

    // Adiciona event listeners para validar os campos enquanto o usuário digita
    usuarioInput.addEventListener('input', validateInputs);
    senhaInput.addEventListener('input', validateInputs);

    // Adiciona event listener para o formulário de login
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Impede o envio do formulário padrão

        const usuario = usuarioInput.value.trim();
        const senha = senhaInput.value.trim();

        // Faz a requisição de login
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, senha })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem('token', data.token);
                window.location.href = "produtos.html";
            } else {
                errorDiv.style.display = 'block'; // Exibe mensagem de erro se o login falhar
            }
        })
        .catch(error => {
            console.error('Erro ao fazer login:', error);
        });
    });

    checkLoggedIn(); // Verifica se o usuário já está logado ao carregar a página
});
