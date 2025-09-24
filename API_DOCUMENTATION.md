# Tourlicity Backend API Documentation

## Overview

This is the REST API for the Tourlicity tour management platform. The API provides endpoints for managing users, providers, tour templates, custom tours, registrations, calendar entries, and more.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Roles

- `system_admin`: Full system access
- `provider_admin`: Manage their provider's tours and registrations
- `tourist`: Register for tours and manage personal profile

## API Endpoints

### Authentication

| Method | Endpoint        | Description                 | Access  |
| ------ | --------------- | --------------------------- | ------- |
| POST   | `/auth/google`  | Google OAuth login/register | Public  |
| GET    | `/auth/profile` | Get current user profile    | Private |
| PUT    | `/auth/profile` | Update user profile         | Private |
| PUT    | `/auth/reset-google-picture` | Reset to Google profile picture | Private |
| POST   | `/auth/logout`  | Logout user                 | Private |

### Users

| Method | Endpoint           | Description             | Access       |
| ------ | ------------------ | ----------------------- | ------------ |
| GET    | `/users`           | Get all users           | System Admin |
| GET    | `/users/dashboard` | Get user dashboard data | Private      |
| GET    | `/users/:id`       | Get user by ID          | System Admin |
| PUT    | `/users/:id`       | Update user             | System Admin |
| DELETE | `/users/:id`       | Delete user             | System Admin |

### Providers

| Method | Endpoint                | Description             | Access                             |
| ------ | ----------------------- | ----------------------- | ---------------------------------- |
| GET    | `/providers`            | Get all providers       | System Admin, Provider Admin       |
| GET    | `/providers/:id`        | Get provider by ID      | System Admin, Provider Admin (own) |
| POST   | `/providers`            | Create new provider     | System Admin                       |
| PUT    | `/providers/:id`        | Update provider         | System Admin, Provider Admin (own) |
| PATCH  | `/providers/:id/status` | Toggle provider status  | System Admin                       |
| GET    | `/providers/:id/admins` | Get provider admins     | System Admin, Provider Admin (own) |
| GET    | `/providers/:id/stats`  | Get provider statistics | System Admin, Provider Admin (own) |

### Tour Templates

| Method | Endpoint                     | Description            | Access                       |
| ------ | ---------------------------- | ---------------------- | ---------------------------- |
| GET    | `/tour-templates`            | Get all tour templates | System Admin, Provider Admin |
| GET    | `/tour-templates/active`     | Get active templates   | System Admin, Provider Admin |
| GET    | `/tour-templates/:id`        | Get template by ID     | System Admin, Provider Admin |
| POST   | `/tour-templates`            | Create new template    | System Admin                 |
| PUT    | `/tour-templates/:id`        | Update template        | System Admin                 |
| PATCH  | `/tour-templates/:id/status` | Toggle template status | System Admin                 |
| DELETE | `/tour-templates/:id`        | Delete template        | System Admin                 |

### Custom Tours

| Method | Endpoint                          | Description              | Access                                                   |
| ------ | --------------------------------- | ------------------------ | -------------------------------------------------------- |
| GET    | `/custom-tours`                   | Get all custom tours     | System Admin, Provider Admin (own)                       |
| GET    | `/custom-tours/search/:join_code` | Search tour by join code | Tourist                                                  |
| GET    | `/custom-tours/:id`               | Get custom tour by ID    | System Admin, Provider Admin (own), Tourist (registered) |
| POST   | `/custom-tours`                   | Create new custom tour   | System Admin, Provider Admin                             |
| PUT    | `/custom-tours/:id`               | Update custom tour       | System Admin, Provider Admin (own)                       |
| PATCH  | `/custom-tours/:id/status`        | Update tour status       | System Admin, Provider Admin (own)                       |
| DELETE | `/custom-tours/:id`               | Delete custom tour       | System Admin, Provider Admin (own)                       |

### Calendar Entries

| Method | Endpoint                       | Description              | Access                       |
| ------ | ------------------------------ | ------------------------ | ---------------------------- |
| GET    | `/calendar`                    | Get calendar entries     | Private                      |
| GET    | `/calendar/default-activities` | Get default activities   | System Admin, Provider Admin |
| GET    | `/calendar/:id`                | Get calendar entry by ID | Private                      |
| POST   | `/calendar`                    | Create calendar entry    | System Admin, Provider Admin |
| PUT    | `/calendar/:id`                | Update calendar entry    | System Admin, Provider Admin |
| DELETE | `/calendar/:id`                | Delete calendar entry    | System Admin, Provider Admin |
| POST   | `/calendar/:id/featured-image` | Upload featured image     | System Admin, Provider Admin |
| DELETE | `/calendar/:id/featured-image` | Delete featured image     | System Admin, Provider Admin |
| POST   | `/calendar/presigned-url`      | Get presigned URL         | System Admin, Provider Admin |
| PUT    | `/calendar/:id/presigned-image`| Update with presigned image | System Admin, Provider Admin |

