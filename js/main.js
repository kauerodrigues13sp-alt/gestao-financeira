// ==========================================================================
// ARQUIVO PRINCIPAL DA APLICAÇÃO (ES6+ MODULES)
// ==========================================================================

import { db } from './firebase-config.js';

// Elementos do DOM
const formTransacao = document.getElementById('form-transacao');
const listaTransacoes = document.getElementById('lista-transacoes');
const totalEntradasEl = document.getElementById('total-entradas');
const totalSaidasEl = document.getElementById('total-saidas');
const saldoFinalEl = document.getElementById('saldo-final');

// Elementos da Calculadora/API
const cotacaoUsdEl = document.getElementById('cotacao-usd');
const cotacaoEurEl = document.getElementById('cotacao-eur');
const saldoUsdEl = document.getElementById('saldo-usd');
const saldoEurEl = document.getElementById('saldo-eur');
const btnCalcularMeta = document.getElementById('btn-calcular-meta');
const resultadoMetaEl = document.getElementById('resultado-meta');

let meuGrafico = null;
let idEdicao = null;
let valorSaldoAtual = 0;
let valorCotacaoUSD = 0;
let valorCotacaoEUR = 0;

// ==========================================================================
// 1. FORMATAR MOEDA
// ==========================================================================
const formatarMoeda = (valor, moeda = 'BRL') => {
  const op = { style: 'currency', currency: moeda };
  const loc = moeda === 'BRL' ? 'pt-BR' : moeda === 'USD' ? 'en-US' : 'de-DE';
  return valor.toLocaleString(loc, op);
};

// ==========================================================================
// 2. INTEGRAÇÃO COM API DE COTAÇÃO DE MOEDAS (AwesomeAPI)
// ==========================================================================
const buscarCotacoesMoedas = async () => {
  try {
    const resposta = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL');
    const dados = await resposta.json();

    valorCotacaoUSD = parseFloat(dados.USDBRL.bid);
    valorCotacaoEUR = parseFloat(dados.EURBRL.bid);

    cotacaoUsdEl.textContent = `1 USD = ${formatarMoeda(valorCotacaoUSD)}`;
    cotacaoEurEl.textContent = `1 EUR = ${formatarMoeda(valorCotacaoEUR)}`;

    atualizarConversaoSaldo();
  } catch (erro) {
    console.error("Erro ao procurar cotações da API:", erro);
    cotacaoUsdEl.textContent = "Erro ao carregar";
    cotacaoEurEl.textContent = "Erro ao carregar";
  }
};

const atualizarConversaoSaldo = () => {
  if (valorCotacaoUSD > 0) {
    const emDolar = valorSaldoAtual / valorCotacaoUSD;
    saldoUsdEl.textContent = `Equivalente: ${formatarMoeda(emDolar, 'USD')}`;
  }
  if (valorCotacaoEUR > 0) {
    const emEuro = valorSaldoAtual / valorCotacaoEUR;
    saldoEurEl.textContent = `Equivalente: ${formatarMoeda(emEuro, 'EUR')}`;
  }
};

// ==========================================================================
// 3. SIMULADOR DE METAS (CALCULADORA)
// ==========================================================================
const calcularMeta = () => {
  const valorMeta = parseFloat(document.getElementById('valor-meta').value);
  const poupancaMensal = parseFloat(document.getElementById('poupanca-mensal').value);

  if (isNaN(valorMeta) || valorMeta <= 0) {
    resultadoMetaEl.textContent = "⚠️ Insira um valor válido para a meta.";
    return;
  }

  const aporte = (!isNaN(poupancaMensal) && poupancaMensal > 0) ? poupancaMensal : valorSaldoAtual;

  if (aporte <= 0) {
    resultadoMetaEl.textContent = "⚠️ Defina uma poupança mensal ou acumule um saldo positivo para calcular.";
    return;
  }

  const meses = Math.ceil(valorMeta / aporte);
  resultadoMetaEl.textContent = `🎯 Alcançará a sua meta de ${formatarMoeda(valorMeta)} em cerca de ${meses} mês(es) guardando ${formatarMoeda(aporte)}/mês.`;
};

// ==========================================================================
// 4. SALVAR OU EDITAR TRANSAÇÃO NO FIRESTORE
// ==========================================================================
const salvarTransacao = async (event) => {
  event.preventDefault();

  const descricaoInput = document.getElementById('descricao').value;
  const valorInput = Math.abs(parseFloat(document.getElementById('valor').value));
  const tipoInput = document.getElementById('tipo').value;
  const categoriaInput = document.getElementById('categoria').value;

  const dadosTransacao = {
    descricao: descricaoInput,
    valor: valorInput,
    tipo: tipoInput,
    categoria: categoriaInput,
    data: new Date()
  };

  try {
    if (idEdicao) {
      await db.collection('transacoes').doc(idEdicao).update(dadosTransacao);
      idEdicao = null;
      document.querySelector('button[type="submit"]').textContent = 'Adicionar Transação';
    } else {
      await db.collection('transacoes').add(dadosTransacao);
    }

    formTransacao.reset();
  } catch (erro) {
    console.error("Erro ao salvar/editar transação:", erro);
  }
};

// ==========================================================================
// 5. EXCLUIR TRANSAÇÃO
// ==========================================================================
window.excluirTransacao = async (id) => {
  if (confirm("Tem certeza que deseja excluir esta transação?")) {
    try {
      await db.collection('transacoes').doc(id).delete();
    } catch (erro) {
      console.error("Erro ao excluir transação:", erro);
    }
  }
};

