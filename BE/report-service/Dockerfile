FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY fonts/ /app/fonts/
RUN npm install

COPY . .

EXPOSE 3006

CMD ["npm", "start"]