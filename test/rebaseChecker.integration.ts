import * as rpc from './util/snapshot'
import hre, { ethers } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import {
   DummyTenderizer,
   MainnetResolver,
   TenderToken,
   SwapUtils,
   LiquidityPoolToken,
   TenderSwap,
   TenderSwapFactoryV1,
   TenderFarmFactory,
   TenderFarm,
   SimpleToken,
   Graph,
   GraphMock
} from '../typechain-types'
import { AbiCoder } from 'ethers/lib/utils'

describe("Tenderize Gelato Mainnet Resolvers - Rebase Checker - Graph", function () {
  let snapshotId: any
  let signers: SignerWithAddress[]
  let deployer : string
  let Resolver: MainnetResolver
  
  // Mocks
  let GRT: SimpleToken
  let GraphMock: GraphMock
  let Tenderizer: Graph

  const TIME_INTERVAL = 86400 // one day
  let amount = ethers.utils.parseEther('1')

  beforeEach(async () => {
    snapshotId = await rpc.snapshot()
  })

  afterEach(async () => {
    await rpc.revert(snapshotId)
  })

  beforeEach('deploy mocks and initialize', async function () {
    const namedAccs = await hre.getNamedAccounts()
    signers = await ethers.getSigners()
    deployer = namedAccs.deployer

    // Deploy GRT and staking Mocks
    const TokenFac = await ethers.getContractFactory('SimpleToken', signers[0])
    GRT = (await TokenFac.deploy('Graph Token', 'GRT', ethers.utils.parseEther('1000000'))) as SimpleToken
    const GraphMockFac = await ethers.getContractFactory('GraphMock', signers[0])
    GraphMock = (await GraphMockFac.deploy(GRT.address)) as GraphMock

    // Deploy Tenderizer
    const TenderTokenFac = await ethers.getContractFactory('TenderToken', signers[0])
    const TenderToken = (await TenderTokenFac.deploy()) as TenderToken
    const SwapUtilsFac = await ethers.getContractFactory('SwapUtils', signers[0])
    const SwapUtils = (await SwapUtilsFac.deploy()) as SwapUtils
    const LiquidityPoolTokenFac = await ethers.getContractFactory('LiquidityPoolToken', signers[0])
    const LiquidityPoolToken = (await LiquidityPoolTokenFac.deploy()) as LiquidityPoolToken
    const TenderSwapFac = await ethers.getContractFactory('TenderSwap', {libraries: {SwapUtils: SwapUtils.address}})
    const TenderSwap = (await TenderSwapFac.deploy()) as TenderSwap
    const TenderSwapFactoryFac = await ethers.getContractFactory('TenderSwapFactoryV1', signers[0])
    const TenderSwapFactory = (await TenderSwapFactoryFac.deploy(
      TenderSwap.address,
      LiquidityPoolToken.address,
      50,
      100,
      100
    )) as TenderSwapFactoryV1
    const TenderFarmFac = await ethers.getContractFactory('TenderFarm', signers[0])
    const TenderFarm = (await TenderFarmFac.deploy()) as TenderFarm
    const TenderFarmFactoryFac = await ethers.getContractFactory('TenderFarmFactory', signers[0])
    const TenderFarmFactory = (await TenderFarmFactoryFac.deploy(TenderFarm.address)) as TenderFarmFactory
    const TenderizerFac = await ethers.getContractFactory('Graph', signers[0])
    Tenderizer = (await TenderizerFac.deploy()) as Graph
    await Tenderizer.initialize(
      GRT.address,
      "GRT",
      GraphMock.address,
      ethers.constants.AddressZero,
      50,
      50,
      TenderToken.address,
      TenderFarmFactory.address,
      TenderSwapFactory.address
    )
    
    const ResolverDeployent = await hre.deployments.fixture(['MainnetResolver'], {
      keepExistingDeployments: false
    })
    Resolver = (await ethers.getContractAt('MainnetResolver',
      ResolverDeployent.MainnetResolver.address)) as MainnetResolver

    await Resolver.register(
      "Graph",
      Tenderizer.address,
      GRT.address,
      GraphMock.address,
      TIME_INTERVAL,
      10000,
      TIME_INTERVAL,
      10000
    )
  })

  describe('Staked, but no rewards generated', async () => {
      let resp: any
      beforeEach(async () => {
          await GRT.approve(Tenderizer.address, amount)
          await Tenderizer.deposit(amount)
          await Tenderizer.claimRewards()
          resp = await Resolver.callStatic.rebaseChecker(Tenderizer.address)
          await Resolver.rebaseChecker(Tenderizer.address)
      })
      it('canExec is false', async () => {
        expect(resp.canExec).to.eq(false)
      })

      describe('Enough rewards generated, and running for the first time', async () => {
        beforeEach(async () => {
            await GraphMock.setStaked((await GraphMock.staked()).add(amount))
            resp = await Resolver.callStatic.rebaseChecker(Tenderizer.address)
            await Resolver.rebaseChecker(Tenderizer.address)
            await Tenderizer.claimRewards()
        })
        it('canExec is false', async () => {
            expect(resp.canExec).to.eq(true)
        })
        it('calldata is correct', async () => {
            expect(resp.execPayload).to.eq(Tenderizer.interface.getSighash('claimRewards'))
        })

        describe('More rewards generated but not enough time elapsed', async () => {
            beforeEach(async () => {
                await GraphMock.setStaked((await GraphMock.staked()).add(amount))
                resp = await Resolver.callStatic.rebaseChecker(Tenderizer.address)
                await Resolver.rebaseChecker(Tenderizer.address)
            })
            it('canExec is true', async () => {
                expect(resp.canExec).to.eq(false)
            })
            it('calldata is correct', async () => {
                expect(resp.execPayload).to.eq('0x')
            })

            describe('Enough time has elapsed', async () => {
                beforeEach(async () => {
                    await hre.network.provider.send("evm_increaseTime", [TIME_INTERVAL])
                    await hre.network.provider.send("evm_mine")
                    await GraphMock.setStaked((await GraphMock.staked()).add(amount))
                    resp = await Resolver.callStatic.rebaseChecker(Tenderizer.address)
                    await Resolver.rebaseChecker(Tenderizer.address)
                })
                it('canExec is true', async () => {
                    expect(resp.canExec).to.eq(true)
                })
                it('calldata is correct', async () => {
                  expect(resp.execPayload).to.eq(Tenderizer.interface.getSighash('claimRewards'))
                })
              })
          })
      })
  })
});
