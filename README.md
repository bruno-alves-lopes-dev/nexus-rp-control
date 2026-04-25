# 🚀 Nexus RP Control

Dashboard para gerenciamento e controle operacional.

---

## 📊 Estrutura do Projeto (Dashboard React)

| Arquivo / Pasta  | Função                                           | O que pode ser alterado             |
| ---------------- | ------------------------------------------------ | ----------------------------------- |
| `src/main.jsx`   | Inicializa o React                               | Raramente alterado                  |
| `src/App.jsx`    | Controla fluxo do app (login, dashboard, logout) | Lógica principal, autenticação      |
| `src/styles.css` | Estilos globais                                  | Cores, botões, inputs, layout geral |

---

## 🔐 Login

| Arquivo                    | Função        | O que mudar                                     |
| -------------------------- | ------------- | ----------------------------------------------- |
| `src/components/Login.jsx` | Card de login | Texto, título, inputs, botão, frase da esquerda |

---

## 🧩 Layout (estrutura do sistema)

| Arquivo                     | Função                    | O que mudar                                       |
| --------------------------- | ------------------------- | ------------------------------------------------- |
| `src/components/Layout.jsx` | Estrutura geral do painel | Sidebar, topo, status do bot, menu lateral, busca |

---

## 🎨 Componentes reutilizáveis

| Arquivo                 | Função                     | O que mudar                             |
| ----------------------- | -------------------------- | --------------------------------------- |
| `src/components/ui.jsx` | Componentes visuais padrão | Cards, tabelas, badges, títulos, botões |

---

## 📄 Páginas do sistema

| Arquivo                    | Tela          | O que faz                             |
| -------------------------- | ------------- | ------------------------------------- |
| `src/pages/Overview.jsx`   | Visão geral   | Métricas, ranking, status do bot      |
| `src/pages/Farm.jsx`       | Farm          | Dados de farm e produção              |
| `src/pages/Operations.jsx` | Operações     | Ações operacionais                    |
| `src/pages/Actions.jsx`    | Ações         | Execução de comandos (ex: reset farm) |
| `src/pages/Records.jsx`    | Registros     | Lista de membros e dados              |
| `src/pages/Commands.jsx`   | Comandos      | Fila, execução e retorno do bot       |
| `src/pages/Settings.jsx`   | Configurações | Ajustes do sistema                    |

---

## 🔌 Integração e lógica

| Arquivo             | Função                  | O que faz              |
| ------------------- | ----------------------- | ---------------------- |
| `src/lib/api.js`    | Comunicação com backend | Login, dados, comandos |
| `src/lib/format.js` | Formatação              | Moeda, datas, números  |

---

## 🎯 Resumo 

| Área         | Responsabilidade                |
| ------------ | ------------------------------- |
| `App.jsx`    | Controla fluxo geral do sistema |
| `Login.jsx`  | Tela de autenticação            |
| `Layout.jsx` | Estrutura do painel             |
| `pages/`     | Funcionalidades do sistema      |
| `ui.jsx`     | Componentes reutilizáveis       |
| `lib/`       | Integração e utilidades         |
| `styles.css` | Visual e identidade             |

---

## ⚙️ Tecnologias utilizadas

* React
* Vite
* Tailwind CSS
* Lucide Icons

---

## 🚀 Como rodar o projeto

### 📌 Pré-requisitos

* Node.js instalado (versão 18 ou superior)
* npm ou yarn

---

### ⚙️ Instalação

Clone o repositório:

```bash
git clone https://github.com/bruno-alves-lopes-dev/nexus-rp-control.git
```

Acesse a pasta do projeto:

```bash
cd nexus-rp-control
```

Instale as dependências:

```bash
npm install
```

---

### ▶️ Executar o projeto

```bash
npm run dev
```

---

### 🌐 Acessar no navegador

```
http://localhost:5173
```

---

### 🔐 Acesso padrão

```
Usuário: admin
Senha: admin123
```

---

### ⚠️ Observações

* Certifique-se de que nenhuma outra aplicação esteja usando a porta 5173
* Caso necessário, o Vite irá sugerir outra porta automaticamente
* O projeto depende de um backend para dados reais (modo atual é mock/local)

