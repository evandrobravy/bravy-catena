# Integração UnniChat → Dashboard

A Catena migrou a captação de leads do Go High Level para o **UnniChat**
(29–30/07). Este documento registra o que a plataforma expõe, o que já está
pronto do nosso lado e o que depende deles.

## O que é o UnniChat

Plataforma brasileira de WhatsApp/Instagram com CRM e automações.
`unnichat.com.br` é **whitelabel do SendFlow** (`sendflow.com.br` — o bundle do
app ainda referencia `suporte.sendflow.com.br`). O app é um SPA em Vite com
autenticação **Firebase** (projeto `plataforma-unnichat-meta`, login via
`identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`).

### O que dá pra integrar

Levantado pelo bundle do app (`/assets/index-*.js`), já que não existe
documentação pública de API:

- **Webhooks de saída** — módulo completo: criar, editar, arquivar, importar de
  outra conexão, e converter fluxo de webhook em automação. Existe ação de
  automação para "notificar outro sistema" (`notify-another-system-webhook`,
  `send-webhook`), que é o caminho que interessa: a plataforma faz POST num
  endpoint nosso quando o lead entra.
- **API key por conexão** — a UI tem "gerar API key", "copiar API key" e
  "API key por conexão", ou seja, dá pra puxar dado ativamente também.

Conclusão: a integração é viável **sem depender do fornecedor**, configurando na
própria conta deles.

## Estado do acesso (bloqueio atual)

As credenciais que a Eliane mandou no grupo em 30/07 autenticam
(`signInWithPassword` responde 200), mas a conta tem **2FA por e-mail**: a tela
pede um código de 6 dígitos enviado para `eliane.adm@catena.adv.br`. Sem esse
código não dá pra entrar e configurar.

Saídas possíveis, em ordem de preferência:

1. Alguém da Catena com acesso a esse e-mail passa o código no momento em que
   formos entrar (o código expira, então tem que ser combinado ao vivo).
2. Eles criam um usuário nosso na conta do UnniChat, com e-mail nosso — resolve
   de vez, sem depender de código de terceiro.
3. Eles mesmos configuram o webhook seguindo o passo a passo abaixo.

## O que já está pronto do nosso lado

Endpoint receptor de leads, no mesmo padrão do que tinha sido feito pro GHL:

- `POST /api/webhooks/unnichat?token=<UNNICHAT_WEBHOOK_TOKEN>`
- `api/src/unnichat/mappers/lead.mapper.ts` — mapper tolerante: aceita o contato
  na raiz do JSON ou dentro de `contact` / `lead` / `data` / `contato`, e várias
  grafias de cada campo (pt e en). Não lança: payload irreconhecível responde
  200 e vai pro log, pra não gerar retry storm do lado deles.
- `api/src/sync/unnichat-sync.service.ts` — upsert idempotente por `externalId`.
- Coluna `Lead.externalId` (migration `20260806151500_lead_external_id`), com
  `fonte = "unnichat"`. Os painéis Comercial/Closer contam lead independente da
  fonte, então o número passa a refletir a realidade assim que ligar.

Telefone é normalizado pra DDI+DDD+número antes de virar chave, senão
`(21) 97777-6666` e `+55 21 97777-6666` entrariam como dois leads.

## Passo a passo para configurar no UnniChat

1. Entrar no UnniChat com a conta admin.
2. Ir em automações/webhooks e criar um webhook de saída ("notificar outro
   sistema").
3. Gatilho: entrada de novo contato/lead (ou mudança de etapa, se quiserem
   acompanhar o funil).
4. URL de destino:
   `https://catena-api.bravy.com.br/api/webhooks/unnichat?token=<TOKEN>`
   (o token vai na URL porque a UI nem sempre deixa customizar header; se
   deixar, pode mandar em `x-webhook-token`).
5. Método `POST`, corpo em JSON. Corpo recomendado:

```json
{
  "id": "{{contato.id}}",
  "nome": "{{contato.nome}}",
  "telefone": "{{contato.telefone}}",
  "email": "{{contato.email}}",
  "origem": "{{contato.origem}}",
  "atendente": "{{contato.atendente}}",
  "etapa": "{{contato.etapa}}",
  "criado_em": "{{contato.criado_em}}"
}
```

Os nomes das variáveis mudam conforme a UI da plataforma; o mapper aceita
variações, e o único campo realmente obrigatório é `id` **ou** `telefone`.

## Pendente de decisão da Catena

O pedido original foi "integrar o UnniChat com o ClickUp". O que está pronto
leva o lead direto pro dashboard. Levar **também** pro ClickUp (criando task na
list `Palestras & Seminários`) é um passo a mais e precisa da definição deles:
em que list, com quais campos preenchidos e em que status o lead entra. Enquanto
isso não for definido, não faz sentido escrever no ClickUp deles.
