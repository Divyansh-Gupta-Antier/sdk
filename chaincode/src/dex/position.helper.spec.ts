import {
  DexFeePercentageTypes,
  DexPositionData,
  DexPositionOwner,
  GalaChainResponse,
  NotFoundError,
  Pool,
  TickData,
  TokenClass,
  TokenClassKey,
  TokenInstance
} from "@gala-chain/api";
import { currency, dex, fixture, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { DexV3Contract } from "./../__test__/TestDexV3Contract";
import { genTickRange } from "./dexUtils";
import { fetchOrCreateDexPosition, fetchUserPositionInTickRange, getDexPosition } from "./position.helper";

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

describe("Fetch or Create Dex Position", () => {
  test("It will fetch users position if exists", async () => {
    const positionOwner = new DexPositionOwner(users.testUser1Id, poolObj.genPoolHash());
    const positionId = "0xb3dc4b5";

    positionOwner.addPosition("-887270:887270", positionId);

    const uniquekey = "dexkey345";

    const { ctx } = fixture(DexV3Contract).callingUser(users.testUser1Id).savedState(positionOwner);

    const res = await fetchOrCreateDexPosition(ctx, poolObj, -887270, 887270, uniquekey);

    const expectedRes = plainToInstance(DexPositionData, {
      poolHash: poolObj.genPoolHash(),
      positionId: "bd4dd3b1b188fa61b484d581dd9be5834fe3daf37501057f0e1213dc6ea7e983",
      tickUpper: -887270,
      tickLower: 887270,
      liquidity: new BigNumber("0"),
      feeGrowthInside0Last: new BigNumber("0"),
      feeGrowthInside1Last: new BigNumber("0"),
      tokensOwed0: new BigNumber("0"),
      tokensOwed1: new BigNumber("0"),
      token0ClassKey: dexClassKey,
      token1ClassKey: currencyClassKey,
      fee: 500
    });

    expect(res).toMatchObject(expectedRes);
  });

  test("It should create new position if none exists", async () => {
    const uniquekey = "dexkey123";

    const { ctx } = fixture(DexV3Contract).callingUser(users.testUser1Id);
    const res = await fetchOrCreateDexPosition(ctx, poolObj, 76110, 75920, uniquekey);

    console.log("Respones to create position", JSON.stringify(res));

    const expectedRes = plainToInstance(DexPositionData, {
      poolHash: poolObj.genPoolHash(),
      positionId: "af0e1d8886f3d76e9a4f969f82338db376a76d6defe3692514a83dd50da8842c",
      tickUpper: 76110,
      tickLower: 75920,
      liquidity: new BigNumber("0"),
      feeGrowthInside0Last: new BigNumber("0"),
      feeGrowthInside1Last: new BigNumber("0"),
      tokensOwed0: new BigNumber("0"),
      tokensOwed1: new BigNumber("0"),
      token0ClassKey: dexClassKey,
      token1ClassKey: currencyClassKey,
      fee: 500
    });

    expect(res).toEqual(expectedRes);
  });

  test("Pending : should throw NotFoundError if positionId is invalid for given range", async () => {
    const uniquekey = "dexkey345";
    const positionId = "0xb3dc4b5";
    const invalidPostionId = "0xb3d435";

    const positionOwner = new DexPositionOwner(users.testUser1Id, poolObj.genPoolHash());
    positionOwner.addPosition("-887270:887270", positionId);

    const { ctx } = fixture(DexV3Contract).callingUser(users.testUser1Id).savedState(positionOwner);

    expect(
      await fetchOrCreateDexPosition(ctx, poolObj, -887270, 887270, uniquekey, invalidPostionId)
    ).rejects.toThrow(
      new NotFoundError(
        "Cannot find any position with the id 0xb3dc4b5 in the tick range 887270:-887270 that belongs to client|testUser1 in this pool."
      )
    );
  });

  describe("fetchUserPositionInTickRange", () => {
    test("should fetch and return position if valid range and positionId", async () => {
      const positionId = "a3f9b7c2";
      const positionOwner = new DexPositionOwner(users.testUser1Id, poolObj.genPoolHash());
      positionOwner.addPosition(genTickRange(75920, 76110), positionId);

      const dexPositionData = new DexPositionData(
        poolObj.genPoolHash(),
        positionId,
        76110,
        75920,
        dexClassKey,
        currencyClassKey,
        fee
      );

      const { ctx } = fixture(DexV3Contract)
        .callingUser(users.testUser1Id)
        .savedState(positionOwner, dexPositionData);

      const res = await fetchUserPositionInTickRange(ctx, poolObj.genPoolHash(), 76110, 75920);

      const expectedRes = plainToInstance(DexPositionData, {
        poolHash: poolObj.genPoolHash(),
        positionId: positionId,
        tickUpper: 76110,
        tickLower: 75920,
        liquidity: new BigNumber("0"),
        feeGrowthInside0Last: new BigNumber("0"),
        feeGrowthInside1Last: new BigNumber("0"),
        tokensOwed0: new BigNumber("0"),
        tokensOwed1: new BigNumber("0"),
        token0ClassKey: dexClassKey,
        token1ClassKey: currencyClassKey,
        fee: 500
      });

      expect(res).toEqual(expectedRes);
    });

    test("Pending : should throw NotFoundError if positionId does not match tick range", async () => {
      const positionId = "a3f9b7c2";
      const positionOwner = new DexPositionOwner(users.testUser1Id, poolObj.genPoolHash());
      positionOwner.addPosition(genTickRange(75920, 76110), positionId);

      const dexPositionData = new DexPositionData(
        poolObj.genPoolHash(),
        positionId,
        76110,
        75920,
        dexClassKey,
        currencyClassKey,
        fee
      );

      const { ctx } = fixture(DexV3Contract)
        .callingUser(users.testUser1Id)
        .savedState(positionOwner, dexPositionData);

      const res = await fetchUserPositionInTickRange(ctx, poolObj.genPoolHash(), 75710, 75520);
      expect(fetchUserPositionInTickRange(ctx, poolObj.genPoolHash(), 75710, 75520)).toThrow(NotFoundError);
    });

    test("should use owner param instead of ctx.callingUser if provided", async () => {
      const owner = users.testUser3Id;
      const positionId = "a3f9b7c2";
      const positionOwner = new DexPositionOwner(owner, poolObj.genPoolHash());
      positionOwner.addPosition(genTickRange(75920, 76110), positionId);

      const dexPositionData = new DexPositionData(
        poolObj.genPoolHash(),
        positionId,
        76110,
        75920,
        dexClassKey,
        currencyClassKey,
        fee
      );

      const { ctx } = fixture(DexV3Contract)
        .callingUser(users.testUser1Id)
        .savedState(positionOwner, dexPositionData);

      const res = await fetchUserPositionInTickRange(
        ctx,
        poolObj.genPoolHash(),
        76110,
        75920,
        positionId,
        owner
      );

      const expectedRes = plainToInstance(DexPositionData, {
        poolHash: poolObj.genPoolHash(),
        positionId: positionId,
        tickUpper: 76110,
        tickLower: 75920,
        liquidity: new BigNumber("0"),
        feeGrowthInside0Last: new BigNumber("0"),
        feeGrowthInside1Last: new BigNumber("0"),
        tokensOwed0: new BigNumber("0"),
        tokensOwed1: new BigNumber("0"),
        token0ClassKey: dexClassKey,
        token1ClassKey: currencyClassKey,
        fee: 500
      });

      expect(res).toEqual(expectedRes);
    });
  });

  describe("getDexPosition", () => {
    test("should fetch DexPositionData by composite key", async () => {
      const positionId = "a3f9b7c2";

      const dexPositionData = new DexPositionData(
        poolObj.genPoolHash(),
        positionId,
        76110,
        75920,
        dexClassKey,
        currencyClassKey,
        fee
      );

      const { ctx } = fixture(DexV3Contract).callingUser(users.testUser1Id).savedState(dexPositionData);

      const res = await getDexPosition(ctx, poolObj.genPoolHash(), 76110, 75920, positionId);

      const expectedRes = plainToInstance(DexPositionData, {
        poolHash: poolObj.genPoolHash(),
        positionId: positionId,
        tickUpper: 76110,
        tickLower: 75920,
        liquidity: new BigNumber("0"),
        feeGrowthInside0Last: new BigNumber("0"),
        feeGrowthInside1Last: new BigNumber("0"),
        tokensOwed0: new BigNumber("0"),
        tokensOwed1: new BigNumber("0"),
        token0ClassKey: dexClassKey,
        token1ClassKey: currencyClassKey,
        fee: 500
      });

      expect(res).toEqual(expectedRes);
    });

    
  });
});
