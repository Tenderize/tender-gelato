import { HardhatUserConfig } from 'hardhat/types'

import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'

// deployment plugins
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'
import '@openzeppelin/hardhat-upgrades'

import 'hardhat-dependency-compiler'
import 'solidity-coverage'
import '@nomiclabs/hardhat-etherscan'

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config()
const PRIVATE_KEY = process.env.PRIVATE_KEY
const JSON_RPC = process.env.JSON_RPC
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY

function loadTasks () {
  const tasksPath = path.join(__dirname, 'tasks')
  fs.readdirSync(tasksPath).forEach(task => {
    require(`${tasksPath}/${task}`)
  })
}

if (
  fs.existsSync(path.join(__dirname, 'artifacts')) &&
  fs.existsSync(path.join(__dirname, 'typechain-types'))
) {
  loadTasks()
}

const config : HardhatUserConfig = {
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
    },
    mainnet: {
      url: JSON_RPC,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : undefined
    },
    rinkeby: {
      url: JSON_RPC,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : undefined
    },
    arbitrum: {
      url: JSON_RPC,
      accounts: PRIVATE_KEY ? [`0x${PRIVATE_KEY}`] : undefined
    }
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      rinkeby: ETHERSCAN_API_KEY,
      arbitrumOne: ARBISCAN_API_KEY
    }
  }
}

export default config