### Registrations

| Method | Endpoint                    | Description                 | Access                             |
| ------ | --------------------------- | --------------------------- | ---------------------------------- |
| GET    | `/registrations`            | Get all registrations       | System Admin, Provider Admin (own) |
| GET    | `/registrations/my`         | Get user's registrations    | Tourist                            |
| GET    | `/registrations/stats`      | Get registration statistics | System Admin, Provider Admin       |
| POST   | `/registrations`            | Register for a tour         | Tourist                            |
| PUT    | `/registrations/:id/status` | Update registration status  | System Admin, Provider Admin       |
| DELETE | `/registrations/:id`        | Unregister from tour        | Tourist (own), System Admin        |

### Role Change Requests

| Method | Endpoint                            | Description                     | Access       |
| ------ | ----------------------------------- | ------------------------------- | ------------ |
| POST   | `/role-change-requests`             | Submit role change request      | Tourist      |
| GET    | `/role-change-requests`             | Get all role change requests    | System Admin |
| GET    | `/role-change-requests/my`          | Get user's role change requests | Tourist      |
| GET    | `/role-change-requests/:id`         | Get role change request by ID   | System Admin |
| PUT    | `/role-change-requests/:id/process` | Process role change request     | System Admin |
| DELETE | `/role-change-requests/:id/cancel`  | Cancel role change request      | Tourist      |

### QR Codes

| Method | Endpoint                              | Description                      | Access                       |
| ------ | ------------------------------------- | -------------------------------- | ---------------------------- |
| POST   | `/qr-codes/tours/:id/generate`        | Generate QR code for custom tour | System Admin, Provider Admin |
| POST   | `/qr-codes/templates/:id/generate`    | Generate QR code for template    | System Admin                 |
| PUT    | `/qr-codes/tours/:id/regenerate`      | Regenerate QR code for tour      | System Admin, Provider Admin |
| POST   | `/qr-codes/tours/:id/share`           | Share QR code via email          | System Admin, Provider Admin |
| GET    | `/qr-codes/tours/:id`                 | Get QR code information          | System Admin, Provider Admin |
| DELETE | `/qr-codes/tours/:id`                 | Delete QR code                   | System Admin, Provider Admin |

### Notifications

| Method | Endpoint                              | Description                      | Access                       |
| ------ | ------------------------------------- | -------------------------------- | ---------------------------- |
| GET    | `/notifications/vapid-key`            | Get VAPID public key             | Public                       |
| POST   | `/notifications/subscribe`            | Subscribe to push notifications  | Private                      |
| POST   | `/notifications/unsubscribe`          | Unsubscribe from push            | Private                      |
| GET    | `/notifications/subscriptions`        | Get user's subscriptions         | Private                      |
| POST   | `/notifications/test`                 | Send test notification           | Private                      |
| POST   | `/notifications/send`                 | Send notification to user        | System Admin, Provider Admin |
| POST   | `/notifications/send-bulk`            | Send bulk notifications          | System Admin                 |
| GET    | `/notifications/queue-stats`          | Get queue statistics             | System Admin                 |
| POST   | `/notifications/cleanup`              | Clean up notification queues     | System Admin                 |
| GET    | `/notifications/all-subscriptions`    | Get all subscriptions            | System Admin                 |

## Request/Response Examples

### Authentication

#### Google OAuth Login

```http
POST /api/auth/google
Content-Type: application/json

{
  "google_id": "123456789",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "picture": "https://lh3.googleusercontent.com/a/default-user=s96-c"
}
```

Response:

```json
{
	"message": "Authentication successful",
	"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
	"user": {
		"_id": "64a1b2c3d4e5f6789012345",
		"email": "user@example.com",
		"first_name": "John",
		"last_name": "Doe",
		"profile_picture": "https://lh3.googleusercontent.com/a/default-user=s96-c",
		"user_type": "tourist",
		"is_active": true
	},
	"redirect": "/my-tours"
}
```

#### Update User Profile

