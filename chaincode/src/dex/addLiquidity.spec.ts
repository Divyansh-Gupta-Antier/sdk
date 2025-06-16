import {
  AddLiquidityDTO,
  ConflictError,
  DexOperationResDto,
  GalaChainResponse,
  GalaChainResponseType,
  GetAddLiquidityEstimationDto,
  Pool,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance,
  ValidationFailedError,
  feeAmountTickSpacing,
  sqrtPriceToTick
} from "@gala-chain/api";
import { currency, dex, fixture, poolTest, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";

import { DexV3Contract } from "../__test__/TestDexV3Contract";
import { contracts } from "./../../../chain-cli/chaincode-template/src/index";
import {
  ETHClassKey,
  ETHInstance,
  ETHtokenClass,
  USDTClassKey,
  USDTInstance,
  USDTtokenClass
} from "./testUtils";

describe("Add Liquidity", () => {
  test("Add Liquidity : Should throw error while adding liquidity below minimum tick", async () => {
    //Given
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];
    const ta = -887280,
      tb = -324340;

    const dto = new AddLiquidityDTO(
      ETHClassKey,
      USDTClassKey,
      fee,
      ta,
      tb,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    const poolObj = poolTest.poolPlain((plain) => ({
      ...plain,
      token0: ETHClassKey.toString(),
      token1: USDTClassKey.toString(),
      fee: fee
    }));

    const USDTBalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "USDT",
      category: "Unit",
      type: "none",
      quantity: new BigNumber("10000000")
    }));

    const ETHbalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "ETH",
      category: "Unit",
      type: "none",
      additionalKey: "none",

      quantity: new BigNumber("10000000")
    }));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(ETHtokenClass, USDTtokenClass, USDTInstance, ETHInstance, poolObj, USDTBalance, ETHbalance);

    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    expect(addLiquidityRes).toEqual({
      Status: GalaChainResponseType.Error,
      ErrorCode: 400,
      ErrorKey: "DTO_VALIDATION_FAILED",
      ErrorPayload: ["min: tickLower must not be less than -887272"],
      Message: "DTO validation failed: (1) min: tickLower must not be less than -887272"
    });

    console.log("This add liq is passed");
  });

  //   test("Add Liquidity : Should throw error while adding liquidity above maximum tick", async () => {
  //     //Given
  //     const fee = 500;
  //     const tickSpacing = feeAmountTickSpacing[fee];
  //     const ta = 887280;
  //     const tb = -887280;

  //     const dto = new AddLiquidityDTO(
  //       ETHClassKey,
  //       USDTClassKey,
  //       fee,
  //       ta,
  //       tb,
  //       new BigNumber(1),
  //       new BigNumber(1),
  //       new BigNumber(1),
  //       new BigNumber(1),
  //       undefined
  //     );
  //     dto.uniqueKey = randomUUID();

  //     const poolObj = poolTest.poolPlain((plain) => ({
  //       ...plain,
  //       token0: ETHClassKey.toString(),
  //       token1: USDTClassKey.toString(),
  //       fee: fee
  //     }));

  //     const USDTBalance = currency.tokenBalance((b) => ({
  //       ...b,
  //       owner: users.testUser1Id,
  //       collection: "USDT",
  //       category: "Unit",
  //       type: "none",
  //       quantity: new BigNumber("10000000")
  //     }));

  //     const ETHbalance = currency.tokenBalance((b) => ({
  //       ...b,
  //       owner: users.testUser1Id,
  //       collection: "ETH",
  //       category: "Unit",
  //       type: "none",
  //       additionalKey: "none",

  //       quantity: new BigNumber("10000000")
  //     }));

  //     const { ctx, contract, writes } = fixture(DexV3Contract)
  //       .callingUser(users.testUser1Id)
  //       .savedState(ETHtokenClass, USDTtokenClass, USDTInstance, ETHInstance, poolObj, USDTBalance, ETHbalance);

  //     const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

  //     expect(addLiquidityRes).toEqual({
  //       Status: GalaChainResponseType.Error,
  //       ErrorCode: 400,
  //       ErrorKey: "DTO_VALIDATION_FAILED",
  //       ErrorPayload: ["min: tickLower must not be less than -887272"],
  //       Message: "DTO validation failed: (1) min: tickLower must not be less than -887272"
  //     });
  //   });

  test("It should throw error  when tick lower is greater than upper tick", async () => {
    //Given
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];
    const ta = 887280;
    const tb = -324340;

    const dto = new AddLiquidityDTO(
      ETHClassKey,
      USDTClassKey,
      fee,
      ta,
      tb,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    const poolObj = poolTest.poolPlain((plain) => ({
      ...plain,
      token0: ETHClassKey.toString(),
      token1: USDTClassKey.toString(),
      fee: fee
    }));

    const USDTBalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "USDT",
      category: "Unit",
      type: "none",
      quantity: new BigNumber("10000000")
    }));

    const ETHbalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "ETH",
      category: "Unit",
      type: "none",
      additionalKey: "none",

      quantity: new BigNumber("10000000")
    }));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(ETHtokenClass, USDTtokenClass, USDTInstance, ETHInstance, poolObj, USDTBalance, ETHbalance);

    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    expect(addLiquidityRes).toEqual({
      Status: GalaChainResponseType.Error,
      ErrorCode: 400,
      ErrorKey: "DTO_VALIDATION_FAILED",
      ErrorPayload: ["isLessThan: tickLower must be less than tickUpper"],
      Message: "DTO validation failed: (1) isLessThan: tickLower must be less than tickUpper"
    });

    console.log("All clear");
  });

  test("It should throw error when ticks are not spaced", async () => {
    const fee = 500;
    const ta = 887,
      tb = 32434;

    const dto = new AddLiquidityDTO(
      ETHClassKey,
      USDTClassKey,
      fee,
      ta,
      tb,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    const poolObj = poolTest.poolPlain((plain) => ({
      ...plain,
      token0: ETHClassKey.toString(),
      token1: USDTClassKey.toString(),
      fee: fee,
      maxLiquidityPerTick: new BigNumber("19200")
    }));

    const USDTBalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "USDT",
      category: "Unit",
      type: "none",
      quantity: new BigNumber("10000000")
    }));

    const ETHbalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "ETH",
      category: "Unit",
      type: "none",
      additionalKey: "none",

      quantity: new BigNumber("10000000")
    }));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(ETHtokenClass, USDTtokenClass, USDTInstance, ETHInstance, poolObj, USDTBalance, ETHbalance);

    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);
    console.log("ADD LIQUIDITY RES", addLiquidityRes);

    expect(addLiquidityRes).toEqual(
      GalaChainResponse.Error(new ValidationFailedError("Tick is not spaced 887 60"))
    );
    expect(writes).toEqual({});
    console.log("All clear now");
  });

  test("Adding liquidity more than max liquidity will throw error", async () => {
    const pa = 1700,
      pb = 1900;
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];
    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);
    const slippage = 0.5;
    const token0 = new BigNumber("10"),
      token1 = new BigNumber("10000000000000000000000000000000000000000000");
    const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const poolObj = poolTest.poolPlain((plain) => ({
      ...plain,
      token0: ETHClassKey.toString(),
      token1: USDTClassKey.toString(),
      fee: fee
    }));
    const USDTBalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "USDT",
      category: "Unit",
      type: "none",
      quantity: new BigNumber("10000000")
    }));

    const ETHbalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "ETH",
      category: "Unit",
      type: "none",
      additionalKey: "none",

      quantity: new BigNumber("10000000")
    }));

    const dto = new AddLiquidityDTO(
      ETHClassKey,
      USDTClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      token1Slipped,
      undefined
    );
    dto.uniqueKey = randomUUID();

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(ETHtokenClass, USDTtokenClass, USDTInstance, ETHInstance, poolObj, USDTBalance, ETHbalance);

    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);
    expect(addLiquidityRes).toEqual(
      GalaChainResponse.Error(new ValidationFailedError("liquidity crossed max liquidity"))
    );
    console.log("This test is also passed");
  });

  test("Adding liquidity equal to zero will throw an error", async () => {
    const pa = 1700,
      pb = 1900;
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);
    const slippage = 0.5;
    const token0 = new BigNumber("0"),
      token1 = new BigNumber("0");
    const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const poolObj = poolTest.poolPlain((plain) => ({
      ...plain,
      token0: ETHClassKey.toString(),
      token1: USDTClassKey.toString(),
      fee: fee
    }));

    const USDTBalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "USDT",
      category: "Unit",
      type: "none",
      quantity: new BigNumber("10000000")
    }));

    const ETHbalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "ETH",
      category: "Unit",
      type: "none",
      additionalKey: "none",

      quantity: new BigNumber("10000000")
    }));

    const dto = new AddLiquidityDTO(
      ETHClassKey,
      USDTClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      token1Slipped,
      undefined
    );
    dto.uniqueKey = randomUUID();

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(ETHtokenClass, USDTtokenClass, USDTInstance, ETHInstance, poolObj, USDTBalance, ETHbalance);

    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);
    console.log("Add liq res", addLiquidityRes);

    expect(addLiquidityRes).toEqual(GalaChainResponse.Error(new ValidationFailedError("Invalid Liquidity")));
  });

  test("Add liquidity in range 1700 - 1900", async () => {
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];

    const pa = 1700,
      pb = 1900;

    const poolObj = poolTest.poolPlain((plain) => ({
      ...plain,
      token0: ETHClassKey.toString(),
      token1: USDTClassKey.toString(),
      fee: fee,
      tickSpacing: 10,
      maxLiquidityPerTick: new BigNumber("1917565579412846627735051215301243.08110657663841167978")
    }));

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);
    // const expectedTokenDTO = new GetAddLiquidityEstimationDto(
    //   ETHClassKey,
    //   USDTClassKey,
    //   fee,
    //   new BigNumber(1),
    //   ta,
    //   tb,
    //   false
    // );

    const slippage = 0.5;

    const USDTBalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "USDT",
      category: "Unit",
      type: "none",
      quantity: new BigNumber("10000000")
    }));

    const ETHbalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "ETH",
      category: "Unit",
      type: "none",
      additionalKey: "none",
      quantity: new BigNumber("10000000")
    }));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        ETHtokenClass,
        USDTtokenClass,
        USDTInstance,
        ETHInstance,
        poolObj,
        USDTBalance,
        ETHbalance,
        USDTInstance,
        ETHInstance
      );

    const AmountForLiquidity = poolObj.getAmountForLiquidity(new BigNumber("1"), ta, tb, false);

    console.log(
      "Amout for Liquitiy++++++++++++++++++++++++++++++++++++++++++++++++++++++ ",
      JSON.stringify(AmountForLiquidity)
    );
    console.log("Pool is", poolObj);

    const token0 = new BigNumber(AmountForLiquidity[0]);
    const token1 = new BigNumber(AmountForLiquidity[1]);

    console.log("TOKEN0", token0);
    console.log("Token1", token1);

    const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    console.log("TA", ta);
    console.log("TB", tb);

    const dto = new AddLiquidityDTO(
      ETHClassKey,
      USDTClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      token1Slipped,
      undefined
    );
    dto.uniqueKey = randomUUID();

    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);
    console.log("Add ;OQIOIWJRO2E2F", addLiquidityRes);

    // const createPoolResDTO = plainToInstance(CreatePoolResDto, {
    //   token0: ETHClassKey,
    //   token1: USDTClassKey,
    //   poolFee: fee,
    //   poolHash: poolObj.genPoolHash(),
    //   poolAlias: poolObj.getPoolAlias()
    // });

    // const expectedRes =  plainToInstance(DexOperationResDto,

    //   )

    //console.log("ADD LIQUIDITY RES", addLiquidityRes);
  });

  test("Add liquidity in range 1980 - 2020", async () => {
    const pa = 1980,
      pb = 2020;
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];
    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);
    const slippage = 0.5;

    const poolObj = poolTest.poolPlain((plain) => ({
      ...plain,
      token0: ETHClassKey.toString(),
      token1: USDTClassKey.toString(),
      fee: fee,

      maxLiquidityPerTick: new BigNumber("1917565579412846627735051215301243.08110657663841167978")
    }));

    const AmountForLiquidity = poolObj.getAmountForLiquidity(new BigNumber("10"), ta, tb, false);

    const token0 = new BigNumber(AmountForLiquidity[0]);
    const token1 = new BigNumber(AmountForLiquidity[1]);

    console.log("TOKEN0", token0);
    console.log("Token1", token1);

    const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    console.log("TA", ta);
    console.log("TB", tb);

    const dto = new AddLiquidityDTO(
      ETHClassKey,
      USDTClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      token1Slipped,
      undefined
    );
    dto.uniqueKey = randomUUID();

    const USDTBalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "USDT",
      category: "Unit",
      type: "none",
      quantity: new BigNumber("10000000")
    }));

    const ETHbalance = currency.tokenBalance((b) => ({
      ...b,
      owner: users.testUser1Id,
      collection: "ETH",
      category: "Unit",
      type: "none",
      additionalKey: "none",
      quantity: new BigNumber("10000000")
    }));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        ETHtokenClass,
        USDTtokenClass,
        USDTInstance,
        ETHInstance,
        poolObj,
        USDTBalance,
        ETHbalance,
        USDTInstance,
        ETHInstance
      );

    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);
    console.log("Addd liqudity respomse", addLiquidityRes);
  });
});

