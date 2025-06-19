import {
  BurnEstimateDto,
  DexFeePercentageTypes,
  DexPositionData,
  DexPositionOwner,
  GalaChainResponse,
  GalaChainSuccessResponse,
  GetRemoveLiqEstimationResDto,
  Pool,
  TickData,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance
} from "@gala-chain/api";
import { currency, dex, fixture, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { DexV3Contract } from "../contracts";

describe("Burn Estimate Test", () => {
  const fee = 500;

  const currencyInstance: TokenInstance = currency.tokenInstance();
  const currencyClassKey: TokenClassKey = currency.tokenClassKey();
  const currencyClass: TokenClass = currency.tokenClass();

  const dexInstance: TokenInstance = dex.tokenInstance();
  const dexClassKey: TokenClassKey = dex.tokenClassKey();
  const dexClass: TokenClass = dex.tokenClass();

  const poolObj = new Pool(
    dexClassKey.toString(),
    currencyClassKey.toString(),
    dexClassKey,
    currencyClassKey,
    DexFeePercentageTypes.FEE_0_05_PERCENT,
    new BigNumber("44.71236")
  );

  const currBal: TokenBalance = plainToInstance(TokenBalance, {
    ...currency.tokenBalancePlain(),
    owner: poolObj.getPoolAlias()
  });

  const dexBal: TokenBalance = plainToInstance(TokenBalance, {
    ...dex.tokenBalancePlain(),
    owner: poolObj.getPoolAlias()
  });

  test("should return correct estimation for valid input", async () => {
    const positionOwner = new DexPositionOwner(users.testUser1Id, poolObj.genPoolHash());
    positionOwner.addPosition("75920:76110", "POSITION-ID");

    const positionData = new DexPositionData(
      poolObj.genPoolHash(),
      "POSITION-ID",
      76110,
      75920,
      dexClassKey,
      currencyClassKey,
      fee
    );

    const tickLowerData = new TickData(poolObj.genPoolHash(), 75920);

    const tickUpperData = new TickData(poolObj.genPoolHash(), 76110);

    poolObj.mint(positionData, tickLowerData, tickUpperData, new BigNumber("75646"));

    //Adding Liquidity
    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        currencyClass,
        currencyInstance,
        dexInstance,
        dexClass,
        poolObj,
        positionOwner,
        positionData,
        tickLowerData,
        tickUpperData,
        currBal,
        dexBal
      );

    const dto = new BurnEstimateDto(
      dexClassKey,
      currencyClassKey,
      fee,
      new BigNumber("350"),
      75920,
      76110,
      users.testUser1Id,
      "POSITION-ID"
    );

    const res = await contract.GetRemoveLiquidityEstimation(ctx, dto);

    expect(res).toEqual(
      GalaChainResponse.Success(new GetRemoveLiqEstimationResDto("0.0395068570", "69.3252566675"))
    );
  });
});
