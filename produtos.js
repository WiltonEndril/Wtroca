document.addEventListener('DOMContentLoaded', function() {
    const produtosList = document.getElementById('produtos-list');
    const paginationContainer = document.getElementById('pagination-container');
    const logoutButton = document.getElementById('logout-button');
  
    let currentPage = 1;
    const limit = 20;

    function fetchProdutos(page = 1) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }
    
        fetch(`/api/produtos?page=${page}&limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            produtosList.innerHTML = ''; // Limpar lista existente
            data.products.forEach(produto => {
                const li = document.createElement('li');
                li.className = 'produto-item';
    
                li.innerHTML = `
                    Descrição: <input type="text" value="${produto.DESCRICAO}" data-id="${produto.ID}">
                    Preço: <input type="number" step="0.01" value="${produto.VENDA}" data-id="${produto.ID}">
                    <button class="edit-button" data-id="${produto.ID}">Editar</button>
                `;
                produtosList.appendChild(li);
            });
    
            updatePagination(data.currentPage, data.pageCount, data.hasNext);
        })
        .catch(error => {
            console.error('Erro ao buscar produtos:', error);
        });
    }
    
    function updatePagination(currentPage, pageCount, hasNext) {
        paginationContainer.innerHTML = ''; // Limpa a paginação existente
    
        if (pageCount <= 1) return; // Não exibe paginação se houver apenas uma página
    
        const maxButtons = 10; // Número máximo de botões de paginação a serem exibidos
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = startPage + maxButtons - 1;
    
        if (endPage > pageCount) {
            endPage = pageCount;
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
    
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = 'pagination-button';
    
            if (i === currentPage) {
                pageButton.disabled = true; // Desabilita o botão da página atual
                pageButton.classList.add('active');
            }
    
            pageButton.addEventListener('click', () => {
                fetchProdutos(i); // Chama a função fetchProdutos com o número da página
            });
    
            paginationContainer.appendChild(pageButton); // Adiciona o botão à página
        }
    
        if (hasNext) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Próximo';
            nextButton.className = 'pagination-button';
            nextButton.addEventListener('click', () => {
                fetchProdutos(currentPage + 1);
            });
            paginationContainer.appendChild(nextButton);
        }
    }

    function editProduto(id, item) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        const descricao = item.querySelector('input[type="text"]').value.trim();
        const preco = parseFloat(item.querySelector('input[type="number"]').value.trim());

        fetch('/api/produtos/atualizar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, descricao, preco })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Produto atualizado com sucesso!');
            } else {
                alert('Erro ao atualizar o produto!');
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar o produto:', error);
        });
    }

    function logout() {
        localStorage.removeItem('token');
        window.location.href = '/';
    }
  
    logoutButton.addEventListener('click', logout);
    produtosList.addEventListener('click', (event) => {
        if (event.target.classList.contains('edit-button')) {
            const id = event.target.getAttribute('data-id');
            const item = event.target.closest('.produto-item');
            editProduto(id, item);
        }
    });

    fetchProdutos();
});
