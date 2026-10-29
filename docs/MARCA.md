# Manual de marca — "Cereja & Porcelana"

> O desenho mora em **`app/src/marca.ts`** e em mais lugar nenhum: favicon, cabeçalho do app,
> e-mails, PDFs e a vitrine importam de lá. Mudou a marca? Muda lá e roda
> `node scripts/gerar-marca.mjs` (os arquivos saem em `docs/marca/`). Sem internet, aponte
> `FONTES_CSS` para um CSS com as fontes embutidas. Decisão: D017 (substitui a D014).

## Essência

**Quem cuida das unhas dos outros merece um sistema que cuide do studio dela.**

| Traço | O que significa |
|---|---|
| **Acolhedora** | fala como colega de bancada, nunca como programa de computador |
| **Precisa** | horário, dinheiro e cliente sempre certos; a mão firme do acabamento |
| **Direta** | o que se faz todo dia fica a um toque; o resto não aparece |

**O que o nicho repete e a ClavusOS não faz:** rosa-chiclete com dourado em tudo, letra
cursiva, flor/lábios/coroa de enfeite, degradê rosa-roxo. **No lugar:** porcelana e ameixa com
uma cor só (cereja), uma serifa macia com caráter, a própria unha como forma, brilho só no verniz.

## Símbolo — a unha amêndoa

Construído em geometria na grade de 96: lente de **dois arcos iguais** (base redonda, ponta
afinada), **inclinada a −20°** (a mão apoiada na mesa), a **lúnula** vazada na base, um
**reflexo de laca** fino e a **gota de verniz** dourada na ponta.

| Versão | Função | Onde |
|---|---|---|
| `simboloCheio()` | **principal** | logotipo, ícone, materiais (sem reflexo abaixo de 32 px) |
| `simbolo()` | traço | dentro do app, tamanhos médios |
| noturno | sobre ameixa | símbolo em cereja clara #E5739A, gota verniz claro #E3C27A |
| `selo()` | círculo cereja | perfil de WhatsApp/Instagram, carimbo |
| `FAVICON_SVG` | quadrado cereja | favicon e ícone do app |

## Logotipo

"Clavus" (unha, em latim) na **Fraunces macia** + "OS" em **cereja**, na letra do app
(Instrument Sans 600): é o sistema. Versões: horizontal (principal), empilhado, só símbolo.
**Respiro:** a altura do "C" em volta de tudo. **Mínimo:** logotipo 120 px de largura; símbolo
20 px (sem reflexo).

## Cores

| Nome | Hex | Uso | Contraste |
|---|---|---|---|
| **Cereja** | `#A8174A` | marca e ação: botão principal, símbolo, aba ativa | branco 7,3:1 |
| **Ameixa** | `#2D1B2E` | todo o texto, menu do notebook, o único fundo escuro | porcelana 14,5:1 |
| **Porcelana** | `#F7F2EF` | o fundo da casa | — |
| Papel | `#FFFFFF` | cartões, sem borda | — |
| Nude | `#EFE7E2` | apoio: seletores, avatares, embalagens | — |
| Ameixa suave | `#6B5A66` | texto de apoio | porcelana 5,8:1 |
| Pétala | `#F6E1E8` | cereja a 12%: etiquetas, botões de apoio | cereja 5,8:1 |
| **Verniz** | `#B8892E` | só a gota (em texto, `#8A620F`, só no saldo do dia) | — |

Proporção numa peça: ~56% porcelana/nude, 14% papel, 20% ameixa, 8% cereja, 2% verniz.

## Tipografia

- **Fraunces** (eixo `SOFT` 100, pesos 400–500): logotipo, títulos de tela, valores grandes.
  Uma frase por vez; nunca itálico no meio de título.
- **Instrument Sans** (400/500/600): todo o resto. Números alinhados (`tabular-nums`).
  Rótulos em letra normal, nunca CAIXA ALTA espaçada.
- Escala do app: título 32–36 · valor 28–46 · seção 16,5 · corpo 15,5 · apoio 13 · aba 11,5.

## Elementos gráficos

- **Moldura amêndoa**: fotos de unhas e clientes recortadas na amêndoa, sempre em pé.
- **Anel do ciclo**: o tempo desde a última unha em volta da foto; enche até a data de voltar,
  vermelho quando vence (`anelCiclo()` em `telas/base.ts`).
- **Linha do dia**: atendimentos como pílulas no tom de cada profissional; linha cereja no agora.
- **Padrão de amêndoas**: tom sobre tom, para impressos e embalagem; nunca com texto em cima.

## Voz

| Onde | Assim não | Assim sim |
|---|---|---|
| Lembrete | Prezada cliente, identificamos inatividade | Oi, Mariana! Já faz 3 semanas da sua unha. Bora marcar a manutenção? |
| Botão | Submeter | Agendar e avisar no WhatsApp |
| Conflito | Erro 409: conflito de agendamento | A Lia já tem cliente às 14h. Quer marcar como encaixe? |
| Vazio | Nenhum registro encontrado | Ninguém marcado para amanhã ainda. Que tal chamar quem está com a unha vencida? |
| Situação | STATUS: PENDENTE | A confirmar |

Emoji pode aparecer nas **mensagens para a cliente** (WhatsApp), nunca como ícone da interface.

## White-label

Dentro do app vale o nome, o logo e a **cor de esmalte do studio** (`studios.cor`); porcelana,
ameixa, letras e desenho das telas não mudam. A ClavusOS aparece no rodapé ("com tecnologia
ClavusOS") e nos materiais do produto.

## Não faça

Esticar ou achatar · girar além dos −20° · degradê · cor fora da paleta · trocar a letra ou pôr
sombra · cereja sobre cereja · redesenhar à mão fora de `marca.ts`.

## Arquivos (`docs/marca/`)

`simbolo.svg` (cheio) · `simbolo-traco.svg` · `simbolo-noturno.svg` · `simbolo-cheio.svg` ·
`logo-horizontal.svg` · `logo-horizontal-noturno.svg` · `selo.svg` · `favicon.svg` · PNGs ·
`prancha.png` (a prancha-resumo).
