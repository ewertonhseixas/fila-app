document.addEventListener('DOMContentLoaded', () => {
    const livresQueue = document.getElementById('livres-queue');
    const ocupadosQueue = document.getElementById('ocupados-queue');
    const jobBtn = document.getElementById('job-btn');
    const livreBtn = document.getElementById('livre-btn');
    const configuracoesBtn = document.getElementById('configuracoes-btn');
    const editarBtn = document.getElementById('editar-btn');

    const configModal = document.getElementById('config-modal');
    const configLivresQueue = document.getElementById('config-livres-queue');
    const closeModalBtn = document.querySelector('.close-button');
    const overlay = document.getElementById('overlay');
    const addNomeInput = document.getElementById('add-nome-input');
    const addNomeBtn = document.getElementById('add-nome-btn');
    const atualizarFilaBtn = document.getElementById('atualizar-fila-btn');
    const cancelarBtn = document.getElementById('cancelar-btn');

    let livres = []; // Agora será populado pela API
    let ocupados = []; // Agora será populado pela API
    let nomeSelecionado = null;
    let listaSelecionada = null;
    let itemSelecionadoAnterior = null;
    let modoEdicaoAtivo = false;
    let itemArrastado = null;
    let configLivres = []; // Será populado pela API ao abrir o modal

    function buscarFilas() {
        fetch('http://100.26.4.178:3000/livres')
            .then(response => response.json())
            .then(data => {
                livres = data.map(item => item.nome);
                renderizarFilas();
            })
            .catch(error => console.error('Erro ao buscar a lista de livres:', error));

        fetch('http://100.26.4.178:3000/ocupados')
            .then(response => response.json())
            .then(data => {
                ocupados = data.map(item => item.nome);
                renderizarFilas();
            })
            .catch(error => console.error('Erro ao buscar a lista de ocupados:', error));
    }

    function renderizarFilas() {
        livresQueue.innerHTML = '';
        livres.forEach(nome => {
            const listItem = document.createElement('li');
            listItem.textContent = nome;
            listItem.addEventListener('click', () => selecionarNome(nome, 'livres', listItem));
            if (modoEdicaoAtivo) {
                listItem.draggable = true;
                listItem.addEventListener('dragstart', handleDragStart);
                listItem.addEventListener('dragover', handleDragOver);
                listItem.addEventListener('drop', handleDrop);
            } else {
                listItem.draggable = false;
                listItem.removeEventListener('dragstart', handleDragStart);
                listItem.removeEventListener('dragover', handleDragOver);
                listItem.removeEventListener('drop', handleDrop);
            }
            livresQueue.appendChild(listItem);
        });

        ocupadosQueue.innerHTML = '';
        ocupados.forEach(nome => {
            const listItem = document.createElement('li');
            listItem.textContent = nome;
            listItem.addEventListener('click', () => selecionarNome(nome, 'ocupados', listItem));
            ocupadosQueue.appendChild(listItem);
        });

        document.querySelectorAll('.selecionado').forEach(item => item.classList.remove('selecionado'));
        if (nomeSelecionado) {
            const itemSelecionado = document.querySelector(`#${listaSelecionada}-queue li:contains('${nomeSelecionado}')`);
            if (itemSelecionado) {
                itemSelecionado.classList.add('selecionado');
            }
        }

        if (modoEdicaoAtivo) {
            livresQueue.classList.add('editavel');
        } else {
            livresQueue.classList.remove('editavel');
        }
    }

    function renderizarConfigLivres() {
        configLivresQueue.innerHTML = '';
        configLivres.forEach(nome => {
            const listItem = document.createElement('li');
            listItem.textContent = nome;

            const arrowUp = document.createElement('span');
            arrowUp.classList.add('arrow-icon');
            arrowUp.innerHTML = '&#9650;';
            arrowUp.addEventListener('click', () => moverNomeConfig('up', nome));
            listItem.appendChild(arrowUp);

            const arrowDown = document.createElement('span');
            arrowDown.classList.add('arrow-icon');
            arrowDown.innerHTML = '&#9660;';
            arrowDown.addEventListener('click', () => moverNomeConfig('down', nome));
            listItem.appendChild(arrowDown);

            const deleteIcon = document.createElement('span');
            deleteIcon.classList.add('delete-icon');
            deleteIcon.innerHTML = '&times;';
            deleteIcon.addEventListener('click', () => confirmarExclusao(nome));
            listItem.appendChild(deleteIcon);

            configLivresQueue.appendChild(listItem);
        });
    }

    function confirmarExclusao(nomeParaExcluir) {
        if (confirm(`Tem certeza que deseja excluir "${nomeParaExcluir}"?`)) {
            // Aqui você precisará chamar a API para remover o nome do banco de dados
            fetch(`http://100.26.4.178:3000/livres/${nomeParaExcluir}`, { method: 'DELETE' })
                .then(response => {
                    if (response.ok) {
                        configLivres = configLivres.filter(nome => nome !== nomeParaExcluir);
                        renderizarConfigLivres();
                        buscarFilas(); // Atualiza a fila principal
                    } else {
                        console.error('Erro ao excluir o nome:', response.status);
                        alert('Erro ao excluir o nome.');
                    }
                })
                .catch(error => console.error('Erro ao excluir o nome:', error));
        }
    }

    function selecionarNome(nome, lista, item) {
        if (!modoEdicaoAtivo) {
            if (itemSelecionadoAnterior) {
                itemSelecionadoAnterior.classList.remove('selecionado');
            }
            nomeSelecionado = nome;
            listaSelecionada = lista;
            item.classList.add('selecionado');
            itemSelecionadoAnterior = item;
        }
    }

    HTMLElement.prototype.contains = function(text) {
        return this.textContent === text;
    };

    editarBtn.addEventListener('click', () => {
        modoEdicaoAtivo = !modoEdicaoAtivo;
        editarBtn.classList.toggle('ativo', modoEdicaoAtivo);
        editarBtn.textContent = modoEdicaoAtivo ? 'Salvar' : 'Editar';
        if (!modoEdicaoAtivo) {
            // Salvar a nova ordem da fila de livres
            const novaOrdem = Array.from(livresQueue.children).map(li => li.textContent);
            fetch('http://100.26.4.178:3000/livres/ordem', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ordem: novaOrdem })
            })
            .then(response => {
                if (!response.ok) {
                    console.error('Erro ao salvar a ordem:', response.status);
                    alert('Erro ao salvar a ordem.');
                }
                buscarFilas(); // Atualiza a fila após salvar
            })
            .catch(error => console.error('Erro ao salvar a ordem:', error));
        } else {
            renderizarFilas(); // Para habilitar o drag and drop
        }
    });

    function handleDragStart(event) {
        itemArrastado = event.target;
        event.dataTransfer.setData('text/plain', event.target.textContent);
        event.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(event) {
        event.preventDefault();
        const target = event.target;
        if (target.nodeName === 'LI' && target !== itemArrastado) {
            target.classList.add('drag-over');
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        const target = event.target;
        if (target.nodeName === 'LI' && target !== itemArrastado) {
            const nomeArrastado = event.dataTransfer.getData('text');
            const indiceArrastado = livres.indexOf(nomeArrastado);
            const indiceAlvo = Array.from(livresQueue.children).indexOf(target);

            if (indiceArrastado !== -1 && indiceAlvo !== -1) {
                const temp = [...livres];
                const [removido] = temp.splice(indiceArrastado, 1);
                temp.splice(indiceAlvo, 0, removido);
                livres = temp;
                renderizarFilas();
            }
        }
        document.querySelectorAll('#livres-queue li').forEach(li => li.classList.remove('drag-over'));
        itemArrastado = null;
    }

    function moverNomeConfig(direction, nome) {
        const index = configLivres.indexOf(nome);
        if (index > -1) {
            let newIndex;
            if (direction === 'up' && index > 0) {
                newIndex = index - 1;
            } else if (direction === 'down' && index < configLivres.length - 1) {
                newIndex = index + 1;
            }

            if (newIndex !== undefined) {
                const temp = [...configLivres];
                const [removido] = temp.splice(index, 1);
                temp.splice(newIndex, 0, removido);
                configLivres = temp;
                renderizarConfigLivres();
            }
        }
    }

    // Modal de Configurações
    configuracoesBtn.addEventListener('click', () => {
        fetch('http://100.26.4.178:3000/livres')
            .then(response => response.json())
            .then(data => {
                configLivres = data.map(item => item.nome);
                renderizarConfigLivres();
                configModal.style.display = 'block';
                overlay.style.display = 'block';
            })
            .catch(error => console.error('Erro ao buscar a lista de livres para configuração:', error));
    });

    closeModalBtn.addEventListener('click', () => {
        configModal.style.display = 'none';
        overlay.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === overlay) {
            configModal.style.display = 'none';
            overlay.style.display = 'none';
        }
    });

    addNomeBtn.addEventListener('click', () => {
        const novoNome = addNomeInput.value.trim();
        if (novoNome) {
            fetch('http://100.26.4.178:3000/livres', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome: novoNome })
            })
            .then(response => {
                if (response.ok) {
                    configLivres.push(novoNome);
                    renderizarConfigLivres();
                    addNomeInput.value = '';
                    buscarFilas(); // Atualiza a fila principal
                } else {
                    console.error('Erro ao adicionar nome:', response.status);
                    alert('Erro ao adicionar nome.');
                }
            })
            .catch(error => console.error('Erro ao adicionar nome:', error));
        }
    });

    atualizarFilaBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja atualizar a Fila Livre com as configurações atuais?')) {
            // Enviar a nova ordem para a API
            fetch('http://100.26.4.178:3000/livres/ordem/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ordem: configLivres })
            })
            .then(response => {
                if (response.ok) {
                    livres = [...configLivres];
                    renderizarFilas();
                    configModal.style.display = 'none';
                    overlay.style.display = 'none';
                } else {
                    console.error('Erro ao atualizar a ordem da fila:', response.status);
                    alert('Erro ao atualizar a ordem da fila.');
                }
            })
            .catch(error => console.error('Erro ao atualizar a ordem da fila:', error));
        }
    });

    cancelarBtn.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja cancelar as alterações e fechar as configurações?')) {
            configModal.style.display = 'none';
            overlay.style.display = 'none';
        }
    });

    jobBtn.addEventListener('click', () => {
        if (modoEdicaoAtivo) {
            alert('Por favor, salve ou cancele a edição da fila antes de realizar esta ação.');
            return;
        }
        if (nomeSelecionado && listaSelecionada === 'livres') {
            fetch('http://100.26.4.178:3000/mover/livre-ocupado', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome: nomeSelecionado })
            })
            .then(response => {
                if (response.ok) {
                    nomeSelecionado = null;
                    buscarFilas();
                } else {
                    console.error('Erro ao mover para ocupados:', response.status);
                    alert('Erro ao mover para ocupados.');
                }
            })
            .catch(error => console.error('Erro ao mover para ocupados:', error));
        } else if (!nomeSelecionado) {
            alert('Por favor, selecione um nome para mover para a Job.');
        } else if (listaSelecionada === 'ocupados') {
            alert('Selecione um nome da fila de Livres para mover para Job.');
        }
    });

    livreBtn.addEventListener('click', () => {
        if (modoEdicaoAtivo) {
            alert('Por favor, salve ou cancele a edição da fila antes de realizar esta ação.');
            return;
        }
        if (nomeSelecionado && listaSelecionada === 'ocupados') {
            fetch('http://100.26.4.178:3000/mover/ocupado-livre', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome: nomeSelecionado })
            })
            .then(response => {
                if (response.ok) {
                    nomeSelecionado = null;
                    buscarFilas();
                } else {
                    console.error('Erro ao mover para livres:', response.status);
                    alert('Erro ao mover para livres.');
                }
            })
            .catch(error => console.error('Erro ao mover para livres:', error));
        } else if (!nomeSelecionado) {
            alert('Por favor, selecione um nome para mover para Livre.');
        } else if (listaSelecionada === 'livres') {
            alert('Selecione um nome da fila de Ocupados para mover para Livre.');
        }
    });

    function moverNomeConfig(direction, nome) {
        const index = configLivres.indexOf(nome);
        if (index > -1) {
            let newIndex;
            if (direction === 'up' && index > 0) {
                newIndex = index - 1;
            } else if (direction === 'down' && index < configLivres.length - 1) {
                newIndex = index + 1;
            }

            if (newIndex !== undefined) {
                const temp = [...configLivres];
                const [removido] = temp.splice(index, 1);
                temp.splice(newIndex, 0, removido);
                configLivres = temp;
                renderizarConfigLivres();
            }
        }
    }

    buscarFilas(); // Carrega as filas iniciais da API
});