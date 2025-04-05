# AgoraDAO - Application de Gouvernance Humanitaire

## À propos du projet

AgoraDAO est une application de gouvernance décentralisée dédiée au financement de projets humanitaires. Elle permet aux donateurs de contribuer en ETH, de recevoir des tokens de gouvernance HUMA, et de participer aux décisions concernant l'allocation des fonds.

## Caractéristiques principales

- **Dons en cryptomonnaie**: Les utilisateurs peuvent faire des dons en ETH et recevoir des tokens HUMA en retour
- **Système de gouvernance**: Les détenteurs de tokens HUMA peuvent voter sur les propositions de financement
- **Propositions de projets**: Les membres peuvent créer des propositions pour financer des projets humanitaires
- **Interface utilisateur intuitive**: Dashboard, gestion de propositions et système de vote intuitifs
- **Traçabilité complète**: Toutes les transactions sont enregistrées sur la blockchain pour une transparence totale

## Technologies utilisées

- **Frontend**: Next.js, TailwindCSS, shadcn/ui
- **Web3**: Wagmi, RainbowKit, Viem
- **Smart Contracts**: Solidity, OpenZeppelin
- **Déploiement**: Hardhat, Ignition

## Structure des smart contracts

Le système repose sur trois contrats principaux:

1. **HumaToken.sol**: Token ERC20 pour la gouvernance, impliquant un système de brûlage lors des votes
2. **Vault.sol**: Gère les dépôts ETH et la distribution des tokens HUMA
3. **Governance.sol**: Gère les propositions, les votes et l'exécution des décisions



## Installation et démarrage

1. Clonez le dépôt:
   ```
   git clone [https://github.com/votre-utilisateur/agoradao.git](https://github.com/0xdgui/agora-dao.git)
   cd agoradao
   ```

2. Installez les dépendances:
   ```
   npm install
   ```

3. Configurez les variables d'environnement:
   ```
   cp .env.example .env.local
   ```
   Remplissez le fichier `.env.local` avec vos propres valeurs.

4. Démarrez le serveur de développement:
   ```
   npm run dev
   ```

5. Pour le déploiement des contrats (sur un réseau de test):
   ```
   npx hardhat ignition deploy ./ignition/modules/AgoraDAO.js --network sepolia
   ```

## Flux d'utilisation

1. **Connexion**: L'utilisateur se connecte avec son portefeuille via RainbowKit
2. **Don**: L'utilisateur fait un don en ETH et reçoit des tokens HUMA 
3. **Participation**: Le donateur peut voter sur les propositions existantes ou en créer de nouvelles
4. **Gouvernance**: Les propositions approuvées peuvent être exécutées pour transférer les fonds aux projets

## Mécanique des tokens HUMA

- **Attribution**: Les tokens HUMA sont attribués selon une formule qui favorise les petits donateurs:
  ```
  tokens = (10% de la valeur en EUR) + (racine carrée de la valeur en EUR × 10^9)
  ```
- **Utilisation**: Les tokens sont brûlés quand un utilisateur vote sur une proposition
- **Droits**: Les détenteurs de tokens peuvent créer des propositions et voter

## Quorum dynamique

Le quorum requis pour qu'une proposition soit validée varie en fonction du montant demandé:
- Plus le montant est élevé par rapport au solde du vault, plus le quorum requis est important
- Cette mécanique assure que les demandes importantes nécessitent un consensus plus large

## Déploiement

L'application est configurée pour être déployée sur une réseau local Hardhat ou sur un réseau de test Ethereum (comme Sepolia). Les smart contracts sont déployés via Hardhat et Ignition, tandis que le frontend peut être déployé sur Vercel ou toute autre plateforme compatible avec Next.js.

## Sécurité

Les contrats implémentent plusieurs mécanismes de sécurité:
- Protection contre la réentrance
- Gestion des droits avec des rôles spécifiques
- Période de délibération minimale requise avant de finaliser les votes
- Possibilité de veto par le conseil d'administration (uniquement pour des raisons légales)

## Développement futur

Fonctionnalités prévues:
- Ajout de la gestion Admin
- Ajout de la partie DeFi gestion des fonds
- Support pour d'autres tokens que l'ETH

## Contribution

Les contributions sont les bienvenues!

## Licence

Ce projet est sous licence MIT 
