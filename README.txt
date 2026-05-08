PEDIDOS DE PRODUTOS - INNO LIFE

Versão com acesso livre para funcionários + Admin com Login Supabase.

Funcionários sem senha podem:
- fazer pedidos
- ver lista atual
- ver consolidado por produto

Somente Admin pode:
- marcar check/conferido
- editar pedido
- excluir pedido
- limpar lista
- salvar lista atendida com data
- ver histórico
- cadastrar/remover produtos
- imprimir/PDF

PASSO A PASSO:
1. Rode o arquivo supabase.sql no Supabase.
2. No Supabase, vá em Authentication > Users > Add user.
3. Crie seu e-mail e senha de admin.
4. Abra o app normalmente.
5. Funcionários usam sem senha.
6. Para liberar admin, clique em "Entrar como admin" no menu e informe e-mail/senha.

IMPORTANTE:
O app usa Row Level Security do Supabase:
- anon: só pode ler e criar pedidos.
- authenticated: pode usar as funções administrativas.


CONTROLE DE ACESSO CORRIGIDO:
- O sistema sempre abre como Funcionário.
- Funcionário não vê botões administrativos.
- Funcionário pode apenas adicionar pedido, ver lista e consolidado.
- Para liberar funções administrativas, clique em Entrar como admin e use o usuário criado em Supabase > Authentication > Users.
- Se o navegador antigo ficou com login salvo, clique em Sair do admin ou limpe o cache/localStorage.
