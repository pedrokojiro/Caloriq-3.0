# Apresentar em outro notebook

## Configuração pela tela do aplicativo

Em **Perfil → Configuração da apresentação**, cole a chave Gemini no campo visível e salve. O chat e a análise de fotos passam a usar essa chave sem reiniciar. O teste real consome cota. No iniciador, você pode pressionar Enter no pedido da chave e configurá-la depois nesta tela.

O endereço do backend pode ser deixado vazio para usar o iniciador, ou substituído por `http://IPv4:porta`. Salvar recarrega os dados do servidor. O teste do banco consulta API e PostgreSQL de verdade; não inicia os serviços. A senha PostgreSQL continua no notebook.

Os valores são salvos somente neste aparelho/navegador, sem criptografia, não no código nem no GitHub. Não projete esta tela com a chave preenchida. Remover as configurações locais volta aos valores do iniciador/.env (não revoga a chave no Google). Um endereço manual salvo tem prioridade sobre a detecção automática; remova-o ao trocar de notebook.

## Caminho mais simples no Windows

Com Node.js 22+ e PostgreSQL já instalados, abra **APRESENTAR.cmd** com dois cliques.

- Instala dependências na primeira execução e quando o package-lock mudar.
- Pede chave Gemini, usuário/porta do PostgreSQL e senha apenas se ainda não estiverem configurados. A chave e a senha ficam ocultas durante a digitação.
- Salva as configurações em `.env`, ignorado pelo Git. Não coloque esse arquivo em prints, chats ou no repositório. Isso não transforma a chave EXPO_PUBLIC em segredo do aplicativo: ela ainda é incluída no bundle do Expo.
- Prepara o banco, verifica a conexão e inicia API na porta fixa 3333 e Expo com endereço automático.
- Nas próximas vezes, basta abrir o mesmo arquivo. Mantenha a janela aberta durante a apresentação.

Para corrigir uma senha ou substituir a chave já salva: `npm run configurar -- --editar`.

Não copie o `.env` do notebook antigo se as credenciais do PostgreSQL forem diferentes. Não é preciso gerar outra chave Gemini só por mudar de computador; use uma chave válida que você tenha autorização para usar. Não reutilize chaves expostas publicamente.

Faça o primeiro preparo e o teste com antecedência: baixar dependências por 4G pode demorar. O hotspot precisa permitir comunicação entre celular e notebook; teste `/health`/Diagnóstico do banco antes. Internet disponível, sozinha, não garante comunicação local.

## Preparar uma vez (antes da apresentação)

1. Instale Node.js e PostgreSQL e deixe o serviço PostgreSQL ativo.
2. Baixe o projeto e execute `npm ci`.
3. Copie `.env.example` para `.env`. Configure sua chave do Gemini e a senha do PostgreSQL **deste notebook** em `DATABASE_URL`. Não publique esse arquivo.
4. Execute `npm run db:setup`. Ele cria o banco e as tabelas com exemplos se ainda não existirem. Se o banco já estiver preparado, preserva seus registros. Requer um usuário PostgreSQL com permissão de criar bancos.

## No dia

Execute apenas:

```powershell
npm run apresentar
```

O comando verifica o banco, inicia a API na porta fixa **3333** e passa essa porta ao Expo. No celular, o app usa o endereço do notebook indicado pelo Expo. Na web, usa o mesmo hostname da página. Este comando substitui temporariamente EXPO_PUBLIC_API_URL por `auto`, sem modificar seu .env. Se a porta estiver ocupada, encerra com aviso, sem escolher outra porta.

Após atualizar de uma versão que usava portas aleatórias: encerre o iniciador antigo com Ctrl+C, execute `npm run apresentar` novamente e reabra pelo novo QR. Em Configuração da apresentação, apague somente o endereço manual do backend e salve; mantenha sua chave Gemini. Isso remove a porta antiga salva no aparelho. Para configuração manual, use `http://IPv4:3333`. A porta do Expo (normalmente 8081) e a do PostgreSQL (normalmente 5432) são serviços distintos.

Mantenha o terminal aberto. Escaneie o QR no Expo Go ou pressione `w` para abrir a web. Em Perfil → Diagnóstico do banco, confirme a conexão. Ctrl+C encerra os processos iniciados pelo comando, mas não o serviço PostgreSQL.

## Limites e plano B

- Celular e notebook precisam alcançar um ao outro na rede. Firewall, VPN ou isolamento do Wi-Fi da faculdade podem impedir isso. Autorize Node.js somente na rede privada usada para apresentar; não desative o firewall.
- Em rede que bloqueia comunicação entre aparelhos, apresente na web do próprio notebook. Um túnel do Expo sozinho não publica nossa API local.
- Ao mudar de rede, encerre e execute o comando novamente; reabra o projeto pelo novo QR.
- Um APK independente do Expo não tem o endereço do servidor de desenvolvimento: configure EXPO_PUBLIC_API_URL explicitamente nesse caso.
- A chave do Gemini continua necessária para IA real, assim como internet e cota disponível. Essa automação não altera os limites do Google.
- Os dados reais do notebook antigo **não viajam pelo GitHub**. O preparo cria exemplos num banco novo. Para levar registros reais, faça backup/restauração pelo PostgreSQL/pgAdmin de forma privada; não comite arquivos com dados pessoais.
- Não execute `db:migrate` como rotina da apresentação: o script atual também insere exemplos. Use `apresentar`, que somente verifica o banco.
