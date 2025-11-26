# Backend local (Node.js + SQLite) para Form Engie

Instruções rápidas para rodar o servidor local que recebe os registros do formulário e os salva em SQLite.

Pré-requisitos:
- Node.js 14+ instalado

Instalação e execução:

1. Abra um terminal na pasta do projeto (`c:\Users\windows\Desktop\form.engie`).
2. Instale dependências:

```powershell
npm install
```

3. Inicie o servidor:

```powershell
npm start
```

O servidor por padrão roda em `http://localhost:3000`.

Endpoints úteis:
- `POST /api/rondas` — aceita JSON com o registro e salva no banco.
- `GET /api/rondas` — lista registros (com query `?limit=100`).
- `GET /api/rondas/:id` — obtém registro específico (inclui checklist e fotos).
- `DELETE /api/rondas/:id` — remove registro.

Observações:
- O servidor serve também os arquivos estáticos da pasta do projeto, então você pode abrir `http://localhost:3000/index.html`.
- Fotos são armazenadas como JSON (dataURLs) — para uso real recomenda-se upload para armazenamento dedicado.
