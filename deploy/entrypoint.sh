#!/bin/sh
# Cloud Run disks are wiped when an instance stops. Litestream restores the
# database from the replica on start and streams every change back to it.
set -e

mkdir -p "$(dirname "$YTIQ_DB_PATH")"
CMD="ytiq --host 0.0.0.0 --port $PORT --no-browser"

if [ -z "$LITESTREAM_REPLICA_URL" ]; then
  echo "LITESTREAM_REPLICA_URL not set: data will not survive a restart"
  exec $CMD
fi

litestream restore -if-db-not-exists -if-replica-exists "$YTIQ_DB_PATH"
exec litestream replicate -exec "$CMD"
