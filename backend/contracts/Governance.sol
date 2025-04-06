// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./HumaToken.sol";
import "./Vault.sol";

/**
 * @title Governance
 * @dev Gère la gouvernance de DAO, y compris les propositions et les votes.
 */
contract Governance is AccessControl, ReentrancyGuard {
    // Rôles pour la gouvernance
    bytes32 public constant BOARD_ROLE = keccak256("BOARD_ROLE");
    
    // Référence aux autres contrats
    HumaToken public immutable humaToken;
    Vault public immutable vault;
    
    // Durée des périodes de vote
    uint256 public standardVotingPeriod = 7 days;
    uint256 public emergencyVotingPeriod = 1 days;
    
    // Période minimale de délibération obligatoire
    uint256 public minDeliberationPeriod = 1 days;
    
    // Quorum de base (pourcentage du total de tokens x 100)
    uint256 public baseQuorumPercentage = 500; // 5% (exprimé en base 10000)
    
    // Limite du nombre de propositions actives
    uint256 public maxActiveProposals = 10;
    uint256 public currentActiveProposals = 0;
    
    // Structure pour les propositions
    enum ProposalStatus { Active, Approved, Rejected, Executed, Vetoed, Expired }
    enum ProposalType { Standard, Emergency }
    
    struct ProposalCore {
        bytes32 id;
        address proposer;
        string title;
        string description;
        uint256 amount;
        address payable recipient;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        ProposalType proposalType;
    }
    
    struct Vote {
        uint8 support; // 0 = pas voté, 1 = pour, 2 = contre
        uint256 weight; // poids du vote (nombre de tokens)
    }
    
    // Mapping des propositions et des votes
    mapping(bytes32 => ProposalCore) public proposals;
    mapping(bytes32 => mapping(address => Vote)) public proposalVotes;
    bytes32[] public proposalIds;
    uint256 public proposalCount;
    
    // Événements
    event ProposalCreated(bytes32 indexed proposalId, address indexed proposer, string title, uint256 amount, address recipient, ProposalType proposalType);
    event VoteCast(bytes32 indexed proposalId, address indexed voter, bool support, uint256 amount);
    event ProposalExecuted(bytes32 indexed proposalId, address indexed executor);
    event ProposalVetoed(bytes32 indexed proposalId, address indexed boardMember, string reason);
    event ProposalFinalized(bytes32 indexed proposalId, ProposalStatus status, uint256 votesFor, uint256 votesAgainst);
    event VotingPeriodUpdated(uint256 standardPeriod, uint256 emergencyPeriod);
    event BaseQuorumUpdated(uint256 oldQuorum, uint256 newQuorum);
    event MinDeliberationPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event MaxActiveProposalsUpdated(uint256 oldMax, uint256 newMax);
    event ProposalExpired(bytes32 indexed proposalId);
    
    /**
     * @dev Constructeur initialisant la gouvernance
     * @param _humaTokenAddress Adresse du contrat HumaToken
     * @param _vaultAddress Adresse du contrat Vault
     * @param _initialBoardMembers Tableau des membres initiaux du conseil d'administration
     */
    constructor(address _humaTokenAddress, address payable _vaultAddress, address[] memory _initialBoardMembers) {
        require(_humaTokenAddress != address(0), "Governance: token address cannot be zero");
        require(_vaultAddress != address(0), "Governance: vault address cannot be zero");
        
        humaToken = HumaToken(_humaTokenAddress);
        vault = Vault(_vaultAddress);
        
        // Configure le rôle d'administrateur par défaut
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Ajoute les membres initiaux du conseil d'administration
        for (uint256 i = 0; i < _initialBoardMembers.length; i++) {
            require(_initialBoardMembers[i] != address(0), "Governance: board member cannot be zero address");
            _grantRole(BOARD_ROLE, _initialBoardMembers[i]);
        }
    }
    
    /**
     * @dev Met à jour les périodes de vote
     * @param _standardPeriod Nouvelle période standard
     * @param _emergencyPeriod Nouvelle période d'urgence
     */
    function updateVotingPeriods(uint256 _standardPeriod, uint256 _emergencyPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_standardPeriod >= 1 days, "Governance: standard period too short");
        require(_emergencyPeriod >= 4 hours, "Governance: emergency period too short");
        require(_standardPeriod > _emergencyPeriod, "Governance: standard must be longer than emergency");
        require(_standardPeriod <= 30 days, "Governance: standard period too long");
        require(_emergencyPeriod <= 7 days, "Governance: emergency period too long");
        
        standardVotingPeriod = _standardPeriod;
        emergencyVotingPeriod = _emergencyPeriod;
        
        emit VotingPeriodUpdated(_standardPeriod, _emergencyPeriod);
    }
    
    /**
     * @dev Met à jour le quorum de base requis
     * @param _newBaseQuorumPercentage Nouveau pourcentage de quorum de base (base 10000)
     */
    function updateBaseQuorum(uint256 _newBaseQuorumPercentage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newBaseQuorumPercentage > 0 && _newBaseQuorumPercentage <= 3000, "Governance: invalid quorum percentage");
        
        uint256 oldQuorum = baseQuorumPercentage;
        baseQuorumPercentage = _newBaseQuorumPercentage;
        
        emit BaseQuorumUpdated(oldQuorum, _newBaseQuorumPercentage);
    }
    
    /**
     * @dev Met à jour la période minimale de délibération
     * @param _newMinPeriod Nouvelle période minimale
     */
    function updateMinDeliberationPeriod(uint256 _newMinPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newMinPeriod > 0, "Governance: min deliberation period must be positive");
        
        uint256 oldPeriod = minDeliberationPeriod;
        minDeliberationPeriod = _newMinPeriod;
        
        emit MinDeliberationPeriodUpdated(oldPeriod, _newMinPeriod);
    }
    
    /**
     * @dev Met à jour le nombre maximum de propositions actives
     * @param _maxActiveProposals Nouvelle limite
     */
    function updateMaxActiveProposals(uint256 _maxActiveProposals) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_maxActiveProposals > 0, "Governance: max must be positive");
        
        uint256 oldMax = maxActiveProposals;
        maxActiveProposals = _maxActiveProposals;
        
        emit MaxActiveProposalsUpdated(oldMax, _maxActiveProposals);
    }
    
    /**
     * @dev Calcule le quorum dynamique en fonction du montant de la proposition
     * @param proposalId Identifiant de la proposition
     * @return Pourcentage de quorum requis (base 10000)
     */
    function getDynamicQuorum(bytes32 proposalId) public view returns (uint256) {
        ProposalCore storage proposal = proposals[proposalId];
        uint256 vaultBalance = vault.getVaultBalance();
        
        // Éviter division par zéro
        if (vaultBalance == 0) {
            return baseQuorumPercentage;
        }
        
        // Calcul du ratio: montant demandé / solde total du vault
        uint256 requestRatio = (proposal.amount * 10000) / vaultBalance;
        
        // Quorum basé sur le ratio
        if (requestRatio < 1000) {
            // Moins de 10% du solde: quorum de base
            return baseQuorumPercentage;
        } else if (requestRatio < 3000) {
            // Entre 10% et 30% du solde: quorum progressif
            return baseQuorumPercentage + requestRatio / 10;
        } else if (requestRatio < 5000) {
            // Entre 30% et 50% du solde: quorum plus élevé
            return baseQuorumPercentage + requestRatio / 5;
        } else {
            // Plus de 50% du solde: quorum maximum (30%)
            return 3000;
        }
    }
    
    /**
     * @dev Crée une nouvelle proposition standard
     * @param title Titre de la proposition
     * @param description Description détaillée de la proposition
     * @param amount Montant ETH demandé
     * @param recipient Adresse du bénéficiaire des fonds
     * @return proposalId Identifiant unique de la proposition
     */
    function createProposal(string memory title, string memory description, uint256 amount, address payable recipient) external nonReentrant returns (bytes32) {
        require(vault.isAccountDonator(msg.sender), "Governance: only donators can create proposals");
        require(bytes(title).length > 0, "Governance: title cannot be empty");
        require(bytes(description).length > 0, "Governance: description cannot be empty");
        require(bytes(title).length <= 100, "Governance: title too long");
        require(bytes(description).length <= 1000, "Governance: description too long");
        require(amount > 0 && amount <= vault.getVaultBalance(), "Governance: invalid amount");
        require(recipient != address(0), "Governance: recipient cannot be zero address");
        require(currentActiveProposals < maxActiveProposals, "Governance: max active proposals reached");
        
        // Génère un ID unique pour la proposition
        bytes32 proposalId = keccak256(abi.encodePacked(
            msg.sender, 
            block.timestamp, 
            title,
            proposalCount
        ));
        
        // Initialise la proposition
        ProposalCore storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.amount = amount;
        newProposal.recipient = recipient;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + standardVotingPeriod;
        newProposal.status = ProposalStatus.Active;
        newProposal.proposalType = ProposalType.Standard;
        
        // Ajoute l'ID à la liste des propositions
        proposalIds.push(proposalId);
        proposalCount++;
        currentActiveProposals++;
        
        emit ProposalCreated(proposalId, msg.sender, title, amount, recipient, ProposalType.Standard);
        
        return proposalId;
    }
    
    /**
     * @dev Crée une nouvelle proposition d'urgence (réservée au conseil d'administration)
     * @param title Titre de la proposition
     * @param description Description détaillée de la proposition
     * @param amount Montant ETH demandé
     * @param recipient Adresse du bénéficiaire des fonds
     * @return proposalId Identifiant unique de la proposition
     */
    function createEmergencyProposal(string memory title, string memory description, uint256 amount, address payable recipient) external onlyRole(BOARD_ROLE) nonReentrant returns (bytes32) {
        require(bytes(title).length > 0, "Governance: title cannot be empty");
        require(bytes(description).length > 0, "Governance: description cannot be empty");
        require(bytes(title).length <= 100, "Governance: title too long");
        require(bytes(description).length <= 1000, "Governance: description too long");
        require(amount > 0 && amount <= vault.getVaultBalance(), "Governance: invalid amount");
        require(recipient != address(0), "Governance: recipient cannot be zero address");
        require(currentActiveProposals < maxActiveProposals, "Governance: max active proposals reached");
        
        // Génère un ID unique pour la proposition
        bytes32 proposalId = keccak256(abi.encodePacked(
            msg.sender, 
            block.timestamp, 
            title, 
            "EMERGENCY",
            proposalCount
        ));
        
        // Initialise la proposition
        ProposalCore storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.amount = amount;
        newProposal.recipient = recipient;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + emergencyVotingPeriod;
        newProposal.status = ProposalStatus.Active;
        newProposal.proposalType = ProposalType.Emergency;
        
        // Ajoute l'ID à la liste des propositions
        proposalIds.push(proposalId);
        proposalCount++;
        currentActiveProposals++;
        
        emit ProposalCreated(proposalId, msg.sender, title, amount, recipient, ProposalType.Emergency);
        
        return proposalId;
    }
    
    /**
     * @dev Vote sur une proposition active
     * @param proposalId Identifiant de la proposition
     * @param support True pour voter en faveur, False pour voter contre
     * @param amount Montant de tokens $HUMA à utiliser pour le vote
     */
    function castVote(bytes32 proposalId, bool support, uint256 amount) external nonReentrant {
        ProposalCore storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.Active, "Governance: proposal is not active");
        require(block.timestamp <= proposal.endTime, "Governance: voting period has ended");
        require(proposalVotes[proposalId][msg.sender].support == 0, "Governance: already voted on this proposal");
        require(amount > 0, "Governance: vote amount must be positive");
        require(humaToken.balanceOf(msg.sender) >= amount, "Governance: insufficient HUMA tokens");
        
        
        // Enregistre le vote
        proposalVotes[proposalId][msg.sender] = Vote({
            support: support ? 1 : 2,
            weight: amount
        });
        
        // Met à jour le décompte des votes
        if (support) {
            proposal.votesFor += amount;
        } else {
            proposal.votesAgainst += amount;
        }
        
        // Brûle les tokens utilisés pour voter
        humaToken.burnFrom(msg.sender, amount);
        
        emit VoteCast(proposalId, msg.sender, support, amount);

    }
    
    
    /**
     * @dev Finalise une proposition (logique interne)
     * @param proposalId Identifiant de la proposition
     */
    function finalizeProposal(bytes32 proposalId) external nonReentrant {
        require(humaToken.totalSupply() > 0, "Governance: no tokens in circulation");
        ProposalCore storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.Active, "Governance: proposal is not active");
        
        require(
            block.timestamp >= proposal.startTime + minDeliberationPeriod,
            "Governance: minimum deliberation period not met"
        );
        
        bool votingEnded = block.timestamp > proposal.endTime;
        
        if (!votingEnded) {
            revert("Governance: voting still in progress");
        }
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        uint256 dynamicQuorumPercentage = getDynamicQuorum(proposalId);
        uint256 requiredQuorum = (humaToken.totalSupply() * dynamicQuorumPercentage) / 10000;
        
        if (totalVotes < requiredQuorum) {
            proposal.status = ProposalStatus.Rejected;
            currentActiveProposals--;
            emit ProposalFinalized(proposalId, ProposalStatus.Rejected, proposal.votesFor, proposal.votesAgainst);
            return;
        }
        
        if (proposal.votesFor > proposal.votesAgainst) {
            proposal.status = ProposalStatus.Approved;
        } else {
            proposal.status = ProposalStatus.Rejected;
        }
        
        currentActiveProposals--;
        emit ProposalFinalized(proposalId, proposal.status, proposal.votesFor, proposal.votesAgainst);
    }


    /**
     * @dev Exécute une proposition approuvée
     * @param proposalId Identifiant de la proposition
     */
    function executeProposal(bytes32 proposalId) external nonReentrant {
        ProposalCore storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.Approved, "Governance: proposal is not approved");
        
        // Met à jour le statut de la proposition
        proposal.status = ProposalStatus.Executed;
        
        // Transfère les fonds via le vault
        vault.transferFunds(proposal.recipient, proposal.amount, proposalId);
        
        emit ProposalExecuted(proposalId, msg.sender);
    }
    
    /**
     * @dev Droit de veto pour le conseil d'administration (uniquement pour des raisons légales)
     * @param proposalId Identifiant de la proposition
     * @param reason Raison légale du veto
     */
    function vetoProposal(bytes32 proposalId, string memory reason) external onlyRole(BOARD_ROLE) nonReentrant {
        ProposalCore storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.Approved, "Governance: proposal is not approved");
        require(bytes(reason).length > 0, "Governance: reason cannot be empty");
        
        // Met à jour le statut de la proposition
        proposal.status = ProposalStatus.Vetoed;
        
        emit ProposalVetoed(proposalId, msg.sender, reason);
    }
    
    /**
     * @dev Marque les propositions expirées
     * @param _proposalIdsToCheck Tableau d'identifiants de propositions à vérifier
     */
    function cleanupExpiredProposals(bytes32[] calldata _proposalIdsToCheck) external nonReentrant {
        for (uint256 i = 0; i < _proposalIdsToCheck.length; i++) {
            ProposalCore storage proposal = proposals[_proposalIdsToCheck[i]];
            
            if (proposal.status == ProposalStatus.Active && 
                block.timestamp > proposal.endTime && 
                proposal.votesFor + proposal.votesAgainst == 0) {
                
                proposal.status = ProposalStatus.Expired;
                currentActiveProposals--;
                
                emit ProposalExpired(_proposalIdsToCheck[i]);
            }
        }
    }
    
    /**
     * @dev Récupère les détails d'une proposition
     * @param proposalId Identifiant de la proposition
     * @return title Titre de la proposition
     * @return description Description de la proposition
     * @return amount Montant demandé
     * @return recipient Adresse du bénéficiaire
     * @return votesFor Votes en faveur
     * @return votesAgainst Votes contre
     * @return startTime Début de la période de vote
     * @return endTime Fin de la période de vote
     * @return status Statut de la proposition
     * @return proposalType Type de proposition
     */
    function getProposalDetails(bytes32 proposalId) external view returns (
        string memory title,
        string memory description,
        uint256 amount,
        address recipient,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 startTime,
        uint256 endTime,
        ProposalStatus status,
        ProposalType proposalType
    ) {
        ProposalCore storage proposal = proposals[proposalId];
        
        return (
            proposal.title,
            proposal.description,
            proposal.amount,
            proposal.recipient,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.startTime,
            proposal.endTime,
            proposal.status,
            proposal.proposalType
        );
    }
    
    /**
     * @dev Récupère le statut d'un vote pour un utilisateur
     * @param proposalId Identifiant de la proposition
     * @param voter Adresse du votant
     * @return support 0=pas voté, 1=pour, 2=contre
     * @return weight Poids du vote
     */
    function getVoteInfo(bytes32 proposalId, address voter) external view returns (uint8 support, uint256 weight) {
        Vote storage vote = proposalVotes[proposalId][voter];
        return (vote.support, vote.weight);
    }
    
    /**
     * @dev Récupère le nombre total de propositions
     * @return uint256 Nombre total de propositions
     */
    function getProposalCount() external view returns (uint256) {
        return proposalIds.length;
    }
    
    /**
     * @dev Récupère les IDs des propositions actives
     * @return bytes32[] Tableau des IDs de propositions actives
     */
    function getActiveProposals() external view returns (bytes32[] memory) {
        bytes32[] memory activeIds = new bytes32[](currentActiveProposals);
        
        if (currentActiveProposals == 0) {
            return activeIds;
        }
        
        uint256 index = 0;
        for (uint256 i = 0; i < proposalIds.length && index < currentActiveProposals; i++) {
            if (proposals[proposalIds[i]].status == ProposalStatus.Active) {
                activeIds[index] = proposalIds[i];
                index++;
            }
        }
        
        return activeIds;
    }
    
    /**
     * @dev Ajoute un nouveau membre au conseil d'administration
     * @param newBoardMember Adresse du nouveau membre du conseil
     */
    function addBoardMember(address newBoardMember) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newBoardMember != address(0), "Governance: invalid address");
        require(!hasRole(BOARD_ROLE, newBoardMember), "Governance: already a board member");
        
        _grantRole(BOARD_ROLE, newBoardMember);
    }
    
    /**
     * @dev Retire un membre du conseil d'administration
     * @param boardMember Adresse du membre à retirer
     */
    function removeBoardMember(address boardMember) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(BOARD_ROLE, boardMember), "Governance: not a board member");
        
        _revokeRole(BOARD_ROLE, boardMember);
    }
}