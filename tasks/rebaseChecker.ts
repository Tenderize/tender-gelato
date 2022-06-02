import { task, types } from 'hardhat/config'
import { IResolver } from '../typechain-types'

task('rebaseChecker', 'print output of depositChecker()')
  .addParam('tenderizer', 'tenderizer address', '')
  .setAction(async (args, hre) => {
    const { deployments, ethers } = hre

    let contractName
    const network = (await ethers.provider.getNetwork()).name
    if ( network == 'mainnet' || network == 'rinkeby'){
        contractName = 'MainnetResolver';
    } else if (network == 'arbitrum' || network == 'arbitrumRinkeby'){
        contractName = 'ArbitrumResolver';
    } else {
        throw Error('No contract for selected network')
    }

    const resolverAddress = (await deployments.get(contractName)).address
    const Resolver: IResolver = (await ethers.getContractAt(contractName, resolverAddress)) as IResolver
    console.log(await Resolver.callStatic.rebaseChecker(args.tenderizer))
  })