```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890",
  "profile_picture": "https://example.com/profile.jpg",
  "date_of_birth": "1990-05-15",
  "country": "United States",
  "gender": "male",
  "passport_number": "A12345678"
}
```

Response:

```json
{
	"message": "Profile updated successfully",
	"user": {
		"_id": "64a1b2c3d4e5f6789012345",
		"email": "user@example.com",
		"first_name": "John",
		"last_name": "Doe",
		"phone_number": "+1234567890",
		"profile_picture": "https://example.com/profile.jpg",
		"date_of_birth": "1990-05-15T00:00:00.000Z",
		"country": "United States",
		"gender": "male",
		"passport_number": "A12345678",
		"user_type": "tourist",
		"is_active": true,
		"created_date": "2024-01-10T10:00:00.000Z",
		"updated_date": "2024-01-15T14:30:00.000Z"
	}
}
```

#### Reset Profile Picture to Google Picture

```http
PUT /api/auth/reset-google-picture
Authorization: Bearer <token>
Content-Type: application/json

{
  "google_picture_url": "https://lh3.googleusercontent.com/a/default-user=s96-c"
}
```

Response:

```json
{
	"message": "Profile picture reset to Google picture successfully",
	"user": {
		"_id": "64a1b2c3d4e5f6789012345",
		"email": "user@example.com",
		"first_name": "John",
		"last_name": "Doe",
		"profile_picture": "https://lh3.googleusercontent.com/a/default-user=s96-c",
		"user_type": "tourist",
		"is_active": true
	}
}
```

#### Profile Picture Behavior

**Google OAuth Profile Pictures:**
- When users authenticate with Google OAuth, their Google profile picture is automatically set if they don't have one
- If users already have a Google profile picture, it gets updated with the latest from Google
- Custom profile pictures (non-Google URLs) are **never** overwritten by Google OAuth
- Users can manually update their profile picture to any custom URL via the profile update endpoint
- Users can reset their profile picture back to their Google picture using the reset endpoint

### Create Custom Tour

```http
POST /api/custom-tours
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider_id": "64a1b2c3d4e5f6789012345",
  "tour_template_id": "64a1b2c3d4e5f6789012346",
  "tour_name": "Amazing Paris Adventure",
  "start_date": "2024-06-01",
  "end_date": "2024-06-07",
  "max_tourists": 8,
  "group_chat_link": "https://chat.example.com/room123",
  "features_image": "https://example.com/paris-main.jpg",
  "teaser_images": [
    "https://example.com/paris-teaser1.jpg",
    "https://example.com/paris-teaser2.jpg",
    "https://example.com/paris-teaser3.jpg"
  ]
}
```

Response:

```json
{
	"message": "Custom tour created successfully",
	"tour": {
		"_id": "64a1b2c3d4e5f6789012347",
		"provider_id": {
			"_id": "64a1b2c3d4e5f6789012345",
			"provider_name": "Amazing Tours Co."
		},
		"tour_template_id": {
			"_id": "64a1b2c3d4e5f6789012346",
			"template_name": "Paris City Tour"
		},
		"tour_name": "Amazing Paris Adventure",
		"start_date": "2024-06-01T00:00:00.000Z",
		"end_date": "2024-06-07T00:00:00.000Z",
		"status": "draft",
		"join_code": "ABC123",
		"max_tourists": 8,
		"remaining_tourists": 8,
		"group_chat_link": "https://chat.example.com/room123",
		"features_image": "https://example.com/paris-main.jpg",
		"teaser_images": [
			"https://example.com/paris-teaser1.jpg",
			"https://example.com/paris-teaser2.jpg",
			"https://example.com/paris-teaser3.jpg"
		],
		"created_date": "2024-01-15T10:30:00.000Z"
	}
}
```

### Create Tour Template

```http
POST /api/tour-templates
Authorization: Bearer <token>
Content-Type: application/json

{
  "template_name": "Paris City Tour",
  "start_date": "2024-06-01",
  "end_date": "2024-06-07",
  "description": "Explore the beautiful city of Paris with guided tours to iconic landmarks.",
  "features_image": "https://example.com/paris-template-main.jpg",
  "teaser_images": [
    "https://example.com/eiffel-tower.jpg",
    "https://example.com/louvre.jpg",
    "https://example.com/notre-dame.jpg"
  ],
  "web_links": [
    {
      "url": "https://paristourism.com",
      "description": "Official Paris Tourism"
    }
  ]
}
```

