# CaloriQ na nuvem e em APK

Com esta configuração, o celular acessa um endereço HTTPS fixo. Não é necessário descobrir IPv4, abrir porta no notebook, instalar PostgreSQL no computador da apresentação nem manter o Node.js aberto.

## Estrutura

- **Render:** executa o backend Node.js do CaloriQ.
- **Supabase:** hospeda o PostgreSQL.
- **Google AI Studio:** fornece a chave do Gemini, armazenada somente no Render.
- **Expo EAS:** gera o APK Android.

## 1. Criar o PostgreSQL gratuito

1. Entre no Supabase e crie um projeto chamado `caloriq` no plano Free.
2. Guarde a senha criada em local privado.
3. Em **Connect**, copie a URI de conexão do PostgreSQL compatível com IPv4/pooler.
4. Não coloque essa URI no GitHub, em prints ou dentro do APK.

## 2. Publicar o backend gratuito

1. Entre no Render, escolha **New → Blueprint** e conecte o repositório `pedrokojiro/Caloriq-3.0`.
2. O arquivo `render.yaml` cria o serviço `caloriq-api`.
3. Preencha os valores secretos solicitados:
   - `DATABASE_URL`: URI copiada do Supabase.
   - `GEMINI_API_KEY`: chave válida do Google AI Studio.
4. Após a implantação, abra `https://SEU-SERVICO.onrender.com/health`. O resultado esperado contém `"status":"ok"` e `"database":"connected"`.

O servidor gratuito do Render dorme após um período sem uso. Antes da apresentação, abra `/health` e aguarde a primeira resposta.

## 3. Gerar o APK

1. Anote a URL HTTPS fornecida pelo Render.
2. Na conta Expo, configure `EXPO_PUBLIC_API_URL` com essa URL no ambiente `preview`.
3. No terminal do projeto, entre na conta Expo e execute:

   ```powershell
   npx eas-cli@latest login
   npx eas-cli@latest build --platform android --profile preview
   ```

4. Ao terminar, o Expo fornece o link para baixar e instalar o APK.

## Teste final

1. Abra o APK usando Wi-Fi ou 4G.
2. Crie uma conta nova e faça login.
3. Em **Perfil → Diagnóstico do banco**, confira API e PostgreSQL conectados.
4. Registre água ou refeição, feche e reabra o aplicativo e confirme que o dado permanece.
5. Teste o chat e uma foto. A cota gratuita do Gemini continua sendo controlada pelo Google; o aplicativo oferece o modo de demonstração se ela estiver indisponível.

## Segredos

`DATABASE_URL` e `GEMINI_API_KEY` existem apenas nas variáveis privadas do Render. `EXPO_PUBLIC_API_URL` não é segredo: é somente o endereço público do backend.
