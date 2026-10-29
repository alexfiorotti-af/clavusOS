# Identidade visual — "Amêndoa & Verniz"

> O desenho mora em **`app/src/marca.ts`** e em mais lugar nenhum: favicon, cabeçalho do app,
> e-mails, PDFs e a vitrine importam de lá. Mudou a marca? Muda lá e roda
> `node scripts/gerar-marca.mjs` (os arquivos saem em `docs/marca/`).

## O símbolo

A **unha amêndoa** — o formato-assinatura do ofício — construída em geometria na grade 96:
base redonda e ponta afinada (duas cúbicas espelhadas), inclinada a **−20°** como a mão
apoiada na mesa da nail designer. Dentro, a **lúnula** (a meia-lua da base da unha — o
detalhe que só quem é do nicho reconhece). Na ponta, a **gota de verniz** dourada — o brilho
do topo recém-aplicado.

Versões: traço (`simbolo`), preenchida para tamanhos pequenos (`simboloCheio`), selo em anel
(`selo`), logotipo horizontal com o wordmark (`logoHorizontal`) e o favicon (`FAVICON_SVG`).

## Cores

| Nome | Hex | Uso |
|---|---|---|
| Esmalte | `#E91E8C` | primária — botões, traço do símbolo, gradiente com a Orquídea |
| Orquídea | `#9C27B0` | secundária — o par do gradiente, acentos |
| Verniz | `#B8860B` | **raro e precioso**: a gota, preços e totais — e mais nada |
| Verniz claro | `#FFE082` | a gota e os destaques sobre fundo escuro |
| Ameixa | `#2D1B2E` | texto e o único fundo escuro da marca |
| Ameixa suave | `#7A6B7D` | texto secundário |
| Pó de Arroz | `#FFF7FB` | o fundo da casa |
| Pétala | `#FCE4F1` | chips, a lúnula preenchida |

## Tipografia

- **Fraunces** (Google Fonts) — display: wordmark, títulos da vitrine, capas e materiais. Peso 600, letter-spacing levemente negativo. Sem Fraunces, cai em Georgia.
- **Poppins** — tudo o mais: o app inteiro, botões, corpo de texto.

## Regras de uso

1. O dourado só aparece na gota, em preços e totais. Em excesso, deixa de ser precioso.
2. Sobre fundo escuro (Ameixa ou gradiente), a gota é Verniz claro e o traço pode ser Esmalte ou Pó de Arroz.
3. Não esticar, não girar além dos −20°, não recolorir fora da paleta, não redesenhar à mão.
4. O white-label é do studio: dentro do app vale a cor do studio (`studios.cor`); a marca ClavusOS
   aparece no rodapé ("com tecnologia ClavusOS") e nos materiais do produto.

## Arquivos (`docs/marca/`)

`simbolo.svg` · `simbolo-noturno.svg` · `simbolo-cheio.svg` · `logo-horizontal.svg` ·
`logo-horizontal-noturno.svg` · `selo.svg` · `favicon.svg` · PNGs (512 e 1200) · `prancha.png`
(a prancha-resumo da identidade).
