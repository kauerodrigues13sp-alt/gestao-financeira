// ==========================================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// ==========================================================================

// Configurações do projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDJYjxFO5BcVvAb7oSxv8KZL9Gv2yGN7b0",
  authDomain: "projetogestaofinanceira-fc946.firebaseapp.com",
  projectId: "projetogestaofinanceira-fc946",
  storageBucket: "projetogestaofinanceira-fc946.firebasestorage.app",
  messagingSenderId: "738048959246",
  appId: "1:738048959246:web:f4752172068a99973aed5f"
};

// Inicializa o Firebase no app usando a SDK carregada via CDN
firebase.initializeApp(firebaseConfig);

// Inicializa o serviço do Firestore (Banco de Dados em tempo real)
const db = firebase.firestore();

// Exporta a instância do banco de dados para ser utilizada nos outros arquivos JS
export { db };