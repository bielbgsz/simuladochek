# SimulaCheck V2

Versão melhorada do SimulaCheck, feita para continuar simples e funcionar como site estático na Vercel.

## O que mudou

- Importação de PDF do simulado.
- Importação de PDF do gabarito.
- Extração de texto com PDF.js.
- Parser de gabarito em formatos como `1-A`, `1 A`, `1) A` e sequências `A B C D`.
- Importação rápida das respostas por texto.
- Geração automática da grade de questões.
- Correção automática.
- Dashboard de acertos, erros e aproveitamento.
- Desempenho por matéria.
- Ranking de assuntos com mais erros.
- Diagnóstico automático.
- Filtros por status e matéria.
- Histórico e evolução.
- Modo claro/escuro.
- Relatório de impressão.
- Armazenamento em localStorage.
- Sem backend, sem login e sem banco.

## Importante sobre PDFs escaneados

Esta versão usa extração de texto do PDF no navegador. PDFs que são apenas imagens/escaneamentos podem não possuir texto selecionável. Nesses casos será necessário adicionar OCR em uma próxima versão.

## Estrutura

```text
simulachek/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── README.md
```

## Vercel

Este projeto é estático. Basta subir a pasta para o GitHub e importar o repositório na Vercel.

## Próxima evolução recomendada

1. OCR para PDFs escaneados.
2. IA para classificar automaticamente matéria/assunto.
3. Tela para editar as questões extraídas do PDF.
4. Importação de folha de respostas por imagem/PDF.
5. Banco de dados para manter histórico em vários dispositivos.
