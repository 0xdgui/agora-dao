// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./HumaToken.sol";

/**
 * @title Vault
 * @dev Gère les dépôts ETH et distribue les tokens $HUMA en fonction de la valeur en EUR
 */
contract Vault is Ownable, ReentrancyGuard {
    // Contrats externes
    HumaToken public humaToken;
    
    // Adresse du contrat de gouvernance
    address public governanceAddress;
    
    // Prix fixe ETH/EUR (avec 18 décimales)
    uint256 public ethEurPrice;
    
    // Mapping des donateurs (pour attribution du statut d'adhérent)
    mapping(address => uint8) public isDonator; // 0 = non donateur, 1 = donateur
    
    // Événements
    event Deposit(address indexed donor, uint256 amountETH, uint256 valueEUR, uint256 tokensAwarded);
    event FundsTransferred(address indexed destination, uint256 amount, bytes32 proposalId);
    event GovernanceAddressSet(address indexed previousGovernance, address indexed newGovernance);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);

    /**
     * @dev Modifier pour restreindre l'accès à la Governance uniquement
     */
    modifier onlyGovernance() {
        require(msg.sender == governanceAddress, "Vault: caller is not the Governance");
        _;
    }
    
    /**
     * @dev Constructeur initialisant le Vault
     * @param initialOwner Propriétaire initial du contrat
     * @param _humaTokenAddress Adresse du contrat HUMAToken
     * @param _initialEthEurPrice Prix initial ETH/EUR (avec 18 décimales)
     */
    constructor(address initialOwner, address _humaTokenAddress, uint256 _initialEthEurPrice) Ownable(initialOwner) {
        require(initialOwner != address(0), "Vault: owner cannot be zero address");
        require(_humaTokenAddress != address(0), "Vault: token address cannot be zero address");
        require(_initialEthEurPrice > 0, "Vault: price must be positive");
        
        humaToken = HumaToken(_humaTokenAddress);
        ethEurPrice = _initialEthEurPrice;
    }
    
    /**
     * @dev Définit l'adresse du contrat de gouvernance
     * @param _governanceAddress Adresse du contrat de gouvernance
     */
    function setGovernanceAddress(address _governanceAddress) external onlyOwner {
        require(_governanceAddress != address(0), "Vault: governance cannot be zero address");
        
        address oldGovernanceAddress = governanceAddress;
        governanceAddress = _governanceAddress;
        
        emit GovernanceAddressSet(oldGovernanceAddress, _governanceAddress);
    }
    
    /**
     * @dev Met à jour le prix ETH/EUR
     * @param _newEthEurPrice Nouveau prix ETH/EUR (avec 18 décimales)
     */
    function updateEthEurPrice(uint256 _newEthEurPrice) external onlyOwner {
        require(_newEthEurPrice > 0, "Vault: price must be positive");
        
        uint256 oldPrice = ethEurPrice;
        ethEurPrice = _newEthEurPrice;
        
        emit PriceUpdated(oldPrice, _newEthEurPrice);
    }
    
    /**
     * @dev Fonction fallback - redirige vers depositETH
     */
    fallback() external payable {
        depositETH();
    }
    
    /**
     * @dev Fonction receive - redirige vers depositETH
     */
    receive() external payable {
        depositETH();
    }
    
    /**
     * @dev Fonction pour faire un don en ETH et recevoir des tokens $HUMA
     */
    function depositETH() public payable nonReentrant {
        if (msg.value == 0 && gasleft() > 100000) {
            return;
        }
        require(msg.value > 0, "Vault: donation must be greater than 0");
        
        // Cache variable d'état pour économiser du gas
        uint8 isDonatorStatus = isDonator[msg.sender];
        
        // Calcule la valeur du don en EUR (avec prix fixe)
        uint256 donationValueEUR = (msg.value * ethEurPrice) / 1e18;
        
        // Marque l'adresse comme donateur (adhérent) 
        if (isDonatorStatus == 0) {
            isDonator[msg.sender] = 1;
        }
        
        // Mint des tokens HUMA pour le donateur 
        uint256 tokensAwarded = humaToken.mint(msg.sender, donationValueEUR);
        
        emit Deposit(msg.sender, msg.value, donationValueEUR, tokensAwarded);
    }
    
    /**
     * @dev Transfère des fonds vers une destination approuvée par la gouvernance
     * @param destination Adresse de destination des fonds
     * @param amount Montant à transférer
     * @param proposalId Identifiant de la proposition approuvée
     */
    function transferFunds(address payable destination, uint256 amount, bytes32 proposalId) external onlyGovernance nonReentrant {
        require(destination != address(0), "Vault: destination cannot be zero address");
        require(amount > 0, "Vault: amount must be greater than 0");
        require(amount <= address(this).balance, "Vault: insufficient funds in vault");
        
        emit FundsTransferred(destination, amount, proposalId);

        (bool success, ) = destination.call{value: amount}("");
        require(success, "Vault: transfer failed");
    }
    
    /**
     * @dev Récupère le solde actuel du vault
     */
    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Vérifie si une adresse est un donateur
     * @param account Adresse à vérifier
     * @return bool Vrai si l'adresse est un donateur, faux sinon
     */
    function isAccountDonator(address account) external view returns (bool) {
        return isDonator[account] == 1;
    }
}