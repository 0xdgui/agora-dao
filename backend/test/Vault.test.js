const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Vault Contract", function () {
  // Fixture pour réutiliser le même setup dans chaque test
  async function deployVaultFixture() {
    // Récupérer les signers
    const [owner, donor1, donor2, recipient, governance] = await ethers.getSigners();
    
    // Déployer HumaToken en premier
    const HumaTokenFactory = await ethers.getContractFactory("HumaToken");
    const humaToken = await HumaTokenFactory.deploy(owner.address);
    await humaToken.waitForDeployment();
    
    // Déployer Vault avec prix initial ETH/EUR
    const initialEthEurPrice = ethers.parseEther("2000"); // 2000 EUR par ETH
    const VaultFactory = await ethers.getContractFactory("Vault");
    const vault = await VaultFactory.deploy(owner.address, await humaToken.getAddress(), initialEthEurPrice);
    await vault.waitForDeployment();
    
    // Définir l'adresse du vault dans HumaToken
    await humaToken.setVaultAddress(await vault.getAddress());
    
    return { 
      vault, 
      humaToken, 
      owner, 
      donor1, 
      donor2, 
      recipient, 
      governance, 
      initialEthEurPrice,
      vaultAddress: await vault.getAddress(),
      humaTokenAddress: await humaToken.getAddress()
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should set the correct humaToken address", async function () {
      const { vault, humaTokenAddress } = await loadFixture(deployVaultFixture);
      expect(await vault.humaToken()).to.equal(humaTokenAddress);
    });

    it("Should set the correct initial ETH/EUR price", async function () {
      const { vault, initialEthEurPrice } = await loadFixture(deployVaultFixture);
      expect(await vault.ethEurPrice()).to.equal(initialEthEurPrice);
    });
  });

  describe("setGovernanceAddress", function () {
    it("Should allow owner to set governance address", async function () {
      const { vault, owner, governance } = await loadFixture(deployVaultFixture);
      
      // Vérifier la valeur initiale (devrait être l'adresse zéro)
      expect(await vault.governanceAddress()).to.equal(ethers.ZeroAddress);
      
      await expect(vault.connect(owner).setGovernanceAddress(governance.address))
        .to.emit(vault, "GovernanceAddressSet")
        .withArgs(ethers.ZeroAddress, governance.address);
      
      expect(await vault.governanceAddress()).to.equal(governance.address);
    });

    it("Should not allow non-owner to set governance address", async function () {
      const { vault, donor1, governance } = await loadFixture(deployVaultFixture);
      
      await expect(vault.connect(donor1).setGovernanceAddress(governance.address))
        .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
        .withArgs(donor1.address);
    });

    it("Should not allow zero address as governance", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);
      
      await expect(vault.connect(owner).setGovernanceAddress(ethers.ZeroAddress))
        .to.be.revertedWith("Vault: governance cannot be zero address");
    });
  });

  describe("updateEthEurPrice", function () {
    it("Should allow owner to update ETH/EUR price", async function () {
      const { vault, owner, initialEthEurPrice } = await loadFixture(deployVaultFixture);
      
      const newPrice = ethers.parseEther("2500"); // 2500 EUR par ETH
      
      await expect(vault.connect(owner).updateEthEurPrice(newPrice))
        .to.emit(vault, "PriceUpdated")
        .withArgs(initialEthEurPrice, newPrice);
      
      expect(await vault.ethEurPrice()).to.equal(newPrice);
    });

    it("Should not allow non-owner to update price", async function () {
      const { vault, donor1 } = await loadFixture(deployVaultFixture);
      
      const newPrice = ethers.parseEther("2500");
      
      await expect(vault.connect(donor1).updateEthEurPrice(newPrice))
        .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
        .withArgs(donor1.address);
    });

    it("Should not allow zero price", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);
      
      await expect(vault.connect(owner).updateEthEurPrice(0))
        .to.be.revertedWith("Vault: price must be positive");
    });
  });

  describe("depositETH", function () {
    it("Should accept ETH deposits and mint HUMA tokens", async function () {
      const { vault, humaToken, donor1, initialEthEurPrice } = await loadFixture(deployVaultFixture);
      
      const donationAmount = ethers.parseEther("1"); // 1 ETH
      const expectedEurValue = (donationAmount * initialEthEurPrice) / ethers.parseEther("1");
      
      // Calculer le montant de tokens attendu: baseTokens (10%) + bonusTokens (sqrt(eurValue)*1e9)
      const baseTokens = expectedEurValue / 10n;
      const bonusTokens = BigInt(Math.floor(Math.sqrt(Number(ethers.formatEther(expectedEurValue))) * 1e9));
      const expectedTokens = baseTokens + bonusTokens;
      
      await expect(vault.connect(donor1).depositETH({ value: donationAmount }))
        .to.emit(vault, "Deposit")
        .withArgs(donor1.address, donationAmount, expectedEurValue, expectedTokens);
      
      // Vérifier que le statut du donateur est mis à jour
      expect(await vault.isDonator(donor1.address)).to.equal(1);
      
      // Vérifier que les tokens sont correctement créés
      expect(await humaToken.balanceOf(donor1.address)).to.equal(expectedTokens);
      
      // Vérifier que le solde du vault est mis à jour
      const vaultAddress = await vault.getAddress();
      expect(await ethers.provider.getBalance(vaultAddress)).to.equal(donationAmount);
    });

    it("Should accept multiple deposits from the same donor", async function () {
      const { vault, humaToken, donor1 } = await loadFixture(deployVaultFixture);
      
      // Premier dépôt
      const firstAmount = ethers.parseEther("0.5"); // 0.5 ETH
      await vault.connect(donor1).depositETH({ value: firstAmount });
      
      const balanceAfterFirstDeposit = await humaToken.balanceOf(donor1.address);
      
      // Second dépôt
      const secondAmount = ethers.parseEther("0.5"); // 0.5 ETH
      await vault.connect(donor1).depositETH({ value: secondAmount });
      
      const balanceAfterSecondDeposit = await humaToken.balanceOf(donor1.address);
      
      // Vérifier que les tokens ont été correctement ajoutés
      expect(balanceAfterSecondDeposit).to.be.gt(balanceAfterFirstDeposit);
      
      // Vérifier le solde total du vault
      const vaultAddress = await vault.getAddress();
      expect(await ethers.provider.getBalance(vaultAddress)).to.equal(firstAmount + secondAmount);
    });

    it("Should accept deposits via fallback function", async function () {
      const { vault, humaToken, donor1 } = await loadFixture(deployVaultFixture);
      
      const donationAmount = ethers.parseEther("1"); // 1 ETH
      const vaultAddress = await vault.getAddress();
      
      const initialVaultBalance = await ethers.provider.getBalance(vaultAddress);
      const initialDonorTokenBalance = await humaToken.balanceOf(donor1.address);
      
      // Envoyer ETH directement à l'adresse du contrat
      await donor1.sendTransaction({
        to: vaultAddress,
        value: donationAmount
      });
      
      const finalVaultBalance = await ethers.provider.getBalance(vaultAddress);
      const finalDonorTokenBalance = await humaToken.balanceOf(donor1.address);
      
      expect(finalVaultBalance).to.equal(initialVaultBalance + donationAmount);
      expect(finalDonorTokenBalance).to.be.gt(initialDonorTokenBalance);
      expect(await vault.isDonator(donor1.address)).to.equal(1);
    });

    it("Should reject zero value deposits", async function () {
      const { vault, donor1 } = await loadFixture(deployVaultFixture);
      
      await expect(vault.connect(donor1).depositETH({ value: 0 }))
        .to.be.revertedWith("Vault: donation must be greater than 0");
    });
  });

  describe("transferFunds", function () {
    it("Should allow governance to transfer funds", async function () {
      const { vault, owner, donor1, recipient, governance } = await loadFixture(deployVaultFixture);
      
      // Définir l'adresse de governance
      await vault.connect(owner).setGovernanceAddress(governance.address);
      
      // Le donateur fait un dépôt
      const donationAmount = ethers.parseEther("5"); // 5 ETH
      await vault.connect(donor1).depositETH({ value: donationAmount });
      
      // Créer un ID de proposition (provient normalement de la governance)
      const proposalId = ethers.keccak256(ethers.toUtf8Bytes("PROPOSAL-1"));
      
      // Transférer la moitié des fonds
      const transferAmount = ethers.parseEther("2.5"); // 2.5 ETH
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
      
      await expect(vault.connect(governance).transferFunds(recipient.address, transferAmount, proposalId))
        .to.emit(vault, "FundsTransferred")
        .withArgs(recipient.address, transferAmount, proposalId);
      
      // Vérifier les soldes
      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + transferAmount);
      
      const vaultAddress = await vault.getAddress();
      expect(await ethers.provider.getBalance(vaultAddress)).to.equal(donationAmount - transferAmount);
    });

    it("Should not allow non-governance to transfer funds", async function () {
      const { vault, owner, donor1, recipient, governance } = await loadFixture(deployVaultFixture);
      
      // Définir l'adresse de governance
      await vault.connect(owner).setGovernanceAddress(governance.address);
      
      // Le donateur fait un dépôt
      const donationAmount = ethers.parseEther("5"); // 5 ETH
      await vault.connect(donor1).depositETH({ value: donationAmount });
      
      // Créer un ID de proposition
      const proposalId = ethers.keccak256(ethers.toUtf8Bytes("PROPOSAL-1"));
      
      // Tenter de transférer des fonds depuis un compte non-governance
      const transferAmount = ethers.parseEther("2.5"); // 2.5 ETH
      
      await expect(vault.connect(donor1).transferFunds(recipient.address, transferAmount, proposalId))
        .to.be.revertedWith("Vault: caller is not the Governance");
    });

    it("Should not allow transferring to zero address", async function () {
      const { vault, owner, donor1, governance } = await loadFixture(deployVaultFixture);
      
      // Définir l'adresse de governance
      await vault.connect(owner).setGovernanceAddress(governance.address);
      
      // Le donateur fait un dépôt
      const donationAmount = ethers.parseEther("5"); // 5 ETH
      await vault.connect(donor1).depositETH({ value: donationAmount });
      
      // Créer un ID de proposition
      const proposalId = ethers.keccak256(ethers.toUtf8Bytes("PROPOSAL-1"));
      
      // Tenter de transférer vers l'adresse zéro
      const transferAmount = ethers.parseEther("2.5"); // 2.5 ETH
      
      await expect(vault.connect(governance).transferFunds(ethers.ZeroAddress, transferAmount, proposalId))
        .to.be.revertedWith("Vault: destination cannot be zero address");
    });

    it("Should not allow transferring zero amount", async function () {
      const { vault, owner, donor1, recipient, governance } = await loadFixture(deployVaultFixture);
      
      // Définir l'adresse de governance
      await vault.connect(owner).setGovernanceAddress(governance.address);
      
      // Le donateur fait un dépôt
      const donationAmount = ethers.parseEther("5"); // 5 ETH
      await vault.connect(donor1).depositETH({ value: donationAmount });
      
      // Créer un ID de proposition
      const proposalId = ethers.keccak256(ethers.toUtf8Bytes("PROPOSAL-1"));
      
      // Tenter de transférer un montant zéro
      await expect(vault.connect(governance).transferFunds(recipient.address, 0, proposalId))
        .to.be.revertedWith("Vault: amount must be greater than 0");
    });

    it("Should not allow transferring more than available balance", async function () {
      const { vault, owner, donor1, recipient, governance } = await loadFixture(deployVaultFixture);
      
      // Définir l'adresse de governance
      await vault.connect(owner).setGovernanceAddress(governance.address);
      
      // Le donateur fait un dépôt
      const donationAmount = ethers.parseEther("5"); // 5 ETH
      await vault.connect(donor1).depositETH({ value: donationAmount });
      
      // Créer un ID de proposition
      const proposalId = ethers.keccak256(ethers.toUtf8Bytes("PROPOSAL-1"));
      
      // Tenter de transférer plus que le solde
      const transferAmount = ethers.parseEther("10"); // 10 ETH
      
      await expect(vault.connect(governance).transferFunds(recipient.address, transferAmount, proposalId))
        .to.be.revertedWith("Vault: insufficient funds in vault");
    });
  });

  describe("View functions", function () {
    it("Should return correct vault balance", async function () {
      const { vault, donor1 } = await loadFixture(deployVaultFixture);
      
      const donationAmount = ethers.parseEther("3"); // 3 ETH
      await vault.connect(donor1).depositETH({ value: donationAmount });
      
      expect(await vault.getVaultBalance()).to.equal(donationAmount);
    });

    it("Should correctly identify donators", async function () {
      const { vault, donor1, donor2 } = await loadFixture(deployVaultFixture);
      
      // État initial - aucun n'est donateur
      expect(await vault.isAccountDonator(donor1.address)).to.be.false;
      expect(await vault.isAccountDonator(donor2.address)).to.be.false;
      
      // Donor1 fait un don
      await vault.connect(donor1).depositETH({ value: ethers.parseEther("1") });
      
      // Vérifier les états mis à jour
      expect(await vault.isAccountDonator(donor1.address)).to.be.true;
      expect(await vault.isAccountDonator(donor2.address)).to.be.false;
    });
  });
});