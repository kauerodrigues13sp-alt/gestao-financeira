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

// Botões do Cabecalho
const btnTema = document.getElementById('btn-tema');
const btnRelatorio = document.getElementById('btn-relatorio');

// Elementos da Gestão de Carteiras
const btnFabToggle = document.getElementById('btn-fab-toggle');
const modalCarteiras = document.getElementById('modal-carteiras');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const seletorCarteiras = document.getElementById('seletor-carteiras');
const seletorCopiaDados = document.getElementById('seletor-copia-dados');
const novoNomeCarteira = document.getElementById('novo-nome-carteira');
const btnNovaCarteira = document.getElementById('btn-nova-carteira');
const nomeGestaoAtiva = document.getElementById('nome-gestao-ativa');

let meuGrafico = null;
let idEdicao = null;
let valorSaldoAtual = 0;
let totalDespesasAtuais = 0;
let valorCotacaoUSD = 0;
let valorCotacaoEUR = 0;
let listaTodasTransacoes = [];
let unsubscribeRealtime = null;

// Gestão de estado local das carteiras
let carteiraAtivaId = localStorage.getItem('carteira_ativa_id') || 'principal';
let bancoCarteiras = JSON.parse(localStorage.getItem('banco_carteiras')) || {
  'principal': { nome: 'Principal' }
};

// ==========================================================================
// CONTROLADORES DE AÇÕES DO CABEÇALHO (MODO CLARO/ESCURO, PDF E EXCEL)
// ==========================================================================

const aplicarTemaSalvo = () => {
  const temaSalvo = localStorage.getItem('tema');
  if (temaSalvo === 'escuro') {
    document.body.classList.add('dark-mode');
    if (btnTema) btnTema.textContent = '☀️ Modo Claro';
  } else {
    document.body.classList.remove('dark-mode');
    if (btnTema) btnTema.textContent = '🌙 Modo Escuro';
  }
};

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

if (btnTema) btnTema.addEventListener('click', alternarTema);
aplicarTemaSalvo();

if (btnRelatorio) {
  btnRelatorio.addEventListener('click', () => window.print());
}

// ==========================================================================
// EFEITOS VISUAIS E SONOROS
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

  setTimeout(() => elemento.remove(), 1200);
};

const tocarSomDinheiro = (tipo = 'receita') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (tipo === 'receita') {
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
    console.log("Som não suportado pelo navegador:", e);
  }
};

// ==========================================================================
// FORMATAR MOEDA E INTEGRAÇÃO DE COTAÇÕES
// ==========================================================================
const formatarMoeda = (valor, moeda = 'BRL') => {
  const op = { style: 'currency', currency: moeda };
  const loc = moeda === 'BRL' ? 'pt-BR' : moeda === 'USD' ? 'en-US' : 'de-DE';
  return valor.toLocaleString(loc, op);
};

const buscarCotacoesMoedas = async () => {
  try {
    const resposta = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL');
    const dados = await resposta.json();

    valorCotacaoUSD = parseFloat(dados.USDBRL.bid);
    valorCotacaoEUR = parseFloat(dados.EURBRL.bid);

    if (cotacaoUsdEl) cotacaoUsdEl.textContent = `1 USD = ${formatarMoeda(valorCotacaoUSD)}`;
    if (cotacaoEurEl) cotacaoEurEl.textContent = `1 EUR = ${formatarMoeda(valorCotacaoEUR)}`;

    atualizarConversaoSaldo();
  } catch (erro) {
    console.error("Erro ao carregar cotações:", erro);
    if (cotacaoUsdEl) cotacaoUsdEl.textContent = "Erro ao carregar";
    if (cotacaoEurEl) cotacaoEurEl.textContent = "Erro ao carregar";
  }
};

const atualizarConversaoSaldo = () => {
  if (valorCotacaoUSD > 0 && saldoUsdEl) {
    const emDolar = valorSaldoAtual / valorCotacaoUSD;
    saldoUsdEl.textContent = `Equivalente: ${formatarMoeda(emDolar, 'USD')}`;
  }
  if (valorCotacaoEUR > 0 && saldoEurEl) {
    const emEuro = valorSaldoAtual / valorCotacaoEUR;
    saldoEurEl.textContent = `Equivalente: ${formatarMoeda(emEuro, 'EUR')}`;
  }
};

