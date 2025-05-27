#!/bin/bash
set -e

echo "Generating certificates..."
mkdir -p .certificates
mkcert -install
mkcert -cert-file .certificates/localhost.pem -key-file .certificates/localhost-key.pem localhost
chmod 644 .certificates/*.pem
echo "Certificates generated successfully!" 