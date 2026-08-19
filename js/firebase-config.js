// ==========================================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ==========================================================================

// Configurações do projeto Firebase


// Inicializa o Firebase no app usando a SDK carregada via CDN
firebase.initializeApp(firebaseConfig);

// Inicializa o serviço do Firestore (Banco de Dados em tempo real)
const db = firebase.firestore();

// Exporta a instância do banco de dados para ser utilizada nos outros arquivos JS
export { db };