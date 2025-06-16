import { DexOperationResDto, GalaChainResponse, TokenBalance, UserBalanceResDto } from "@gala-chain/api";
import {
  BurnDto,
  DexFeePercentageTypes,
  DexPositionData,
  DexPositionOwner,
  Pool,
  TickData,
  TokenClass,
  TokenClassKey,
  TokenInstance
} from "@gala-chain/api";
import { currency, dex, fixture, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";
import { BINARY } from "dd-trace/ext/formats";

import { DexV3Contract } from "../__test__/TestDexV3Contract";
import { SlippageToleranceExceededError } from "./../../../chain-api/src/utils/error";

describe("Remove Liquidity Test", () => {
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



  test("Position Owner should be able to remove liquidity", async () => {
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

    const burnResDTO = new BurnDto(
      dexClassKey,
      currencyClassKey,
      fee,
      new BigNumber("346"),
      75920,
      76110,
      new BigNumber("0"),
      new BigNumber("0"),
      "POSITION-ID"
    );

    const expectedResponse = plainToInstance(DexOperationResDto, {
      userBalanceDelta: plainToInstance(UserBalanceResDto, {
        token0Balance: {
          owner: users.testUser1Id,
          collection: "TEST",
          category: "Currency",
          type: "DEX",
          additionalKey: "none",
          quantity: new BigNumber("0.03905535"),
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
          quantity: new BigNumber("68.5329680198"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        }
      }),
      amounts: ["0.03905535", "68.5329680198"],
      poolHash: poolObj.genPoolHash(),
      poolAlias: poolObj.getPoolAlias(),
      poolFee: 500
    });

    const burnRes = await contract.RemoveLiquidity(ctx, burnResDTO);

    expect(burnRes.Data).toEqual(expectedResponse);
  });

  test("Remove Liquidity should throw error if liquidity checks fail", async () => {
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

    const burnResDTO = new BurnDto(
      dexClassKey,
      currencyClassKey,
      fee,
      new BigNumber("346"),
      75920,
      76110,
      new BigNumber("0.06"),
      new BigNumber("56"),
      "POSITION-ID"
    );

    const burnRes = await contract.RemoveLiquidity(ctx, burnResDTO);
    console.log("This is the Burn Response", burnRes);

    expect(burnRes).toEqual(
      GalaChainResponse.Error(
        new SlippageToleranceExceededError(
          "Slippage tolerance exceeded: expected minimums (amount0 ≥ 0.06, amount1 ≥ 56), but received (amount0 = 0.03905535002371904128, amount1 = 68.5329680198566)"
        )
      )
    );
  });

  test("Should allow owner to burn liquidity from a chosen position", async () => {
    const positionOwner1 = new DexPositionOwner(users.testUser1Id, poolObj.genPoolHash());
    positionOwner1.addPosition("75920:76110", "POSITION-ID-1");

    const positionData1 = new DexPositionData(
      poolObj.genPoolHash(),
      "POSITION-ID-1",
      76110,
      75920,
      dexClassKey,
      currencyClassKey,
      fee
    );

    const tickLowerData1 = new TickData(poolObj.genPoolHash(), 75920);
    const tickUpperData1 = new TickData(poolObj.genPoolHash(), 76110);

    poolObj.mint(positionData1, tickLowerData1, tickUpperData1, new BigNumber("400"));

    const positionOwner2 = new DexPositionOwner(users.testUser1Id, poolObj.genPoolHash());
    positionOwner2.addPosition("75920:76110", "POSITION-ID-2");

    const positionData2 = new DexPositionData(
      poolObj.genPoolHash(),
      "POSITION-ID-2",
      76110,
      75920,
      dexClassKey,
      currencyClassKey,
      fee
    );

    const tickLowerData2 = new TickData(poolObj.genPoolHash(), 75920);
    const tickUpperData2 = new TickData(poolObj.genPoolHash(), 76110);

    poolObj.mint(positionData2, tickLowerData2, tickUpperData2, new BigNumber("600"));

    const { ctx, contract, writes } = fixture(DexV3Contract).callingUser(users.testUser1Id).savedState(
      currencyClass,
      currencyInstance,
      dexInstance,
      dexClass,
      poolObj,
      positionOwner1,
      positionData1,
      tickLowerData1,
      tickUpperData1,
      positionOwner2,
      positionData2,
      tickLowerData2,
      tickUpperData2,
      currBal,
      dexBal
    );

    const dto = new BurnDto(
      dexClassKey,
      currencyClassKey,
      fee,
      new BigNumber("300"),
      75920,
      76110,
      new BigNumber("0"),
      new BigNumber("0"),
      "POSITION-ID-2"
    );

    const burnRes = await contract.RemoveLiquidity(ctx, dto);
    const expectedResponse = plainToInstance(DexOperationResDto, {
      userBalanceDelta: plainToInstance(UserBalanceResDto, {
        token0Balance: {
          owner: users.testUser1Id,
          collection: "TEST",
          category: "Currency",
          type: "DEX",
          additionalKey: "none",
          quantity: new BigNumber("0.0338630202"),
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
          quantity: new BigNumber("59.4216485721"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        }
      }),
      amounts: ["0.0338630202","59.4216485721"],
      poolHash: poolObj.genPoolHash(),
      poolAlias: poolObj.getPoolAlias(),
      poolFee: 500
    });

    console.log("Burn Response is", JSON.stringify(burnRes));
    expect(burnRes.Data).toEqual(expectedResponse);
    console.log("This is cleared");

  });
});
