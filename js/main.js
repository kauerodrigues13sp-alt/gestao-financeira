// ==========================================================================
// ARQUIVO PRINCIPAL DA APLICAÇÃO (ES6+ MODULES)
// ==========================================================================

// Importa a instância do banco de dados Firestore do arquivo de configuração
import { db } from './firebase-config.js';

// Captura os elementos do DOM (HTML) que vamos manipular
const formTransacao = document.getElementById('form-transacao');
const listaTransacoes = document.getElementById('lista-transacoes');
const totalEntradasEl = document.getElementById('total-entradas');
const totalSaidasEl = document.getElementById('total-saidas');
const saldoFinalEl = document.getElementById('saldo-final');

// ==========================================================================
// 1. FUNÇÃO PARA FORMATAR VALORES EM MOEDA (R$)
// ==========================================================================
// Arrow function para formatar números no padrão R$ 0,00
const formatarMoeda = (valor) => {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ==========================================================================
// 2. FUNÇÃO PARA SALVAR TRANSAÇÃO NO FIRESTORE
// ==========================================================================
// Arrow function responsável por pegar os dados do formulário e enviar ao banco
const salvarTransacao = async (event) => {
  // Previne o comportamento padrão do formulário de recarregar a página
  event.preventDefault();

  // Captura os valores dos campos do formulário
  const descricaoInput = document.getElementById('descricao').value;
  const valorInput = parseFloat(document.getElementById('valor').value);
  const tipoInput = document.getElementById('tipo').value;

  // Monta o objeto da nova transação
  const novaTransacao = {
    descricao: descricaoInput,
    valor: valorInput,
    tipo: tipoInput,
    data: new Date() // Salva a data atual para ordenação
  };

  try {
    // Adiciona o novo documento na coleção "transacoes" do Firestore
    await db.collection('transacoes').add(novaTransacao);
    
    // Limpa o formulário após salvar com sucesso
    formTransacao.reset();
  } catch (erro) {
    console.error("Erro ao salvar transação:", erro);
  }
};

// ==========================================================================
// 3. FUNÇÃO PARA CALCULAR E ATUALIZAR O SALDO (RESUMO)
// ==========================================================================
// Arrow function que calcula totais e aplica no visual dos cards
const atualizarResumo = (transacoes) => {
  let entradas = 0;
  let saidas = 0;

  // Percorre cada transação para somar entradas e saídas
  transacoes.forEach((transacao) => {
    // DESESTRUTURAÇÃO DE OBJETOS (Requisito da prova!)
    const { valor, tipo } = transacao;

    if (tipo === 'receita') {
      entradas += valor;
    } else if (tipo === 'despesa') {
      saidas += valor;
    }
  });

  // Calcula o saldo total
  const saldoTotal = entradas - saidas;

  // Atualiza os textos nos Cards HTML formatando como Moeda (R$)
  totalEntradasEl.textContent = formatarMoeda(entradas);
  totalSaidasEl.textContent = formatarMoeda(saidas);
  saldoFinalEl.textContent = formatarMoeda(saldoTotal);
};

// ==========================================================================
// 4. FUNÇÃO PARA ESCUTAR MUDANÇAS EM TEMPO REAL (onSnapshot)
// ==========================================================================
// Arrow function que escuta o banco de dados e desenha a lista na tela
const carregarTransacoesEmTempoReal = () => {
  // Conecta na coleção "transacoes" e ordena pelas mais recentes
  db.collection('transacoes')
    .orderBy('data', 'desc')
    .onSnapshot((snapshot) => {
      // Limpa a lista atual para não duplicar itens na tela
      listaTransacoes.innerHTML = '';

      const listaParaCalculo = [];

      // Loop pelos documentos retornados do Firestore
      snapshot.forEach((doc) => {
        // Recupera os dados do documento
        const dados = doc.data();

        // DESESTRUTURAÇÃO DE OBJETOS (Requisito da prova!)
        const { descricao, valor, tipo } = dados;

        // Guarda os dados na lista para enviar ao calculador de saldo
        listaParaCalculo.push({ valor, tipo });

        // Cria o elemento de item da lista (li)
        const li = document.createElement('li');
        
        // Aplica a classe CSS correspondente para a borda (item-receita ou item-despesa)
        li.classList.add(tipo === 'receita' ? 'item-receita' : 'item-despesa');

        // Define o conteúdo interno do item
        const sinal = tipo === 'receita' ? '+' : '-';
        li.innerHTML = `
          <span>${descricao}</span>
          <strong>${sinal} ${formatarMoeda(valor)}</strong>
        `;

        // Adiciona o item à lista no HTML
        listaTransacoes.appendChild(li);
      });

      // Atualiza os cards de saldo com os dados mais recentes
      atualizarResumo(listaParaCalculo);
    });
};

// ==========================================================================
// OUVINTES DE EVENTOS E INICIALIZAÇÃO
// ==========================================================================

// Escuta o envio do formulário para chamar a função de salvar
formTransacao.addEventListener('submit', salvarTransacao);

// Inicia a escuta em tempo real do banco de dados ao carregar o script
carregarTransacoesEmTempoReal();