import {
  ConfigureDexFeeAddressDto,
  DexFeeConfig,
  GalaChainResponse,
  GalaChainResponseType,
  NotFoundError,
  SetProtocolFeeDto,
  SetProtocolFeeResDto
} from "@gala-chain/api";
import { fixture, transactionSuccess, users, writesMap } from "@gala-chain/test";
import { plainToInstance } from "class-transformer";
import { ERROR } from "opentracing/lib/ext/tags";

import { DexV3Contract } from "../contracts";
import { ErrorCode } from "./../../../chain-api/src/ethers/errors";
import { GalaChainSuccessResponse } from "./../../../chain-api/src/types/contract";
import { UnauthorizedError } from "./../../../chain-cli/src/errors";

describe("DEX Protocol Fee Config Functions", () => {
  test("Should update protocol fee if user is authorized", async () => {
    const currentFee = new DexFeeConfig(["client|testUser1"], 0.2);
    const { ctx, contract } = fixture(DexV3Contract).callingUser(users.testUser1Id).savedState(currentFee);
    const dto = new SetProtocolFeeDto(0.5);

    const res = await contract.SetProtocolFee(ctx, dto);

    expect(res).toEqual(GalaChainResponse.Success(new SetProtocolFeeResDto(0.5)));
  });

  test("Should throw error if no fee config is found", async () => {
    const { ctx, contract } = fixture(DexV3Contract).callingUser(users.testUser1Id);
    const dto = new SetProtocolFeeDto(0.5);

    const res = await contract.SetProtocolFee(ctx, dto);

    expect(res).toEqual(
      GalaChainResponse.Error(
        new NotFoundError(
          "Protocol fee configuration has yet to be defined. Dex fee configuration is not defined."
        )
      )
    );
  });

  test("Should throw error if calling user is not authorized", async () => {
    const currentAdmin = new DexFeeConfig(["client|testUser2"], 0.2);
    const { ctx, contract } = fixture(DexV3Contract).callingUser(users.testUser1Id).savedState(currentAdmin);

    const dto = new SetProtocolFeeDto(0.5);

    const res = await contract.SetProtocolFee(ctx, dto);

    expect(res).toEqual(
      GalaChainResponse.Error(
        new UnauthorizedError("CallingUser client|testUser1 is not authorized to create or update")
      )
    );
  });
});

describe("Configure Dex Fee Address", () => {
  test("Should throw error if newAuthorities is empty", async () => {
    const dto = new ConfigureDexFeeAddressDto();
    dto.newAuthorities = [];

    const { ctx, contract } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    const res = await contract.ConfigureDexFeeAddress(ctx, dto);

    expect(res).toEqual({
      Status: GalaChainResponseType.Error,
      ErrorCode: 400,
      ErrorKey: "DTO_VALIDATION_FAILED",
      ErrorPayload: ["arrayMinSize: At least one user should be defined to provide access"],
      Message:
        "DTO validation failed: (1) arrayMinSize: At least one user should be defined to provide access"
    });
  });
  test("It should throw error if no user is configured to provide access", async () => {
    const { ctx, contract } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    const dto = new ConfigureDexFeeAddressDto();
    const res = await contract.ConfigureDexFeeAddress(ctx, dto);

    expect(res).toEqual(
      GalaChainResponse.Error(
        new UnauthorizedError("CallingUser client|testUser1 is not authorized to create or update")
      )
    );
  });

  test("creates new fee config if none exists and user is curator", async () => {
    const dto = new ConfigureDexFeeAddressDto();
    dto.newAuthorities = ["client|testUser1"];

    const { ctx, contract, writes } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    await contract.ConfigureDexFeeAddress(ctx, dto);

    // expect(writes).toEqual(GalaChainSuccessResponse.Success(new DexFeeConfig(["client|testUser1"], 0.1)));
    const expectedConfig = plainToInstance(DexFeeConfig, {
      authorities: ["client|testUser1"],
      protocolFee: 0.1
    });

    expect(writes).toEqual(writesMap(expectedConfig));
    console.log("It is cleared ?? ?? ");
  });

  test("should update authorities if config exists and user is authorized", async () => {
    const dexFeeConfig = new DexFeeConfig(["client|testUser1"]);

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(dexFeeConfig);

    const dto = new ConfigureDexFeeAddressDto();
    dto.newAuthorities = ["client|testUser1", "client|testUser2"];

    await contract.ConfigureDexFeeAddress(ctx, dto);

    const expectedConfig = plainToInstance(DexFeeConfig, {
      authorities: ["client|testUser1", "client|testUser2"],
      protocolFee: 0.1
    });

    expect(writes).toEqual(writesMap(expectedConfig));
  });

  test("should throw UnauthorizedError if config exists and user is NOT authorized", async()=>{

    const dexFeeConfig = new DexFeeConfig(["client|testUser1"]);

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser2Id)
      .savedState(dexFeeConfig);

    const dto = new ConfigureDexFeeAddressDto();
    dto.newAuthorities = ["client|testUser2"];

    const res = await contract.ConfigureDexFeeAddress(ctx, dto);
    console.log("Response of config", res);

    expect(res).toEqual(GalaChainResponse.Error(new UnauthorizedError("CallingUser client|testUser2 is not authorized to create or update")))

  })
});
