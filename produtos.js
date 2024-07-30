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
            produtosList.innerHTML = '';
            data.products.forEach(produto => {
                const li = document.createElement('li');
                li.className = 'produto-item';

                li.innerHTML = `
                    Descrição: <input type="text" value="${produto.DESCRICAO}" data-id="${produto.ID}">
                    Preço: <input type="number" step="0.01" value="${produto.VENDA}" data-id="${produto.ID}">
                    <button class="edit-button" data-id="${produto.ID}">Editar</button>
                `;
                produtosList.appendChild(li);

                // Adiciona evento de clique para o botão de editar
                li.querySelector('.edit-button').addEventListener('click', function() {
                    editProduto(produto.ID, li);
                });
            });

            updatePagination(data.page, data.totalPages);
        })
        .catch(error => {
            console.error('Erro ao buscar produtos:', error);
        });
    }

    function updatePagination(currentPage, totalPages) {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = 'pagination-button';
            if (i === currentPage) {
                pageButton.disabled = true;
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => {
                fetchProdutos(i);
            });
            paginationContainer.appendChild(pageButton);
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
  
    fetchProdutos();
});
