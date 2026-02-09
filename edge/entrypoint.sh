#!/usr/bin/env bash
set -e

DATA_DIR="/var/data"
CHAIN_NAME="VELOX Chain"
CHAIN_ID="185912"
BLOCK_GAS_LIMIT="20000000"

PREMINE_ADDR="0x48E460F010e86BF3112282790BA7F4d7B4F79aAC"
TOTAL_SUPPLY="10000000000000000000000000000" # 10B

mkdir -p $DATA_DIR

if [ ! -f "$DATA_DIR/genesis.json" ]; then
  polygon-edge secrets init --data-dir "$DATA_DIR/secrets"
  polygon-edge genesis \
    --consensus ibft \
    --chain-id $CHAIN_ID \
    --name "$CHAIN_NAME" \
    --block-gas-limit $BLOCK_GAS_LIMIT \
    --premine "$PREMINE_ADDR:$TOTAL_SUPPLY" \
    --ibft-validators $(polygon-edge secrets output --data-dir "$DATA_DIR/secrets" | awk '/Address/ {print $2}') \
    --dir "$DATA_DIR"
fi

polygon-edge server \
  --data-dir "$DATA_DIR/node" \
  --chain "$DATA_DIR/genesis.json" \
  --jsonrpc "0.0.0.0:8545" \
  --seal
