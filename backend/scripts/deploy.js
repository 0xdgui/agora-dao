// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Déploiement des contrats avec le compte:", deployer.address);

  // 1. Déployer HumaToken
  console.log("Déploiement de HumaToken...");
  const HumaToken = await ethers.getContractFactory("HumaToken");
  const humaToken = await HumaToken.deploy(deployer.address);
  const humaTokenAddress = await humaToken.getAddress();
  console.log("HumaToken déployé à:", humaTokenAddress);

  // 2. Déployer Vault
  console.log("Déploiement de Vault...");
  const Vault = await ethers.getContractFactory("Vault");
  const ethEurPrice = "3000000000000000000000"; // 3000 EUR avec 18 décimales
  const vault = await Vault.deploy(
    deployer.address,
    humaTokenAddress,
    ethEurPrice
  );
  const vaultAddress = await vault.getAddress();
  console.log("Vault déployé à:", vaultAddress);

  // 3. Configurer HumaToken pour accepter le Vault
  console.log("Configuration de HumaToken pour accepter le Vault...");
  const tx1 = await humaToken.setVaultAddress(vaultAddress);
  await tx1.wait();
  console.log("HumaToken configuré avec succès");

  // 4. Déployer Governance
  console.log("Déploiement de Governance...");
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    humaTokenAddress,
    vaultAddress,
    [deployer.address]
  );
  const governanceAddress = await governance.getAddress();
  console.log("Governance déployé à:", governanceAddress);

  // 5. Configurer Vault pour accepter Governance
  console.log("Configuration de Vault pour accepter Governance...");
  const tx2 = await vault.setGovernanceAddress(governanceAddress);
  await tx2.wait();
  console.log("Vault configuré avec succès");

  // 6. Configurer HumaToken pour accepter Governance
  console.log("Configuration de HumaToken pour accepter Governance...");
  const tx3 = await humaToken.setGovernanceAddress(governanceAddress);
  await tx3.wait();
  console.log("HumaToken configuré avec succès");

  console.log("Déploiement terminé avec succès!");
  console.log({
    humaToken: humaTokenAddress,
    vault: vaultAddress,
    governance: governanceAddress
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });