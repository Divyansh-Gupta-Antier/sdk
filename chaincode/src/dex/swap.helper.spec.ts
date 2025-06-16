import {
  ConflictError,
  DexFeePercentageTypes,
  DexPositionData,
  Pool,
  TickData,
  TokenClass,
  TokenClassKey,
  TokenInstance,
  sqrtPriceToTick
} from "@gala-chain/api";
import { currency, dex, fixture, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";

import { DexV3Contract } from "../contracts";
import { processSwapSteps } from "./swap.helper";

describe("ProcessSwapSteps", () => {
  const fee = 500;

  const currencyInstance: TokenInstance = currency.tokenInstance();
  const currencyClassKey: TokenClassKey = currency.tokenClassKey();
  const currencyClass: TokenClass = currency.tokenClass();

  const dexInstance: TokenInstance = dex.tokenInstance();
  const dexClassKey: TokenClassKey = dex.tokenClassKey();
  const dexClass: TokenClass = dex.tokenClass();

  test("should stop when sqrtPriceLimit is hit", async () => {
    const { ctx } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    const initialSqrtPrice = new BigNumber("45");

    const pool = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      initialSqrtPrice
    );

    const sqrtPriceLimit = new BigNumber("44");

    const state = {
      amountSpecifiedRemaining: new BigNumber("1000"),
      amountCalculated: new BigNumber("0"),
      sqrtPrice: initialSqrtPrice,
      tick: 50000,
      liquidity: new BigNumber("5000"),
      feeGrowthGlobalX: new BigNumber("0"),
      protocolFee: new BigNumber("0")
    };

    const result = await processSwapSteps(ctx, state, pool, sqrtPriceLimit, true, true);

    expect(result.sqrtPrice.isEqualTo(sqrtPriceLimit)).toBe(true);
  });

  test("should throw error if tick out of bounds", async () => {
    const { ctx } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    const initialSqrtPrice = new BigNumber("45");

    const pool = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      initialSqrtPrice
    );

    const state = {
      amountSpecifiedRemaining: new BigNumber("1000"),
      amountCalculated: new BigNumber("0"),
      sqrtPrice: new BigNumber("45"),
      tick: 9999999, // simulate out-of-bounds
      liquidity: new BigNumber("5000"),
      feeGrowthGlobalX: new BigNumber("0"),
      protocolFee: new BigNumber("0")
    };

    await expect(processSwapSteps(ctx, state, pool, new BigNumber("44"), true, true)).rejects.toThrow(
      "Not enough liquidity available in pool"
    );
  });

  test("should calculate amountIn and amountOut correctly (exactInput = true)", async () => {
    const { ctx } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    const initialSqrtPrice = new BigNumber("45");
    const pool = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      initialSqrtPrice
    );

    const state = {
      amountSpecifiedRemaining: new BigNumber("1000"),
      amountCalculated: new BigNumber("0"),
      sqrtPrice: new BigNumber("45"),
      tick: 50000,
      liquidity: new BigNumber("5000"),
      feeGrowthGlobalX: new BigNumber("0"),
      protocolFee: new BigNumber("0")
    };

    const result = await processSwapSteps(ctx, state, pool, new BigNumber("44"), true, true);

    expect(result.amountCalculated.isLessThan(0)).toBe(true);
  });

  test("should update tick when crossing tick boundary", async () => {
    const { ctx } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    const initialSqrtPrice = new BigNumber("45");
    const pool = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      initialSqrtPrice
    );

    const dexPositionData = new DexPositionData(
      pool.genPoolHash(),
      "POSITION-ID",
      50000,
      50160,
      dexClassKey,
      currencyClassKey,
      fee
    );
    const tickLowerData = new TickData(pool.genPoolHash(), -500000);
    const tickUpperData = new TickData(pool.genPoolHash(), 501600);

    pool.mint(dexPositionData, tickLowerData, tickUpperData, new BigNumber("5000"));

    const ans = sqrtPriceToTick(new BigNumber("45"));

    const state = {
      amountSpecifiedRemaining: new BigNumber("1000"),
      amountCalculated: new BigNumber("0"),
      sqrtPrice: new BigNumber("45"),
      tick: 50000,
      liquidity: new BigNumber("5000"),
      feeGrowthGlobalX: new BigNumber("0"),
      protocolFee: new BigNumber("0")
    };

    const result = await processSwapSteps(ctx, state, pool, new BigNumber("44"), true, false);

    expect(result.tick).toEqual(51413);
  });
});
