# Spec — Landing « lead » + tool d'audit gratuit

> Date : 2026-06-27 · Branche : `landing-acquisition` (depuis `origin/main`)
> Objectif : ramener un max de trafic SaaS B2B via un lead magnet (audit gratuit),
> convertir en démos bookées. La page se vend en se prouvant (dogfooding).

## 1. Contexte produit

`lead` aide les boîtes SaaS à shipper des landing pages / onboarding / paywalls qui
convertissent, automatiquement : connexion GitHub → un agent audite le code → drafte des
variantes (vrai code, PR + flag) → A/B test → mesure → itère. Le **premier run du produit
est un "audit"** (`docs/product.md`). Le tool d'audit public est donc une **tranche
gratuite et sans login du vrai produit**, pas un gadget séparé.

- **Cible** : founders / growth leads de startups SaaS B2B.
- **CTA principal** : Book a demo (lien Cal/Calendly).
- **Acquisition** : posts LinkedIn pointant vers le tool d'audit (lead magnet partageable).

## 2. Périmètre de cette passe

Construire **les deux d'un coup** :
1. La **landing marketing** (`/`) qui remplace le styleguide actuel.
2. Le **tool d'audit gratuit** réel (crawl + Claude), avec résultat partageable et capture de lead.

**Hors périmètre (YAGNI)** : auth/Clerk, paiement, connexion GitHub réelle, boucle d'agent
live, rendu headless du crawl (phase 2), dashboard (déjà scaffoldé, on n'y touche pas).

## 3. Architecture

### 3.1 Surface marketing — `app/page.tsx` (remplacée)
Page server-rendered, Warm Precision (composants `components/ui/*` existants). Sections :
1. **Hero + tool d'audit** : titre orienté résultat + champ URL. Le composant d'audit est
   un client component embarqué dans le hero.
2. **How it works** : la boucle (audit → draft variantes/PR → A/B test → mesure → itère).
3. **Différenciation** : on optimise les **leads qualifiés** pas les clics vanity ; chaque
   changement est un **diff reviewable**, review-gated par défaut.
4. **Preuve / dogfooding** : « l'audit que tu viens de lancer = ce que l'agent fait en
   continu sur ton repo ».
5. **CTA final** : Book a demo (`BOOKING_URL`).
Nav + footer légers réutilisant le top-bar existant (logo `lead`, ThemeToggle).

### 3.2 Composant d'audit — `components/audit/audit-tool.tsx` (client)
États : `idle` → `loading` → `result` | `error` | `needs-paste` (SPA vide).
- `idle` : input URL + bouton « Auditer ma landing ».
- `loading` : skeleton + ligne de statut (« on lit ta page… », « Claude analyse… »).
- `result` : score + findings (rendu inline via `<AuditReport>`), CTA book-demo + lien
  partage `/audit/[id]`.
- `needs-paste` : si le HTML est trop maigre, on propose un `<textarea>` pour coller le
  contenu, et on re-soumet en mode `text`.

### 3.3 Logique d'audit — `lib/audit.ts`
- `fetchLanding(url)` : validation URL (http/https only, pas d'IP privée → anti-SSRF),
  `fetch` avec timeout (8s), cap taille réponse (~1.5 Mo), `User-Agent` explicite.
- `extractContent(html)` : extraction sans dépendance lourde (regex/parse léger) du
  `<title>`, meta description, H1/H2/H3, textes de boutons/liens CTA, premiers paragraphes.
  Retourne aussi `isThin` (true si trop peu de texte → SPA probable).
- `runAudit({ source })` : `source` = `{ kind: 'url', extracted }` ou `{ kind: 'text', raw }`.
  Appelle Claude Opus 4.8 en **sortie structurée forcée** (tool `submit_audit`), valide le
  retour côté serveur, retry 1×. Réutilise le pattern de sortie structurée éprouvé.

**Schéma `AuditResult`** (validé serveur) :
```
score: number (0..100)
summary: string                      // 1-2 phrases, FR
findings: Array<{
  title: string
  severity: 'P0'|'P1'|'P2'|'P3'
  category: 'clarté'|'cta'|'preuve'|'friction'|'valeur'
  recommendation: string             // action concrète
  evidence: string                   // citation exacte de leur page
}>                                    // 4 à 6 items
```

### 3.4 API — `app/api/audit/route.ts`
`POST { url?, text?, email? }` →
1. Si `url` : fetch + extract ; si `isThin` et pas de `text` → renvoie `{ needsPaste: true }`.
2. Run audit (Claude) → persiste `Audit` → renvoie `{ id, result }`.
- Validation d'entrée stricte, garde-fou anti-SSRF, gestion d'erreur (timeout, fetch KO,
  Claude KO) avec messages clairs.
- `ANTHROPIC_API_KEY` requis (erreur explicite si absent).

### 3.5 Page de résultat — `app/audit/[id]/page.tsx`
Server component : charge l'`Audit` par id, rend `<AuditReport>` (score + findings) +
CTA book-demo. Open Graph (title/description dynamiques) pour un bon partage LinkedIn.
404 propre si id inconnu.

### 3.6 Données — Prisma
Nouveau modèle :
```prisma
model Audit {
  id        String   @id @default(cuid())
  url       String?
  email     String?
  score     Int
  result    Json     // AuditResult complet
  source    String   // 'url' | 'text'
  createdAt DateTime @default(now())
  @@index([createdAt])
}
```
Migration Prisma 7 (driver adapter `pg`, client dans `lib/generated/prisma`).
Chaque audit lancé = un lead (url + email si fourni).

## 4. Dépendances & config
- Ajout : `@anthropic-ai/sdk`.
- Env : `ANTHROPIC_API_KEY`, `DATABASE_URL` (déjà attendu), `BOOKING_URL` (lien Cal/Calendly),
  `AGENT_MODEL` (défaut `claude-opus-4-8`).
- Pas de nouvelle dépendance de parsing HTML (extraction maison légère).

## 5. Isolation des unités
| Unité | Rôle | Dépend de |
|---|---|---|
| `lib/audit.ts` | fetch + extract + audit Claude | `@anthropic-ai/sdk` |
| `app/api/audit/route.ts` | endpoint, persistance, anti-SSRF | `lib/audit`, `lib/db` |
| `components/audit/audit-tool.tsx` | UX du formulaire/états | API `/api/audit` |
| `components/audit/audit-report.tsx` | rendu score+findings (réutilisé hero & /audit/[id]) | — |
| `app/page.tsx` | landing marketing | composants ui + audit-tool |
| `app/audit/[id]/page.tsx` | résultat partageable | `lib/db`, audit-report |

## 6. Cas à couvrir (test-driven)
**Happy path** : URL valide content-rich → audit avec score + 4-6 findings → persisté → partageable.
**Edge** : SPA HTML vide → `needsPaste` → re-soumission en `text` → audit OK.
**Erreurs** : URL invalide / non-http → 400 clair ; site down / timeout → message clair ;
réponse Claude invalide → retry puis erreur propre ; `ANTHROPIC_API_KEY` absent → 500 explicite.
**Sécurité** : URL pointant vers IP privée/localhost → refus (anti-SSRF) ; réponse géante → cappée.
**Régression** : le dashboard existant (`app/dashboard/*`) et le design system ne cassent pas.

## 7. Plan de test
- Unit : `extractContent` (HTML riche vs maigre), validation/anti-SSRF d'URL, validation `AuditResult`.
- Intégration : `POST /api/audit` (url ok, paste, url invalide, IP privée) — Claude mocké.
- Manuel : lancer un audit sur 2-3 vraies landings SaaS, vérifier qualité + partage + lead en base.
- Visuel : landing responsive (mobile/desktop), light + dark.

## 8. Build order proposé
1. Schéma Prisma `Audit` + migration.
2. `lib/audit.ts` (fetch/extract/anti-SSRF + audit Claude structuré) + tests unit.
3. `app/api/audit/route.ts` + tests intégration.
4. `components/audit/audit-report.tsx` + `audit-tool.tsx`.
5. `app/audit/[id]/page.tsx` (résultat partageable + OG).
6. `app/page.tsx` — landing marketing complète (remplace le styleguide).
7. Câblage `BOOKING_URL`, passe responsive/dark, self-review.
