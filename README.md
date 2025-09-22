# Tourlicity Backend API

A comprehensive REST API for the Tourlicity tour management platform built with Node.js, Express, MongoDB, Redis, and AWS S3.

## Features

- **User Management**: Multi-role authentication (System Admin, Provider Admin, Tourist)
- **Provider Management**: Tour company registration and management
- **Tour Templates**: Reusable tour structures
- **Custom Tours**: Instance-based tours with unique join codes
- **Registration System**: Tourist registration and approval workflow
- **Calendar Management**: Detailed itinerary planning
- **Document Management**: File uploads via AWS S3
- **Email Notifications**: Automated email system
- **Real-time Updates**: Tour update notifications
- **Role-based Access Control**: Secure endpoint protection
- **Data Validation**: Comprehensive input validation
- **Error Handling**: Robust error management
- **Rate Limiting**: API protection
- **Caching**: Redis-based performance optimization

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **File Storage**: AWS S3
- **Authentication**: JWT
- **Email**: Nodemailer
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
src/
├── config/
│   ├── database.js          # MongoDB and Redis connections
│   └── aws.js               # AWS S3 configuration
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── userController.js    # User management
│   ├── providerController.js # Provider management
│   ├── tourTemplateController.js # Tour templates
│   ├── customTourController.js # Custom tours
│   ├── calendarController.js # Calendar entries
│   └── registrationController.js # Registration management
├── middleware/
│   ├── auth.js              # Authentication & authorization
│   └── validation.js        # Input validation schemas
├── models/
│   ├── User.js              # User model
│   ├── Provider.js          # Provider model
│   ├── TourTemplate.js      # Tour template model
│   ├── CustomTour.js        # Custom tour model
│   ├── CalendarEntry.js     # Calendar entry model
│   ├── Registration.js      # Registration model
│   ├── DefaultActivity.js   # Default activity model
│   ├── DocumentType.js      # Document type model
│   ├── TouristDocument.js   # Tourist document model
│   ├── TourDocument.js      # Tour document model
│   ├── Broadcast.js         # Broadcast message model
│   ├── PaymentConfig.js     # Payment configuration model
│   ├── TourUpdate.js        # Tour update model
│   ├── UserTourUpdateView.js # User tour update view model
│   ├── DocumentActivity.js  # Document activity model
│   └── RoleChangeRequest.js # Role change request model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User routes
│   ├── providers.js         # Provider routes
│   ├── tourTemplates.js     # Tour template routes
│   ├── customTours.js       # Custom tour routes
│   ├── calendar.js          # Calendar routes
│   └── registrations.js     # Registration routes
├── utils/
│   ├── email.js             # Email utilities
│   └── helpers.js           # Helper functions
└── server.js                # Main server file
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tourlicity-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/tourlicity
   REDIS_URL=redis://localhost:6379
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   
   # AWS S3
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=tourlicity-documents
   
   # Email (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=noreply@tourlicity.com
   ```

4. **Start required services**
   
   **MongoDB** (using Docker):
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```
   
   **Redis** (using Docker):
   ```bash
   docker run -d -p 6379:6379 --name redis redis:latest
   ```

5. **Run the application**
   
   **Development mode**:
   ```bash
   npm run dev
   ```
   
   **Production mode**:
   ```bash
   npm start
   ```

## API Documentation

Comprehensive API documentation is available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

### Quick Start Examples

**Authentication**:
```bash
curl -X POST http://localhost:5000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "google_id": "123456789",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Create a Provider** (System Admin):
```bash
curl -X POST http://localhost:5000/api/providers \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider_name": "Amazing Tours",
    "country": "France",
    "address": "123 Tour Street, Paris",
    "phone_number": "+33123456789",
    "email_address": "info@amazingtours.com"
  }'
```

**Search for a Tour** (Tourist):
```bash
curl -X GET http://localhost:5000/api/custom-tours/search/ABC123 \
  -H "Authorization: Bearer <your-token>"
```

## Database Schema

The application uses MongoDB with the following main collections:

- **users**: User accounts and profiles
- **providers**: Tour company information
- **tourtemplates**: Reusable tour structures
- **customtours**: Specific tour instances
- **calendarentries**: Tour itinerary items
- **registrations**: Tourist tour registrations
- **defaultactivities**: Predefined activities
- **documenttypes**: Document categories
- **touristdocuments**: Tourist-uploaded documents
- **tourdocuments**: Tour-related documents
- **broadcasts**: Tour announcements
- **paymentconfigs**: System configuration
- **tourupdates**: Tour change notifications
- **documentactivities**: Document activity logs
- **rolechangerequests**: Role upgrade requests

## User Roles & Permissions

### System Administrator
- Full system access
- Manage all providers, users, and tours
- Configure system settings
- View all data across the platform

### Provider Administrator
- Manage their company profile
- Create and manage custom tours
- Handle tourist registrations
- Upload tour documents
- Send broadcast messages

### Tourist
- Register for tours using join codes
- Manage personal profile
- View tour itineraries
- Upload required documents
- Receive tour updates

## Email Notifications

The system automatically sends emails for:
- New tour registrations → Provider Admins
- Registration status changes → Tourists
- Document uploads → Relevant parties
- Role change requests → Provider Admins
- Role change decisions → Tourists

## File Upload System

Files are uploaded to AWS S3 with the following structure:
```
bucket-name/
├── documents/
│   ├── tourist-documents/
│   └── tour-documents/
└── logos/
    └── provider-logos/
```

## Security Features

- JWT-based authentication
- Role-based access control
- Input validation with Joi
- Rate limiting (100 requests/15min per IP)
- CORS protection
- Helmet security headers
- Password hashing (if local auth is used)
- SQL injection prevention via Mongoose

## Performance Optimizations

- Redis caching for frequently accessed data
- Database indexing on commonly queried fields
- Compression middleware
- Pagination for large datasets
- Efficient MongoDB queries with population

## Error Handling

The API provides consistent error responses:
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error (server issues)

## Testing

Run tests with:
```bash
npm test
```

## Deployment

### Docker Deployment

1. **Build the image**:
   ```bash
   docker build -t tourlicity-backend .
   ```

2. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

### Production Considerations

- Use environment-specific configuration
- Set up proper logging (Winston, etc.)
- Configure reverse proxy (Nginx)
- Set up SSL certificates
- Use PM2 for process management
- Configure database backups
- Set up monitoring (New Relic, DataDog, etc.)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.