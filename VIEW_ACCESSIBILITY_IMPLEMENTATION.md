# CustomTour viewAccessibility Implementation

## Overview
Added a new `viewAccessibility` property to the CustomTour model to control tour visibility and access permissions.

## Changes Made

### 1. Model Updates (`src/models/CustomTour.js`)
- Added `viewAccessibility` property with enum values: `['public', 'private']`
- Default value: `'public'`
- Property controls who can access and view the tour

### 2. Controller Updates (`src/controllers/customTourController.js`)
- **getAllCustomTours**: Modified to filter tours based on user type and viewAccessibility
  - Tourists can only see public tours in general listings
  - Provider admins and system admins can see all their tours
- **getCustomTourById**: Added access control for private tours
  - Private tours require registration or join code access for tourists
- **searchTourByJoinCode**: Enhanced to handle both public and private tours
  - Returns `access_method` field indicating how the tour was accessed

### 3. Validation Updates (`src/middleware/validation.js`)
- Added `viewAccessibility` validation to customTour schema
- Accepts only `'public'` or `'private'` values

### 4. API Documentation Updates (`API_DOCUMENTATION.md`)
- Added documentation for the new `viewAccessibility` property
- Included examples showing how to create tours with different visibility settings
- Added section explaining tour visibility behavior

### 5. Test Coverage (`tests/view-accessibility.test.js`)
- Created comprehensive tests for the new functionality
- Tests model validation, access control, and API behavior

## Functionality

### Public Tours (`viewAccessibility: 'public'`)
- Visible in general tour listings for all users
- Accessible to all users without restrictions
- Default behavior for backward compatibility

### Private Tours (`viewAccessibility: 'private'`)
- Not visible in general tour listings for tourists
- Only accessible via join code search
- Tourists need the join code to discover and access the tour
- Once registered, tourists can access the tour directly

## Access Control Matrix

| User Type | Public Tours | Private Tours (no registration) | Private Tours (with registration) |
|-----------|--------------|--------------------------------|-----------------------------------|
| Tourist | ✅ Full Access | ❌ No Access (need join code) | ✅ Full Access |
| Provider Admin | ✅ Full Access | ✅ Full Access (own tours) | ✅ Full Access (own tours) |
| System Admin | ✅ Full Access | ✅ Full Access (all tours) | ✅ Full Access (all tours) |

## API Examples

### Creating a Private Tour
```json
POST /api/custom-tours
{
  "tour_template_id": "64a1b2c3d4e5f6789012346",
  "tour_name": "Exclusive VIP Tour",
  "start_date": "2024-06-01",
  "end_date": "2024-06-07",
  "viewAccessibility": "private"
}
```

### Searching for Private Tour by Join Code
```http
GET /api/custom-tours/search/ABC123
```

Response includes `access_method` field:
```json
{
  "tour": { ... },
  "access_method": "join_code"
}
```

## Migration Notes
- Existing tours will default to `viewAccessibility: 'public'`
- No breaking changes to existing API endpoints
- Backward compatible with existing client implementations

## Security Considerations
- Private tours are not exposed in general listings
- Join codes act as access tokens for private tours
- Provider admins maintain full control over their tours regardless of visibility
- System admins have unrestricted access for administrative purposes