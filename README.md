# CaloriQ 3.0 — Protótipo Premium com IA Real 🥗📸

Bem-vindo ao **CaloriQ 3.0**, um aplicativo de controle nutricional inteligente e acompanhamento diário de calorias desenvolvido com **React Native**, **Expo** e integrado diretamente com o **Google Gemini API (Gemini 2.5 Flash)**.

Esta versão traz a experiência completa com captura real por câmera, webcam no computador, importação de arquivos de imagem e processamento nutricional instantâneo usando visão computacional.

---

## 🚀 Principais Funcionalidades

### 1. 📷 Scanner de Refeições Multimodal
Tire uma foto ou faça o upload de uma imagem do seu prato para que a IA analise e estime os macros automaticamente:
*   **Câmera Celular:** Integração nativa para abrir a câmera física do aparelho (via **Expo Go** ou Builds).
*   **Webcam no Computador:** Acessa e exibe a webcam do seu PC ao vivo no navegador com efeito espelhado, corners inteligentes e linha laser animada de escaneamento.
*   **Galeria / Arquivo:** Envio de imagens da galeria de fotos do dispositivo (ou seletor de arquivos local no PC).
*   **Análise Real com Gemini:** Envia a imagem para o modelo `gemini-2.5-flash` que identifica os ingredientes, estima as porções (gramas, colheres), calcula calorias individuais/macros e gera um insight nutricional para a refeição.

### 2. 🤖 Assistente Nutricional (Chat IA)
Um chat completo com inteligência artificial real:
*   Integrado com a API do Gemini.
*   Mantém o histórico de mensagens da conversa.
*   Fornece receitas saudáveis, tira dúvidas sobre alimentos, ajuda a ajustar metas diárias e calcula calorias por texto.

### 3. ✏️ Ajuste Manual e Confirmação
Antes de salvar a refeição no diário, a tela de ajuste permite que você edite os pesos, adicione novos ingredientes, mude os nomes ou altere as porções estimadas pela IA, garantindo máxima precisão.

### 4. 💧 Diário Alimentar e Registro de Água
*   Acompanhamento visual em tempo real dos seus macros (Proteína, Carboidratos, Gorduras) e Calorias restantes.
*   Gráfico circular de calorias consumidas.
*   Registro e cálculo de copos d'água consumidos durante o dia.

---

## 🛠️ Tecnologias Utilizadas

*   **Core:** React Native (Expo SDK 56)
*   **Roteamento:** Expo Router (File-based routing)
*   **Estilização:** Vanilla CSS embutido com StyleSheet
*   **Imagens:** `expo-image` (Carregamento rápido de alta performance)
*   **Seleção de Mídia:** `expo-image-picker`
*   **IA de Análise & Chat:** Google Gemini API (`gemini-2.5-flash` via requisições diretas de HTTP)
*   **Ícones:** `@expo/vector-icons` (Ionicons)

---

## 💻 Como Executar o Projeto

1.  **Instale as dependências:**
    ```bash
    npm install
    ```

2.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npx expo start
    ```

3.  **Para testar no Computador (Web):**
    *   Pressione **`w`** no terminal (ou execute `npx expo start --web`).
    *   *Nota:* Para que a Webcam funcione na Web, garanta que o navegador tem permissão para acessar a câmera em `localhost`.

4.  **Para testar no Celular (Expo Go):**
    *   Baixe o aplicativo **Expo Go** no seu celular (App Store ou Google Play Store).
    *   Escaneie o código QR gerado no terminal.
    *   *Nota:* Certifique-se de que o celular e o computador estão conectados na mesma rede Wi-Fi.

---

## 🔑 Configuração da Chave de API do Gemini

Crie um arquivo `.env` na raiz (use `.env.example` como modelo):

```env
EXPO_PUBLIC_GEMINI_API_KEY=sua_chave_do_google_ai_studio
EXPO_PUBLIC_GEMINI_MODEL=gemini-2.5-flash
```

Reinicie o Expo depois da alteração. Em erros temporários, o scanner tenta novamente uma vez; se a cota continuar indisponível, permite continuar claramente em modo de demonstração com dados locais.

> Em uma versão publicada, `EXPO_PUBLIC_*` não é segredo. Mova a chamada do Gemini para um backend/proxy. Esta configuração serve para desenvolvimento e apresentação controlada.

## 🐘 Banco de dados PostgreSQL local

O aplicativo persiste perfil, metas, refeições, ingredientes e consumo de água por meio de uma API local. O React Native não acessa o PostgreSQL diretamente.

1. Instale o PostgreSQL 17 e mantenha o serviço na porta `5432`.
2. Crie o banco usando o terminal do PostgreSQL:

   ```sql
   CREATE DATABASE caloriq;
   ```

3. No `.env`, ajuste a conexão se sua senha for diferente:

   ```env
   DATABASE_URL=postgresql://postgres:troque_esta_senha@localhost:5432/caloriq
   EXPO_PUBLIC_API_URL=http://localhost:3333
   API_PORT=3333
   ```

4. Prepare as tabelas e inicie a API:

   ```bash
   npm run db:migrate
   npm run api
   ```

5. Em outro terminal, inicie o Expo normalmente. No emulador Android, use `EXPO_PUBLIC_API_URL=http://10.0.2.2:3333`. Em celular físico, substitua `localhost` pelo IP do computador na mesma rede Wi-Fi.

A rota `GET http://localhost:3333/health` confirma a conexão. Caso a API esteja desligada, o aplicativo mantém os dados de demonstração e mostra avisos apenas no console.
