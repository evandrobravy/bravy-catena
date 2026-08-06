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

## Acesso (resolvido)

A conta tem **2FA por e-mail** (código de 6 dígitos pra `eliane.adm@catena.adv.br`
a cada login). O plano deles só permite 3 usuários, então não deu pra criar um
usuário nosso — a Eliane passou o código no grupo e entramos.

Pra não depender do código a cada acesso, a sessão foi salva num **perfil
persistente do Chromium** em `~/.credentials/clients/.unnichat-catena-profile`
(inclui o IndexedDB do Firebase). Próximos acessos reusam a sessão sem 2FA
enquanto o refresh token valer. Script: `keeper.js` (mantém o browser logado com
CDP na 9222) + `driver.js` (dirige passo a passo). Se a sessão expirar, é só
pedir um código novo à Eliane.

## Integração (CONCLUÍDA e no ar — 06/08)

Feito **pelo lado deles**, via automação de saída, sem tocar nos 2 webhooks de
entrada nem nas 6 automações que já existiam:

- Automação **"Bravy - Leads para o Dashboard"** (Automações → Ativado).
  - Gatilho: **Contato criado** (`created-contact`) — dispara pra todo contato
    novo que entra no UnniChat.
  - Ação: **Requisição HTTP** `POST` pra
    `https://catena-api.bravy.com.br/api/webhooks/unnichat?token=<UNNICHAT_WEBHOOK_TOKEN>`,
    enviando os dados do contato no corpo.
- Template exportado salvo em `docs/unnichat-automacao-template.json` (pra
  recriar por importação se precisar: modal Adicionar automação → Importar
  Template JSON).

**Verificado em produção (06/08):** contatos reais ("Juliana", "Celso Chagas")
entraram no UnniChat, dispararam a automação e caíram no dashboard —
`fonte = "unnichat"`, painel Comercial passou a contar.

### Shape real do payload (capturado em prod)

O body padrão do POST (método POST → "enviando os dados do contato no corpo"):

```json
{
  "contact": {
    "id": "019fd812-...",              // UUIDv7 → externalId
    "name": "...", "email": "...",
    "phoneNumber": "5521999990002",
    "tags": "Seminário 01, Qualificado", // STRING separada por vírgula
    "fields": { "utm_campaign": "...", "Seminário": "...", "Qualificação": "..." },
    "instaName": "", "profilePicUrl": ""
  },
  "event_date": 1786036543,             // epoch s
  "triggerData": {}
}
```

Não precisou de body customizável — o padrão já traz tudo. O mapper
(`lead.mapper.ts`) lê:
- telefone de `phoneNumber` (normalizado DDI+DDD);
- **seminário** = campo explícito (`seminario`/`origem`) → `fields.utm_campaign`/
  `fields.utm_source` → 1ª tag (ordem de prioridade). O UnniChat NÃO tem um
  campo "Seminário 01/02" fixo; a origem vive nas **tags** (campanha) e nos
  **UTMs**. Testado em prod: utm_campaign="dividendos-julho" → seminário=isso;
  tag "Seminário 01" → seminário="Seminário 01".
- closer e status também olham os `fields` (Qualificação, atendente).

Leads que entram sem tag/UTM ficam com seminário vazio (ex.: Juliana/Celso, que
vieram sem campanha). Conforme o time taggeia/UTMa os leads, o seminário popula
sozinho. Se quiserem normalizar pra "01/02", é regra de negócio: dá pra mapear
tag/UTM→seminário no mapper depois que eles definirem a convenção.

## Como estava o acesso antes (histórico)

As credenciais que a Eliane mandou no grupo em 30/07 autenticam no Firebase, mas
a tela trava no código de 6 dígitos. Reiniciar o login queima o código anterior —
por isso o fluxo automatizado dispara o login uma vez e fica só alimentando o
código que a Eliane manda no grupo.

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

**No ar desde 06/08** (commits `ae98fa1` e `d5c9b3b`). Testado em produção: sem
token e com token errado dá 403; payload válido grava o lead; reenvio do mesmo
contato não duplica; payload irreconhecível responde `{ok:true,skipped:true}`.
O valor do `UNNICHAT_WEBHOOK_TOKEN` está na env do Coolify e em
`~/.credentials/clients/.catena_unnichat_token.tmp`.

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
