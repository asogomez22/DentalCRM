# Decisión de stack

## Stack final
### Backend
- Laravel 12
- PHP 8.4
- PostgreSQL 16
- Redis 7
- Laravel Sanctum
- Spatie Permission
- Storage S3 compatible

### Frontend
- React 19
- Vite
- TypeScript
- React Router
- Tailwind CSS 4
- TanStack Query 5
- React Hook Form + Zod
- FullCalendar
- Zustand solo para estado UI local

## Por qué este stack y no otro
### 1) Laravel encaja con el documento original
El documento base ya plantea Laravel + API REST + React + Tailwind, así que respetar eso reduce riesgo técnico y acelera el MVP.

### 2) API-first prepara la app móvil sin rehacer backend
Si más adelante se construye la app React Native, la autenticación, permisos, pacientes, citas y reservas públicas ya existirán como API.

### 3) PostgreSQL mejor para datos críticos y filtros complejos
Pacientes, citas, disponibilidad, estados, búsquedas, auditoría y reporting ligero encajan muy bien con PostgreSQL.

### 4) Tailwind + componentes propios acelera mucho
Permite una UI limpia y escalable sin pelearse con CSS desde el primer día.

### 5) FullCalendar resuelve el núcleo visual del negocio
La agenda es una pieza central del producto. No compensa reinventarla.

## Lo que NO haría en el MVP
- Microservicios
- Multi-db por clínica
- SSR complejo para todo el panel
- Event sourcing
- WebSockets en tiempo real desde el día 1
- White-label extremo con builds separadas por clínica

## Estrategia multi-tenant
- Shared database
- Shared schema
- Todas las tablas de negocio con `clinic_id`
- Resolución de tenant por subdominio o cabecera
- Global scope / middleware en backend
- Tema visual por clínica desde `clinic_settings`

## Reparto del MVP web
### Backend MVP
- auth
- context tenant
- patients CRUD
- appointments CRUD
- availability pública
- booking pública
- clinic settings
- dashboard summary

### Frontend MVP
- login
- layout CRM
- dashboard
- listado/ficha de pacientes
- agenda semanal
- formulario de cita
- página pública de reservas
