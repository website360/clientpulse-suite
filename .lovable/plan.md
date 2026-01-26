
# Configuração do Projeto para Usar Exclusivamente npm

## Objetivo
Remover todos os arquivos relacionados ao Bun e configurar o projeto para usar apenas npm como gerenciador de pacotes, resolvendo o erro de deploy na Digital Ocean.

## Alterações Necessárias

### 1. Remover arquivos de lock do Bun
Deletar os seguintes arquivos do repositório:
- `bun.lock`
- `bun.lockb`

### 2. Atualizar o .gitignore
Adicionar os arquivos de lock do Bun ao `.gitignore` para prevenir que sejam adicionados novamente no futuro:

```text
# Bun lock files (projeto usa npm)
bun.lock
bun.lockb
```

## Arquivos Mantidos (Já Configurados Corretamente)
- `package-lock.json` - arquivo de lock do npm (mantido)
- `Procfile` - já usa `npm start`
- `package.json` - já tem o script `start: node server.cjs`

## Resultado Esperado
Após essas alterações:
1. O repositório terá apenas `package-lock.json` como arquivo de lock
2. A Digital Ocean não mostrará mais o erro de múltiplos lock files
3. O projeto estará padronizado para usar npm

## Detalhes Técnicos
| Item | Ação |
|------|------|
| `bun.lock` | Deletar |
| `bun.lockb` | Deletar |
| `.gitignore` | Adicionar entradas para ignorar arquivos Bun |
| `package-lock.json` | Manter (sem alterações) |
| `Procfile` | Manter (já usa npm) |
