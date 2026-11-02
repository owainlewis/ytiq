#!/usr/bin/env bash
# Deploy ytiq to Cloud Run behind Google sign-in (IAP).
# Safe to run again: each step skips what already exists.
#
#   GCP_PROJECT=my-project YTIQ_USER=me@gmail.com deploy/deploy.sh
set -euo pipefail

PROJECT=${GCP_PROJECT:?set GCP_PROJECT}
USER_EMAIL=${YTIQ_USER:?set YTIQ_USER to the Google account allowed to sign in}
REGION=${GCP_REGION:-us-central1}
SERVICE=ytiq
BUCKET=${YTIQ_BUCKET:-$PROJECT-ytiq}
SA=ytiq-run@$PROJECT.iam.gserviceaccount.com
BUILD_SA=ytiq-build@$PROJECT.iam.gserviceaccount.com

gc() { gcloud --project "$PROJECT" "$@"; }

echo "==> Enabling APIs"
gc services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  iap.googleapis.com storage.googleapis.com

echo "==> Bucket gs://$BUCKET (holds the database)"
gc storage buckets describe "gs://$BUCKET" >/dev/null 2>&1 ||
  gc storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access

echo "==> Service account $SA"
gc iam service-accounts describe "$SA" >/dev/null 2>&1 ||
  gc iam service-accounts create ytiq-run --display-name="ytiq on Cloud Run"
gc storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA" --role=roles/storage.objectAdmin >/dev/null

# Builds run as their own account, so the shared default compute account needs no extra rights.
echo "==> Build service account $BUILD_SA"
gc iam service-accounts describe "$BUILD_SA" >/dev/null 2>&1 ||
  gc iam service-accounts create ytiq-build --display-name="ytiq builds"
gc projects add-iam-policy-binding "$PROJECT" --condition=None \
  --member="serviceAccount:$BUILD_SA" --role=roles/run.builder >/dev/null
# The project role alone was not enough to read the uploaded source, so grant it on the bucket too.
SOURCES=gs://run-sources-$PROJECT-$REGION
gc storage buckets describe "$SOURCES" >/dev/null 2>&1 ||
  gc storage buckets create "$SOURCES" --location="$REGION" --uniform-bucket-level-access
gc storage buckets add-iam-policy-binding "$SOURCES" \
  --member="serviceAccount:$BUILD_SA" --role=roles/storage.objectViewer >/dev/null

# One instance only: two would each hold their own copy of the database.
# CPU stays on between requests so the startup refresh and Litestream keep running.
echo "==> Building and deploying"
gc beta run deploy "$SERVICE" --source . --region="$REGION" --quiet \
  --service-account="$SA" --build-service-account="projects/$PROJECT/serviceAccounts/$BUILD_SA" \
  --no-allow-unauthenticated --iap \
  --max-instances=1 --no-cpu-throttling --memory=512Mi \
  --set-env-vars="LITESTREAM_REPLICA_URL=gcs://$BUCKET/ytiq.db"

echo "==> Letting IAP call the service, and $USER_EMAIL through IAP"
PROJECT_NUMBER=$(gc projects describe "$PROJECT" --format='value(projectNumber)')
gc beta services identity create --service=iap.googleapis.com >/dev/null
gc run services add-iam-policy-binding "$SERVICE" --region="$REGION" \
  --member="serviceAccount:service-$PROJECT_NUMBER@gcp-sa-iap.iam.gserviceaccount.com" \
  --role=roles/run.invoker >/dev/null
gc beta iap web add-iam-policy-binding --resource-type=cloud-run --service="$SERVICE" --region="$REGION" \
  --member="user:$USER_EMAIL" --role=roles/iap.httpsResourceAccessor >/dev/null

echo
echo "ytiq is live at $(gc run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')"
