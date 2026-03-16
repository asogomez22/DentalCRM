# API contract MVP v1

Base path: `/api/v1`

## Auth
### POST /auth/login
```json
{
  "email": "admin@clinica.com",
  "password": "secret"
}
```

### POST /auth/logout
Sin body.

## Patients
### GET /patients
Query params:
- `search`
- `page`
- `per_page`
- `last_visit_from`
- `last_visit_to`

### POST /patients
```json
{
  "first_name": "Laura",
  "last_name": "Gomez",
  "dni": "12345678A",
  "email": "laura@example.com",
  "phone": "+34600111222",
  "birth_date": "1993-05-15",
  "notes": "Bruxismo"
}
```

### GET /patients/{id}
### PUT /patients/{id}

## Appointments
### GET /appointments
Query params:
- `date`
- `from`
- `to`
- `dentist_id`
- `status`

### POST /appointments
```json
{
  "patient_id": 1,
  "dentist_id": 7,
  "room": "Sala 1",
  "starts_at": "2026-03-18T10:00:00+01:00",
  "ends_at": "2026-03-18T10:30:00+01:00",
  "status": "pending",
  "treatment_type": "revision",
  "notes": "Primera visita"
}
```

### PUT /appointments/{id}
### DELETE /appointments/{id}

## Public booking
### GET /appointments/availability
Query params:
- `date`
- `treatment_id`
- `dentist_id`

### POST /appointments/book
```json
{
  "patient": {
    "first_name": "Laura",
    "last_name": "Gomez",
    "email": "laura@example.com",
    "phone": "+34600111222"
  },
  "treatment_id": 2,
  "dentist_id": 7,
  "slot": "2026-03-20T11:00:00+01:00"
}
```

## Dashboard
### GET /dashboard/summary

## Clinic settings
### GET /clinic/settings
### PUT /clinic/settings
```json
{
  "brand_name": "Clinica Dental Sonrisa",
  "primary_color": "#0f766e",
  "secondary_color": "#0f172a",
  "logo_url": "https://cdn.example.com/logo.png"
}
```
