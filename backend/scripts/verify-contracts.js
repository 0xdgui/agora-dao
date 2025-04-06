const hre = require("hardhat");
const fs = require('fs');

async function main() {
  // Lire les informations de déploiement
  const deploymentFile = 'deployment-sepolia.json';
  
  if (!fs.existsSync(deploymentFile)) {
    console.error(`Fichier ${deploymentFile} introuvable. Veuillez d'abord déployer sur Sepolia.`);
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  
  console.log("Vérification des contrats sur Etherscan...");
  
  try {
    // Vérifier HumaToken
    console.log("Vérification de HumaToken...");
    await hre.run("verify:verify", {
      address: deployment.humaToken,
      constructorArguments: [deployment.deployer],
      contract: "contracts/HumaToken.sol:HumaToken"
    });
    console.log("HumaToken vérifié avec succès!");
  } catch (error) {
    console.log("Erreur lors de la vérification de HumaToken:", error.message);
  }
  
  try {
    // Vérifier Vault
    console.log("Vérification de Vault...");
    await hre.run("verify:verify", {
      address: deployment.vault,
      constructorArguments: [
        deployment.deployer,
        deployment.humaToken,
        hre.ethers.utils.parseEther("3000")
      ],
      contract: "contracts/Vault.sol:Vault"
    });
    console.log("Vault vérifié avec succès!");
  } catch (error) {
    console.log("Erreur lors de la vérification de Vault:", error.message);
  }
  
  try {
    // Vérifier Governance
    console.log("Vérification de Governance...");
    await hre.run("verify:verify", {
      address: deployment.governance,
      constructorArguments: [
        deployment.humaToken,
        deployment.vault,
        [deployment.deployer]
      ],
      contract: "contracts/Governance.sol:Governance"
    });
    console.log("Governance vérifié avec succès!");
  } catch (error) {
    console.log("Erreur lors de la vérification de Governance:", error.message);
  }
  
  console.log("Processus de vérification terminé!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });