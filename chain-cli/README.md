# galachain

CLI tool for Gala chaincode

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

<!-- toc -->
* [galachain](#galachain)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @gala-chain/cli
$ galachain COMMAND
running command...
$ galachain (--version)
@gala-chain/cli/2.4.2 linux-x64 node-v18.20.8
$ galachain --help [COMMAND]
USAGE
  $ galachain COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`galachain deploy IMAGETAG [DEVELOPERPRIVATEKEY]`](#galachain-deploy-imagetag-developerprivatekey)
* [`galachain dto-sign KEY DATA`](#galachain-dto-sign-key-data)
* [`galachain dto-verify KEY DATA`](#galachain-dto-verify-key-data)
* [`galachain dto:sign KEY DATA`](#galachain-dtosign-key-data)
* [`galachain dto:verify KEY DATA`](#galachain-dtoverify-key-data)
* [`galachain help [COMMAND]`](#galachain-help-command)
* [`galachain info [DEVELOPERPRIVATEKEY]`](#galachain-info-developerprivatekey)
* [`galachain init PATH`](#galachain-init-path)
* [`galachain keygen FILE`](#galachain-keygen-file)
* [`galachain logs`](#galachain-logs)
* [`galachain network-prune`](#galachain-network-prune)
* [`galachain network-up`](#galachain-network-up)
* [`galachain network:prune`](#galachain-networkprune)
* [`galachain network:up`](#galachain-networkup)
* [`galachain register [DEVELOPERPRIVATEKEY]`](#galachain-register-developerprivatekey)

## `galachain deploy IMAGETAG [DEVELOPERPRIVATEKEY]`

Schedules deployment of published chaincode Docker image to GalaChain TNT network.

```
USAGE
  $ galachain deploy IMAGETAG [DEVELOPERPRIVATEKEY] [--json] [--log-level debug|info|warn|error] [--mnt]
    [--no-prompt]

ARGUMENTS
  IMAGETAG             Image tag to deploy. It should follow the pattern imageName:version.
  DEVELOPERPRIVATEKEY  Developer's private key to sign the request. It could be a file or a string. If not provided as
                       an argument, the command will try to read the private key from the environment variable
                       DEV_PRIVATE_KEY, or from the default location (~/.gc-keys/<chaincode-name>/gc-dev-key), or will
                       ask for it in a prompt.

FLAGS
  --mnt        Get info from MNT network instead of TNT (not supported yet).
  --no-prompt  Do not prompt for confirmation.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  Schedules deployment of published chaincode Docker image to GalaChain TNT network.

EXAMPLES
  $ galachain deploy registry.image.name:latest

  $ galachain deploy registry.image.name:latest ./dev-private-key

  $ galachain deploy registry.image.name:latest c0fb1924408d936fb7cd0c86695885df4f66861621b5c8660df3924c4d09dd79
```

## `galachain dto-sign KEY DATA`

DTO (Data Transfer Object) signing.

```
USAGE
  $ galachain dto-sign KEY DATA [--json] [--log-level debug|info|warn|error] [-o <value>] [-d] [-s]

ARGUMENTS
  KEY   Private key string or path to the private key file.
  DATA  Data representing an unsigned DTO object you wish to sign. Provide a JSON string or a path to a valid JSON file.

FLAGS
  -d, --derSignature        (optional) If provided, the signature will be used as DER format.
  -o, --outputFile=<value>  (optional) File path to an output directory where the signed DTO JSON file will be written.
                            If not provided, signed DTO will be printed to stdout.
  -s, --onlySignature       (optional) If provided, only the signature will be printed to stdout or written to a file.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  DTO (Data Transfer Object) signing.

ALIASES
  $ galachain dto:sign

EXAMPLES
  $ galachain dto:sign -o=output/path ./testkey '{
        "tokenClass": {
          "collection": "CLITest",
          "category": "Currency",
        }
      }'

  $ galachain dto:sign ./testkey dto.json -o=output/path

  $ galachain dto:sign ./testkey dto.json -d

  $ galachain dto:sign 04ea7e8e14f2a0 dto.json -s -o=output/path -d
```

## `galachain dto-verify KEY DATA`

It verifies the signature in the DTO using the public key.

```
USAGE
  $ galachain dto-verify KEY DATA [--json] [--log-level debug|info|warn|error]

ARGUMENTS
  KEY   File path to the public key.
  DATA  Data representing an signed DTO object you wish to verify. Provide a JSON string or a path to a valid JSON file.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  It verifies the signature in the DTO using the public key.

ALIASES
  $ galachain dto:verify

EXAMPLES
  $ galachain dto:verify ./publicKey '{
        "tokenClass": {
          "collection": "CLITest",
          "category": "Currency",
        },
        "signature": "/fYYooumRdFFrL4U3Nzwuf2uzBZAxKv4WrnMjLnbnJFU+Z6lQe2X/CCcLhRqq67jUDEFvOdky0g5D4sRCExXyBw=",
      }'

  $ galachain dto:verify ./publicKey dto.json
```

## `galachain dto:sign KEY DATA`

DTO (Data Transfer Object) signing.

```
USAGE
  $ galachain dto:sign KEY DATA [--json] [--log-level debug|info|warn|error] [-o <value>] [-d] [-s]

ARGUMENTS
  KEY   Private key string or path to the private key file.
  DATA  Data representing an unsigned DTO object you wish to sign. Provide a JSON string or a path to a valid JSON file.

FLAGS
  -d, --derSignature        (optional) If provided, the signature will be used as DER format.
  -o, --outputFile=<value>  (optional) File path to an output directory where the signed DTO JSON file will be written.
                            If not provided, signed DTO will be printed to stdout.
  -s, --onlySignature       (optional) If provided, only the signature will be printed to stdout or written to a file.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  DTO (Data Transfer Object) signing.

ALIASES
  $ galachain dto:sign

EXAMPLES
  $ galachain dto:sign -o=output/path ./testkey '{
        "tokenClass": {
          "collection": "CLITest",
          "category": "Currency",
        }
      }'

  $ galachain dto:sign ./testkey dto.json -o=output/path

  $ galachain dto:sign ./testkey dto.json -d

  $ galachain dto:sign 04ea7e8e14f2a0 dto.json -s -o=output/path -d
```

## `galachain dto:verify KEY DATA`

It verifies the signature in the DTO using the public key.

```
USAGE
  $ galachain dto:verify KEY DATA [--json] [--log-level debug|info|warn|error]

ARGUMENTS
  KEY   File path to the public key.
  DATA  Data representing an signed DTO object you wish to verify. Provide a JSON string or a path to a valid JSON file.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  It verifies the signature in the DTO using the public key.

ALIASES
  $ galachain dto:verify

EXAMPLES
  $ galachain dto:verify ./publicKey '{
        "tokenClass": {
          "collection": "CLITest",
          "category": "Currency",
        },
        "signature": "/fYYooumRdFFrL4U3Nzwuf2uzBZAxKv4WrnMjLnbnJFU+Z6lQe2X/CCcLhRqq67jUDEFvOdky0g5D4sRCExXyBw=",
      }'

  $ galachain dto:verify ./publicKey dto.json
```

## `galachain help [COMMAND]`

display help for galachain

```
USAGE
  $ galachain help [COMMAND] [--all]

ARGUMENTS
  COMMAND  command to show help for

FLAGS
  --all  see all commands in CLI

DESCRIPTION
  display help for galachain
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.3.1/src/commands/help.ts)_

## `galachain info [DEVELOPERPRIVATEKEY]`

Get ChainCode information.

```
USAGE
  $ galachain info [DEVELOPERPRIVATEKEY] [--json] [--log-level debug|info|warn|error] [--mnt]

ARGUMENTS
  DEVELOPERPRIVATEKEY  Developer's private key to sign the request. It could be a file or a string. If not provided as
                       an argument, the command will try to read the private key from the environment variable
                       DEV_PRIVATE_KEY, or from the default location (~/.gc-keys/<chaincode-name>/gc-dev-key), or will
                       ask for it in a prompt.

FLAGS
  --mnt  Get info from MNT network instead of TNT (not supported yet).

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  Get ChainCode information.

EXAMPLES
  $ galachain info

  $ galachain info ./dev-private-key

  $ galachain info c0fb1924408d936fb7cd0c86695885df4f66861621b5c8660df3924c4d09dd79
```

## `galachain init PATH`

Initialize a project template with Chain CLI.

```
USAGE
  $ galachain init PATH [--json] [--log-level debug|info|warn|error]

ARGUMENTS
  PATH  Output path for project template.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  Initialize a project template with Chain CLI.

EXAMPLES
  $ galachain init ./linux-mac-path/my-project-name
```

## `galachain keygen FILE`

Generate a Public / Private key signing pair for Chain DTO (Data Transfer Object) signatures. Uses `@noble/secp256k1` npm library under-the-hood. Always handle private keys with the utmost care.

```
USAGE
  $ galachain keygen FILE [--json] [--log-level debug|info|warn|error]

ARGUMENTS
  FILE  Output file path for private key. Public key will be written alongside it with ".pub" suffix.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  Generate a Public / Private key signing pair for Chain DTO (Data Transfer Object) signatures. Uses `@noble/secp256k1`
  npm library under-the-hood. Always handle private keys with the utmost care.

EXAMPLES
  $ galachain keygen data/user1
```

## `galachain logs`

```
USAGE
  $ galachain logs [--json] [--log-level debug|info|warn|error] [-k <value>] [-s <value>] [-e <value>] [-l
    <value>] [-f <value>] [--follow]

FLAGS
  -e, --endTime=<value>              [default: now] End time for logs. Accepts ISO8601 format or shorthand (e.g., now,
                                     0).
  -f, --filter=<value>               Filter for logs (e.g., error, info, warn, debug).
  -k, --developerPrivateKey=<value>  Private key to sign the data. It can be a file path or a key string. If not
                                     provided, the private key will be read from the environment variable
                                     DEV_PRIVATE_KEY.
  -l, --limit=<value>                Maximum number of log entries to fetch.
  -s, --startTime=<value>            Start time for logs. Accepts ISO8601 format or shorthand (e.g.,
                                     2023-01-01T00:00:00Z, 5m, 1h, 2d).
      --follow                       Specify if logs should be streamed.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>
```

## `galachain network-prune`

Removes the network entirely.

```
USAGE
  $ galachain network-prune [--json] [--log-level debug|info|warn|error] [-r <value>]

FLAGS
  -r, --fabloRoot=<value>  [default: ./test-network] Root directory of target network. By default './test-network' is
                           used.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  Removes the network entirely.

ALIASES
  $ galachain network:prune

EXAMPLES
  $ galachain network:prune -r=./dir-target-netowrk
```

## `galachain network-up`

Start the chaincode, browser-api, and ops-api (in non-watch mode).

```
USAGE
  $ galachain network-up -C <value>... -t curator|partner... -n <value>... [--json] [--log-level
    debug|info|warn|error] [-d <value>...] [-r <value>] [-e <value>] [-w] [-o <value>...] [--no-rest-api]
    [--no-chain-browser]

FLAGS
  -C, --channel=<value>...        (required) Channel name.
  -d, --chaincodeDir=<value>...   [default: .] Root directory of chaincode source, relative to fabloRoot. By default '.'
                                  is used.
  -e, --envConfig=<value>         Path to .env file to be used for chaincodes.
  -n, --chaincodeName=<value>...  (required) Chaincode name.
  -o, --contracts=<value>...      Contract names in a JSON format.
  -r, --fabloRoot=<value>         [default: ./test-network] Root directory of target network. Should not be the same as
                                  chaincodeDir and should not be a child of chaincodeDir. By default './test-network' is
                                  used.
  -t, --channelType=<option>...   (required) Channel type. Can be "curator" or "partner". It means whether this is a
                                  chaincode managed by CuratorOrg or PartnerOrg.
                                  <options: curator|partner>
  -w, --watch                     Enable watch mode (live chaincode reload).
      --no-chain-browser          Do not start GalaChain Browser.
      --no-rest-api               Do not start GalaChain REST API services.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  Start the chaincode, browser-api, and ops-api (in non-watch mode).

ALIASES
  $ galachain network:up

EXAMPLES
  $ galachain network:up -C=product-channel -t=curator -n=basic-product -d=./ --envConfig=./.dev-env --watch

  $ galachain network:up -C=product-channel -t=curator -n=basic-product -d=./ --envConfig=./.dev-env
```

## `galachain network:prune`

Removes the network entirely.

```
USAGE
  $ galachain network:prune [--json] [--log-level debug|info|warn|error] [-r <value>]

FLAGS
  -r, --fabloRoot=<value>  [default: ./test-network] Root directory of target network. By default './test-network' is
                           used.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  Removes the network entirely.

ALIASES
  $ galachain network:prune

EXAMPLES
  $ galachain network:prune -r=./dir-target-netowrk
```

## `galachain network:up`

Start the chaincode, browser-api, and ops-api (in non-watch mode).

```
USAGE
  $ galachain network:up -C <value>... -t curator|partner... -n <value>... [--json] [--log-level
    debug|info|warn|error] [-d <value>...] [-r <value>] [-e <value>] [-w] [-o <value>...] [--no-rest-api]
    [--no-chain-browser]

FLAGS
  -C, --channel=<value>...        (required) Channel name.
  -d, --chaincodeDir=<value>...   [default: .] Root directory of chaincode source, relative to fabloRoot. By default '.'
                                  is used.
  -e, --envConfig=<value>         Path to .env file to be used for chaincodes.
  -n, --chaincodeName=<value>...  (required) Chaincode name.
  -o, --contracts=<value>...      Contract names in a JSON format.
  -r, --fabloRoot=<value>         [default: ./test-network] Root directory of target network. Should not be the same as
                                  chaincodeDir and should not be a child of chaincodeDir. By default './test-network' is
                                  used.
  -t, --channelType=<option>...   (required) Channel type. Can be "curator" or "partner". It means whether this is a
                                  chaincode managed by CuratorOrg or PartnerOrg.
                                  <options: curator|partner>
  -w, --watch                     Enable watch mode (live chaincode reload).
      --no-chain-browser          Do not start GalaChain Browser.
      --no-rest-api               Do not start GalaChain REST API services.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  Start the chaincode, browser-api, and ops-api (in non-watch mode).

ALIASES
  $ galachain network:up

EXAMPLES
  $ galachain network:up -C=product-channel -t=curator -n=basic-product -d=./ --envConfig=./.dev-env --watch

  $ galachain network:up -C=product-channel -t=curator -n=basic-product -d=./ --envConfig=./.dev-env
```

## `galachain register [DEVELOPERPRIVATEKEY]`

Registers chaincode on GalaChain TNT network.

```
USAGE
  $ galachain register [DEVELOPERPRIVATEKEY] [--json] [--log-level debug|info|warn|error] [--mnt] [--no-prompt]

ARGUMENTS
  DEVELOPERPRIVATEKEY  Developer's private key to sign the request. It could be a file or a string. If not provided as
                       an argument, the command will try to read the private key from the environment variable
                       DEV_PRIVATE_KEY, or from the default location (~/.gc-keys/<chaincode-name>/gc-dev-key), or will
                       ask for it in a prompt.

FLAGS
  --mnt        Get info from MNT network instead of TNT (not supported yet).
  --no-prompt  Do not prompt for confirmation.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  Specify level for logging.
                        <options: debug|info|warn|error>

DESCRIPTION
  Registers chaincode on GalaChain TNT network.

EXAMPLES
  $ galachain register

  $ galachain register ./dev-private-key

  $ galachain register c0fb1924408d936fb7cd0c86695885df4f66861621b5c8660df3924c4d09dd79
```
<!-- commandsstop -->
