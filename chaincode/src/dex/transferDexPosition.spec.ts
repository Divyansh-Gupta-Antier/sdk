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
  TokenInstance,
  TransferDexPositionDto
} from "@gala-chain/api";
import { currency, dex, fixture, users, writesMap } from "@gala-chain/test";
import BigNumber from "bignumber.js";

import { DexV3Contract } from "../__test__/TestDexV3Contract";

describe("Transfer Dex Position", () => {
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

  test("LP provider should be able to transfer his dex position", async () => {
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
        tickUpperData
      );

    const dto = new TransferDexPositionDto();
    dto.toAddress = users.testUser2Id;
    dto.token0 = dexClassKey;
    dto.token1 = currencyClassKey;
    dto.fee = 500;
    dto.positionId = "POSITION-ID";

    const transferDexPositionRes = await contract.TransferDexPosition(ctx, dto);

    console.log("Writes are", JSON.stringify(writes));

    console.log("Transfer dex position response", JSON.stringify(transferDexPositionRes));

    const expectedOldPosition = new DexPositionOwner(
      "client|testUser1",
      "adab0db73917131fcd7fafc805b6092fe65c1bdf923ecbe7c5ea640b68f5f523"
    );
    expectedOldPosition.tickRangeMap = {};
    const expectedNewPosition = new DexPositionOwner(
      "client|testUser2",
      "adab0db73917131fcd7fafc805b6092fe65c1bdf923ecbe7c5ea640b68f5f523"
    );
    expectedNewPosition.tickRangeMap = { "75920:76110": ["POSITION-ID"] };

    expect(writes).toEqual(writesMap(expectedOldPosition, expectedNewPosition));
  });

  test("It will revert if position is not found", async () => {
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

    const { ctx, contract } = fixture(DexV3Contract)
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
        tickUpperData
      );

    const dto = new TransferDexPositionDto();
    dto.toAddress = users.testUser2Id;
    dto.token0 = dexClassKey;
    dto.token1 = currencyClassKey;
    dto.fee = 500;
    dto.positionId = "POSITION-ID-O";

    const transferDexPositionRes = await contract.TransferDexPosition(ctx, dto);
    expect(transferDexPositionRes).toEqual(
      GalaChainResponse.Error(
        new NotFoundError(
          "client|testUser1 does not hold hold any position for given POSITION-ID-O for this pool"
        )
      )
    );
  });
});
