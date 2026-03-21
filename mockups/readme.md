# RACMC-GPT UI Mockup

Mockup interactivo de la interfaz de usuario para el proyecto RACMC-GPT (Regulatory Affairs - CMC Assistant) de Daiichi Sankyo.

## 📋 Descripción

Este proyecto es un mockup HTML estático que simula la funcionalidad de RACMC-GPT, una herramienta de asistencia basada en IA para consultar documentación regulatoria de CMC (Chemistry, Manufacturing and Controls).

### Características Principales

- ✅ **Filtro de Proyecto Obligatorio**: Selección de proyecto antes de realizar consultas
- ✅ **Chat Interactivo**: Interfaz de conversación con el asistente de IA
- ✅ **Referencias a Nivel de Página**: Citas con número de página específico
- ✅ **Panel de Referencias**: Visualización detallada de documentos citados con fecha
- ✅ **Exportación de Conversación**: Descarga en formato texto plano (. txt)
- ✅ **Información de Usuario**: Nombre del usuario y botón de logout
- ✅ **Sin Persistencia**: Las conversaciones no se guardan (cumple requisitos de privacidad)

## 🚀 Cómo Usar

### Opción 1: Abrir Directamente

1. Descarga o clona el proyecto
2. Abre el archivo `index.html` en tu navegador web
3. La aplicación funcionará sin necesidad de servidor

### Opción 2: Con Servidor Local (Recomendado)

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (http-server)
npx http-server -p 8000