Response:

```json
{
	"message": "Tour template created successfully",
	"template": {
		"_id": "64a1b2c3d4e5f6789012346",
		"template_name": "Paris City Tour",
		"start_date": "2024-06-01T00:00:00.000Z",
		"end_date": "2024-06-07T00:00:00.000Z",
		"description": "Explore the beautiful city of Paris with guided tours to iconic landmarks.",
		"duration_days": 7,
		"features_image": "https://example.com/paris-template-main.jpg",
		"teaser_images": [
			"https://example.com/eiffel-tower.jpg",
			"https://example.com/louvre.jpg",
			"https://example.com/notre-dame.jpg"
		],
		"web_links": [
			{
				"url": "https://paristourism.com",
				"description": "Official Paris Tourism"
			}
		],
		"is_active": true,
		"created_date": "2024-01-15T09:00:00.000Z"
	}
}
```

### Register for Tour

```http
POST /api/registrations
Authorization: Bearer <token>
Content-Type: application/json

{
  "custom_tour_id": "64a1b2c3d4e5f6789012347",
  "notes": "Looking forward to this tour!"
}
```

Response:

```json
{
	"message": "Registration submitted successfully",
	"registration": {
		"_id": "64a1b2c3d4e5f6789012348",
		"custom_tour_id": {
			"_id": "64a1b2c3d4e5f6789012347",
			"tour_name": "Amazing Paris Adventure",
			"start_date": "2024-06-01T00:00:00.000Z",
			"end_date": "2024-06-07T00:00:00.000Z"
		},
		"tourist_id": "64a1b2c3d4e5f6789012349",
		"provider_id": {
			"_id": "64a1b2c3d4e5f6789012345",
			"provider_name": "Amazing Tours Co."
		},
		"status": "pending",
		"notes": "Looking forward to this tour!",
		"created_date": "2024-01-15T11:00:00.000Z"
	}
}
```

### Apply to Become New Provider

```http
POST /api/role-change-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "request_type": "become_new_provider",
  "proposed_provider_data": {
    "provider_name": "Amazing Adventures Ltd",
    "country": "United States",
    "address": "123 Tourism Street, Adventure City, AC 12345",
    "phone_number": "+1-555-0123",
    "email_address": "contact@amazingadventures.com",
    "corporate_tax_id": "TAX123456789",
    "company_description": "We specialize in adventure tourism and cultural experiences.",
    "logo_url": "https://example.com/logo.png"
  },
  "request_message": "I have 5 years of experience in tourism and would like to start my own tour company."
}
```

Response:

```json
{
	"message": "Role change request submitted successfully",
	"request": {
		"_id": "64a1b2c3d4e5f6789012350",
		"request_type": "become_new_provider",
		"status": "pending",
		"created_date": "2024-01-15T12:00:00.000Z"
	}
}
```

### Apply to Join Existing Provider

```http
POST /api/role-change-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "request_type": "join_existing_provider",
  "provider_id": "64a1b2c3d4e5f6789012345",
  "request_message": "I would like to join your team as a provider administrator. I have experience in customer service and tour management."
}
```

Response:

```json
{
	"message": "Role change request submitted successfully",
	"request": {
		"_id": "64a1b2c3d4e5f6789012351",
		"request_type": "join_existing_provider",
		"status": "pending",
		"created_date": "2024-01-15T12:30:00.000Z"
	}
}
```

### Process Role Change Request (System Admin)

```http
PUT /api/role-change-requests/64a1b2c3d4e5f6789012350/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "admin_notes": "Application looks good. Welcome to the platform!"
}
```

Response:

```json
{
	"message": "Role change request approved successfully",
	"request": {
		"_id": "64a1b2c3d4e5f6789012350",
		"tourist_id": {
			"_id": "64a1b2c3d4e5f6789012349",
			"first_name": "John",
			"last_name": "Doe",
			"email": "john@example.com"
		},
		"request_type": "become_new_provider",
		"status": "approved",
		"admin_notes": "Application looks good. Welcome to the platform!",
		"processed_date": "2024-01-15T14:00:00.000Z",
		"created_date": "2024-01-15T12:00:00.000Z"
	}
}
```

### Generate QR Code for Tour

```http
POST /api/qr-codes/tours/64a1b2c3d4e5f6789012347/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "generateJoinCode": true,
  "notify": true
}
```

Response:

