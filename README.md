# The Bible Game — PoC

Plataforma 2D estilo Super Mario com missões inspiradas em histórias bíblicas.

## Como rodar

Abra `index.html` diretamente no navegador (duplo clique), ou sirva a pasta:

```
python3 -m http.server 8000
# depois acesse http://localhost:8000
```

Não há build, não há dependências.

## Missões (PoC)

1. **Jonas** — fuga, tempestade, grande peixe, Nínive (Jonas 1–3).
2. **Davi** — cinco pedras lisas e confronto com Golias (1 Samuel 17).
3. **Moisés** — Mar Vermelho, Mara, maná, rocha (Êxodo 14–17).
4. **Paulo** — naufrágios, Filipos, Atenas, Roma (Atos + epístolas).

Cada pergaminho coletado abre um painel com o versículo e contexto educativo.

## Controles

- `←` / `→` ou `A` / `D` — andar
- `Espaço` / `↑` / `W` — pular
- `P` — pausar
- `Enter` — fechar o painel do pergaminho

## Mecânicas

- Pulo com gravidade e inércia
- Plataformas fixas e flutuantes
- Inimigos patrulham e são derrotados pisando em cima (estilo Mario)
- Espinhos e água são hazards: tirar vida
- Chefe (Golias) na missão de Davi — 3 acertos pelo topo
- Bandeira final (G) conclui a missão; no estágio de Davi é preciso derrotar o gigante antes

## Estrutura

- `index.html` — markup + overlays (menu, pergaminho, fim de missão, game over)
- `style.css` — tema escuro com acentos dourados
- `levels.js` — dados das 4 missões (mapa em ASCII + pergaminhos com versículos)
- `game.js` — engine (física, colisão, render, inimigos, HUD)

## Próximos passos sugeridos

- Sprites pixel art por herói (em vez de primitivas desenhadas)
- Trilha sonora e SFX
- Mais variedade de inimigos por missão (peixe para Jonas, tempestade para Paulo)
- Modo história com diálogos entre fases
- Persistência de progresso (localStorage)
- Quiz bíblico ao final de cada missão
