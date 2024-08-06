## configuration 
1. create a .env file the constants you need are:

DATABASE_USER = ""
DATABASE_PASS = ""
DATABASE_NAME = ""
DATABASE_HOST = "localhost"
DATABASE_PORT = 3306

SYSTEM_EMAIL = ""
SYSTEM_EMAIL_PASSWORD = ""
SYSTEM_EMAIL_SERVICE_PROVIDER = "gmail"

SERVER_PORT = 5000
DOMAIN_NAME = `http://localhost:${SERVER_PORT}`

DATABASE_URL = `mysql://${DATABASE_USER}:${DATABASE_PASS}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`
DEVELOPMENT = true


## database command
use npx prisma help for all commands
1. for migration: npx prisma migrate dev
2. for changes without migration: npx prisma db push
...

## running development
1. npm run start:dev


## running production
2. npm build
3. npm run start:prod
Note: production can have path issues so its still in testing

## to get commits
1. git log --pretty=format:"%h - %an, %ad" > backend_commits.csv
2. git log --pretty=format:"%h - %an, %ad : %s" > backend_commits.csv

