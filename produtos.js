document.addEventListener('DOMContentLoaded', function() {
    const produtosList = document.getElementById('produtos-list');
    const paginationContainer = document.getElementById('pagination-container');
    const logoutButton = document.getElementById('logout-button');

    function fetchProdutos(page = 1) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        fetch(`/api/produtos?page=${page}&limit=20`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            produtosList.innerHTML = ''; // Limpa a lista existente

            data.products.forEach(produto => {
                const card = document.createElement('div');
                card.className = 'produto-card';

                // Código de Barras
                const codigoBarrasField = document.createElement('div');
                codigoBarrasField.className = 'produto-field';
                codigoBarrasField.innerHTML = `
                    <label for="codigo-barras-${produto.ID}">Código de Barras:</label>
                    <input type="text" id="codigo-barras-${produto.ID}" class="codigo-barras" value="${produto.CODIGOBARRAS}" readonly>
                `;
                card.appendChild(codigoBarrasField);

                // Descrição
                const descricaoField = document.createElement('div');
                descricaoField.className = 'produto-field';
                descricaoField.innerHTML = `
                    <label for="descricao-${produto.ID}">Descrição:</label>
                    <input type="text" id="descricao-${produto.ID}" class="descricao" value="${produto.DESCRICAO}">
                `;
                card.appendChild(descricaoField);

                // Preço
                const precoField = document.createElement('div');
                precoField.className = 'produto-field';
                precoField.innerHTML = `
                    <label for="preco-${produto.ID}">Preço:</label>
                    <input type="number" id="preco-${produto.ID}" class="preco" step="0.01" value="${produto.VENDA}">
                `;
                card.appendChild(precoField);

                // Estoque
                const estoqueField = document.createElement('div');
                estoqueField.className = 'produto-field';
                estoqueField.innerHTML = `
                    <label for="estoque-${produto.ID}">Estoque:</label>
                    <input type="number" id="estoque-${produto.ID}" class="estoque" value="${produto.QUANTIDADE}">
                `;
                card.appendChild(estoqueField);

                // Botão Gravar
                const saveButton = document.createElement('button');
                saveButton.className = 'edit-button';
                saveButton.innerText = 'Gravar';
                saveButton.setAttribute('data-id', produto.ID);
                card.appendChild(saveButton);

                produtosList.appendChild(card);
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

    function saveChanges(id) {
        const descricao = document.getElementById(`descricao-${id}`).value.trim();
        const preco = parseFloat(document.getElementById(`preco-${id}`).value.trim());
        const estoque = parseInt(document.getElementById(`estoque-${id}`).value.trim());

        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        fetch('/api/produtos/atualizar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ id, descricao, preco, estoque })
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

    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-button')) {
            const id = event.target.getAttribute('data-id');
            saveChanges(id);
        }
    });

    logoutButton.addEventListener('click', logout);

    fetchProdutos(); // Carregar a primeira página de produtos
});
