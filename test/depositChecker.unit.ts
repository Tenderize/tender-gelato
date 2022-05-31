import * as rpc from './util/snapshot'
import hre, { ethers } from 'hardhat'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import {
   DummyStaking,
   DummyTenderizer,
   MainnetResolver,
   TenderToken,
   SwapUtils,
   LiquidityPoolToken,
   TenderSwap,
   TenderSwapFactoryV1,
   TenderFarmFactory,
   TenderFarm
} from '../typechain-types'

describe("Tenderize Gelato Mainnet Resolvers - Deposit Checker", function () {
  let snapshotId: any
  let signers: SignerWithAddress[]
  let deployer : string
  let Resolver: MainnetResolver
  
  // Mocks
  let DummyStaking: DummyStaking
  let DummyTenderizer: DummyTenderizer

  const TIME_INTERVAL = 86400 // one day

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

    // Deploy Dummy Token & Staking
    const DummyStakingFac = await ethers.getContractFactory('DummyStaking', signers[0])
    DummyStaking = (await DummyStakingFac.deploy('Dummy Token', 'DUMMY', ethers.utils.parseEther('1000000'))) as DummyStaking

    // Deploy Dummy Tenderizer
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
    const DummyTenderizerFac = await ethers.getContractFactory('DummyTenderizer', signers[0])
    DummyTenderizer = (await DummyTenderizerFac.deploy()) as DummyTenderizer
    await DummyTenderizer.initialize(
      DummyStaking.address,
      "DUMMY",
      DummyStaking.address,
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
      "DummyTenderizer",
      DummyTenderizer.address,
      DummyStaking.address,
      DummyStaking.address,
      TIME_INTERVAL,
      10000,
      TIME_INTERVAL,
      10000
    )
  })

  describe('Deposit Checker', async () => {
    let resp: any
    describe('Without deposits', async () => {
      it('responds with false', async () => {
        resp = await Resolver.callStatic.depositChecker(DummyTenderizer.address)
        await Resolver.depositChecker(DummyTenderizer.address)
        expect(resp.canExec).to.eq(false)
      })
    })
    
    describe('With deposits greater than threshold', async () => {
      const amount = ethers.utils.parseEther('1')
      let resp: any
      beforeEach(async () => {
        await DummyStaking.approve(DummyTenderizer.address, amount)
        await DummyTenderizer.deposit(amount)
        resp = await Resolver.callStatic.depositChecker(DummyTenderizer.address)
        await Resolver.depositChecker(DummyTenderizer.address)
        await DummyTenderizer.stake(amount)
      })
      it('canExec is true', async () => {
        expect(resp.canExec).to.eq(true)
      })
      it('callData is correct', async () => {
        expect(resp.execPayload).to.eq(DummyTenderizer.interface.getSighash('claimRewards'))
      })

      describe('Immediately after without new deposits', async () => {
        it('canExec is false', async () => {
          expect((await Resolver.callStatic.depositChecker(DummyTenderizer.address)).canExec).to.eq(false)
        })
      })

      describe('With new deposits greater than threshold, but without time interval elapsed', async () => {
        beforeEach(async () => {
          await DummyStaking.approve(DummyTenderizer.address, amount)
          await DummyTenderizer.deposit(amount)
          resp = await Resolver.callStatic.depositChecker(DummyTenderizer.address)
          await Resolver.depositChecker(DummyTenderizer.address)
        })
        it('canExec is false', async () => {
          expect(resp.canExec).to.eq(false)
        })
        describe('After time internal has elapsed', async() => {
          beforeEach(async () => {
            await hre.network.provider.send("evm_increaseTime", [TIME_INTERVAL])
            await hre.network.provider.send("evm_mine")
            resp = await Resolver.callStatic.depositChecker(DummyTenderizer.address)
            await Resolver.depositChecker(DummyTenderizer.address)
          })
          it('canExec is false', async () => {
            expect(resp.canExec).to.eq(true)
          })
          it('callData is correct', async () => {
            expect(resp.execPayload).to.eq(DummyTenderizer.interface.getSighash('claimRewards'))
          })
        })
      })
    })
  })
});
