import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'

// deployment plugins
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import '@openzeppelin/hardhat-upgrades'

import 'hardhat-dependency-compiler'
import 'solidity-coverage'

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            runs: 200
          }
        }
      }
    ]
  },
  dependencyCompiler: {
    paths: [
      'tender-core/contracts/test/DummyTenderizer.sol',
      'tender-core/contracts/test/SimpleToken.sol',
      'tender-core/contracts/test/GraphMock.sol',
      'tender-core/contracts/token/TenderToken.sol',
      'tender-core/contracts/tenderswap/TenderSwap.sol',
      'tender-core/contracts/tenderfarm/TenderFarm.sol',
      'tender-core/contracts/tenderizer/integrations/graph/Graph.sol',
    ],
  },
  namedAccounts: {
    deployer: 0
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      blockGasLimit: 12000000
    }
  }
};
