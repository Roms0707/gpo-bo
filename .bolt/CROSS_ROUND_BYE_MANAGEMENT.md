# Système de Réorganisation Cross-Round pour Gestion des BYE

## Vue d'ensemble

Ce système permet une liberté totale de réorganisation des joueurs entre tous les rounds d'un tournoi lorsque des BYE sont détectés, particulièrement après le Round 1. Il offre aux administrateurs un contrôle complet pour gérer les situations de BYE tout en maintenant l'intégrité des matchs terminés.

## Fonctionnalités Principales

### 1. Détection Automatique des BYE

**Service**: `src/services/byeDetectionService.ts`

- Détecte automatiquement tous les BYE dans tous les rounds
- Distingue les BYE du Round 1 (normaux) des BYE post-Round 1 (problématiques)
- Calcule l'impact des BYE sur la progression du tournoi
- Déclenche automatiquement les alertes et l'activation du mode édition

**Fonctions clés**:
- `detectByes()`: Analyse complète de tous les matchs
- `hasProblematicByes()`: Vérifie si des BYE existent après Round 1
- `shouldAutoEnableEditing()`: Détermine si le mode édition doit être activé

### 2. Base de Données - Audit et Tracking

**Migration**: `supabase/migrations/add_bracket_reorganization_system.sql`

**Nouvelles tables**:

#### `bracket_modifications_log`
Enregistre toutes les modifications manuelles du bracket avec:
- `tournament_id`: Référence au tournoi
- `match_id`: Match modifié
- `round`: Numéro du round
- `modification_type`: Type de modification (player_swap, cross_round_move, bye_fill, etc.)
- `previous_state` & `new_state`: États avant/après en JSONB
- `reason`: Raison de la modification
- `modified_by`: Admin qui a effectué la modification
- `created_at`: Timestamp

**Colonnes ajoutées à `tournament_matches`**:
- `manual_assignment` (boolean): Indique si le match a été modifié manuellement
- `original_round` (integer): Round d'origine avant modifications

**Sécurité RLS**:
- Seuls les admins peuvent consulter et créer des logs
- Les logs sont immuables (pas de suppression/modification)
- Protection complète de l'audit trail

### 3. Service de Réorganisation Cross-Round

**Service**: `src/services/crossRoundService.ts`

**Fonctions principales**:

#### `movePlayerToMatch()`
Déplace un joueur vers un match spécifique:
- Valide les IDs de joueur
- Vérifie que le match n'a pas de résultat
- Gère le retrait automatique du match source
- Enregistre la modification dans l'audit log
- Supporte le remplissage de BYE et les mouvements cross-round

#### `swapPlayersInMatch()`
Échange les positions de deux joueurs dans un match:
- Vérifie qu'aucun résultat n'existe
- Inverse player1_id et player2_id
- Marque le match comme manuellement modifié
- Enregistre l'opération

#### `removePlayerFromMatch()`
Retire un joueur d'un match:
- Crée un slot BYE dans le match
- Permet la réassignation ultérieure
- Protège les matchs avec résultats

#### `canPlayerBeMoved()`
Valide si un déplacement est possible:
- Vérifie les conflits de round (pas deux matchs dans le même round)
- Valide l'état du match cible
- Retourne des raisons détaillées en cas de refus

#### `logModification()`
Enregistre automatiquement toutes les modifications:
- Capture l'ID de l'admin connecté
- Stocke les états avant/après
- Maintient l'historique complet

### 4. Panneau de Gestion des BYE Amélioré

**Composant**: `src/components/bracket/EnhancedByePanel.tsx`

**Fonctionnalités**:
- Vue consolidée de tous les BYE à travers tous les rounds
- Distinction visuelle entre BYE Round 1 (vert) et BYE problématiques (orange)
- Compteur de BYE par round avec expansion
- Bouton "Activer l'Édition" automatique lors de la détection de BYE
- Lien vers l'historique des modifications
- Bouton "Remplir ce BYE" pour chaque match avec BYE

**Codes couleurs**:
- 🟢 Vert: BYE du Round 1 (normaux, gérés automatiquement)
- 🟠 Orange: BYE après Round 1 (nécessitent correction)
- 🔵 Bleu: Informations et aide

### 5. Sidebar Pool de Joueurs

**Composant**: `src/components/bracket/PlayerPoolSidebar.tsx`

**Fonctionnalités**:
- Liste complète de tous les participants du tournoi
- Filtres multiples:
  - Tous
  - Actifs (non qualifiés/éliminés)
  - Waiting List
  - Non-assignés (aucun match)
  - Qualifiés
  - Éliminés
- Recherche en temps réel par nom
- Affichage du statut de chaque joueur (ELO, W-L, badges)
- Indication du nombre de matchs assignés
- Sélection rapide pour remplir les BYE

**Informations affichées**:
- Nom du joueur/team
- ELO rating
- Record victoires-défaites
- Badge Waiting List
- Badge statut (Qualifié, Éliminé, Disponible)
- Nombre de matchs assignés

### 6. Panneau d'Historique des Modifications

**Composant**: `src/components/bracket/ModificationHistoryPanel.tsx`

**Fonctionnalités**:
- Liste chronologique de toutes les modifications
- Badges de type de modification avec codes couleur
- Affichage des états avant/après
- Nom de l'admin qui a effectué la modification
- Timestamp précis
- Raison de la modification

**Types de modifications affichés**:
- Échange de joueurs (swap)
- Réassignation
- BYE rempli
- Déplacement manuel
- Déplacement cross-round

### 7. Intégration dans SwissBracketPage

