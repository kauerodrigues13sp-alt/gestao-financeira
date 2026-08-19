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

// Elementos de Teto de Orçamento e Filtro
const inputLimiteOrcamento = document.getElementById('input-limite-orcamento');
const btnSalvarLimite = document.getElementById('btn-salvar-limite');
const textoAlertaOrcamento = document.getElementById('texto-alerta-orcamento');
const barraProgressoPreenchimento = document.getElementById('barra-progresso-preenchimento');
const filtroPesquisa = document.getElementById('filtro-pesquisa');
const filtroCategoria = document.getElementById('filtro-categoria');
const btnExportarCsv = document.getElementById('btn-exportar-csv');

let meuGrafico = null;
let idEdicao = null;
let valorSaldoAtual = 0;
let totalDespesasAtuais = 0;
let valorCotacaoUSD = 0;
let valorCotacaoEUR = 0;
let listaTodasTransacoes = [];

// ==========================================================================
// EFEITO VISUAL DE CIFRÃO FLUTUANTE
// ==========================================================================
const criarAnimacaoCifrao = (tipo) => {
  const elemento = document.createElement('div');
  elemento.classList.add('moeda-flutuante');
  
  if (tipo === 'receita') {
    elemento.classList.add('receita');
    elemento.textContent = '+ 💲';
  } else {
    elemento.classList.add('despesa');
    elemento.textContent = '- 💸';
  }

  elemento.style.left = `${window.innerWidth / 2}px`;
  elemento.style.top = `${window.innerHeight / 2}px`;

  document.body.appendChild(elemento);

  setTimeout(() => {
    elemento.remove();
  }, 1200);
};

// ==========================================================================
// EFEITO SONORO SINTETIZADO (POSITIVO / NEGATIVO)
// ==========================================================================
const tocarSomDinheiro = (tipo = 'receita') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (tipo === 'receita') {
      // Som Agudo Festivo (Cha-Ching)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.08);
      osc2.stop(ctx.currentTime + 0.5);
    } else {
      // Som Grave Curto (Despesa / Saída)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.log("Áudio não suportado ou bloqueado pelo navegador:", e);
  }
};

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
// 3. TETO DE ORÇAMENTO E ALERTAS
// ==========================================================================
const atualizarTetoOrcamento = () => {
  const limiteSalvo = parseFloat(localStorage.getItem('limiteOrcamento')) || 0;
  if (limiteSalvo > 0) {
    inputLimiteOrcamento.value = limiteSalvo;
    const porcentagem = Math.min((totalDespesasAtuais / limiteSalvo) * 100, 100);
    barraProgressoPreenchimento.style.width = `${porcentagem}%`;

    if (totalDespesasAtuais > limiteSalvo) {
      barraProgressoPreenchimento.style.backgroundColor = '#e53e3e';
      textoAlertaOrcamento.textContent = `🚨 ALERTA: Ultrapassou o limite em ${formatarMoeda(totalDespesasAtuais - limiteSalvo)}! (Gastos: ${formatarMoeda(totalDespesasAtuais)} / Limite: ${formatarMoeda(limiteSalvo)})`;
      textoAlertaOrcamento.style.color = '#e53e3e';
    } else {
      barraProgressoPreenchimento.style.backgroundColor = '#10b981';
      textoAlertaOrcamento.textContent = `✅ Orçamento sob controlo: ${porcentagem.toFixed(1)}% do limite utilizado (${formatarMoeda(totalDespesasAtuais)} de ${formatarMoeda(limiteSalvo)})`;
      textoAlertaOrcamento.style.color = '#2563eb';
    }
  } else {
    textoAlertaOrcamento.textContent = "Nenhum limite definido.";
    barraProgressoPreenchimento.style.width = "0%";
  }
};

if (btnSalvarLimite) {
  btnSalvarLimite.addEventListener('click', () => {
    const novoLimite = parseFloat(inputLimiteOrcamento.value);
    if (!isNaN(novoLimite) && novoLimite > 0) {
      localStorage.setItem('limiteOrcamento', novoLimite);
      atualizarTetoOrcamento();
      alert("Limite de orçamento atualizado!");
    } else {
      localStorage.removeItem('limiteOrcamento');
      atualizarTetoOrcamento();
    }
  });
}

// ==========================================================================
// 4. SIMULADOR DE METAS
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
    resultadoMetaEl.textContent = "⚠️ Defina uma poupança mensal ou acumule um saldo positivo.";
    return;
  }

  const meses = Math.ceil(valorMeta / aporte);
  resultadoMetaEl.textContent = `🎯 Alcançará a sua meta de ${formatarMoeda(valorMeta)} em cerca de ${meses} mês(es) guardando ${formatarMoeda(aporte)}/mês.`;
};

