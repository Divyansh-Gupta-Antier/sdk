import { DexFeePercentageTypes, Pool, TickData, TokenClass, TokenClassKey, TokenInstance } from "@gala-chain/api";
import { currency, dex, fixture, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";

import { DexV3Contract } from "../__test__/TestDexV3Contract";
import { fetchOrCreateTickDataPair } from "./tickData.helper";

describe("Tick Data Helper", () => {
  test("It will create new tick data pair if it does not exists", async () => {
    const poolHash = "dummyhash1234567890abcdef";
    const tickLower = 75920;
    const tickUpper = 76110;

    const { ctx } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    const response = await fetchOrCreateTickDataPair(ctx, poolHash, tickLower, tickUpper);

    const expectedTickUpper = new TickData(poolHash,tickUpper);
    const expetedTickLower = new TickData(poolHash,tickLower);

    expect(response).toEqual(expetedTickLower);
    expect(response).toEqual(expectedTickUpper);
    
    expect(response).toMatchObject({
      tickUpperData: {
        poolHash: "dummyhash1234567890abcdef",
        tick: 76110,
        liquidityGross: "0",
        initialised: false,
        liquidityNet: "0",
        feeGrowthOutside0: "0",
        feeGrowthOutside1: "0"
      },
      tickLowerData: {
        poolHash: "dummyhash1234567890abcdef",
        tick: 75920,
        liquidityGross: "0",
        initialised: false,
        liquidityNet: "0",
        feeGrowthOutside0: "0",
        feeGrowthOutside1: "0"
      }
    });
  });

  test("It will return existing tick data pair if it exists", async () => {
    const fee = 500;

    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();
   

    const poolObj = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const poolHash = poolObj.genPoolHash();

    const tickLowerData = new TickData(poolObj.genPoolHash(), 75920);

    const tickUpperData = new TickData(poolObj.genPoolHash(), 76110);
    
    const {ctx } =  fixture(DexV3Contract)
    .callingUser(users.testUser1Id).savedState(
        tickLowerData,
        tickUpperData
    );

    const response = await fetchOrCreateTickDataPair(ctx, poolHash, 75920, 76110);

    console.log("The response after saved state 9s ", JSON.stringify(response));
  
    expect(response).toMatchObject({
        tickUpperData: {
          poolHash,
          tick: 76110,
          liquidityGross: "0",
          initialised: false,
          liquidityNet: "0",
          feeGrowthOutside0: "0",
          feeGrowthOutside1: "0"
        },
        tickLowerData: {
          poolHash,
          tick: 75920,
          liquidityGross: "0",
          initialised: false,
          liquidityNet: "0",
          feeGrowthOutside0: "0",
          feeGrowthOutside1: "0"
        }
      });

      


    
      


  });
});
