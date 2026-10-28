# Publicar o site da LiveFood no GitHub Pages

Tudo desta pasta vai para a **raiz** do repositório que publica `livefood.tec.br` (onde já estão `painel.html`, `admin.html` etc.).

| Arquivo | O que é |
|---|---|
| `index.html` + pasta `site/` | Site institucional novo (substitui a página "giro-os" de hoje) |
| `livefood-logo.png`, `livefood-logo-branca.png` | Logo só com a escrita, sem o ícone (substituem as atuais; todas as telas de login usam esses dois arquivos) |
| `painel.html` | Painel com o ajuste do tamanho da logo no rodapé do menu lateral |
| `.nojekyll` | Diz ao GitHub Pages para publicar os arquivos como estão (sem processar com Jekyll) |

## Pelo site do GitHub
1. Abra o repositório → **Add file → Upload files**.
2. Arraste **o conteúdo** desta pasta (não a pasta em si), inclusive a pasta `site`.
3. **Commit changes** na branch publicada (normalmente `main`).
4. Em 1 a 2 minutos `https://livefood.tec.br` mostra o site novo. Se não aparecer, recarregue com Ctrl+F5.

> No Windows, o `.nojekyll` fica oculto. Se ele não subir, crie pelo GitHub: **Add file → Create new file**, nome `.nojekyll`, conteúdo vazio, commit.

## Pela linha de comando
Copie o conteúdo desta pasta para a raiz do clone do repositório e rode:
```
git add .
git commit -m "Site institucional LiveFood + logo só com a escrita"
git push
```

## Domínio
O `livefood.tec.br` já aponta para o GitHub Pages deste repositório. Não é preciso mudar o DNS. Confira só em **Settings → Pages** se o domínio personalizado continua `livefood.tec.br` e se "Enforce HTTPS" está ligado.
