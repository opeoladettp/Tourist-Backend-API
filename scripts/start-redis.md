# Starting Redis for Development

## Option 1: Install Redis on Windows

### Using Chocolatey (Recommended)
```bash
# Install Chocolatey if you haven't already
# Then install Redis
choco install redis-64

# Start Redis
redis-server
```

### Using WSL (Windows Subsystem for Linux)
```bash
# In WSL terminal
sudo apt update
sudo apt install redis-server
sudo service redis-server start

# Test Redis
redis-cli ping
```

## Option 2: Use Docker (Easiest)
```bash
# Pull and run Redis container
docker run -d --name redis-dev -p 6379:6379 redis:alpine

# Stop Redis
docker stop redis-dev

# Start Redis again
docker start redis-dev
```

## Option 3: Run Without Redis
The server will work without Redis, but some features will be limited:
- Push notifications will be disabled
- Notification queues will not work
- Some advanced features may not function

## Testing Redis Connection
```bash
# Test if Redis is running
redis-cli ping
# Should return: PONG
```

## Environment Configuration
Make sure your `.env` file has:
```
REDIS_URL=redis://localhost:6379
```