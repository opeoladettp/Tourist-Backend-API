# Restart MongoDB on Windows

## Method 1: Using Windows Services

### Stop MongoDB
```cmd
net stop MongoDB
```

### Start MongoDB
```cmd
net start MongoDB
```

### Restart MongoDB (Stop + Start)
```cmd
net stop MongoDB && net start MongoDB
```

## Method 2: Using MongoDB Commands

### Check MongoDB Status
```cmd
sc query MongoDB
```

### Force Stop MongoDB Process (if service doesn't respond)
```cmd
taskkill /f /im mongod.exe
```

## Method 3: Clear Connection Pool Issues

If you're experiencing connection pool exhaustion:

### 1. Stop the Node.js application
```cmd
# Press Ctrl+C in the terminal running the app
```

### 2. Restart MongoDB
```cmd
net stop MongoDB
net start MongoDB
```

### 3. Clear any stuck connections
```cmd
# Check for any remaining MongoDB connections
netstat -an | findstr :27017

# If there are too many connections, restart MongoDB again
```

### 4. Restart the Node.js application
```cmd
npm run dev
```

## Method 4: MongoDB Shell Commands

### Connect to MongoDB shell
```cmd
mongosh
```

### Check current connections
```javascript
db.serverStatus().connections
```

### Kill specific operations (if needed)
```javascript
db.currentOp()
// Find problematic operations and kill them
db.killOp(operationId)
```

## Troubleshooting

### If MongoDB won't start:
1. Check if the data directory exists: `C:\data\db`
2. Check MongoDB logs: `C:\Program Files\MongoDB\Server\[version]\log\mongod.log`
3. Ensure MongoDB service is installed: `sc query MongoDB`

### If connection issues persist:
1. Restart your computer (clears all network connections)
2. Check Windows Firewall settings
3. Verify MongoDB configuration file: `C:\Program Files\MongoDB\Server\[version]\bin\mongod.cfg`