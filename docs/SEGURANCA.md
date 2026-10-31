# Segurança do ClavusOS

Auditoria e verificação contínua de integridade e segurança dos dados. Rode o verificador
sempre que mexer no sistema e antes de cada publicação:

```
cd app && npm run verificar
```

Sem banco, ele roda só as checagens de código e repositório. Com `CLAVUS_DATABASE_URL`
apontando para uma **cópia de teste** (nunca a produção na primeira vez), ele também prova o
isolamento entre studios e a integridade dos dados ao vivo. Sai com código de erro se algo falhar.

Última auditoria completa: **30/10/2026** — 27 checagens, 0 falhas.

## O que o verificador cobre

### Código
- Nenhuma SQL monta valor por interpolação de string (tudo por parâmetro `$1,$2…` ou allowlist).
- O único `UPDATE` com coluna dinâmica (`studios-admin`) tranca o nome da coluna numa allowlist.
- O fuso do studio é validado por regex antes de entrar no `SET LOCAL TIME ZONE`.
- Cabeçalhos de segurança presentes: CSP (`script-src 'self'`, sem inline), `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`.
- Cookie de sessão: `HttpOnly` + `SameSite=Lax` + `Secure` (em produção).
- Senha com `scrypt`, sal por senha e comparação em tempo constante; token de sessão guardado só como hash.
- Freio de login: 6 tentativas por e-mail em 15 min.
- Webhooks exigem token (comparação tempo-constante) e **não baixam conta** — só confirmam na API do Asaas.
- Teto de corpo na requisição (anti-DoS).
- Boot falha fechado se faltar variável de ambiente obrigatória.
- Nenhuma chave real embutida no código.
- `tsc --noEmit` sem erros.

### Repositório (GitHub)
- Nenhum arquivo de segredo versionado (só `.env.exemplo`).
- `.gitignore` cobre `.env` e `.env.*`.
- Nenhum `.env` real jamais passou pelo histórico do Git.
- `.env.exemplo` só tem exemplos, nenhum segredo real.
- `npm audit`: 0 vulnerabilidades (dependência única: `pg`).

### Banco (RLS e integridade)
- RLS **ligado e forçado** (FORCE) nas 18 tabelas de dado; `studios`/`migracoes` fora de propósito.
- Toda tabela isolada tem a coluna `studio_id`.
- **Prova ao vivo**: `clavus_app` no contexto do studio A não lê nenhuma linha do studio B.
- **Prova ao vivo**: sem studio no contexto, `clavus_app` não lê nada.
- Integridade: sem dinheiro negativo, sem estoque negativo, sem agendamento/sessão órfãos,
  e nenhum choque de horário fora de encaixe (a trava `sem_choque` do banco segura).

## Testes de invasão feitos (e por que seguram)

Estes são os vetores que um atacante — pessoa ou outra IA — tentaria, e o que o impede:

| Tentativa | O que impede |
|---|---|
| Ler/gravar dados de outro studio | **RLS FORCE** em toda tabela; a app roda como `clavus_app`, presa ao `studio_id` do contexto. Provado ao vivo pelo verificador e pelos testes `banco.teste.ts`. |
| Injeção de SQL por campo ou URL | Todas as consultas são parametrizadas; a única coluna dinâmica usa allowlist; o fuso é validado por regex. |
| Forjar pagamento por webhook | O webhook **nunca baixa conta**: ele confere a cobrança na API do Asaas. Além disso exige token na URL. |
| Chamar a rotina/renovar-demo/exportar sem permissão | Exigem `CLAVUS_CHAVE_ROTINA` com comparação em tempo constante; sem ela, 401. |
| Força bruta de senha | Freio de 6 tentativas por e-mail em 15 min; senha por `scrypt`; resposta em tempo constante não revela se o e-mail existe. |
| Roubar a sessão | Cookie `HttpOnly` + `Secure` + `SameSite`; o banco guarda só o hash do token; expira em 12 h de inatividade. |
| Clickjacking / embutir o app num iframe | `X-Frame-Options: DENY` e `frame-ancestors 'none'`. |
| XSS | Saída escapada (`e()`); CSP sem `script-src` inline nem externo. |
| Derrubar por corpo gigante | Teto de corpo com `req.destroy()`. |
| Ler o banco roubado (dump) | Senha e token só em hash; chave do Asaas do studio cifrada em AES-256-GCM com a chave-mestra, que **não** fica no banco. |
| Escalar papel (profissional virar gerência) | Políticas RESTRICTIVE por papel no banco, não só na tela: profissional não lê o caixa nem altera preços. |

## Checagem na Hostinger (manual, a cada publicação)

O verificador cobre código e banco, mas o ambiente de produção depende de configuração que só
você vê no painel. Confira:

1. **Variáveis de ambiente sem valor em branco.** Linha em branco = valor vazio. Em especial:
   - `CLAVUS_CHAVE_MESTRA` — 64 hex; se mudar, os segredos cifrados não abrem mais.
   - `CLAVUS_CHAVE_ROTINA` — obrigatória em produção; sem ela o app se recusa a subir.
   - `CLAVUS_ASAAS_AF_AMBIENTE` — `producao` com chave `aact_prod_…` (em branco cai em sandbox).
   - `CLAVUS_ASAAS_AF_WEBHOOK_TOKEN` e o token do webhook do studio — defina e confira no painel do Asaas.
   - `PORT` — preenchida (em branco vira 0 e o app não sobe).
   - `CLAVUS_STUDIO_PADRAO` — **vazia** em produção (senão todo domínio cai num studio fixo).
2. **HTTPS ligado** no domínio e no curinga `*.clavusos.com.br`, com redirecionamento de HTTP para HTTPS.
3. **A chave-mestra e as chaves do Asaas não estão em nenhum arquivo do repositório** — só no painel.
4. **Backups**: a rota `/rotina/exportar` (com a chave) gera o JSON de cada studio. Guarde fora da Hostinger.
5. **Acesso ao painel da Hostinger e ao GitHub com 2FA ligado** — é por aí que alguém entraria sem tocar no código.
6. Rode `/saude` depois de publicar: deve responder `{"ok":true}`.

## O que ficou como recomendação (não bloqueia)

- Revisão da Política de Privacidade e dos Termos por um advogado antes de escalar a divulgação.
- Avaliar um freio por IP (além do freio por e-mail) se houver abuso de login distribuído.
- Girar periodicamente os tokens de webhook e a chave de rotina.
