import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy("MainnetResolver", {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: 'EIP173ProxyWithReceive',
      owner: deployer,
      execute: {
        init: {
          methodName: 'initialize',
          args: []
        }
      }
    }
  })
}

func.tags = ['MainnetResolver']
export default func
