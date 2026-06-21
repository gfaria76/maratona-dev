# prova-python

Sistema de prova de programação Python com autocorreção, login institucional UFMS, controle de acesso por IP e auditoria antifraude.

## Stack

- Framework: Nuxt 4 + Vue 3
- UI: Nuxt UI 4 + Tailwind CSS
- Estado: Pinia
- Auth/database: Firebase Auth + Firestore
- Backend: Nuxt Nitro
- Hosting: Firebase App Hosting
- Editor: CodeMirror 6
- Linguagem: TypeScript
- Package manager: pnpm

## Ambiente

Crie `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

Variáveis esperadas:

```bash
NUXT_PUBLIC_FIREBASE_API_KEY=
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NUXT_PUBLIC_FIREBASE_PROJECT_ID=
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NUXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

As configurações Firebase ficam na raiz do projeto: `.firebaserc`, `firebase.json`, `firestore.rules`, `firestore.indexes.json` e `apphosting.yaml`.

## Banco Firestore

O seed em `scripts/seed-firestore.mjs` cria:

- `marathons/default`
- `marathons/default/questions`
- `marathons/default/questions/{id}/tests`
- `marathons/default/allowedIpRanges`

Durante a prova, o Nitro grava sessões, bloqueios, eventos e submissões em subcoleções da maratona ativa.

## Desenvolvimento

```bash
pnpm install
pnpm dev:local
```

Para importar a maratona inicial a partir de `server/data/*.json`:

```bash
pnpm firebase:seed
```

O seed grava direto no Firestore remoto do projeto definido por `FIREBASE_PROJECT_ID`.
Para rodar localmente, configure `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`
com uma service account, ou use Application Default Credentials.

## Build e testes

```bash
pnpm test
pnpm build
```

## Rotas principais

- `/` lobby de login e início da prova
- `/confirm` fallback de autenticação
- `/prova` cockpit da prova com tela cheia e eventos antifraude
- `/admin/ip-access` painel de professores para faixas de IP, sessões, bloqueios e auditoria

## Firebase

```bash
pnpm build
pnpm firebase:deploy:rules
pnpm firebase:deploy:apphosting
```

Ainda falta habilitar o provider Google no Firebase Authentication e configurar as variáveis `NUXT_PUBLIC_FIREBASE_*` no ambiente de produção. A restrição `@ufms.br` é aplicada no app e no Nitro; o Firebase Console não substitui essa validação.

As regras do Firestore bloqueiam leitura e escrita direta pelo cliente. Todo CRUD da prova passa pelas APIs Nitro usando Firebase Admin SDK; isso evita expor testes e gabaritos no SDK web.

Para produção com SSR/API do Nuxt, o caminho configurado é Firebase App Hosting. Se você usar apenas Firebase Hosting estático, as rotas `/server/api/*` do Nitro não rodam.
