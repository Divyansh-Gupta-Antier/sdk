import {
  ConfigureDexFeeAddressDto,
  DexFeeConfig,
  GalaChainResponse,
  NotFoundError,
  SetProtocolFeeDto,
  SetProtocolFeeResDto
} from "@gala-chain/api";
import { fixture, users } from "@gala-chain/test";

import { DexV3Contract } from "../contracts";
import { TokenQuantity } from "./../../../.nx/cache/6647173439686884646/outputs/chaincode/lib/src/locks/lockTokens.d";
import { contracts } from "./../../../chain-cli/chaincode-template/src/index";
import { UnauthorizedError } from "./../../../chain-cli/src/errors";

describe("DEX Protocol Fee Config Functions", () => {
  test("User should set protocol fee successfully", async () => {
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

  test("Should throw error if callig user is not authorized", async () => {
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

  test("creates new fee config if none exists and user is curator", async()=>{

    const dto = new ConfigureDexFeeAddressDto();
    dto.newAuthorities = ["client|testUser1"];

    const { ctx, contract } = fixture(DexV3Contract).callingUser(users.testUser1Id);

    const res = await contract.ConfigureDexFeeAddress(ctx,dto);

    console.log("Response from authorities", res);
  
    const expectedResDto = new ConfigureDexFeeAddressDto()


  })
});
