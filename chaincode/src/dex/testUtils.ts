import { TokenClassKey } from "@gala-chain/api";
import { currency, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";

const ETHtokenClass = currency.tokenClass((plain) => ({
  ...plain,
  symbol: "ETH",
  name: "Ethereum",
  collection: "ETH",
  category: "Unit",
  type: "none",
  additionalKey: "none"
}));

const ETHClassKey: TokenClassKey = currency.tokenClassKey((plain) => ({
  ...plain,
  collection: "ETH",
  category: "Unit",
  type: "none",
  additionalKey: "none"
}));

// Define USDT TokenClass and TokenClassKey
const USDTtokenClass = currency.tokenClass((plain) => ({
  ...plain,
  symbol: "USDT",
  name: "Tether",
  collection: "USDT",
  category: "Unit",
  type: "none",
  additionalKey: "none"
}));
const USDTClassKey: TokenClassKey = currency.tokenClassKey((plain) => ({
  ...plain,
  collection: "USDT",
  category: "Unit",
  type: "none",
  additionalKey: "none"
}));

const USDTInstance  = currency.tokenInstance((plain) => ({
  ...plain,
  owner: users.testUser1Id,
  collection: "USDT",
  category: "Unit",
  type: "none",
  additionalKey: "none"
}));

const ETHInstance = currency.tokenInstance((plain) => ({
  ...plain,
  owner: users.testUser1Id,
  collection: "ETH",
  category: "Unit",
  type: "none",
  additionalKey: "none"
}));

export { ETHtokenClass, USDTtokenClass, USDTClassKey, ETHClassKey, USDTInstance, ETHInstance };
