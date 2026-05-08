APP: Pedidos de Produtos dos Funcionários - Inno Life

FUNCIONALIDADES:
- Funcionário lança pedido: nome, produto e quantidade.
- Lista geral com todos os pedidos.
- Check para marcar pedido conferido/separado.
- Resumo consolidado por produto.
- Busca por funcionário ou produto.
- Editar, excluir, limpar lista e imprimir/PDF.
- Conectado ao Supabase usando os dados enviados.
- Se a tabela ainda não existir, ele entra em modo local automaticamente.

COMO CONFIGURAR O SUPABASE:
1. Entre no Supabase.
2. Abra o projeto informado.
3. Vá em SQL Editor.
4. Cole todo o conteúdo do arquivo supabase.sql.
5. Clique em Run.
6. Abra o arquivo index.html ou hospede no Vercel/Netlify.

ARQUIVOS:
- index.html: tela do app.
- style.css: visual premium.
- app.js: sistema conectado ao Supabase.
- supabase.sql: criação da tabela e permissões.

OBSERVAÇÃO:
A chave usada é publishable/anon, própria para frontend. Nunca coloque service_role no app.
