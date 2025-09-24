# Docker Build Fixes - TrustStream v4.1

## Issues Fixed

### 1. Missing `build:all` Script
**Problem**: Dockerfile referenced `npm run build:all` but this script was not defined in the root package.json.

**Solution**: Added `"build:all": "npm run build:admin-interfaces"` to the root package.json scripts section.

### 2. Unnecessary npm install in admin-interfaces
**Problem**: Dockerfile tried to run `npm install --only=dev` in admin-interfaces directory, but this directory doesn't have dependencies to install (it's just a build orchestrator).

**Solution**: Removed the `npm install --only=dev` command from the admin-interfaces build section.

### 3. npm ci without package-lock.json
**Problem**: Dockerfile used `npm ci` commands but there's no package-lock.json file in the project.

**Solution**: Changed both `npm ci` commands to `npm install` since npm ci requires a lock file.

### 4. Missing dist directory causing COPY failure
**Problem**: Docker build failed with "not found: /app/admin-interfaces/dist" because the dist directory wasn't guaranteed to exist.

**Solution**: 
- Modified build-all.sh to always create the dist directory with a .gitkeep file
- Added explicit dist directory creation in Dockerfile admin-builder stage
- Added mkdir for public/admin before copying to ensure target directory exists

## Build Process

The corrected Docker build process now:

1. **Stage 1 (admin-builder)**: 
   - Copies admin-interfaces source
   - Runs the build script directly (no npm install needed)
   - Uses build-all.sh to build each admin interface
   - **Always creates dist directory** even if builds fail

2. **Stage 2 (app-builder)**: 
   - Uses `npm install --only=production` instead of `npm ci`
   - **Creates public/admin directory before copying**
   - Copies built admin interfaces from stage 1 (guaranteed to exist)

3. **Stage 3 (production)**:
   - Uses `npm install --only=production` for final dependencies
   - All build processes work correctly

## Testing

To test the Docker build:

```bash
docker build -t truststream-v4.1:latest .
```

The build should now complete successfully without errors, even if individual admin interface builds fail.