**Fichier**: `src/pages/SwissBracketPage.tsx`

**Nouvelles fonctionnalités ajoutées**:

#### Détection automatique
```typescript
const byeDetection = detectByes(matches, maxRounds);
const shouldAutoEdit = shouldAutoEnableEditing(matches);

useEffect(() => {
  if (shouldAutoEdit && !isEditingEnabled) {
    setShowByePanel(true); // Affiche automatiquement le panneau BYE
  }
}, [shouldAutoEdit, isEditingEnabled]);
```

#### Boutons d'interface
- Bouton "X BYE(s)" avec compteur en temps réel
- Couleur orange si BYE problématiques, bleu sinon
- Bouton "Joueurs" pour accéder au pool
- Intégration avec le système existant

#### Gestion des actions
- `handlePlayerSelect()`: Assigne un joueur à un BYE
- `handleFillBye()`: Ouvre le pool pour remplir un BYE spécifique
- `handleEnableEditing()`: Active le mode édition complet
- `handleViewHistory()`: Affiche l'historique des modifications

## Flux de Travail

### Scénario 1: BYE Détecté Après Round 1

1. Le système détecte automatiquement un BYE dans Round 2+
2. Le panneau BYE s'affiche automatiquement avec une alerte orange
3. L'admin clique sur "Activer l'Édition"
4. L'admin peut:
   - Cliquer sur "Remplir ce BYE" pour un match spécifique
   - Ouvrir le pool de joueurs avec le bouton "Joueurs"
   - Sélectionner un joueur disponible ou de la waiting list
5. Le joueur est assigné au match
6. La modification est enregistrée dans l'audit log
7. Le match est marqué avec `manual_assignment = true`

### Scénario 2: Réorganisation Cross-Round

1. L'admin ouvre le pool de joueurs
2. Filtre par "Non-assignés" ou recherche un joueur spécifique
3. Sélectionne le joueur à déplacer
4. Le système:
   - Vérifie qu'il n'y a pas de conflit de round
   - Retire le joueur de son match actuel (si applicable)
   - L'assigne au nouveau match
   - Enregistre l'opération avec raison
5. Les standings sont automatiquement recalculés

### Scénario 3: Consultation de l'Historique

1. L'admin clique sur "Historique" dans le panneau BYE
2. Voit toutes les modifications chronologiquement
3. Peut vérifier:
   - Qui a fait quelle modification
   - Quand ça a été fait
   - L'état avant/après
   - La raison de la modification

## Validations et Protections

### Protections Automatiques

1. **Matchs avec résultats**: Impossible de modifier un match où `winner_id` existe
2. **Conflits de round**: Un joueur ne peut pas avoir deux matchs dans le même round
3. **IDs valides**: Tous les IDs de joueur sont validés contre `validUserIds`
4. **Audit immuable**: Les logs ne peuvent jamais être supprimés ou modifiés
5. **Permissions**: Seuls les admins peuvent effectuer des modifications

### Validations en Temps Réel

- Vérification de disponibilité avant assignation
- Détection des slots déjà occupés
- Alerte si tentative de modification d'un match terminé
- Confirmation des opérations à haut impact

## Avantages du Système

### Pour les Administrateurs

1. **Liberté Totale**: Réorganisez n'importe quel joueur entre n'importe quels rounds
2. **Détection Automatique**: Le système identifie immédiatement les problèmes
3. **Interface Intuitive**: Tous les outils accessibles en quelques clics
4. **Traçabilité**: Historique complet de toutes les modifications
5. **Sécurité**: Impossible de corrompre des données de matchs terminés

### Pour l'Intégrité du Tournoi

1. **Audit Trail**: Toutes les modifications sont enregistrées et attribuées
2. **Données Cohérentes**: Validations multiples à chaque étape
3. **Rollback Possible**: L'historique permet de comprendre et corriger les erreurs
4. **Protection des Résultats**: Les matchs terminés sont intouchables
5. **Transparence**: Tous les admins peuvent voir qui a fait quoi

### Pour les Joueurs

1. **Équité**: Les BYE sont gérés rapidement et équitablement
2. **Waiting List**: Les joueurs en attente peuvent être promus facilement
3. **Pas de BYE Injustes**: Les BYE après Round 1 sont corrigés
4. **Progression Claire**: L'historique montre les ajustements effectués

## Compatibilité

Le système fonctionne avec:
- ✅ Tournois Swiss (principal cas d'usage)
- ✅ Tournois Round Robin (adaptable)
- ✅ Tournois Solo et Team
- ✅ Tous les formats de jeu

## Architecture Technique

### Services
- `byeDetectionService.ts`: Détection et analyse des BYE
- `crossRoundService.ts`: Logique de déplacement et modifications

### Composants UI
- `EnhancedByePanel.tsx`: Interface principale de gestion
- `PlayerPoolSidebar.tsx`: Pool de joueurs disponibles
- `ModificationHistoryPanel.tsx`: Historique des changements

### Base de Données
- Table `bracket_modifications_log`: Audit trail complet
- Colonnes `manual_assignment` et `original_round`: Tracking des modifications

### Intégration
- `SwissBracketPage.tsx`: Page Swiss avec toutes les fonctionnalités
- Hooks et state management pour synchronisation en temps réel

## Conclusion

Ce système transforme la gestion des tournois en donnant aux administrateurs un contrôle complet et flexible sur l'organisation des matchs, tout en maintenant une traçabilité complète et en protégeant l'intégrité des données. La détection automatique des BYE et l'interface intuitive permettent une résolution rapide des problèmes, assurant ainsi le bon déroulement des tournois même dans des situations complexes.
