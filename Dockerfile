# 1) Build do frontend (Node)
FROM node:18 AS node_builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ .
RUN npm run build

# 2) Build do backend (Maven)
FROM maven:3.9.5-eclipse-temurin-17 AS maven_build
WORKDIR /app

COPY pom.xml .
COPY src ./src

# Copia o build do frontend para o Spring Boot servir estático
COPY --from=node_builder /app/frontend/build ./src/main/resources/static

RUN mvn clean package -DskipTests

# 3) Imagem final
FROM eclipse-temurin:17-jdk
WORKDIR /app
COPY --from=maven_build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
