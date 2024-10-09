document.addEventListener('DOMContentLoaded', function() {
    const produtosList = document.getElementById('produtos-list');
    const paginationContainer = document.getElementById('pagination-container');
    const logoutButton = document.getElementById('logout-button');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const modalElement = document.getElementById('editModal'); 
    const modalCloseButton = document.getElementById('modal-close');
    const saveChangesButton = document.getElementById('modal-save-button');
    
    const modal = new bootstrap.Modal(modalElement);

    let currentSearchTerm = ''; 
    let currentProductId = null; 

    function fetchProdutos(page = 1, searchTerm = '') {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        fetch(`/api/produtos?page=${page}&limit=20&search=${encodeURIComponent(searchTerm)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.products) {
                produtosList.innerHTML = ''; 
                
                const table = document.createElement('table');
                table.classList.add('table', 'table-striped');

                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th>Descrição</th>
                        <th>Estoque</th>
                        <th>Ações</th>
                    </tr>
                `;
                table.appendChild(thead);

                const tbody = document.createElement('tbody');

                data.products.forEach(produto => {
                    const row = document.createElement('tr');

                    const descricaoCell = document.createElement('td');
                    descricaoCell.textContent = produto.DESCRICAO;
                    row.appendChild(descricaoCell);

                    const estoqueCell = document.createElement('td');
                    estoqueCell.textContent = produto.QUANTIDADE;
                    row.appendChild(estoqueCell);

                    const actionsCell = document.createElement('td');
                    const editButton = document.createElement('button');
                    editButton.className = 'btn btn-primary';
                    editButton.textContent = 'Editar';
                    editButton.setAttribute('data-id', produto.ID);
                    editButton.addEventListener('click', () => {
                        currentProductId = produto.ID; 
                        openEditModal(produto); 
                    });
                    actionsCell.appendChild(editButton);
                    row.appendChild(actionsCell);
                    tbody.appendChild(row);
                });

                table.appendChild(tbody);
                produtosList.appendChild(table);

                updatePagination(data.currentPage, data.pageCount, data.hasNext);
            } else {
                console.error('Dados de produtos não encontrados.');
            }
        })
        .catch(error => {
            console.error('Erro ao buscar produtos:', error);
        });
    }

    function updatePagination(currentPage, pageCount, hasNext) {
        paginationContainer.innerHTML = ''; 

        if (pageCount <= 1) return; 

        const maxButtons = 5; 
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
                pageButton.disabled = true; 
                pageButton.classList.add('active');
            }

            pageButton.addEventListener('click', () => {
                fetchProdutos(i, currentSearchTerm); 
            });

            paginationContainer.appendChild(pageButton); 
        }

        if (hasNext) {
            const nextButton = document.createElement('button');
            nextButton.textContent = '>>';
            nextButton.className = 'pagination-button';
            nextButton.addEventListener('click', () => {
                fetchProdutos(currentPage + 1, currentSearchTerm);
            });
            paginationContainer.appendChild(nextButton);
        }
    }

    function openEditModal(produto) {
        document.getElementById('modal-codigo-barras').value = produto.CODIGOBARRAS;
        document.getElementById('modal-descricao').value = produto.DESCRICAO;
        document.getElementById('modal-preco').value = produto.VENDA;
        document.getElementById('modal-estoque').value = produto.QUANTIDADE;
        modal.show(); 
    }

    function saveChanges() {
        const codigoBarras = document.getElementById('modal-codigo-barras').value.trim();
        const descricao = document.getElementById('modal-descricao').value.trim();
        const preco = parseFloat(document.getElementById('modal-preco').value.trim());
        const quantidade = parseInt(document.getElementById('modal-estoque').value.trim());
    
        if (!codigoBarras || !descricao || isNaN(preco) || isNaN(quantidade)) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }
    
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
            body: JSON.stringify([{ id: currentProductId, codigoBarras, descricao, preco, quantidade }])
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Produto atualizado com sucesso!');
                modal.hide(); 
                fetchProdutos(); 
            } else {
                alert('Erro ao atualizar o produto!');
            }
        })
        .catch(error => {
            console.error('Erro ao atualizar o produto:', error);
        });
    }

    modalCloseButton.addEventListener('click', () => {
        modal.hide(); 
    });

    saveChangesButton.addEventListener('click', saveChanges);

    function logout() {
        localStorage.removeItem('token');
        window.location.href = '/';
    }

    logoutButton.addEventListener('click', logout);

    if (searchButton) {
        searchButton.addEventListener('click', function() {
            currentSearchTerm = searchInput.value.trim();
            fetchProdutos(1, currentSearchTerm);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                currentSearchTerm = searchInput.value.trim();
                fetchProdutos(1, currentSearchTerm);
            }
        });
    }
    
    fetchProdutos(); 
});
