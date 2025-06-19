import { ConflictError } from './../../../chain-api/src/utils/error';
import {
  DexFeePercentageTypes,
  DexPositionData,
  GalaChainResponse,
  Pool,
  QuoteExactAmountDto,
  QuoteExactAmountResDto,
  TickData,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance,
  ValidationFailedError
} from "@gala-chain/api";
import { currency, dex, fixture, transactionSuccess, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { DexV3Contract } from "../contracts";



describe("Quote Functions", () => {
  const currencyInstance: TokenInstance = currency.tokenInstance();
  const currencyClass: TokenClass = currency.tokenClass();
  const currencyClassKey: TokenClassKey = currency.tokenClassKey();

  const dexInstance: TokenInstance = dex.tokenInstance();
  const dexClass: TokenClass = dex.tokenClass();
  const dexClassKey: TokenClassKey = dex.tokenClassKey();

  const fee = DexFeePercentageTypes.FEE_0_05_PERCENT;

  const poolObj = new Pool(
    dexClassKey.toString(),
    currencyClassKey.toString(),
    dexClassKey,
    currencyClassKey,
    fee,
    new BigNumber("44.71236")
  );

  const currBal: TokenBalance = plainToInstance(TokenBalance, {
    ...currency.tokenBalancePlain(),
    owner: poolObj.getPoolAlias()
  });
  currBal.ensureCanAddQuantity(new BigNumber("3000")).add();

  const dexBal: TokenBalance = plainToInstance(TokenBalance, {
    ...dex.tokenBalancePlain(),
    owner: poolObj.getPoolAlias()
  });

  test("Should return correct quote for valid input (zeroForOne = True)", async () => {
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

    const { ctx, contract } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(poolObj, dexInstance, currencyInstance, dexClass, currencyClass, currBal, dexBal);

    const dto = new QuoteExactAmountDto(dexClassKey, currencyClassKey, fee, new BigNumber("1.3"), true);

    const res = await contract.QuoteExactAmount(ctx, dto);

    const expectedRes = new QuoteExactAmountResDto(
      new BigNumber("1.3"),
      new BigNumber("-2595.6607034497"),
      new BigNumber("44.71236"),
      new BigNumber("44.678046742148299052")
    );

    expect(res).toEqual(transactionSuccess(expectedRes));
  });

  test("It will throw error if amount specified is 0", async () => {
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

    const { ctx, contract } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(poolObj, dexInstance, currencyInstance, dexClass, currencyClass, currBal, dexBal);

    const dto = new QuoteExactAmountDto(dexClassKey, currencyClassKey, fee, new BigNumber("0"), true);

    const res = await contract.QuoteExactAmount(ctx, dto);

    expect(res).toEqual(GalaChainResponse.Error(new ValidationFailedError("Invalid specified amount")));
  });

  test("should throw ConflictError if not enough token0 liquidity", async()=>{

    const { ctx, contract } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(poolObj, dexInstance, currencyInstance, dexClass, currencyClass, currBal, dexBal);

      const dto = new QuoteExactAmountDto(dexClassKey, currencyClassKey, fee, new BigNumber("50"), true);
      const res = await contract.QuoteExactAmount(ctx, dto);
      console.log("Response isv++ ", res)
      expect(res).toEqual(GalaChainResponse.Error(new ConflictError("Not enough liquidity available in pool")));
      console.log("Abh hogya clear ? ");

  });



  test("should throw ConflictError if not enough token0 liquidity", async()=>{
    

    const { ctx, contract } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(poolObj, dexInstance, currencyInstance, dexClass, currencyClass, currBal, dexBal);

      const dto = new QuoteExactAmountDto(dexClassKey, currencyClassKey, fee, new BigNumber("32000"), false);
      const res = await contract.QuoteExactAmount(ctx, dto);
      console.log("Response isv++ ", JSON.stringify(res))
      expect(res).toEqual(GalaChainResponse.Error(new ConflictError("Not enough liquidity available in pool")));
      console.log("Yeh bhi hoga h");
  });


});