test.only("Test", async () => {
  const GALAInstance: TokenInstance = currency.tokenInstance();
  const GALAClassKey: TokenClassKey = currency.tokenClassKey();
  const GALAClass: TokenClass = currency.tokenClass();

  const ETIMEClassKeyInstance: TokenInstance = dex.tokenInstance();
  const ETIMEClassKey: TokenClassKey = dex.tokenClassKey();
  const ETIMEClass: TokenClass = dex.tokenClass();

  const GALABal: TokenBalance = plainToInstance(TokenBalance, {
    ...currency.tokenBalancePlain(),
    owner: users.testUser1Id
  });

  const ETIMEBal: TokenBalance = plainToInstance(TokenBalance, {
    ...dex.tokenBalancePlain(),
    owner: users.testUser1Id
  });

  const poolObj = plainToInstance(Pool, {
    bitmap: {
      "0": "83076750357945113338407354246627328",
      "1": "0",
      "3": "137438953472",
      "17": "4835703278458516698824704",
      "-1": "730933411463940760376001388125442877140198514752",
      "-18": "23945242826029513411849172299223580994042798784118784",
      "-2": "459380236842379925887816779423992587985014232662902922466455449233931632640",
      "-3": "0"
    },
    fee: 10000,
    feeGrowthGlobal0: "4.01816730998426278934",
    feeGrowthGlobal1: "1.25555923285486872755",
    grossPoolLiquidity: "6554987350.6236286328824962",
    liquidity: "5345.351199791401526148",
    maxLiquidityPerTick: "38347248999678653400142060922857318.01636519561716576269",
    protocolFees: 0.1,
    protocolFeesToken0: "98.459616448768629405352",
    protocolFeesToken1: "11.53705272762196742578011268332046314324990836880805945094184413931083",
    sqrtPrice: "0.07218844325193517878",
    tickSpacing: 200,
    token0: ETIMEClassKey.toStringKey(),
    token0ClassKey: ETIMEClassKey,
    token1: GALAClassKey.toStringKey(),
    token1ClassKey: GALAClassKey
  });
  // console.dir(poolObj, { depth: null, colors: true });

  const { ctx, contract } = fixture(DexV3Contract)
    .callingUser(users.testUser1Id)
    .savedState(ETIMEBal, GALABal, poolObj, GALAClass, ETIMEClass, ETIMEClassKeyInstance, GALAInstance);

  const dto = new AddLiquidityDTO(
    ETIMEClassKey,
    GALAClassKey,
    10000,
    -56800,
    0,
    new BigNumber(1),
    new BigNumber(0.00006362),
    new BigNumber(0),
    new BigNumber(0),
    undefined
  );
  dto.uniqueKey = randomUUID();

  const res = await contract.AddLiquidity(ctx, dto);
  console.dir(res, { depth: null, colors: true });
});

const spacedTicksFromPrice = (pa: number, pb: number, tickSpacing: number) => {
  return [
    Math.ceil(sqrtPriceToTick(new BigNumber(Math.sqrt(pa))) / tickSpacing) * tickSpacing,
    Math.floor(sqrtPriceToTick(new BigNumber(Math.sqrt(pb))) / tickSpacing) * tickSpacing
  ];
};

function slippedValue(val: BigNumber[], slippage: BigNumber | number) {
  if (typeof slippage === "number" || typeof slippage === "string") {
    slippage = new BigNumber(slippage);
  }
  const hundred = new BigNumber(100);
  return val.map((e) => e.multipliedBy(hundred.minus(slippage)).dividedBy(hundred));
}