// ==========================================================================
// 5. EXPORTAR HISTÓRICO PARA EXCEL (.CSV)
// ==========================================================================
const exportarParaCSV = () => {
  if (listaTodasTransacoes.length === 0) {
    alert("Nenhuma transação disponível para exportar.");
    return;
  }

  let conteudoCSV = "\uFEFFDescrição,Valor (R$),Tipo,Categoria\n";

  listaTodasTransacoes.forEach((t) => {
    const valorFmt = t.tipo === 'despesa' ? `-${t.valor}` : `${t.valor}`;
    conteudoCSV += `"${t.descricao}",${valorFmt},"${t.tipo}","${t.categoria || 'Outros'}"\n`;
  });

  const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Relatorio_Financeiro_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

if (btnExportarCsv) btnExportarCsv.addEventListener('click', exportarParaCSV);

// ==========================================================================
// 6. SALVAR OU EDITAR TRANSAÇÃO NO FIRESTORE
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
      
      // 🔊 Som e 🎨 Animação de acordo com o tipo
      tocarSomDinheiro(tipoInput);
      criarAnimacaoCifrao(tipoInput);
    }

    formTransacao.reset();
  } catch (erro) {
    console.error("Erro ao salvar/editar transação:", erro);
    alert("Erro ao guardar no Firebase. Verifique as regras de permissão no Firebase Console!");
  }
};

window.excluirTransacao = async (id) => {
  if (confirm("Tem certeza que deseja excluir esta transação?")) {
    try {
      await db.collection('transacoes').doc(id).delete();
    } catch (erro) {
      console.error("Erro ao excluir transação:", erro);
    }
  }
};

window.prepararEdicao = (id, descricao, valor, tipo, categoria) => {
  document.getElementById('descricao').value = descricao;
  document.getElementById('valor').value = valor;
  document.getElementById('tipo').value = tipo;
  document.getElementById('categoria').value = categoria || 'Outros';

  idEdicao = id;
  document.querySelector('button[type="submit"]').textContent = 'Atualizar Transação';
};

// ==========================================================================
// 7. CALCULAR RESUMO E GRÁFICOS
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
  totalDespesasAtuais = saidas;

  totalEntradasEl.textContent = formatarMoeda(entradas);
  totalSaidasEl.textContent = formatarMoeda(saidas);
  saldoFinalEl.textContent = formatarMoeda(valorSaldoAtual);

  atualizarConversaoSaldo();
  atualizarTetoOrcamento();
};

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
    '#059669', '#3b82f6', '#ef4444', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'
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
          : ['#cbd5e1']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
};

// ==========================================================================
// 8. RENDERIZAR LISTA COM FILTROS DE PESQUISA
// ==========================================================================
const renderizarListaFiltrada = () => {
  const termoPesquisa = filtroPesquisa ? filtroPesquisa.value.toLowerCase() : '';
  const catSelecionada = filtroCategoria ? filtroCategoria.value : 'todas';

  listaTransacoes.innerHTML = '';

  const transacoesFiltradas = listaTodasTransacoes.filter(item => {
    const bateTexto = item.descricao.toLowerCase().includes(termoPesquisa);
    const bateCategoria = catSelecionada === 'todas' || item.categoria === catSelecionada;
    return bateTexto && bateCategoria;
  });

  transacoesFiltradas.forEach((item) => {
    const { id, descricao, valor, tipo, categoria } = item;
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
};

// ==========================================================================
// 9. ESCUTAR MUDANÇAS EM TEMPO REAL (onSnapshot)
// ==========================================================================
const carregarTransacoesEmTempoReal = () => {
  db.collection('transacoes')
    .orderBy('data', 'desc')
    .onSnapshot(
      (snapshot) => {
        listaTodasTransacoes = [];

        snapshot.forEach((doc) => {
          const id = doc.id;
          const dados = doc.data();
          listaTodasTransacoes.push({ id, ...dados });
        });

        renderizarListaFiltrada();
        atualizarResumo(listaTodasTransacoes);
        atualizarGrafico(listaTodasTransacoes);
      },
      (erro) => {
        console.error("Erro no listener do Firestore:", erro);
        alert("⚠️ Permissão negada no Firebase Firestore! Altere as Regras no Firebase Console para 'allow read, write: if true;'.");
      }
    );
};

// Eventos de Filtro, Formulário e Inicialização
formTransacao.addEventListener('submit', salvarTransacao);
if (btnCalcularMeta) btnCalcularMeta.addEventListener('click', calcularMeta);
if (filtroPesquisa) filtroPesquisa.addEventListener('input', renderizarListaFiltrada);
if (filtroCategoria) filtroCategoria.addEventListener('change', renderizarListaFiltrada);

carregarTransacoesEmTempoReal();
buscarCotacoesMoedas();

// ==========================================================================
// 10. MODO ESCURO
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