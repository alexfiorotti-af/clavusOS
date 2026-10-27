/** Entrar, primeiro acesso e definição de senha por convite. */
import { e } from "../http/resposta.ts";
import { pagina, type Aviso } from "./base.ts";
import type { Studio } from "../studio/studio.ts";

export function telaEntrar(studio: Studio, avisos: Aviso[] = [], email = ""): string {
  return pagina({ titulo: "Entrar", studio, usuario: null, avisos, conteudo: `
<div class="entrada"><div class="cartao">
  <h1>Entrar 💅</h1>
  <form method="post" action="/entrar">
    <div class="campo"><label>E-mail</label><input name="email" type="email" value="${e(email)}" required autofocus></div>
    <div class="campo"><label>Senha</label><input name="senha" type="password" required></div>
    <div class="acoes"><button>Entrar</button> <a class="mudo" href="/senha/esqueci">esqueci a senha</a></div>
  </form>
</div></div>` });
}

export function telaPrimeiroAcesso(studio: Studio, avisos: Aviso[] = []): string {
  return pagina({ titulo: "Primeiro acesso", studio, usuario: null, avisos, conteudo: `
<div class="entrada"><div class="cartao">
  <h1>Bem-vinda ao ${e(studio.nome)} ✨</h1>
  <p class="mudo">Este studio ainda não tem administradora. Crie a conta da dona:</p>
  <form method="post" action="/primeiro-acesso">
    <div class="campo"><label>Seu nome</label><input name="nome" required autofocus></div>
    <div class="campo"><label>E-mail</label><input name="email" type="email" required></div>
    <div class="campo"><label>Senha (mínimo 8 caracteres)</label><input name="senha" type="password" minlength="8" required></div>
    <div class="acoes"><button>Criar e entrar ✨</button></div>
  </form>
</div></div>` });
}

export function telaDefinirSenha(studio: Studio, token: string, nome: string, avisos: Aviso[] = []): string {
  return pagina({ titulo: "Criar senha", studio, usuario: null, avisos, conteudo: `
<div class="entrada"><div class="cartao">
  <h1>Oi, ${e(nome.split(" ")[0])}! 💖</h1>
  <p class="mudo">Crie a sua senha de acesso ao ${e(studio.nome)}:</p>
  <form method="post" action="${e("/convite/" + token)}">
    <div class="campo"><label>Senha (mínimo 8 caracteres)</label><input name="senha" type="password" minlength="8" required autofocus></div>
    <div class="campo"><label>Repita a senha</label><input name="senha2" type="password" minlength="8" required></div>
    <div class="acoes"><button>Salvar e entrar ✨</button></div>
  </form>
</div></div>` });
}