```json
{
	"message": "QR code generated successfully",
	"qr_code_url": "https://s3.amazonaws.com/bucket/qr-codes/custom/64a1b2c3d4e5f6789012347-uuid.png",
	"join_qr_code_url": "https://s3.amazonaws.com/bucket/qr-codes/custom/join-ABC123-uuid.png",
	"generated_at": "2024-01-15T15:30:00.000Z"
}
```

### Share QR Code via Email

```http
POST /api/qr-codes/tours/64a1b2c3d4e5f6789012347/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipients": [
    "friend1@example.com",
    "friend2@example.com",
    "family@example.com"
  ],
  "message": "Check out this amazing tour I'm organizing!",
  "bulk": false
}
```

Response:

```json
{
	"message": "QR code shared successfully to 3 recipient(s)",
	"recipients_count": 3
}
```

### Get QR Code Information

```http
GET /api/qr-codes/tours/64a1b2c3d4e5f6789012347?type=custom
Authorization: Bearer <token>
```

Response:

```json
{
	"has_qr_code": true,
	"qr_code_url": "https://s3.amazonaws.com/bucket/qr-codes/custom/64a1b2c3d4e5f6789012347-uuid.png",
	"has_join_qr_code": true,
	"join_qr_code_url": "https://s3.amazonaws.com/bucket/qr-codes/custom/join-ABC123-uuid.png",
	"generated_at": "2024-01-15T15:30:00.000Z",
	"tour_name": "Amazing Paris Adventure",
	"tour_id": "64a1b2c3d4e5f6789012347",
	"join_code": "ABC123"
}
```

### Upload Featured Image for Calendar Entry

```http
POST /api/calendar/64a1b2c3d4e5f6789012348/featured-image
Authorization: Bearer <token>
Content-Type: multipart/form-data

[Binary image data in form field 'featured_image']
```

Response:

```json
{
	"message": "Featured image uploaded successfully",
	"featured_image": "https://s3.amazonaws.com/bucket/calendar-images/1642248000000-uuid-activity.jpg",
	"uploaded_at": "2024-01-15T16:00:00.000Z"
}
```

### Get Presigned URL for Direct Upload

```http
POST /api/calendar/presigned-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileName": "activity-photo.jpg",
  "contentType": "image/jpeg"
}
```

Response:

```json
{
	"message": "Presigned URL generated successfully",
	"presignedUrl": "https://s3.amazonaws.com/bucket/calendar-images/key?AWSAccessKeyId=...",
	"publicUrl": "https://s3.amazonaws.com/bucket/calendar-images/1642248000000-uuid-activity-photo.jpg",
	"key": "calendar-images/1642248000000-uuid-activity-photo.jpg",
	"expiresIn": 3600
}
```

### Update Calendar Entry with Presigned Image

```http
PUT /api/calendar/64a1b2c3d4e5f6789012348/presigned-image
Authorization: Bearer <token>
Content-Type: application/json

{
  "imageUrl": "https://s3.amazonaws.com/bucket/calendar-images/1642248000000-uuid-activity-photo.jpg"
}
```

Response:

```json
{
	"message": "Featured image updated successfully",
	"featured_image": "https://s3.amazonaws.com/bucket/calendar-images/1642248000000-uuid-activity-photo.jpg",
	"uploaded_at": "2024-01-15T16:00:00.000Z"
}
```

### Subscribe to Push Notifications

```http
POST /api/notifications/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
    "auth": "tBHItJI5svbpez7KI4CCXg"
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "deviceType": "desktop",
  "browser": "Chrome"
}
```

Response:

```json
{
	"message": "Push subscription created successfully",
	"subscription_id": "64a1b2c3d4e5f6789012350"
}
```

### Send Notification to Specific User

```http
POST /api/notifications/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "64a1b2c3d4e5f6789012349",
  "title": "Tour Update",
  "body": "Your tour schedule has been updated. Please check the latest itinerary.",
  "type": "tour_update",
  "includeEmail": true
}
```

Response:

```json
{
	"message": "Notification queued successfully",
	"recipient": {
		"id": "64a1b2c3d4e5f6789012349",
		"name": "John Doe",
		"email": "john@example.com"
	},
	"jobs": [
		{
			"type": "push",
			"job_id": "1"
		},
		{
			"type": "email",
			"job_id": "2"
		}
	]
}
```

### Send Bulk Notifications

```http
POST /api/notifications/send-bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "userType": "tourist",
  "title": "System Maintenance",
  "body": "The system will be under maintenance from 2 AM to 4 AM UTC. Please plan accordingly.",
  "type": "system_announcement",
  "includeEmail": true
}
```

