import {
  ConflictError,
  CreatePoolDto,
  CreatePoolResDto,
  DexFeeConfig,
  DexFeePercentageTypes,
  FeeThresholdUses,
  GalaChainResponse,
  Pool,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance,
  ValidationFailedError,
  createValidDTO,
  feeAmountTickSpacing
} from "@gala-chain/api";
import {
  currency,
  fixture,
  poolTest,
  transactionError,
  transactionSuccess,
  users,
  writesMap
} from "@gala-chain/test";
import { dex } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { GalaChainContext } from "../types";
import { DexV3Contract } from "./../__test__/TestDexV3Contract";
import { generateKeyFromClassKey } from "./dexUtils";
import {
  ETHClassKey,
  ETHInstance,
  ETHtokenClass,
  USDTClassKey,
  USDTInstance,
  USDTtokenClass
} from "./testUtils";

describe("Create Pool Test", () => {
  const currencyInstance: TokenInstance = currency.tokenInstance();
  const currencyClass: TokenClass = currency.tokenClass();
  const currencyClassKey: TokenClassKey = currency.tokenClassKey();
  const currencyBalance: TokenBalance = currency.tokenBalance();

  const dexInstance: TokenInstance = dex.tokenInstance();
  const dexClass: TokenClass = dex.tokenClass();
  const dexClassKey: TokenClassKey = dex.tokenClassKey();
  const dexBalance: TokenBalance = dex.tokenBalance();

  test("Create Pool: Should create pool and save it on-chain", async () => {
    //Given

    const dexFeeConfig: DexFeeConfig = new DexFeeConfig([users.testAdminId], 0.5);
    console.log("PRINTING THE DEX CLASSS", dexClass);

    const { ctx, contract, writes } = fixture<GalaChainContext, DexV3Contract>(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        currencyInstance,
        currencyClass,
        currencyBalance,
        dexFeeConfig,
        dexInstance,
        dexClass,
        dexBalance
      )
      .savedRangeState([]);

    const dto = new CreatePoolDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const [token0, token1] = [dto.token0, dto.token1].map(generateKeyFromClassKey);
    const expectedPool = new Pool(token0, token1, dto.token0, dto.token1, dto.fee, dto.initialSqrtPrice, 0.5);

    const expectedFeeThresholds = plainToInstance(FeeThresholdUses, {
      feeCode: "CreatePool",
      user: "client|testUser1",
      cumulativeFeeQuantity: "0",
      cumulativeUses: "1"
    });

    //When
    const createPoolRes = await contract.CreatePool(ctx, dto);

    const expectedResponse = new CreatePoolResDto(
      dto.token0,
      dto.token1,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      expectedPool.genPoolHash(),
      expectedPool.getPoolAlias()
    );
    //Then

    expect(createPoolRes).toEqual(transactionSuccess(expectedResponse));
    console.dir("Writes", writes);
    expect(writes).toEqual(writesMap(expectedPool, expectedFeeThresholds));
    console.log("IT IS ET34T34T43T34T34T34T343TT3T");
  });

  test("It will revert if we create pool of same tokens", async () => {
    //Given
    const dto = new CreatePoolDto(currencyClassKey, currencyClassKey, 500, new BigNumber("10"));

    const { ctx, contract, writes } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    //When
    const createPoolRes = await contract.CreatePool(ctx, dto);

    //Then
    expect(createPoolRes).toEqual(
      GalaChainResponse.Error(
        new ValidationFailedError(
          "Cannot create pool of same tokens. Token0 TEST$Currency$TEST$none and Token1 TEST$Currency$TEST$none must be different."
        )
      )
    );

    expect(createPoolRes).toEqual(transactionError());
    expect(writes).toEqual({});
  });

  test("it will revert if token0 is smaller", async () => {
    //Given

    const dto = new CreatePoolDto(currencyClassKey, dexClassKey, 500, new BigNumber("10"));

    const { ctx, contract, writes } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    //When
    const createPoolRes = await contract.CreatePool(ctx, dto);

    //Then
    expect(createPoolRes).toEqual(
      GalaChainResponse.Error(new ValidationFailedError("Token0 must be smaller"))
    );
    expect(writes).toEqual({});
  });

  test("It will revert it pool is already created", async () => {
    // const createPoolDto = await createValidDTO(CreatePoolDto, {
    //   ...plainToInstance,
    //   token0: ETHClassKey,
    //   token1: USDTClassKey,
    //   fee: 500,
    //   initialSqrtPrice: initialSqrtPrice
    // });

    const dto = new CreatePoolDto(dexClassKey, currencyClassKey, 500, new BigNumber("10"));

    const poolObj = poolTest.poolPlain((plain) => ({
      ...plain,
      token0: dexClassKey.toString(),
      token1: currencyClassKey.toString(),
      fee: 500
    }));

    const { ctx, contract, writes } = fixture(DexV3Contract).callingUser(users.testUser1Id).savedState(
      currencyInstance,
      currencyClass,
      currencyBalance,
      dexInstance,
      dexClass,
      poolObj
    );

    //When
    const createPoolRes = await contract.CreatePool(ctx, dto);

    expect(createPoolRes).toEqual(
      GalaChainResponse.Error(new ConflictError("Pool already exists", JSON.parse(JSON.stringify(poolObj))))
    );
    expect(writes).toEqual({});
    console.log("The last test case is already cleared");
  });

  // it("Create Pool : Should create pool with 0.03% fee", async () => {
  //   //Given  const initialSqrtPrice = new BigNumber("44.72136");
  //   const fee = 3000;
  //   // const tickSpacing = feeAmountTickSpacing[fee];
  //   const createPoolDto = await createValidDTO(CreatePoolDto, {
  //     ...plainToInstance,
  //     token0: ETHClassKey,
  //     token1: USDTClassKey,
  //     fee: 3000,
  //     initialSqrtPrice: initialSqrtPrice
  //   });

  //   const pool = plainToInstance(Pool, {
  //     INDEX_KEY: "GCDEXP",
  //     bitmap: {},
  //     fee: 3000,
  //     feeGrowthGlobal0: "0",
  //     feeGrowthGlobal1: "0",
  //     liquidity: "0",
  //     maxLiquidityPerTick: "11505069308564788171107302870564117.87813387391070643641",

  //     protocolFees: 0.1,
  //     protocolFeesToken0: "0",
  //     protocolFeesToken1: "0",
  //     sqrtPrice: "44.72136",

  //     tickSpacing: 60,
  //     token0: "ETH$Unit$none$none",
  //     token0ClassKey: ETHClassKey,
  //     token1: "USDT$Unit$none$none",
  //     token1ClassKey: USDTClassKey,
  //     grossPoolLiquidity: new BigNumber(0)
  //   });

  //   const initialFee = plainToInstance(FeeThresholdUses, {
  //     feeCode: "CreatePool",
  //     user: "client|testUser1",
  //     cumulativeFeeQuantity: "0",
  //     cumulativeUses: "1"
  //   });

  //   const { ctx, contract, writes } = fixture(DexV3Contract)
  //     .callingUser(users.testUser1Id)
  //     .savedState(ETHtokenClass, USDTtokenClass);

  //   const poolObj = poolTest.poolPlain((plain) => ({
  //     ...plain,
  //     token0: ETHClassKey.toString(),
  //     token1: USDTClassKey.toString(),
  //     fee: fee
  //   }));

  //   //When
  //   const createPoolRes = await contract.CreatePool(ctx, createPoolDto);

  //   const createPoolResDTO = plainToInstance(CreatePoolResDto, {
  //     token0: ETHClassKey,
  //     token1: USDTClassKey,
  //     poolFee: fee,
  //     poolHash: poolObj.genPoolHash(),
  //     poolAlias: poolObj.getPoolAlias()
  //   });

  //   //Then
  //   console.dir("Writes", writes);
  //   expect(createPoolRes).toEqual(transactionSuccess(createPoolResDTO));

  //   expect(writes).toEqual(writesMap(pool, initialFee));
  // });

  // it("Create Pool : Should create pool with 1% fee", async () => {
  //   //Given  const initialSqrtPrice = new BigNumber("44.72136");
  //   const fee = 10000;
  //   // const tickSpacing = feeAmountTickSpacing[fee];
  //   const createPoolDto = await createValidDTO(CreatePoolDto, {
  //     ...plainToInstance,
  //     token0: ETHClassKey,
  //     token1: USDTClassKey,
  //     fee: 10000,
  //     initialSqrtPrice: initialSqrtPrice
  //   });

  //   const pool = plainToInstance(Pool, {
  //     INDEX_KEY: "GCDEXP",
  //     bitmap: {},
  //     fee: 10000,
  //     feeGrowthGlobal0: "0",
  //     feeGrowthGlobal1: "0",
  //     liquidity: "0",
  //     maxLiquidityPerTick: "38347248999678653400142060922857318.01636519561716576269",

  //     protocolFees: 0.1,
  //     protocolFeesToken0: "0",
  //     protocolFeesToken1: "0",
  //     sqrtPrice: "44.72136",

  //     tickSpacing: 200,
  //     token0: "ETH$Unit$none$none",
  //     token0ClassKey: ETHClassKey,
  //     token1: "USDT$Unit$none$none",
  //     token1ClassKey: USDTClassKey,
  //     grossPoolLiquidity: new BigNumber(0)
  //   });

  //   const initialFee = plainToInstance(FeeThresholdUses, {
  //     feeCode: "CreatePool",
  //     user: "client|testUser1",
  //     cumulativeFeeQuantity: "0",
  //     cumulativeUses: "1"
  //   });

  //   const { ctx, contract, writes } = fixture(DexV3Contract)
  //     .callingUser(users.testUser1Id)
  //     .savedState(ETHtokenClass, USDTtokenClass);

  //   //When
  //   const createPoolRes = await contract.CreatePool(ctx, createPoolDto);

  //   const createPoolResDTO = plainToInstance(CreatePoolResDto, {
  //     token0: ETHClassKey,
  //     token1: USDTClassKey,
  //     poolFee: fee,
  //     poolHash: poolObj.genPoolHash(),
  //     poolAlias: poolObj.getPoolAlias()
  //   });
  //   //Then
  //   console.dir("Writes", writes);
  //   expect(createPoolRes).toEqual(transactionSuccess(createPoolResDTO));

  //   expect(writes).toEqual(writesMap(pool, initialFee));
  // });
});
