/** Os poucos arquivos estáticos, servidos da memória: favicon e o JS de tela. */
import { FAVICON_SVG } from "../marca.ts";
import type { Resposta } from "./resposta.ts";

/** Progressivo: confirmação dupla em botões perigosos e envio único de formulários. */
const APP_JS = `
document.addEventListener('submit',function(ev){var f=ev.target;
  if(f.dataset.enviado){ev.preventDefault();return}
  f.dataset.enviado='1';var b=f.querySelector('button[type=submit],button:not([type])');
  if(b)setTimeout(function(){b.disabled=true},0);
});
document.addEventListener('click',function(ev){var b=ev.target.closest('[data-confirmar]');
  if(!b)return;
  if(!b.dataset.ok){ev.preventDefault();b.dataset.ok='1';b.dataset.texto=b.textContent;
    b.textContent='Tem certeza? Clique de novo';
    setTimeout(function(){if(b.dataset.ok){delete b.dataset.ok;b.textContent=b.dataset.texto}},4000);
  }
});
`;

const CACHE = "public, max-age=86400";

export function estatico(nome: string): Resposta | null {
  if (nome === "icone.svg") return { status: 200, cabecalhos: { "content-type": "image/svg+xml", "cache-control": CACHE }, corpo: FAVICON_SVG };
  if (nome === "app.js") return { status: 200, cabecalhos: { "content-type": "text/javascript; charset=utf-8", "cache-control": CACHE }, corpo: APP_JS };
  return null;
}