Response:

```json
{
	"message": "Bulk notifications queued successfully",
	"recipient_count": 150,
	"jobs": [
		{
			"type": "push",
			"count": 150
		},
		{
			"type": "email",
			"job_id": "3"
		}
	]
}
```

### Get Queue Statistics

```http
GET /api/notifications/queue-stats
Authorization: Bearer <token>
```

Response:

```json
{
	"message": "Queue statistics retrieved successfully",
	"stats": {
		"email": {
			"waiting": 5,
			"active": 2,
			"completed": 1250,
			"failed": 3
		},
		"push": {
			"waiting": 12,
			"active": 8,
			"completed": 2100,
			"failed": 15
		}
	},
	"timestamp": "2024-01-15T18:30:00.000Z"
}
```

## Error Responses

### 400 Bad Request

```json
{
	"error": "Validation error",
	"details": ["first_name is required", "email must be a valid email"]
}
```

### 401 Unauthorized

```json
{
	"error": "Access denied. No token provided."
}
```

### 403 Forbidden

```json
{
	"error": "Access denied. Insufficient permissions."
}
```

### 404 Not Found

```json
{
	"error": "Resource not found"
}
```

### 500 Internal Server Error

```json
{
	"error": "Internal server error"
}
```

## Pagination

List endpoints support pagination with the following query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

Response format:

```json
{
  "data": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 50,
    "items_per_page": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

## Search and Filtering

Many endpoints support search and filtering:

- `search`: Text search in relevant fields
- `status`: Filter by status
- `is_active`: Filter by active status
- `provider_id`: Filter by provider (System Admin only)

Example:

```
GET /api/custom-tours?search=paris&status=published&page=1&limit=20
```

## Environment Variables

Required environment variables:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tourlicity
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=tourlicity-documents
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Rate Limiting

API requests are rate-limited to 100 requests per 15-minute window per IP address.

## File Uploads

File uploads are handled via AWS S3. Supported file types include documents, images, and other common formats up to 10MB per file.

## Email Notifications

The system automatically sends email notifications for:

- New tour registrations
- Registration status changes
- Document uploads
- Role change requests

## Redis Caching

Redis is used for caching frequently accessed data and session management to improve performance.

## Health Check

The API provides comprehensive health monitoring endpoints for system status and performance monitoring.

### Basic Health Check

```http
GET /health
```

Response (Healthy):

```json
{
	"status": "OK",
	"timestamp": "2024-01-15T12:00:00.000Z",
	"uptime": 3600.5,
	"services": {
		"database": "connected",
		"redis": "connected"
	},
	"memory": {
		"used": "45 MB",
		"total": "128 MB"
	},
	"environment": "development"
}
```

Response (Degraded - HTTP 503):

```json
{
	"status": "DEGRADED",
	"timestamp": "2024-01-15T12:00:00.000Z",
	"uptime": 3600.5,
	"services": {
		"database": "connected",
		"redis": "disconnected"
	},
	"memory": {
		"used": "45 MB",
		"total": "128 MB"
	},
	"environment": "development"
}
```

### Detailed Health Check

```http
GET /health/detailed
```

Response:

```json
{
	"status": "OK",
	"timestamp": "2024-01-15T12:00:00.000Z",
	"uptime": 3600.5,
	"version": "1.0.0",
	"services": {
		"database": {
			"status": "connected",
			"responseTime": "15ms",
			"readyState": 1
		},
		"redis": {
			"status": "connected",
			"responseTime": "8ms"
		}
	},
	"performance": {
		"totalResponseTime": "25ms",
		"memory": {
			"rss": "89 MB",
			"heapTotal": "128 MB",
			"heapUsed": "45 MB",
			"external": "12 MB"
		},
		"cpuUsage": {
			"user": 125000,
			"system": 50000
		}
	},
	"system": {
		"platform": "win32",
		"nodeVersion": "v22.17.0",
		"pid": 12345
	}
}
```

### Health Check Status Codes

- **200 OK**: All services are healthy
- **503 Service Unavailable**: One or more services are degraded or unavailable

### Health Check Usage

These endpoints are designed for:

- **Load Balancers**: Use `/health` for simple up/down checks
- **Monitoring Tools**: Use `/health/detailed` for comprehensive metrics
- **Container Orchestration**: Both endpoints work with Docker, Kubernetes health checks
- **CI/CD Pipelines**: Verify deployment health before traffic routing