// ==========================================================================
// TETO DE ORÇAMENTO E SIMULADOR DE METAS
// ==========================================================================
const atualizarTetoOrcamento = () => {
  const limiteSalvo = parseFloat(localStorage.getItem(`limiteOrcamento_${carteiraAtivaId}`)) || 0;
  if (limiteSalvo > 0) {
    if (inputLimiteOrcamento) inputLimiteOrcamento.value = limiteSalvo;
    const porcentagem = Math.min((totalDespesasAtuais / limiteSalvo) * 100, 100);
    
    if (barraProgressoPreenchimento) barraProgressoPreenchimento.style.width = `${porcentagem}%`;

    if (textoAlertaOrcamento) {
      if (totalDespesasAtuais > limiteSalvo) {
        if (barraProgressoPreenchimento) barraProgressoPreenchimento.style.backgroundColor = 'var(--danger)';
        textoAlertaOrcamento.textContent = `🚨 ALERTA: Ultrapassou o limite em ${formatarMoeda(totalDespesasAtuais - limiteSalvo)}!`;
        textoAlertaOrcamento.style.color = 'var(--danger)';
      } else {
        if (barraProgressoPreenchimento) barraProgressoPreenchimento.style.backgroundColor = 'var(--success)';
        textoAlertaOrcamento.textContent = `✅ Orçamento controlado: ${porcentagem.toFixed(1)}% utilizado (${formatarMoeda(totalDespesasAtuais)} de ${formatarMoeda(limiteSalvo)})`;
        textoAlertaOrcamento.style.color = 'var(--success)';
      }
    }
  } else {
    if (inputLimiteOrcamento) inputLimiteOrcamento.value = '';
    if (textoAlertaOrcamento) textoAlertaOrcamento.textContent = "Nenhum limite definido.";
    if (barraProgressoPreenchimento) barraProgressoPreenchimento.style.width = "0%";
  }
};

if (btnSalvarLimite) {
  btnSalvarLimite.addEventListener('click', () => {
    const novoLimite = parseFloat(inputLimiteOrcamento.value);
    if (!isNaN(novoLimite) && novoLimite > 0) {
      localStorage.setItem(`limiteOrcamento_${carteiraAtivaId}`, novoLimite);
      atualizarTetoOrcamento();
      alert("Limite de orçamento atualizado!");
    } else {
      localStorage.removeItem(`limiteOrcamento_${carteiraAtivaId}`);
      atualizarTetoOrcamento();
    }
  });
}

const calcularMeta = () => {
  const inputValorMeta = document.getElementById('valor-meta');
  const inputPoupancaMensal = document.getElementById('poupanca-mensal');

  const valorMeta = inputValorMeta ? parseFloat(inputValorMeta.value) : 0;
  const poupancaMensal = inputPoupancaMensal ? parseFloat(inputPoupancaMensal.value) : 0;

  if (isNaN(valorMeta) || valorMeta <= 0) {
    if (resultadoMetaEl) resultadoMetaEl.textContent = "⚠️ Insira um valor válido para a meta.";
    return;
  }

  const aporte = (!isNaN(poupancaMensal) && poupancaMensal > 0) ? poupancaMensal : valorSaldoAtual;

  if (aporte <= 0) {
    if (resultadoMetaEl) resultadoMetaEl.textContent = "⚠️ Defina uma poupança mensal ou acumule saldo.";
    return;
  }

  const meses = Math.ceil(valorMeta / aporte);
  if (resultadoMetaEl) {
    resultadoMetaEl.textContent = `🎯 Alcançará a sua meta de ${formatarMoeda(valorMeta)} em ~${meses} mês(es) guardando ${formatarMoeda(aporte)}/mês.`;
  }
};

if (btnCalcularMeta) btnCalcularMeta.addEventListener('click', calcularMeta);

