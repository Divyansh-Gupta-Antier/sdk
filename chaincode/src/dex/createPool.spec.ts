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
  ValidationFailedError
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

describe("Create Pool Test", () => {
  const currencyInstance: TokenInstance = currency.tokenInstance();
  const currencyClass: TokenClass = currency.tokenClass();
  const currencyClassKey: TokenClassKey = currency.tokenClassKey();
  const currencyBalance: TokenBalance = currency.tokenBalance();

  const dexInstance: TokenInstance = dex.tokenInstance();
  const dexClass: TokenClass = dex.tokenClass();
  const dexClassKey: TokenClassKey = dex.tokenClassKey();
  const dexBalance: TokenBalance = dex.tokenBalance();

  it("Should create pool and save it on-chain", async () => {
    //Given
    const dexFeeConfig = new DexFeeConfig([users.testAdminId], 0.5);

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
    expect(writes).toEqual(writesMap(expectedPool, expectedFeeThresholds));
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

  it("Should throw Validation Failed Error if token0 is greater than token1 ", async () => {
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

  it("Will throw Conflict Error if pool is already created", async () => {
    //Given
    const dto = new CreatePoolDto(dexClassKey, currencyClassKey, 500, new BigNumber("10"));

    const poolObj = poolTest.poolPlain((plain) => ({
      ...plain,
      token0: dexClassKey.toString(),
      token1: currencyClassKey.toString(),
      fee: 500
    }));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(currencyInstance, currencyClass, currencyBalance, dexInstance, dexClass, poolObj);

    //When
    const createPoolRes = await contract.CreatePool(ctx, dto);

    //Then
    expect(createPoolRes).toEqual(
      GalaChainResponse.Error(new ConflictError("Pool already exists", JSON.parse(JSON.stringify(poolObj))))
    );
    expect(writes).toEqual({});
  });
});
