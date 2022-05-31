# Tenderize Gelato Resolvers

Contracts used by Gelato to trigger rebases using `rebaseChcker()` and deposits with `depositChecker`

Useful Commands:

```shell
npx hardhat compile
npx hardhat test
npx hardhat coverage
npx hardhat deploy --tags MainnetResolver --network rinkeby
npx hardhat register --name Graph --tenderizer 0xd76D6107AdD240e619aCfE7503f6F93413E072E7 --steak 0x53466090C5bfba99B147aB0c43E212e6E8a3Fb90 --stakingcontract 0x6E1daAB8A34b3E83eb6112b067d184cAE90eb304 --depositinterval 86400 --depositthreshold 10 --rebaseinterval 86400 --rebasethreshold 10 --network rinkeby
 npx hardhat verify <address> --network rinkeby
```
