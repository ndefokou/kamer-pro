#!/bin/bash
# Create the uploads directory if it doesn't exist
UPLOADS_DIR="./public/uploads"
if [ ! -d "$UPLOADS_DIR" ]; then
  echo "Creating uploads directory at $UPLOADS_DIR"
  mkdir -p "$UPLOADS_DIR"
fi