// ==========================================================================
// EXPORTAR EXCEL (.CSV)
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
  link.setAttribute('download', `Relatorio_${bancoCarteiras[carteiraAtivaId]?.nome || 'Financeiro'}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

if (btnExportarCsv) btnExportarCsv.addEventListener('click', exportarParaCSV);

// ==========================================================================
// OPERAÇÕES FIRESTORE (ADICIONAR / EDITAR / ELIMINAR COM CARTEIRAS)
// ==========================================================================
const salvarTransacao = async (event) => {
  event.preventDefault();

  const descricaoInput = document.getElementById('descricao').value;
  const valorInput = Math.abs(parseFloat(document.getElementById('valor').value));
  const tipoInput = document.getElementById('tipo').value;
  const categoriaInput = document.getElementById('categoria').value;

  const dadosTransacao = {
    carteiraId: carteiraAtivaId,
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
      const btnSub = formTransacao.querySelector('button[type="submit"]');
      if (btnSub) btnSub.textContent = 'Adicionar Transação';
    } else {
      await db.collection('transacoes').add(dadosTransacao);
      tocarSomDinheiro(tipoInput);
      criarAnimacaoCifrao(tipoInput);
    }

    formTransacao.reset();
  } catch (erro) {
    console.error("Erro ao salvar no Firestore:", erro);
    alert("Erro ao guardar dados. Verifique o seu Firebase!");
  }
};

window.excluirTransacao = async (id) => {
  if (confirm("Deseja mesmo apagar esta transação?")) {
    try {
      await db.collection('transacoes').doc(id).delete();
    } catch (erro) {
      console.error("Erro ao apagar:", erro);
    }
  }
};

window.prepararEdicao = (id, descricao, valor, tipo, categoria) => {
  document.getElementById('descricao').value = descricao;
  document.getElementById('valor').value = valor;
  document.getElementById('tipo').value = tipo;
  document.getElementById('categoria').value = categoria || 'Outros';

  idEdicao = id;
  const btnSub = formTransacao.querySelector('button[type="submit"]');
  if (btnSub) btnSub.textContent = 'Atualizar Transação';
};

// ==========================================================================
// RESUMO, GRÁFICO E RENDERIZAÇÃO
// ==========================================================================
const atualizarResumo = (transacoes) => {
  let entradas = 0;
  let saidas = 0;

  transacoes.forEach((transacao) => {
    const valorPositivo = Math.abs(transacao.valor);
    if (transacao.tipo === 'receita') entradas += valorPositivo;
    else if (transacao.tipo === 'despesa') saidas += valorPositivo;
  });

  valorSaldoAtual = entradas - saidas;
  totalDespesasAtuais = saidas;

  if (totalEntradasEl) totalEntradasEl.textContent = formatarMoeda(entradas);
  if (totalSaidasEl) totalSaidasEl.textContent = formatarMoeda(saidas);
  if (saldoFinalEl) saldoFinalEl.textContent = formatarMoeda(valorSaldoAtual);

  atualizarConversaoSaldo();
  atualizarTetoOrcamento();
};

const atualizarGrafico = (transacoes) => {
  const canvas = document.getElementById('grafico-categorias');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const categoriasTotais = {};

  transacoes.forEach((t) => {
    const cat = t.categoria ? `${t.categoria} (${t.tipo === 'receita' ? '+' : '-'})` : 'Outros';
    categoriasTotais[cat] = (categoriasTotais[cat] || 0) + Math.abs(t.valor);
  });

  const labels = Object.keys(categoriasTotais);
  const data = Object.values(categoriasTotais);
  const paletaCores = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

  if (meuGrafico) meuGrafico.destroy();

  meuGrafico = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['Sem Registos'],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: labels.length > 0 ? paletaCores.slice(0, labels.length) : ['#64748b']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
};

const renderizarListaFiltrada = () => {
  if (!listaTransacoes) return;
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
        <button class="btn-secundario" onclick="prepararEdicao('${id}', '${descricao}', ${valor}, '${tipo}', '${categoria || 'Outros'}')">✏️</button>
        <button class="btn-secundario" onclick="excluirTransacao('${id}')">🗑️</button>
      </div>
    `;

    listaTransacoes.appendChild(li);
  });
};

