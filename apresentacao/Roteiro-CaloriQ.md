# Roteiro de apresentação do CaloriQ

Duração sugerida: 8–10 minutos.

## Slide 1

Abertura, 30 segundos. O CaloriQ é um aplicativo de acompanhamento alimentar que reúne registro de refeições, estimativas por imagem e acompanhamento de metas. A proposta é facilitar o registro e ajudar a pessoa a visualizar sua rotina alimentar.

## Slide 2

Contexto, 40 segundos. Explique o problema que motivou o projeto: o trabalho envolvido em registrar cada refeição e consultar o histórico. Esta é a hipótese de produto que orienta o aplicativo, não uma conclusão de pesquisa com usuários. A proposta é reduzir etapas e concentrar as informações em uma experiência só.

## Slide 3

45 segundos. Mostre a tela inicial e explique como o usuário consulta o consumo do dia e registra água. Os números exibidos nesta apresentação são fictícios e ilustram a interface real. O banco guarda os registros por conta.

## Slide 4

50 segundos. Explique as formas de entrada: câmera no celular, webcam na web e imagem da galeria. A integração com Gemini passa pelo backend. A análise depende de conectividade, configuração e disponibilidade do serviço. No modo de demonstração, os resultados são locais e precisam ser apresentados como simulados.

## Slide 5

50 segundos. Uma foto não permite medir com precisão todos os ingredientes ou quantidades. Por isso, o usuário pode revisar o resultado e editar a refeição. Não prometa precisão clínica. Os valores da tela são um exemplo de apresentação, não uma análise real executada neste trabalho.

## Slide 6

45 segundos. O cadastro reúne informações de perfil, nível de atividade e objetivo. O projeto usa esses dados para calcular metas e permite atualizar o perfil. Apresente isso como funcionalidade de acompanhamento do protótipo, sem prometer resultados de saúde.

## Slide 7

45 segundos. A tela de análise agrega os registros do usuário em diferentes períodos. Explique que o acompanhamento depende da qualidade e da continuidade dos registros. Não há métricas de adesão de usuários reais nesta apresentação.

## Slide 8

40 segundos. O assistente complementa o registro por imagem. A conversa usa a integração com Gemini e conserva o histórico da conversa para dar continuidade ao diálogo. O papel apresentado é informativo, sem afirmar que substitui acompanhamento profissional.

## Slide 9

60 segundos. O aplicativo chama a API. A API autentica a conta, acessa o PostgreSQL e faz as chamadas ao Gemini. O cliente não acessa o banco diretamente. A documentação prevê Render para API, Supabase para PostgreSQL e Expo EAS para APK. Essa configuração documentada não é prova de que a implantação esteja ativa.

## Slide 10

45 segundos. Explique os mecanismos presentes no código: hash de senha com scrypt e salt, tokens de sessão e associação dos dados à conta. Não apresente isso como auditoria de segurança ou certificação. Antes de publicar, a configuração de ambiente precisa preservar os segredos no servidor.

## Slide 11

50 segundos. Distinguir implementação de validação. O repositório contém os fluxos descritos e configurações para distribuição. Ainda é necessário comprovar qualidade das estimativas, experiência de uso e operação no ambiente final. Os itens da direita são propostas de evolução, não tarefas já concluídas nem um cronograma aprovado.

## Slide 12

Fechamento e demonstração, 60 a 90 segundos. Demonstre uma imagem, abra o resultado, revise um ingrediente e mostre a refeição no diário. Antes da apresentação, confirme login e conectividade. Se usar o modo de demonstração, anuncie explicitamente que a IA usa dados locais. Se a conexão falhar, use as telas desta apresentação para explicar o fluxo. Conclua retomando o objetivo: tornar o registro alimentar mais simples e visível.