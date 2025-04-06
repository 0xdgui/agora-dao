const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance", function () {
  let Governance, HumaToken, Vault;
  let governance, humaToken, vault;
  let owner, boardMember, donator, user, recipient;
  const ONE_DAY = 24 * 60 * 60;
  const SEVEN_DAYS = 7 * ONE_DAY;
  const FOUR_HOURS = 4 * 60 * 60;

  const toWei = (amount) => ethers.parseEther(amount.toString());

  beforeEach(async function () {
    [owner, boardMember, donator, user, recipient] = await ethers.getSigners();

    HumaToken = await ethers.getContractFactory("HumaToken");
    humaToken = await HumaToken.deploy(owner.address);
    await humaToken.waitForDeployment();

    Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy(owner.address, humaToken.target, toWei("3000")); // 3000 ETH/EUR
    await vault.waitForDeployment();

    await humaToken.setVaultAddress(vault.target);

    Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy(humaToken.target, vault.target, [boardMember.address]);
    await governance.waitForDeployment();

    await humaToken.setGovernanceAddress(governance.target);
    await vault.setGovernanceAddress(governance.target);

    // Faire de donator un donateur
    await vault.connect(donator).depositETH({ value: toWei("1") });
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await governance.humaToken()).to.equal(humaToken.target);
      expect(await governance.vault()).to.equal(vault.target);
      expect(await governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await governance.hasRole(governance.BOARD_ROLE(), boardMember.address)).to.be.true;
    });

    it("Should revert if token or vault address is zero", async function () {
      await expect(Governance.deploy(ethers.ZeroAddress, vault.target, [boardMember.address])).to.be.revertedWith("Governance: token address cannot be zero");
      await expect(Governance.deploy(humaToken.target, ethers.ZeroAddress, [boardMember.address])).to.be.revertedWith("Governance: vault address cannot be zero");
    });

    it("Should revert if board member is zero address", async function () {
      await expect(Governance.deploy(humaToken.target, vault.target, [ethers.ZeroAddress])).to.be.revertedWith("Governance: board member cannot be zero address");
    });
  });

  describe("updateVotingPeriods", function () {
    it("Should update voting periods", async function () {
      await expect(governance.updateVotingPeriods(SEVEN_DAYS * 2, ONE_DAY * 2))
        .to.emit(governance, "VotingPeriodUpdated")
        .withArgs(SEVEN_DAYS * 2, ONE_DAY * 2);
    });

    it("Should revert if not admin or invalid periods", async function () {
      const DEFAULT_ADMIN_ROLE = await governance.DEFAULT_ADMIN_ROLE();
      await expect(governance.connect(user).updateVotingPeriods(SEVEN_DAYS, ONE_DAY))
        .to.be.revertedWithCustomError(governance, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
      await expect(governance.updateVotingPeriods(ONE_DAY - 1, ONE_DAY)).to.be.revertedWith("Governance: standard period too short");
      await expect(governance.updateVotingPeriods(SEVEN_DAYS, FOUR_HOURS - 1)).to.be.revertedWith("Governance: emergency period too short");
      await expect(governance.updateVotingPeriods(ONE_DAY, ONE_DAY)).to.be.revertedWith("Governance: standard must be longer than emergency");
      await expect(governance.updateVotingPeriods(SEVEN_DAYS * 5, ONE_DAY)).to.be.revertedWith("Governance: standard period too long");
      await expect(governance.updateVotingPeriods(SEVEN_DAYS * 2, SEVEN_DAYS + 1)).to.be.revertedWith("Governance: emergency period too long");
    });
  });

  describe("updateBaseQuorum", function () {
    it("Should update base quorum", async function () {
      await expect(governance.updateBaseQuorum(1000))
        .to.emit(governance, "BaseQuorumUpdated")
        .withArgs(500, 1000);
    });

    it("Should revert if not admin or invalid quorum", async function () {
      const DEFAULT_ADMIN_ROLE = await governance.DEFAULT_ADMIN_ROLE();
      await expect(governance.connect(user).updateBaseQuorum(1000))
        .to.be.revertedWithCustomError(governance, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
      await expect(governance.updateBaseQuorum(0)).to.be.revertedWith("Governance: invalid quorum percentage");
      await expect(governance.updateBaseQuorum(3001)).to.be.revertedWith("Governance: invalid quorum percentage");
    });
  });

  describe("updateMinDeliberationPeriod", function () {
    it("Should update deliberation period", async function () {
      await expect(governance.updateMinDeliberationPeriod(ONE_DAY * 2))
        .to.emit(governance, "MinDeliberationPeriodUpdated")
        .withArgs(ONE_DAY, ONE_DAY * 2);
    });

    it("Should revert if not admin or invalid period", async function () {
      const DEFAULT_ADMIN_ROLE = await governance.DEFAULT_ADMIN_ROLE();
      await expect(governance.connect(user).updateMinDeliberationPeriod(ONE_DAY * 2))
        .to.be.revertedWithCustomError(governance, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
      await expect(governance.updateMinDeliberationPeriod(0)).to.be.revertedWith("Governance: min deliberation period must be positive");
    });
  });

  describe("updateMaxActiveProposals", function () {
    it("Should update max active proposals", async function () {
      await expect(governance.updateMaxActiveProposals(20))
        .to.emit(governance, "MaxActiveProposalsUpdated")
        .withArgs(10, 20);
    });

    it("Should revert if not admin or invalid max", async function () {
      const DEFAULT_ADMIN_ROLE = await governance.DEFAULT_ADMIN_ROLE();
      await expect(governance.connect(user).updateMaxActiveProposals(20))
        .to.be.revertedWithCustomError(governance, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
      await expect(governance.updateMaxActiveProposals(0)).to.be.revertedWith("Governance: max must be positive");
    });
  });

  describe("createProposal", function () {
    it("Should create a standard proposal", async function () {
      const tx = await governance.connect(donator).createProposal("Title", "Description", toWei("0.5"), recipient.address);
      const receipt = await tx.wait();
      const proposalId = receipt.logs[0].args[0];
      const proposal = await governance.proposals(proposalId);
      expect(proposal.status).to.equal(0); // Active
      expect(proposal.title).to.equal("Title");
      expect(await governance.currentActiveProposals()).to.equal(1);
    });

    it("Should revert if not donator or invalid inputs", async function () {
      await expect(governance.connect(user).createProposal("Title", "Desc", toWei("0.5"), recipient.address)).to.be.revertedWith("Governance: only donators can create proposals");
      await expect(governance.connect(donator).createProposal("", "Desc", toWei("0.5"), recipient.address)).to.be.revertedWith("Governance: title cannot be empty");
      await expect(governance.connect(donator).createProposal("Title", "", toWei("0.5"), recipient.address)).to.be.revertedWith("Governance: description cannot be empty");
      await expect(governance.connect(donator).createProposal("a".repeat(101), "Desc", toWei("0.5"), recipient.address)).to.be.revertedWith("Governance: title too long");
      await expect(governance.connect(donator).createProposal("Title", "a".repeat(1001), toWei("0.5"), recipient.address)).to.be.revertedWith("Governance: description too long");
      await expect(governance.connect(donator).createProposal("Title", "Desc", 0, recipient.address)).to.be.revertedWith("Governance: invalid amount");
      await expect(governance.connect(donator).createProposal("Title", "Desc", toWei("2"), recipient.address)).to.be.revertedWith("Governance: invalid amount");
      await expect(governance.connect(donator).createProposal("Title", "Desc", toWei("0.5"), ethers.ZeroAddress)).to.be.revertedWith("Governance: recipient cannot be zero address");
    });

    it("Should revert if max active proposals reached", async function () {
      await governance.updateMaxActiveProposals(1);
      await governance.connect(donator).createProposal("Title1", "Desc1", toWei("0.1"), recipient.address);
      await expect(governance.connect(donator).createProposal("Title2", "Desc2", toWei("0.1"), recipient.address)).to.be.revertedWith("Governance: max active proposals reached");
    });
  });

  describe("createEmergencyProposal", function () {
    it("Should create an emergency proposal", async function () {
      const tx = await governance.connect(boardMember).createEmergencyProposal("Emergency", "Urgent", toWei("0.5"), recipient.address);
      const receipt = await tx.wait();
      const proposalId = receipt.logs[0].args[0];
      const proposal = await governance.proposals(proposalId);
      expect(proposal.status).to.equal(0); // Active
      expect(proposal.proposalType).to.equal(1); // Emergency
    });

    it("Should revert if not board member or invalid inputs", async function () {
      const BOARD_ROLE = await governance.BOARD_ROLE();
      await expect(governance.connect(user).createEmergencyProposal("Emergency", "Urgent", toWei("0.5"), recipient.address))
        .to.be.revertedWithCustomError(governance, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, BOARD_ROLE);
      await expect(governance.connect(boardMember).createEmergencyProposal("", "Urgent", toWei("0.5"), recipient.address)).to.be.revertedWith("Governance: title cannot be empty");
    });
  });

  describe("castVote", function () {
    let proposalId;
    beforeEach(async function () {
      const tx = await governance.connect(donator).createProposal("Title", "Description", toWei("0.5"), recipient.address);
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
      await vault.connect(donator).depositETH({ value: toWei("10") }); // Ajoute plus de tokens pour les votes
    });

    it("Should cast a vote for", async function () {
      await governance.connect(donator).castVote(proposalId, true, toWei("0.5"));
      const vote = await governance.proposalVotes(proposalId, donator.address);
      expect(vote.support).to.equal(1);
      expect(vote.weight).to.equal(toWei("0.5"));
    });

    it("Should cast a vote against", async function () {
      await governance.connect(donator).castVote(proposalId, false, toWei("0.5"));
      const vote = await governance.proposalVotes(proposalId, donator.address);
      expect(vote.support).to.equal(2);
    });

    it("Should revert if invalid conditions", async function () {
      await expect(governance.connect(donator).castVote(proposalId, true, 0)).to.be.revertedWith("Governance: vote amount must be positive");
      await expect(governance.connect(user).castVote(proposalId, true, toWei("0.5"))).to.be.revertedWith("Governance: insufficient HUMA tokens");
      await governance.connect(donator).castVote(proposalId, true, toWei("0.1"));
      await expect(governance.connect(donator).castVote(proposalId, true, toWei("0.1"))).to.be.revertedWith("Governance: already voted on this proposal");
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
      await expect(governance.connect(donator).castVote(proposalId, true, toWei("0.1"))).to.be.revertedWith("Governance: voting period has ended");
    });
  });

  describe("finalizeProposal", function () {
    let proposalId;
    beforeEach(async function () {
      await governance.updateBaseQuorum(50); // Réduire le quorum à 0.5%
      const tx = await governance.connect(donator).createProposal("Title", "Description", toWei("0.5"), recipient.address);
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
      await vault.connect(donator).depositETH({ value: toWei("10") }); // Ajoute des tokens
    });

    it("Should finalize as approved", async function () {
      await governance.connect(donator).castVote(proposalId, true, toWei("5")); // Plus de votes pour dépasser le quorum
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
      await governance.finalizeProposal(proposalId);
      const proposal = await governance.proposals(proposalId);
      expect(proposal.status).to.equal(1); // Approved
    });

    it("Should finalize as rejected with no quorum", async function () {
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
      await governance.finalizeProposal(proposalId);
      const proposal = await governance.proposals(proposalId);
      expect(proposal.status).to.equal(2); // Rejected
    });

    it("Should revert if voting still in progress", async function () {
      await ethers.provider.send("evm_increaseTime", [ONE_DAY + 1]); // Après 1 jour mais avant 7 jours
      await expect(governance.finalizeProposal(proposalId)).to.be.revertedWith("Governance: voting still in progress");
    });

    it("Should revert if minimum deliberation period not met", async function () {
      await expect(governance.finalizeProposal(proposalId)).to.be.revertedWith("Governance: minimum deliberation period not met");
    });

    it("Should revert if no tokens in circulation", async function () {
      const newHumaToken = await HumaToken.deploy(owner.address);
      await newHumaToken.waitForDeployment();
      const newVault = await Vault.deploy(owner.address, newHumaToken.target, toWei("3000"));
      await newHumaToken.setVaultAddress(newVault.target);
      const newGovernance = await Governance.deploy(newHumaToken.target, newVault.target, [boardMember.address]);
      await newHumaToken.setGovernanceAddress(newGovernance.target);
      await newVault.setGovernanceAddress(newGovernance.target);
      await newVault.connect(donator).depositETH({ value: toWei("1") }); // Donator status
      const tx = await newGovernance.connect(donator).createProposal("Title", "Desc", toWei("0.5"), recipient.address);
      const receipt = await tx.wait();
      const newProposalId = receipt.logs[0].args[0];
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
      await expect(newGovernance.finalizeProposal(newProposalId)).to.be.revertedWith("Governance: no tokens in circulation");
    });
  });

  describe("executeProposal", function () {
    let proposalId;
    beforeEach(async function () {
      await governance.updateBaseQuorum(50); // Réduire le quorum
      const tx = await governance.connect(donator).createProposal("Title", "Description", toWei("0.5"), recipient.address);
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
      await vault.connect(donator).depositETH({ value: toWei("10") }); // Ajoute des tokens
      await governance.connect(donator).castVote(proposalId, true, toWei("5"));
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
      await governance.finalizeProposal(proposalId);
    });

    it("Should execute proposal", async function () {
      await governance.executeProposal(proposalId);
      const proposal = await governance.proposals(proposalId);
      expect(proposal.status).to.equal(3); 
    });

    it("Should revert if not approved", async function () {
      await governance.connect(boardMember).vetoProposal(proposalId, "Legal reason");
      await expect(governance.executeProposal(proposalId)).to.be.revertedWith("Governance: proposal is not approved");
    });
  });

  describe("vetoProposal", function () {
    let proposalId;
    beforeEach(async function () {
      await governance.updateBaseQuorum(50); // Réduire le quorum
      const tx = await governance.connect(donator).createProposal("Title", "Description", toWei("0.5"), recipient.address);
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
      await vault.connect(donator).depositETH({ value: toWei("10") }); // Ajoute des tokens
      await governance.connect(donator).castVote(proposalId, true, toWei("5"));
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
      await governance.finalizeProposal(proposalId);
    });

    it("Should veto proposal", async function () {
      await governance.connect(boardMember).vetoProposal(proposalId, "Legal reason");
      const proposal = await governance.proposals(proposalId);
      expect(proposal.status).to.equal(4); // Vetoed
    });

    it("Should revert if not board member or invalid", async function () {
      const BOARD_ROLE = await governance.BOARD_ROLE();
      await expect(governance.connect(user).vetoProposal(proposalId, "Reason"))
        .to.be.revertedWithCustomError(governance, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, BOARD_ROLE);
      await expect(governance.connect(boardMember).vetoProposal(proposalId, "")).to.be.revertedWith("Governance: reason cannot be empty");
    });
  });

  describe("cleanupExpiredProposals", function () {
    let proposalId;
    beforeEach(async function () {
      const tx = await governance.connect(donator).createProposal("Title", "Description", toWei("0.5"), recipient.address);
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
    });

    it("Should cleanup expired proposal", async function () {
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
      await governance.cleanupExpiredProposals([proposalId]);
      const proposal = await governance.proposals(proposalId);
      expect(proposal.status).to.equal(5); // Expired
      expect(await governance.currentActiveProposals()).to.equal(0);
    });

    it("Should not affect voted proposal", async function () {
      await vault.connect(donator).depositETH({ value: toWei("1") }); // Ajoute des tokens
      await governance.connect(donator).castVote(proposalId, true, toWei("0.5"));
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
      await governance.cleanupExpiredProposals([proposalId]);
      const proposal = await governance.proposals(proposalId);
      expect(proposal.status).to.equal(0); // Active
    });
  });

  describe("View Functions", function () {
    let proposalId1, proposalId2;
    beforeEach(async function () {
      const tx1 = await governance.connect(donator).createProposal("Title1", "Desc1", toWei("0.5"), recipient.address);
      const receipt1 = await tx1.wait();
      proposalId1 = receipt1.logs[0].args[0];
      const tx2 = await governance.connect(donator).createProposal("Title2", "Desc2", toWei("0.5"), recipient.address);
      const receipt2 = await tx2.wait();
      proposalId2 = receipt2.logs[0].args[0];
      await ethers.provider.send("evm_increaseTime", [SEVEN_DAYS + 1]);
      await governance.cleanupExpiredProposals([proposalId1]);
    });

    it("Should return proposal details", async function () {
      const details = await governance.getProposalDetails(proposalId1);
      expect(details.title).to.equal("Title1");
      expect(details.status).to.equal(5); // Expired
    });

    it("Should return vote info", async function () {
      await vault.connect(donator).depositETH({ value: toWei("1") }); // Ajoute des tokens
      await governance.connect(donator).castVote(proposalId2, true, toWei("0.5"));
      const [support, weight] = await governance.getVoteInfo(proposalId2, donator.address);
      expect(support).to.equal(1);
      expect(weight).to.equal(toWei("0.5"));
    });

    it("Should return proposal count", async function () {
      expect(await governance.getProposalCount()).to.equal(2);
    });

    it("Should return active proposals", async function () {
      const activeProposals = await governance.getActiveProposals();
      expect(activeProposals.length).to.equal(1);
      expect(activeProposals[0]).to.equal(proposalId2);
    });
  });

  describe("Board Management", function () {
    it("Should add and remove board member", async function () {
      await governance.addBoardMember(user.address);
      expect(await governance.hasRole(governance.BOARD_ROLE(), user.address)).to.be.true;
      await governance.removeBoardMember(user.address);
      expect(await governance.hasRole(governance.BOARD_ROLE(), user.address)).to.be.false;
    });

    it("Should revert if not admin or invalid", async function () {
      const DEFAULT_ADMIN_ROLE = await governance.DEFAULT_ADMIN_ROLE();
      await expect(governance.connect(user).addBoardMember(user.address))
        .to.be.revertedWithCustomError(governance, "AccessControlUnauthorizedAccount")
        .withArgs(user.address, DEFAULT_ADMIN_ROLE);
      await expect(governance.addBoardMember(ethers.ZeroAddress)).to.be.revertedWith("Governance: invalid address");
      await expect(governance.addBoardMember(boardMember.address)).to.be.revertedWith("Governance: already a board member");
      await expect(governance.removeBoardMember(user.address)).to.be.revertedWith("Governance: not a board member");
    });
  });

  describe("getDynamicQuorum", function () {
    let proposalId;
    it("Should return base quorum when vault balance is zero", async function () {
      const newHumaToken = await HumaToken.deploy(owner.address);
      await newHumaToken.waitForDeployment();
      const newVault = await Vault.deploy(owner.address, newHumaToken.target, toWei("3000"));
      await newHumaToken.setVaultAddress(newVault.target);
      const newGovernance = await Governance.deploy(newHumaToken.target, newVault.target, [boardMember.address]);
      await newHumaToken.setGovernanceAddress(newGovernance.target);
      await newVault.setGovernanceAddress(newGovernance.target);
      await newVault.connect(donator).depositETH({ value: toWei("1") }); // Donator status
      const tx = await newGovernance.connect(donator).createProposal("Title", "Desc", toWei("0.5"), recipient.address);
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
      expect(await newGovernance.getDynamicQuorum(proposalId)).to.equal(500); // Base quorum
    });

    it("Should return base quorum for <10% range", async function () {
      await vault.connect(donator).depositETH({ value: toWei("9") }); // Vault balance = 10 ETH
      const tx = await governance.connect(donator).createProposal("Title", "Desc", toWei("0.5"), recipient.address); // 5%
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
      expect(await governance.getDynamicQuorum(proposalId)).to.equal(500);
    });

    it("Should return progressive quorum for 10-30% range", async function () {
      await vault.connect(donator).depositETH({ value: toWei("4") }); // Vault balance = 5 ETH
      const tx = await governance.connect(donator).createProposal("Title", "Desc", toWei("1"), recipient.address); // 20%
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
      expect(await governance.getDynamicQuorum(proposalId)).to.equal(700); // 500 + (2000 / 10)
    });

    it("Should return higher quorum for 30-50% range", async function () {
      await vault.connect(donator).depositETH({ value: toWei("2") }); // Vault balance = 3 ETH
      const tx = await governance.connect(donator).createProposal("Title", "Desc", toWei("1"), recipient.address); // ~33%
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
      expect(await governance.getDynamicQuorum(proposalId)).to.equal(1166); // 500 + (3333 / 5)
    });

    it("Should return max quorum for >50% range", async function () {
      const tx = await governance.connect(donator).createProposal("Title", "Desc", toWei("1"), recipient.address); // >50% of 1 ETH
      const receipt = await tx.wait();
      proposalId = receipt.logs[0].args[0];
      expect(await governance.getDynamicQuorum(proposalId)).to.equal(3000);
    });
  });
});