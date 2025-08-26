//Funções do navegador para manipulação dos dados (roda no navegador)

function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Função que salva a tarefa via API
function salvarTarefa(tarefaElemento) {
    const id = tarefaElemento.dataset.id || null;
    const titulo = tarefaElemento.querySelector('.taskTitle')?.value || '';
    const descricao = tarefaElemento.querySelector('.taskDesc textarea')?.value || '';
    const imagens = Array.from(tarefaElemento.querySelectorAll('.imagem-tarefa')).map(img => img.src);

    // PEGAR TODAS AS SUBTAREFAS
    const subtarefaTextareas = tarefaElemento.querySelectorAll('.subtarefa textarea');
    const subtarefas = Array.from(subtarefaTextareas)
        .map(area => area.value.trim())
        .filter(texto => texto.length > 0); // remove vazias

    fetch('http://localhost:3000/api/salvar-tarefa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, titulo, descricao, imagens, subtarefas }),
    })
        .then(res => res.json())
        .then(data => {
            if (!id && data.id) {
                tarefaElemento.dataset.id = data.id;
            }
            console.log(`Tarefa ${id ? 'atualizada' : 'criada'} com sucesso`, data);
        })
        .catch(console.error);
}

// Adiciona listeners com debounce para salvar automaticamente
function inicializarListenerSalvar(tarefa) {
    const tituloInput = tarefa.querySelector('.taskTitle');
    const descricaoTextarea = tarefa.querySelector('.taskDesc textarea');

    const salvarDebounce = debounce(() => salvarTarefa(tarefa), 1000);

    if (tituloInput) tituloInput.addEventListener('input', salvarDebounce);
    if (descricaoTextarea) descricaoTextarea.addEventListener('input', salvarDebounce);

    // Adiciona listeners a todas as subtarefas existentes
    const subtarefas = tarefa.querySelectorAll('.subtarefa textarea');
    subtarefas.forEach(sub => {
        sub.addEventListener('input', salvarDebounce);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tarefa').forEach(tarefa => {
        if (!tarefa.dataset.id) {
            fetch('http://localhost:3000/api/salvar-tarefa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo: '', descricao: '', imagens: [] }),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.id) {
                        tarefa.dataset.id = data.id;
                        inicializarListenerSalvar(tarefa); 
                    }
                })
                .catch(console.error);
        }
    });
});