// ==========================================================================
// ESCUTA EM TEMPO REAL (FIRESTORE FILTRADO POR CARTEIRA)
// ==========================================================================
const carregarTransacoesEmTempoReal = () => {
  if (unsubscribeRealtime) unsubscribeRealtime();

  unsubscribeRealtime = db.collection('transacoes')
    .where('carteiraId', '==', carteiraAtivaId)
    .onSnapshot(
      (snapshot) => {
        listaTodasTransacoes = [];
        snapshot.forEach((doc) => {
          listaTodasTransacoes.push({ id: doc.id, ...doc.data() });
        });

        renderizarListaFiltrada();
        atualizarResumo(listaTodasTransacoes);
        atualizarGrafico(listaTodasTransacoes);
      },
      (erro) => console.error("Erro no listener do Firebase:", erro)
    );
};

// ==========================================================================
// GERENCIADOR COMPLETO DE CARTEIRAS (FAB & MODAL)
// ==========================================================================
const atualizarInterfaceCarteiras = () => {
  if (!seletorCarteiras || !seletorCopiaDados) return;

  seletorCarteiras.innerHTML = '';
  seletorCopiaDados.innerHTML = '<option value="nenhum">Nenhum (Começar do Zero)</option>';

  Object.keys(bancoCarteiras).forEach(id => {
    const nome = bancoCarteiras[id].nome;

    const optSelect = new Option(nome, id);
    if (id === carteiraAtivaId) optSelect.selected = true;
    seletorCarteiras.add(optSelect);

    const optCopia = new Option(nome, id);
    seletorCopiaDados.add(optCopia);
  });

  if (nomeGestaoAtiva && bancoCarteiras[carteiraAtivaId]) {
    nomeGestaoAtiva.innerHTML = `Carteira: <strong>${bancoCarteiras[carteiraAtivaId].nome}</strong>`;
  }
};

if (btnFabToggle) {
  btnFabToggle.addEventListener('click', () => {
    if (modalCarteiras) modalCarteiras.classList.toggle('hidden');
  });
}

if (btnFecharModal) {
  btnFecharModal.addEventListener('click', () => {
    if (modalCarteiras) modalCarteiras.classList.add('hidden');
  });
}

if (seletorCarteiras) {
  seletorCarteiras.addEventListener('change', (e) => {
    carteiraAtivaId = e.target.value;
    localStorage.setItem('carteira_ativa_id', carteiraAtivaId);
    atualizarInterfaceCarteiras();
    carregarTransacoesEmTempoReal();
  });
}

if (btnNovaCarteira) {
  btnNovaCarteira.addEventListener('click', async () => {
    const nome = novoNomeCarteira ? novoNomeCarteira.value.trim() : '';
    const idOrigem = seletorCopiaDados ? seletorCopiaDados.value : 'nenhum';

    if (!nome) {
      alert("Por favor, digite um nome para a nova carteira.");
      return;
    }

    const novoId = 'carteira_' + Date.now();

    bancoCarteiras[novoId] = { nome: nome };
    localStorage.setItem('banco_carteiras', JSON.stringify(bancoCarteiras));

    if (idOrigem !== 'nenhum') {
      try {
        const snapshotOrigem = await db.collection('transacoes')
          .where('carteiraId', '==', idOrigem)
          .get();

        const batch = db.batch();
        snapshotOrigem.forEach((doc) => {
          const dadosClonados = { ...doc.data(), carteiraId: novoId, data: new Date() };
          const novoDocRef = db.collection('transacoes').doc();
          batch.set(novoDocRef, dadosClonados);
        });

        await batch.commit();
      } catch (e) {
        console.error("Erro ao clonar dados da carteira:", e);
      }
    }

    carteiraAtivaId = novoId;
    localStorage.setItem('carteira_ativa_id', carteiraAtivaId);

    if (novoNomeCarteira) novoNomeCarteira.value = '';
    if (modalCarteiras) modalCarteiras.classList.add('hidden');

    atualizarInterfaceCarteiras();
    carregarTransacoesEmTempoReal();
  });
}

// Inicialização Geral
if (formTransacao) formTransacao.addEventListener('submit', salvarTransacao);
if (filtroPesquisa) filtroPesquisa.addEventListener('input', renderizarListaFiltrada);
if (filtroCategoria) filtroCategoria.addEventListener('change', renderizarListaFiltrada);

atualizarInterfaceCarteiras();
carregarTransacoesEmTempoReal();
buscarCotacoesMoedas();