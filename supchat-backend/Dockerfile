    # Utiliser une image officielle Node.js comme image de base
    FROM node:20

    # Définir le répertoire de travail dans le conteneur
    WORKDIR /app

    # Copier les fichiers de l'application dans le conteneur
    COPY package*.json ./

    # Installer les dépendances
    RUN npm install

    # Copier le reste des fichiers
    COPY . .

    # Exposer le port utilisé par l'application
    EXPOSE 3000

    # Commande par défaut pour lancer le serveur
    CMD ["node", "index.js"]
