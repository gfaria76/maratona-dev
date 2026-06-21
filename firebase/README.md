# Firebase

Este diretório guarda a configuração Firebase do projeto.

- Firestore guarda maratonas, questões, testes secretos, sessões, bloqueios, eventos e submissões.
- Firebase Auth faz o login Google.
- App Hosting pode rodar o Nuxt/Nitro em produção.
- Firebase Hosting estático sozinho não executa as APIs Nitro em `server/api`.

Fluxo base:

```bash
pnpm build
pnpm firebase:seed
pnpm firebase:deploy:rules
pnpm firebase:deploy:apphosting
```

O seed escreve no Firestore remoto do projeto em `FIREBASE_PROJECT_ID`.
As regras do Firestore bloqueiam CRUD direto pelo client; as APIs Nitro usam Firebase Admin SDK e não dependem dessas regras.

Antes da produção, habilite o provider Google no Firebase Authentication e configure as variáveis `NUXT_PUBLIC_FIREBASE_*` no ambiente do App Hosting.