// ==========================================================================
// 6. PREPARAR EDIÇÃO DE TRANSAÇÃO
// ==========================================================================
window.prepararEdicao = (id, descricao, valor, tipo, categoria) => {
  document.getElementById('descricao').value = descricao;
  document.getElementById('valor').value = valor;
  document.getElementById('tipo').value = tipo;
  document.getElementById('categoria').value = categoria || 'Outros';

  idEdicao = id;
  document.querySelector('button[type="submit"]').textContent = 'Atualizar Transação';
};

// ==========================================================================
// 7. CALCULAR RESUMO DE SALDO
// ==========================================================================
const atualizarResumo = (transacoes) => {
  let entradas = 0;
  let saidas = 0;

  transacoes.forEach((transacao) => {
    const { valor, tipo } = transacao;
    const valorPositivo = Math.abs(valor);

    if (tipo === 'receita') {
      entradas += valorPositivo;
    } else if (tipo === 'despesa') {
      saidas += valorPositivo;
    }
  });

  valorSaldoAtual = entradas - saidas;

  totalEntradasEl.textContent = formatarMoeda(entradas);
  totalSaidasEl.textContent = formatarMoeda(saidas);
  saldoFinalEl.textContent = formatarMoeda(valorSaldoAtual);

  atualizarConversaoSaldo();
};

// ==========================================================================
// 8. ATUALIZAR GRÁFICO (RECEITAS E DESPESAS POR CATEGORIA)
// ==========================================================================
const atualizarGrafico = (transacoes) => {
  const canvas = document.getElementById('grafico-categorias');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const categoriasTotais = {};

  transacoes.forEach((transacao) => {
    const cat = transacao.categoria ? `${transacao.categoria} (${transacao.tipo === 'receita' ? '+' : '-'})` : 'Outros';
    categoriasTotais[cat] = (categoriasTotais[cat] || 0) + Math.abs(transacao.valor);
  });

  const labels = Object.keys(categoriasTotais);
  const data = Object.values(categoriasTotais);

  const paletaCores = [
    '#28a745', '#3182ce', '#e53e3e', '#dd6b20', 
    '#805ad5', '#d69e2e', '#319795', '#d53f8c'
  ];

  if (meuGrafico) {
    meuGrafico.destroy();
  }

  meuGrafico = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['Sem Lançamentos'],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: labels.length > 0 
          ? paletaCores.slice(0, labels.length)
          : ['#e2e8f0']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
};

// ==========================================================================
// 9. ESCUTAR MUDANÇAS EM TEMPO REAL (onSnapshot)
// ==========================================================================
const carregarTransacoesEmTempoReal = () => {
  db.collection('transacoes')
    .orderBy('data', 'desc')
    .onSnapshot((snapshot) => {
      listaTransacoes.innerHTML = '';
      const listaParaCalculo = [];

      snapshot.forEach((doc) => {
        const id = doc.id;
        const dados = doc.data();
        const { descricao, valor, tipo, categoria } = dados;

        listaParaCalculo.push({ valor, tipo, categoria });

        const li = document.createElement('li');
        li.classList.add(tipo === 'receita' ? 'item-receita' : 'item-despesa');

        const sinal = tipo === 'receita' ? '+' : '-';
        const tagCategoria = categoria ? `<small class="tag-cat">[${categoria}]</small>` : '';

        li.innerHTML = `
          <div class="info-item">
            <span><strong>${descricao}</strong> ${tagCategoria}</span>
            <span class="valor-item">${sinal} ${formatarMoeda(Math.abs(valor))}</span>
          </div>
          <div class="acoes-item no-print">
            <button class="btn-acao btn-editar" onclick="prepararEdicao('${id}', '${descricao}', ${valor}, '${tipo}', '${categoria || 'Outros'}')">✏️</button>
            <button class="btn-acao btn-excluir" onclick="excluirTransacao('${id}')">🗑️</button>
          </div>
        `;

        listaTransacoes.appendChild(li);
      });

      atualizarResumo(listaParaCalculo);
      atualizarGrafico(listaParaCalculo);
    });
};

// Eventos e Inicialização
formTransacao.addEventListener('submit', salvarTransacao);
if (btnCalcularMeta) btnCalcularMeta.addEventListener('click', calcularMeta);

carregarTransacoesEmTempoReal();
buscarCotacoesMoedas();

// ==========================================================================
// MODO ESCURO
// ==========================================================================
const btnTema = document.getElementById('btn-tema');
const temaSalvo = localStorage.getItem('tema');

if (temaSalvo === 'escuro') {
  document.body.classList.add('dark-mode');
  if (btnTema) btnTema.textContent = '☀️ Modo Claro';
}

const alternarTema = () => {
  document.body.classList.toggle('dark-mode');
  const estaEscuro = document.body.classList.contains('dark-mode');

  if (estaEscuro) {
    if (btnTema) btnTema.textContent = '☀️ Modo Claro';
    localStorage.setItem('tema', 'escuro');
  } else {
    if (btnTema) btnTema.textContent = '🌙 Modo Escuro';
    localStorage.setItem('tema', 'claro');
  }
};

if (btnTema) {
  btnTema.addEventListener('click', alternarTema);
}