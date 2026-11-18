# pw-demowebshop

Bac à sable Playwright + TypeScript sur le [Demo Web Shop de Tricentis](https://demowebshop.tricentis.com), le site du reto Choucair.

## Installation (une seule fois)
Prérequis : Node.js 20 ou plus récent (`node -v`).

```bash
npm install
npx playwright install chromium firefox webkit
```

## Lancer les tests
| Commande | Effet |
|---|---|
| `npm test` | tous les tests, navigateur invisible |
| `npm run test:headed` | idem, en voyant le navigateur |
| `npm run test:ui` | le mode UI de Playwright (pas à pas, très pratique pour apprendre) |
| `npx playwright test --grep "@smoke"` | seulement les tests tagués `@smoke` |
| `npm run report` | ouvre le rapport HTML du dernier lancement |
| `npx playwright test --project=webkit` | un seul navigateur (`chromium`, `firefox`, `webkit`, `edge`, `mobile-chrome`, `mobile-safari`) |
| `npm run typecheck` | vérifie les types TypeScript sans lancer les tests |

## Structure
```
playwright.config.ts        configuration (baseURL, navigateur, rapport, traces)
pages/                      Page Objects
  HeaderComponent.ts        le bandeau commun : recherche
  SearchResultsPage.ts      la page de résultats
  ProductPage.ts            la fiche produit
tests/
  fixtures.ts               les fixtures qui fournissent les Page Objects aux tests
  product-price.spec.ts     les tests : prix de « Build your own expensive computer »
```

## Cross-browser
La config définit 6 projets : Chromium, Firefox, WebKit et Microsoft Edge en desktop, plus un Pixel 7 et un iPhone 14 émulés. `npm test` les lance tous. Edge utilise le navigateur installé sur la machine (`channel: 'msedge'`), déjà présent sous Windows. WebKit est le moteur de Safari, mais ce n'est pas Safari lui-même : pour une validation sur le vrai Safari, il faut un Mac ou une plateforme comme BrowserStack.

## Feuille de route
1. ✅ Framework de base et 2 tests de prix
2. ⬜ Ajouter des tests soi-même (catégories, panier, inscription…), dont quelques-uns volontairement cassés
3. ⬜ Installer les agents Playwright (`npx playwright init-agents --loop=vscode` ou `--loop=claude`) et tester le planner, le generator et le healer
