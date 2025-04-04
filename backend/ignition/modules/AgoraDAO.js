const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AgoraDAO", (m) => {
  // Adresse du déployeur comme propriétaire initial et membre du conseil
  const deployer = m.getAccount(0);

  // Paramètres de configuration
  const ethEurPrice = m.getParameter("ethEurPrice", "3000000000000000000000"); // 3000 EUR avec 18 décimales
  const initialBoardMembers = [deployer];

  // 1. Déployer HumaToken
  const humaToken = m.contract("HumaToken", [deployer]);

  // 2. Déployer Vault en utilisant l'adresse de HumaToken (attendre que HumaToken soit déployé)
  const vault = m.contract("Vault", [deployer, humaToken, ethEurPrice], {
    after: [humaToken], // Assure que HumaToken est déployé avant Vault
  });

  // 3. Déployer Governance en utilisant les adresses de HumaToken et Vault
  const governance = m.contract(
    "Governance",
    [humaToken, vault, initialBoardMembers],
    {
      after: [humaToken, vault], // Assure que HumaToken et Vault sont déployés avant Governance
    }
  );

  // 4. Configurer HumaToken pour accepter le Vault (après déploiement de Vault)
  const setVaultAddress = m.call(humaToken, "setVaultAddress", [vault], {
    after: [humaToken, vault], // Dépend de HumaToken et Vault
  });

  // 5. Configurer Vault pour accepter Governance (après déploiement de Governance)
  const setVaultGovernance = m.call(vault, "setGovernanceAddress", [governance], {
    after: [vault, governance], // Dépend de Vault et Governance
  });

  // 6. Configurer HumaToken pour accepter Governance (après déploiement de Governance)
  const setHumaTokenGovernance = m.call(humaToken, "setGovernanceAddress", [governance], {
    after: [humaToken, governance], // Dépend de HumaToken et Governance
  });

  // Retourner les contrats et les appels configurés
  return {
    humaToken,
    vault,
    governance,
    setVaultAddress,
    setVaultGovernance,
    setHumaTokenGovernance,
  };
});