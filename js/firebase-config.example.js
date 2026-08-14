// ==========================================================================
// MODELO DE CONFIGURAÇÃO DO FIREBASE (EXAMPLE)
// ==========================================================================

// Substitua os textos abaixo pelas suas credenciais reais do Console do Firebase
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO_ID",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Inicializa o Firestore
const db = firebase.firestore();

// Exporta o banco de dados
export { db };