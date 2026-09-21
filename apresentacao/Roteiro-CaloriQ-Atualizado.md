# Roteiro de apresentação do CaloriQ

Duração sugerida: 10–12 minutos.

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

45 segundos. Primeira parte dos dez cartões de Done (Sprint 1). Inclui cadastro e login, proteção da chave no backend, PostgreSQL local, estudo e configuração de GitHub Actions com testes de segurança e testes adicionais da IA. O cartão #6 usa a expressão treinamento da IA, mas não comprova treinamento de um modelo próprio. O status de conclusão aqui segue a coluna do Projects, mesmo quando a issue permanece aberta.

## Slide 12

45 segundos. Segunda parte dos dez cartões da Sprint 1. Inclui o cartão Dados, a automação da preparação do projeto, banco e API, a compilação do documento acadêmico, a configuração de credenciais da integração e a execução para o professor. O cartão Dados não detalha o escopo, por isso seu título foi preservado. Não exibir nem ler valores de credenciais. A automação abrange o iniciador local, configuração de ambiente, preparação do banco, diagnóstico e documentação.

## Slide 13

60 segundos. A segunda sprint reúne a evolução da experiência mobile: executável, configuração de perfil com cálculo de TMB, Analytics a partir de registros reais, câmera integrada e revisão da refeição, mascote Q, reset diário e histórico, responsividade e animações, edição de perfil e metas, Meu Plano com motivação e evolução visual privada por fotos de frente, lado e costas. A continuidade do refinamento visual permanece entre os próximos passos.

## Slide 14

50 segundos. O login por e-mail e senha já existe. A evolução proposta é permitir cadastro e acesso com Google ou outro provedor. Também entram exportação de relatórios alimentares em PDF, refinamento estético e animações mais suaves. Há melhorias de responsividade e animação na Sprint 2, mas o objetivo é continuar tornando o aplicativo mais fluido. O quadro ainda lista lembretes e exportação fora das colunas Done.

## Slide 15

Fechamento e demonstração, 60 a 90 segundos. Demonstre uma imagem, abra o resultado, revise um ingrediente e mostre a refeição no diário. Antes da apresentação, confirme login e conectividade. Se usar o modo de demonstração, anuncie explicitamente que a IA usa dados locais. Se a conexão falhar, use as telas desta apresentação para explicar o fluxo. Conclua retomando o objetivo: tornar o registro alimentar mais simples e visível.