# Gemini Project Manager

## Propósito

Este archivo sirve para:
- gestionar múltiples proyectos
- guardar rutas locales de cada proyecto
- definir el proyecto activo
- permitir a Gemini CLI saber en qué proyecto trabajar
- coordinar archivos project.md específicos de cada proyecto

---

## Proyecto activo

Formato:

- nombre: alfilo
- ruta: C:\Users\alexs\Desktop\alfilo-project

---

## Lista de proyectos

Formato:

- nombre: alfilo
  ruta: C:\Users\alexs\Desktop\alfilo-project

---

## Instrucciones para Gemini CLI

Cuando el usuario solicite trabajar en un proyecto:

1. Si NO hay proyecto activo:
   - preguntar: "¿Sobre qué proyecto quieres trabajar?"

2. Si el proyecto ya existe en la lista:
   - usar su ruta

3. Si NO existe:
   - pedir al usuario la ruta local del proyecto
   - añadirlo a la lista de proyectos
   - establecerlo como proyecto activo

4. Cada vez que se cambie de proyecto:
   - actualizar la sección "Proyecto activo"
   - sobrescribir este archivo gemini.md con la nueva información

5. Antes de ejecutar cualquier comando:
   - asegurarse de estar dentro de la ruta del proyecto activo

---

## Gestión de project.md (MUY IMPORTANTE)

Cada proyecto debe tener su propio archivo:

project.md

ubicado en la raíz del proyecto.

Si no existe:
- crear automáticamente un archivo project.md con una plantilla base

Si existe:
- leerlo antes de trabajar en el proyecto

---

## Normas

- Nunca ejecutar comandos fuera de la ruta del proyecto activo
- Siempre confirmar cambios destructivos
- Mantener este archivo actualizado en cada cambio de proyecto
- Mantener sincronizado el project.md de cada proyecto

---

## Plantilla para project.md

Esta plantilla se utilizará para crear el archivo `project.md` en la raíz de cada nuevo proyecto si no existe:

```markdown
# Project: {nombre_proyecto}

## Descripción
Breve descripción del proyecto

## Stack tecnológico
- frontend: 
- backend: 
- base de datos: 

## Módulos principales
- 

## Roles y permisos
- 

## Estado actual
- 

## Notas
- 
```
