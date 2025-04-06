const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("HumaToken Contract", function () {
  // Fixture pour réutiliser la même configuration dans chaque test
  async function deployHumaTokenFixture() {
    // Récupérer les signers
    const [owner, addr1, addr2, vault, governance] = await ethers.getSigners();

    // Déployer le contrat HumaToken
    const HumaToken = await ethers.getContractFactory("HumaToken");
    const humaToken = await HumaToken.deploy(owner.address);

    return { humaToken, owner, addr1, addr2, vault, governance };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { humaToken, owner } = await loadFixture(deployHumaTokenFixture);
      expect(await humaToken.owner()).to.equal(owner.address);
    });

    it("Should set the correct name and symbol", async function () {
      const { humaToken } = await loadFixture(deployHumaTokenFixture);
      expect(await humaToken.name()).to.equal("Humanitarian Token");
      expect(await humaToken.symbol()).to.equal("HUMA");
    });

    it("Should have zero initial supply", async function () {
      const { humaToken } = await loadFixture(deployHumaTokenFixture);
      expect(await humaToken.totalSupply()).to.equal(0);
    });
  });

  describe("setVaultAddress", function () {
    it("Should allow owner to set vault address", async function () {
      const { humaToken, owner, vault } = await loadFixture(deployHumaTokenFixture);
      await expect(humaToken.connect(owner).setVaultAddress(vault.address))
        .to.emit(humaToken, "VaultAddressSet")
        .withArgs(ethers.ZeroAddress, vault.address);
      
      expect(await humaToken.vaultAddress()).to.equal(vault.address);
    });

    it("Should not allow non-owner to set vault address", async function () {
      const { humaToken, addr1, vault } = await loadFixture(deployHumaTokenFixture);
      await expect(humaToken.connect(addr1).setVaultAddress(vault.address))
        .to.be.revertedWithCustomError(humaToken, "OwnableUnauthorizedAccount");
    });

    it("Should not allow setting zero address as vault", async function () {
      const { humaToken, owner } = await loadFixture(deployHumaTokenFixture);
      await expect(humaToken.connect(owner).setVaultAddress(ethers.ZeroAddress))
        .to.be.revertedWith("HumaToken: vault address cannot be zero");
    });

    it("Should not allow setting vault address more than once", async function () {
      const { humaToken, owner, vault, addr1 } = await loadFixture(deployHumaTokenFixture);
      
      // Définir l'adresse du vault pour la première fois
      await humaToken.connect(owner).setVaultAddress(vault.address);
      
      // Essayer de la définir à nouveau
      await expect(humaToken.connect(owner).setVaultAddress(addr1.address))
        .to.be.revertedWith("HumaToken: vault address already set");
    });
  });

  describe("setGovernanceAddress", function () {
    it("Should allow owner to set governance address", async function () {
      const { humaToken, owner, governance } = await loadFixture(deployHumaTokenFixture);
      await expect(humaToken.connect(owner).setGovernanceAddress(governance.address))
        .to.emit(humaToken, "GovernanceAddressSet")
        .withArgs(ethers.ZeroAddress, governance.address);
      
      expect(await humaToken.governanceAddress()).to.equal(governance.address);
    });

    it("Should not allow non-owner to set governance address", async function () {
      const { humaToken, addr1, governance } = await loadFixture(deployHumaTokenFixture);
      await expect(humaToken.connect(addr1).setGovernanceAddress(governance.address))
        .to.be.revertedWithCustomError(humaToken, "OwnableUnauthorizedAccount");
    });

    it("Should not allow setting zero address as governance", async function () {
      const { humaToken, owner } = await loadFixture(deployHumaTokenFixture);
      await expect(humaToken.connect(owner).setGovernanceAddress(ethers.ZeroAddress))
        .to.be.revertedWith("HumaToken: governance address cannot be zero");
    });

    it("Should not allow setting governance address more than once", async function () {
      const { humaToken, owner, governance, addr1 } = await loadFixture(deployHumaTokenFixture);
      
      // Définir l'adresse de governance pour la première fois
      await humaToken.connect(owner).setGovernanceAddress(governance.address);
      
      // Essayer de la définir à nouveau
      await expect(humaToken.connect(owner).setGovernanceAddress(addr1.address))
        .to.be.revertedWith("HumaToken: governance address already set");
    });
  });

  describe("mint", function () {
    it("Should allow vault to mint tokens based on donation value", async function () {
      const { humaToken, owner, vault, addr1 } = await loadFixture(deployHumaTokenFixture);
      
      // Définir l'adresse du vault
      await humaToken.connect(owner).setVaultAddress(vault.address);
      
      // Définir la valeur du don (en EUR avec 18 décimales)
      const donationValueEUR = ethers.parseEther("100"); // 100 EUR
      
      // Créer des tokens
      await humaToken.connect(vault).mint(addr1.address, donationValueEUR);
      
      // Calculer le montant attendu de tokens: 10% de base + sqrt(montant)*1e9
      const baseTokens = donationValueEUR / 10n;
      const bonusTokens = BigInt(Math.floor(Math.sqrt(Number(ethers.formatEther(donationValueEUR)) * 1e9)));
      const expectedTokens = baseTokens + bonusTokens;
      
      expect(await humaToken.balanceOf(addr1.address)).to.equal(expectedTokens);
    });

    it("Should not allow non-vault to mint tokens", async function () {
      const { humaToken, owner, vault, addr1 } = await loadFixture(deployHumaTokenFixture);
      
      // Définir l'adresse du vault
      await humaToken.connect(owner).setVaultAddress(vault.address);
      
      // Essayer de créer des tokens à partir d'un compte non-vault
      await expect(humaToken.connect(addr1).mint(addr1.address, ethers.parseEther("100")))
        .to.be.revertedWith("HumaToken: caller is not the Vault");
    });

    it("Should not allow minting to zero address", async function () {
      const { humaToken, owner, vault } = await loadFixture(deployHumaTokenFixture);
      
      // Définir l'adresse du vault
      await humaToken.connect(owner).setVaultAddress(vault.address);
      
      // Essayer de créer des tokens vers l'adresse zéro
      await expect(humaToken.connect(vault).mint(ethers.ZeroAddress, ethers.parseEther("100")))
        .to.be.revertedWith("HumaToken: mint to the zero address");
    });

    it("Should not allow minting with zero donation value", async function () {
      const { humaToken, owner, vault, addr1 } = await loadFixture(deployHumaTokenFixture);
      
      // Définir l'adresse du vault
      await humaToken.connect(owner).setVaultAddress(vault.address);
      
      // Essayer de créer des tokens avec une valeur de don nulle
      await expect(humaToken.connect(vault).mint(addr1.address, 0))
        .to.be.revertedWith("HumaToken: donation value must be positive");
    });
  });

  describe("burnFrom", function () {
    it("Should allow governance to burn tokens from a user", async function () {
      const { humaToken, owner, vault, governance, addr1 } = await loadFixture(deployHumaTokenFixture);
      
      // Définir les adresses du vault et de governance
      await humaToken.connect(owner).setVaultAddress(vault.address);
      await humaToken.connect(owner).setGovernanceAddress(governance.address);
      
      // D'abord créer quelques tokens
      const donationValueEUR = ethers.parseEther("100");
      await humaToken.connect(vault).mint(addr1.address, donationValueEUR);
      
      const initialBalance = await humaToken.balanceOf(addr1.address);
      const burnAmount = initialBalance / 2n;
      
      // Brûler des tokens
      await expect(humaToken.connect(governance).burnFrom(addr1.address, burnAmount))
        .to.emit(humaToken, "TokensBurned")
        .withArgs(addr1.address, burnAmount);
      
      expect(await humaToken.balanceOf(addr1.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should not allow non-governance to burn tokens", async function () {
      const { humaToken, owner, vault, governance, addr1 } = await loadFixture(deployHumaTokenFixture);
      
      // Définir les adresses du vault et de governance
      await humaToken.connect(owner).setVaultAddress(vault.address);
      await humaToken.connect(owner).setGovernanceAddress(governance.address);
      
      // D'abord créer quelques tokens
      await humaToken.connect(vault).mint(addr1.address, ethers.parseEther("100"));
      
      // Essayer de brûler à partir d'un compte non-governance
      await expect(humaToken.connect(addr1).burnFrom(addr1.address, ethers.parseEther("10")))
        .to.be.revertedWith("HumaToken: caller is not the Governance");
    });

    it("Should not allow burning from zero address", async function () {
      const { humaToken, owner, vault, governance } = await loadFixture(deployHumaTokenFixture);
      
      // Définir les adresses du vault et de governance
      await humaToken.connect(owner).setVaultAddress(vault.address);
      await humaToken.connect(owner).setGovernanceAddress(governance.address);
      
      // Essayer de brûler à partir de l'adresse zéro
      await expect(humaToken.connect(governance).burnFrom(ethers.ZeroAddress, ethers.parseEther("10")))
        .to.be.revertedWith("HumaToken: burn from the zero address");
    });

    it("Should not allow burning zero amount", async function () {
      const { humaToken, owner, vault, governance, addr1 } = await loadFixture(deployHumaTokenFixture);
      
      // Définir les adresses du vault et de governance
      await humaToken.connect(owner).setVaultAddress(vault.address);
      await humaToken.connect(owner).setGovernanceAddress(governance.address);
      
      // D'abord créer quelques tokens
      await humaToken.connect(vault).mint(addr1.address, ethers.parseEther("100"));
      
      // Essayer de brûler un montant nul
      await expect(humaToken.connect(governance).burnFrom(addr1.address, 0))
        .to.be.revertedWith("HumaToken: burn amount must be positive");
    });

    it("Should not allow burning more than balance", async function () {
      const { humaToken, owner, vault, governance, addr1 } = await loadFixture(deployHumaTokenFixture);
      
      // Définir les adresses du vault et de governance
      await humaToken.connect(owner).setVaultAddress(vault.address);
      await humaToken.connect(owner).setGovernanceAddress(governance.address);
      
      // D'abord créer quelques tokens
      await humaToken.connect(vault).mint(addr1.address, ethers.parseEther("100"));
      
      const balance = await humaToken.balanceOf(addr1.address);
      
      // Essayer de brûler plus que le solde
      await expect(humaToken.connect(governance).burnFrom(addr1.address, balance + 1n))
        .to.be.revertedWith("HumaToken: burn amount exceeds balance");
    });
  });
});