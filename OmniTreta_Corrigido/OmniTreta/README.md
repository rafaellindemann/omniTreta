# OmniTreta — MVP 0.1

React + Vite + JavaScript (sem TypeScript). Primeiro universo: DinoTreta, 16 personagens, imagens WebP ou emojis.

## Rodar

```bash
npm install
npm run dev
```

Para publicar: `npm run build` e hospedar `dist/` em um serviço com fallback SPA para `index.html`. GitHub Pages precisa de configuração de fallback para rotas `/u/:id` (ou hospedagem com rewrites, como Vercel).

## Recursos já implementados

- Catálogo de universos (`public/catalog.json`) e URLs `/u/dinotreta`.
- Universo externo: coloque uma URL HTTPS absoluta no campo `url` do catálogo; o servidor precisa permitir CORS. JSON deve seguir o schema de `public/universes/dinotreta/universe.json`.
- Cache do JSON no `localStorage`; imagens no Cache Storage; Service Worker para arquivos visitados. **O primeiro acesso exige conexão**. Em desenvolvimento, o funcionamento offline pode diferir da versão publicada.
- PvE, PvP local, times de 1 a 6, guia com atributos, habilidades e efeitos, seleção de alvos, cronômetro configurável e ataque automático básico quando expira.
- Motor JS independente da interface, com efeitos referenciados por ID e interações fogo/gelo/veneno, dano em área dividido e atraso de iniciativa.
- `npm test` para testes de regras.

## Ainda não implementado

- Salas PvP online e Supabase (não foram criadas tabelas). **Toda futura tabela deve começar com `treta_`**.
- Download completo e gerenciamento de pacotes de universos de terceiros (no momento, o catálogo é lido do arquivo publicado com o app e o cache de imagens é best-effort).
- Interface de criação de universos, importação de JSON local, efeitos visuais avançados e balanceamento extensivo.
- Validação forte do schema e assinatura/autenticidade de universos externos.

## Notas de segurança para PvP online

Não confiar no cronômetro nem nos resultados de combate enviados pelo navegador. O servidor deverá validar ações, gerar aleatoriedade e controlar prazos; persistir snapshots/eventos para reconexão.


## Correção de navegação
A rota `/u/dinotreta` agora é lida pelo endereço atual via `useLocation`. Antes, `useParams` era usado fora de uma rota parametrizada, e por isso o ID do universo ficava indefinido.

Durante `npm run dev`, o Service Worker não é registrado para evitar cache antigo de código durante desenvolvimento. Se você já abriu a versão anterior, em DevTools → Application → Service Workers, remova o registro antigo e recarregue.
