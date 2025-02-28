# Étape 1 : build React
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Étape 2 : servir via NGINX avec configuration personnalisée
FROM nginx:alpine
# Copier le build de React
COPY --from=build /app/build /usr/share/nginx/html
# Copier votre configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
