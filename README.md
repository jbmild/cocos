# Cocos Challenge Backend

### Crear la base de datos:
```bash
psql -U postgres -c "CREATE DATABASE cocos;"
psql -U postgres -d cocos -f database.sql
```


### Insomnia collection
Recordar configurar la url donde corre el proyecto en la variable `URL` en el `Base Environment`