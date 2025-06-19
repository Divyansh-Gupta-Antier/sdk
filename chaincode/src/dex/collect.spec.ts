import { BINARY } from "dd-trace/ext/formats";

import {
  CollectDto,
  DexFeePercentageTypes,
  DexOperationResDto,
  DexPositionData,
  DexPositionOwner,
  GalaChainResponse,
  GalaChainSuccessResponse,
  Pool,
  TickData,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance,
  UserBalanceResDto
} from "@gala-chain/api";
import { DexV3Contract } from "@gala-chain/chaincode";
import { currency, dex, fixture, transactionSuccess, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { genTickRange } from "./dexUtils";

describe("Collect", () => {
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

  const positionData = new DexPositionData(
    poolObj.genPoolHash(),
    "position-Id",
    76110,
    75920,
    dexClassKey,
    currencyClassKey,
    fee
  );

  const positionOwner = new DexPositionOwner(users.testUser1Id, poolObj.genPoolHash());
  positionOwner.addPosition(genTickRange(75920, 76110), "position-Id");

  const tickLowerData = plainToInstance(TickData, {
    poolHash: poolObj.genPoolHash(),
    tick: 75920,
    liquidityGross: new BigNumber("100"),
    initialised: true,
    liquidityNet: new BigNumber("100"),
    feeGrowthOutside0: new BigNumber("1"),
    feeGrowthOutside1: new BigNumber("1")
  });

  const tickUpperData = plainToInstance(TickData, {
    ...tickLowerData,
    tick: 76110
  });

  const currBal: TokenBalance = plainToInstance(TokenBalance, {
    ...currency.tokenBalancePlain(),
    owner: poolObj.getPoolAlias()
  });

  const dexBal: TokenBalance = plainToInstance(TokenBalance, {
    ...dex.tokenBalancePlain(),
    owner: poolObj.getPoolAlias()
  });

  test("Should Collect correct fees and update balances", async () => {
    positionData.tokensOwed0 = new BigNumber("15");
    positionData.tokensOwed1 = new BigNumber("15");

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        poolObj,
        positionData,
        tickUpperData,
        tickLowerData,
        positionOwner,
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        currBal,
        dexBal
      );

    const dto = new CollectDto(
      dexClassKey,
      currencyClassKey,
      fee,
      new BigNumber("8"),
      new BigNumber("8"),
      75920,
      76110,
      "position-Id"
    );
    const res = await contract.CollectPositionFees(ctx, dto);
    console.log("writes are", writes);

    const expectedResponse = plainToInstance(DexOperationResDto, {
      userBalanceDelta: plainToInstance(UserBalanceResDto, {
        token0Balance: {
          owner: users.testUser1Id,
          collection: "TEST",
          category: "Currency",
          type: "DEX",
          additionalKey: "none",
          quantity: new BigNumber("8"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        },
        token1Balance: {
          owner: users.testUser1Id,
          collection: "TEST",
          category: "Currency",
          type: "TEST",
          additionalKey: "none",
          quantity: new BigNumber("8"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        }
      }),
      amounts: ["8", "8"],
      poolHash: poolObj.genPoolHash(),
      poolAlias: poolObj.getPoolAlias(),
      poolFee: 500
    });

    expect(res).toEqual(transactionSuccess(expectedResponse));
  });

  test("should cap amount requested to pool available balance", async () => {
    positionData.tokensOwed0 = new BigNumber("1500");
    positionData.tokensOwed1 = new BigNumber("1500");

    //  currBal.ensureCanSubtractQuantity(new BigNumber("995")).subtract();

    const dto = new CollectDto(
      dexClassKey,
      currencyClassKey,
      fee,
      new BigNumber("1200"),
      new BigNumber("1200"),
      75920,
      76110,
      "position-Id"
    );

    const { ctx, contract } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        poolObj,
        positionData,
        tickUpperData,
        tickLowerData,
        positionOwner,
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        currBal,
        dexBal
      );

    const res = await contract.CollectPositionFees(ctx, dto);
    console.log("Response for minimum is", res);

    const expectedResponse = plainToInstance(DexOperationResDto, {
      userBalanceDelta: plainToInstance(UserBalanceResDto, {
        token0Balance: {
          owner: users.testUser1Id,
          collection: "TEST",
          category: "Currency",
          type: "DEX",
          additionalKey: "none",
          quantity: new BigNumber("1000"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        },
        token1Balance: {
          owner: users.testUser1Id,
          collection: "TEST",
          category: "Currency",
          type: "TEST",
          additionalKey: "none",
          quantity: new BigNumber("1000"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        }
      }),
      amounts: ["1000", "1000"],
      poolHash: poolObj.genPoolHash(),
      poolAlias: poolObj.getPoolAlias(),
      poolFee: 500
    });

    expect(res).toEqual(expectedResponse);

    expect(res.Data?.amounts[0]).toEqual("1000");
    expect(res.Data?.amounts[0]).toEqual("1000");
  });

  test("")

  





});
