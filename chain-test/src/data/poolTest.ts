import { DexFeePercentageTypes, Pool } from "@gala-chain/api";
import { TokenClassKey } from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { createPlainFn, createInstanceFn } from "./utils";

const poolPlain = createPlainFn({
  token0: "token0", // Default token0 symbol
  token1: "token1", // Default token1 symbol
  fee: DexFeePercentageTypes.FEE_0_05_PERCENT,
  
  token0ClassKey: {} as TokenClassKey,
  token1ClassKey: {} as TokenClassKey,
  bitmap: {},
  sqrtPrice: new BigNumber("44.72136"),
  liquidity: new BigNumber(0),
  feeGrowthGlobal0: new BigNumber(0),
  feeGrowthGlobal1: new BigNumber(0),
  tickSpacing: 60,
  maxLiquidityPerTick: new BigNumber("1917565579412846627735051215301243.08110657663841167978"),
  protocolFees: 0,
  protocolFeesToken0: new BigNumber(0),
  protocolFeesToken1: new BigNumber(0),
  grossPoolLiquidity: new BigNumber(0)
  
});

export default {
  poolPlain: createInstanceFn(Pool, poolPlain())
};
