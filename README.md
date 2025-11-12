# Inventario + Discord (Supabase + Vercel) — Starter

Proyecto base para una app web de inventario con login por Discord usando Supabase (Auth + Postgres + RLS).
Despliegue estático en Vercel.

## Estructura
```
public/
  index.html
  app_ui.html
  app.js
  style.css
  config.example.js  # Copia a config.js y rellena
  modules/
    db.js
    auth.js
  assets/
    logo.png
supabase_schema_v1.sql
supabase_policies_v1.sql
vercel.json
README.md
```

## Pasos rápidos

1) **Crear proyecto Supabase** y habilitar provider **Discord** (en Supabase → Auth → Providers).
2) **Crear app en Discord Developer Portal** (OAuth2) y copiar Client ID/Secret a Supabase (no al frontend).
3) **Configurar Redirect URL**:
   - En Discord *y* en Supabase usa: `https://TU_DOMINIO.vercel.app/` (raíz) y `http://localhost:3000` para local.
4) **Ejecutar SQL** de `supabase_schema_v1.sql` y `supabase_policies_v1.sql` en el SQL Editor de Supabase (activar RLS antes).
5) **Configurar frontend**:
   - Copia `public/config.example.js` a `public/config.js` y pon `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `redirectUrl`.
6) **Subir a GitHub** y **Deploy en Vercel** (proyecto estático que sirve `/public`).

Mira el apartado “Guía paso a paso” dentro de este README.
