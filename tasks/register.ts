import { task, types } from 'hardhat/config'
import { IResolver } from '../typechain-types'

task('register', 'register a tenderizer on the Resolver')
  .addParam('name', 'tenderizer name e.g. "Livepeer"', '', types.string)
  .addParam('tenderizer', 'tenderizer address', '')
  .addParam('steak', 'steak/underlying token address', '')
  .addParam('stakingcontract', 'staking contract address', '')
  .addParam('depositinterval', 'min interval between deposits (s)', '', types.int)
  .addParam('depositthreshold', 'min amount to trigger deposit (ether)', '', types.string)
  .addParam('rebaseinterval', 'min interval between rebases (s)', '', types.int)
  .addParam('rebasethreshold', 'min amount to trigger rebase (ether)', '', types.string)
  .setAction(async (args, hre) => {
    const { deployments, ethers } = hre

    if (!args.tenderizer || !args.name || !args.steak || !args.stakingcontract 
        || !args.depositinterval || !args.depositthreshold || !args.rebaseinterval
        || !args.rebasethreshold) {
      throw new Error('Must provide all args')
    }

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
    await Resolver.register(
        args.name,
        args.tenderizer,
        args.steak,
        args.stakingcontract,
        args.depositinterval,
        ethers.utils.parseEther(args.depositthreshold),
        args.rebaseinterval,
        ethers.utils.parseEther(args.rebasethreshold),
        {gasLimit: 250000}
    )
  })
