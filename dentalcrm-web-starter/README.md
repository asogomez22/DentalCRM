# DentalCRM Web Starter

Base inicial para arrancar el MVP web de DentalCRM.

## Stack elegido
- **Backend**: Laravel 12 API-first + PostgreSQL + Redis + Sanctum + colas
- **Frontend web**: React 19 + Vite + TypeScript + React Router + Tailwind CSS 4 + TanStack Query + FullCalendar
- **Infra local**: Docker Compose con Postgres, Redis, Mailpit y MinIO

## Qué incluye esta base
- Decisión de stack y arquitectura
- Esquema inicial de base de datos
- Contrato API del MVP
- Estructura de frontend lista para crecer
- Plantillas backend para multi-tenant por `clinic_id`
- `docker-compose.yml` para desarrollo local

## Orden recomendado de arranque
1. Levantar infraestructura con Docker.
2. Crear el proyecto Laravel dentro de `apps/api`.
3. Instalar dependencias del frontend dentro de `apps/web`.
4. Implementar auth, tenant context, pacientes y citas.
5. Conectar agenda y reservas públicas.

## Comandos sugeridos
### Infra
```bash
docker compose up -d
```

### Backend (cuando tengas Composer)
```bash
cd apps/api
composer create-project laravel/laravel .
composer require laravel/sanctum spatie/laravel-permission
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

### Frontend
```bash
cd apps/web
npm install
npm run dev
```

## MVP web que se debe construir primero
- Login
- Dashboard básico
- Gestión de pacientes
- Agenda/citas
- Reservas públicas
- Personalización básica de clínica
