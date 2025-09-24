#!/bin/bash
echo "🔍 Validating TrustStram v4.4 Production Enhanced Package..."

# Check required directories
REQUIRED_DIRS=("src" "admin-interfaces" "deployment" "docs" "tests" "security-testing" "database" "config" "scripts" "supabase" "k8s" "nginx")

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir - Present"
    else
        echo "❌ $dir - Missing"
        exit 1
    fi
done

# Validate checksums
if [ -f "CHECKSUMS.sha256" ]; then
    echo "🔍 Validating file checksums..."
    sha256sum -c CHECKSUMS.sha256 --quiet && echo "✅ All checksums valid" || echo "❌ Checksum validation failed"
else
    echo "❌ CHECKSUMS.sha256 file missing"
    exit 1
fi

echo "🎉 Package validation completed successfully!"
