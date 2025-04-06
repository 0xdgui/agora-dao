const hre = require("hardhat");

async function main() {
  const networkName = hre.network.name;
  console.log(`Déploiement des contrats AgoraDAO sur ${networkName}...`);

  // Récupérer l'adresse du déployeur
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Adresse du déployeur: ${deployer.address}`);

  // Déployer le token HUMA
  const HumaToken = await hre.ethers.getContractFactory("HumaToken");
  const humaToken = await HumaToken.deploy(deployer.address);
  // Attendre le déploiement du contrat
  await humaToken.waitForDeployment();
  console.log(`HumaToken déployé à l'adresse: ${await humaToken.getAddress()}`);

  // Déployer le Vault
  const initialEthEurPrice = hre.ethers.parseEther("3000"); // 1 ETH = 3000 EUR
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(
    deployer.address,
    await humaToken.getAddress(),
    initialEthEurPrice
  );
  await vault.waitForDeployment();
  console.log(`Vault déployé à l'adresse: ${await vault.getAddress()}`);

  // Déployer la Governance
  const Governance = await hre.ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    await humaToken.getAddress(),
    await vault.getAddress(),
    [deployer.address]
  );
  await governance.waitForDeployment();
  console.log(`Governance déployé à l'adresse: ${await governance.getAddress()}`);

  // Configurer les adresses
  const vaultTx = await humaToken.setVaultAddress(await vault.getAddress());
  await vaultTx.wait();
  console.log("VaultAddress configurée dans HumaToken");
  
  const govTx = await humaToken.setGovernanceAddress(await governance.getAddress());
  await govTx.wait();
  console.log("GovernanceAddress configurée dans HumaToken");
  
  const vaultGovTx = await vault.setGovernanceAddress(await governance.getAddress());
  await vaultGovTx.wait();
  console.log("GovernanceAddress configurée dans Vault");

  // Attendre un peu pour s'assurer que tout est bien déployé
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("Déploiement terminé!");
  
  // Afficher un récapitulatif pour faciliter la vérification
  console.log("\nRécapitulatif des adresses déployées sur " + networkName + ":");
  console.log(`HumaToken: ${await humaToken.getAddress()}`);
  console.log(`Vault: ${await vault.getAddress()}`);
  console.log(`Governance: ${await governance.getAddress()}`);

  // Écrire les adresses dans un fichier de configuration
  const fs = require('fs');
  const deploymentInfo = {
    network: networkName,
    humaToken: await humaToken.getAddress(),
    vault: await vault.getAddress(),
    governance: await governance.getAddress(),
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    `deployment-${networkName}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`Informations de déploiement sauvegardées dans deployment-${networkName}.json`);

  const path = require('path');
  const frontendPath = path.join(__dirname, '../../frontend/src');

  try {
    fs.copyFileSync(
      `deployment-${networkName}.json`,
      path.join(frontendPath, `deployment-${networkName}.json`)
    );
    console.log(`Fichier de déploiement copié vers le frontend avec succès`);
  } catch (error) {
    console.error(`Erreur lors de la copie du fichier vers le frontend: ${error.message}`);
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });