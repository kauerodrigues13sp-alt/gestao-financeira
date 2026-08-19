# 💰 Gestão Financeira Pessoal

Aplicação web desenvolvida para auxílio no controle de finanças pessoais, permitindo registrar receitas e despesas com atualização de saldo em tempo real.

## 🚀 Tecnologias Utilizadas

- **HTML5 & CSS3:** Layout responsivo, moderno e adaptável.
- **JavaScript (ES6+):** Manipulação de DOM, Arrow Functions, Desestruturação e Módulos ESM.
- **Firebase Firestore:** Banco de dados NoSQL em tempo real para armazenamento e sincronização dos dados.
- **Git & GitHub:** Versionamento de código utilizando mensagens de commits semânticos.

## ✨ Funcionalidades

- 🟢 Cadastro de Receitas e Despesas.
- 📊 Cálculo automático de Total de Entradas, Saídas e Saldo Final.
- ⚡ Sincronização em tempo real (`onSnapshot`) com o Firestore.
- 📱 Interface responsiva e acessível (com VLibras e Modo Escuro).
- 🔒 Boas práticas de segurança com `.gitignore` para proteção de credenciais.

## 📁 Estrutura do Projeto

```text
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js          # Configurações do Firebase (Ignorado no Git)
│   ├── firebase-config.example.js  # Modelo de configuração para testes
│   └── main.js                     # Lógica principal e regras de negócio
├── .gitignore                      # Arquivos ignorados no versionamento
├── index.html                      # Estrutura principal da aplicação
└── PROMPT_IA.md                    # Documentação do prompt (Framework COSTAR)