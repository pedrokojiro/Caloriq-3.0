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

## Limites de requisição

A API limita o uso para proteger a cota do Gemini e as contas:

| Rota | Limite |
| --- | --- |
| `POST /api/auth/login` | 20 por IP e 8 por e-mail a cada 15 minutos |
| `POST /api/auth/register` | 5 por IP por hora |
| `POST /api/ai/generate` | 30 por usuário a cada 10 minutos e até 3 análises simultâneas |

Ao exceder, a API responde `429` com o cabeçalho `Retry-After`.

- **Os contadores ficam em memória.** Eles zeram quando o serviço reinicia (por exemplo, quando o plano gratuito do Render dorme) e **não são compartilhados entre instâncias**. Se a API passar a rodar em mais de uma instância, mova os contadores para o PostgreSQL ou para um Redis.
- **IP real atrás do proxy.** O Render coloca um proxy na frente da API e informa o IP do cliente em `X-Forwarded-For`. A variável `TRUST_PROXY=1` (já definida no `render.yaml`) faz o Express usar esse IP. Localmente, sem proxy, deixe `TRUST_PROXY` vazio ou `false`, senão qualquer cliente poderia forjar o cabeçalho para burlar o limite por IP.

## E-mail de recuperação de senha

A tela **Esqueci minha senha** envia um código de 6 dígitos pelo [Resend](https://resend.com).

1. Crie uma conta no Resend e verifique um domínio (Domains → Add domain), adicionando os registros DNS indicados.
2. Gere uma API key com permissão de envio.
3. No Render, preencha `RESEND_API_KEY` e `RESEND_FROM` (por exemplo `CaloriQ <nao-responda@seu-dominio.com>`).

Sem domínio verificado, o Resend só entrega para o e-mail dono da conta Resend. Sem `RESEND_API_KEY`, a API não envia nada e registra um aviso no log. Para testar localmente, use `MAIL_DEV_LOG=true`: o código aparece no console da API. Nunca ative isso em produção.

O código vale por 15 minutos, aceita até 5 tentativas e é guardado só como hash. Ao trocar a senha, todas as sessões da conta são encerradas.

## Avisar os usuários sobre um APK novo

A partir da versão 1.4.0 (versionCode 6), o app consulta `GET /api/app/version` ao abrir e mostra um aviso com o botão **Atualizar agora**.

1. Aumente `expo.version` e `expo.android.versionCode` no `app.json`. O versionCode precisa sempre subir.
2. Gere o APK: `eas build -p android --profile preview`. Ao terminar, copie o link de download que o Expo mostra.
3. No Render, preencha as variáveis e salve (o serviço reinicia sozinho):

| Variável | Exemplo | Uso |
| --- | --- | --- |
| `APP_LATEST_VERSION` | `1.4.0` | Texto exibido no aviso |
| `APP_LATEST_VERSION_CODE` | `6` | Quem tem versionCode menor vê o aviso |
| `APP_MIN_VERSION_CODE` | `5` | Opcional. Abaixo disso, o aviso não pode ser adiado |
| `APP_DOWNLOAD_URL` | `https://expo.dev/artifacts/eas/...apk` | Link HTTPS do APK |
| `APP_RELEASE_NOTES` | `Recuperação de senha e relatórios em PDF.` | Opcional, até 500 caracteres |

O aviso opcional pode ser adiado por 3 dias. Sem essas variáveis, nada aparece. Os APKs anteriores à 1.4.0 não têm o aviso: envie o primeiro link manualmente.

## Fotos de evolução na nuvem

Em **Evolução visual**, o usuário pode ativar **Guardar na nuvem**. A opção vem desligada por padrão, porque fotos do corpo são dados sensíveis. Ao ativar, as fotos do aparelho são enviadas para o Supabase Storage e passam a acompanhar a conta.

1. No painel do Supabase, abra **Storage → New bucket**, crie `progress-photos` e deixe **Public bucket desligado**.
2. Em **Project Settings → API**, copie a **Project URL** e a chave **service_role**.
3. No Render, preencha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. A service role ignora as regras de acesso do Supabase: nunca a coloque no app nem em variáveis `EXPO_PUBLIC_*`.

As imagens só são entregues por URLs assinadas que expiram em 1 hora. Cada arquivo fica em `<id do usuário>/<id da foto>`. A API confere o conteúdo (JPG, PNG ou WebP, até 4 MB) e limita a 30 envios por hora. Excluir a foto ou a conta apaga também o arquivo do bucket. Sem as variáveis, a API responde `503` e o app continua guardando as fotos só no aparelho.

## Login com Google

O botão **Continuar com Google** aparece no Login e no Cadastro do APK quando `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` está definido no build. Ele não aparece no Expo Go nem na web.

1. No [Google Cloud Console](https://console.cloud.google.com/), crie ou escolha um projeto e configure a **Tela de consentimento OAuth**: tipo Externo, nome CaloriQ e e-mail de suporte.
2. Em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**, crie um cliente do tipo **Aplicativo da Web**. Esse é o Client ID usado nos passos 4 e 5.
3. Crie outro cliente do tipo **Android**:
   - Nome do pacote: `com.pedrokojiro.caloriq`.
   - SHA-1: rode `eas credentials -p android`, escolha o perfil `preview` e copie o **SHA1 Fingerprint** do keystore.
4. No `eas.json`, em `build.preview.env`, adicione `"EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "<client id web>"` e gere um APK novo.
5. No Render, defina `GOOGLE_CLIENT_IDS` com o mesmo Client ID web.

A API confere a assinatura do token com as chaves públicas do Google, o emissor, o Client ID, a validade e se o e-mail foi verificado. Se o e-mail já tiver conta com senha, o Google é vinculado a ela. Senão, uma conta nova é criada e segue para o cadastro do perfil. Quem entrou só pelo Google pode definir uma senha em **Privacidade e conta**.
