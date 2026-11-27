# Maquininha Positivo L300 (Vileve / PayStore) — o que fazer quando ela chegar

Registro das orientações da Vileve e do que já está pronto do nosso lado.

## Situação (17/11/2026)

- Modelo comprado: **Positivo L300**, terminal de **produção**, com fornecedor indicado pela Vileve.
- A Vileve confirmou que grande parte da base deles já usa a L300.
- O aviso sobre o terminal **A910S** (aplicação base da Phoebus ainda em desenvolvimento, sem data) não vale para a L300.
- No portal de produção da PayStore existe o rascunho **Livefood** (categoria Utilitários), com a
  API de Pagamentos marcada. ID do aplicativo: **5011**. O token fica só no portal e nos segredos do GitHub.
- O app de produção (`livefood-vileve-oficial.apk`) foi montado com essas credenciais e com o ícone novo.
  Falta a Vileve devolver o arquivo assinado pelo fabricante.

## Atualização (23/11/2026)

- A maquininha chegou. Ao ligar, a tela da PayStore pede o **token de configuração**.
- A Vileve confirmou pela foto que o terminal é de **produção** (não tem o aviso "userdebug" no canto da tela).
- O arquivo zip com os aplicativos de teste (debug) da Phoebus **não serve** para este terminal. Não instalar.
- Decisão: **seguir direto em produção, sem terminal de teste**. O primeiro teste do app será com
  cobrança de verdade, em valor baixo.
- Próximo passo: **credenciar o terminal no portal** para obter o token de configuração
  (perguntado à Vileve quem faz e onde o token aparece).

## Orientações da Vileve para a chegada do terminal

1. **Vincular o terminal a um lojista** (isso é feito com a Vileve).
2. A L300 pode vir com a aplicação da Phoebus em versão mais antiga. Depois de vinculada ao lojista,
   **alinhar com a Vileve a atualização** dessa aplicação no terminal.
3. Fazer as atualizações sempre no **Wi-Fi**, para não gastar o pacote de dados móveis do chip.

## Passo a passo do nosso lado

1. Ligar a maquininha e conectar no Wi-Fi.
2. Pedir à Vileve o vínculo do terminal ao lojista e a atualização da aplicação da Phoebus.
3. Subir no rascunho **Livefood** do portal o APK que a Vileve devolveu assinado
   (não o nosso arquivo original) e as imagens (ícone, capa e capturas de tela).
4. Publicar o aplicativo e aguardar a aprovação.
5. Instalar o LiveFood no terminal pelo portal.
6. Primeiro teste com valor baixo (R$ 1,00) e cancelar em seguida. Testar crédito, débito e Pix.
7. Conferir se a venda aparece no painel LiveBank.

## Cuidados

- **Não excluir nem recriar o rascunho** do portal: as credenciais mudam e o app precisa ser montado
  e assinado de novo.
- Qualquer alteração no app da maquininha depois da assinatura exige nova assinatura da Vileve.
- O token de pagamento e o arquivo de assinatura (`.jks`) e sua senha nunca são enviados em conversa,
  e-mail ou grupo.

## Pendências

- Vileve devolver o APK assinado.
- Confirmar com a Vileve como o terminal fica vinculado à nossa conta no portal para receber o app.
- Decidir se os estados "recusado" e "cancelado" da tela de cobrança ganham texto fixo
  (exige novo arquivo e nova assinatura).
