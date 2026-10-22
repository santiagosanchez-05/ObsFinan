FROM node:20-slim

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --omit=dev

# Copiar el resto del código del backend
COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
