// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title HumaToken
 * @dev Token de gouvernance pour AgoraDAO
 */
contract HumaToken is ERC20, Ownable, ReentrancyGuard {
    using Math for uint256;

    // Adresse du contrat Vault pour vérification des appels
    address public vaultAddress;
    // Adresse du contrat Governance pour vérification des appels
    address public governanceAddress;

    // Événements
    event VaultAddressSet(address indexed previousVault, address indexed newVault);
    event GovernanceAddressSet(address indexed previousGovernance, address indexed newGovernance);
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Modifier pour restreindre l'accès au Vault uniquement
     */
    modifier onlyVault() {
        require(msg.sender == vaultAddress, "HumaToken: caller is not the Vault");
        _;
    }

    /**
     * @dev Modifier pour restreindre l'accès à la Governance uniquement
     */
    modifier onlyGovernance() {
        require(msg.sender == governanceAddress, "HumaToken: caller is not the Governance");
        _;
    }

    /**
     * @dev Constructeur initialisant le token HUMA
     * @param initialOwner Propriétaire initial du contrat
     */
    constructor(address initialOwner) ERC20("Humanitarian Token", "HUMA") Ownable(initialOwner) {
        require(initialOwner != address(0), "HumaToken: owner cannot be zero address");
    }

    /**
     * @dev Définit l'adresse du Vault autorisé à mint des tokens HUMA
     * @param _vaultAddress L'adresse du contrat Vault
     */
    function setVaultAddress(address _vaultAddress) external onlyOwner {
        require(vaultAddress == address(0), "HumaToken: vault address already set");
        require(_vaultAddress != address(0), "HumaToken: vault address cannot be zero");
        
        vaultAddress = _vaultAddress;
        emit VaultAddressSet(address(0), _vaultAddress);
    }

    /**
     * @dev Définit l'adresse du contrat de Governance
     * @param _governanceAddress L'adresse du contrat Governance
     */
    function setGovernanceAddress(address _governanceAddress) external onlyOwner {
        require(governanceAddress == address(0), "HumaToken: governance address already set");
        require(_governanceAddress != address(0), "HumaToken: governance address cannot be zero");
        
        governanceAddress = _governanceAddress;
        emit GovernanceAddressSet(address(0), _governanceAddress);
    }

    /**
     * @dev Mint des tokens HUMA basé sur la valeur du don en EUR
     * @param to Adresse du bénéficiaire
     * @param donationValueEUR Valeur du don en EUR (avec 18 décimales)
     * @return tokenAmount Montant de tokens créés
     */
    function mint(address to, uint256 donationValueEUR) external onlyVault nonReentrant returns (uint256) {
        require(to != address(0), "HumaToken: mint to the zero address");
        require(donationValueEUR > 0, "HumaToken: donation value must be positive");

        // Approche mixte linéaire/non-linéaire
        // Base minimum (10% de la valeur) + partie progressive (racine carrée)
        uint256 baseTokens = donationValueEUR / 10; // 10% fixe
        uint256 bonusTokens = Math.sqrt(donationValueEUR) * 1e9; // Bonus progressif
        uint256 tokenAmount = baseTokens + bonusTokens;
        
        _mint(to, tokenAmount);
        return tokenAmount;
    }

    /**
     * @dev Brûle les tokens lors de leur utilisation pour voter
     * @param from Adresse de l'utilisateur dont les tokens sont brûlés
     * @param amount Montant de tokens à brûler
     */
    function burnFrom(address from, uint256 amount) external onlyGovernance nonReentrant {
        require(from != address(0), "HumaToken: burn from the zero address");
        require(amount > 0, "HumaToken: burn amount must be positive");
        require(balanceOf(from) >= amount, "HumaToken: burn amount exceeds balance");
        
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
}