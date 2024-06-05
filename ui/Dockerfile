FROM node:20-alpine

ARG BASE_API_URL
ENV VITE_API_BASE_URL=${BASE_API_URL}

WORKDIR /app
COPY package.json .

RUN npm install

COPY . .

RUN npm run build

EXPOSE 8502

CMD [ "npm", "run", "preview" ]
